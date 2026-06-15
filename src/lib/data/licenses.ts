import type { GameState } from '../game/types'
import { beautyMultiplier } from '../game/modifiers'

// Cannabis licenses (GAME_DESIGN.md §3): hard one-time money sinks with
// extra requirements — medical growing, fully licensed.

export interface LicenseDef {
  level: number
  name: string
  description: string
  cost: number
  /** human-readable requirement + predicate */
  requirementText: string
  requirementMet: (s: GameState) => boolean
  /** PHASE 27: short note on the lasting benefit beyond unlocking a plant */
  benefit?: string
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
  // ── PHASE 27: Late-Game-Lizenzen — keine neuen Pflanzen, aber dauerhafte
  // Auftrags-Vorteile (ziehen Aufträge im Endgame wieder lohnend). Großer
  // Gold-Sink mit Parzellen-Gate. licenseQuestBonus() macht sie spürbar.
  {
    level: 4,
    name: 'Lizenz IV — Hanf-Export',
    description: 'Exportrechte für Hanf & Co. — Aufträge zahlen deutlich besser (+20 % Auftragsbelohnung).',
    cost: 80e15,
    requirementText: 'Parzelle 12 oder höher',
    requirementMet: (s) => s.parcels >= 12,
    benefit: '+20 % Auftragsbelohnung, dauerhaft',
  },
  {
    level: 5,
    name: 'Lizenz V — Welthandel',
    description: 'Welthandels-Konzession — der Markt liegt dir zu Füßen (+30 % Auftragsbelohnung obendrauf).',
    cost: 50e18,
    requirementText: 'Parzelle 22 oder höher',
    requirementMet: (s) => s.parcels >= 22,
    benefit: '+30 % Auftragsbelohnung (zusätzlich), dauerhaft',
  },
]

/** Permanent quest-reward bonus from late licenses (Lizenz IV +20 %, V +30 %). */
export function licenseQuestBonus(licenses: number): number {
  let bonus = 0
  if (licenses >= 4) bonus += 0.2
  if (licenses >= 5) bonus += 0.3
  return bonus
}
