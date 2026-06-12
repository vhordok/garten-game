import { CONFIG } from '../data/config'
import { plantById } from '../data/plants'
import {
  autoHarvestRate,
  autoSellInterval,
  autoSowRate,
  growthMultiplier,
  rollUnits,
  saleValue,
  sellMultiplier,
  waterCharges,
  yieldMultiplier,
} from './modifiers'
import type { GameState, PlantDef, PlotState } from './types'
import { grantXp } from './xp'

/** Duration of the plot's current cycle (regrow cycles are shorter). */
export function cycleTime(plot: PlotState, def: PlantDef): number {
  return plot.regrowing && def.regrowTime ? def.regrowTime : def.growTime
}

/**
 * Advance the simulation by dtSeconds. Single source of truth for time-based
 * progress — the live loop AND offline catch-up both run through here
 * (see CLAUDE.md rule 2). Returns true if anything changed.
 */
export function tick(state: GameState, dtSeconds: number): boolean {
  if (dtSeconds <= 0) return false
  const grownSeconds = dtSeconds * growthMultiplier(state)
  let changed = false
  for (const plot of state.plots) {
    if (!plot.plantId) continue
    const def = plantById(plot.plantId)
    if (!def) continue
    const target = cycleTime(plot, def)
    if (plot.progress < target) {
      plot.progress = Math.min(plot.progress + grownSeconds, target)
      changed = true
    }
  }
  // drain the harvest chain in real time (no growth multiplier here)
  if (state.combo.remaining > 0) {
    state.combo.remaining = Math.max(state.combo.remaining - dtSeconds, 0)
    if (state.combo.remaining === 0) state.combo.count = 0
    changed = true
  }
  // quest skip cooldowns drain in real time too
  for (const quest of state.quests) {
    if (quest.skipCooldown > 0) {
      quest.skipCooldown = Math.max(quest.skipCooldown - dtSeconds, 0)
      changed = true
    }
  }
  // mature timber trees trickle wood money (sell multipliers apply)
  for (const plot of state.plots) {
    if (!plot.plantId) continue
    const def = plantById(plot.plantId)
    if (!def?.passiveIncome || plot.progress < def.growTime) continue
    const gain = def.passiveIncome * dtSeconds * sellMultiplier(state)
    state.money += gain
    state.totalEarned += gain
    state.lifetimeEarned += gain
    changed = true
  }
  // weather events blow over
  if (state.weather.remaining > 0) {
    state.weather.remaining = Math.max(state.weather.remaining - dtSeconds, 0)
    if (state.weather.remaining === 0) state.weather.id = null
    changed = true
  }
  // the market never sleeps
  state.marketTime = (state.marketTime + dtSeconds) % (CONFIG.marketPeriodSeconds * 1e6)
  changed = true
  if (processHelpers(state, dtSeconds)) changed = true
  return changed
}

/**
 * Helper automation (GAME_DESIGN.md §4/§9.10) — lives in tick so the same
 * code runs live and offline. Deliberately sober compared to active play:
 * no crits, no combo, no ticket drops, no fertilizer consumption.
 */
function processHelpers(s: GameState, dt: number): boolean {
  let changed = false

  const harvestRate = autoHarvestRate(s)
  if (harvestRate > 0) {
    s.helperAcc.harvest = Math.min(s.helperAcc.harvest + dt * harvestRate, s.plots.length)
    while (s.helperAcc.harvest >= 1) {
      const index = s.plots.findIndex(plotReady)
      if (index === -1) break
      const plot = s.plots[index]
      const def = plantById(plot.plantId!)!
      const units = rollUnits(def.yield * yieldMultiplier(s))
      s.inventory[def.id] = (s.inventory[def.id] ?? 0) + units
      s.stats.harvested += units
      if (def.regrowTime) {
        plot.progress = 0
        plot.regrowing = true
        plot.waterLeft = waterCharges(s)
      } else {
        plot.plantId = null
        plot.progress = 0
        plot.waterLeft = 0
        plot.regrowing = false
      }
      grantXp(s, units)
      s.helperAcc.harvest -= 1
      changed = true
    }
  }

  const sowRate = autoSowRate(s)
  if (sowRate > 0) {
    s.helperAcc.sow = Math.min(s.helperAcc.sow + dt * sowRate, s.plots.length)
    const def = plantById(s.selectedPlantId)
    while (s.helperAcc.sow >= 1) {
      if (!def || s.totalEarned < def.unlockAtTotalEarned || s.money < def.seedCost) break
      const index = s.plots.findIndex((p) => p.plantId === null)
      if (index === -1) break
      const plot = s.plots[index]
      s.money -= def.seedCost
      plot.plantId = def.id
      plot.progress = 0
      plot.waterLeft = waterCharges(s)
      plot.regrowing = false
      s.stats.planted += 1
      s.helperAcc.sow -= 1
      changed = true
    }
  }

  const sellInterval = autoSellInterval(s)
  if (Number.isFinite(sellInterval)) {
    s.helperAcc.sell += dt
    while (s.helperAcc.sell >= sellInterval) {
      s.helperAcc.sell -= sellInterval
      for (const [plantId, count] of Object.entries(s.inventory)) {
        const def = plantById(plantId)
        if (!def || count <= 0) continue
        const gain = saleValue(s, def.sellValue, count)
        delete s.inventory[plantId]
        s.money += gain
        s.totalEarned += gain
        s.lifetimeEarned += gain
        s.stats.sold += count
        changed = true
      }
    }
    // an empty storage shouldn't bank centuries of pending sales
    s.helperAcc.sell = Math.min(s.helperAcc.sell, sellInterval)
  }

  return changed
}

/** True if the plot holds a fully grown, harvestable plant. */
export function plotReady(plot: PlotState): boolean {
  if (!plot.plantId) return false
  const def = plantById(plot.plantId)
  if (!def || def.beautyBonus || def.passiveIncome) return false
  return plot.progress >= cycleTime(plot, def)
}
