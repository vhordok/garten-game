// Relic sets (PHASE 88): themed collections layered on top of the individual
// relics. Owning one copy of every member relic completes the set and grants a
// flat, permanent bonus ON TOP of each relic's own stacking bonus — so relics
// reward BREADTH (collect one of each), not just hoarding a single kind. Purely
// derived from state.relics (no new save field); the completion + bonus summation
// lives in game/expeditions.ts. Bonuses survive prestige AND Weltensaat, like the
// relics themselves.

import { RELICS, type RelicEffect } from './relics'

export interface RelicSetDef {
  id: string
  name: string
  emoji: string
  /** relic ids required — own >= 1 of each to complete the set */
  members: string[]
  /** effect the completed set boosts (added to the same additive term as relics) */
  effect: RelicEffect
  /** flat bonus fraction granted while the set is complete */
  bonus: number
  /** short UI description of the reward */
  desc: string
}

export const RELIC_SETS: RelicSetDef[] = [
  {
    id: 'urelemente',
    name: 'Bund der Urelemente',
    emoji: '🌿',
    members: ['sonnenstein', 'windgeist', 'marktsiegel'],
    effect: 'yield',
    bonus: 0.15,
    desc: 'Alle drei gewöhnlichen Relikte — dauerhaft +15 % Ertrag',
  },
  {
    id: 'sternenbund',
    name: 'Sternenbund',
    emoji: '✨',
    members: ['humusherz', 'gluecksrune', 'sternensplitter'],
    effect: 'compostGain',
    bonus: 0.25,
    desc: 'Alle drei seltenen Relikte — dauerhaft +25 % Kompost-Gewinn',
  },
  {
    id: 'weltenbund',
    name: 'Weltenbund',
    emoji: '🌟',
    members: ['weltenkern', 'zeitkristall'],
    effect: 'growth',
    bonus: 0.3,
    desc: 'Beide legendären Relikte — dauerhaft +30 % Wachstumstempo',
  },
  {
    id: 'vollsammlung',
    name: 'Vollständige Sammlung',
    emoji: '🏆',
    // pinned to the eight ORIGINAL relics (PHASE 90): the mythic tier gets its own
    // sets below, so adding it never revokes this bonus from a player who earned it.
    members: RELICS.filter((r) => r.rarity !== 'mythic').map((r) => r.id),
    effect: 'yield',
    bonus: 0.5,
    desc: 'Jedes gewöhnliche/seltene/legendäre Relikt gefunden — dauerhaft +50 % Ertrag',
  },
  // PHASE 90: the mythic tier — its own bund plus a grand capstone over EVERY relic.
  {
    id: 'mythischer_bund',
    name: 'Mythischer Bund',
    emoji: '🔱',
    members: ['urrelikt', 'chronosplitter', 'fuellhornsiegel'],
    effect: 'growth',
    bonus: 0.6,
    desc: 'Alle drei mythischen Relikte — dauerhaft +60 % Wachstumstempo',
  },
  {
    id: 'allsammlung',
    name: 'Allumfassende Sammlung',
    emoji: '👑',
    members: RELICS.map((r) => r.id),
    effect: 'yield',
    bonus: 1,
    desc: 'JEDES Relikt gefunden, inklusive der mythischen — dauerhaft +100 % Ertrag',
  },
]

const byId = new Map(RELIC_SETS.map((s) => [s.id, s]))
export function relicSetById(id: string): RelicSetDef | undefined {
  return byId.get(id)
}
