// Global multipliers derived from owned upgrades (later also prestige).
// Pure functions over GameState — tick and actions consume these, so live
// and offline simulation automatically agree.

import { CONFIG } from '../data/config'
import { UPGRADES } from '../data/upgrades'
import type { GameState, UpgradeEffect } from './types'

function multiplierFor(state: GameState, effect: UpgradeEffect): number {
  let mult = 1
  for (const def of UPGRADES) {
    if (def.effect !== effect) continue
    const level = state.upgrades[def.id] ?? 0
    if (level > 0) mult *= 1 + def.perLevel * level
  }
  return mult
}

/** Growth speed factor applied to tick deltas (upgrades × compost). */
export function growthMultiplier(state: GameState): number {
  return multiplierFor(state, 'growth') * (1 + CONFIG.compostGrowthPerPoint * state.compost)
}

/** Harvested-units factor: upgrades × compost × permanent level bonus. */
export function yieldMultiplier(state: GameState): number {
  return (
    multiplierFor(state, 'yield') *
    (1 + CONFIG.compostYieldPerPoint * state.compost) *
    (1 + CONFIG.levelYieldPerLevel * Math.max(state.level - 1, 0))
  )
}

/** Sale price factor. */
export function sellMultiplier(state: GameState): number {
  return multiplierFor(state, 'sellPrice')
}

/** Active combo bonus stacks (chain length − 1, capped). */
export function comboStacks(state: GameState): number {
  return Math.min(Math.max(state.combo.count - 1, 0), CONFIG.comboMaxStacks)
}

/** Yield factor from the current harvest chain. */
export function comboMultiplier(state: GameState): number {
  return 1 + CONFIG.comboPerStack * comboStacks(state)
}

/**
 * Resolve a fractional amount to whole units: the fraction is a random
 * chance for one extra unit, so expectation matches exactly while
 * inventories stay integers.
 */
export function rollUnits(amount: number): number {
  const base = Math.floor(amount)
  return Math.random() < amount - base ? base + 1 : base
}
