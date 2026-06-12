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
    (1 + levelBonus)
  )
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

/** Sale price factor (upgrades × garden beauty). */
export function sellMultiplier(state: GameState): number {
  return multiplierFor(state, 'sellPrice') * beautyMultiplier(state)
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

/** Chance per harvested plot to find a scratch ticket. */
export function scratchDropChance(state: GameState): number {
  return CONFIG.scratchDropChance + effectBonus(state, 'scratchLuck')
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
