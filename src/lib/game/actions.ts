// All state mutations the UI may trigger. Every action mutates the live
// state and calls notify() exactly once on success (see CLAUDE.md rule 5).

import { CONFIG } from '../data/config'
import { PLANTS, plantById } from '../data/plants'
import { SCRATCH_PRIZES, scratchPrizeAmount, type ScratchPrizeType } from '../data/scratch'
import { UPGRADES, upgradeById } from '../data/upgrades'
import { questTier } from '../data/questFlavor'
import {
  comboMultiplier,
  comboWindowSeconds,
  critChanceBonus,
  rollUnits,
  saleValue,
  scratchDropChance,
  waterCharges,
  yieldMultiplier,
} from './modifiers'
import { generateQuest, questStreakBonus, refillQuests } from './quests'
import { grantXp, type LevelUp } from './xp'

export type { LevelUp } from './xp'
import { emptyPlot, getState, notify } from './state'
import { cycleTime, plotReady } from './tick'
import type { GameState, PlantDef, UpgradeDef } from './types'

export function isPlantUnlocked(def: PlantDef, state: GameState): boolean {
  return state.totalEarned >= def.unlockAtTotalEarned
}

export function selectPlant(plantId: string): void {
  const s = getState()
  const def = plantById(plantId)
  if (!def || !isPlantUnlocked(def, s)) return
  s.selectedPlantId = plantId
  notify()
}

/** Sow the currently selected plant on an empty plot. Returns true on success. */
export function sowPlot(index: number): boolean {
  const s = getState()
  const plot = s.plots[index]
  const def = plantById(s.selectedPlantId)
  if (!plot || plot.plantId !== null || !def) return false
  if (!isPlantUnlocked(def, s) || s.money < def.seedCost) return false
  s.money -= def.seedCost
  plot.plantId = def.id
  plot.progress = 0
  plot.waterLeft = waterCharges(s)
  plot.regrowing = false
  s.stats.planted += 1
  notify()
  return true
}

/** Rip out a plant (no refund) — frees the plot for something better. */
export function clearPlot(index: number): boolean {
  const s = getState()
  const plot = s.plots[index]
  if (!plot || plot.plantId === null) return false
  plot.plantId = null
  plot.progress = 0
  plot.waterLeft = 0
  plot.regrowing = false
  notify()
  return true
}

/**
 * Pour one watering charge on a growing plot: skips ahead by a fraction of
 * the grow time (may finish ripening). Returns true on success.
 */
export function waterPlot(index: number): boolean {
  const s = getState()
  const plot = s.plots[index]
  if (!plot || !plot.plantId || plot.waterLeft <= 0) return false
  const def = plantById(plot.plantId)
  if (!def) return false
  const target = cycleTime(plot, def)
  if (plot.progress >= target) return false
  plot.progress = Math.min(plot.progress + target * CONFIG.waterProgressBoost, target)
  plot.waterLeft -= 1
  notify()
  return true
}

export type CritTier = 'none' | 'perfect' | 'legendary'

export interface HarvestResult {
  units: number
  crit: CritTier
  levelUps: LevelUp[]
  /** lucky scratch tickets dropped by this harvest */
  tickets: number
}

const CRIT_RANK: Record<CritTier, number> = { none: 0, perfect: 1, legendary: 2 }

/** Golden-harvest roll (GAME_DESIGN.md §9.4); Glücksklee raises the odds. */
function rollCrit(s: GameState): { tier: CritTier; mult: number } {
  const bonus = critChanceBonus(s)
  const legendary = CONFIG.critLegendaryChance + bonus / 5
  const perfect = CONFIG.critPerfectChance + bonus
  const roll = Math.random()
  if (roll < legendary) return { tier: 'legendary', mult: CONFIG.critLegendaryMult }
  if (roll < legendary + perfect) return { tier: 'perfect', mult: CONFIG.critPerfectMult }
  return { tier: 'none', mult: 1 }
}

