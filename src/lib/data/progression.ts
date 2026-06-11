// Gardener-level curve and rewards (GAME_DESIGN.md §9.4). 1 XP per
// harvested unit; quests add bonus XP later. Pure balance data.

/** XP required to advance FROM the given level to the next. */
export function xpToNext(level: number): number {
  return Math.round(30 * Math.pow(level, 1.55))
}

/** Instant money payout for REACHING the given level. */
export function levelUpReward(level: number): number {
  return Math.round(15 * Math.pow(level, 2.2))
}
