// All state mutations the UI may trigger. Every action mutates the live
// state and calls notify() exactly once on success (see CLAUDE.md rule 5).

import { CONFIG } from '../data/config'
import { achievementBonus } from './achievements'
import { beautyMilestoneBonus } from '../data/beautyMilestones'
import { compostUpgradeById, compostUpgradeCost } from '../data/compostUpgrades'
import { isOrnamental, nextOrnamentalCost } from './gallery'
import { purchaseDecoration } from './decorations'
import { purchaseStarUpgrade, starseedGain, starUpgradeBonus } from './worldseed'
import {
  claimExpedition as claimExpeditionPure,
  relicBonus,
  relicSetBonus,
  startExpedition as startExpeditionPure,
  type ExpeditionResult,
} from './expeditions'
import type { ExpeditionMode } from '../data/expeditions'
import {
  befriendCreature as befriendCreaturePure,
  creatureBonus,
  collectGift as collectGiftPure,
  type CreatureGift,
} from './creatures'
import { parcelBonus } from '../data/milestones'
import { worldMilestoneBonus } from '../data/worldMilestones'
import { skillById } from '../data/skills'
import { PLANTS, plantById } from '../data/plants'
import { bestHarvestValue, masteryPrizePlant, SCRATCH_PRIZES, scratchPrizeAmount, type ScratchPrizeType } from '../data/scratch'
import { UPGRADES, upgradeById } from '../data/upgrades'
import { LICENSES, licenseQuestBonus } from '../data/licenses'
import { weatherById } from '../data/weather'
import {
  comboMultiplier,
  comboWindowSeconds,
  compostClaimed,
  compostUpgradeBonus,
  critChanceBonus,
  critWeatherMult,
  eventMasteryMult,
  gardenBeauty,
  masteryYieldBonus,
  maxScratchTickets,
  rollUnits,
  saleValue,
  scratchDropChance,
  specializationPurchase,
  specializationYieldBonus,
  specUniqueBonus,
  waterCharges,
  yieldMultiplier,
} from './modifiers'
import { generateQuest, questReserved, questStreakBonus, refillQuests } from './quests'
import { crossEligibility, effectiveGoldCost, variantBonus, variantEventBonus } from './seedlab'
import { availableSkillPoints, skillBonus, skillLevel } from './skills'
import { grantXp, type LevelUp } from './xp'

export type { LevelUp } from './xp'
import { emptyPlot, getState, notify } from './state'
import { cycleTime, plotReady } from './tick'
import type { GameState, PlantDef, PlotState, UpgradeDef } from './types'

export function isPlantUnlocked(def: PlantDef, state: GameState): boolean {
  // PHASE 22: special plants are gated by seed-lab discovery, not by earnings
  if (def.special) return def.unlockVariant ? state.discoveredVariants.includes(def.unlockVariant) : false
  if (def.requiresLicense && state.licenses < def.requiresLicense) return false
  // PHASE 26: soft prestige-gate — very-late plants also need leased parcels, so
  // a racing post-prestige multiplier can't skip the whole ladder at once.
  if (def.unlockParcel && state.parcels < def.unlockParcel) return false
  return state.totalEarned >= def.unlockAtTotalEarned
}

/** Plots currently occupied by a given plant (for special-plant caps). */
export function plotsWithPlant(state: GameState, plantId: string): number {
  return state.plots.filter((p) => p.plantId === plantId).length
}

/** Buy the next cannabis license (money sink with hard requirements). */
export function buyLicense(): boolean {
  const s = getState()
  const next = LICENSES.find((l) => l.level === s.licenses + 1)
  if (!next || !next.requirementMet(s) || s.money < next.cost) return false
  s.money -= next.cost
  s.licenses = next.level
  notify()
  return true
}

export function selectPlant(plantId: string): void {
  const s = getState()
  const def = plantById(plantId)
  if (!def || !isPlantUnlocked(def, s)) return
  // PHASE 44: ornamentals live in the Ziergalerie collection, never on the field
  if (isOrnamental(def)) return
  s.selectedPlantId = plantId
  notify()
}

/**
 * PHASE 44 Ziergalerie: buy one copy of an ornamental into the permanent
 * collection (survives prestige). Each copy adds its beauty to the garden-wide
 * aura without taking a plot or grow time. Returns true on success.
 */
export function buyOrnamental(plantId: string): boolean {
  const s = getState()
  const def = plantById(plantId)
  if (!def || !isOrnamental(def) || !isPlantUnlocked(def, s)) return false
  const owned = s.ornamentals[plantId] ?? 0
  const cost = nextOrnamentalCost(def, owned)
  if (!Number.isFinite(cost) || s.money < cost) return false
  s.money -= cost
  s.ornamentals[plantId] = owned + 1
  notify()
  return true
}

