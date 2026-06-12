import { CONFIG } from '../data/config'
import { PLANTS } from '../data/plants'
import type { GameState, PlotState } from './types'

export function emptyPlot(): PlotState {
  return { plantId: null, progress: 0, waterLeft: 0, regrowing: false }
}

export function createDefaultState(now = Date.now()): GameState {
  return {
    money: CONFIG.startMoney,
    totalEarned: 0,
    lifetimeEarned: 0,
    parcels: 1,
    compost: 0,
    level: 1,
    xp: 0,
    plots: Array.from({ length: CONFIG.startPlots }, emptyPlot),
    inventory: {},
    selectedPlantId: PLANTS[0].id,
    upgrades: {},
    quests: [],
    questCounter: 0,
    questStreak: 0,
    scratchTickets: 0,
    fertilizerCharges: 0,
    helperAcc: { harvest: 0, sow: 0, sell: 0 },
    marketTime: 0,
    daily: { lastClaim: 0, streak: 0 },
    weather: { id: null, remaining: 0 },
    achievements: [],
    licenses: 0,
    records: { bestHarvest: 0, longestCombo: 0, biggestWin: 0 },
    history: [],
    historyAcc: { seconds: 0, earnedStart: 0 },
    combo: { count: 0, remaining: 0 },
    stats: { planted: 0, harvested: 0, sold: 0, crits: 0 },
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
