// Category specialisation definitions (PHASE 14). Each plant category can be
// upgraded with gold (and, from a threshold level, compost). Every level adds a
// shared primary yield bonus (CONFIG.specYieldPerLevel) PLUS a small UNIQUE
// secondary perk that fits the category's flavour. Data only — the bonus math
// lives in game/modifiers.ts, so new balance = editing this table, not code.

import type { PlantCategory } from '../game/types'

/** The single per-category perk kinds. Each maps to one hook in the core. */
export type SpecKind = 'growth' | 'regrow' | 'crit' | 'ticket' | 'wood' | 'beauty' | 'mastery'

export interface CategorySpecDef {
  id: PlantCategory
  /** German UI label, shared across the app (single source of truth). */
  label: string
  /** unique secondary perk on top of the shared yield bonus */
  unique: {
    kind: SpecKind
    /** additive bonus per owned level (interpretation depends on kind) */
    perLevel: number
    /** short German line for the shop card */
    desc: string
    /** render the *active* secondary value at the given level for the UI */
    format: (level: number) => string
  }
}

const pct = (v: number) => `${Math.round(v * 100)} %`

export const CATEGORY_SPECS: CategorySpecDef[] = [
  {
    id: 'kraeuter',
    label: 'Kräuter',
    unique: {
      kind: 'growth',
      perLevel: 0.05,
      desc: 'Kräuter wachsen schneller',
      format: (l) => `+${pct(0.05 * l)} Wuchs`,
    },
  },
  {
    id: 'gemuese',
    label: 'Gemüse',
    unique: {
      kind: 'crit',
      perLevel: 0.01,
      desc: 'höhere Gold-Ernte-Chance',
      format: (l) => `+${pct(0.01 * l)} Gold-Ernte`,
    },
  },
  {
    id: 'beeren',
    label: 'Beeren',
    unique: {
      kind: 'regrow',
      perLevel: 0.06,
      desc: 'Beeren reifen schneller nach',
      format: (l) => `+${pct(0.06 * l)} Nachreife`,
    },
  },
  {
    id: 'obst',
    label: 'Obst',
    unique: {
      kind: 'regrow',
      perLevel: 0.06,
      desc: 'Obst reift schneller nach',
      format: (l) => `+${pct(0.06 * l)} Nachreife`,
    },
  },
  {
    id: 'baeume',
    label: 'Holz',
    unique: {
      kind: 'wood',
      perLevel: 0.08,
      desc: 'mehr Holz-Einnahmen',
      format: (l) => `+${pct(0.08 * l)} Holz-Gold`,
    },
  },
  {
    id: 'zier',
    label: 'Zier',
    unique: {
      kind: 'beauty',
      perLevel: 0.08,
      desc: 'Zierpflanzen wirken schöner',
      format: (l) => `+${pct(0.08 * l)} Schönheit`,
    },
  },
  {
    id: 'cannabis',
    label: 'Hanf',
    unique: {
      kind: 'ticket',
      perLevel: 0.04,
      desc: 'häufiger Glücks-Lose',
      format: (l) => `+${(0.04 * l).toFixed(2)} Lose/Min`,
    },
  },
  {
    id: 'magie',
    label: 'Magie',
    unique: {
      kind: 'mastery',
      perLevel: 0.2,
      desc: 'schnellere Meisterschaft',
      format: (l) => `+${pct(0.2 * l)} Meister-XP`,
    },
  },
]

const SPEC_BY_ID = new Map(CATEGORY_SPECS.map((s) => [s.id, s]))

export function categorySpecById(category: string): CategorySpecDef | undefined {
  return SPEC_BY_ID.get(category as PlantCategory)
}

/** Shared German category labels — UI imports this instead of duplicating. */
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_SPECS.map((s) => [s.id, s.label])
)
