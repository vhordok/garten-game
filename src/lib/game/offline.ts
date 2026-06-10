import { CONFIG } from '../data/config'
import { getState, notify } from './state'
import { plotReady, tick } from './tick'

export interface OfflineReport {
  /** real elapsed seconds since the save */
  awaySeconds: number
  /** seconds actually applied to the simulation (after the offline cap) */
  simulatedSeconds: number
  /** plots that became harvestable while away */
  ripened: number
}

/**
 * Apply offline growth based on the save timestamp. Runs through the same
 * tick() as the live loop — one source of truth (GAME_DESIGN.md §5).
 */
export function applyOfflineProgress(savedAt: number, now = Date.now()): OfflineReport | null {
  const awaySeconds = (now - savedAt) / 1000
  if (awaySeconds < CONFIG.offlineMinSeconds) return null
  const simulatedSeconds = Math.min(awaySeconds, CONFIG.offlineCapHours * 3600)

  const state = getState()
  const readyBefore = state.plots.filter(plotReady).length
  tick(state, simulatedSeconds)
  const ripened = state.plots.filter(plotReady).length - readyBefore
  notify()

  return { awaySeconds, simulatedSeconds, ripened }
}
