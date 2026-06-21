// Sternenkammer (PHASE 53): permanent upgrades bought with STERNENSAAT (the
// Weltensaat currency). Gives the higher prestige an active, long-term use beyond
// its flat banked yield. Buying does NOT weaken that flat bonus — spent Sternensaat
// is tracked separately (starseedSpent), so starseed+starseedSpent (total ever
// banked) still drives worldseedYieldFactor. Mirrors the compost-garden pattern.

export type StarEffect =
  | 'yield'
  | 'growth'
  | 'compostGain'
  | 'startParcels'
  | 'sellPrice'
  | 'offline'
  | 'questReward'
  | 'ticketLuck'

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
  // PHASE 62: more Sternensaat sinks with distinct effects, so the Sternenkammer
  // has variety beyond yield/growth — each wires into an existing modifier point.
  {
    id: 'sternenmarkt',
    name: 'Sternenmarkt',
    desc: '+5 % Verkaufspreis pro Stufe — endlos, Kosten steigen stetig',
    effect: 'sellPrice',
    perLevel: 0.05,
    maxLevel: 999,
    baseCost: 1,
    costFactor: 1.5,
    repeatable: true,
  },
  {
    id: 'sternengilde',
    name: 'Sternengilde',
    desc: '+10 % Auftragsbelohnung pro Stufe',
    effect: 'questReward',
    perLevel: 0.1,
    maxLevel: 10,
    baseCost: 2,
    costFactor: 1.6,
  },
  {
    id: 'sternenschlaf',
    name: 'Sternenschlaf',
    desc: '+1 h Offline-Wachstum pro Stufe',
    effect: 'offline',
    perLevel: 1,
    maxLevel: 12,
    baseCost: 2,
    costFactor: 1.55,
  },
  {
    id: 'sternenglueck',
    name: 'Sternenglück',
    desc: '+4 % Los-Chance bei der Ernte pro Stufe',
    effect: 'ticketLuck',
    perLevel: 0.04,
    maxLevel: 10,
    baseCost: 2,
    costFactor: 1.6,
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