/** PHASE 49: buy one copy of a Garten-Deko (visible on the field, adds beauty). */
export function buyDecoration(id: string): boolean {
  const s = getState()
  if (!purchaseDecoration(s, id)) return false
  notify()
  return true
}

/**
 * Pin the plant the Sä-Gnom auto-sows, or pass null to let it follow the
 * manual selection again (PHASE 3). A pinned plant must be unlocked.
 */
export function setAutoSowPlant(plantId: string | null): void {
  const s = getState()
  if (plantId !== null) {
    const def = plantById(plantId)
    if (!def || !isPlantUnlocked(def, s)) return
  }
  s.autoSowPlantId = plantId
  notify()
}

/** Sow the currently selected plant on an empty plot. Returns true on success. */
export function sowPlot(index: number): boolean {
  const s = getState()
  const plot = s.plots[index]
  const def = plantById(s.selectedPlantId)
  if (!plot || plot.plantId !== null || !def) return false
  if (!isPlantUnlocked(def, s) || isOrnamental(def) || s.money < def.seedCost) return false
  // PHASE 22: special plants are capped per garden
  if (def.maxPlots && plotsWithPlant(s, def.id) >= def.maxPlots) return false
  s.money -= def.seedCost
  plot.plantId = def.id
  plot.progress = 0
  plot.waterLeft = waterCharges(s)
  plot.regrowing = false
  s.stats.planted += 1
  notify()
  return true
}

/** Sow the selected plant on every affordable empty plot (bulk QoL). */
export function sowAllEmpty(): number {
  const s = getState()
  const def = plantById(s.selectedPlantId)
  if (!def || !isPlantUnlocked(def, s) || isOrnamental(def)) return 0
  let count = 0
  for (const plot of s.plots) {
    if (plot.plantId !== null || s.money < def.seedCost) continue
    s.money -= def.seedCost
    plot.plantId = def.id
    plot.progress = 0
    plot.waterLeft = waterCharges(s)
    plot.regrowing = false
    s.stats.planted += 1
    count += 1
  }
  if (count > 0) notify()
  return count
}

/** Pour one watering charge on every growing plot that still has one. */
export function waterAllGrowing(): number {
  const s = getState()
  let count = 0
  for (const plot of s.plots) {
    if (!plot.plantId || plot.waterLeft <= 0) continue
    const def = plantById(plot.plantId)
    if (!def) continue
    const target = cycleTime(plot, def)
    if (plot.progress >= target) continue
    plot.progress = Math.min(plot.progress + target * CONFIG.waterProgressBoost, target)
    plot.waterLeft -= 1
    count += 1
  }
  if (count > 0) notify()
  return count
}

/**
 * Rip out a plant and refund half its seed cost — clearing must never feel
 * like a punishment, and the refund doubles as the softlock escape hatch
 * (a garden full of ornamentals with 0 gold can always free up capital).
 * Returns the refund, or null if the plot was already empty.
 */
export function clearPlot(index: number): number | null {
  const s = getState()
  const plot = s.plots[index]
  if (!plot || plot.plantId === null) return null
  const def = plantById(plot.plantId)
  const refund = def ? Math.floor(def.seedCost / 2) : 0
  s.money += refund
  plot.plantId = null
  plot.progress = 0
  plot.waterLeft = 0
  plot.regrowing = false
  notify()
  return refund
}

/** A plot snapshot used for the bulk-clear undo (PHASE 11). */
export interface ClearedPlot {
  index: number
  plot: PlotState
}

/**
 * Clear every planted plot at once (PHASE 11 endgame QoL). Refunds 50 % of
 * each seed and returns a snapshot so the UI can offer a short undo — no
 * blocking confirm dialogs. An optional filter narrows what gets cleared.
 */
export function clearAllPlots(filter?: (plot: PlotState, def: PlantDef) => boolean): {
  count: number
  refund: number
  cleared: ClearedPlot[]
} {
  const s = getState()
  let refund = 0
  const cleared: ClearedPlot[] = []
  s.plots.forEach((plot, index) => {
    if (plot.plantId === null) return
    const def = plantById(plot.plantId)
    if (filter && (!def || !filter(plot, def))) return
    refund += def ? Math.floor(def.seedCost / 2) : 0
    cleared.push({ index, plot: { ...plot } })
    plot.plantId = null
    plot.progress = 0
    plot.waterLeft = 0
    plot.regrowing = false
  })
  if (cleared.length > 0) {
    s.money += refund
    notify()
  }
  return { count: cleared.length, refund, cleared }
}

/**
 * Undo a bulk clear: put the plants back into still-empty plots and take the
 * refund money back (never below zero). Plots the player already re-sowed are
 * left untouched, so undo can't clobber new work.
 */
