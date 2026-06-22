import { CONFIG } from './config'
import type { GameState } from '../game/types'

// Achievements (PHASE 19): each badge is now a multi-tier track (Bronze →
// Legendär). A tier's `metric` value is read from state; reaching a threshold
// grants that tier's rewards. Permanent rewards (yield/growth/…) are summed from
// CLAIMED tiers in game/achievements.ts and apply forever; one-time rewards
// (compost/tickets/fertilizer) are paid once when the tier is first reached.
// Data only — the claim/grant logic and skill-point math live in game/.

export type AchCategory =
  | 'ernte'
  | 'gold'
  | 'auftraege'
  | 'parzellen'
  | 'kompost'
  | 'skilltree'
  | 'lose'
  | 'zier'
  | 'meisterschaft'
  | 'spezialisierung'
  | 'level'
  | 'varianten'
  | 'weltensaat'
  | 'expeditionen'
  | 'relikte'
  | 'tierfreund'

export const TIER_NAMES = ['Bronze', 'Silber', 'Gold', 'Platin', 'Diamant', 'Legendär'] as const
export type TierName = (typeof TIER_NAMES)[number]

/** A reward bundle. Permanent effects stack from claimed tiers; one-time
 * resources are paid exactly once when the tier is first reached. */
export interface AchReward {
  // permanent (derived from claimed tiers, survive prestige)
  yield?: number
  growth?: number
  questReward?: number
  ticketLuck?: number
  // one-time (granted on the claim transition)
  compost?: number
  tickets?: number
  fertilizer?: number
}

export interface AchTier {
  threshold: number
  rewards: AchReward
}

export interface AchievementDef {
  id: string
  name: string
  category: AchCategory
  icon: string
  /** current progress value */
  metric: (s: GameState) => number
  /** exactly six ascending tiers (Bronze → Legendär) */
  tiers: AchTier[]
  /** render a metric/threshold value for the UI */
  format: (v: number) => string
}

// ── metric helpers (kept import-free to avoid cycles with modifiers) ──────────
const compostClaimed = (s: GameState) => Math.max(s.compost, 0) + Math.max(s.compostSpent, 0)
const skillTotal = (s: GameState) => Object.values(s.skills).reduce((a, b) => a + b, 0)
const maxSpec = (s: GameState) => Math.max(0, ...Object.values(s.specializations).map((v) => v || 0))
const maxMastery = (s: GameState) => {
  let best = 0
  for (const xp of Object.values(s.mastery)) {
    if (xp <= 0) continue
    const lvl = Math.min(CONFIG.masteryMaxLevel, Math.floor(Math.log2(xp / CONFIG.masteryBase + 1)))
    if (lvl > best) best = lvl
  }
  return best
}

// ── number formatting for the panel ───────────────────────────────────────────
const fmtInt = (v: number) => {
  const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp']
  let i = 0
  let n = v
  while (n >= 1000 && i < u.length - 1) {
    n /= 1000
    i++
  }
  return `${n % 1 === 0 ? n : n.toFixed(1)}${u[i]}`
}
const fmtPlain = (v: number) => `${Math.round(v)}`
const fmtPct = (v: number) => `${Math.round(v * 100)} %`

/**
 * Build six tiers: ascending thresholds, a themed permanent reward that grows
 * each tier, plus a one-time resource bundle scaling with tier. Keeps the table
 * readable while staying data-driven.
 */
function track(
  thresholds: [number, number, number, number, number, number],
  permEffect: 'yield' | 'growth' | 'questReward' | 'ticketLuck',
  perm: [number, number, number, number, number, number]
): AchTier[] {
  // One-time rewards deliberately avoid compost: prestige compost is gated by
  // `compostClaimed`, so handing out compost here would suppress the next
  // prestige gain (and stall early prestige). Boosters + tickets are neutral.
  const oneTime: AchReward[] = [
    { fertilizer: 2 },
    { tickets: 1 },
    { fertilizer: 4 },
    { tickets: 2 },
    { fertilizer: 8 },
    { tickets: 3, fertilizer: 15 },
  ]
  return thresholds.map((threshold, i) => ({
    threshold,
    rewards: { ...oneTime[i], [permEffect]: perm[i] },
  }))
}

