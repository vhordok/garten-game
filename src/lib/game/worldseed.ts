// Weltensaat — the higher prestige layer (PHASE 51). When the player has leased
// enough parcels they may "sow a new world": this resets the parcel/compost
// prestige layer AND the round, but every permanent collection (mastery,
// specialisations, skills, variants, ornamentals, decorations, achievements,
// campaign, licenses, records) survives. In exchange they bank Sternensaat
// (`starseed`), which grants a permanent, garden-wide yield multiplier so the
// re-climb is faster than the last. Pure TS; the reset action lives in actions.ts.

import { CONFIG } from '../data/config'
import type { GameState } from './types'

/** Sternensaat banked by performing a Weltensaat right now (0 if not eligible). */
export function starseedGain(state: GameState): number {
  if (state.parcels < CONFIG.weltensaatMinParcels) return 0
  return state.parcels - CONFIG.weltensaatMinParcels + 1
}

/** Whether a Weltensaat is available (enough parcels to bank ≥1 Sternensaat). */
export function canWeltensaat(state: GameState): boolean {
  return starseedGain(state) > 0
}

/** Permanent garden-wide yield factor from owned Sternensaat (≥1). */
export function worldseedYieldFactor(state: GameState): number {
  return 1 + (state.starseed ?? 0) * CONFIG.starseedYieldPer
}
