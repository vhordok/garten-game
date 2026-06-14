// Skill tree (PHASE 17 vertical slice): a small META build system, deliberately
// NOT a second shop. Skill points come from long-term progress (parcels,
// achievements, gardener level) — never gold — so the tree rewards *playing the
// game*, and you can't max everything: you pick a build. Starts with one root +
// four branch skills; the data shape scales to more nodes later.

export type SkillEffect = 'yield' | 'crit' | 'questReward' | 'beauty' | 'compostGain'

export interface SkillDef {
  id: string
  name: string
  desc: string
  /** UI grouping / flavour */
  branch: 'wurzel' | 'ernte' | 'markt' | 'zier' | 'kompost'
  effect: SkillEffect
  perLevel: number
  maxLevel: number
  /** skill-point cost per level */
  cost: number
  /** must own ≥1 level of this skill first (null = always available) */
  prereq: string | null
}

export const SKILLS: SkillDef[] = [
  {
    id: 'gartenplanung',
    name: 'Gartenplanung',
    desc: '+3 % Ertrag im ganzen Garten — und öffnet die Skill-Pfade.',
    branch: 'wurzel',
    effect: 'yield',
    perLevel: 0.03,
    maxLevel: 1,
    cost: 1,
    prereq: null,
  },
  {
    id: 'erntefokus',
    name: 'Erntefokus',
    desc: '+2 % Gold-Ernte-Chance pro Stufe — mehr goldene Ernten.',
    branch: 'ernte',
    effect: 'crit',
    perLevel: 0.02,
    maxLevel: 3,
    cost: 1,
    prereq: 'gartenplanung',
  },
  {
    id: 'haendlerblick',
    name: 'Händlerblick',
    desc: '+6 % Auftragsbelohnung pro Stufe — Liefern lohnt mehr.',
    branch: 'markt',
    effect: 'questReward',
    perLevel: 0.06,
    maxLevel: 3,
    cost: 1,
    prereq: 'gartenplanung',
  },
  {
    id: 'schaugarten',
    name: 'Schaugarten',
    desc: '+25 % Schönheits-Wirkung pro Stufe — macht den Zier-Build stark.',
    branch: 'zier',
    effect: 'beauty',
    perLevel: 0.25,
    maxLevel: 3,
    cost: 2,
    prereq: 'gartenplanung',
  },
  {
    id: 'tiefwurzel',
    name: 'Tiefwurzel',
    desc: '+6 % Kompost-Gewinn pro Stufe — wertvollere Prestiges.',
    branch: 'kompost',
    effect: 'compostGain',
    perLevel: 0.06,
    maxLevel: 3,
    cost: 2,
    prereq: 'gartenplanung',
  },
]

const byId = new Map(SKILLS.map((s) => [s.id, s]))

export function skillById(id: string): SkillDef | undefined {
  return byId.get(id)
}

export const BRANCH_LABEL: Record<SkillDef['branch'], string> = {
  wurzel: 'Wurzel',
  ernte: 'Ernte',
  markt: 'Markt',
  zier: 'Zier',
  kompost: 'Kompost',
}
