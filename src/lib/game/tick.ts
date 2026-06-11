import { plantById } from '../data/plants'
import { growthMultiplier } from './modifiers'
import type { GameState, PlotState } from './types'

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
    if (plot.progress < def.growTime) {
      plot.progress = Math.min(plot.progress + grownSeconds, def.growTime)
      changed = true
    }
  }
  return changed
}

/** True if the plot holds a fully grown, harvestable plant. */
export function plotReady(plot: PlotState): boolean {
  if (!plot.plantId) return false
  const def = plantById(plot.plantId)
  return def !== undefined && plot.progress >= def.growTime
}
