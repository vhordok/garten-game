// Expeditions (PHASE 68): a parallel, REAL-TIME activity. The player sends a
// gardener to a location for a wall-clock duration (minutes → hours). When it
// returns, they make a press-your-luck CHOICE — take the safe find, or risk it
// for something rarer. Rewards are RELICS (permanent collectibles, see relics.ts)
// plus the occasional resource. Because the gate is real time, the late-game
// multiplier runaway can't rush it — it paces itself and gives maxed players a
// fresh thing to do. Pure data; the run/claim logic lives in game/expeditions.ts.

export interface ExpeditionDef {
  id: string
  name: string
  emoji: string
  desc: string
  /** wall-clock duration in seconds */
  durationSeconds: number
  /** gold cost to send (early-game friction; the real cost is the time slot) */
  cost: number
  /** relic ids the SAFE choice can yield (one, uniformly) */
  safePool: string[]
  /** relic ids the RISKY choice can yield (rarer) on success */
  riskyPool: string[]
  /** chance the risky choice succeeds (else: nothing) */
  riskSuccess: number
  /** copies granted by a successful risky claim */
  riskyCopies: number
  /** optional gate: minimum worlds sown (Weltensaat) */
  unlockWorlds?: number
}

const MIN = 60
const HOUR = 3600

export const EXPEDITIONS: ExpeditionDef[] = [
  {
    id: 'wiese',
    name: 'Blumenwiese',
    emoji: '🌼',
    desc: 'Ein kurzer Ausflug über die nahe Wiese — gut für den ersten Fund.',
    durationSeconds: 5 * MIN,
    cost: 1e6,
    safePool: ['sonnenstein', 'windgeist', 'marktsiegel'],
    riskyPool: ['humusherz', 'gluecksrune'],
    riskSuccess: 0.6,
    riskyCopies: 1,
  },
  {
    id: 'wald',
    name: 'Tiefer Wald',
    emoji: '🌲',
    desc: 'Unter altem Blätterdach verbergen sich seltenere Funde.',
    durationSeconds: 30 * MIN,
    cost: 1e9,
    safePool: ['sonnenstein', 'windgeist', 'marktsiegel', 'humusherz'],
    riskyPool: ['gluecksrune', 'sternensplitter'],
    riskSuccess: 0.55,
    riskyCopies: 1,
  },
  {
    id: 'berge',
    name: 'Nebelberge',
    emoji: '⛰️',
    desc: 'Steiler Aufstieg in den Nebel — wertvoll, aber zeitraubend.',
    durationSeconds: 2 * HOUR,
    cost: 1e13,
    safePool: ['humusherz', 'gluecksrune', 'sternensplitter'],
    riskyPool: ['sternensplitter', 'zeitkristall'],
    riskSuccess: 0.5,
    riskyCopies: 1,
  },
  {
    id: 'ruinen',
    name: 'Alte Ruinen',
    emoji: '🏛️',
    desc: 'Versunkene Ruinen voller Relikte — nur für geduldige Gärtner.',
    durationSeconds: 8 * HOUR,
    cost: 1e18,
    safePool: ['sternensplitter', 'zeitkristall'],
    riskyPool: ['weltenkern', 'zeitkristall'],
    riskSuccess: 0.45,
    riskyCopies: 1,
  },
  {
    id: 'sternenpfad',
    name: 'Sternenpfad',
    emoji: '🌌',
    desc: 'Eine Reise zwischen den Welten — nur Weltensaat-Gärtnern zugänglich.',
    durationSeconds: 24 * HOUR,
    cost: 1e24,
    safePool: ['zeitkristall', 'weltenkern'],
    riskyPool: ['weltenkern'],
    riskSuccess: 0.5,
    riskyCopies: 2,
    unlockWorlds: 1,
  },
  // PHASE 90: two DEEP destinations for Weltensaat-veterans — long real-time
  // journeys that are the only source of the mythic relic tier. They give the
  // maxed player a fresh, time-gated chase past the Sternenpfad.
  {
    id: 'weltenriss',
    name: 'Weltenriss',
    emoji: '🌀',
    desc: 'Ein Riss zwischen den Welten — jenseits davon warten mythische Relikte.',
    durationSeconds: 12 * HOUR,
    cost: 1e30,
    safePool: ['weltenkern', 'zeitkristall', 'urrelikt'],
    riskyPool: ['urrelikt', 'chronosplitter'],
    riskSuccess: 0.45,
    riskyCopies: 1,
    unlockWorlds: 3,
  },
  {
    id: 'schoepfungsquelle',
    name: 'Schöpfungsquelle',
    emoji: '🌌',
    desc: 'Der Quell aller Schöpfung — die tiefste Reise, reich an mythischen Funden.',
    durationSeconds: 48 * HOUR,
    cost: 1e36,
    safePool: ['urrelikt', 'chronosplitter', 'fuellhornsiegel'],
    riskyPool: ['chronosplitter', 'fuellhornsiegel', 'urrelikt'],
    riskSuccess: 0.5,
    riskyCopies: 2,
    unlockWorlds: 6,
  },
]

