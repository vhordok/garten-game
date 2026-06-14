// Global multipliers derived from owned upgrades (later also prestige).
// Pure functions over GameState — tick and actions consume these, so live
// and offline simulation automatically agree.

import { CONFIG } from '../data/config'
import { COMPOST_UPGRADES, type CompostEffect } from '../data/compostUpgrades'
import { parcelBonus } from '../data/milestones'
import { plantById } from '../data/plants'
import { categorySpecById, type SpecKind } from '../data/specializations'
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
/** Total compost ever earned (spendable pool + what was spent on upgrades).
 * Spending compost on the compost garden must NOT weaken the flat bonus or the
 * next prestige gain, so both use this rather than the live pool (PHASE 13). */
export function compostClaimed(state: GameState): number {
  return Math.max(state.compost, 0) + Math.max(state.compostSpent, 0)
}

export function effectiveCompost(state: GameState): number {
  return Math.pow(compostClaimed(state), CONFIG.compostSoftcapExp)
}

/** Summed bonus from compost-garden upgrades for the given effect (PHASE 13). */
export function compostUpgradeBonus(state: GameState, effect: CompostEffect): number {
  let bonus = 0
  for (const def of COMPOST_UPGRADES) {
    if (def.effect !== effect) continue
    const level = state.compostUpgrades[def.id] ?? 0
    if (level > 0) bonus += def.perLevel * level
  }
  return bonus
}

/** Growth speed factor applied to tick deltas (upgrades × compost). */
export function growthMultiplier(state: GameState): number {
  // Wasserfass adds a small passive growth bonus so it helps idle play too (PHASE 12)
  const wasserfass = 1 + CONFIG.wasserfassGrowthPerLevel * (state.upgrades['wasserfass'] ?? 0)
  // PHASE 13: parcel milestones + compost-garden upgrades add small growth boni
  const perma = 1 + parcelBonus(state.parcels, 'growth') + compostUpgradeBonus(state, 'growth')
  return (
    multiplierFor(state, 'growth') *
    (1 + CONFIG.compostGrowthPerPoint * effectiveCompost(state)) *
    wasserfass *
    perma
  )
}

/** Harvested-units factor: upgrades × compost × permanent level bonus. */
export function yieldMultiplier(state: GameState): number {
  const levelBonus = Math.min(
    CONFIG.levelYieldPerLevel * Math.max(state.level - 1, 0),
    CONFIG.levelYieldMaxBonus
  )
  // PHASE 13: parcel milestones + compost-garden upgrades add small yield boni
  const perma = 1 + parcelBonus(state.parcels, 'yield') + compostUpgradeBonus(state, 'yield')
  return (
    multiplierFor(state, 'yield') *
    (1 + CONFIG.compostYieldPerPoint * effectiveCompost(state)) *
    (1 + levelBonus) *
    (1 + 0.01 * state.achievements.length) *
    perma
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

/** Compost cost of the next specialisation level (0 below the threshold). */
export function specializationCompostCost(level: number): number {
  if (level < CONFIG.specCompostFromLevel) return 0
  return CONFIG.specCompostBase + CONFIG.specCompostPerLevel * (level - CONFIG.specCompostFromLevel)
}

/** Progression gate for buying the next specialisation level (PHASE 14). */
export function specializationRequirement(level: number): { parcels: number; gardener: number } {
  return {
    parcels: 1 + Math.floor(level / CONFIG.specParcelsEvery),
    gardener: 1 + level * CONFIG.specLevelPer,
  }
}

/** Why the next specialisation level can/can't be bought — drives the shop UI. */
export interface SpecPurchase {
  level: number
  maxed: boolean
  gold: number
  compost: number
  req: { parcels: number; gardener: number }
  affordableGold: boolean
  affordableCompost: boolean
  parcelsMet: boolean
  gardenerMet: boolean
  canBuy: boolean
}

export function specializationPurchase(state: GameState, category: string): SpecPurchase {
  const level = specializationLevel(state, category)
  const gold = specializationCost(level)
  const compost = specializationCompostCost(level)
  const req = specializationRequirement(level)
  const maxed = gold === null
  const affordableGold = gold !== null && state.money >= gold
  const affordableCompost = state.compost >= compost
  const parcelsMet = state.parcels >= req.parcels
  const gardenerMet = state.level >= req.gardener
  return {
    level,
    maxed,
    gold: gold ?? 0,
    compost,
    req,
    affordableGold,
    affordableCompost,
    parcelsMet,
    gardenerMet,
    canBuy: !maxed && affordableGold && affordableCompost && parcelsMet && gardenerMet,
  }
}

/**
 * Per-category UNIQUE specialisation perk (PHASE 14): returns perLevel × level
 * when the category's perk matches `kind`, else 0. Each kind is consumed at one
 * hook in the core (growth tick, regrow, crit roll, scratch luck, wood income,
 * beauty, mastery XP), so the perks stay small, additive and offline-safe.
 */
export function specUniqueBonus(state: GameState, category: string, kind: SpecKind): number {
  const def = categorySpecById(category)
  if (!def || def.unique.kind !== kind) return 0
  return def.unique.perLevel * specializationLevel(state, category)
}

/** Garden beauty: mature ornamental plots raise the global sell price. */
export function beautyMultiplier(state: GameState): number {
  let bonus = 0
  for (const plot of state.plots) {
    if (!plot.plantId) continue
    const def = plantById(plot.plantId)
    if (def?.beautyBonus && plot.progress >= def.growTime) {
      // PHASE 14: the Zier specialisation makes ornamentals worth more beauty
      bonus += def.beautyBonus * (1 + specUniqueBonus(state, def.category, 'beauty'))
    }
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
export function scratchDropChance(state: GameState, cycleSeconds: number, category?: string): number {
  const perMinute =
    CONFIG.scratchDropPerMinute +
    effectBonus(state, 'scratchLuck') +
    parcelBonus(state.parcels, 'ticketLuck') +
    (category ? specUniqueBonus(state, category, 'ticket') : 0)
  return Math.min(perMinute * (cycleSeconds / 60), CONFIG.scratchDropCap)
}

/** Ticket pocket size: at least 5, then one per gardener level. */
export function maxScratchTickets(state: GameState): number {
  return Math.max(CONFIG.scratchMaxPending, state.level)
}

/** Offline simulation cap in hours. */
export function offlineCapHours(state: GameState): number {
  // Sternenuhr stretches the offline cap a little so it earns its keep idle (PHASE 12)
  return (
    CONFIG.offlineCapHours +
    effectBonus(state, 'offlineCap') +
    (state.upgrades['sternenuhr'] ?? 0) * CONFIG.sternenuhrOfflinePerLevel +
    parcelBonus(state.parcels, 'offline') +
    compostUpgradeBonus(state, 'offline')
  )
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