const YIELD: [number, number, number, number, number, number] = [0.005, 0.01, 0.015, 0.02, 0.03, 0.04]
const GROWTH: [number, number, number, number, number, number] = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03]
const LUCK: [number, number, number, number, number, number] = [0.005, 0.01, 0.015, 0.02, 0.03, 0.04]
const QUEST: [number, number, number, number, number, number] = [0.02, 0.03, 0.05, 0.07, 0.1, 0.15]

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ernte',
    name: 'Erntemeister',
    category: 'ernte',
    icon: '🌾',
    metric: (s) => s.stats.harvested,
    format: fmtInt,
    tiers: track([100, 1e3, 1e4, 1e5, 1e6, 1e7], 'yield', YIELD),
  },
  {
    id: 'gold',
    name: 'Goldschatz',
    category: 'gold',
    icon: '💰',
    metric: (s) => s.lifetimeEarned,
    format: fmtInt,
    tiers: track([1e3, 1e6, 1e9, 1e12, 1e15, 1e18], 'yield', YIELD),
  },
  {
    id: 'auftraege',
    name: 'Lieferdienst',
    category: 'auftraege',
    icon: '📜',
    metric: (s) => s.stats.questsDone,
    format: fmtPlain,
    tiers: track([1, 10, 50, 250, 1000, 5000], 'questReward', QUEST),
  },
  {
    id: 'parzellen',
    name: 'Landgut',
    category: 'parzellen',
    icon: '🏞️',
    metric: (s) => s.parcels,
    format: fmtPlain,
    tiers: track([2, 5, 10, 20, 50, 100], 'growth', GROWTH),
  },
  {
    id: 'kompost',
    name: 'Komposthaufen',
    category: 'kompost',
    icon: '♻️',
    metric: compostClaimed,
    format: fmtInt,
    tiers: track([10, 1e3, 1e5, 1e6, 1e8, 1e10], 'growth', GROWTH),
  },
  {
    id: 'skilltree',
    name: 'Baumeister',
    category: 'skilltree',
    icon: '🌱',
    metric: skillTotal,
    format: fmtPlain,
    tiers: track([1, 3, 6, 9, 12, 15], 'growth', GROWTH),
  },
  {
    id: 'lose',
    name: 'Glücksritter',
    category: 'lose',
    icon: '🎟️',
    metric: (s) => s.stats.scratchesDone,
    format: fmtPlain,
    tiers: track([1, 25, 100, 500, 2500, 10000], 'ticketLuck', LUCK),
  },
  {
    id: 'zier',
    name: 'Schaugärtner',
    category: 'zier',
    icon: '✿',
    metric: (s) => s.records.bestBeauty,
    format: fmtPct,
    tiers: track([0.05, 0.2, 0.5, 1.0, 2.0, 4.0], 'ticketLuck', LUCK),
  },
  {
    id: 'meisterschaft',
    name: 'Pflanzenflüsterer',
    category: 'meisterschaft',
    icon: '🏅',
    metric: maxMastery,
    format: (v) => `Lv ${Math.round(v)}`,
    tiers: track([1, 3, 5, 7, 9, 10], 'yield', YIELD),
  },
  {
    id: 'spezialisierung',
    name: 'Spezialist',
    category: 'spezialisierung',
    icon: '⭐',
    metric: maxSpec,
    format: (v) => `Stufe ${Math.round(v)}`,
    tiers: track([1, 5, 10, 15, 20, 25], 'yield', YIELD),
  },
  {
    id: 'level',
    name: 'Gärtnerkarriere',
    category: 'level',
    icon: '🎓',
    metric: (s) => s.level,
    format: (v) => `Lv ${Math.round(v)}`,
    tiers: track([10, 25, 50, 100, 250, 1000], 'yield', YIELD),
  },
  {
    id: 'varianten',
    name: 'Saatforscher',
    category: 'varianten',
    icon: '🧬',
    metric: (s) => s.discoveredVariants.length,
    format: fmtPlain,
    tiers: track([1, 2, 4, 6, 8, 10], 'growth', GROWTH),
  },
  // PHASE 58: ties the Weltensaat endgame (worlds sown) into the achievement +
  // skill-point economy. Permanent yield reward + a Bronze badge for the very
  // first Weltensaat, up to Legendär at 15 worlds.
  {
    id: 'weltensaat',
    name: 'Weltenwanderer',
    category: 'weltensaat',
    icon: '🌌',
    metric: (s) => s.worldResets ?? 0,
    format: (v) => `${Math.round(v)} Welten`,
    tiers: track([1, 2, 3, 5, 8, 15], 'yield', YIELD),
  },
  // PHASE 70: tie the two new activity systems (expeditions, creatures) into the
  // achievement + skill-point economy — fresh badges to chase for maxed players,
  // and visibility so the systems are discoverable. Metrics read state inline
  // (import-free) to avoid cycles.
  {
    id: 'expeditionen',
    name: 'Entdecker',
    category: 'expeditionen',
    icon: '🧭',
    metric: (s) => s.expeditionsDone ?? 0,
    format: (v) => `${Math.round(v)} Reisen`,
    tiers: track([1, 5, 15, 40, 100, 300], 'yield', YIELD),
  },
  {
    id: 'relikte',
    name: 'Reliktsammler',
    category: 'relikte',
    icon: '⭐',
    metric: (s) => Object.values(s.relics ?? {}).reduce((a, b) => a + b, 0),
    format: fmtPlain,
    tiers: track([1, 3, 6, 10, 20, 40], 'questReward', QUEST),
  },
  {
    id: 'tierfreund',
    name: 'Tierfreund',
    category: 'tierfreund',
    icon: '🐾',
    metric: (s) => Object.values(s.creatures ?? {}).filter((v) => v > 0).length,
    format: (v) => `${Math.round(v)} Tiere`,
    tiers: track([1, 2, 3, 4, 6, 8], 'growth', GROWTH),
  },
]

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}
