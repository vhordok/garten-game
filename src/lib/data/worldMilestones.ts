// World milestones (PHASE 61): permanent perks unlocked by sowing more worlds
// (Weltensaat). They mirror the parcel-milestone pattern but key on worldResets,
// which survives every reset — so each Weltensaat is a visible, lasting unlock,
// not just a bigger number. Bonuses are derived purely from worldResets (no save
// field). They give the higher-prestige re-climb real teeth: faster starts, more
// Sternensaat per world, and escalating yield.

export type WorldMilestoneEffect = 'yield' | 'growth' | 'startParcels' | 'starseedGain' | 'offline' | 'compostGain'

export interface WorldMilestone {
  /** reached once state.worldResets ≥ this */
  world: number
  label: string
  desc: string
  effect: WorldMilestoneEffect
  /** unit depends on the effect (fraction, parcels, Sternensaat, hours, …) */
  value: number
}

export const WORLD_MILESTONES: WorldMilestone[] = [
  { world: 1, label: 'Erste Welt', desc: '+25 % Ertrag dauerhaft', effect: 'yield', value: 0.25 },
  { world: 2, label: 'Sternenpfad', desc: '+2 Start-Parzellen nach jeder Weltensaat', effect: 'startParcels', value: 2 },
  { world: 3, label: 'Weltenwachstum', desc: '+50 % Wachstumstempo dauerhaft', effect: 'growth', value: 0.5 },
  { world: 4, label: 'Tiefer Humus', desc: '+50 % Kompost-Gewinn', effect: 'compostGain', value: 0.5 },
  { world: 5, label: 'Kosmische Ernte', desc: '+1 Sternensaat je Weltensaat', effect: 'starseedGain', value: 1 },
  { world: 8, label: 'Tiefenschlaf', desc: '+6 h Offline-Wachstum', effect: 'offline', value: 6 },
  { world: 12, label: 'Sternenflut', desc: '+150 % Ertrag dauerhaft', effect: 'yield', value: 1.5 },
  { world: 20, label: 'Weltenmeister', desc: '+2 Sternensaat je Weltensaat', effect: 'starseedGain', value: 2 },
]

/** Summed value of all reached world milestones with the given effect. */
export function worldMilestoneBonus(worldResets: number, effect: WorldMilestoneEffect): number {
  let sum = 0
  for (const m of WORLD_MILESTONES) {
    if (worldResets >= m.world && m.effect === effect) sum += m.value
  }
  return sum
}

/** The next world milestone not yet reached (for the UI hint), or null. */
export function nextWorldMilestone(worldResets: number): WorldMilestone | null {
  return WORLD_MILESTONES.find((m) => worldResets < m.world) ?? null
}
