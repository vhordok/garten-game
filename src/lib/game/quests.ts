// Quest generation and slot refill — pure helpers over GameState, used by
// actions.ts (player input) and boot (initial fill).

import { CONFIG } from '../data/config'
import { PLANTS } from '../data/plants'
import { questSlots } from '../data/progression'
import { QUEST_CLIENTS, QUEST_TIERS } from '../data/questFlavor'
import type { GameState, QuestState } from './types'

function rollTier(): (typeof QUEST_TIERS)[number] {
  const total = QUEST_TIERS.reduce((sum, t) => sum + t.weight, 0)
  let roll = Math.random() * total
  for (const tier of QUEST_TIERS) {
    roll -= tier.weight
    if (roll < 0) return tier
  }
  return QUEST_TIERS[0]
}

/** Current payout bonus from the delivery streak. */
export function questStreakBonus(s: GameState): number {
  return Math.min(s.questStreak * CONFIG.questStreakPerDelivery, CONFIG.questStreakMaxBonus)
}

/**
 * Units of a crop that open delivery orders still need (PHASE 2).
 * Quick sells and the market cart leave this much in storage.
 */
export function questReserved(s: GameState, plantId: string): number {
  let sum = 0
  for (const quest of s.quests) {
    if (quest.plantId === plantId) sum += quest.amount
  }
  return sum
}

/** Random delivery order over the currently unlocked plants. */
export function generateQuest(s: GameState): QuestState {
  const tier = rollTier()
  const client = QUEST_CLIENTS[Math.floor(Math.random() * QUEST_CLIENTS.length)]
  const harvestable = PLANTS.filter((p) => !p.beautyBonus && !p.passiveIncome)
  // PHASE 12: how far the order list may reach — the current round, but never
  // below a fraction of the best round ever (so a prestige doesn't drop orders
  // back to basil). Stays ≤ maxUnlockEarned, so the plant was reached before
  // and will be again — the order is always eventually fulfillable.
  const reach = Math.max(s.totalEarned, s.maxUnlockEarned * CONFIG.questReachFactor)
  // a tier band just below the reach drops the trivial early plants once the
  // player is advanced, so orders keep asking for varied, on-level produce
  let pool = harvestable.filter(
    (p) => p.unlockAtTotalEarned <= reach && p.unlockAtTotalEarned >= reach / CONFIG.questBandWidth
  )
  if (pool.length === 0) pool = harvestable.filter((p) => p.unlockAtTotalEarned <= reach)
  if (pool.length === 0) pool = [harvestable[0]]
  const plant = pool[Math.floor(Math.random() * pool.length)]
  // aim for a handful of harvests so orders stay snappy
  const harvests = 6 + Math.floor(Math.random() * 9) // 6..14
  const amount = harvests * plant.yield
  s.questCounter += 1
  return {
    id: s.questCounter,
    plantId: plant.id,
    amount,
    reward: Math.round(amount * plant.sellValue * tier.rewardFactor),
    xp: amount,
    tier: tier.id,
    client,
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