const byId = new Map(EXPEDITIONS.map((e) => [e.id, e]))
export function expeditionById(id: string): ExpeditionDef | undefined {
  return byId.get(id)
}

/** Whether an expedition's gate (worlds sown) is met. */
export function isExpeditionUnlocked(def: ExpeditionDef, worldResets: number): boolean {
  return worldResets >= (def.unlockWorlds ?? 0)
}

// ── PHASE 76: return events ──────────────────────────────────────────────────
// When an expedition comes back, a small narrative EVENT frames the press-your-
// luck choice — varied story + options instead of a fixed Sicher/Wagnis. The
// option `mode` maps to the reward roll in game/expeditions.ts:
//   safe   → 1 relic from the safe pool (guaranteed)
//   risky  → 1 rarer relic from the risky pool at riskSuccess%, else nothing
//   double → 2 relics from the safe pool (guaranteed) — the steady middle path
export type ExpeditionMode = 'safe' | 'risky' | 'double'

export interface ExpeditionOption {
  label: string
  hint: string
  mode: ExpeditionMode
}
export interface ExpeditionEvent {
  id: string
  text: string
  options: ExpeditionOption[]
}

export const EXPEDITION_EVENTS: ExpeditionEvent[] = [
  {
    id: 'truhe',
    text: 'Im Dickicht steht eine verschlossene Truhe.',
    options: [
      { label: '🔨 Aufbrechen', hint: 'Wagnis — Chance auf ein seltenes Relikt', mode: 'risky' },
      { label: '🗝️ Schloss knacken', hint: 'sicher: 1 Relikt', mode: 'safe' },
    ],
  },
  {
    id: 'gabelung',
    text: 'Eine Weggabelung — links unbekannt, rechts vertraut.',
    options: [
      { label: '🌫️ Unbekannter Pfad', hint: 'Wagnis — Chance auf ein seltenes Relikt', mode: 'risky' },
      { label: '🧭 Bekannter Weg', hint: 'sicher: 1 Relikt', mode: 'safe' },
    ],
  },
  {
    id: 'haendler',
    text: 'Ein fahrender Händler bietet einen Tausch an.',
    options: [
      { label: '🤝 Handeln', hint: 'sicher: 2 Relikte', mode: 'double' },
      { label: '🎲 Auf Glück hoffen', hint: 'Wagnis — Chance auf ein seltenes Relikt', mode: 'risky' },
    ],
  },
  {
    id: 'hoehle',
    text: 'Eine dunkle Höhle gähnt vor dir.',
    options: [
      { label: '🔦 Tief hinein', hint: 'Wagnis — Chance auf ein seltenes Relikt', mode: 'risky' },
      { label: '🧺 Am Eingang sammeln', hint: 'sicher: 1 Relikt', mode: 'safe' },
    ],
  },
  {
    id: 'fund',
    text: 'Etwas glänzt verheißungsvoll im Geröll.',
    options: [
      { label: '⛏️ Ausgraben', hint: 'sicher: 2 Relikte', mode: 'double' },
      { label: '👜 Schnell mitnehmen', hint: 'sicher: 1 Relikt', mode: 'safe' },
    ],
  },
  {
    id: 'sturm',
    text: 'Ein Sturm zieht auf, der Rückweg wird heikel.',
    options: [
      { label: '🌩️ Durchhalten', hint: 'Wagnis — Chance auf ein seltenes Relikt', mode: 'risky' },
      { label: '⛺ Unterstellen', hint: 'sicher: 1 Relikt', mode: 'safe' },
    ],
  },
]

/** Stable per-trip event (derived from endsAt → no extra save state). */
export function expeditionEvent(endsAt: number): ExpeditionEvent {
  const i = Math.abs(Math.floor(endsAt / 1000)) % EXPEDITION_EVENTS.length
  return EXPEDITION_EVENTS[i]
}
