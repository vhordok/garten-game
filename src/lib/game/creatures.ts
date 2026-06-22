// Creature logic (PHASE 69). Attraction is derived from monotonic metrics
// (level, beauty, decorations, ornamentals, worlds, relics) so an attracted
// animal stays attracted. Befriending stores it; feeding surplus produce raises
// its friendship level and its permanent passive bonus. Pure TS; actions.ts
// wraps befriend/feed in notify()ing helpers. `gardenBeauty` is passed in (not
// imported) to avoid a cycle with modifiers.

import { CREATURES, creatureById, type CreatureDef, type CreatureEffect, type AttractKind, type GiftKind } from '../data/creatures'
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

// ── befriending + the gift loop (PHASE 72: replaces the old produce feeding) ──

/**
 * Befriend a creature whose attraction condition is met (first contact, free).
 * Sets friendship to level 1 and starts its gift timer. Returns true on success.
 */
export function befriendCreature(state: GameState, id: string, beauty: number, now = Date.now()): boolean {
  const def = creatureById(id)
  if (!def) return false
  if (creatureLevel(state, id) > 0) return false // already befriended
  if (!isCreatureAttracted(state, def, beauty)) return false
  if (!state.creatures) state.creatures = {}
  if (!state.creatureGifts) state.creatureGifts = {}
  state.creatures[id] = 1
  state.creatureGifts[id] = now // first gift starts cooking
  return true
}

export interface CreatureGift {
  kind: GiftKind
  amount: number
}

/** Epoch ms at which the creature's next gift becomes collectable. */
export function giftReadyAt(state: GameState, def: CreatureDef): number {
  const start = state.creatureGifts?.[def.id] ?? 0
  return start + def.giftSeconds * 1000
}

/** Whether a befriended creature has a gift waiting to be collected. */
export function isGiftReady(state: GameState, id: string, now = Date.now()): boolean {
  const def = creatureById(id)
  if (!def || creatureLevel(state, id) < 1) return false
  return now >= giftReadyAt(state, def)
}

/** Milliseconds until the next gift (0 = ready now). */
export function giftRemainingMs(state: GameState, id: string, now = Date.now()): number {
  const def = creatureById(id)
  if (!def || creatureLevel(state, id) < 1) return 0
  return Math.max(0, giftReadyAt(state, def) - now)
}

/** The reward a creature's gift currently holds (scales with friendship level). */
export function giftReward(def: CreatureDef, level: number): CreatureGift {
  return { kind: def.gift, amount: Math.max(1, Math.ceil(def.giftBase * Math.max(level, 1))) }
}

/**
 * Collect a ready gift: grant its reward, raise friendship by one (up to the
 * cap), and restart the gift timer. Returns the reward (for the toast/FX) or
 * null if nothing is ready. This is the new, interactive way creatures grow —
 * you click the roaming animal instead of spending produce.
 */
export function collectGift(state: GameState, id: string, now = Date.now()): CreatureGift | null {
  const def = creatureById(id)
  if (!def) return null
  const level = creatureLevel(state, id)
  if (level < 1 || now < giftReadyAt(state, def)) return null
  const reward = giftReward(def, level)
  if (reward.kind === 'tickets') state.scratchTickets += reward.amount
  else if (reward.kind === 'fertilizer') state.fertilizerCharges += reward.amount
  if (level < def.maxLevel) state.creatures![id] = level + 1
  if (!state.creatureGifts) state.creatureGifts = {}
  state.creatureGifts[id] = now
  return reward
}

