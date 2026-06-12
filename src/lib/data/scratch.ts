// Scratch-ticket prize table (luck factor). Amounts scale with the value of
// one harvest of the best unlocked plant, so prizes stay relevant from
// basil to pumpkin. Weights are relative; every card wins something.

import type { GameState } from '../game/types'
import { PLANTS } from './plants'
import { xpToNext } from './progression'

export type ScratchPrizeType =
  | 'money-small'
  | 'money-medium'
  | 'money-large'
  | 'xp'
  | 'fertilizer'
  | 'jackpot'

export interface ScratchPrizeDef {
  type: ScratchPrizeType
  weight: number
  /** sprite shown on the three matching cells */
  symbol: string
  /** harvest-value multiplier (money prizes / jackpot) */
  harvestFactor?: number
}

export const SCRATCH_PRIZES: ScratchPrizeDef[] = [
  { type: 'money-small', weight: 34, symbol: 'coin', harvestFactor: 2 },
  { type: 'money-medium', weight: 26, symbol: 'basket', harvestFactor: 6 },
  { type: 'money-large', weight: 14, symbol: 'marktstand', harvestFactor: 18 },
  { type: 'xp', weight: 12, symbol: 'sparkle' },
  { type: 'fertilizer', weight: 10, symbol: 'duenger' },
  { type: 'jackpot', weight: 4, symbol: 'kuerbis-3', harvestFactor: 80 },
]

/** Sale value of one harvest of the best plant the player has unlocked. */
export function bestHarvestValue(state: GameState): number {
  let value = PLANTS[0].yield * PLANTS[0].sellValue
  for (const plant of PLANTS) {
    if (plant.beautyBonus || plant.passiveIncome) continue
    if (state.totalEarned >= plant.unlockAtTotalEarned) value = plant.yield * plant.sellValue
  }
  return value
}

/** Concrete prize amount for a drawn prize type. */
export function scratchPrizeAmount(def: ScratchPrizeDef, state: GameState): number {
  switch (def.type) {
    case 'xp':
      return Math.max(Math.ceil(xpToNext(state.level) * 0.6), 10)
    case 'fertilizer':
      return 6
    default:
      return Math.round(bestHarvestValue(state) * (def.harvestFactor ?? 1))
  }
}
