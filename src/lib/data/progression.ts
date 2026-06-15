// Gardener-level curve and rewards (GAME_DESIGN.md §9.4). 1 XP per
// harvested unit; quests add bonus XP later. Pure balance data.

/**
 * XP required to advance FROM the given level to the next.
 * PHASE 25: a compounding factor steepens the curve in the late game so levels
 * stop racing past at several per second — early pacing is barely touched, but
 * level 1000 costs ~40× more and level 10000 hundreds×, making each level an
 * earned, meaningful step. Pure curve change → no save break (a high-level save
 * just levels slower from here on, never rolls back).
 */
export function xpToNext(level: number): number {
  return Math.round(20 * Math.pow(level, 1.5) * (1 + level / 120))
}

/** Instant money payout for REACHING the given level. */
export function levelUpReward(level: number): number {
  return Math.round(20 * Math.pow(level, 2))
}

/** Quest-board slots unlocked at the given gardener level (1 → 3). */
export function questSlots(level: number): number {
  if (level >= 5) return 3
  if (level >= 3) return 2
  return 1
}
