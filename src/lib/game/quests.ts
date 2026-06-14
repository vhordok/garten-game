// Quest generation and slot refill — pure helpers over GameState, used by
// actions.ts (player input) and boot (initial fill).

import { CONFIG } from '../data/config'
import { parcelBonus } from '../data/milestones'
import { PLANTS, plantById } from '../data/plants'
import { questSlots } from '../data/progression'
import { QUEST_CLIENTS, QUEST_TIERS } from '../data/questFlavor'
import type { GameState, PlantDef, QuestKind, QuestState } from './types'

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
 * Units of a crop that open delivery orders still need (PHASE 2, category-aware
 * since PHASE 13). Quick sells and the market cart leave this much in storage.
 * Category orders protect the category's stock conservatively (per-plant cap at
 * what's held), so the protection never reports more than the player owns.
 */
export function questReserved(s: GameState, plantId: string): number {
  const def = plantById(plantId)
  if (!def) return 0
  let sum = 0
  for (const quest of s.quests) {
    for (const item of quest.items) {
      if (item.plantId === plantId) sum += item.amount
      else if (item.category && item.category === def.category) {
        sum += Math.min(item.amount, s.inventory[plantId] ?? 0)
      }
    }
  }
  return sum
}

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/**
 * Time-fair order size (PHASE 13): how much a (plot-capped) full field of this
 * plant produces in a few minutes — slow endgame plants get small amounts, fast
 * plants larger ones, so no order asks you to wait for hours on one slow crop.
 */
function fairAmount(s: GameState, plant: PlantDef): number {
  const cycle = plant.regrowTime ?? plant.growTime
  const plots = Math.min(Math.max(s.plots.length, CONFIG.startPlots), CONFIG.questEffortPlotsCap)
  const perSecond = (plots * plant.yield) / cycle
  const seconds = CONFIG.questEffortMin + Math.random() * (CONFIG.questEffortMax - CONFIG.questEffortMin)
  return Math.max(plant.yield, Math.min(Math.round(seconds * perSecond), CONFIG.questAmountCap))
}

/** On-tier pool of harvestable plants for orders (PHASE 12 progress band). */
function questPool(s: GameState): PlantDef[] {
  const harvestable = PLANTS.filter((p) => !p.beautyBonus && !p.passiveIncome)
  const reach = Math.max(s.totalEarned, s.maxUnlockEarned * CONFIG.questReachFactor)
  let pool = harvestable.filter(
    (p) => p.unlockAtTotalEarned <= reach && p.unlockAtTotalEarned >= reach / CONFIG.questBandWidth
  )
  if (pool.length === 0) pool = harvestable.filter((p) => p.unlockAtTotalEarned <= reach)
  if (pool.length === 0) pool = [harvestable[0]]
  return pool
}

/** Random delivery order — single, combo, category or a big haul (PHASE 13). */
export function generateQuest(s: GameState): QuestState {
  const tier = rollTier()
  const client = pick(QUEST_CLIENTS)
  const pool = questPool(s)
  s.questCounter += 1

  const roll = Math.random()
  const bigAllowed = s.parcels >= 2 || s.maxUnlockEarned >= 1e6
  let kind: QuestKind = 'single'
  if (pool.length >= 2 && roll < 0.16) kind = 'combi'
  else if (roll < 0.3) kind = 'category'
  else if (bigAllowed && roll < 0.4) kind = 'big'

  const items: QuestState['items'] = []
  let value = 0 // Σ amount × sellValue — drives the reward
  let bonus = 1

  if (kind === 'combi') {
    const a = pick(pool)
    const rest = pool.filter((p) => p.id !== a.id)
    const b = rest.length > 0 ? pick(rest) : a
    for (const p of [a, b]) {
      const amount = Math.max(1, Math.round(fairAmount(s, p) * 0.6))
      items.push({ plantId: p.id, amount })
      value += amount * p.sellValue
    }
    bonus = CONFIG.questCombiBonus
  } else if (kind === 'category') {
    const category = pick(pool).category
    const inCat = pool.filter((p) => p.category === category)
    // reward off the cheapest in-band plant of the category → delivering any of
    // them is always a fair trade, never an exploit
    const rep = inCat.reduce((lo, p) => (p.sellValue < lo.sellValue ? p : lo))
    const amount = fairAmount(s, rep)
    items.push({ category, amount })
    value = amount * rep.sellValue
    bonus = CONFIG.questCategoryBonus
  } else if (kind === 'big') {
    const p = pick(pool)
    const amount = Math.round(fairAmount(s, p) * CONFIG.questBigSizeMult)
    items.push({ plantId: p.id, amount })
    value = amount * p.sellValue
    bonus = CONFIG.questBigBonus
  } else {
    const p = pick(pool)
    const amount = fairAmount(s, p)
    items.push({ plantId: p.id, amount })
    value = amount * p.sellValue
  }

  const xp = items.reduce((sum, it) => sum + it.amount, 0)
  return {
    id: s.questCounter,
    kind,
    items,
    reward: Math.round(value * tier.rewardFactor * bonus),
    // gold tier drops a ticket; a big haul drops an extra one (real bonus,
    // unlike compost which would just borrow from the next prestige gain)
    rewardTickets: (tier.bonusTicket ? 1 : 0) + (kind === 'big' ? 1 : 0),
    rewardCompost: 0,
    xp,
    tier: tier.id,
    client,
    skipCooldown: 0,
  }
}

/** Quest-board slots: level-gated, plus any from parcel milestones (PHASE 13). */
export function questSlotCount(s: GameState): number {
  return questSlots(s.level) + parcelBonus(s.parcels, 'questSlot')
}

/** Fill empty quest slots up to the unlocked count. Returns true if changed. */
export function refillQuests(s: GameState): boolean {
  const slots = questSlotCount(s)
  let changed = false
  while (s.quests.length < slots) {
    s.quests.push(generateQuest(s))
    changed = true
  }
  return changed
}
