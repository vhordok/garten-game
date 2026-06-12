// XP/level resolution shared by player actions AND helper automation in
// tick — both award XP, level-ups always resolve identically.

import { levelUpReward, xpToNext } from '../data/progression'
import { refillQuests } from './quests'
import type { GameState } from './types'

export interface LevelUp {
  level: number
  reward: number
}

/**
 * Add XP and resolve any level-ups (XP overflow carries into the next
 * level, the money reward is paid out immediately).
 */
export function grantXp(s: GameState, amount: number): LevelUp[] {
  if (amount <= 0) return []
  s.xp += amount
  const ups: LevelUp[] = []
  while (s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level)
    s.level += 1
    const reward = levelUpReward(s.level)
    s.money += reward
    ups.push({ level: s.level, reward })
  }
  // higher levels may unlock additional quest slots
  if (ups.length > 0) refillQuests(s)
  return ups
}
