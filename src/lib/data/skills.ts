// Skill tree (PHASE 17 vertical slice): a small META build system, deliberately
// NOT a second shop. Skill points come from long-term progress (parcels,
// achievements, gardener level) — never gold — so the tree rewards *playing the
// game*, and you can't max everything: you pick a build. Starts with one root +
// four branch skills; the data shape scales to more nodes later.

export type SkillEffect = 'yield' | 'crit' | 'questReward' | 'beauty' | 'compostGain' | 'scratchLuck' | 'crossDiscount' | 'growth' | 'sellPrice' | 'offline'

export interface SkillDef {
  id: string
  name: string
  desc: string
  /** UI grouping / flavour */
  branch: 'wurzel' | 'ernte' | 'markt' | 'zier' | 'kompost' | 'glueck' | 'labor'
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
  // ── PHASE 18: deeper nodes per path + a luck branch ──────────────────────
  {
    id: 'ueppige_ernte',
    name: 'Üppige Ernte',
    desc: '+4 % Ertrag pro Stufe — vertieft den Ernte-Pfad.',
    branch: 'ernte',
    effect: 'yield',
    perLevel: 0.04,
    maxLevel: 2,
    cost: 2,
    prereq: 'erntefokus',
  },
  {
    id: 'grosshandel',
    name: 'Großhandel',
    desc: '+8 % Auftragsbelohnung pro Stufe — für Auftrags-Builds.',
    branch: 'markt',
    effect: 'questReward',
    perLevel: 0.08,
    maxLevel: 2,
    cost: 2,
    prereq: 'haendlerblick',
  },
  {
    id: 'parkanlage',
    name: 'Parkanlage',
    desc: '+20 % Schönheits-Wirkung pro Stufe — krönt den Zier-Build.',
    branch: 'zier',
    effect: 'beauty',
    perLevel: 0.2,
    maxLevel: 2,
    cost: 3,
    prereq: 'schaugarten',
  },
  {
    id: 'gluecksklee',
    name: 'Glücksklee',
    desc: '+0,03 Los-Chance pro Stufe — mehr Rubbellose aus der Ernte.',
    branch: 'glueck',
    effect: 'scratchLuck',
    perLevel: 0.03,
    maxLevel: 3,
    cost: 2,
    prereq: 'gartenplanung',
  },
  {
    id: 'saatgutforschung',
    name: 'Saatgut-Forschung',
    desc: '−15 % Gold-Kosten pro Stufe im Saatlabor — günstigere Kreuzungen.',
    branch: 'labor',
    effect: 'crossDiscount',
    perLevel: 0.15,
    maxLevel: 2,
    cost: 2,
    prereq: 'gartenplanung',
  },
  // ── PHASE 34: a deeper second tier per path, so high-prestige players have
  // more meaningful nodes to pour their point surplus into (not just the endless
  // capstone). Each sits behind its path's PHASE-18 node.
  {
    id: 'kompostmeister',
    name: 'Kompostmeister',
    desc: '+8 % Kompost-Gewinn pro Stufe — noch wertvollere Prestiges.',
    branch: 'kompost',
    effect: 'compostGain',
    perLevel: 0.08,
    maxLevel: 4,
    cost: 3,
    prereq: 'tiefwurzel',
  },
  {
    id: 'marktimperium',
    name: 'Marktimperium',
    desc: '+10 % Auftragsbelohnung pro Stufe — die Krone des Auftrags-Builds.',
    branch: 'markt',
    effect: 'questReward',
    perLevel: 0.1,
    maxLevel: 4,
    cost: 3,
    prereq: 'grosshandel',
  },
  {
    id: 'gluecksrausch',
    name: 'Glücksrausch',
    desc: '+0,05 Los-Chance pro Stufe — Lose regnen aus der Ernte.',
    branch: 'glueck',
    effect: 'scratchLuck',
    perLevel: 0.05,
    maxLevel: 4,
    cost: 3,
    prereq: 'gluecksklee',
  },
  {
    id: 'zierkrone',
    name: 'Zierkrone',
    desc: '+30 % Schönheits-Wirkung pro Stufe — vollendet den Zier-Build.',
    branch: 'zier',
    effect: 'beauty',
    perLevel: 0.3,
    maxLevel: 3,
    cost: 4,
    prereq: 'parkanlage',
  },
  // ── PHASE 32: endless endgame sink. Deep-prestige players pile up far more
  // skill points (1 per parcel/achievement/level-tier) than the finite tree can
  // hold — this capstone absorbs the surplus and turns it into a slowly growing,
  // permanent yield bonus. Additive, so it never out-scales the prestige/compost
  // multiplier (no explosion) but always gives "one more thing" to invest in.
  {
    id: 'ahnenwissen',
    name: 'Ahnenwissen',
    desc: '+5 % Ertrag pro Stufe — endlos. Verwandelt überschüssige Skillpunkte in dauerhaften Ertrag.',
    branch: 'ernte',
    effect: 'yield',
    perLevel: 0.05,
    maxLevel: 99999,
    cost: 1,
    prereq: 'ueppige_ernte',
  },
  // PHASE 85: branching expansion — deeper chains + side splits per branch.
  { id: 'ern_s0', name: 'Reiche Ernte I', desc: '+3 % Ertrag pro Stufe.', branch: 'ernte', effect: 'yield', perLevel: 0.03, maxLevel: 3, cost: 1, prereq: 'erntefokus' },
  { id: 'ern_s1', name: 'Reiche Ernte II', desc: '+3 % Ertrag pro Stufe.', branch: 'ernte', effect: 'yield', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'ern_s0' },
  { id: 'ern_s2', name: 'Reiche Ernte III', desc: '+4 % Ertrag pro Stufe.', branch: 'ernte', effect: 'yield', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'ern_s1' },
  { id: 'ern_a', name: 'Goldader', desc: '+2 % Gold-Ernte-Chance pro Stufe.', branch: 'ernte', effect: 'crit', perLevel: 0.02, maxLevel: 3, cost: 2, prereq: 'ern_s0' },
  { id: 'ern_a1', name: 'Goldader II', desc: '+2 % Gold-Ernte-Chance pro Stufe.', branch: 'ernte', effect: 'crit', perLevel: 0.02, maxLevel: 3, cost: 2, prereq: 'ern_a' },
  { id: 'ern_a2', name: 'Goldader III', desc: '+2 % Gold-Ernte-Chance pro Stufe.', branch: 'ernte', effect: 'crit', perLevel: 0.02, maxLevel: 3, cost: 3, prereq: 'ern_a1' },
  { id: 'ern_c', name: 'Schnellwuchs', desc: '+4 % Wachstumstempo pro Stufe.', branch: 'ernte', effect: 'growth', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'ern_s1' },
  { id: 'ern_c1', name: 'Schnellwuchs II', desc: '+4 % Wachstumstempo pro Stufe.', branch: 'ernte', effect: 'growth', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'ern_c' },
  { id: 'ern_e', name: 'Sattgrün', desc: '+3 % Ertrag pro Stufe.', branch: 'ernte', effect: 'yield', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'erntefokus' },
  { id: 'ern_e1', name: 'Sattgrün II', desc: '+3 % Ertrag pro Stufe.', branch: 'ernte', effect: 'yield', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'ern_e' },
  { id: 'mkt_s0', name: 'Handelsroute I', desc: '+3 % Auftragsbelohnung pro Stufe.', branch: 'markt', effect: 'questReward', perLevel: 0.03, maxLevel: 3, cost: 1, prereq: 'haendlerblick' },
  { id: 'mkt_s1', name: 'Handelsroute II', desc: '+3 % Auftragsbelohnung pro Stufe.', branch: 'markt', effect: 'questReward', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'mkt_s0' },
  { id: 'mkt_s2', name: 'Handelsroute III', desc: '+4 % Auftragsbelohnung pro Stufe.', branch: 'markt', effect: 'questReward', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'mkt_s1' },
  { id: 'mkt_a', name: 'Marktpreis', desc: '+3 % Verkaufspreis pro Stufe.', branch: 'markt', effect: 'sellPrice', perLevel: 0.03, maxLevel: 4, cost: 2, prereq: 'mkt_s0' },
  { id: 'mkt_a1', name: 'Marktpreis II', desc: '+3 % Verkaufspreis pro Stufe.', branch: 'markt', effect: 'sellPrice', perLevel: 0.03, maxLevel: 4, cost: 2, prereq: 'mkt_a' },
  { id: 'mkt_a2', name: 'Marktpreis III', desc: '+3 % Verkaufspreis pro Stufe.', branch: 'markt', effect: 'sellPrice', perLevel: 0.03, maxLevel: 4, cost: 3, prereq: 'mkt_a1' },
  { id: 'mkt_c', name: 'Großmarkt', desc: '+4 % Auftragsbelohnung pro Stufe.', branch: 'markt', effect: 'questReward', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'mkt_s1' },
  { id: 'mkt_c1', name: 'Großmarkt II', desc: '+4 % Auftragsbelohnung pro Stufe.', branch: 'markt', effect: 'questReward', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'mkt_c' },
  { id: 'mkt_e', name: 'Feilschen', desc: '+3 % Verkaufspreis pro Stufe.', branch: 'markt', effect: 'sellPrice', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'haendlerblick' },
  { id: 'mkt_e1', name: 'Feilschen II', desc: '+3 % Verkaufspreis pro Stufe.', branch: 'markt', effect: 'sellPrice', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'mkt_e' },
  { id: 'zir_s0', name: 'Blütenpracht I', desc: '+3 % Schönheits-Wirkung pro Stufe.', branch: 'zier', effect: 'beauty', perLevel: 0.03, maxLevel: 3, cost: 1, prereq: 'schaugarten' },
  { id: 'zir_s1', name: 'Blütenpracht II', desc: '+3 % Schönheits-Wirkung pro Stufe.', branch: 'zier', effect: 'beauty', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'zir_s0' },
  { id: 'zir_s2', name: 'Blütenpracht III', desc: '+4 % Schönheits-Wirkung pro Stufe.', branch: 'zier', effect: 'beauty', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'zir_s1' },
  { id: 'zir_a', name: 'Goldgarten', desc: '+3 % Ertrag pro Stufe.', branch: 'zier', effect: 'yield', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'zir_s0' },
  { id: 'zir_a1', name: 'Goldgarten II', desc: '+3 % Ertrag pro Stufe.', branch: 'zier', effect: 'yield', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'zir_a' },
  { id: 'zir_a2', name: 'Goldgarten III', desc: '+3 % Ertrag pro Stufe.', branch: 'zier', effect: 'yield', perLevel: 0.03, maxLevel: 3, cost: 3, prereq: 'zir_a1' },
  { id: 'zir_c', name: 'Ziermeister', desc: '+5 % Schönheits-Wirkung pro Stufe.', branch: 'zier', effect: 'beauty', perLevel: 0.05, maxLevel: 3, cost: 3, prereq: 'zir_s1' },
  { id: 'zir_c1', name: 'Ziermeister II', desc: '+5 % Schönheits-Wirkung pro Stufe.', branch: 'zier', effect: 'beauty', perLevel: 0.05, maxLevel: 3, cost: 3, prereq: 'zir_c' },
  { id: 'zir_e', name: 'Duftwolke', desc: '+4 % Schönheits-Wirkung pro Stufe.', branch: 'zier', effect: 'beauty', perLevel: 0.04, maxLevel: 3, cost: 2, prereq: 'schaugarten' },
  { id: 'zir_e1', name: 'Duftwolke II', desc: '+4 % Schönheits-Wirkung pro Stufe.', branch: 'zier', effect: 'beauty', perLevel: 0.04, maxLevel: 3, cost: 2, prereq: 'zir_e' },
  { id: 'kmp_s0', name: 'Humustiefe I', desc: '+3 % Kompost-Gewinn pro Stufe.', branch: 'kompost', effect: 'compostGain', perLevel: 0.03, maxLevel: 3, cost: 1, prereq: 'tiefwurzel' },
  { id: 'kmp_s1', name: 'Humustiefe II', desc: '+3 % Kompost-Gewinn pro Stufe.', branch: 'kompost', effect: 'compostGain', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'kmp_s0' },
  { id: 'kmp_s2', name: 'Humustiefe III', desc: '+4 % Kompost-Gewinn pro Stufe.', branch: 'kompost', effect: 'compostGain', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'kmp_s1' },
  { id: 'kmp_a', name: 'Nachtruhe', desc: '+0.5 h Offline-Stunden pro Stufe.', branch: 'kompost', effect: 'offline', perLevel: 0.5, maxLevel: 6, cost: 2, prereq: 'kmp_s0' },
  { id: 'kmp_a1', name: 'Nachtruhe II', desc: '+0.5 h Offline-Stunden pro Stufe.', branch: 'kompost', effect: 'offline', perLevel: 0.5, maxLevel: 6, cost: 2, prereq: 'kmp_a' },
  { id: 'kmp_a2', name: 'Nachtruhe III', desc: '+0.5 h Offline-Stunden pro Stufe.', branch: 'kompost', effect: 'offline', perLevel: 0.5, maxLevel: 6, cost: 3, prereq: 'kmp_a1' },
  { id: 'kmp_c', name: 'Erdkraft', desc: '+6 % Kompost-Gewinn pro Stufe.', branch: 'kompost', effect: 'compostGain', perLevel: 0.06, maxLevel: 3, cost: 3, prereq: 'kmp_s1' },
  { id: 'kmp_c1', name: 'Erdkraft II', desc: '+6 % Kompost-Gewinn pro Stufe.', branch: 'kompost', effect: 'compostGain', perLevel: 0.06, maxLevel: 3, cost: 3, prereq: 'kmp_c' },
  { id: 'kmp_e', name: 'Wurzelnetz', desc: '+4 % Kompost-Gewinn pro Stufe.', branch: 'kompost', effect: 'compostGain', perLevel: 0.04, maxLevel: 3, cost: 2, prereq: 'tiefwurzel' },
  { id: 'kmp_e1', name: 'Wurzelnetz II', desc: '+4 % Kompost-Gewinn pro Stufe.', branch: 'kompost', effect: 'compostGain', perLevel: 0.04, maxLevel: 3, cost: 2, prereq: 'kmp_e' },
  { id: 'glk_s0', name: 'Glückssträhne I', desc: '+3 % Los-Chance pro Stufe.', branch: 'glueck', effect: 'scratchLuck', perLevel: 0.03, maxLevel: 3, cost: 1, prereq: 'gluecksklee' },
  { id: 'glk_s1', name: 'Glückssträhne II', desc: '+3 % Los-Chance pro Stufe.', branch: 'glueck', effect: 'scratchLuck', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'glk_s0' },
  { id: 'glk_s2', name: 'Glückssträhne III', desc: '+4 % Los-Chance pro Stufe.', branch: 'glueck', effect: 'scratchLuck', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'glk_s1' },
  { id: 'glk_a', name: 'Goldfund', desc: '+2 % Gold-Ernte-Chance pro Stufe.', branch: 'glueck', effect: 'crit', perLevel: 0.02, maxLevel: 3, cost: 2, prereq: 'glk_s0' },
  { id: 'glk_a1', name: 'Goldfund II', desc: '+2 % Gold-Ernte-Chance pro Stufe.', branch: 'glueck', effect: 'crit', perLevel: 0.02, maxLevel: 3, cost: 2, prereq: 'glk_a' },
  { id: 'glk_a2', name: 'Goldfund III', desc: '+2 % Gold-Ernte-Chance pro Stufe.', branch: 'glueck', effect: 'crit', perLevel: 0.02, maxLevel: 3, cost: 3, prereq: 'glk_a1' },
  { id: 'glk_c', name: 'Vierblatt', desc: '+4 % Los-Chance pro Stufe.', branch: 'glueck', effect: 'scratchLuck', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'glk_s1' },
  { id: 'glk_c1', name: 'Vierblatt II', desc: '+4 % Los-Chance pro Stufe.', branch: 'glueck', effect: 'scratchLuck', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'glk_c' },
  { id: 'glk_e', name: 'Hufeisen', desc: '+3 % Los-Chance pro Stufe.', branch: 'glueck', effect: 'scratchLuck', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'gluecksklee' },
  { id: 'glk_e1', name: 'Hufeisen II', desc: '+3 % Los-Chance pro Stufe.', branch: 'glueck', effect: 'scratchLuck', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'glk_e' },
  { id: 'lab_s0', name: 'Forschung I', desc: '+3 % Kreuzungs-Rabatt pro Stufe.', branch: 'labor', effect: 'crossDiscount', perLevel: 0.03, maxLevel: 3, cost: 1, prereq: 'saatgutforschung' },
  { id: 'lab_s1', name: 'Forschung II', desc: '+3 % Kreuzungs-Rabatt pro Stufe.', branch: 'labor', effect: 'crossDiscount', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'lab_s0' },
  { id: 'lab_s2', name: 'Forschung III', desc: '+4 % Kreuzungs-Rabatt pro Stufe.', branch: 'labor', effect: 'crossDiscount', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'lab_s1' },
  { id: 'lab_a', name: 'Bio-Ertrag', desc: '+3 % Ertrag pro Stufe.', branch: 'labor', effect: 'yield', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'lab_s0' },
  { id: 'lab_a1', name: 'Bio-Ertrag II', desc: '+3 % Ertrag pro Stufe.', branch: 'labor', effect: 'yield', perLevel: 0.03, maxLevel: 3, cost: 2, prereq: 'lab_a' },
  { id: 'lab_a2', name: 'Bio-Ertrag III', desc: '+3 % Ertrag pro Stufe.', branch: 'labor', effect: 'yield', perLevel: 0.03, maxLevel: 3, cost: 3, prereq: 'lab_a1' },
  { id: 'lab_c', name: 'Schnellzucht', desc: '+4 % Wachstumstempo pro Stufe.', branch: 'labor', effect: 'growth', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'lab_s1' },
  { id: 'lab_c1', name: 'Schnellzucht II', desc: '+4 % Wachstumstempo pro Stufe.', branch: 'labor', effect: 'growth', perLevel: 0.04, maxLevel: 3, cost: 3, prereq: 'lab_c' },
  { id: 'lab_e', name: 'Reinzucht', desc: '+4 % Kreuzungs-Rabatt pro Stufe.', branch: 'labor', effect: 'crossDiscount', perLevel: 0.04, maxLevel: 3, cost: 2, prereq: 'saatgutforschung' },
  { id: 'lab_e1', name: 'Reinzucht II', desc: '+4 % Kreuzungs-Rabatt pro Stufe.', branch: 'labor', effect: 'crossDiscount', perLevel: 0.04, maxLevel: 3, cost: 2, prereq: 'lab_e' },
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
  glueck: 'Glück',
  labor: 'Labor',
}
