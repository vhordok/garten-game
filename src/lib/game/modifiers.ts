// Global multipliers derived from owned upgrades (later also prestige).
// Pure functions over GameState — tick and actions consume these, so live
// and offline simulation automatically agree.

import { CONFIG } from '../data/config'
import { plantById } from '../data/plants'
import { UPGRADES } from '../data/upgrades'
import type { GameState, UpgradeEffect } from './types'

// NOTE: multiplierFor below only consumes the multiplicative effects
// (growth/yield/sellPrice); every other effect is read via effectBonus.

function multiplierFor(state: GameState, effect: UpgradeEffect): number {
  let mult = 1
  for (const def of UPGRADES) {
    if (def.effect !== effect) continue
    const level = state.upgrades[def.id] ?? 0
    if (level > 0) mult *= 1 + def.perLevel * level
  }
  return mult
}

/** Soft-capped compost points actually applied to the bonuses. */
export function effectiveCompost(state: GameState): number {
  return Math.pow(Math.max(state.compost, 0), CONFIG.compostSoftcapExp)
}

/** Growth speed factor applied to tick deltas (upgrades × compost). */
export function growthMultiplier(state: GameState): number {
  return multiplierFor(state, 'growth') * (1 + CONFIG.compostGrowthPerPoint * effectiveCompost(state))
}

/** Harvested-units factor: upgrades × compost × permanent level bonus. */
export function yieldMultiplier(state: GameState): number {
  const levelBonus = Math.min(
    CONFIG.levelYieldPerLevel * Math.max(state.level - 1, 0),
    CONFIG.levelYieldMaxBonus
  )
  return (
    multiplierFor(state, 'yield') *
    (1 + CONFIG.compostYieldPerPoint * effectiveCompost(state)) *
    (1 + levelBonus) *
    (1 + 0.01 * state.achievements.length)
  )
}

/** Mastery level for a plant from its lifetime harvested units (PHASE 11). */
export function masteryLevel(harvested: number): number {
  if (harvested <= 0) return 0
  return Math.min(CONFIG.masteryMaxLevel, Math.floor(Math.log2(harvested / CONFIG.masteryBase + 1)))
}

/** Units harvested needed to reach the given mastery level (UI progress). */
export function masteryThreshold(level: number): number {
  return Math.round(CONFIG.masteryBase * (2 ** level - 1))
}

/** Per-plant yield factor from mastery — rewards sticking with a plant. */
export function masteryYieldBonus(state: GameState, plantId: string): number {
  return 1 + CONFIG.masteryYieldPerLevel * masteryLevel(state.mastery[plantId] ?? 0)
}

/** Owned specialisation level for a category (0 = none). */
export function specializationLevel(state: GameState, category: string): number {
  return state.specializations[category] ?? 0
}

/** Per-category yield factor from gold-bought specialisation (PHASE 11 sink). */
export function specializationYieldBonus(state: GameState, category: string): number {
  return 1 + CONFIG.specYieldPerLevel * specializationLevel(state, category)
}

/** Gold cost of the next specialisation level, or null when maxed. */
export function specializationCost(level: number): number | null {
  if (level >= CONFIG.specMaxLevel) return null
  return Math.floor(CONFIG.specBaseCost * Math.pow(CONFIG.specCostFactor, level))
}

/** Garden beauty: mature ornamental plots raise the global sell price. */
export function beautyMultiplier(state: GameState): number {
  let bonus = 0
  for (const plot of state.plots) {
    if (!plot.plantId) continue
    const def = plantById(plot.plantId)
    if (def?.beautyBonus && plot.progress >= def.growTime) bonus += def.beautyBonus
  }
  return 1 + bonus
}

/**
 * Market wave: prices breathe ±~30 % over ~10 minutes (two overlaid sines,
 * so highs/lows stay a little unpredictable). Hoard and sell high!
 */
export function marketFactor(state: GameState): number {
  const phase = (state.marketTime / CONFIG.marketPeriodSeconds) * Math.PI * 2
  // both sines start at 0 → fresh games begin neutral, no long-run bias
  return 1 + 0.24 * Math.sin(phase) + 0.08 * Math.sin(phase * 2.33)
}

