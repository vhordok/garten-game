// Relics (PHASE 68): permanent collectibles found on expeditions. Each owned
// copy adds a small, stacking passive bonus that survives prestige AND
// Weltensaat — a new progression axis gated by REAL TIME (expeditions run on a
// wall-clock timer), so the late-game multiplier runaway cannot rush it. Pure
// data; the bonus summation lives in game/expeditions.ts.

export type RelicEffect = 'yield' | 'growth' | 'compostGain' | 'sellPrice' | 'ticketLuck'
export type RelicRarity = 'common' | 'rare' | 'legendary' | 'mythic'

export interface RelicDef {
  id: string
  name: string
  emoji: string
  desc: string
  effect: RelicEffect
  /** bonus fraction per owned copy */
  perCopy: number
  rarity: RelicRarity
}

export const RELICS: RelicDef[] = [
  // common
  { id: 'sonnenstein', name: 'Sonnenstein', emoji: '🔆', desc: '+4 % Ertrag je Stück', effect: 'yield', perCopy: 0.04, rarity: 'common' },
  { id: 'windgeist', name: 'Windgeist', emoji: '🌀', desc: '+4 % Wachstumstempo je Stück', effect: 'growth', perCopy: 0.04, rarity: 'common' },
  { id: 'marktsiegel', name: 'Marktsiegel', emoji: '🏷️', desc: '+4 % Verkaufspreis je Stück', effect: 'sellPrice', perCopy: 0.04, rarity: 'common' },
  // rare
  { id: 'humusherz', name: 'Humusherz', emoji: '💗', desc: '+8 % Kompost-Gewinn je Stück', effect: 'compostGain', perCopy: 0.08, rarity: 'rare' },
  { id: 'gluecksrune', name: 'Glücksrune', emoji: '🍀', desc: '+3 % Los-Chance je Stück', effect: 'ticketLuck', perCopy: 0.03, rarity: 'rare' },
  { id: 'sternensplitter', name: 'Sternensplitter', emoji: '⭐', desc: '+12 % Ertrag je Stück', effect: 'yield', perCopy: 0.12, rarity: 'rare' },
  // legendary
  { id: 'weltenkern', name: 'Weltenkern', emoji: '🌟', desc: '+20 % Ertrag je Stück', effect: 'yield', perCopy: 0.2, rarity: 'legendary' },
  { id: 'zeitkristall', name: 'Zeitkristall', emoji: '🔮', desc: '+15 % Wachstumstempo je Stück', effect: 'growth', perCopy: 0.15, rarity: 'legendary' },
  // mythic (PHASE 90): the rarest tier — only from the two deep, Weltensaat-gated
  // destinations. Big per-copy bonuses; the endgame of the relic chase.
  { id: 'urrelikt', name: 'Urrelikt', emoji: '🔱', desc: '+35 % Ertrag je Stück', effect: 'yield', perCopy: 0.35, rarity: 'mythic' },
  { id: 'chronosplitter', name: 'Chronosplitter', emoji: '⌛', desc: '+28 % Wachstumstempo je Stück', effect: 'growth', perCopy: 0.28, rarity: 'mythic' },
  { id: 'fuellhornsiegel', name: 'Füllhornsiegel', emoji: '🌰', desc: '+22 % Kompost-Gewinn je Stück', effect: 'compostGain', perCopy: 0.22, rarity: 'mythic' },
]

const byId = new Map(RELICS.map((r) => [r.id, r]))
export function relicById(id: string): RelicDef | undefined {
  return byId.get(id)
}

/** Accent colour per rarity (UI). */
export const RARITY_COLOR: Record<RelicRarity, string> = {
  common: 'var(--c-silver)',
  rare: 'var(--c-blue1)',
  legendary: 'var(--c-gold2)',
  mythic: 'var(--c-plum3)',
}
