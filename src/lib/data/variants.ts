// Seed lab variants (PHASE 20): cross two unlocked parent plants to DISCOVER a
// variant. Discovery is deterministic (right recipe + conditions → guaranteed,
// no frustrating sub-1% rolls). A discovered variant is a permanent collectible
// that grants one small passive bonus — it is NOT a plantable plant, so there is
// no plot/sprite integration: small, clean, save-safe, extensible. Data only;
// the cross/grant logic and bonus math live in game/.

export type VariantEffect =
  | 'yield'
  | 'growth'
  | 'questReward'
  | 'ticketLuck'
  | 'compostGain'
  | 'beauty'
  | 'mastery'
  | 'passive'

export type VariantRarity = 'Bronze' | 'Silber' | 'Gold' | 'Platin' | 'Legendär'

export interface VariantDef {
  id: string
  name: string
  emoji: string
  /** unordered parent plant ids — crossing exactly these discovers the variant */
  parents: [string, string]
  /** which playstyle the variant reinforces (also its passive effect) */
  effect: VariantEffect
  /** size of the passive bonus (interpretation depends on effect) */
  value: number
  rarity: VariantRarity
  /** short German role/flavour line for the lexikon */
  role: string
  /** gold cost to attempt the cross (paid on discovery) */
  goldCost: number
  /** compost cost on top (0 = none) — ties higher tiers to the prestige economy */
  compostCost: number
  /** PHASE 21: harvested produce consumed from FREE (unreserved) storage — makes
   * the parent plants worth growing again. Only set when a parent is harvestable. */
  produceCost?: { plantId: string; amount: number }[]
  /** PHASE 21: once discovered, this variant amplifies a themed weather event. */
  eventSynergy?: { weatherId: string; extra: number }
  /** extra gates beyond "both parents unlocked" */
  requires?: { parcels?: number; masteryLevel?: number; beauty?: number }
}

