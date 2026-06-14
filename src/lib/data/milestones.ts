// Parcel milestones (PHASE 13): small permanent bonuses unlocked by leasing
// more parcels. They survive prestige (parcels do), so each new parcel is a
// visible, lasting goal — not just a reset. Bonuses are deliberately small.

export type MilestoneEffect = 'yield' | 'growth' | 'questSlot' | 'ticketLuck' | 'offline' | 'questReward'

export interface ParcelMilestone {
  /** reached once state.parcels ≥ this */
  parcel: number
  label: string
  desc: string
  effect: MilestoneEffect
  /** unit depends on the effect (fraction, slots, hours, …) */
  value: number
}

export const PARCEL_MILESTONES: ParcelMilestone[] = [
  { parcel: 2, label: 'Fruchtbares Land', desc: '+5 % Ertrag dauerhaft', effect: 'yield', value: 0.05 },
  { parcel: 3, label: 'Tiefe Wurzeln', desc: '+5 % Wachstumstempo dauerhaft', effect: 'growth', value: 0.05 },
  { parcel: 5, label: 'Marktkontakte', desc: '+1 Auftragsslot', effect: 'questSlot', value: 1 },
  { parcel: 8, label: 'Glücksboden', desc: '+5 % Los-Chance bei der Ernte', effect: 'ticketLuck', value: 0.05 },
  { parcel: 10, label: 'Auftragshof', desc: '+25 % Auftragsbelohnung', effect: 'questReward', value: 0.25 },
  { parcel: 15, label: 'Nachtwächter', desc: '+4 h Offline-Wachstum', effect: 'offline', value: 4 },
  { parcel: 20, label: 'Garten-Imperium', desc: '+15 % Ertrag dauerhaft', effect: 'yield', value: 0.15 },
]

/** Summed value of all reached milestones with the given effect. */
export function parcelBonus(parcels: number, effect: MilestoneEffect): number {
  let sum = 0
  for (const m of PARCEL_MILESTONES) {
    if (parcels >= m.parcel && m.effect === effect) sum += m.value
  }
  return sum
}

/** The next milestone not yet reached (for the UI goal hint), or null. */
export function nextMilestone(parcels: number): ParcelMilestone | null {
  return PARCEL_MILESTONES.find((m) => parcels < m.parcel) ?? null
}