function harvestInternal(s: GameState, index: number, comboMult: number): HarvestResult {
  const plot = s.plots[index]
  if (!plot || !plotReady(plot)) return { units: 0, crit: 'none', levelUps: [], tickets: 0 }
  const def = plantById(plot.plantId!)
  if (!def) return { units: 0, crit: 'none', levelUps: [], tickets: 0 }
  const cycleSeconds = cycleTime(plot, def)
  const crit = rollCrit(s)
  // one turbo-fertilizer charge boosts exactly one harvest
  let fertilizerMult = 1
  if (s.fertilizerCharges > 0) {
    fertilizerMult = CONFIG.fertilizerChargeMult
    s.fertilizerCharges -= 1
  }
  const units = rollUnits(def.yield * yieldMultiplier(s) * crit.mult * comboMult * fertilizerMult)
  s.inventory[def.id] = (s.inventory[def.id] ?? 0) + units
  s.stats.harvested += units
  if (crit.tier !== 'none') s.stats.crits += 1
  if (def.regrowTime) {
    // berries & trees stay and re-ripen in a shorter cycle, fresh water charges
    plot.progress = 0
    plot.regrowing = true
    plot.waterLeft = waterCharges(s)
  } else {
    plot.plantId = null
    plot.progress = 0
    plot.waterLeft = 0
    plot.regrowing = false
  }
  let tickets = 0
  if (Math.random() < scratchDropChance(s, cycleSeconds) && s.scratchTickets < CONFIG.scratchMaxPending) {
    s.scratchTickets += 1
    tickets = 1
  }
  const levelUps = grantXp(s, units)
  return { units, crit: crit.tier, levelUps, tickets }
}

/** Extend the harvest chain by one link (current bonus applied beforehand). */
function bumpCombo(s: GameState): void {
  s.combo.count = s.combo.remaining > 0 ? s.combo.count + 1 : 1
  s.combo.remaining = comboWindowSeconds(s)
}

/** Harvest one ready plot into storage. units = 0 means nothing happened. */
export function harvestPlot(index: number): HarvestResult {
  const s = getState()
  const result = harvestInternal(s, index, comboMultiplier(s))
  if (result.units > 0) {
    bumpCombo(s)
    notify()
  }
  return result
}

/**
 * Harvest every ready plot. crit reports the best tier rolled. The whole
 * batch counts as ONE combo link — chains come from active clicking.
 */
export function harvestAllReady(): HarvestResult {
  const s = getState()
  const comboMult = comboMultiplier(s)
  let units = 0
  let tickets = 0
  let best: CritTier = 'none'
  const levelUps: LevelUp[] = []
  for (let i = 0; i < s.plots.length; i++) {
    const result = harvestInternal(s, i, comboMult)
    units += result.units
    tickets += result.tickets
    for (const up of result.levelUps) levelUps.push(up)
    if (CRIT_RANK[result.crit] > CRIT_RANK[best]) best = result.crit
  }
  if (units > 0) {
    bumpCombo(s)
    notify()
  }
  return { units, crit: best, levelUps, tickets }
}

function sellInternal(s: GameState, plantId: string): number {
  const def = plantById(plantId)
  const count = s.inventory[plantId] ?? 0
  if (!def || count <= 0) return 0
  const gain = saleValue(s, def.sellValue, count)
  delete s.inventory[plantId]
  s.money += gain
  s.totalEarned += gain
  s.lifetimeEarned += gain
  s.stats.sold += count
  return gain
}

/** Sell all stored units of one plant. Returns money gained. */
export function sellPlant(plantId: string): number {
  const gain = sellInternal(getState(), plantId)
  if (gain > 0) notify()
  return gain
}

/** Sell the entire storage. Returns money gained. */
export function sellAll(): number {
  const s = getState()
  let gain = 0
  for (const plant of PLANTS) gain += sellInternal(s, plant.id)
  if (gain > 0) notify()
  return gain
}

/** Cost of the next plot — exponential curve, see GAME_DESIGN.md §3. */
export function nextPlotCost(state: GameState): number {
  const bought = state.plots.length - CONFIG.startPlots
  return Math.floor(CONFIG.plotBaseCost * Math.pow(CONFIG.plotCostFactor, bought))
}

/** Current plot cap — every leased parcel extends it. */
export function maxPlots(state: GameState): number {
  return CONFIG.maxPlots + (state.parcels - 1) * CONFIG.parcelExtraPlots
}

/**
 * Compost earned by leasing a new parcel right now (GAME_DESIGN.md §6).
 * Based on LIFETIME earnings minus compost already claimed — farming many
 * tiny rounds gives nothing extra (balance audit).
 */
export function compostGain(state: GameState): number {
  const fromLifetime = Math.floor(Math.sqrt(state.lifetimeEarned / CONFIG.prestigeBase))
  return Math.max(fromLifetime - state.compost, 0)
}

/**
 * Prestige: lease a new parcel. Resets the round (money, plots, storage,
 * upgrades, quests, round earnings) and pays out compost. Level/XP, stats,
 * tickets and fertilizer persist — the gardener stays experienced.
 */
/** Compost required before the next parcel may be leased. */
export function leaseRequirement(state: GameState): number {
  return state.parcels
}

