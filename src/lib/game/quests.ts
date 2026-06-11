// Quest generation and slot refill — pure helpers over GameState, used by
// actions.ts (player input) and boot (initial fill).

import { CONFIG } from '../data/config'
import { PLANTS } from '../data/plants'
import { questSlots } from '../data/progression'
import type { GameState, QuestState } from './types'

/** Random delivery order over the currently unlocked plants. */
export function generateQuest(s: GameState): QuestState {
  const unlocked = PLANTS.filter((p) => s.totalEarned >= p.unlockAtTotalEarned)
  const plant = unlocked[Math.floor(Math.random() * unlocked.length)]
  // aim for a handful of harvests so orders stay snappy
  const harvests = 6 + Math.floor(Math.random() * 9) // 6..14
  const amount = harvests * plant.yield
  s.questCounter += 1
  return {
    id: s.questCounter,
    plantId: plant.id,
    amount,
    reward: Math.round(amount * plant.sellValue * CONFIG.questRewardFactor),
    xp: amount,
    skipCooldown: 0,
  }
}

/** Fill empty quest slots up to the level-gated count. Returns true if changed. */
export function refillQuests(s: GameState): boolean {
  const slots = questSlots(s.level)
  let changed = false
  while (s.quests.length < slots) {
    s.quests.push(generateQuest(s))
    changed = true
  }
  return changed
}
