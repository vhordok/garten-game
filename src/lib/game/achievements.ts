// Achievement tier logic (PHASE 19): pure-ish functions over GameState.
// `achievementTiers[id]` is the highest CLAIMED tier (0 = none). Permanent
// rewards and skill points are derived from the claimed tiers (migration-safe,
// no double counting); one-time rewards are paid once in claimAchievements().

import { ACHIEVEMENTS, achievementById } from '../data/achievements'
import type { AchievementDef } from '../data/achievements'
import type { GameState } from './types'

/** Highest tier (1..6) whose threshold the current metric meets; 0 = none. */
export function reachedTier(state: GameState, def: AchievementDef): number {
  const v = def.metric(state)
  let r = 0
  for (let i = 0; i < def.tiers.length; i++) if (v >= def.tiers[i].threshold) r = i + 1
  return r
}

export function claimedTier(state: GameState, id: string): number {
  return state.achievementTiers[id] ?? 0
}

/** Summed permanent bonus from all CLAIMED tiers for one effect. */
export function achievementBonus(
  state: GameState,
  effect: 'yield' | 'growth' | 'questReward' | 'ticketLuck'
): number {
  let sum = 0
  for (const def of ACHIEVEMENTS) {
    const claimed = claimedTier(state, def.id)
    for (let i = 0; i < claimed; i++) sum += def.tiers[i].rewards[effect] ?? 0
  }
  return sum
}

/**
 * Skill points earned from achievements: one at Gold (tier ≥ 3) and one at
 * Legendär (tier ≥ 6) per track → capped at 2 × tracks. Derived (not granted),
 * so it survives migration without double counting.
 */
export function achievementSkillPoints(state: GameState): number {
  let pts = 0
  for (const def of ACHIEVEMENTS) {
    const c = claimedTier(state, def.id)
    if (c >= 3) pts += 1
    if (c >= 6) pts += 1
  }
  return pts
}

/** Total claimed tiers (for the panel's overall progress + skill-point parity). */
export function totalClaimedTiers(state: GameState): number {
  let n = 0
  for (const def of ACHIEVEMENTS) n += claimedTier(state, def.id)
  return n
}

/**
 * Grant any newly reached tiers: pays one-time rewards once and advances the
 * claimed tier. Returns the list of freshly claimed tiers (for the toast) — call
 * this in tick. Permanent rewards are NOT applied here (they're derived).
 */
export function claimAchievements(state: GameState): { id: string; tier: number }[] {
  const fresh: { id: string; tier: number }[] = []
  for (const def of ACHIEVEMENTS) {
    const reached = reachedTier(state, def)
    let claimed = claimedTier(state, def.id)
    while (claimed < reached) {
      const r = def.tiers[claimed].rewards
      if (r.compost) state.compost += r.compost
      if (r.tickets) state.scratchTickets += r.tickets
      if (r.fertilizer) state.fertilizerCharges += r.fertilizer
      claimed++
      fresh.push({ id: def.id, tier: claimed })
    }
    if (claimed > (state.achievementTiers[def.id] ?? 0)) state.achievementTiers[def.id] = claimed
  }
  return fresh
}

/**
 * Migration / old-save init: set claimed = reached for every track WITHOUT
 * paying one-time rewards (the player already "had" that progress). Permanent
 * bonuses then apply automatically; no retroactive compost/ticket flood.
 */
export function initAchievementTiers(state: GameState): void {
  for (const def of ACHIEVEMENTS) state.achievementTiers[def.id] = reachedTier(state, def)
}

export { achievementById }
