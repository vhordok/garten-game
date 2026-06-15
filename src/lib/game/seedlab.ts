// Seed-lab logic (PHASE 20): pure functions over GameState. `discoveredVariants`
// is the only persisted field (a list of ids). Kept free of modifiers/actions
// imports (inlines the cheap unlock/mastery checks) so it can't form a cycle —
// modifiers reads variantBonus(), actions calls crossEligibility().

import { CONFIG } from '../data/config'
import { plantById } from '../data/plants'
import { variantByParents, VARIANTS, type VariantDef, type VariantEffect } from '../data/variants'
import { questReserved } from './quests'
import { skillBonus } from './skills'
import type { GameState } from './types'

export function isDiscovered(state: GameState, id: string): boolean {
  return state.discoveredVariants.includes(id)
}

/** Storage NOT reserved by open orders — only this surplus may be spent (PHASE 21). */
export function freeStock(state: GameState, plantId: string): number {
  return Math.max((state.inventory[plantId] ?? 0) - questReserved(state, plantId), 0)
}

/** Gold cost after the Saatgut-Forschung skill discount (capped). */
export function effectiveGoldCost(state: GameState, v: VariantDef): number {
  const discount = Math.min(skillBonus(state, 'crossDiscount'), 0.6)
  return Math.floor(v.goldCost * (1 - discount))
}

export interface ProduceLine {
  plantId: string
  name: string
  need: number
  have: number
  free: number
  ok: boolean
}

/** Per-line produce requirement for a variant (drives the lab UI). */
export function produceStatus(state: GameState, v: VariantDef): ProduceLine[] {
  return (v.produceCost ?? []).map((c) => {
    const free = freeStock(state, c.plantId)
    return {
      plantId: c.plantId,
      name: plantById(c.plantId)?.produce ?? plantById(c.plantId)?.name ?? c.plantId,
      need: c.amount,
      have: state.inventory[c.plantId] ?? 0,
      free,
      ok: free >= c.amount,
    }
  })
}

/** A vague category-pair hint for an undiscovered recipe (PHASE 21). */
const CAT_HINT: Record<string, string> = {
  kraeuter: 'Kräuter',
  gemuese: 'Gemüse',
  beeren: 'Beere',
  obst: 'Obst',
  baeume: 'Holz',
  zier: 'Zier',
  cannabis: 'Hanf',
  magie: 'Magie',
}
export function recipeHint(v: VariantDef): string {
  const a = CAT_HINT[plantById(v.parents[0])?.category ?? ''] ?? '?'
  const b = CAT_HINT[plantById(v.parents[1])?.category ?? ''] ?? '?'
  return `${a} + ${b}`
}

/** Extra weather-event strength from discovered variants tied to that event. */
export function variantEventBonus(state: GameState, weatherId: string): number {
  let sum = 0
  for (const v of VARIANTS) {
    if (v.eventSynergy?.weatherId === weatherId && state.discoveredVariants.includes(v.id)) {
      sum += v.eventSynergy.extra
    }
  }
  return sum
}

/** Summed passive bonus from all discovered variants for one effect. */
export function variantBonus(state: GameState, effect: VariantEffect): number {
  let sum = 0
  for (const v of VARIANTS) {
    if (v.effect === effect && state.discoveredVariants.includes(v.id)) sum += v.value
  }
  return sum
}

/** Highest mastery level across all plants (inlined to avoid a modifiers cycle). */
function maxMasteryLevel(state: GameState): number {
  let best = 0
  for (const xp of Object.values(state.mastery)) {
    if (xp <= 0) continue
    const lvl = Math.min(CONFIG.masteryMaxLevel, Math.floor(Math.log2(xp / CONFIG.masteryBase + 1)))
    if (lvl > best) best = lvl
  }
  return best
}

/** Is a parent plant unlocked? (inlined isPlantUnlocked to avoid a cycle) */
function parentUnlocked(state: GameState, id: string): boolean {
  const def = plantById(id)
  if (!def) return false
  if (def.requiresLicense && state.licenses < def.requiresLicense) return false
  return state.totalEarned >= def.unlockAtTotalEarned
}

export type CrossStatus =
  | 'ok' // ready to discover
  | 'nomatch' // no recipe for this pair
  | 'discovered' // already in the collection
  | 'same' // picked the same plant twice
  | 'locked-parents' // a parent isn't unlocked yet
  | 'locked-req' // parcel/mastery requirement not met
  | 'too-poor' // can't afford gold/compost
  | 'missing-produce' // not enough FREE produce in storage

export interface CrossResult {
  variant: VariantDef | null
  status: CrossStatus
  /** German explanation for the UI */
  reason: string
}

/** Evaluate crossing two plant ids — drives the lab UI and the action. */
export function crossEligibility(state: GameState, a: string, b: string): CrossResult {
  if (!a || !b) return { variant: null, status: 'nomatch', reason: 'Wähle zwei Elternpflanzen.' }
  if (a === b) return { variant: null, status: 'same', reason: 'Wähle zwei verschiedene Pflanzen.' }
  const variant = variantByParents(a, b) ?? null
  if (!variant) return { variant: null, status: 'nomatch', reason: 'Keine bekannte Kreuzung — probier ein anderes Paar.' }
  if (state.discoveredVariants.includes(variant.id)) {
    return { variant, status: 'discovered', reason: 'Schon entdeckt.' }
  }
  if (!parentUnlocked(state, variant.parents[0]) || !parentUnlocked(state, variant.parents[1])) {
    return { variant, status: 'locked-parents', reason: 'Beide Elternpflanzen müssen freigeschaltet sein.' }
  }
  const req = variant.requires
  if (req) {
    if (req.parcels && state.parcels < req.parcels) {
      return { variant, status: 'locked-req', reason: `Braucht Parzelle ${req.parcels}.` }
    }
    if (req.masteryLevel && maxMasteryLevel(state) < req.masteryLevel) {
      return { variant, status: 'locked-req', reason: `Braucht Meisterschaft Lv ${req.masteryLevel} (irgendeine Sorte).` }
    }
  }
  if (state.money < effectiveGoldCost(state, variant) || state.compost < variant.compostCost) {
    return { variant, status: 'too-poor', reason: 'Nicht genug Gold/Kompost.' }
  }
  const short = produceStatus(state, variant).filter((p) => !p.ok)
  if (short.length > 0) {
    const txt = short.map((p) => `${p.free}/${p.need} ${p.name}`).join(', ')
    return { variant, status: 'missing-produce', reason: `Zu wenig freie Produkte: ${txt}` }
  }
  return { variant, status: 'ok', reason: 'Bereit zum Kreuzen!' }
}

/** Variants the player could discover right now (parents unlocked, not yet found). */
export function discoverableVariants(state: GameState): VariantDef[] {
  return VARIANTS.filter(
    (v) =>
      !state.discoveredVariants.includes(v.id) &&
      parentUnlocked(state, v.parents[0]) &&
      parentUnlocked(state, v.parents[1])
  )
}
