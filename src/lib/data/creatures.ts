// Garten-Bewohner / creatures (PHASE 69): animals the garden ATTRACTS once a
// condition is met (a beautiful garden draws bees, decorations draw a hedgehog,
// expeditions' relics draw a fox …). Each attracted animal can be befriended and
// then FED with surplus produce to raise its friendship level, which strengthens
// a permanent passive bonus (survives prestige AND Weltensaat). They appear,
// alive and animated, in the garden scene. Feeding gives the late-game produce
// stockpile a real use — and a reason to pause auto-sell (PHASE 63). Pure data;
// attraction/feeding/bonus logic lives in game/creatures.ts.

export type CreatureEffect = 'yield' | 'growth' | 'compostGain' | 'sellPrice' | 'ticketLuck'
/** what draws the animal in (all monotonic, so attraction is permanent) */
export type AttractKind = 'level' | 'beauty' | 'decorations' | 'ornamentals' | 'worldResets' | 'relics' | 'expeditions'
/** PHASE 72: a roaming creature periodically brings a gift you click to collect */
export type GiftKind = 'tickets' | 'fertilizer'

export interface CreatureDef {
  id: string
  name: string
  emoji: string
  desc: string
  attract: { kind: AttractKind; value: number }
  effect: CreatureEffect
  /** bonus fraction per friendship level */
  perLevel: number
  maxLevel: number
  /** PHASE 72: the gift this creature brings, and how often (real seconds). The
   * reward amount scales with friendship level; collecting also raises it. */
  gift: GiftKind
  giftBase: number
  giftSeconds: number
}

export const CREATURES: CreatureDef[] = [
  {
    id: 'marienkaefer',
    name: 'Marienkäfer',
    emoji: '🐞',
    desc: 'Krabbelt von Anfang an durchs Beet und bringt Glück.',
    attract: { kind: 'level', value: 1 },
    effect: 'ticketLuck',
    perLevel: 0.02,
    maxLevel: 10,
    gift: 'tickets',
    giftBase: 2,
    giftSeconds: 300,
  },
  {
    id: 'biene',
    name: 'Honigbiene',
    emoji: '🐝',
    desc: 'Kommt zu einem blühenden Garten und beschleunigt das Wachstum.',
    attract: { kind: 'beauty', value: 0.5 },
    effect: 'growth',
    perLevel: 0.03,
    maxLevel: 15,
    gift: 'fertilizer',
    giftBase: 1,
    giftSeconds: 600,
  },
  {
    id: 'schmetterling',
    name: 'Schmetterling',
    emoji: '🦋',
    desc: 'Ein prächtiger Garten lockt ihn an — er hebt den Ertrag.',
    attract: { kind: 'beauty', value: 2 },
    effect: 'yield',
    perLevel: 0.03,
    maxLevel: 15,
    gift: 'tickets',
    giftBase: 3,
    giftSeconds: 600,
  },
  {
    id: 'igel',
    name: 'Igel',
    emoji: '🦔',
    desc: 'Nistet sich zwischen deiner Deko ein und lockert den Boden.',
    attract: { kind: 'decorations', value: 3 },
    effect: 'compostGain',
    perLevel: 0.05,
    maxLevel: 10,
    gift: 'fertilizer',
    giftBase: 1,
    giftSeconds: 900,
  },
  {
    id: 'frosch',
    name: 'Laubfrosch',
    emoji: '🐸',
    desc: 'Mag deine Ziersammlung und quakt das Wachstum voran.',
    attract: { kind: 'ornamentals', value: 3 },
    effect: 'growth',
    perLevel: 0.04,
    maxLevel: 12,
    gift: 'tickets',
    giftBase: 4,
    giftSeconds: 900,
  },
  {
    id: 'gartenvogel',
    name: 'Gartenvogel',
    emoji: '🐦',
    desc: 'Findet erst nach der ersten Weltensaat zu dir — singt für mehr Ertrag.',
    attract: { kind: 'worldResets', value: 1 },
    effect: 'yield',
    perLevel: 0.05,
    maxLevel: 20,
    gift: 'fertilizer',
    giftBase: 2,
    giftSeconds: 1800,
  },
  {
    id: 'fuchs',
    name: 'Gartenfuchs',
    emoji: '🦊',
    desc: 'Wittert deine Relikte und handelt dir bessere Preise aus.',
    attract: { kind: 'relics', value: 5 },
    effect: 'sellPrice',
    perLevel: 0.04,
    maxLevel: 12,
    gift: 'tickets',
    giftBase: 8,
    giftSeconds: 1800,
  },
  {
    id: 'eule',
    name: 'Garteneule',
    emoji: '🦉',
    desc: 'Eine weise Hüterin für erfahrene Gärtner — krönt den Ertrag.',
    attract: { kind: 'level', value: 100 },
    effect: 'yield',
    perLevel: 0.06,
    maxLevel: 20,
    gift: 'fertilizer',
    giftBase: 3,
    giftSeconds: 3600,
  },
  // PHASE 80: three more creatures drawn by the OTHER new systems, so doing
  // expeditions / collecting relics / sowing worlds visibly populates the garden.
  {
    id: 'eichhoernchen',
    name: 'Eichhörnchen',
    emoji: '🐿️',
    desc: 'Folgt dem abenteuerlustigen Gärtner heim und hortet Glück.',
    attract: { kind: 'expeditions', value: 3 },
    effect: 'ticketLuck',
    perLevel: 0.03,
    maxLevel: 12,
    gift: 'tickets',
    giftBase: 5,
    giftSeconds: 1200,
  },
  {
    id: 'dachs',
    name: 'Dachs',
    emoji: '🦡',
    desc: 'Wittert deine Relikt-Sammlung und gräbt nach mehr Ertrag.',
    attract: { kind: 'relics', value: 12 },
    effect: 'yield',
    perLevel: 0.05,
    maxLevel: 15,
    gift: 'fertilizer',
    giftBase: 3,
    giftSeconds: 2400,
  },
  {
    id: 'schildkroete',
    name: 'Schildkröte',
    emoji: '🐢',
    desc: 'Uralt und weltklug — kommt erst, wenn du Welten gesät hast.',
    attract: { kind: 'worldResets', value: 2 },
    effect: 'growth',
    perLevel: 0.05,
    maxLevel: 15,
    gift: 'fertilizer',
    giftBase: 2,
    giftSeconds: 1800,
  },
]

const byId = new Map(CREATURES.map((c) => [c.id, c]))
export function creatureById(id: string): CreatureDef | undefined {
  return byId.get(id)
}

/** Human label for an attraction condition (UI hint). */
export function attractLabel(def: CreatureDef): string {
  const { kind, value } = def.attract
  switch (kind) {
    case 'level':
      return `ab Gärtner-Level ${value}`
    case 'beauty':
      return `ab Gartenschönheit ${Math.round(value * 100)} %`
    case 'decorations':
      return `ab ${value} Deko-Objekten`
    case 'ornamentals':
      return `ab ${value} Zierpflanzen`
    case 'worldResets':
      // clarity: it's about ACTUALLY sowing a world (worldResets), not merely
      // being able to — players read "ab 1 Weltensaat" as the latter (PHASE 79)
      return value === 1 ? `nachdem du 1× Weltensaat gesät hast` : `nach ${value}× Weltensaat-Säen`
    case 'relics':
      return `ab ${value} Relikten`
    case 'expeditions':
      return `ab ${value} abgeschlossenen Expeditionen`
  }
}
