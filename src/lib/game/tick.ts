import { plantById } from '../data/plants'
import { growthMultiplier } from './modifiers'
import type { GameState, PlantDef, PlotState } from './types'

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
  return changed
}

/** True if the plot holds a fully grown, harvestable plant. */
export function plotReady(plot: PlotState): boolean {
  if (!plot.plantId) return false
  const def = plantById(plot.plantId)
  return def !== undefined && plot.progress >= cycleTime(plot, def)
}
