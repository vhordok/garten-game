// Weltensaat — the higher prestige layer (PHASE 51). When the player has leased
// enough parcels they may "sow a new world": this resets the parcel/compost
// prestige layer AND the round, but every permanent collection (mastery,
// specialisations, skills, variants, ornamentals, decorations, achievements,
// campaign, licenses, records) survives. In exchange they bank Sternensaat
// (`starseed`), which grants a permanent, garden-wide yield multiplier so the
// re-climb is faster than the last. Pure TS; the reset action lives in actions.ts.

import { CONFIG } from '../data/config'
import { STAR_UPGRADES, starUpgradeById, starUpgradeCost, type StarEffect } from '../data/starUpgrades'
import { worldMilestoneBonus } from '../data/worldMilestones'
import type { GameState } from './types'

/** Sternensaat banked by performing a Weltensaat right now (0 if not eligible).
 * PHASE 61: world milestones add a flat bonus per sowing on top of the depth. */
export function starseedGain(state: GameState): number {
  if (state.parcels < CONFIG.weltensaatMinParcels) return 0
  const depth = state.parcels - CONFIG.weltensaatMinParcels + 1
  return depth + worldMilestoneBonus(state.worldResets ?? 0, 'starseedGain')
}

/** Whether a Weltensaat is available (enough parcels to bank ≥1 Sternensaat). */
export function canWeltensaat(state: GameState): boolean {
  return starseedGain(state) > 0
}

/** Total Sternensaat ever banked (pool + spent) — drives the flat yield bonus so
 * spending in the Sternenkammer never weakens it (mirrors compostClaimed). */
export function starseedBanked(state: GameState): number {
  return Math.max(state.starseed ?? 0, 0) + Math.max(state.starseedSpent ?? 0, 0)
}

/** Permanent garden-wide yield factor from total banked Sternensaat (≥1).
 * PHASE 56: COMPOUNDING — each banked Sternensaat multiplies yield by
 * (1 + starseedYieldPer), so deep worlds reach a multiplier that can actually
 * outgrow the late-game compost runaway. Clamped to stay finite. */
export function worldseedYieldFactor(state: GameState): number {
  const factor = Math.pow(1 + CONFIG.starseedYieldPer, starseedBanked(state))
  return Number.isFinite(factor) ? Math.min(factor, 1e300) : 1e300
}

/** Owned level of a Sternenkammer upgrade (0 = none). */
export function starUpgradeLevel(state: GameState, id: string): number {
  return state.starUpgrades?.[id] ?? 0
}

/** Summed bonus from all Sternenkammer upgrades for the given effect. */
export function starUpgradeBonus(state: GameState, effect: StarEffect): number {
  let bonus = 0
  for (const def of STAR_UPGRADES) {
    if (def.effect !== effect) continue
    const level = starUpgradeLevel(state, def.id)
    if (level > 0) bonus += def.perLevel * level
  }
  return bonus
}

/**
 * Buy one level of a Sternenkammer upgrade with Sternensaat. Spends from the pool
 * and tracks it in starseedSpent so the flat yield bonus stays intact. Mutates
 * state and returns true on success (actions.ts wraps this + notifies).
 */
export function purchaseStarUpgrade(state: GameState, id: string): boolean {
  const def = starUpgradeById(id)
  if (!def) return false
  const level = starUpgradeLevel(state, id)
  const cost = starUpgradeCost(def, level)
  if (cost === null || (state.starseed ?? 0) < cost) return false
  state.starseed -= cost
  state.starseedSpent = (state.starseedSpent ?? 0) + cost
  if (!state.starUpgrades) state.starUpgrades = {}
  state.starUpgrades[id] = level + 1
  return true
}
