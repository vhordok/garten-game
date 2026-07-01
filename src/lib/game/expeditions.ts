// Expedition logic (PHASE 68). An expedition runs on a wall-clock timer
// (endsAt). When it's ready the player makes a press-your-luck choice — safe or
// risky — which rolls a RELIC reward. Relics are permanent, stacking passive
// bonuses (survive prestige AND Weltensaat). Pure TS; actions.ts wraps the
// start/claim in notify()ing helpers. Time is real (Date.now), so this paces
// itself regardless of the gold/yield runaway.

import { EXPEDITIONS, expeditionById, isExpeditionUnlocked, type ExpeditionMode } from '../data/expeditions'
import { RELICS, type RelicEffect } from '../data/relics'
import { RELIC_SETS } from '../data/relicSets'
import { creatureLevel } from './creatures'
import { creatureById } from '../data/creatures'
import type { GameState } from './types'

/** PHASE 78: extra risky-success chance from the creature companion (if any),
 * scaling with its friendship level. Capped so it never trivialises the gamble. */
const COMPANION_PER_LEVEL = 0.02
const COMPANION_MAX = 0.3
export function companionRiskBonus(state: GameState, companionId: string | undefined): number {
  if (!companionId || !creatureById(companionId)) return 0
  return Math.min(COMPANION_MAX, creatureLevel(state, companionId) * COMPANION_PER_LEVEL)
}

/** Owned copies of a relic. */
export function relicCount(state: GameState, id: string): number {
  return state.relics?.[id] ?? 0
}

/** Total relics collected (any kind). */
export function totalRelics(state: GameState): number {
  let n = 0
  for (const v of Object.values(state.relics ?? {})) n += v
  return n
}

/** Summed permanent bonus from all owned relics for the given effect. */
export function relicBonus(state: GameState, effect: RelicEffect): number {
  let bonus = 0
  for (const r of RELICS) {
    if (r.effect !== effect) continue
    const n = state.relics?.[r.id] ?? 0
    if (n > 0) bonus += r.perCopy * n
  }
  return bonus
}

// ── PHASE 88: relic SETS ─────────────────────────────────────────────────────
// A set is complete when the player owns >= 1 of each member relic. Completing a
// set adds a flat, permanent bonus on top of the individual relic bonuses — so
// collecting BREADTH pays off, not just stacking one relic. Pure derivation over
// state.relics: no new save field.

/** How many member relics of a set are owned (>= 1 counts once). */
export function relicSetOwned(state: GameState, setId: string): number {
  const set = RELIC_SETS.find((s) => s.id === setId)
  if (!set) return 0
  return set.members.reduce((n, id) => n + ((state.relics?.[id] ?? 0) > 0 ? 1 : 0), 0)
}

/** Whether every member relic of a set is owned (>= 1). */
export function isRelicSetComplete(state: GameState, setId: string): boolean {
  const set = RELIC_SETS.find((s) => s.id === setId)
  if (!set) return false
  return set.members.every((id) => (state.relics?.[id] ?? 0) > 0)
}

/** Summed set-completion bonus for an effect (flat per completed set). */
export function relicSetBonus(state: GameState, effect: RelicEffect): number {
  let bonus = 0
  for (const set of RELIC_SETS) {
    if (set.effect !== effect) continue
    if (set.members.every((id) => (state.relics?.[id] ?? 0) > 0)) bonus += set.bonus
  }
  return bonus
}

/** Milliseconds left on the active expedition (0 = none / ready). */
// ── PHASE 91: a SECOND expedition slot ───────────────────────────────────────
// Weltensaat-veterans can run two expeditions in parallel (slot 1 unlocks at
// SECOND_SLOT_WORLDS resets). Kept backward-compatible: slot 0 is the original
// `activeExpedition`, slot 1 is `activeExpedition2`; every function defaults to
// slot 0 so existing callers/tests are unchanged. `expeditionSlots` gates how
// many are usable.
export const SECOND_SLOT_WORLDS = 2

/** How many expedition slots the player may use (1, or 2 after enough worlds). */
export function expeditionSlots(state: GameState): number {
  return (state.worldResets ?? 0) >= SECOND_SLOT_WORLDS ? 2 : 1
}

type ExpeditionRun = { id: string; endsAt: number; companion?: string } | null

