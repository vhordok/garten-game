// Expedition logic (PHASE 68). An expedition runs on a wall-clock timer
// (endsAt). When it's ready the player makes a press-your-luck choice — safe or
// risky — which rolls a RELIC reward. Relics are permanent, stacking passive
// bonuses (survive prestige AND Weltensaat). Pure TS; actions.ts wraps the
// start/claim in notify()ing helpers. Time is real (Date.now), so this paces
// itself regardless of the gold/yield runaway.

import { EXPEDITIONS, expeditionById, isExpeditionUnlocked, type ExpeditionMode } from '../data/expeditions'
import { RELICS, type RelicEffect } from '../data/relics'
import type { GameState } from './types'

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

/** Milliseconds left on the active expedition (0 = none / ready). */
export function expeditionRemainingMs(state: GameState, now = Date.now()): number {
  const exp = state.activeExpedition
  if (!exp) return 0
  return Math.max(0, exp.endsAt - now)
}

/** Whether an expedition is out and has returned (ready to claim). */
export function expeditionReady(state: GameState, now = Date.now()): boolean {
  return !!state.activeExpedition && now >= state.activeExpedition.endsAt
}

/** Send an expedition (one slot). Pure: mutates state, returns true on success. */
export function startExpedition(state: GameState, id: string, now = Date.now()): boolean {
  if (state.activeExpedition) return false // one at a time
  const def = expeditionById(id)
  if (!def) return false
  if (!isExpeditionUnlocked(def, state.worldResets ?? 0)) return false
  if (state.money < def.cost) return false
  state.money -= def.cost
  state.activeExpedition = { id, endsAt: now + def.durationSeconds * 1000 }
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
export function claimExpedition(state: GameState, choice: ExpeditionMode = 'safe', now = Date.now()): ExpeditionResult | null {
  const exp = state.activeExpedition
  if (!exp) return null
  const def = expeditionById(exp.id)
  if (!def || now < exp.endsAt) return null

  let result: ExpeditionResult
  if (choice === 'risky') {
    if (Math.random() < def.riskSuccess && def.riskyPool.length > 0) {
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

  state.activeExpedition = null
  state.expeditionsDone = (state.expeditionsDone ?? 0) + 1
  return result
}

/** Expeditions the player may currently send (unlock gate met). */
export function unlockedExpeditions(state: GameState) {
  return EXPEDITIONS.filter((e) => isExpeditionUnlocked(e, state.worldResets ?? 0))
}
