// Decoration logic (PHASE 49). Owned counts live in state.decorations; each copy
// adds its beautyBonus to gardenBeauty (see modifiers.ts). Pure TS; the buy
// action wraps this in actions.ts.

import { DECORATIONS, decorationById, nextDecorationCost } from '../data/decorations'
import type { GameState } from './types'

/** Owned copies of a decoration. */
export function decorationCount(state: GameState, id: string): number {
  return state.decorations[id] ?? 0
}

/** Summed raw beauty from all placed decorations (before global multipliers). */
export function decorationBeauty(state: GameState): number {
  let sum = 0
  for (const def of DECORATIONS) {
    const n = state.decorations[def.id] ?? 0
    if (n > 0) sum += def.beautyBonus * n
  }
  return sum
}

/** True once the player has placed at least one decoration of any kind. */
export function ownsAnyDecoration(state: GameState): boolean {
  for (const n of Object.values(state.decorations)) if (n > 0) return true
  return false
}

/**
 * Buy one copy of a decoration if affordable and under the cap. Mutates state
 * (spends gold, bumps the count) and returns true on success. Notify is the
 * caller's job (actions.ts), mirroring buyOrnamental.
 */
export function purchaseDecoration(state: GameState, id: string): boolean {
  const def = decorationById(id)
  if (!def) return false
  const owned = state.decorations[id] ?? 0
  const cost = nextDecorationCost(def, owned)
  if (!Number.isFinite(cost) || state.money < cost) return false
  state.money -= cost
  state.decorations[id] = owned + 1
  return true
}
