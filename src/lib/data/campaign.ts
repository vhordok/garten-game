// Mini-campaign "Der Weg des Meistergärtners" (PHASE 48). A single linear chain
// of milestones that threads the player through the whole game — early sowing to
// deep prestige — so there is always ONE clear headline next step with a concrete
// reward. Purely data: each step has a metric over GameState, a target, and a
// one-time reward paid through the SAME currencies achievements use (compost /
// scratch tickets / fertilizer charges) so no new reward plumbing is needed.
//
// The chain is claimed automatically in tick (game/campaign.ts), advancing the
// persisted `campaign` index; the goal panel surfaces the current step. Steps are
// deliberately ordered by increasing difficulty — never reorder without a save
// migration (the index points into THIS array).

import { CONFIG } from './config'
import type { GameState } from '../game/types'

export interface CampaignReward {
  compost?: number
  tickets?: number
  fertilizer?: number
}

export interface CampaignStep {
  id: string
  /** chapter headline, e.g. "Erste Saat" */
  title: string
  /** what to do, German, terse */
  objective: string
  /** progress metric over the live state */
  metric: (s: GameState) => number
  /** value of `metric` that completes the step */
  target: number
  reward: CampaignReward
  /** short German reward line for the panel */
  rewardDesc: string
}

/** Highest mastery level reached on any plant (mirrors the achievements helper). */
const maxMastery = (s: GameState): number => {
  let best = 0
  for (const xp of Object.values(s.mastery)) {
    if (xp <= 0) continue
    const lvl = Math.min(CONFIG.masteryMaxLevel, Math.floor(Math.log2(xp / CONFIG.masteryBase + 1)))
    if (lvl > best) best = lvl
  }
  return best
}

const maxSpec = (s: GameState): number =>
  Math.max(0, ...Object.values(s.specializations).map((v) => v || 0))

export const CAMPAIGN: CampaignStep[] = [
  {
    id: 'first-seeds',
    title: 'Erste Saat',
    objective: 'Säe 5 Pflanzen',
    metric: (s) => s.stats.planted,
    target: 5,
    reward: { tickets: 3 },
    rewardDesc: '+3 Rubbellose',
  },
  {
    id: 'first-harvest',
    title: 'Erste Ernte',
    objective: 'Ernte 25 Pflanzen',
    metric: (s) => s.stats.harvested,
    target: 25,
    reward: { fertilizer: 1 },
    rewardDesc: '+1 Turbo-Dünger',
  },
  {
    id: 'market-sense',
    title: 'Marktgespür',
    objective: 'Verdiene 2.000 Gold (Runde)',
    metric: (s) => s.totalEarned,
    target: 2_000,
    reward: { tickets: 5 },
    rewardDesc: '+5 Rubbellose',
  },
  {
    id: 'first-order',
    title: 'Erster Auftrag',
    objective: 'Erfülle 1 Auftrag',
    metric: (s) => s.stats.questsDone,
    target: 1,
    reward: { compost: 3 },
    rewardDesc: '+3 Kompost',
  },
  {
    id: 'bigger-garden',
    title: 'Größerer Garten',
    objective: 'Besitze 12 Beete',
    metric: (s) => s.plots.length,
    target: 12,
    reward: { fertilizer: 2 },
    rewardDesc: '+2 Turbo-Dünger',
  },
  {
    id: 'lucky-streak',
    title: 'Glückspilz',
    objective: 'Rubble 5 Lose frei',
    metric: (s) => s.stats.scratchesDone,
    target: 5,
    reward: { tickets: 8 },
    rewardDesc: '+8 Rubbellose',
  },
  {
    id: 'first-parcel',
    title: 'Neuland',
    objective: 'Pachte deine 2. Parzelle (Prestige)',
    metric: (s) => s.parcels,
    target: 2,
    reward: { compost: 10 },
    rewardDesc: '+10 Kompost',
  },
  {
    id: 'specialist',
    title: 'Spezialist',
    objective: 'Spezialisiere eine Kategorie (Stufe 1)',
    metric: maxSpec,
    target: 1,
    reward: { fertilizer: 5 },
    rewardDesc: '+5 Turbo-Dünger',
  },
  {
    id: 'beautifier',
    title: 'Verschönerer',
    objective: 'Erreiche 25 % Garten-Schönheit',
    metric: (s) => Math.round(s.records.bestBeauty * 100),
    target: 25,
    reward: { tickets: 12 },
    rewardDesc: '+12 Rubbellose',
  },
  {
    id: 'master-hand',
    title: 'Meisterhand',
    objective: 'Bringe eine Sorte auf Meisterschaft Lv 5',
    metric: maxMastery,
    target: 5,
    reward: { compost: 20 },
    rewardDesc: '+20 Kompost',
  },
  {
    id: 'collector',
    title: 'Saatforscher',
    objective: 'Entdecke 3 Saatlabor-Varianten',
    metric: (s) => s.discoveredVariants.length,
    target: 3,
    reward: { compost: 30, fertilizer: 3 },
    rewardDesc: '+30 Kompost, +3 Turbo-Dünger',
  },
  {
    id: 'estate',
    title: 'Großgärtner',
    objective: 'Pachte deine 8. Parzelle',
    metric: (s) => s.parcels,
    target: 8,
    reward: { compost: 60, tickets: 15 },
    rewardDesc: '+60 Kompost, +15 Rubbellose',
  },
]
