import { CONFIG } from '../data/config'
import { offlineCapHours } from './modifiers'
import { getState, notify } from './state'
import { plotReady, tick } from './tick'

export interface OfflineReport {
  /** real elapsed seconds since the save */
  awaySeconds: number
  /** seconds actually applied to the simulation (after the offline cap) */
  simulatedSeconds: number
  /** plots that became harvestable while away */
  ripened: number
  /** money the helpers earned while away (sales + level-up bonuses) */
  autoEarned: number
  /** units the harvest helper brought in while away */
  autoHarvested: number
}

/**
 * Apply offline growth based on the save timestamp. Runs through the same
 * tick() as the live loop — chunked (GAME_DESIGN.md §5), so regrow cycles
 * and helper automation actually produce during long absences.
 */
export function applyOfflineProgress(savedAt: number, now = Date.now()): OfflineReport | null {
  const awaySeconds = (now - savedAt) / 1000
  if (awaySeconds < CONFIG.offlineMinSeconds) return null

  const state = getState()
  const simulatedSeconds = Math.min(awaySeconds, offlineCapHours(state) * 3600)
  const readyBefore = state.plots.filter(plotReady).length
  const moneyBefore = state.money
  const harvestedBefore = state.stats.harvested

  const CHUNK_SECONDS = 60
  let remaining = simulatedSeconds
  while (remaining > 0) {
    const step = Math.min(remaining, CHUNK_SECONDS)
    tick(state, step, { offline: true })
    remaining -= step
  }

  const ripened = Math.max(state.plots.filter(plotReady).length - readyBefore, 0)
  notify()

  return {
    awaySeconds,
    simulatedSeconds,
    ripened,
    autoEarned: Math.max(state.money - moneyBefore, 0),
    autoHarvested: Math.max(state.stats.harvested - harvestedBefore, 0),
  }
}
