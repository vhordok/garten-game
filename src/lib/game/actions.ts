// All state mutations the UI may trigger. Every action mutates the live
// state and calls notify() exactly once on success (see CLAUDE.md rule 5).

import { CONFIG } from '../data/config'
import { PLANTS, plantById } from '../data/plants'
import { emptyPlot, getState, notify } from './state'
import { plotReady } from './tick'
import type { GameState, PlantDef } from './types'

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

function harvestInternal(s: GameState, index: number): number {
  const plot = s.plots[index]
  if (!plot || !plotReady(plot)) return 0
  const def = plantById(plot.plantId!)
  if (!def) return 0
  s.inventory[def.id] = (s.inventory[def.id] ?? 0) + def.yield
  s.stats.harvested += def.yield
  plot.plantId = null
  plot.progress = 0
  return def.yield
}

/** Harvest one ready plot into storage. Returns harvested units (0 if not ready). */
export function harvestPlot(index: number): number {
  const s = getState()
  const units = harvestInternal(s, index)
  if (units > 0) notify()
  return units
}

/** Harvest every ready plot. Returns total harvested units. */
export function harvestAllReady(): number {
  const s = getState()
  let units = 0
  for (let i = 0; i < s.plots.length; i++) units += harvestInternal(s, i)
  if (units > 0) notify()
  return units
}

function sellInternal(s: GameState, plantId: string): number {
  const def = plantById(plantId)
  const count = s.inventory[plantId] ?? 0
  if (!def || count <= 0) return 0
  const gain = count * def.sellValue
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
    if (def) sum += count * def.sellValue
  }
  return sum
}
