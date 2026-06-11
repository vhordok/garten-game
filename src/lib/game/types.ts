// Core game types. This module (and everything in src/lib/game/) is pure
// TypeScript — no Svelte imports allowed, see CLAUDE.md.

export type PlantCategory =
  | 'kraeuter'
  | 'gemuese'
  | 'beeren'
  | 'obst'
  | 'baeume'
  | 'zier'
  | 'cannabis'

export interface PlantDef {
  id: string
  name: string
  emoji: string
  category: PlantCategory
  description: string
  /** money cost to sow one plot */
  seedCost: number
  /** seconds from sowing until harvestable */
  growTime: number
  /** harvested units per harvest */
  yield: number
  /** money per harvested unit when sold */
  sellValue: number
  /** available once lifetime earnings (totalEarned) reach this value */
  unlockAtTotalEarned: number
}

export type UpgradeEffect = 'growth' | 'yield' | 'sellPrice'

export interface UpgradeDef {
  id: string
  name: string
  /** sprite name in src/lib/ui/pixel/sprites.ts */
  sprite: string
  description: string
  effect: UpgradeEffect
  /** additive bonus per level, e.g. 0.1 = +10 % per level */
  perLevel: number
  maxLevel: number
  baseCost: number
  /** cost(level) = baseCost × costFactor^level */
  costFactor: number
}

export interface PlotState {
  /** id of the planted PlantDef, null = empty plot */
  plantId: string | null
  /** seconds grown so far (capped at the plant's growTime) */
  progress: number
  /** active-watering charges left for the current crop */
  waterLeft: number
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
  /** money payout on delivery */
  reward: number
  /** bonus XP on delivery */
  xp: number
  /** seconds until this slot may be rerolled (drained by tick) */
  skipCooldown: number
}

export interface GameState {
  money: number
  /** lifetime money earned from selling — drives unlocks, later prestige */
  totalEarned: number
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
  /** upgrade levels keyed by UpgradeDef id (absent = level 0) */
  upgrades: Record<string, number>
  /** active delivery orders (slot count gated by level, see progression) */
  quests: QuestState[]
  /** running id source for quests */
  questCounter: number
  /** unscratched lucky tickets dropped by harvests */
  scratchTickets: number
  /** turbo-fertilizer charges: next harvests yield ×2, one charge each */
  fertilizerCharges: number
  stats: GameStats
  /** epoch ms of the first game start */
  createdAt: number
}
