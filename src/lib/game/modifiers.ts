// Global multipliers derived from owned upgrades (later also prestige).
// Pure functions over GameState — tick and actions consume these, so live
// and offline simulation automatically agree.

import { CONFIG } from '../data/config'
import { COMPOST_UPGRADES, type CompostEffect } from '../data/compostUpgrades'
import { beautyMilestoneBonus } from '../data/beautyMilestones'
import { achievementBonus } from './achievements'
import { decorationBeauty } from './decorations'
import { worldseedYieldFactor, starUpgradeBonus } from './worldseed'
import { variantBonus, variantEventBonus } from './seedlab'
import { relicBonus } from './expeditions'
import { creatureBonus } from './creatures'
import { parcelBonus } from '../data/milestones'
import { worldMilestoneBonus } from '../data/worldMilestones'
import { plantById } from '../data/plants'
import { categorySpecById, type SpecKind } from '../data/specializations'
import { UPGRADES } from '../data/upgrades'
import { skillBonus } from './skills'
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
  // PHASE 13: parcel milestones + compost-garden upgrades add small growth boni;
  // PHASE 19: achievement-tier growth rewards
  const perma =
    1 +
    parcelBonus(state.parcels, 'growth') +
    worldMilestoneBonus(state.worldResets ?? 0, 'growth') +
    compostUpgradeBonus(state, 'growth') +
    achievementBonus(state, 'growth') +
    variantBonus(state, 'growth') +
    relicBonus(state, 'growth') +
    creatureBonus(state, 'growth')
  // PHASE 17: a beautiful garden (beauty milestone) speeds the whole garden up
  const aura = 1 + beautyMilestoneBonus(gardenBeauty(state), 'growth')
  return (
    multiplierFor(state, 'growth') *
    (1 + CONFIG.compostGrowthPerPoint * effectiveCompost(state)) *
    (1 + starUpgradeBonus(state, 'growth')) * // PHASE 53: Sternenkammer growth
    wasserfass *
    perma *
    aura
  )
}

/**
 * PHASE 34: the level yield bonus used to HARD-cap at levelYieldMaxBonus, so
 * past ~level 300 every level was worthless. Now it SOFT-caps: beyond the cap a
 * square-root term keeps adding (slowly, diminishing) so very high levels (the
 * 40k+ endgame) stay meaningful, while early/mid pacing is unchanged.
 */
export function levelYieldBonus(level: number): number {
  const raw = CONFIG.levelYieldPerLevel * Math.max(level - 1, 0)
  const cap = CONFIG.levelYieldMaxBonus
  return raw <= cap ? raw : cap + Math.sqrt(raw - cap)
}

/**
 * PHASE 34 „Hain"-Aura: mature timber trees multiply the whole garden's yield.
 * Gives Holz a real endgame role (sacrifice plots for a global multiplier);
 * amplified by the Holz specialisation.
 */
export function forestBonus(state: GameState): number {
  let bonus = 0
  for (const plot of state.plots) {
    if (!plot.plantId) continue
    const def = plantById(plot.plantId)
    if (def?.forestYield && plot.progress >= def.growTime) {
      bonus += def.forestYield * (1 + specUniqueBonus(state, def.category, 'wood'))
    }
  }
  return bonus
}