export function leaseParcel(): number {
  const s = getState()
  const gain = compostGain(s)
  if (gain < leaseRequirement(s)) return 0
  s.compost += gain
  s.parcels += 1
  s.money = CONFIG.startMoney
  s.totalEarned = 0
  s.plots = Array.from({ length: CONFIG.startPlots }, emptyPlot)
  s.inventory = {}
  s.upgrades = {}
  s.quests = []
  s.questStreak = 0
  s.combo = { count: 0, remaining: 0 }
  s.selectedPlantId = PLANTS[0].id
  refillQuests(s)
  notify()
  return gain
}

export function buyPlot(): boolean {
  const s = getState()
  if (s.plots.length >= maxPlots(s)) return false
  const cost = nextPlotCost(s)
  if (s.money < cost) return false
  s.money -= cost
  s.plots.push(emptyPlot())
  notify()
  return true
}

/** Total sell value of everything currently in storage. */
export function inventoryValue(state: GameState): number {
  let sum = 0
  for (const [id, count] of Object.entries(state.inventory)) {
    const def = plantById(id)
    if (def) sum += saleValue(state, def.sellValue, count)
  }
  return sum
}

/** Current level of an upgrade (0 = not owned). */
export function upgradeLevel(state: GameState, upgradeId: string): number {
  return state.upgrades[upgradeId] ?? 0
}

/** Cost of the next level, or null when maxed out. */
export function nextUpgradeCost(def: UpgradeDef, state: GameState): number | null {
  const level = upgradeLevel(state, def.id)
  if (level >= def.maxLevel) return null
  return Math.floor(def.baseCost * Math.pow(def.costFactor, level))
}

export function buyUpgrade(upgradeId: string): boolean {
  const s = getState()
  const def = upgradeById(upgradeId)
  if (!def) return false
  const cost = nextUpgradeCost(def, s)
  if (cost === null || s.money < cost) return false
  s.money -= cost
  s.upgrades[def.id] = upgradeLevel(s, def.id) + 1
  notify()
  return true
}

/** True if any upgrade level is currently affordable (HUD badge). */
export function anyUpgradeAffordable(state: GameState): boolean {
  return UPGRADES.some((def) => {
    const cost = nextUpgradeCost(def, state)
    return cost !== null && state.money >= cost
  })
}

/** Fill empty quest slots (boot + after imports). */
export function ensureQuests(): void {
  if (refillQuests(getState())) notify()
}

export interface QuestReward {
  /** actual payout including the streak bonus */
  reward: number
  xp: number
  levelUps: LevelUp[]
  /** gold orders drop a scratch ticket */
  bonusTicket: boolean
  /** streak length after this delivery */
  streak: number
}

/** True if storage holds enough produce to deliver the quest. */
export function questFulfillable(state: GameState, questId: number): boolean {
  const quest = state.quests.find((q) => q.id === questId)
  if (!quest) return false
  return (state.inventory[quest.plantId] ?? 0) >= quest.amount
}

/**
 * Deliver a quest from storage: pays money (counts as earnings), grants
 * bonus XP and rolls a fresh order into the slot.
 */
export function fulfillQuest(questId: number): QuestReward | null {
  const s = getState()
  const index = s.quests.findIndex((q) => q.id === questId)
  if (index === -1) return null
  const quest = s.quests[index]
  const have = s.inventory[quest.plantId] ?? 0
  if (have < quest.amount) return null
  const left = have - quest.amount
  if (left > 0) s.inventory[quest.plantId] = left
  else delete s.inventory[quest.plantId]
  // streak bonus applies to this delivery, then the streak grows
  const payout = Math.round(quest.reward * (1 + questStreakBonus(s)))
  s.money += payout
  s.totalEarned += payout
  s.lifetimeEarned += payout
  s.stats.sold += quest.amount
  s.questStreak += 1
  let bonusTicket = false
  if (questTier(quest.tier).bonusTicket && s.scratchTickets < CONFIG.scratchMaxPending) {
    s.scratchTickets += 1
    bonusTicket = true
  }
  const levelUps = grantXp(s, quest.xp)
  s.quests[index] = generateQuest(s)
  notify()
  return { reward: payout, xp: quest.xp, levelUps, bonusTicket, streak: s.questStreak }
}

export interface ScratchCard {
  /** nine cell symbols (sprite names); exactly three show the prize symbol */
  symbols: string[]
  prizeType: ScratchPrizeType
  /** prize symbol (the matching one) */
  symbol: string
  /** FULL prize value — the settle step scales it by matches */
  amount: number
}