/** The active run in a given slot (0 = original, 1 = second). */
export function expeditionInSlot(state: GameState, slot = 0): ExpeditionRun {
  return slot === 1 ? state.activeExpedition2 : state.activeExpedition
}
function setSlot(state: GameState, slot: number, run: ExpeditionRun): void {
  if (slot === 1) state.activeExpedition2 = run
  else state.activeExpedition = run
}

/** Occupied slots (0/1/2). */
export function activeExpeditionCount(state: GameState): number {
  return (state.activeExpedition ? 1 : 0) + (state.activeExpedition2 ? 1 : 0)
}

export function expeditionRemainingMs(state: GameState, now = Date.now(), slot = 0): number {
  const exp = expeditionInSlot(state, slot)
  if (!exp) return 0
  return Math.max(0, exp.endsAt - now)
}

/** Whether the given slot has a returned expedition (ready to claim). */
export function expeditionReady(state: GameState, now = Date.now(), slot = 0): boolean {
  const exp = expeditionInSlot(state, slot)
  return !!exp && now >= exp.endsAt
}

/** Whether ANY slot has a returned expedition. */
export function anyExpeditionReady(state: GameState, now = Date.now()): boolean {
  return expeditionReady(state, now, 0) || (expeditionSlots(state) > 1 && expeditionReady(state, now, 1))
}

/** Send an expedition into the first FREE unlocked slot, optionally with a
 * befriended-creature companion. Pure: mutates state, returns true on success. */
export function startExpedition(state: GameState, id: string, companion?: string, now = Date.now()): boolean {
  const slots = expeditionSlots(state)
  let free = -1
  for (let i = 0; i < slots; i++) if (!expeditionInSlot(state, i)) { free = i; break }
  if (free === -1) return false // every slot busy
  const def = expeditionById(id)
  if (!def) return false
  if (!isExpeditionUnlocked(def, state.worldResets ?? 0)) return false
  if (state.money < def.cost) return false
  // only a befriended creature may come along
  const valid = companion && creatureLevel(state, companion) > 0 ? companion : undefined
  state.money -= def.cost
  setSlot(state, free, { id, endsAt: now + def.durationSeconds * 1000, companion: valid })
  return true
}

export interface ExpeditionResult {
  expeditionId: string
  choice: ExpeditionMode
  success: boolean
  relicId: string | null
  copies: number
}

function grant(state: GameState, relicId: string, copies: number): void {
  if (!state.relics) state.relics = {}
  state.relics[relicId] = (state.relics[relicId] ?? 0) + copies
}

/**
 * Claim a returned expedition with a press-your-luck choice (framed by a return
 * event, PHASE 76). Modes:
 *   safe   → one relic from the safe pool (guaranteed)
 *   double → two relics from the safe pool (guaranteed)
 *   risky  → one rarer relic from the risky pool at riskSuccess%, else nothing
 * Returns the outcome (for the toast/UI) or null if there's nothing to claim.
 * RNG via Math.random so tests can stub it (withBoringRng).
 */
export function claimExpedition(state: GameState, choice: ExpeditionMode = 'safe', now = Date.now(), slot = 0): ExpeditionResult | null {
  const exp = expeditionInSlot(state, slot)
  if (!exp) return null
  const def = expeditionById(exp.id)
  if (!def || now < exp.endsAt) return null

  let result: ExpeditionResult
  if (choice === 'risky') {
    // PHASE 78: a companion creature lifts the success chance by its friendship
    const successChance = def.riskSuccess + companionRiskBonus(state, exp.companion)
    if (Math.random() < successChance && def.riskyPool.length > 0) {
      const relicId = def.riskyPool[Math.floor(Math.random() * def.riskyPool.length)]
      grant(state, relicId, def.riskyCopies)
      result = { expeditionId: def.id, choice, success: true, relicId, copies: def.riskyCopies }
    } else {
      result = { expeditionId: def.id, choice, success: false, relicId: null, copies: 0 }
    }
  } else {
    // safe (1) or double (2) — guaranteed relics from the safe pool
    const copies = choice === 'double' ? 2 : 1
    const relicId = def.safePool[Math.floor(Math.random() * def.safePool.length)]
    grant(state, relicId, copies)
    result = { expeditionId: def.id, choice, success: true, relicId, copies }
  }

  setSlot(state, slot, null)
  state.expeditionsDone = (state.expeditionsDone ?? 0) + 1
  return result
}

/** Expeditions the player may currently send (unlock gate met). */
export function unlockedExpeditions(state: GameState) {
  return EXPEDITIONS.filter((e) => isExpeditionUnlocked(e, state.worldResets ?? 0))
}