/** Harvested-units factor: upgrades × compost × permanent level bonus. */
export function yieldMultiplier(state: GameState): number {
  const levelBonus = levelYieldBonus(state.level)
  // PHASE 13: parcel milestones + compost-garden upgrades add small yield boni
  const perma =
    1 +
    parcelBonus(state.parcels, 'yield') +
    worldMilestoneBonus(state.worldResets ?? 0, 'yield') +
    compostUpgradeBonus(state, 'yield') +
    relicBonus(state, 'yield') +
    creatureBonus(state, 'yield')
  // PHASE 17: beauty-milestone aura + skill-tree (Gartenplanung) yield;
  // PHASE 20: seed-lab variant yield bonus
  const meta =
    1 + beautyMilestoneBonus(gardenBeauty(state), 'yield') + skillBonus(state, 'yield') + variantBonus(state, 'yield')
  // PHASE 18: Erntefest event lifts every harvest while it lasts
  // PHASE 21: the Weltenhybride variant amplifies Erntefest
  const event = state.weather.id === 'erntefest' ? 1.5 + variantEventBonus(state, 'erntefest') : 1
  return (
    multiplierFor(state, 'yield') *
    (1 + CONFIG.compostYieldPerPoint * effectiveCompost(state)) *
    (1 + levelBonus) *
    (1 + achievementBonus(state, 'yield')) *
    (1 + forestBonus(state)) * // PHASE 34: timber „Hain"-Aura (separate multiplicative factor)
    worldseedYieldFactor(state) * // PHASE 51: permanent Weltensaat (Sternensaat) aura
    (1 + starUpgradeBonus(state, 'yield')) * // PHASE 53: Sternenkammer yield
    perma *
    meta *
    event
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

/**
 * Summed yield bonus for a category at the given level (PHASE 15). Each level i
 * adds specYieldPerLevel × (1 + specTierStep × ⌊(i−1)/5⌋), so the per-level value
 * escalates every 5-level tier instead of staying flat — high levels finally
 * keep pace with the steep cost (diagnosis fix). Level 25 ≈ +225 % for one
 * category. Monotonic, no breakpoints, ×1 at level 0.
 */
export function specYieldSum(level: number): number {
  let sum = 0
  for (let i = 1; i <= level; i++) {
    sum += CONFIG.specYieldPerLevel * (1 + CONFIG.specTierStep * Math.floor((i - 1) / CONFIG.specMilestoneEvery))
  }
  return sum
}

/** Per-category yield factor from gold-bought specialisation (escalating). */
export function specializationYieldBonus(state: GameState, category: string): number {
  return 1 + specYieldSum(specializationLevel(state, category))
}

/**
 * Milestone multiplier on a category's UNIQUE perk (PHASE 15): every
 * specMilestoneEvery levels reached adds specPerkMilestoneStep, so the perk is
 * ×1 at level 0 and ×3.5 at level 25. Makes pushing toward the next milestone a
 * real decision spike rather than another flat +%.
 */
export function specPerkMultiplier(level: number): number {
  return 1 + CONFIG.specPerkMilestoneStep * Math.floor(level / CONFIG.specMilestoneEvery)
}

/** The next milestone level above `level` (UI goal hint), or null when maxed. */
export function nextSpecMilestone(level: number): number | null {
  const next = (Math.floor(level / CONFIG.specMilestoneEvery) + 1) * CONFIG.specMilestoneEvery
  return next > CONFIG.specMaxLevel ? null : next
}

/** Gold cost of the next specialisation level, or null when maxed. */
export function specializationCost(level: number): number | null {
  if (level >= CONFIG.specMaxLevel) return null
  return Math.floor(CONFIG.specBaseCost * Math.pow(CONFIG.specCostFactor, level))
}

/** Compost cost of the next specialisation level (0 below the threshold) —
 * geometric, so the top levels are a meaningful compost sink (PHASE 15). */
export function specializationCompostCost(level: number): number {
  if (level < CONFIG.specCompostFromLevel) return 0
  return Math.round(CONFIG.specCompostBase * Math.pow(CONFIG.specCompostFactor, level - CONFIG.specCompostFromLevel))
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
  const level = specializationLevel(state, category)
  // PHASE 15: milestones amplify the unique perk on top of the linear growth
  return def.unique.perLevel * level * specPerkMultiplier(level)
}

/**
 * Garden beauty (PHASE 17): summed beauty of mature ornamentals, lifted by the
 * Zier specialisation AND the Schaugarten skill. This is the Zier build's core
 * stat — it drives both the sell-price aura and the beauty milestones.
 */
export function gardenBeauty(state: GameState): number {
  let bonus = 0
  // PHASE 44: beauty comes from the Ziergalerie collection (owned copies), not
  // from plants on the field — no plot space, no grow time, survives prestige.
  for (const [id, count] of Object.entries(state.ornamentals)) {
    if (count <= 0) continue
    const def = plantById(id)
    if (def?.beautyBonus) {
      // PHASE 14: the Zier specialisation makes ornamentals worth more beauty
      bonus += def.beautyBonus * count * (1 + specUniqueBonus(state, def.category, 'beauty'))
    }
  }
  // PHASE 49: placed Garten-Deko adds beauty too (visible on the field)
  bonus += decorationBeauty(state)
  // PHASE 17: the Schaugarten skill amplifies the whole beauty stat
  // PHASE 18: the Gartenschau event boosts beauty's pull while it lasts
  // PHASE 20: a discovered Zier variant (Prachtorchidee) adds to beauty
  const event = state.weather.id === 'gartenschau' ? 1.5 + variantEventBonus(state, 'gartenschau') : 1
  const raw = bonus * (1 + skillBonus(state, 'beauty') + variantBonus(state, 'beauty')) * event
  // PHASE 18 softcap: linear up to the cap, compressed above → a Zier build
  // stays strong but stops being the automatic best strategy (diminishing
  // returns, never a hard wall, the build keeps its value)
  if (raw <= CONFIG.beautySoftcap) return raw
  return CONFIG.beautySoftcap + Math.pow(raw - CONFIG.beautySoftcap, CONFIG.beautySoftcapExp)
}

/** Garden beauty raises the global sell price (Zier's baseline aura). */
export function beautyMultiplier(state: GameState): number {
  return 1 + gardenBeauty(state)
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
  // PHASE 62: Sternenmarkt (Sternenkammer) lifts the sell price permanently
  return (
    multiplierFor(state, 'sellPrice') *
    (1 + starUpgradeBonus(state, 'sellPrice') + relicBonus(state, 'sellPrice') + creatureBonus(state, 'sellPrice')) *
    beautyMultiplier(state) *
    marketFactor(state) *
    boom
  )
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

/** PHASE 63: whether the player has paused this helper upgrade. */
export function isHelperPaused(state: GameState, id: string): boolean {
  return state.pausedHelpers?.includes(id) ?? false
}

/** Like effectBonus, but skips paused helper upgrades — used only for the
 * automation rates so a player can switch individual helpers off. */
function activeHelperBonus(state: GameState, effect: UpgradeEffect): number {
  let bonus = 0
  for (const def of UPGRADES) {
    if (def.effect !== effect) continue
    if (isHelperPaused(state, def.id)) continue
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
  // PHASE 17: beauty-milestone aura + skill-tree (Erntefokus) raise crit odds
  return effectBonus(state, 'critChance') + beautyMilestoneBonus(gardenBeauty(state), 'crit') + skillBonus(state, 'crit')
}

/** Shooting-star nights triple every crit chance (Sternenblume boosts it). */
export function critWeatherMult(state: GameState): number {
  return state.weather.id === 'sternschnuppen' ? 3 + variantEventBonus(state, 'sternschnuppen') : 1
}

/** Meistertag doubles mastery XP gained from harvests (Meisterhanf boosts it). */
export function eventMasteryMult(state: GameState): number {
  return state.weather.id === 'meistertag' ? 2 + variantEventBonus(state, 'meistertag') : 1
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
    starUpgradeBonus(state, 'ticketLuck') +
    relicBonus(state, 'ticketLuck') +
    creatureBonus(state, 'ticketLuck') +
    beautyMilestoneBonus(gardenBeauty(state), 'ticketLuck') +
    skillBonus(state, 'scratchLuck') +
    achievementBonus(state, 'ticketLuck') +
    variantBonus(state, 'ticketLuck') +
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
    worldMilestoneBonus(state.worldResets ?? 0, 'offline') +
    starUpgradeBonus(state, 'offline') +
    compostUpgradeBonus(state, 'offline')
  )
}

/** Auto-harvested plots per second (0 = no helper; paused helpers excluded). */
export function autoHarvestRate(state: GameState): number {
  return activeHelperBonus(state, 'autoHarvest')
}

/** Auto-sown plots per second (0 = no helper; paused helpers excluded). */
export function autoSowRate(state: GameState): number {
  return activeHelperBonus(state, 'autoSow')
}

/** Seconds between automatic full sales (Infinity = no helper / all paused). */
export function autoSellInterval(state: GameState): number {
  const level = Math.round(activeHelperBonus(state, 'autoSell'))
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
