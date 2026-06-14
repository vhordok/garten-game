// Compost garden (PHASE 13): permanent upgrades bought with COMPOST. Gives the
// prestige currency an active, long-term use beyond its flat bonus. Buying does
// NOT reduce the flat prestige bonus — spent compost is tracked separately, so
// compost+compostSpent (total ever earned) still drives the bonus and the next
// gain. Some upgrades unlock at a parcel milestone. Bonuses are small & capped.

export type CompostEffect = 'yield' | 'growth' | 'passive' | 'offline' | 'questReward'

export interface CompostUpgradeDef {
  id: string
  name: string
  desc: string
  effect: CompostEffect
  /** bonus per level (unit depends on the effect) */
  perLevel: number
  maxLevel: number
  /** compost cost(level) = baseCost × costFactor^level */
  baseCost: number
  costFactor: number
  /** only buyable once this many parcels are leased (0 = from the start) */
  unlockParcel: number
}

export const COMPOST_UPGRADES: CompostUpgradeDef[] = [
  {
    id: 'fruchtbarerBoden',
    name: 'Fruchtbarer Boden',
    desc: '+3 % Ertrag pro Stufe',
    effect: 'yield',
    perLevel: 0.03,
    maxLevel: 12,
    baseCost: 3,
    costFactor: 1.8,
    unlockParcel: 0,
  },
  {
    id: 'lockererBoden',
    name: 'Lockerer Boden',
    desc: '+3 % Wachstumstempo pro Stufe',
    effect: 'growth',
    perLevel: 0.03,
    maxLevel: 12,
    baseCost: 3,
    costFactor: 1.8,
    unlockParcel: 0,
  },
  {
    id: 'wurzelnetz',
    name: 'Wurzelnetz',
    desc: '+1 h Offline-Wachstum pro Stufe',
    effect: 'offline',
    perLevel: 1,
    maxLevel: 8,
    baseCost: 4,
    costFactor: 1.9,
    unlockParcel: 3,
  },
  {
    id: 'naehrstoffspeicher',
    name: 'Nährstoffspeicher',
    desc: '+5 % passive Holz-Einnahmen pro Stufe',
    effect: 'passive',
    perLevel: 0.05,
    maxLevel: 10,
    baseCost: 5,
    costFactor: 2,
    unlockParcel: 5,
  },
  {
    id: 'auftragshumus',
    name: 'Auftragshumus',
    desc: '+10 % Auftragsbelohnung pro Stufe',
    effect: 'questReward',
    perLevel: 0.1,
    maxLevel: 8,
    baseCost: 8,
    costFactor: 2.2,
    unlockParcel: 10,
  },
]

const byId = new Map(COMPOST_UPGRADES.map((u) => [u.id, u]))

export function compostUpgradeById(id: string): CompostUpgradeDef | undefined {
  return byId.get(id)
}

/** Compost cost of the next level, or null when maxed. */
export function compostUpgradeCost(def: CompostUpgradeDef, level: number): number | null {
  if (level >= def.maxLevel) return null
  return Math.ceil(def.baseCost * Math.pow(def.costFactor, level))
}
