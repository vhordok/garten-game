// Creature logic (PHASE 69). Attraction is derived from monotonic metrics
// (level, beauty, decorations, ornamentals, worlds, relics) so an attracted
// animal stays attracted. Befriending stores it; feeding surplus produce raises
// its friendship level and its permanent passive bonus. Pure TS; actions.ts
// wraps befriend/feed in notify()ing helpers. `gardenBeauty` is passed in (not
// imported) to avoid a cycle with modifiers.

import { CREATURES, creatureById, type CreatureDef, type CreatureEffect, type AttractKind } from '../data/creatures'
import { questReserved } from './quests'
import type { GameState } from './types'

/** Friendship level of a creature (0 = not yet befriended). */
export function creatureLevel(state: GameState, id: string): number {
  return state.creatures?.[id] ?? 0
}

/** Number of creatures befriended (level ≥ 1). */
export function befriendedCount(state: GameState): number {
  let n = 0
  for (const v of Object.values(state.creatures ?? {})) if (v > 0) n++
  return n
}

/** The current value of an attraction metric. `beauty` is supplied by the caller
 * (gardenBeauty lives in modifiers, which imports this module). */
export function attractMetric(state: GameState, kind: AttractKind, beauty: number): number {
  switch (kind) {
    case 'level':
      return state.level
    case 'beauty':
      return beauty
    case 'decorations':
      return Object.values(state.decorations ?? {}).reduce((a, b) => a + b, 0)
    case 'ornamentals':
      return Object.values(state.ornamentals ?? {}).reduce((a, b) => a + b, 0)
    case 'worldResets':
      return state.worldResets ?? 0
    case 'relics':
      return Object.values(state.relics ?? {}).reduce((a, b) => a + b, 0)
  }
}

/** Whether a creature's attraction condition is currently met. */
export function isCreatureAttracted(state: GameState, def: CreatureDef, beauty: number): boolean {
  return attractMetric(state, def.attract.kind, beauty) >= def.attract.value
}

/** Summed permanent bonus from all befriended creatures for the given effect. */
export function creatureBonus(state: GameState, effect: CreatureEffect): number {
  let bonus = 0
  for (const def of CREATURES) {
    if (def.effect !== effect) continue
    const level = state.creatures?.[def.id] ?? 0
    if (level > 0) bonus += def.perLevel * level
  }
  return bonus
}

// ── produce feeding ──────────────────────────────────────────────────────────
function freeStock(state: GameState, id: string): number {
  return Math.max((state.inventory[id] ?? 0) - questReserved(state, id), 0)
}

/** Total surplus produce (not reserved by open orders) across all crops. */
export function totalFreeStock(state: GameState): number {
  let sum = 0
  for (const id of Object.keys(state.inventory ?? {})) sum += freeStock(state, id)
  return sum
}

/** Produce cost of the NEXT feed (level → level+1), or null when maxed. */
export function feedCost(def: CreatureDef, level: number): number | null {
  if (level >= def.maxLevel) return null
  return Math.ceil(def.feedBase * Math.pow(def.feedFactor, Math.max(level - 1, 0)))
}

/** Drain `amount` total produce from the largest free stacks first. Assumes the
 * caller already checked there's enough. */
function consumeProduce(state: GameState, amount: number): void {
  const stacks = Object.keys(state.inventory)
    .map((id) => [id, freeStock(state, id)] as const)
    .filter(([, f]) => f > 0)
    .sort((a, b) => b[1] - a[1])
  let need = amount
  for (const [id, free] of stacks) {
    if (need <= 0) break
    const take = Math.min(free, need)
    state.inventory[id] -= take
    need -= take
  }
}

/**
 * Befriend a creature whose attraction condition is met (first contact, free).
 * Sets friendship to level 1. Returns true on success.
 */
export function befriendCreature(state: GameState, id: string, beauty: number): boolean {
  const def = creatureById(id)
  if (!def) return false
  if (creatureLevel(state, id) > 0) return false // already befriended
  if (!isCreatureAttracted(state, def, beauty)) return false
  if (!state.creatures) state.creatures = {}
  state.creatures[id] = 1
  return true
}

/**
 * Feed a befriended creature with surplus produce to raise its friendship level.
 * Returns true on success (enough free produce, not maxed).
 */
export function feedCreature(state: GameState, id: string): boolean {
  const def = creatureById(id)
  if (!def) return false
  const level = creatureLevel(state, id)
  if (level < 1) return false // befriend first
  const cost = feedCost(def, level)
  if (cost === null) return false // maxed
  if (totalFreeStock(state) < cost) return false
  consumeProduce(state, cost)
  state.creatures![id] = level + 1
  return true
}
