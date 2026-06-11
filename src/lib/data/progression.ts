// Gardener-level curve and rewards (GAME_DESIGN.md §9.4). 1 XP per
// harvested unit; quests add bonus XP later. Pure balance data.

/** XP required to advance FROM the given level to the next. */
export function xpToNext(level: number): number {
  return Math.round(20 * Math.pow(level, 1.4))
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
