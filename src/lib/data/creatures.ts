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
export type AttractKind = 'level' | 'beauty' | 'decorations' | 'ornamentals' | 'worldResets' | 'relics'

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
  /** produce units the FIRST feed costs (scales up per level) */
  feedBase: number
  feedFactor: number
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
    feedBase: 50,
    feedFactor: 1.5,
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
    feedBase: 100,
    feedFactor: 1.5,
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
    feedBase: 200,
    feedFactor: 1.5,
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
    feedBase: 500,
    feedFactor: 1.6,
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
    feedBase: 800,
    feedFactor: 1.6,
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
    feedBase: 2000,
    feedFactor: 1.6,
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
    feedBase: 5000,
    feedFactor: 1.7,
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
    feedBase: 10000,
    feedFactor: 1.7,
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
      return `ab ${value} Weltensaat`
    case 'relics':
      return `ab ${value} Relikten`
  }
}
