import { ACHIEVEMENTS } from '../data/achievements'
import { CONFIG } from '../data/config'
import { plantById } from '../data/plants'
import {
  autoHarvestRate,
  autoSellInterval,
  autoSowChoice,
  autoSowRate,
  compostUpgradeBonus,
  growthMultiplier,
  masteryYieldBonus,
  maxScratchTickets,
  rollUnits,
  saleValue,
  scratchDropChance,
  sellMultiplier,
  specializationYieldBonus,
  specUniqueBonus,
  waterCharges,
  yieldMultiplier,
} from './modifiers'
import { questReserved } from './quests'
import type { GameState, PlantDef, PlotState } from './types'
import { grantXp } from './xp'

/** Duration of the plot's current cycle (regrow cycles are shorter). */
export function cycleTime(plot: PlotState, def: PlantDef): number {
  return plot.regrowing && def.regrowTime ? def.regrowTime : def.growTime
}

/**
 * Advance the simulation by dtSeconds. Single source of truth for time-based
 * progress — the live loop AND offline catch-up both run through here
 * (see CLAUDE.md rule 2). Returns true if anything changed.
 *
 * `opts.offline` marks the chunked catch-up: it keeps automation sober (no
 * scratch-ticket drops) so a long absence can't flood the ticket pocket.
 */
export function tick(state: GameState, dtSeconds: number, opts: { offline?: boolean } = {}): boolean {
  if (dtSeconds <= 0) return false
  const grownSeconds = dtSeconds * growthMultiplier(state)
  let changed = false
  for (const plot of state.plots) {
    if (!plot.plantId) continue
    const def = plantById(plot.plantId)
    if (!def) continue
    const target = cycleTime(plot, def)
    if (plot.progress < target) {
      // cannabis care: under-watered plants crawl at half speed. Wasserfass
      // (extra water storage) counts toward the requirement too, so it has
      // idle value for cannabis growers (PHASE 12).
      const watering = (state.upgrades['giesskanne'] ?? 0) + (state.upgrades['wasserfass'] ?? 0)
      const care = def.needsWateringLevel && watering < def.needsWateringLevel ? 0.5 : 1
      // PHASE 14: category specialisation can speed up growth (kraeuter) and
      // the shorter regrow cycle (beeren/obst) — applied per plot, offline-safe.
      const specSpeed =
        1 +
        specUniqueBonus(state, def.category, 'growth') +
        (plot.regrowing ? specUniqueBonus(state, def.category, 'regrow') : 0)
      plot.progress = Math.min(plot.progress + grownSeconds * care * specSpeed, target)
      changed = true
    }
  }
  // drain the harvest chain in real time (no growth multiplier here)
  if (state.combo.remaining > 0) {
    state.combo.remaining = Math.max(state.combo.remaining - dtSeconds, 0)
    if (state.combo.remaining === 0) state.combo.count = 0
    changed = true
  }
  // quest skip cooldowns drain in real time too
  for (const quest of state.quests) {
    if (quest.skipCooldown > 0) {
      quest.skipCooldown = Math.max(quest.skipCooldown - dtSeconds, 0)
      changed = true
    }
  }
  // mature timber trees trickle wood money (sell multipliers apply)
  for (const plot of state.plots) {
    if (!plot.plantId) continue
    const def = plantById(plot.plantId)
    if (!def?.passiveIncome || plot.progress < def.growTime) continue
    const gain =
      def.passiveIncome *
      dtSeconds *
      sellMultiplier(state) *
      (1 + compostUpgradeBonus(state, 'passive')) *
      (1 + specUniqueBonus(state, def.category, 'wood'))
    state.money += gain
    state.totalEarned += gain
    state.lifetimeEarned += gain
    changed = true
  }
  // weather events blow over
  if (state.weather.remaining > 0) {
    state.weather.remaining = Math.max(state.weather.remaining - dtSeconds, 0)
    if (state.weather.remaining === 0) state.weather.id = null
    changed = true
  }
  // track the best round ever reached so post-prestige quests stay on tier
  if (state.totalEarned > state.maxUnlockEarned) {
    state.maxUnlockEarned = state.totalEarned
    changed = true
  }
  // the market never sleeps
  state.marketTime = (state.marketTime + dtSeconds) % (CONFIG.marketPeriodSeconds * 1e6)
  changed = true
  if (processHelpers(state, dtSeconds, opts.offline ?? false)) changed = true
  // earnings history: one bucket per 30 minutes, ring of 48 (≈ 24 h)
  state.historyAcc.seconds += dtSeconds
  while (state.historyAcc.seconds >= 1800) {
    state.historyAcc.seconds -= 1800
    state.history.push(Math.max(state.lifetimeEarned - state.historyAcc.earnedStart, 0))
    state.historyAcc.earnedStart = state.lifetimeEarned
    if (state.history.length > 48) state.history.shift()
    changed = true
  }
  // softlock guard: broke and nothing growing → only the cheap checks run
  // every tick; the stock scan happens just in that corner. Stock locked by
  // open orders counts as unusable, so a garden whose entire inventory is
  // reserved by quests still gets rescued (PHASE 1, hardened PHASE 11).
  if (state.money < CONFIG.startMoney && state.plots.every((p) => p.plantId === null)) {
    const hasFreeStock = Object.entries(state.inventory).some(
      ([id, count]) => count - questReserved(state, id) > 0
    )
    if (!hasFreeStock) {
      state.money = CONFIG.startMoney
      changed = true
    }
  }
  // achievements are cheap predicates — check once per tick, UI announces
  for (const def of ACHIEVEMENTS) {
    if (!state.achievements.includes(def.id) && def.check(state)) {
      state.achievements.push(def.id)
      changed = true
    }
  }
  return changed
}

