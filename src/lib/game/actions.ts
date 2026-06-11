// All state mutations the UI may trigger. Every action mutates the live
// state and calls notify() exactly once on success (see CLAUDE.md rule 5).

import { CONFIG } from '../data/config'
import { PLANTS, plantById } from '../data/plants'
import { UPGRADES, upgradeById } from '../data/upgrades'
import { comboMultiplier, rollUnits, sellMultiplier, yieldMultiplier } from './modifiers'
import { emptyPlot, getState, notify } from './state'
import { plotReady } from './tick'
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
  s.stats.planted += 1
  notify()
  return true
}

export type CritTier = 'none' | 'perfect' | 'legendary'

export interface HarvestResult {
  units: number
  crit: CritTier
}

const CRIT_RANK: Record<CritTier, number> = { none: 0, perfect: 1, legendary: 2 }

/** Golden-harvest roll (GAME_DESIGN.md §9.4). */
function rollCrit(): { tier: CritTier; mult: number } {
  const roll = Math.random()
  if (roll < CONFIG.critLegendaryChance) return { tier: 'legendary', mult: CONFIG.critLegendaryMult }
  if (roll < CONFIG.critLegendaryChance + CONFIG.critPerfectChance) {
    return { tier: 'perfect', mult: CONFIG.critPerfectMult }
  }
  return { tier: 'none', mult: 1 }
}

function harvestInternal(s: GameState, index: number, comboMult: number): HarvestResult {
  const plot = s.plots[index]
  if (!plot || !plotReady(plot)) return { units: 0, crit: 'none' }
  const def = plantById(plot.plantId!)
  if (!def) return { units: 0, crit: 'none' }
  const crit = rollCrit()
  const units = rollUnits(def.yield * yieldMultiplier(s) * crit.mult * comboMult)
  s.inventory[def.id] = (s.inventory[def.id] ?? 0) + units
  s.stats.harvested += units
  if (crit.tier !== 'none') s.stats.crits += 1
  plot.plantId = null
  plot.progress = 0
  return { units, crit: crit.tier }
}

/** Extend the harvest chain by one link (current bonus applied beforehand). */
function bumpCombo(s: GameState): void {
  s.combo.count = s.combo.remaining > 0 ? s.combo.count + 1 : 1
  s.combo.remaining = CONFIG.comboWindowSeconds
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
  let best: CritTier = 'none'
  for (let i = 0; i < s.plots.length; i++) {
    const result = harvestInternal(s, i, comboMult)
    units += result.units
    if (CRIT_RANK[result.crit] > CRIT_RANK[best]) best = result.crit
  }
  if (units > 0) {
    bumpCombo(s)
    notify()
  }
  return { units, crit: best }
}

function sellInternal(s: GameState, plantId: string): number {
  const def = plantById(plantId)
  const count = s.inventory[plantId] ?? 0
  if (!def || count <= 0) return 0
  const gain = Math.round(count * def.sellValue * sellMultiplier(s))
  delete s.inventory[plantId]
  s.money += gain
  s.totalEarned += gain
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

export function buyPlot(): boolean {
  const s = getState()
  if (s.plots.length >= CONFIG.maxPlots) return false
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
    if (def) sum += Math.round(count * def.sellValue * sellMultiplier(state))
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
