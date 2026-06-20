// PHASE 44 Ziergalerie: ornamentals (any plant with a beautyBonus) are no
// longer planted on the field — they're a permanent collection bought with
// gold. Each owned copy adds its beautyBonus to gardenBeauty (see modifiers).
// Pure logic + cost helpers; the buy action lives in actions.ts.

import { CONFIG } from '../data/config'
import { PLANTS, SPECIAL_PLANTS } from '../data/plants'
import type { GameState, PlantDef } from './types'

/** Every ornamental that can live in the gallery (field plants + lab specials). */
export const ORNAMENTALS: PlantDef[] = [...PLANTS, ...SPECIAL_PLANTS].filter(
  (p) => (p.beautyBonus ?? 0) > 0
)

/** Is this plant an ornamental (gallery-only, never sown on the field)? */
export function isOrnamental(def: PlantDef | undefined): boolean {
  return !!def && (def.beautyBonus ?? 0) > 0
}

/** Owned copies of an ornamental in the collection. */
export function ornamentalCount(state: GameState, plantId: string): number {
  return state.ornamentals[plantId] ?? 0
}

/**
 * Gold cost of the NEXT copy of an ornamental. The base price scales with the
 * ornamental's beauty (stronger = pricier); each copy already owned multiplies
 * the price by galleryCopyFactor (escalating sink). Returns Infinity at the cap.
 */
export function nextOrnamentalCost(def: PlantDef, owned: number): number {
  if (owned >= CONFIG.galleryMaxCopies) return Infinity
  const base = Math.max(def.seedCost * 4, (def.beautyBonus ?? 0) * CONFIG.galleryBeautyCostMul)
  return Math.ceil(base * Math.pow(CONFIG.galleryCopyFactor, owned))
}

/** True once the player owns at least one ornamental of any kind. */
export function ownsAnyOrnamental(state: GameState): boolean {
  for (const n of Object.values(state.ornamentals)) if (n > 0) return true
  return false
}
