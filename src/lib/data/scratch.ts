// Scratch-ticket prize table (luck factor). Amounts scale with the value of
// one harvest of the best unlocked plant, so prizes stay relevant from
// basil to pumpkin. Weights are relative; every card wins something.

import type { GameState } from '../game/types'
import { yieldMultiplier, sellMultiplier } from '../game/modifiers'
import { CONFIG } from './config'
import { PLANTS, plantById } from './plants'
import { xpToNext } from './progression'

export type ScratchPrizeType =
  | 'money-small'
  | 'money-medium'
  | 'money-large'
  | 'xp'
  | 'fertilizer'
  | 'compost'
  | 'mastery'
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
  { type: 'money-small', weight: 30, symbol: 'coin', harvestFactor: 2 },
  { type: 'money-medium', weight: 22, symbol: 'basket', harvestFactor: 6 },
  { type: 'money-large', weight: 12, symbol: 'marktstand', harvestFactor: 18 },
  { type: 'xp', weight: 10, symbol: 'sparkle' },
  { type: 'fertilizer', weight: 8, symbol: 'duenger' },
  { type: 'compost', weight: 8, symbol: 'seedling' },
  { type: 'mastery', weight: 6, symbol: 'pokal' },
  { type: 'jackpot', weight: 4, symbol: 'kuerbis-3', harvestFactor: 80 },
]

/** Sale value of one harvest of the best plant the player has unlocked (raw). */
export function bestHarvestValue(state: GameState): number {
  let value = PLANTS[0].yield * PLANTS[0].sellValue
  for (const plant of PLANTS) {
    if (plant.beautyBonus || plant.passiveIncome) continue
    if (state.totalEarned >= plant.unlockAtTotalEarned) value = plant.yield * plant.sellValue
  }
  return value
}

/**
 * Gold one best-plant harvest is ACTUALLY worth right now — raw value lifted by
 * the live yield × sell multipliers. PHASE 18 fix: money prizes scale with real
 * income, so a ticket stays relevant from basil to the Qi-range endgame instead
 * of paying yesterday's pocket change.
 */
export function effectiveHarvestValue(state: GameState): number {
  return bestHarvestValue(state) * yieldMultiplier(state) * sellMultiplier(state)
}

/** Concrete prize amount for a drawn prize type. */
export function scratchPrizeAmount(def: ScratchPrizeDef, state: GameState): number {
  switch (def.type) {
    case 'xp':
      return Math.max(Math.ceil(xpToNext(state.level) * 0.6), 10)
    case 'fertilizer':
      return 6
    case 'compost':
      // scales gently with progress (parcels) so it matters but never floods
      return Math.max(2, Math.round(state.parcels * 1.5))
    case 'mastery':
      // ~one early mastery level of the currently selected harvestable plant
      return Math.round(CONFIG.masteryBase * 0.75)
    default:
      return Math.round(effectiveHarvestValue(state) * (def.harvestFactor ?? 1))
  }
}

/** The plant a mastery prize should feed (the selected one, if harvestable). */
export function masteryPrizePlant(state: GameState): string | null {
  const def = plantById(state.selectedPlantId)
  return def && def.yield > 0 ? def.id : null
}
