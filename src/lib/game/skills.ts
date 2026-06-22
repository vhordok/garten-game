// Skill-tree logic (PHASE 17): pure functions over GameState. Skill points are
// EARNED from long-term progress, not bought with gold, so the tree is a meta
// layer rather than a second shop. `skills` (levels) is the only persisted field.

import { SKILLS, skillById, type SkillEffect } from '../data/skills'
import { CONFIG } from '../data/config'
import { achievementSkillPoints } from './achievements'
import type { GameState } from './types'

/** Owned level of a skill (0 = not taken). */
export function skillLevel(state: GameState, id: string): number {
  return state.skills[id] ?? 0
}

/**
 * Total skill points ever earned: one per leased parcel beyond the first, one
 * per achievement, and one for every `skillPointPerLevels` gardener levels.
 * Tied to progress that survives prestige → a true meta currency.
 */
export function totalSkillPoints(state: GameState): number {
  // PHASE 67: use the parcel HIGH-WATER mark, not the current count — Weltensaat
  // resets `parcels`, but prestige progress (and the skill points it earned) is
  // permanent, so a world reset must not zero out the pool and force a re-climb.
  const parcelDepth = Math.max(state.maxParcels ?? state.parcels, state.parcels)
  return (
    Math.max(parcelDepth - 1, 0) +
    achievementSkillPoints(state) +
    Math.floor(Math.max(state.level - 1, 0) / CONFIG.skillPointPerLevels)
  )
}

/** Points already spent across all skills. */
export function spentSkillPoints(state: GameState): number {
  let spent = 0
  for (const def of SKILLS) spent += def.cost * skillLevel(state, def.id)
  return spent
}

/** Unspent skill points available to spend right now. */
export function availableSkillPoints(state: GameState): number {
  return Math.max(totalSkillPoints(state) - spentSkillPoints(state), 0)
}

/** Summed perLevel × level over all owned skills with the given effect. */
export function skillBonus(state: GameState, effect: SkillEffect): number {
  let bonus = 0
  for (const def of SKILLS) {
    if (def.effect !== effect) continue
    const level = skillLevel(state, def.id)
    if (level > 0) bonus += def.perLevel * level
  }
  return bonus
}

export interface SkillStatus {
  level: number
  maxed: boolean
  prereqMet: boolean
  affordable: boolean
  canBuy: boolean
  cost: number
}

/** Buyability of a skill's next level — drives the panel. */
export function skillStatus(state: GameState, id: string): SkillStatus | null {
  const def = skillById(id)
  if (!def) return null
  const level = skillLevel(state, id)
  const maxed = level >= def.maxLevel
  const prereqMet = def.prereq === null || skillLevel(state, def.prereq) > 0
  const affordable = availableSkillPoints(state) >= def.cost
  return {
    level,
    maxed,
    prereqMet,
    affordable,
    canBuy: !maxed && prereqMet && affordable,
    cost: def.cost,
  }
}
