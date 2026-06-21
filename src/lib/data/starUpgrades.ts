// Sternenkammer (PHASE 53): permanent upgrades bought with STERNENSAAT (the
// Weltensaat currency). Gives the higher prestige an active, long-term use beyond
// its flat banked yield. Buying does NOT weaken that flat bonus — spent Sternensaat
// is tracked separately (starseedSpent), so starseed+starseedSpent (total ever
// banked) still drives worldseedYieldFactor. Mirrors the compost-garden pattern.

export type StarEffect = 'yield' | 'growth' | 'compostGain' | 'startParcels'

export interface StarUpgradeDef {
  id: string
  name: string
  desc: string
  effect: StarEffect
  /** bonus per level (unit depends on the effect) */
  perLevel: number
  maxLevel: number
  /** Sternensaat cost(level) = baseCost × costFactor^level */
  baseCost: number
  costFactor: number
  /** endless sink (UI shows "Stufe N" without a cap; maxLevel stays finite) */
  repeatable?: boolean
}

export const STAR_UPGRADES: StarUpgradeDef[] = [
  {
    id: 'sternenfeuer',
    name: 'Sternenfeuer',
    desc: '+8 % Ertrag pro Stufe — endlos, Kosten steigen stetig',
    effect: 'yield',
    perLevel: 0.08,
    maxLevel: 999,
    baseCost: 1,
    costFactor: 1.5,
    repeatable: true,
  },
  {
    id: 'sternenwind',
    name: 'Sternenwind',
    desc: '+6 % Wachstumstempo pro Stufe — endlos, Kosten steigen stetig',
    effect: 'growth',
    perLevel: 0.06,
    maxLevel: 999,
    baseCost: 1,
    costFactor: 1.5,
    repeatable: true,
  },
  {
    id: 'sternenduenger',
    name: 'Sternendünger',
    desc: '+12 % Kompost-Gewinn pro Stufe — beschleunigt jeden Wiederaufstieg',
    effect: 'compostGain',
    perLevel: 0.12,
    maxLevel: 10,
    baseCost: 2,
    costFactor: 1.7,
  },
  {
    id: 'sternenkeim',
    name: 'Sternenkeim',
    desc: '+1 Start-Parzelle nach jeder Weltensaat — der Wiederaufstieg startet höher',
    effect: 'startParcels',
    perLevel: 1,
    maxLevel: 6,
    baseCost: 3,
    costFactor: 2,
  },
]

const byId = new Map(STAR_UPGRADES.map((u) => [u.id, u]))

export function starUpgradeById(id: string): StarUpgradeDef | undefined {
  return byId.get(id)
}

/** Sternensaat cost of the next level, or null when maxed. */
export function starUpgradeCost(def: StarUpgradeDef, level: number): number | null {
  if (level >= def.maxLevel) return null
  return Math.ceil(def.baseCost * Math.pow(def.costFactor, level))
}