export const VARIANTS: VariantDef[] = [
  // ── early ──
  {
    id: 'mediterrane-tomate',
    name: 'Mediterrane Tomate',
    emoji: '🍅',
    parents: ['basilikum', 'tomate'],
    effect: 'yield',
    value: 0.03,
    rarity: 'Bronze',
    role: 'Ertrag — solider Frühstart-Bonus',
    goldCost: 5000,
    compostCost: 0,
    produceCost: [
      { plantId: 'basilikum', amount: 20 },
      { plantId: 'tomate', amount: 10 },
    ],
  },
  {
    id: 'eilkraut',
    name: 'Eilkraut',
    emoji: '🌿',
    parents: ['basilikum', 'minze'],
    effect: 'growth',
    value: 0.04,
    rarity: 'Bronze',
    role: 'Wachstum — alles reift etwas schneller',
    goldCost: 8000,
    compostCost: 0,
    produceCost: [
      { plantId: 'basilikum', amount: 15 },
      { plantId: 'minze', amount: 15 },
    ],
  },
  // ── midgame ──
  {
    id: 'waldbeere',
    name: 'Waldbeere',
    emoji: '🫐',
    parents: ['erdbeere', 'blaubeere'],
    effect: 'ticketLuck',
    value: 0.02,
    rarity: 'Silber',
    role: 'Lose — häufiger Glücks-Lose bei der Ernte',
    goldCost: 60000,
    compostCost: 0,
    produceCost: [
      { plantId: 'erdbeere', amount: 30 },
      { plantId: 'blaubeere', amount: 20 },
    ],
  },
  {
    id: 'marktruebe',
    name: 'Markträbe',
    emoji: '🥕',
    parents: ['karotte', 'kuerbis'],
    effect: 'questReward',
    value: 0.08,
    rarity: 'Silber',
    role: 'Aufträge — bessere Lieferbelohnung',
    goldCost: 120000,
    compostCost: 0,
    produceCost: [
      { plantId: 'karotte', amount: 25 },
      { plantId: 'kuerbis', amount: 8 },
    ],
  },
  {
    id: 'humusveilchen',
    name: 'Humusveilchen',
    emoji: '💜',
    parents: ['veilchen', 'ringelblume'],
    effect: 'compostGain',
    value: 0.05,
    rarity: 'Silber',
    role: 'Kompost — wertvollere Prestiges',
    goldCost: 200000,
    compostCost: 10,
    eventSynergy: { weatherId: 'komposttag', extra: 0.5 },
  },
  // ── late ──
  {
    id: 'prachtorchidee',
    name: 'Prachtorchidee',
    emoji: '🪷',
    parents: ['hortensie', 'leuchtlilie'],
    effect: 'beauty',
    value: 0.1,
    rarity: 'Gold',
    role: 'Zier — stärkt den Schönheits-Build',
    goldCost: 5e6,
    compostCost: 0,
    eventSynergy: { weatherId: 'gartenschau', extra: 0.5 },
    requires: { parcels: 3 },
  },
  {
    id: 'sternenblume',
    name: 'Sternenblume',
    emoji: '🌟',
    parents: ['nachtrose', 'mondblume'],
    effect: 'ticketLuck',
    value: 0.03,
    rarity: 'Gold',
    role: 'Lose/Magie — Sternenlicht zieht Glück an',
    goldCost: 5e7,
    compostCost: 40,
    produceCost: [{ plantId: 'mondblume', amount: 12 }],
    eventSynergy: { weatherId: 'sternschnuppen', extra: 1 },
  },
  {
    id: 'meisterhanf',
    name: 'Meisterhanf',
    emoji: '🌱',
    parents: ['lavendel', 'cbdhanf'],
    effect: 'mastery',
    value: 0.25,
    rarity: 'Gold',
    role: 'Meisterschaft — Ernten geben mehr Meister-XP',
    goldCost: 1e8,
    compostCost: 0,
    produceCost: [
      { plantId: 'lavendel', amount: 20 },
      { plantId: 'cbdhanf', amount: 6 },
    ],
    eventSynergy: { weatherId: 'meistertag', extra: 0.5 },
    requires: { masteryLevel: 3 },
  },
  {
    id: 'ewige-eiche',
    name: 'Ewige Eiche',
    emoji: '🌳',
    parents: ['eiche', 'mammutbaum'],
    effect: 'passive',
    value: 0.15,
    rarity: 'Platin',
    role: 'Offline/Passiv — Holz-Bäume tröpfeln mehr Gold',
    goldCost: 5e8,
    compostCost: 60,
  },
  // ── endgame ──
  {
    id: 'weltenhybride',
    name: 'Weltenhybride',
    emoji: '🌹',
    parents: ['weltenbaum', 'weltenrose'],
    effect: 'yield',
    value: 0.05,
    rarity: 'Legendär',
    role: 'Ertrag — die Krone der Sammlung',
    goldCost: 5e10,
    compostCost: 500,
    produceCost: [
      { plantId: 'weltenbaum', amount: 5 },
      { plantId: 'weltenrose', amount: 5 },
    ],
    eventSynergy: { weatherId: 'erntefest', extra: 0.5 },
    requires: { masteryLevel: 5, parcels: 6 },
  },
]

const byId = new Map(VARIANTS.map((v) => [v.id, v]))

export function variantById(id: string): VariantDef | undefined {
  return byId.get(id)
}

/** Find the variant whose recipe matches an unordered pair of plant ids. */
export function variantByParents(a: string, b: string): VariantDef | undefined {
  return VARIANTS.find(
    (v) => (v.parents[0] === a && v.parents[1] === b) || (v.parents[0] === b && v.parents[1] === a)
  )
}

export const RARITY_ORDER: Record<VariantRarity, number> = {
  Bronze: 0,
  Silber: 1,
  Gold: 2,
  Platin: 3,
  Legendär: 4,
}
