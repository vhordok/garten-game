// Garten-Deko (PHASE 49, rendering reworked PHASE 50): decorations the player
// BUYS, which are landscaped INTO the background garden scene (ui/Scene.svelte) —
// scattered across the ground with depth, not stacked in a shelf. Unlike gallery
// ornamentals (collection panel only), every owned copy dresses the backdrop, so
// the screen genuinely gets prettier as you invest. Mechanically each copy adds
// beauty (folded into gardenBeauty), so beautifying is also progress.
//
// Pure data: id, label, a 16×16 sprite id (authored in ui/pixel/sprites.ts),
// the beauty each copy grants, and the base gold price. Copy/cap scaling lives
// in CONFIG (decorationCostFactor / decorationMaxCopies).

import { CONFIG } from './config'

export interface DecorationDef {
  id: string
  /** German UI name */
  name: string
  /** one-line flavor for the panel */
  desc: string
  /** sprite id registered in SPRITES (16×16) */
  sprite: string
  /** beauty each owned copy adds (feeds gardenBeauty) */
  beautyBonus: number
  /** gold price of the FIRST copy */
  baseCost: number
  /** PHASE 65: minimum sown worlds (Weltensaat) before this deco unlocks.
   * Undefined/0 = available from the start. A visible reward for ascending. */
  unlockWorlds?: number
}

export const DECORATIONS: DecorationDef[] = [
  {
    id: 'steinweg',
    name: 'Steinweg',
    desc: 'Ein gepflasterter Pfad zwischen den Beeten.',
    sprite: 'deco-steinweg',
    beautyBonus: 0.05,
    baseCost: 15_000,
  },
  {
    id: 'zaun',
    name: 'Gartenzaun',
    desc: 'Ein weißer Lattenzaun rahmt den Garten ein.',
    sprite: 'deco-zaun',
    beautyBonus: 0.07,
    baseCost: 25_000,
  },
  {
    id: 'laterne',
    name: 'Gartenlaterne',
    desc: 'Warmes Laternenlicht für die Mitternachtsstunden.',
    sprite: 'deco-laterne',
    beautyBonus: 0.09,
    baseCost: 40_000,
  },
  {
    id: 'blumenbeet',
    name: 'Blumenbeet',
    desc: 'Ein buntes Zierbeet ganz ohne Erntepflege.',
    sprite: 'deco-blumenbeet',
    beautyBonus: 0.11,
    baseCost: 60_000,
  },
  {
    id: 'teich',
    name: 'Gartenteich',
    desc: 'Ein stiller Teich, in dem sich der Mond spiegelt.',
    sprite: 'deco-teich',
    beautyBonus: 0.14,
    baseCost: 90_000,
  },
  {
    id: 'vogelbad',
    name: 'Vogelbad',
    desc: 'Ein steinernes Bad lädt die Nachtvögel ein.',
    sprite: 'deco-vogelbad',
    beautyBonus: 0.17,
    baseCost: 140_000,
  },
  {
    id: 'zwerg',
    name: 'Gartenzwerg',
    desc: 'Ein Klassiker mit roter Zipfelmütze.',
    sprite: 'deco-zwerg',
    beautyBonus: 0.2,
    baseCost: 220_000,
  },
  {
    id: 'springbrunnen',
    name: 'Springbrunnen',
    desc: 'Das prächtige Herzstück eines jeden Ziergartens.',
    sprite: 'deco-springbrunnen',
    beautyBonus: 0.28,
    baseCost: 400_000,
  },
  // PHASE 65: cosmic decorations — only available after sowing worlds (Weltensaat),
  // a visible badge of the higher prestige. Stronger beauty, fitting the endgame.
  {
    id: 'sternenportal',
    name: 'Sternenportal',
    desc: 'Ein leuchtendes Tor zwischen den Welten — Beweis deiner ersten Weltensaat.',
    sprite: 'deco-sternenportal',
    beautyBonus: 0.4,
    baseCost: 5_000_000,
    unlockWorlds: 1,
  },
  {
    id: 'sternenkugel',
    name: 'Sternenkugel',
    desc: 'Eine schwebende Kugel aus gebanntem Sternenlicht.',
    sprite: 'deco-sternenkugel',
    beautyBonus: 0.55,
    baseCost: 25_000_000,
    unlockWorlds: 3,
  },
]

/** PHASE 65: whether a decoration's Weltensaat gate is met. */
export function isDecorationUnlocked(def: DecorationDef, worldResets: number): boolean {
  return worldResets >= (def.unlockWorlds ?? 0)
}

export function decorationById(id: string): DecorationDef | undefined {
  return DECORATIONS.find((d) => d.id === id)
}

/** Gold cost of the NEXT copy; Infinity once the per-kind cap is reached. */
export function nextDecorationCost(def: DecorationDef, owned: number): number {
  if (owned >= CONFIG.decorationMaxCopies) return Infinity
  return Math.ceil(def.baseCost * Math.pow(CONFIG.decorationCostFactor, owned))
}
