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
  /** PHASE 15: endless endgame sinks. Cost climbs geometrically so the EFFECT is
   * log-bounded (no runaway), but compost always has a meaningful next step. The
   * UI shows "Stufe N" without a cap. maxLevel stays finite (sanitize clamp). */
  repeatable?: boolean
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
  // ── PHASE 15: repeatable endgame compost sinks ───────────────────────────
  // Diagnosis: the five upgrades above cap out at ~18k compost total, while a
  // single prestige pays ~935k. These never max — the geometric cost makes each
  // gives diminishing real value, so surplus compost always has a long-term home
  // and the player chooses which path (Ertrag / Tempo / Aufträge) to deepen.
  {
    id: 'urhumus',
    name: 'Urhumus',
    desc: '+2,5 % Ertrag pro Stufe — endlos, Kosten steigen stetig',
    effect: 'yield',
    perLevel: 0.025,
    maxLevel: 999,
    baseCost: 40,
    costFactor: 1.4,
    unlockParcel: 12,
    repeatable: true,
  },
  {
    id: 'tiefenkultur',
    name: 'Tiefenkultur',
    desc: '+2 % Wachstumstempo pro Stufe — endlos, Kosten steigen stetig',
    effect: 'growth',
    perLevel: 0.02,
    maxLevel: 999,
    baseCost: 60,
    costFactor: 1.42,
    unlockParcel: 14,
    repeatable: true,
  },
  {
    id: 'marktmykorrhiza',
    name: 'Markt-Mykorrhiza',
    desc: '+8 % Auftragsbelohnung pro Stufe — endlos, Kosten steigen stetig',
    effect: 'questReward',
    perLevel: 0.08,
    maxLevel: 999,
    baseCost: 120,
    costFactor: 1.5,
    unlockParcel: 16,
    repeatable: true,
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
