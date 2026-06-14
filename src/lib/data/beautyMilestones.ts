// Beauty milestones (PHASE 17): give the Zier category a real identity. Mature
// ornamentals add "Schönheit" (beauty); crossing a threshold lights up a
// garden-wide AURA perk that stays active *while the beauty is maintained*. So
// ornamentals stop being a vague +sell% per beet and become a deliberate build:
// sacrifice beets for ornamentals → power up the WHOLE garden on a new axis.
//
// Aura perks are non-gold (yield/growth/luck/quest/crit) → they scale with the
// garden's own output and can't run away. Data only; math lives in modifiers.ts.

export type BeautyEffect = 'questReward' | 'ticketLuck' | 'growth' | 'crit' | 'yield'

export interface BeautyMilestone {
  /** active once gardenBeauty ≥ this */
  beauty: number
  label: string
  desc: string
  effect: BeautyEffect
  /** unit depends on the effect (fraction / chance) */
  value: number
}

export const BEAUTY_MILESTONES: BeautyMilestone[] = [
  { beauty: 0.15, label: 'Blühende Beete', desc: '+8 % Auftragsbelohnung', effect: 'questReward', value: 0.08 },
  { beauty: 0.4, label: 'Summender Garten', desc: '+0,05 Los-Chance bei der Ernte', effect: 'ticketLuck', value: 0.05 },
  { beauty: 0.8, label: 'Lebendige Pracht', desc: '+8 % Wachstumstempo', effect: 'growth', value: 0.08 },
  { beauty: 1.5, label: 'Prachtgarten', desc: '+3 % Gold-Ernte-Chance', effect: 'crit', value: 0.03 },
  { beauty: 3.0, label: 'Garten Eden', desc: '+12 % Ertrag im ganzen Garten', effect: 'yield', value: 0.12 },
]

/** Summed value of all ACTIVE beauty milestones for the given effect. */
export function beautyMilestoneBonus(beauty: number, effect: BeautyEffect): number {
  let sum = 0
  for (const m of BEAUTY_MILESTONES) {
    if (beauty >= m.beauty && m.effect === effect) sum += m.value
  }
  return sum
}

/** The next beauty milestone not yet reached (UI goal hint), or null. */
export function nextBeautyMilestone(beauty: number): BeautyMilestone | null {
  return BEAUTY_MILESTONES.find((m) => beauty < m.beauty) ?? null
}