export interface ScratchOutcome {
  /** what was actually paid out */
  amount: number
  /** 'voll' | 'teil' | 'trost' for UI flavor */
  grade: 'voll' | 'teil' | 'trost'
  /** prize the payout belongs to (a partial hit may match a decoy pair) */
  prizeType: ScratchPrizeType
  /** the symbol that matched (UI highlighting) */
  symbol: string
  levelUps: LevelUp[]
}

/**
 * Consume one ticket and draw a hidden card: the board holds exactly one
 * triple (the prize) plus three decoy pairs. NOTHING is paid out yet —
 * the player picks 3 cells, then settleScratchCard() applies the result.
 */
export function drawScratchCard(): ScratchCard | null {
  const s = getState()
  if (s.scratchTickets <= 0) return null
  s.scratchTickets -= 1

  // weighted prize roll
  const totalWeight = SCRATCH_PRIZES.reduce((sum, p) => sum + p.weight, 0)
  let roll = Math.random() * totalWeight
  let prize = SCRATCH_PRIZES[0]
  for (const candidate of SCRATCH_PRIZES) {
    roll -= candidate.weight
    if (roll < 0) {
      prize = candidate
      break
    }
  }
  const amount = scratchPrizeAmount(prize, s)

  // board: three matching symbols, six decoys as three pairs (never a triple)
  const decoyPool = SCRATCH_PRIZES.filter((p) => p.symbol !== prize.symbol)
  const cells = [prize.symbol, prize.symbol, prize.symbol]
  for (let i = 0; i < 3; i++) {
    const decoy = decoyPool[Math.floor(Math.random() * decoyPool.length)]
    decoyPool.splice(decoyPool.indexOf(decoy), 1)
    cells.push(decoy.symbol, decoy.symbol)
  }
  // Fisher-Yates shuffle
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }

  notify()
  return { symbols: cells, prizeType: prize.type, symbol: prize.symbol, amount }
}

/**
 * Apply a scratched card based on the three PICKED symbols: a triple (only
 * the hidden prize can triple) pays the full prize ×scratchFullMult; ANY
 * two equal symbols pay a share of THAT symbol's prize; otherwise a
 * consolation. Lottery winnings never count as earnings.
 */
export function settleScratchCard(card: ScratchCard, picked: string[]): ScratchOutcome {
  const s = getState()
  const counts = new Map<string, number>()
  for (const sym of picked) counts.set(sym, (counts.get(sym) ?? 0) + 1)
  let matchedSymbol: string | null = null
  let matchedCount = 1
  for (const [sym, count] of counts) {
    if (count > matchedCount) {
      matchedCount = count
      matchedSymbol = sym
    }
  }

  let grade: ScratchOutcome['grade']
  let prize = SCRATCH_PRIZES.find((p) => p.symbol === card.symbol) ?? SCRATCH_PRIZES[0]
  let amount: number
  if (matchedCount >= 3) {
    grade = 'voll'
    amount = Math.max(Math.round(card.amount * CONFIG.scratchFullMult), 1)
  } else if (matchedCount === 2 && matchedSymbol) {
    grade = 'teil'
    prize = SCRATCH_PRIZES.find((p) => p.symbol === matchedSymbol) ?? prize
    amount = Math.max(Math.round(scratchPrizeAmount(prize, s) * CONFIG.scratchPartialFactor), 1)
  } else {
    grade = 'trost'
    amount = Math.max(Math.round(card.amount * CONFIG.scratchConsolationFactor), 1)
  }

  let levelUps: LevelUp[] = []
  if (prize.type === 'xp') {
    levelUps = grantXp(s, amount)
  } else if (prize.type === 'fertilizer') {
    s.fertilizerCharges += amount
  } else {
    s.money += amount
  }
  notify()
  return { amount, grade, prizeType: prize.type, symbol: matchedSymbol ?? card.symbol, levelUps }
}

/** Give a drawn but unscratched ticket back (panel closed early). */
export function refundScratchTicket(): void {
  const s = getState()
  if (s.scratchTickets < CONFIG.scratchMaxPending) {
    s.scratchTickets += 1
    notify()
  }
}

/**
 * Reroll a quest; the fresh order arrives with the skip cooldown armed and
 * the delivery streak breaks.
 */
export function skipQuest(questId: number): boolean {
  const s = getState()
  const index = s.quests.findIndex((q) => q.id === questId)
  if (index === -1) return false
  if (s.quests[index].skipCooldown > 0) return false
  const fresh = generateQuest(s)
  fresh.skipCooldown = CONFIG.questSkipCooldownSeconds
  s.quests[index] = fresh
  s.questStreak = 0
  notify()
  return true
}
