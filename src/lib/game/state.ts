import { CONFIG } from '../data/config'
import { PLANTS } from '../data/plants'
import type { GameState, PlotState } from './types'

export function emptyPlot(): PlotState {
  return { plantId: null, progress: 0 }
}

export function createDefaultState(now = Date.now()): GameState {
  return {
    money: CONFIG.startMoney,
    totalEarned: 0,
    plots: Array.from({ length: CONFIG.startPlots }, emptyPlot),
    inventory: {},
    selectedPlantId: PLANTS[0].id,
    upgrades: {},
    stats: { planted: 0, harvested: 0, sold: 0 },
    createdAt: now,
  }
}

let state: GameState = createDefaultState()

type Subscriber = (snapshot: GameState) => void
const subscribers = new Set<Subscriber>()

/**
 * The live, mutable state — for game-core modules only.
 * The UI must read via gameStore and mutate via actions.ts instead.
 */
export function getState(): GameState {
  return state
}

export function replaceState(next: GameState): void {
  state = next
  notify()
}

/** Publish a fresh snapshot to all subscribers. Call once after mutating. */
export function notify(): void {
  const snapshot = structuredClone(state)
  for (const fn of subscribers) fn(snapshot)
}

/**
 * Svelte-compatible store contract (`$gameStore` in components).
 * Subscribers receive read-only snapshots, never the live state.
 */
export const gameStore = {
  subscribe(fn: Subscriber): () => void {
    fn(structuredClone(state))
    subscribers.add(fn)
    return () => {
      subscribers.delete(fn)
    }
  },
}
