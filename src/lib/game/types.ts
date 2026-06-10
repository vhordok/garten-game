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

export interface PlotState {
  /** id of the planted PlantDef, null = empty plot */
  plantId: string | null
  /** seconds grown so far (capped at the plant's growTime) */
  progress: number
}

export interface GameStats {
  /** seeds sown */
  planted: number
  /** units harvested */
  harvested: number
  /** units sold */
  sold: number
}

export interface GameState {
  money: number
  /** lifetime money earned from selling — drives unlocks, later prestige */
  totalEarned: number
  plots: PlotState[]
  /** harvested units in storage, keyed by plant id */
  inventory: Record<string, number>
  /** plant sown when clicking an empty plot */
  selectedPlantId: string
  stats: GameStats
  /** epoch ms of the first game start */
  createdAt: number
}
