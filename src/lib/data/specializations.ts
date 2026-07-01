// Category specialisation definitions (PHASE 14, reworked PHASE 15). Each plant
// category can be upgraded with gold (and, from a threshold level, compost).
//
// PHASE 15 fixes the late-game ROI collapse (diagnosis: cost grew ×3.4/level
// while value stayed flat +8 %/level). Now:
//  - the per-level yield bonus ESCALATES every 5-level tier, so high levels add
//    more, not the same (keeps pace with the steep cost),
//  - every 5 levels is a MILESTONE that amplifies the category's unique perk —
//    a real decision spike ("push gemüse to 15 for the next milestone"),
//  - compost cost on high levels grows geometrically → a genuine compost sink.
// Data only — the curves live in game/modifiers.ts.

import type { PlantCategory } from '../game/types'

/** The single per-category perk kinds. Each maps to one hook in the core. */
export type SpecKind = 'growth' | 'regrow' | 'crit' | 'ticket' | 'wood' | 'beauty' | 'mastery' | 'sell'

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
  /** what reaching a milestone (every 5 levels) does, in German, for the UI */
  milestoneDesc: string
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
    milestoneDesc: 'Meilenstein verstärkt den Wuchs-Schub',
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
    milestoneDesc: 'Meilenstein verstärkt die Gold-Ernte',
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
    milestoneDesc: 'Meilenstein verstärkt die Nachreife',
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
    milestoneDesc: 'Meilenstein verstärkt die Nachreife',
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
    milestoneDesc: 'Meilenstein verstärkt die Holz-Einnahmen',
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
    milestoneDesc: 'Meilenstein verstärkt die Schönheit',
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
    milestoneDesc: 'Meilenstein verstärkt das Los-Glück',
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
    milestoneDesc: 'Meilenstein verstärkt die Meister-XP',
  },
  // PHASE 33: the cosmic endgame category — its produce fetches ever-higher
  // prices (a fresh build axis: invest in Kosmisch for a per-category sell bonus).
  {
    id: 'kosmos',
    label: 'Kosmisch',
    unique: {
      kind: 'sell',
      perLevel: 0.05,
      desc: 'kosmische Ernten erzielen Höchstpreise',
      format: (l) => `+${pct(0.05 * l)} Verkaufspreis`,
    },
    milestoneDesc: 'Meilenstein verstärkt die Verkaufspreise',
  },
  // PHASE 89: the divine endgame category — its plants grow supernaturally fast
  // (a growth build axis distinct from the cosmic sell-price one).
  {
    id: 'goettlich',
    label: 'Göttlich',
    unique: {
      kind: 'growth',
      perLevel: 0.06,
      desc: 'göttliche Pflanzen wachsen überirdisch schnell',
      format: (l) => `+${pct(0.06 * l)} Wuchs`,
    },
    milestoneDesc: 'Meilenstein verstärkt den göttlichen Wuchs',
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