/** Sale price factor (upgrades × garden beauty × market wave × weather). */
export function sellMultiplier(state: GameState): number {
  const boom = state.weather.id === 'marktboom' ? 1.5 : 1
  return multiplierFor(state, 'sellPrice') * beautyMultiplier(state) * marketFactor(state) * boom
}

/** Summed perLevel × level over all owned upgrades with the given effect. */
export function effectBonus(state: GameState, effect: UpgradeEffect): number {
  let bonus = 0
  for (const def of UPGRADES) {
    if (def.effect !== effect) continue
    const level = state.upgrades[def.id] ?? 0
    if (level > 0) bonus += def.perLevel * level
  }
  return bonus
}

/** Watering charges granted per sown crop / regrow cycle. */
export function waterCharges(state: GameState): number {
  return CONFIG.waterChargesPerCrop + Math.round(effectBonus(state, 'waterCharges'))
}

/** Seconds before the harvest chain breaks. */
export function comboWindowSeconds(state: GameState): number {
  return CONFIG.comboWindowSeconds + effectBonus(state, 'comboWindow')
}

/** Additive bonus on the perfect-crit chance (legendary gets a fifth of it). */
export function critChanceBonus(state: GameState): number {
  return effectBonus(state, 'critChance')
}

/** Shooting-star nights triple every crit chance. */
export function critWeatherMult(state: GameState): number {
  return state.weather.id === 'sternschnuppen' ? 3 : 1
}

/**
 * Chance to find a scratch ticket when harvesting a crop with the given
 * cycle time — proportional to time invested, so quick herbs barely drop
 * and slow trees feel lucky.
 */
export function scratchDropChance(state: GameState, cycleSeconds: number): number {
  const perMinute = CONFIG.scratchDropPerMinute + effectBonus(state, 'scratchLuck')
  return Math.min(perMinute * (cycleSeconds / 60), CONFIG.scratchDropCap)
}

/** Ticket pocket size: at least 5, then one per gardener level. */
export function maxScratchTickets(state: GameState): number {
  return Math.max(CONFIG.scratchMaxPending, state.level)
}

/** Offline simulation cap in hours. */
export function offlineCapHours(state: GameState): number {
  return CONFIG.offlineCapHours + effectBonus(state, 'offlineCap')
}

/** Auto-harvested plots per second (0 = no helper). */
export function autoHarvestRate(state: GameState): number {
  return effectBonus(state, 'autoHarvest')
}

/** Auto-sown plots per second (0 = no helper). */
export function autoSowRate(state: GameState): number {
  return effectBonus(state, 'autoSow')
}

/** Seconds between automatic full sales (Infinity = no helper). */
export function autoSellInterval(state: GameState): number {
  const level = Math.round(effectBonus(state, 'autoSell'))
  return level > 0 ? 60 / level : Infinity
}

/**
 * Plant the Sä-Gnom sows: its own pinned choice, or — when unset — whatever
 * the player has currently selected by hand (PHASE 3). Shared by tick and UI
 * so live, offline and the picker label always agree.
 */
export function autoSowChoice(state: GameState): string {
  return state.autoSowPlantId ?? state.selectedPlantId
}

/** Single source for sale math — manual sales and the market cart agree. */
export function saleValue(state: GameState, sellValue: number, count: number): number {
  return Math.round(count * sellValue * sellMultiplier(state))
}

/** Active combo bonus stacks (chain length − 1, capped). */
export function comboStacks(state: GameState): number {
  return Math.min(Math.max(state.combo.count - 1, 0), CONFIG.comboMaxStacks)
}

/** Yield factor from the current harvest chain. */
export function comboMultiplier(state: GameState): number {
  return 1 + CONFIG.comboPerStack * comboStacks(state)
}

/**
 * Resolve a fractional amount to whole units: the fraction is a random
 * chance for one extra unit, so expectation matches exactly while
 * inventories stay integers.
 */
export function rollUnits(amount: number): number {
  const base = Math.floor(amount)
  return Math.random() < amount - base ? base + 1 : base
}
