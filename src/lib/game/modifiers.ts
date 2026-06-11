// Global multipliers derived from owned upgrades (later also prestige).
// Pure functions over GameState — tick and actions consume these, so live
// and offline simulation automatically agree.

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

/** Growth speed factor applied to tick deltas. */
export function growthMultiplier(state: GameState): number {
  return multiplierFor(state, 'growth')
}

/** Harvested-units factor (fractions resolved probabilistically). */
export function yieldMultiplier(state: GameState): number {
  return multiplierFor(state, 'yield')
}

/** Sale price factor. */
export function sellMultiplier(state: GameState): number {
  return multiplierFor(state, 'sellPrice')
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