export function restorePlots(cleared: ClearedPlot[], refund: number): boolean {
  const s = getState()
  let restored = false
  for (const { index, plot } of cleared) {
    const target = s.plots[index]
    if (target && target.plantId === null) {
      s.plots[index] = { ...plot }
      restored = true
    }
  }
  if (restored) {
    s.money = Math.max(0, s.money - refund)
    notify()
  }
  return restored
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
function rollCrit(s: GameState, category: string): { tier: CritTier; mult: number } {
  // PHASE 14: the Gemüse specialisation lifts that category's golden-harvest odds
  const bonus = critChanceBonus(s) + specUniqueBonus(s, category, 'crit')
  const weather = critWeatherMult(s)
  const legendary = Math.min((CONFIG.critLegendaryChance + bonus / 5) * weather, 0.12)
  const perfect = Math.min((CONFIG.critPerfectChance + bonus) * weather, 0.6)
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
  const crit = rollCrit(s, def.category)
  // one turbo-fertilizer charge boosts exactly one harvest
  let fertilizerMult = 1
  if (s.fertilizerCharges > 0) {
    fertilizerMult = CONFIG.fertilizerChargeMult
    s.fertilizerCharges -= 1
  }
  const units = rollUnits(
    def.yield *
      yieldMultiplier(s) *
      crit.mult *
      comboMult *
      fertilizerMult *
      masteryYieldBonus(s, def.id) *
      specializationYieldBonus(s, def.category)
  )
  if (units > s.records.bestHarvest) s.records.bestHarvest = units
  s.inventory[def.id] = (s.inventory[def.id] ?? 0) + units
  // PHASE 14: the Magie specialisation grows that category's mastery XP faster;
  // PHASE 18: a Meistertag event doubles it
  s.mastery[def.id] =
    (s.mastery[def.id] ?? 0) +
    Math.round(units * (1 + specUniqueBonus(s, def.category, 'mastery') + variantBonus(s, 'mastery')) * eventMasteryMult(s))
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
  if (Math.random() < scratchDropChance(s, cycleSeconds, def.category) && s.scratchTickets < maxScratchTickets(s)) {
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
  if (s.combo.count > s.records.longestCombo) s.records.longestCombo = s.combo.count
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

function sellInternal(s: GameState, plantId: string, amount?: number): number {
  const def = plantById(plantId)
  const count = s.inventory[plantId] ?? 0
  const toSell = Math.min(Math.floor(amount ?? count), count)
  if (!def || toSell <= 0) return 0
  // PHASE 33: the Kosmisch specialisation lifts that category's sale price
  const gain = Math.round(saleValue(s, def.sellValue, toSell) * (1 + specUniqueBonus(s, def.category, 'sell')))
  if (toSell >= count) delete s.inventory[plantId]
  else s.inventory[plantId] = count - toSell
  s.money += gain
  s.totalEarned += gain
  s.lifetimeEarned += gain
  s.stats.sold += toSell
  return gain
}

/**
 * Sell stored units of one plant — all of them, or exactly `amount` (PHASE 2).
 * An explicit amount deliberately ignores the quest reservation.
 * Returns money gained.
 */
export function sellPlant(plantId: string, amount?: number): number {
  const gain = sellInternal(getState(), plantId, amount)
  if (gain > 0) notify()
  return gain
}

/**
 * Units a quick sell would move: the given fraction of the stock NOT
 * reserved by open delivery orders (PHASE 2). At least 1 while surplus
 * exists, so small fractions never round a sale down to nothing.
 */
export function quickSellAmount(state: GameState, plantId: string, fraction: number): number {
  const free = Math.max(0, (state.inventory[plantId] ?? 0) - questReserved(state, plantId))
  if (free <= 0) return 0
  return Math.max(1, Math.floor(free * fraction))
}

/**
 * Sell a fraction of the storage surplus — stock that open orders need
 * stays put (Auftragsschutz). Returns money gained.
 */
export function sellAll(fraction = 1): number {
  const s = getState()
  let gain = 0
  for (const plant of PLANTS) {
    gain += sellInternal(s, plant.id, quickSellAmount(s, plant.id, fraction))
  }
  if (gain > 0) notify()
  return gain
}

/** Preview of what sellAll(fraction) would pay right now. */
export function sellableValue(state: GameState, fraction = 1): number {
  let sum = 0
  for (const plant of PLANTS) {
    const amount = quickSellAmount(state, plant.id, fraction)
    if (amount > 0) sum += saleValue(state, plant.sellValue, amount) * (1 + specUniqueBonus(state, plant.category, 'sell'))
  }
  return sum
}

/**
 * Cost of the next plot — piecewise exponential (PHASE 37). Up to the knee it uses
 * the steep early factor (plots stay a real sink); beyond it a much gentler factor,
 * so the 150+ plots of a deep-prestige garden remain buyable instead of exploding.
 */
export function nextPlotCost(state: GameState): number {
  const bought = state.plots.length - CONFIG.startPlots
  const knee = CONFIG.plotSoftKnee
  if (bought <= knee) return Math.floor(CONFIG.plotBaseCost * Math.pow(CONFIG.plotCostFactor, bought))
  const atKnee = CONFIG.plotBaseCost * Math.pow(CONFIG.plotCostFactor, knee)
  return Math.floor(atKnee * Math.pow(CONFIG.plotLateCostFactor, bought - knee))
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
  // PHASE 17: the Tiefwurzel skill boosts the raw lifetime-based gain
  // PHASE 18: a Komposttag event adds +50 % to the next parcel's compost
  // PHASE 21: the Humusveilchen variant amplifies Komposttag
  const event = state.weather.id === 'komposttag' ? 1.5 + variantEventBonus(state, 'komposttag') : 1
  const fromLifetime = Math.floor(
    Math.sqrt(state.lifetimeEarned / CONFIG.prestigeBase) *
      (1 +
        skillBonus(state, 'compostGain') +
        variantBonus(state, 'compostGain') +
        starUpgradeBonus(state, 'compostGain') +
        worldMilestoneBonus(state.worldResets ?? 0, 'compostGain') +
        relicBonus(state, 'compostGain') +
        relicSetBonus(state, 'compostGain') +
        creatureBonus(state, 'compostGain')) *
      event
  )
  // subtract compost already CLAIMED (pool + spent) so spending on the compost
  // garden can't double-dip into a bigger next gain (PHASE 13)
  return Math.max(fromLifetime - compostClaimed(state), 0)
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
  s.maxParcels = Math.max(s.maxParcels ?? s.parcels, s.parcels) // PHASE 67 high-water
  s.money = CONFIG.startMoney
  s.totalEarned = 0
  s.plots = Array.from({ length: CONFIG.startPlots }, emptyPlot)
  s.inventory = {}
  s.upgrades = {}
  s.quests = []
  s.questStreak = 0
  s.combo = { count: 0, remaining: 0 }
  s.selectedPlantId = PLANTS[0].id
  s.autoSowPlantId = null
  refillQuests(s)
  notify()
  return gain
}

/**
 * PHASE 51 Weltensaat — the higher prestige. Banks Sternensaat (a permanent,
 * garden-wide yield multiplier) and resets the parcel/compost prestige layer AND
 * the round. Everything permanent survives: mastery, specialisations, skills,
 * variants, ornamentals, decorations, achievements, campaign, licenses, records,
 * lifetime/unlock stats (so quests/unlocks stay at tier — no softlock). Returns
 * the Sternensaat gained, or 0 if not eligible.
 */
export function weltensaat(): number {
  const s = getState()
  const gain = starseedGain(s)
  if (gain <= 0) return 0
  s.starseed = (s.starseed ?? 0) + gain
  s.worldResets = (s.worldResets ?? 0) + 1
  // reset the prestige layer (deeper than leaseParcel: parcels + compost too).
  // PHASE 53: the Sternenkeim upgrade grants a parcel head-start on the re-climb.
  // PHASE 61: the 'Sternenpfad' world milestone adds more (worldResets already
  // incremented above, so the just-finished world's milestone counts here).
  s.parcels = 1 + starUpgradeBonus(s, 'startParcels') + worldMilestoneBonus(s.worldResets ?? 0, 'startParcels')
  s.compost = 0
  s.compostSpent = 0
  s.compostUpgrades = {}
  // reset the round, exactly like a prestige
  s.money = CONFIG.startMoney
  s.totalEarned = 0
  s.plots = Array.from({ length: CONFIG.startPlots }, emptyPlot)
  s.inventory = {}
  s.upgrades = {}
  s.quests = []
  s.questStreak = 0
  s.combo = { count: 0, remaining: 0 }
  s.selectedPlantId = PLANTS[0].id
  s.autoSowPlantId = null
  refillQuests(s)
  notify()
  return gain
}

/** PHASE 69: befriend an attracted creature (free first contact). */
export function tameCreature(id: string): boolean {
  const s = getState()
  const ok = befriendCreaturePure(s, id, gardenBeauty(s))
  if (ok) notify()
  return ok
}

/** PHASE 72: collect a roaming creature's ready gift (reward + friendship up). */
export function collectCreatureGift(id: string): CreatureGift | null {
  const reward = collectGiftPure(getState(), id)
  if (reward) notify()
  return reward
}

/** PHASE 68/78: send an expedition (one slot), optionally with a creature
 * companion that boosts the risky outcome. True on success. */
export function sendExpedition(id: string, companion?: string): boolean {
  const ok = startExpeditionPure(getState(), id, companion)
  if (ok) notify()
  return ok
}

/** PHASE 68/76: claim a returned expedition with the chosen event option.
 * Returns the outcome (relic granted or a risky miss) for the UI, or null. */
export function collectExpedition(choice: ExpeditionMode): ExpeditionResult | null {
  const result = claimExpeditionPure(getState(), choice)
  if (result) notify()
  return result
}

/** PHASE 53: buy one level of a Sternenkammer upgrade with Sternensaat. */
export function buyStarUpgrade(id: string): boolean {
  const s = getState()
  if (!purchaseStarUpgrade(s, id)) return false
  notify()
  return true
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

/**
 * PHASE 37: buy as many plots as money allows, up to the parcel cap, in one go.
 * After a prestige the player otherwise clicks plot-by-plot for ages — this fills
 * the field instantly with whatever is affordable. Returns how many were bought.
 */
export function buyAllPlots(): number {
  const s = getState()
  const cap = maxPlots(s)
  let count = 0
  // guard against pathological loops; the cap is the natural bound
  while (s.plots.length < cap && count < 100000) {
    const cost = nextPlotCost(s)
    if (s.money < cost) break
    s.money -= cost
    s.plots.push(emptyPlot())
    count += 1
  }
  if (count > 0) notify()
  return count
}

/** Current level of an upgrade (0 = not owned). */
export function upgradeLevel(state: GameState, upgradeId: string): number {
  return state.upgrades[upgradeId] ?? 0
}

/**
 * PHASE 27: late-tier shop unlock. Most upgrades are available from the start;
 * the Very-Late tiers require leased parcels (which pace via prestige), so a
 * racing post-prestige multiplier can't buy the whole shop at once. Only gates
 * NEW purchases — an already-owned level is never affected. Default = open.
 */
export function isUpgradeUnlocked(def: UpgradeDef, state: GameState): boolean {
  return !def.unlockParcel || state.parcels >= def.unlockParcel
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
  if (!def || !isUpgradeUnlocked(def, s)) return false
  const cost = nextUpgradeCost(def, s)
  if (cost === null || s.money < cost) return false
  s.money -= cost
  s.upgrades[def.id] = upgradeLevel(s, def.id) + 1
  notify()
  return true
}

/** Helper upgrade effects that can be paused (automation the player may not
 * always want running, e.g. auto-sell over quest stock). PHASE 63. */
const HELPER_EFFECTS = new Set(['autoHarvest', 'autoSow', 'autoSell'])

/** Whether an upgrade is a pausable helper. */
export function isHelperUpgrade(def: UpgradeDef): boolean {
  return HELPER_EFFECTS.has(def.effect)
}

/** PHASE 63: pause/resume a helper upgrade. Paused helpers keep their level but
 * contribute nothing to automation until resumed. */
export function toggleHelperPause(id: string): void {
  const s = getState()
  if (!s.pausedHelpers) s.pausedHelpers = []
  const i = s.pausedHelpers.indexOf(id)
  if (i >= 0) s.pausedHelpers.splice(i, 1)
  else s.pausedHelpers.push(id)
  notify()
}

/** Distinct plant categories in content order (UI lists, specialisation). */
export const PLANT_CATEGORIES: string[] = [...new Set(PLANTS.map((p) => p.category))]

/**
 * Buy one level of a category specialisation (PHASE 11 gold sink, extended in
 * PHASE 14). Each level adds the shared yield bonus plus the category's unique
 * perk. Costs gold and — from a threshold level — compost, and later levels gate
 * behind parcels/gardener level. Permanent, survives prestige. True on success.
 */
export function buySpecialization(category: string): boolean {
  const s = getState()
  if (!PLANT_CATEGORIES.includes(category)) return false
  const p = specializationPurchase(s, category)
  if (!p.canBuy) return false
  s.money -= p.gold
  if (p.compost > 0) {
    // mirror compost-garden spending: the pool drops, compostSpent keeps the
    // total-ever-earned intact so the flat prestige bonus stays untouched
    s.compost -= p.compost
    s.compostSpent += p.compost
  }
  s.specializations[category] = p.level + 1
  notify()
  return true
}

/**
 * Buy one level of a skill (PHASE 17). Spends skill points (earned from parcels/
 * achievements/level, never gold) and respects the prerequisite + max level.
 * Survives prestige. Returns true on success.
 */
export function buySkill(id: string): boolean {
  const s = getState()
  const def = skillById(id)
  if (!def) return false
  const level = skillLevel(s, id)
  if (level >= def.maxLevel) return false
  if (def.prereq !== null && skillLevel(s, def.prereq) <= 0) return false
  if (availableSkillPoints(s) < def.cost) return false
  s.skills[id] = level + 1
  notify()
  return true
}

/**
 * Buy as many levels of a skill as the available points allow in one go (PHASE 32).
 * Essential for the endless `ahnenwissen` sink — deep-prestige players hold
 * thousands of surplus points and shouldn't have to click them away one by one.
 * Returns the number of levels bought; notifies once.
 */
export function buySkillMax(id: string): number {
  const s = getState()
  const def = skillById(id)
  if (!def) return 0
  if (def.prereq !== null && skillLevel(s, def.prereq) <= 0) return 0
  if (def.cost <= 0) return 0
  let level = skillLevel(s, id)
  const affordable = Math.floor(availableSkillPoints(s) / def.cost)
  const room = def.maxLevel - level
  const buy = Math.max(0, Math.min(affordable, room))
  if (buy <= 0) return 0
  s.skills[id] = level + buy
  notify()
  return buy
}

/**
 * Reset all skills (PHASE 18) for a compost fee — points return to the pool
 * (they're derived from progress, so clearing `skills` frees them). Costs
 * compost so it can't be spammed, but never locks a player in. True on success.
 */
export function respecSkills(): boolean {
  const s = getState()
  if (Object.keys(s.skills).length === 0) return false
  if (s.compost < CONFIG.skillRespecCompost) return false
  s.compost -= CONFIG.skillRespecCompost
  s.compostSpent += CONFIG.skillRespecCompost
  s.skills = {}
  notify()
  return true
}

export interface CrossOutcome {
  ok: boolean
  variantId: string | null
  /** German reason on failure */
  reason: string
}

/**
 * Cross two parent plants in the seed lab (PHASE 20). On success, deducts the
 * gold/compost cost and adds the discovered variant to the collection (permanent,
 * survives prestige). Discovery is deterministic — no sub-1% rolls.
 */
export function crossPlants(parentA: string, parentB: string): CrossOutcome {
  const s = getState()
  const res = crossEligibility(s, parentA, parentB)
  if (res.status !== 'ok' || !res.variant) {
    return { ok: false, variantId: res.variant?.id ?? null, reason: res.reason }
  }
  const v = res.variant
  s.money -= effectiveGoldCost(s, v)
  if (v.compostCost > 0) {
    s.compost -= v.compostCost
    s.compostSpent += v.compostCost
  }
  // PHASE 21: consume harvested produce (only the FREE surplus is ever spent —
  // crossEligibility already verified free ≥ need, so orders stay safe)
  for (const c of v.produceCost ?? []) {
    const left = (s.inventory[c.plantId] ?? 0) - c.amount
    if (left > 0) s.inventory[c.plantId] = left
    else delete s.inventory[c.plantId]
  }
  s.discoveredVariants.push(v.id)
  notify()
  return { ok: true, variantId: v.id, reason: res.reason }
}

/** True if any unlocked upgrade level is currently affordable (HUD badge). */
export function anyUpgradeAffordable(state: GameState): boolean {
  return UPGRADES.some((def) => {
    if (!isUpgradeUnlocked(def, state)) return false
    const cost = nextUpgradeCost(def, state)
    return cost !== null && state.money >= cost
  })
}

/** Fill empty quest slots (boot + after imports). */
export function ensureQuests(): void {
  if (refillQuests(getState())) notify()
}

export interface QuestReward {
  /** actual payout including the streak/milestone bonuses */
  reward: number
  xp: number
  levelUps: LevelUp[]
  /** scratch tickets paid (gold tier + big haul) */
  tickets: number
  /** streak length after this delivery */
  streak: number
}

/** Units of a quest line currently in storage (a plant or a whole category). */
function itemHave(state: GameState, item: { plantId?: string; category?: string }): number {
  if (item.plantId) return state.inventory[item.plantId] ?? 0
  let sum = 0
  for (const p of PLANTS) {
    if (p.category === item.category) sum += state.inventory[p.id] ?? 0
  }
  return sum
}

/** Remove a quest line's produce from storage; returns units actually taken. */
function consumeItem(state: GameState, item: { plantId?: string; category?: string; amount: number }): number {
  const take = (id: string, want: number): number => {
    const have = state.inventory[id] ?? 0
    const used = Math.min(have, want)
    if (used <= 0) return 0
    if (have - used > 0) state.inventory[id] = have - used
    else delete state.inventory[id]
    return used
  }
  if (item.plantId) return take(item.plantId, item.amount)
  let need = item.amount
  for (const p of PLANTS) {
    if (need <= 0) break
    if (p.category !== item.category) continue
    need -= take(p.id, need)
  }
  return item.amount - need
}

/** True if storage holds enough produce to deliver every line of the quest. */
export function questFulfillable(state: GameState, questId: number): boolean {
  const quest = state.quests.find((q) => q.id === questId)
  if (!quest) return false
  return quest.items.every((item) => itemHave(state, item) >= item.amount)
}

/**
 * Summed permanent quest-reward bonus factor (everything except the streak):
 * parcel milestones + compost garden + beauty aura + skill + achievements +
 * variants + licenses. Shared by fulfillQuest and the goal-panel economics so a
 * quest's value is judged exactly as it pays out (PHASE 29).
 */
export function questRewardBonus(s: GameState): number {
  return (
    1 +
    parcelBonus(s.parcels, 'questReward') +
    compostUpgradeBonus(s, 'questReward') +
    starUpgradeBonus(s, 'questReward') +
    beautyMilestoneBonus(gardenBeauty(s), 'questReward') +
    skillBonus(s, 'questReward') +
    achievementBonus(s, 'questReward') +
    variantBonus(s, 'questReward') +
    licenseQuestBonus(s.licenses)
  )
}

/** Gold a quest pays right now, including the streak and all permanent boni. */
export function expectedQuestPayout(s: GameState, quest: { reward: number }): number {
  return Math.round(quest.reward * (1 + questStreakBonus(s)) * questRewardBonus(s))
}

/**
 * Deliver a quest from storage: pays money (counts as earnings), grants bonus
 * XP and tickets, and rolls a fresh order into the slot (PHASE 13: multi-line
 * orders, category lines, milestone/compost reward bonus).
 */
export function fulfillQuest(questId: number): QuestReward | null {
  const s = getState()
  const index = s.quests.findIndex((q) => q.id === questId)
  if (index === -1) return null
  const quest = s.quests[index]
  if (!quest.items.every((item) => itemHave(s, item) >= item.amount)) return null

  let delivered = 0
  for (const item of quest.items) delivered += consumeItem(s, item)

  // streak bonus + permanent quest-reward boni (parcel/compost/beauty/skill/
  // achievement/variant/license) — shared with the goal-panel economics (PHASE 29)
  const payout = expectedQuestPayout(s, quest)
  s.money += payout
  s.totalEarned += payout
  s.lifetimeEarned += payout
  s.stats.sold += delivered
  s.stats.questsDone += 1
  s.questStreak += 1

  let tickets = 0
  for (let i = 0; i < quest.rewardTickets; i++) {
    if (s.scratchTickets < maxScratchTickets(s)) {
      s.scratchTickets += 1
      tickets += 1
    }
  }
  if (quest.rewardCompost > 0) s.compost += quest.rewardCompost

  const levelUps = grantXp(s, quest.xp)
  s.quests[index] = generateQuest(s)
  notify()
  return { reward: payout, xp: quest.xp, levelUps, tickets, streak: s.questStreak }
}

/**
 * Buy one level of a compost-garden upgrade with compost (PHASE 13). Spent
 * compost moves to compostSpent so the flat prestige bonus stays intact.
 */
export function buyCompostUpgrade(id: string): boolean {
  const s = getState()
  const def = compostUpgradeById(id)
  if (!def) return false
  if (s.parcels < def.unlockParcel) return false
  const level = s.compostUpgrades[id] ?? 0
  const cost = compostUpgradeCost(def, level)
  if (cost === null || s.compost < cost) return false
  s.compost -= cost
  s.compostSpent += cost
  s.compostUpgrades[id] = level + 1
  notify()
  return true
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
  s.stats.scratchesDone += 1 // PHASE 19 achievement metric
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
  } else if (prize.type === 'compost') {
    // a compost prize feeds the prestige economy; tracked as claimed so it can't
    // be double-dipped, but added to the spendable pool (PHASE 18)
    s.compost += amount
  } else if (prize.type === 'mastery') {
    const id = masteryPrizePlant(s)
    if (id) s.mastery[id] = (s.mastery[id] ?? 0) + amount
    else {
      // no harvestable plant selected → fall back to a small money win
      s.money += amount
    }
  } else {
    s.money += amount
    if (amount > s.records.biggestWin) s.records.biggestWin = amount
  }
  notify()
  return { amount, grade, prizeType: prize.type, symbol: matchedSymbol ?? card.symbol, levelUps }
}

export interface BulkScratchResult {
  scratched: number
  gold: number
  compost: number
  fertilizer: number
  xp: number
  mastery: number
  levelUps: LevelUp[]
}

/**
 * PHASE 34: cash a whole hoard of scratch tickets at once. The endgame piles up
 * tens of thousands of tickets — scratching them one pick-3 at a time is absurd.
 * Each ticket rolls a prize (same weights as a single draw) and pays its NOMINAL
 * value (no triple bonus, no consolation cut — a fair average), summed into one
 * lump. Lottery winnings never count as earnings (money added directly).
 */
export function scratchAll(limit = 100000): BulkScratchResult {
  const s = getState()
  const n = Math.min(s.scratchTickets, Math.max(0, Math.floor(limit)))
  const res: BulkScratchResult = { scratched: 0, gold: 0, compost: 0, fertilizer: 0, xp: 0, mastery: 0, levelUps: [] }
  if (n <= 0) return res
  const totalWeight = SCRATCH_PRIZES.reduce((sum, p) => sum + p.weight, 0)
  let xpSum = 0
  for (let i = 0; i < n; i++) {
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
    if (prize.type === 'xp') {
      xpSum += amount
      res.xp += amount
    } else if (prize.type === 'fertilizer') {
      const before = s.fertilizerCharges
      s.fertilizerCharges = Math.min(s.fertilizerCharges + amount, 999)
      res.fertilizer += s.fertilizerCharges - before // report only what was actually added (cap)
    } else if (prize.type === 'compost') {
      s.compost += amount
      res.compost += amount
    } else if (prize.type === 'mastery') {
      const id = masteryPrizePlant(s)
      if (id) {
        s.mastery[id] = (s.mastery[id] ?? 0) + amount
        res.mastery += amount
      } else {
        s.money += amount
        res.gold += amount
      }
    } else {
      s.money += amount
      res.gold += amount
    }
  }
  s.scratchTickets -= n
  s.stats.scratchesDone += n
  res.scratched = n
  if (xpSum > 0) res.levelUps = grantXp(s, xpSum)
  if (res.gold > s.records.biggestWin) s.records.biggestWin = res.gold
  notify()
  return res
}

/** Give a drawn but unscratched ticket back (panel closed early). */
export function refundScratchTicket(): void {
  const s = getState()
  if (s.scratchTickets < maxScratchTickets(s)) {
    s.scratchTickets += 1
    notify()
  }
}

/** Local day index (DST-safe enough for a daily gift). */
function localDay(now: number): number {
  return Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000)
}

export interface DailyReward {
  /** position in the 7-day cycle (1–7) */
  day: number
  streak: number
  gold: number
  tickets: number
  fertilizer: number
}

export function dailyClaimable(state: GameState, now = Date.now()): boolean {
  return localDay(now) > state.daily.lastClaim
}

/**
 * Once per local day: a gift that grows along a 7-day streak (missing a day
 * resets it). Gold gifts scale with the best unlocked harvest and never
 * count as earnings.
 */
export function claimDaily(now = Date.now()): DailyReward | null {
  const s = getState()
  const day = localDay(now)
  if (day <= s.daily.lastClaim) return null
  s.daily.streak = day - s.daily.lastClaim === 1 ? s.daily.streak + 1 : 1
  s.daily.lastClaim = day
  const pos = ((s.daily.streak - 1) % 7) + 1
  const hv = bestHarvestValue(s)
  const reward: DailyReward = { day: pos, streak: s.daily.streak, gold: 0, tickets: 0, fertilizer: 0 }
  switch (pos) {
    case 1:
      reward.gold = 5 * hv
      break
    case 2:
      reward.fertilizer = 3
      break
    case 3:
      reward.gold = 10 * hv
      break
    case 4:
      reward.tickets = 1
      break
    case 5:
      reward.fertilizer = 6
      break
    case 6:
      reward.gold = 20 * hv
      break
    case 7:
      reward.gold = 25 * hv
      reward.tickets = 2
      break
  }
  s.money += reward.gold
  s.scratchTickets = Math.min(s.scratchTickets + reward.tickets, maxScratchTickets(s))
  s.fertilizerCharges += reward.fertilizer
  notify()
  return reward
}

/**
 * Start a weather event (UI scheduler, live play only). Rain instantly
 * waters every growing plot for free; the rest are timed buffs read by
 * the modifiers.
 */
export function startWeather(weatherId: string): boolean {
  const s = getState()
  const def = weatherById(weatherId)
  if (!def || s.weather.id !== null) return false
  s.weather = { id: def.id, remaining: def.durationSeconds }
  if (def.id === 'regen') {
    for (const plot of s.plots) {
      if (!plot.plantId) continue
      const plant = plantById(plot.plantId)
      if (!plant) continue
      const target = cycleTime(plot, plant)
      if (plot.progress < target) {
        plot.progress = Math.min(plot.progress + target * CONFIG.waterProgressBoost, target)
      }
    }
  }
  notify()
  return true
}

export interface FireflyReward {
  kind: 'gold' | 'ticket' | 'fertilizer'
  amount: number
}

/** The golden firefly was caught — a small random thank-you (gift, not earnings). */
export function catchFirefly(): FireflyReward {
  const s = getState()
  const roll = Math.random()
  let reward: FireflyReward
  if (roll < 0.5) {
    reward = { kind: 'gold', amount: 6 * bestHarvestValue(s) }
    s.money += reward.amount
  } else if (roll < 0.8 && s.scratchTickets < maxScratchTickets(s)) {
    reward = { kind: 'ticket', amount: 1 }
    s.scratchTickets += 1
  } else {
    reward = { kind: 'fertilizer', amount: 3 }
    s.fertilizerCharges += 3
  }
  notify()
  return reward
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
