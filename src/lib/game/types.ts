// Core game types. This module (and everything in src/lib/game/) is pure
// TypeScript — no Svelte imports allowed, see CLAUDE.md.

export type PlantCategory =
  | 'kraeuter'
  | 'gemuese'
  | 'beeren'
  | 'obst'
  | 'magie'
  | 'baeume'
  | 'zier'
  | 'cannabis'

export interface PlantDef {
  id: string
  name: string
  /** harvested produce, plural (PHASE 8): quests/storage talk about the goods
   * ("Äpfel"), not the plant ("Apfelbaum"). Defaults to name when omitted. */
  produce?: string
  emoji: string
  category: PlantCategory
  description: string
  /** money cost to sow one plot */
  seedCost: number
  /** seconds from sowing until harvestable */
  growTime: number
  /** if set, the plant stays after harvest and re-ripens in this many seconds */
  regrowTime?: number
  /** ornamental plants: no harvest — while mature they add this fraction
   * to the global sell price ("Gartenschönheit", GAME_DESIGN §3) */
  beautyBonus?: number
  /** timber trees: no harvest — while mature they trickle this much gold
   * per second (sold as wood, so sell multipliers apply) */
  passiveIncome?: number
  /** harvested units per harvest */
  yield: number
  /** money per harvested unit when sold */
  sellValue: number
  /** available once lifetime earnings (totalEarned) reach this value */
  unlockAtTotalEarned: number
  /** cannabis: additionally requires this license level (see data/licenses) */
  requiresLicense?: number
  /** cannabis care: below this Gießkannen-Stufe the plant grows at half speed */
  needsWateringLevel?: number
}

export type UpgradeEffect =
  | 'growth'
  | 'yield'
  | 'sellPrice'
  | 'waterCharges'
  | 'comboWindow'
  | 'critChance'
  | 'scratchLuck'
  | 'offlineCap'
  | 'autoHarvest'
  | 'autoSow'
  | 'autoSell'

export type UpgradeSection = 'boost' | 'glueck' | 'helfer'

export interface UpgradeDef {
  id: string
  name: string
  /** sprite name in src/lib/ui/pixel/sprites.ts */
  sprite: string
  description: string
  effect: UpgradeEffect
  /** shop grouping */
  section: UpgradeSection
  /** bonus per level — unit depends on the effect (factor, seconds, …) */
  perLevel: number
  maxLevel: number
  baseCost: number
  /** cost(level) = baseCost × costFactor^level */
  costFactor: number
}

export interface PlotState {
  /** id of the planted PlantDef, null = empty plot */
  plantId: string | null
  /** seconds grown so far (capped at the current cycle's grow time) */
  progress: number
  /** active-watering charges left for the current cycle */
  waterLeft: number
  /** true once a regrow plant was harvested at least once (shorter cycles) */
  regrowing: boolean
}

export interface GameStats {
  /** seeds sown */
  planted: number
  /** units harvested */
  harvested: number
  /** units sold */
  sold: number
  /** golden harvests (perfect + legendary) */
  crits: number
}

/**
 * Harvest chain state. Deliberately transient: ticks drain `remaining`,
 * loading a save resets it (offline play earns no combo).
 */
export interface ComboState {
  /** chain length; bonus stacks are count − 1, capped in config */
  count: number
  /** seconds left before the chain breaks */
  remaining: number
}

/** One rotating delivery order on the quest board. */
export interface QuestState {
  /** unique per save (questCounter) — used for UI keying */
  id: number
  plantId: string
  /** units to deliver from storage */
  amount: number
  /** base money payout (delivery streak adds on top) */
  reward: number
  /** bonus XP on delivery */
  xp: number
  /** order tier: gold pays best and drops a scratch ticket */
  tier: string
  /** who placed the order (flavor) */
  client: string
  /** seconds until this slot may be rerolled (drained by tick) */
  skipCooldown: number
}

export interface GameState {
  money: number
  /** money earned from selling THIS round — drives unlocks and compost */
  totalEarned: number
  /** money earned across all rounds (stats, never resets) */
  lifetimeEarned: number
  /** leased parcels (starts at 1); raises the plot cap */
  parcels: number
  /** prestige currency: permanent yield/growth bonuses */
  compost: number
  /** per-plant mastery XP (= lifetime units harvested of each plant); survives
   * prestige, drives a permanent per-plant yield bonus (PHASE 11) */
  mastery: Record<string, number>
  /** per-category specialisation level, bought with gold; survives prestige,
   * drives a permanent per-category yield bonus (PHASE 11 gold sink) */
  specializations: Record<string, number>
  /** gardener level (starts at 1); gates quest slots and future QoL */
  level: number
  /** progress within the current level (resets each level-up) */
  xp: number
  plots: PlotState[]
  combo: ComboState
  /** harvested units in storage, keyed by plant id */
  inventory: Record<string, number>
  /** plant sown when clicking an empty plot */
  selectedPlantId: string
  /** plant the Sä-Gnom auto-sows; null = follow the manual selection (PHASE 3) */
  autoSowPlantId: string | null
  /** upgrade levels keyed by UpgradeDef id (absent = level 0) */
  upgrades: Record<string, number>
  /** active delivery orders (slot count gated by level, see progression) */
  quests: QuestState[]
  /** running id source for quests */
  questCounter: number
  /** consecutive deliveries without skipping — boosts quest payouts */
  questStreak: number
  /** unscratched lucky tickets dropped by harvests */
  scratchTickets: number
  /** turbo-fertilizer charges: next harvests yield ×2, one charge each */
  fertilizerCharges: number
  /** helper automation accumulators (seconds of pending work) */
  helperAcc: { harvest: number; sow: number; sell: number }
  /** market-wave clock in seconds (advanced by tick, drives sell prices) */
  marketTime: number
  /** daily gift: last claimed local day index + consecutive-day streak */
  daily: { lastClaim: number; streak: number }
  /** active weather event (transient; ticks drain it, loading clears it) */
  weather: { id: string | null; remaining: number }
  /** unlocked achievement ids — each grants +1 % permanent yield */
  achievements: string[]
  /** cannabis license level owned (0–3), survives prestige */
  licenses: number
  /** personal records (survive prestige) */
  records: { bestHarvest: number; longestCombo: number; biggestWin: number }
  /** earnings per 30-min bucket, newest last (ring of 48 ≈ 24 h) */
  history: number[]
  /** current history bucket: elapsed seconds + lifetime earnings at start */
  historyAcc: { seconds: number; earnedStart: number }
  stats: GameStats
  /** epoch ms of the first game start */
  createdAt: number
}