/**
 * Helper automation (GAME_DESIGN.md §4/§9.10) — lives in tick so the same
 * code runs live and offline. Sober compared to active play: no crits, no
 * combo, no fertilizer consumption. Live auto-harvest DOES drop scratch
 * tickets at the normal time-based rate (PHASE 3 fairness), but the chunked
 * offline pass never does — otherwise every return would top off the pocket.
 */
function processHelpers(s: GameState, dt: number, offline: boolean): boolean {
  let changed = false

  const harvestRate = autoHarvestRate(s)
  if (harvestRate > 0) {
    s.helperAcc.harvest = Math.min(s.helperAcc.harvest + dt * harvestRate, s.plots.length)
    while (s.helperAcc.harvest >= 1) {
      const index = s.plots.findIndex(plotReady)
      if (index === -1) break
      const plot = s.plots[index]
      const def = plantById(plot.plantId!)!
      const cycleSeconds = cycleTime(plot, def)
      const units = rollUnits(
        def.yield * yieldMultiplier(s) * masteryYieldBonus(s, def.id) * specializationYieldBonus(s, def.category)
      )
      s.inventory[def.id] = (s.inventory[def.id] ?? 0) + units
      s.mastery[def.id] =
        (s.mastery[def.id] ?? 0) + Math.round(units * (1 + specUniqueBonus(s, def.category, 'mastery')))
      s.stats.harvested += units
      if (def.regrowTime) {
        plot.progress = 0
        plot.regrowing = true
        plot.waterLeft = waterCharges(s)
      } else {
        plot.plantId = null
        plot.progress = 0
        plot.waterLeft = 0
        plot.regrowing = false
      }
      // same lucky-ticket chance the player gets by hand — but only live
      if (
        !offline &&
        s.scratchTickets < maxScratchTickets(s) &&
        Math.random() < scratchDropChance(s, cycleSeconds, def.category)
      ) {
        s.scratchTickets += 1
      }
      grantXp(s, units)
      s.helperAcc.harvest -= 1
      changed = true
    }
  }

  const sowRate = autoSowRate(s)
  if (sowRate > 0) {
    s.helperAcc.sow = Math.min(s.helperAcc.sow + dt * sowRate, s.plots.length)
    const def = plantById(autoSowChoice(s))
    // the gnome only auto-replants harvestable crops — ornamentals and timber
    // are "plant once" and shouldn't drain money on autopilot (PHASE 11)
    const autoSowable = def !== undefined && def.beautyBonus === undefined && def.passiveIncome === undefined
    while (autoSowable && s.helperAcc.sow >= 1) {
      if (!def || s.totalEarned < def.unlockAtTotalEarned || s.money < def.seedCost) break
      const index = s.plots.findIndex((p) => p.plantId === null)
      if (index === -1) break
      const plot = s.plots[index]
      s.money -= def.seedCost
      plot.plantId = def.id
      plot.progress = 0
      plot.waterLeft = waterCharges(s)
      plot.regrowing = false
      s.stats.planted += 1
      s.helperAcc.sow -= 1
      changed = true
    }
  }

  const sellInterval = autoSellInterval(s)
  if (Number.isFinite(sellInterval)) {
    s.helperAcc.sell += dt
    while (s.helperAcc.sell >= sellInterval) {
      s.helperAcc.sell -= sellInterval
      for (const [plantId, count] of Object.entries(s.inventory)) {
        const def = plantById(plantId)
        if (!def || count <= 0) continue
        // the cart only ships the surplus — open orders keep their stock (PHASE 2)
        const surplus = count - questReserved(s, plantId)
        if (surplus <= 0) continue
        const gain = saleValue(s, def.sellValue, surplus)
        if (surplus >= count) delete s.inventory[plantId]
        else s.inventory[plantId] = count - surplus
        s.money += gain
        s.totalEarned += gain
        s.lifetimeEarned += gain
        s.stats.sold += surplus
        changed = true
      }
    }
    // an empty storage shouldn't bank centuries of pending sales
    s.helperAcc.sell = Math.min(s.helperAcc.sell, sellInterval)
  }

  return changed
}

/** True if the plot holds a fully grown, harvestable plant. */
export function plotReady(plot: PlotState): boolean {
  if (!plot.plantId) return false
  const def = plantById(plot.plantId)
  if (!def || def.beautyBonus || def.passiveIncome) return false
  return plot.progress >= cycleTime(plot, def)
}
