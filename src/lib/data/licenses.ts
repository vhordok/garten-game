import type { GameState } from '../game/types'
import { beautyMultiplier } from '../game/modifiers'

// Cannabis licenses (GAME_DESIGN.md §3): hard one-time money sinks with
// extra requirements — medical growing, fully licensed.

export interface LicenseDef {
  level: 1 | 2 | 3
  name: string
  description: string
  cost: number
  /** human-readable requirement + predicate */
  requirementText: string
  requirementMet: (s: GameState) => boolean
}

export const LICENSES: LicenseDef[] = [
  {
    level: 1,
    name: 'Lizenz I — Kleinanbau',
    description: 'Erlaubt CBD-Hanf. Der Papierkram ist teurer als das Saatgut.',
    cost: 30e9,
    requirementText: 'Parzelle 2 oder höher',
    requirementMet: (s) => s.parcels >= 2,
  },
  {
    level: 2,
    name: 'Lizenz II — Gewächshaus',
    description: 'Erlaubt Medizinalhanf. Verlangt einen vorzeigbaren Garten.',
    cost: 300e9,
    requirementText: 'Gartenschönheit +20 % oder mehr',
    requirementMet: (s) => beautyMultiplier(s) >= 1.2,
  },
  {
    level: 3,
    name: 'Lizenz III — Plantage',
    description: 'Erlaubt Goldenen Hanf — die Spitze der Branche.',
    cost: 3e12,
    requirementText: 'Parzelle 5 oder höher',
    requirementMet: (s) => s.parcels >= 5,
  },
]
