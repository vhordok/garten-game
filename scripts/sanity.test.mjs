// Core sanity tests — pure game logic only (no DOM, no Svelte), executed
// with `npm test` via node --experimental-strip-types. Extend this whenever
// a mechanic lands; it must stay green before every commit.

import assert from 'node:assert/strict'

// node has no localStorage — a quiet stub keeps persistence calls silent
globalThis.localStorage ??= {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}
import { CONFIG } from '../src/lib/data/config.ts'
import { PLANTS, SPECIAL_PLANTS, plantById, produceName, steadyProfitPerSecond } from '../src/lib/data/plants.ts'
import { levelUpReward, questSlots, xpToNext } from '../src/lib/data/progression.ts'
import { UPGRADES, upgradeById } from '../src/lib/data/upgrades.ts'
import { LICENSES, licenseQuestBonus } from '../src/lib/data/licenses.ts'
import {
  buyCompostUpgrade,
  buyLicense,
  buyAllPlots,
  buyPlot,
  buySkill,
  buySkillMax,
  buySpecialization,
  buyUpgrade,
  catchFirefly,
  crossPlants,
  claimDaily,
  clearAllPlots,
  clearPlot,
  compostGain,
  restorePlots,
  dailyClaimable,
  drawScratchCard,
  ensureQuests,
  fulfillQuest,
  harvestAllReady,
  harvestPlot,
  leaseParcel,
  maxPlots,
  nextPlotCost,
  nextUpgradeCost,
  quickSellAmount,
  isPlantUnlocked,
  isUpgradeUnlocked,
  plotsWithPlant,
  refundScratchTicket,
  selectPlant,
  sellAll,
  sellableValue,
  sellPlant,
  setAutoSowPlant,
  settleScratchCard,
  skipQuest,
  scratchAll,
  sowAllEmpty,
  sowPlot,
  startWeather,
  waterAllGrowing,
  upgradeLevel,
  waterPlot,
} from '../src/lib/game/actions.ts'
import { questTier } from '../src/lib/data/questFlavor.ts'
import { SCRATCH_PRIZES, scratchPrizeAmount } from '../src/lib/data/scratch.ts'
import { bestHarvestValue } from '../src/lib/data/scratch.ts'
import { generateQuest, questReserved, questSlotCount } from '../src/lib/game/quests.ts'
import { parcelBonus } from '../src/lib/data/milestones.ts'
import { COMPOST_UPGRADES, compostUpgradeCost } from '../src/lib/data/compostUpgrades.ts'
import {
  beautyMultiplier,
  comboWindowSeconds,
  compostClaimed,
  marketFactor,
  masteryLevel,
  masteryThreshold,
  masteryYieldBonus,
  maxScratchTickets,
  scratchDropChance,
  growthMultiplier,
  offlineCapHours,
  nextSpecMilestone,
  specPerkMultiplier,
  specYieldSum,
  specializationCompostCost,
  specializationCost,
  specializationLevel,
  specializationPurchase,
  specializationRequirement,
  specializationYieldBonus,
  specUniqueBonus,
  waterCharges,
  yieldMultiplier,
  forestBonus,
  levelYieldBonus,
} from '../src/lib/game/modifiers.ts'
import { ACHIEVEMENTS } from '../src/lib/data/achievements.ts'
import { achievementBonus, achievementSkillPoints, reachedTier } from '../src/lib/game/achievements.ts'
import { VARIANTS } from '../src/lib/data/variants.ts'
import { SPRITES } from '../src/lib/ui/pixel/sprites.ts'
import { categorySpecById } from '../src/lib/data/specializations.ts'
import { crossEligibility, effectiveGoldCost, freeStock, isDiscovered, produceStatus, variantBonus, variantEventBonus } from '../src/lib/game/seedlab.ts'
import { activeGoals, goalBoard } from '../src/lib/game/goals.ts'
import { CAMPAIGN } from '../src/lib/data/campaign.ts'
import { claimCampaign, currentCampaignStep, initCampaign } from '../src/lib/game/campaign.ts'
import { DECORATIONS, nextDecorationCost, isDecorationUnlocked } from '../src/lib/data/decorations.ts'
import { buyDecoration, weltensaat } from '../src/lib/game/actions.ts'
import { decorationBeauty, decorationCount, ownsAnyDecoration, purchaseDecoration } from '../src/lib/game/decorations.ts'
import { canWeltensaat, starseedGain, starseedBanked, starUpgradeBonus, starUpgradeLevel, worldseedYieldFactor } from '../src/lib/game/worldseed.ts'
import { buyStarUpgrade } from '../src/lib/game/actions.ts'
import { STAR_UPGRADES, starUpgradeCost } from '../src/lib/data/starUpgrades.ts'
import { formatNumber, formatDuration } from '../src/lib/util/format.ts'
import { WORLD_MILESTONES, worldMilestoneBonus, nextWorldMilestone } from '../src/lib/data/worldMilestones.ts'
import { get } from 'svelte/store'
import { toasts, pushToast, pushTicketToast, pushAggregateToast, clearToasts, toastLog, toastLogUnseen, markToastLogSeen, clearToastLog, flushToastLog, reloadToastLog } from '../src/lib/ui/toasts.ts'
import { expectedQuestPayout } from '../src/lib/game/actions.ts'
import { autoHarvestRate, autoSowRate, autoSellInterval } from '../src/lib/game/modifiers.ts'
import { isHelperUpgrade, toggleHelperPause } from '../src/lib/game/actions.ts'
import { EXPEDITIONS, expeditionById, isExpeditionUnlocked, expeditionEvent, EXPEDITION_EVENTS } from '../src/lib/data/expeditions.ts'
import { creatureById } from '../src/lib/data/creatures.ts'
import {
  befriendCreature,
  collectGift,
  creatureBonus,
  creatureLevel,
  isCreatureAttracted,
  isGiftReady,
  giftReward,
} from '../src/lib/game/creatures.ts'
import {
  startExpedition,
  claimExpedition,
  expeditionReady,
  relicCount,
  relicBonus,
  relicSetBonus,
  isRelicSetComplete,
  relicSetOwned,
  totalRelics,
  companionRiskBonus,
} from '../src/lib/game/expeditions.ts'
import { RELICS } from '../src/lib/data/relics.ts'
import { RELIC_SETS } from '../src/lib/data/relicSets.ts'
import { BEAUTY_MILESTONES, beautyMilestoneBonus } from '../src/lib/data/beautyMilestones.ts'
import { effectiveHarvestValue } from '../src/lib/data/scratch.ts'
import { eventMasteryMult, gardenBeauty } from '../src/lib/game/modifiers.ts'
import { respecSkills } from '../src/lib/game/actions.ts'
import { buyOrnamental } from '../src/lib/game/actions.ts'
import { ORNAMENTALS, nextOrnamentalCost, ornamentalCount, ownsAnyOrnamental } from '../src/lib/game/gallery.ts'
import { availableSkillPoints, skillBonus, skillLevel, totalSkillPoints } from '../src/lib/game/skills.ts'
import { applyOfflineProgress } from '../src/lib/game/offline.ts'
import { exportSave, importSave } from '../src/lib/game/save.ts'
import { createDefaultState, getState, replaceState } from '../src/lib/game/state.ts'
import { plotReady, tick, cycleFloorSeconds, effectiveCycleFloor, effectiveCycleSeconds } from '../src/lib/game/tick.ts'

/** Reset to a fresh default state and return the live reference. */
function fresh() {
  replaceState(createDefaultState())
  const s = getState()
  // PHASE 48: start tests with the mini-campaign already finished, so its
  // auto-claimed one-time rewards never perturb unrelated tick-based assertions.
  // The campaign test re-opens it explicitly (s.campaign = 0).
  s.campaign = CAMPAIGN.length
  return s
}

let passed = 0
function test(name, fn) {
  fn()
  passed++
  console.log('✓', name)
}

/** Run fn with crit/extra-unit randomness pinned to "nothing special". */
function withBoringRng(fn) {
  const origRandom = Math.random
  Math.random = () => 0.5
  try {
    fn()
  } finally {
    Math.random = origRandom
  }
}

test('sow → grow → harvest → sell (baseline numbers)', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 100
    const basil = PLANTS[0]
    assert.equal(sowPlot(0), true)
    assert.equal(s.money, 100 - basil.seedCost)
    assert.equal(plotReady(s.plots[0]), false)
    tick(s, basil.growTime)
    assert.ok(plotReady(s.plots[0]))
    const { units, crit } = harvestPlot(0)
    assert.equal(crit, 'none')
    assert.equal(units, basil.yield)
    assert.equal(s.inventory[basil.id], units)
    s.marketTime = 0 // neutral market for the exact-price assertion
    const gain = sellPlant(basil.id)
    assert.equal(gain, units * basil.sellValue)
    assert.equal(s.totalEarned, gain)
    assert.equal(s.inventory[basil.id], undefined)
  })
})

test('plot cost curve & purchase', () => {
  const s = fresh()
  assert.equal(nextPlotCost(s), CONFIG.plotBaseCost)
  s.money = 1e9
  assert.ok(buyPlot())
  assert.equal(s.plots.length, CONFIG.startPlots + 1)
  assert.equal(nextPlotCost(s), Math.floor(CONFIG.plotBaseCost * CONFIG.plotCostFactor))
})

test('growth upgrade: max level doubles speed (also offline path)', () => {
  const s = fresh()
  s.money = 1e12
  const can = upgradeById('giesskanne')
  for (let i = 0; i < can.maxLevel; i++) assert.ok(buyUpgrade('giesskanne'))
  assert.equal(upgradeLevel(s, 'giesskanne'), can.maxLevel)
  assert.equal(nextUpgradeCost(can, s), null)
  assert.ok(Math.abs(growthMultiplier(s) - 2) < 1e-9)
  assert.ok(sowPlot(0))
  tick(s, PLANTS[0].growTime / 2)
  assert.ok(plotReady(s.plots[0]), 'half the time must suffice at ×2 growth')
})

test('yield upgrade multiplies harvested units (deterministic case)', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e12
    s.totalEarned = 1e6 // unlock everything
    for (let i = 0; i < 5; i++) assert.ok(buyUpgrade('duenger')) // ×1.5
    selectPlant('minze')
    assert.ok(sowPlot(0))
    tick(s, 99999)
    const { units } = harvestPlot(0) // 2 × 1.5 = 3 exactly, no randomness involved
    assert.equal(units, 3)
  })
})

test('sell price upgrade rounds the gain', () => {
  const s = fresh()
  s.money = 1e12
  assert.ok(buyUpgrade('marktstand')) // ×1.1
  s.inventory['basilikum'] = 3
  const gain = sellPlant('basilikum') // 3 × 3 × 1.1 = 9.9 → 10
  assert.equal(gain, 10)
})

test('save roundtrip keeps upgrades, v1 saves migrate, garbage is refused', () => {
  const s = fresh()
  s.money = 1234
  s.upgrades['giesskanne'] = 3
  s.mastery['basilikum'] = 50000 // mastery XP must survive save/load (PHASE 14)
  const code = exportSave()
  fresh()
  assert.notEqual(importSave(code), null)
  assert.equal(getState().money, 1234)
  assert.equal(getState().upgrades['giesskanne'], 3)
  assert.equal(getState().mastery['basilikum'], 50000, 'mastery XP survives save roundtrip')

  const v1 = JSON.stringify({
    version: 1,
    savedAt: Date.now(),
    state: {
      money: 50,
      totalEarned: 80,
      plots: [{ plantId: 'basilikum', progress: 999 }],
      inventory: { basilikum: 2, fremdgewaechs: 9 },
      selectedPlantId: 'minze',
      stats: { planted: 1, harvested: 2, sold: 0 },
      createdAt: 123,
    },
  })
  assert.notEqual(importSave(v1), null)
  const st = getState()
  assert.equal(st.money, 50)
  assert.deepEqual(st.upgrades, {})
  assert.equal(st.plots.length, CONFIG.startPlots, 'short plot list is padded')
  assert.equal(st.plots[0].progress, PLANTS[0].growTime, 'progress is clamped')
  assert.equal(st.inventory['basilikum'], 2)
  assert.equal(st.inventory['fremdgewaechs'], undefined, 'unknown plants are dropped')

  assert.equal(importSave('!!!kein-save!!!'), null)
})

test('golden harvests: tiers, multipliers and stats counter', () => {
  const s = fresh()
  s.money = 100
  const origRandom = Math.random
  try {
    // roll < legendary chance → ×10
    Math.random = () => 0.0
    sowPlot(0)
    tick(s, 99999)
    let result = harvestPlot(0)
    assert.equal(result.crit, 'legendary')
    assert.equal(result.units, PLANTS[0].yield * CONFIG.critLegendaryMult)

    // legendary ≤ roll < legendary+perfect → ×3
    Math.random = () => CONFIG.critLegendaryChance + 0.001
    sowPlot(0)
    tick(s, 99999)
    result = harvestPlot(0)
    assert.equal(result.crit, 'perfect')
    assert.equal(result.units, PLANTS[0].yield * CONFIG.critPerfectMult)

    // boring roll → normal harvest
    Math.random = () => 0.5
    sowPlot(0)
    tick(s, 99999)
    result = harvestPlot(0)
    assert.equal(result.crit, 'none')
    assert.equal(result.units, PLANTS[0].yield)

    assert.equal(s.stats.crits, 2)
  } finally {
    Math.random = origRandom
  }
})

test('combo chain: bonus applies, drains via tick, batch counts once', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e12
    s.totalEarned = 1e6
    while (s.plots.length < 12) assert.ok(buyPlot())
    selectPlant('minze')
    for (let i = 0; i < 12; i++) assert.ok(sowPlot(i))
    tick(s, 99999) // ripen everything; also proves a huge tick breaks no chain
    assert.equal(s.combo.count, 0)

    // 12 back-to-back harvests: the 12th carries 10 stacks → ×1.5 → 2×1.5 = 3
    let lastUnits = 0
    for (let i = 0; i < 12; i++) lastUnits = harvestPlot(i).units
    assert.equal(s.combo.count, 12)
    assert.equal(lastUnits, 3)

    // chain drains via tick and breaks exactly at the window
    tick(s, CONFIG.comboWindowSeconds + 0.1)
    assert.equal(s.combo.count, 0)
    assert.equal(s.combo.remaining, 0)

    // a harvest-all batch is a single link
    for (let i = 0; i < 3; i++) assert.ok(sowPlot(i))
    tick(s, 99999)
    const batch = harvestAllReady()
    assert.ok(batch.units >= 6) // 3 × minze yield 2, no bonus on first link
    assert.equal(s.combo.count, 1)
  })
})

test('gardener level: xp per unit, level-up pays out, overflow carries', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1000
    const basil = PLANTS[0]

    // plain harvest grants 1 XP per unit
    sowPlot(0)
    tick(s, 99999)
    assert.equal(harvestPlot(0).levelUps.length, 0)
    assert.equal(s.xp, basil.yield)
    assert.equal(s.level, 1)

    // push to the threshold: next single harvest must level up
    s.xp = xpToNext(1) - 1
    const moneyBefore = s.money - basil.seedCost
    sowPlot(0)
    tick(s, 99999)
    const { levelUps } = harvestPlot(0)
    assert.equal(levelUps.length, 1)
    assert.deepEqual(levelUps[0], { level: 2, reward: levelUpReward(2) })
    assert.equal(s.level, 2)
    assert.equal(s.xp, 0)
    assert.equal(s.money, moneyBefore + levelUpReward(2))

    // huge XP overflow resolves several levels in one grant
    s.xp = xpToNext(2) + xpToNext(3) + 5
    sowPlot(0)
    tick(s, 99999)
    const ups = harvestPlot(0).levelUps
    assert.equal(ups.length, 2)
    assert.equal(s.level, 4)
    assert.equal(s.xp, 6) // 5 overflow + 1 fresh unit
  })
})

test('quests: refill by level, deliver pays & rerolls, skip cooldown drains', () => {
  withBoringRng(() => {
    const s = fresh()
    ensureQuests()
    assert.equal(s.quests.length, questSlots(1))
    assert.equal(s.quests.length, 1)

    const quest = s.quests[0]
    assert.equal(quest.kind, 'single', 'a fresh garden only reaches basil → single order')
    assert.equal(quest.items.length, 1)
    const item = quest.items[0]
    const plant = PLANTS.find((p) => p.id === item.plantId)
    assert.ok(plant, 'quest plant must exist')
    assert.equal(quest.reward, Math.round(item.amount * plant.sellValue * questTier(quest.tier).rewardFactor))
    assert.ok(quest.client.length > 0, 'every order has a client')

    // not enough in storage → refused, nothing changes
    assert.equal(fulfillQuest(quest.id), null)

    // stock up and deliver (streak 0 → payout = base reward, then streak 1)
    s.inventory[item.plantId] = item.amount + 2
    const moneyBefore = s.money
    const earnedBefore = s.totalEarned
    const result = fulfillQuest(quest.id)
    assert.ok(result)
    // fair amounts give real XP → level-ups; their reward lands in money too
    const levelReward = result.levelUps.reduce((sum, lu) => sum + lu.reward, 0)
    assert.equal(s.money, moneyBefore + quest.reward + levelReward)
    assert.equal(s.totalEarned, earnedBefore + quest.reward)
    assert.equal(s.questStreak, 1)
    assert.equal(s.inventory[item.plantId], 2)
    // the delivered slot is refilled (a level-up here may also open a new slot)
    assert.ok(s.quests.length >= 1, 'slot is refilled')
    assert.ok(!s.quests.some((q) => q.id === quest.id), 'a fresh order replaces the delivered one')

    // a gold order pays the streak bonus and drops a ticket
    s.quests[0] = {
      id: 9999,
      kind: 'single',
      items: [{ plantId: 'basilikum', amount: 2 }],
      reward: 100,
      rewardTickets: 1,
      rewardCompost: 0,
      xp: 2,
      tier: 'gold',
      client: 'Testhof',
      skipCooldown: 0,
    }
    s.inventory['basilikum'] = 2
    const ticketsBefore = s.scratchTickets
    const goldResult = fulfillQuest(9999)
    assert.ok(goldResult)
    assert.equal(goldResult.reward, Math.round(100 * (1 + CONFIG.questStreakPerDelivery)))
    assert.equal(goldResult.tickets, 1)
    assert.equal(s.scratchTickets, ticketsBefore + 1)
    assert.equal(s.questStreak, 2)

    // skip arms the cooldown, breaks the streak; refused until tick drains it
    const skipped = s.quests[0]
    assert.ok(skipQuest(skipped.id))
    assert.equal(s.questStreak, 0, 'skipping breaks the delivery streak')
    const fresh1 = s.quests[0]
    assert.equal(fresh1.skipCooldown, CONFIG.questSkipCooldownSeconds)
    assert.equal(skipQuest(fresh1.id), false)
    tick(s, CONFIG.questSkipCooldownSeconds + 1)
    assert.equal(s.quests[0].skipCooldown, 0)
    assert.ok(skipQuest(s.quests[0].id))

    // reaching level 3 must open the second slot
    s.xp = xpToNext(1) + xpToNext(2) - 1
    s.money = 1000
    assert.ok(sowPlot(0))
    tick(s, 99999)
    harvestPlot(0)
    assert.ok(s.level >= 3, `expected level 3, got ${s.level}`)
    assert.equal(s.quests.length, questSlots(s.level))
    assert.equal(s.quests.length, 2)

    // quests survive a save roundtrip untouched
    const questsBefore = structuredClone(s.quests)
    const code = exportSave()
    fresh()
    assert.notEqual(importSave(code), null)
    assert.deepEqual(getState().quests, questsBefore)
  })
})

test('watering: charges skip growth, deplete and reset on harvest', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 100
    const basil = PLANTS[0]
    assert.ok(sowPlot(0))
    assert.equal(s.plots[0].waterLeft, CONFIG.waterChargesPerCrop)

    assert.ok(waterPlot(0))
    assert.ok(Math.abs(s.plots[0].progress - basil.growTime * CONFIG.waterProgressBoost) < 1e-9)
    assert.ok(waterPlot(0))
    assert.ok(waterPlot(0))
    assert.equal(s.plots[0].waterLeft, 0)
    assert.equal(waterPlot(0), false, 'no charges left')

    // watering may finish ripening, and ready plots refuse further water
    s.plots[0].waterLeft = 2
    s.plots[0].progress = basil.growTime * 0.95
    assert.ok(waterPlot(0))
    assert.equal(s.plots[0].progress, basil.growTime)
    assert.ok(plotReady(s.plots[0]))
    assert.equal(waterPlot(0), false, 'ready plots cannot be watered')

    harvestPlot(0)
    assert.equal(s.plots[0].waterLeft, 0, 'harvest clears leftover charges')
    assert.equal(waterPlot(0), false, 'empty plots cannot be watered')

    // old saves without the field get full charges for growing crops
    const v6 = JSON.stringify({
      version: 6,
      savedAt: Date.now(),
      state: { money: 1, plots: [{ plantId: 'basilikum', progress: 2 }] },
    })
    assert.notEqual(importSave(v6), null)
    assert.equal(getState().plots[0].waterLeft, CONFIG.waterChargesPerCrop)
  })
})

/** Run fn with Math.random returning queued values (last one repeats). */
function withRngQueue(values, fn) {
  const orig = Math.random
  let i = 0
  Math.random = () => values[Math.min(i++, values.length - 1)]
  try {
    fn()
  } finally {
    Math.random = orig
  }
}

test('scratch tickets: drop on lucky harvests, capped pending', () => {
  const s = fresh()
  s.money = 100
  // rng order per harvest: crit roll, unit rounding, drop roll
  withRngQueue([0.5, 0.5, 0.0], () => {
    sowPlot(0)
    tick(s, 99999)
    const { tickets } = harvestPlot(0)
    assert.equal(tickets, 1)
    assert.equal(s.scratchTickets, 1)
  })
  // at the cap nothing more drops, even on a lucky roll
  s.scratchTickets = CONFIG.scratchMaxPending
  withRngQueue([0.5, 0.5, 0.0], () => {
    sowPlot(0)
    tick(s, 99999)
    const { tickets } = harvestPlot(0)
    assert.equal(tickets, 0)
    assert.equal(s.scratchTickets, CONFIG.scratchMaxPending)
  })
})

test('PHASE 0: ticket cap follows the gardener level (max(5, level))', () => {
  const s = fresh()
  // acceptance: level 1 and 5 cap at 5; level 10/44/50 cap at their level
  for (const [level, cap] of [[1, 5], [5, 5], [10, 10], [44, 44], [50, 50]]) {
    s.level = level
    assert.equal(maxScratchTickets(s), cap, `level ${level} → cap ${cap}`)
  }

  // drops are no longer cut off at 5 for higher levels …
  s.level = 10
  s.scratchTickets = 7
  withRngQueue([0.5, 0.5, 0.0], () => {
    s.money = 100
    sowPlot(0)
    tick(s, 99999)
    assert.equal(harvestPlot(0).tickets, 1)
    assert.equal(s.scratchTickets, 8)
  })
  // … but the level cap still holds
  s.scratchTickets = 10
  withRngQueue([0.5, 0.5, 0.0], () => {
    sowPlot(0)
    tick(s, 99999)
    assert.equal(harvestPlot(0).tickets, 0)
    assert.equal(s.scratchTickets, 10)
  })

  // save/load keeps a big pocket at high level and clamps junk to the cap
  s.level = 44
  s.scratchTickets = 30
  const code = exportSave()
  fresh()
  assert.notEqual(importSave(code), null)
  assert.equal(getState().scratchTickets, 30, '30 tickets at level 44 survive')
  const tampered = JSON.parse(Buffer.from(code, 'base64').toString())
  tampered.state.scratchTickets = 999
  assert.notEqual(importSave(JSON.stringify(tampered)), null)
  assert.equal(getState().scratchTickets, 44, 'junk clamps to the level cap')
  tampered.state.level = 2
  tampered.state.scratchTickets = 7
  assert.notEqual(importSave(JSON.stringify(tampered)), null)
  assert.equal(getState().scratchTickets, 5, 'low levels still cap at 5')
})

test('scratch cards 2.0: draw pays nothing, settle grades the picks', () => {
  const s = fresh()
  s.scratchTickets = 3
  const hv = bestHarvestValue(s)

  // constant 0 → first prize (small money), deterministic board
  withRngQueue([0.0], () => {
    const moneyBefore = s.money
    const card = drawScratchCard()
    assert.ok(card)
    assert.equal(card.prizeType, 'money-small')
    assert.equal(card.amount, 2 * hv)
    assert.equal(s.money, moneyBefore, 'drawing must not pay out yet')
    assert.equal(s.scratchTickets, 2)
    assert.equal(card.symbols.length, 9)
    assert.equal(card.symbols.filter((sym) => sym === card.symbol).length, 3)

    // the hidden triple pays ×scratchFullMult
    const full = settleScratchCard(card, [card.symbol, card.symbol, card.symbol])
    assert.equal(full.grade, 'voll')
    assert.equal(full.amount, card.amount * CONFIG.scratchFullMult)

    // ANY picked pair pays a share of THAT symbol's prize (user feedback!)
    const decoySym = card.symbols.find((sym) => sym !== card.symbol)
    const partial = settleScratchCard(card, [decoySym, decoySym, card.symbol])
    assert.equal(partial.grade, 'teil')
    const decoyPrize = SCRATCH_PRIZES.find((p) => p.symbol === decoySym)
    assert.equal(partial.prizeType, decoyPrize.type)
    assert.equal(
      partial.amount,
      Math.max(Math.round(scratchPrizeAmount(decoyPrize, s) * CONFIG.scratchPartialFactor), 1)
    )

    // three different symbols → consolation
    const distinct = [...new Set(card.symbols)].slice(0, 3)
    const miss = settleScratchCard(card, distinct)
    assert.equal(miss.grade, 'trost')
    assert.equal(miss.amount, Math.max(Math.round(card.amount * CONFIG.scratchConsolationFactor), 1))
    assert.equal(s.totalEarned, 0, 'lottery winnings are not sales')
  })

  // 0.97 lands in the jackpot bracket — full hit = 80×hv×mult, a true jackpot
  withRngQueue([0.97], () => {
    const card = drawScratchCard()
    assert.equal(card.prizeType, 'jackpot')
    const moneyBefore = s.money
    assert.equal(
      settleScratchCard(card, [card.symbol, card.symbol, card.symbol]).amount,
      80 * hv * CONFIG.scratchFullMult
    )
    assert.equal(s.money, moneyBefore + 80 * hv * CONFIG.scratchFullMult)
  })
  withRngQueue([0.78], () => {
    const card = drawScratchCard()
    assert.equal(card.prizeType, 'fertilizer')
    const before = s.fertilizerCharges
    const won = settleScratchCard(card, [card.symbol, card.symbol, card.symbol])
    assert.equal(s.fertilizerCharges, before + won.amount)
  })
  // PHASE 18: non-gold prizes — compost feeds the prestige economy …
  withRngQueue([0.85], () => {
    s.scratchTickets = 2
    const card = drawScratchCard()
    assert.equal(card.prizeType, 'compost')
    const before = s.compost
    const won = settleScratchCard(card, [card.symbol, card.symbol, card.symbol])
    assert.equal(s.compost, before + won.amount, 'compost prize lands in the pool')
  })
  // … and a mastery prize feeds the selected plant's mastery
  withRngQueue([0.93], () => {
    s.scratchTickets = 1
    s.selectedPlantId = 'basilikum'
    const card = drawScratchCard()
    assert.equal(card.prizeType, 'mastery')
    const before = s.mastery['basilikum'] ?? 0
    const won = settleScratchCard(card, [card.symbol, card.symbol, card.symbol])
    assert.equal(s.mastery['basilikum'], before + won.amount, 'mastery prize lifts the plant')
  })

  assert.equal(drawScratchCard(), null, 'no ticket, no card')

  // an abandoned card refunds the ticket (capped)
  refundScratchTicket()
  assert.equal(s.scratchTickets, 1)
  s.scratchTickets = CONFIG.scratchMaxPending
  refundScratchTicket()
  assert.equal(s.scratchTickets, CONFIG.scratchMaxPending)
})

test('ticket drop chance scales with cycle time, not clicks', () => {
  const s = fresh()
  const basil = PLANTS.find((p) => p.id === 'basilikum')
  const pumpkin = PLANTS.find((p) => p.id === 'kuerbis')
  const cheap = scratchDropChance(s, basil.growTime)
  const slow = scratchDropChance(s, pumpkin.growTime)
  assert.ok(cheap < 0.005, `basil spam must barely drop tickets (${cheap})`)
  assert.ok(slow > 0.2, `slow crops must feel lucky (${slow})`)
  assert.ok(scratchDropChance(s, 999999) <= CONFIG.scratchDropCap, 'capped')
})

test('turbo fertilizer: one charge doubles one harvest', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 100
    s.fertilizerCharges = 2
    for (const expected of [2, 2, 1]) {
      sowPlot(0)
      tick(s, 99999)
      assert.equal(harvestPlot(0).units, expected)
    }
    assert.equal(s.fertilizerCharges, 0)
  })
})

test('market wave: neutral at start, sales follow the wave', () => {
  const s = fresh()
  assert.ok(Math.abs(marketFactor(s) - 1) < 1e-9, 'fresh game starts neutral')
  s.inventory['basilikum'] = 100
  assert.equal(sellPlant('basilikum'), 300, 'neutral market = exact base price')

  // scan several periods (the harmonics repeat slowly): real highs and lows
  let peak = 1
  let peakTime = 0
  let trough = 1
  for (let sec = 0; sec < CONFIG.marketPeriodSeconds * 10; sec += 5) {
    s.marketTime = sec
    const f = marketFactor(s)
    if (f > peak) {
      peak = f
      peakTime = sec
    }
    trough = Math.min(trough, f)
  }
  assert.ok(peak > 1.2, `peak should pay noticeably more (${peak.toFixed(3)})`)
  assert.ok(trough < 0.85, `trough should pay noticeably less (${trough.toFixed(3)})`)
  s.marketTime = peakTime
  s.inventory['basilikum'] = 100
  assert.equal(sellPlant('basilikum'), Math.round(300 * peak))

  // tick advances the clock
  const before = s.marketTime
  tick(s, 30)
  assert.ok(Math.abs(s.marketTime - before - 30) < 1e-9)
})

test('bulk actions: sow all empty, water all growing', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 100
    assert.equal(sowAllEmpty(), CONFIG.startPlots)
    assert.equal(s.plots.filter((p) => p.plantId !== null).length, CONFIG.startPlots)
    assert.equal(waterAllGrowing(), CONFIG.startPlots)
    for (const plot of s.plots) {
      assert.ok(Math.abs(plot.progress - PLANTS[0].growTime * CONFIG.waterProgressBoost) < 1e-9)
      assert.equal(plot.waterLeft, CONFIG.waterChargesPerCrop - 1)
    }
    assert.equal(sowAllEmpty(), 0, 'nothing empty left')
    // money limit respected
    const s2 = fresh()
    s2.money = 2 // two basil seeds
    assert.equal(sowAllEmpty(), 2)
    assert.equal(s2.money, 0)
  })
})

test('daily gift: streak grows, resets after a gap, once per day', () => {
  const s = fresh()
  const DAY = 86400000
  const base = Date.UTC(2026, 5, 20, 15) // afternoon avoids tz edge cases
  assert.ok(dailyClaimable(s, base))
  const r1 = claimDaily(base)
  assert.ok(r1 && r1.day === 1 && r1.streak === 1 && r1.gold > 0)
  assert.equal(claimDaily(base + 3600000), null, 'only once per day')

  const r2 = claimDaily(base + DAY)
  assert.ok(r2 && r2.day === 2 && r2.streak === 2)
  assert.ok(r2.fertilizer > 0)

  // a missed day breaks the streak
  const r3 = claimDaily(base + 3 * DAY)
  assert.ok(r3 && r3.streak === 1 && r3.day === 1)
})

test('golden firefly: rewards land in state', () => {
  const s = fresh()
  withRngQueue([0.0], () => {
    const before = s.money
    const r = catchFirefly()
    assert.equal(r.kind, 'gold')
    assert.equal(s.money, before + r.amount)
  })
  withRngQueue([0.6], () => {
    const r = catchFirefly()
    assert.equal(r.kind, 'ticket')
    assert.equal(s.scratchTickets, 1)
  })
  withRngQueue([0.9], () => {
    const r = catchFirefly()
    assert.equal(r.kind, 'fertilizer')
    assert.equal(s.fertilizerCharges, 3)
  })
})

test('weather events: rain waters, stars boost crits, boom boosts sales', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 100
    sowPlot(0)
    assert.ok(startWeather('regen'))
    assert.ok(Math.abs(s.plots[0].progress - PLANTS[0].growTime * CONFIG.waterProgressBoost) < 1e-9)
    assert.equal(startWeather('marktboom'), false, 'one event at a time')
    tick(s, 999) // blows over
    assert.equal(s.weather.id, null)
  })

  // shooting stars: a roll that misses normally becomes a crit
  const s = fresh()
  s.money = 100
  const probe = (CONFIG.critLegendaryChance + CONFIG.critPerfectChance) * 2
  withRngQueue([probe, 0.5, 0.5], () => {
    sowPlot(0)
    tick(s, 99999)
    s.weather = { id: null, remaining: 0 }
    assert.equal(harvestPlot(0).crit, 'none')
  })
  withRngQueue([probe, 0.5, 0.5], () => {
    sowPlot(0)
    tick(s, 99999)
    s.weather = { id: 'sternschnuppen', remaining: 60 }
    assert.equal(harvestPlot(0).crit, 'perfect', 'stars triple the odds')
  })

  // market boom: +50 % on sales
  const s2 = fresh()
  s2.weather = { id: 'marktboom', remaining: 120 }
  s2.inventory['basilikum'] = 100
  assert.equal(sellPlant('basilikum'), Math.round(300 * 1.5))
})

test('timber trees: mature trees trickle money through tick', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e12
    s.totalEarned = 1e15
    selectPlant('eiche')
    const oak = PLANTS.find((p) => p.id === 'eiche')
    assert.ok(sowPlot(0))
    tick(s, oak.growTime)
    assert.equal(plotReady(s.plots[0]), false, 'trees are never harvestable')
    s.marketTime = 0 // neutral market for exactness
    const before = s.money
    const earnedBefore = s.totalEarned
    tick(s, 0.0001) // settle market clock effect ≈ none
    const start = s.money
    s.marketTime = 0
    tick(s, 60)
    const gained = s.money - start
    assert.ok(gained > oak.passiveIncome * 60 * 0.9 && gained < oak.passiveIncome * 60 * 1.2,
      `60s of oak should pay ≈${oak.passiveIncome * 60}, got ${Math.round(gained)}`)
    assert.ok(s.totalEarned > earnedBefore, 'wood counts as earnings')
    assert.ok(before <= s.money)
  })
})

test('achievements: tiers claim once, grant rewards, survive save (PHASE 19)', () => {
  withBoringRng(() => {
    const s = fresh()
    assert.deepEqual(s.achievementTiers, {})
    // reach two tiers of the gold track in one tick: 1K (Bronze) + 1M (Silber)
    s.lifetimeEarned = 1e6
    const fertBefore = s.fertilizerCharges
    const ticketsBefore = s.scratchTickets
    tick(s, 0.1)
    assert.equal(s.achievementTiers['gold'], 2, 'reached Silber on the gold track')
    // one-time rewards paid exactly once (Bronze 2 fertilizer + Silber 1 ticket)
    assert.equal(s.fertilizerCharges, fertBefore + 2, 'Bronze booster paid')
    assert.equal(s.scratchTickets, ticketsBefore + 1, 'Silber ticket paid')
    // permanent yield from the two claimed tiers applies
    assert.ok(yieldMultiplier(s) > 1, 'claimed tiers lift yield')

    // a second tick must NOT re-pay the one-time rewards
    const fertAfter = s.fertilizerCharges
    tick(s, 0.1)
    assert.equal(s.fertilizerCharges, fertAfter, 'no double rewards on re-evaluation')
    assert.equal(s.achievementTiers['gold'], 2)

    // survives a save roundtrip without re-granting
    const code = exportSave()
    fresh()
    importSave(code)
    assert.equal(getState().achievementTiers['gold'], 2, 'tiers survive save/load')
    assert.equal(getState().fertilizerCharges, fertAfter, 'load does not re-pay rewards')
  })
})

test('cannabis: license-gated, requirements enforced, care malus', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e15
    s.totalEarned = 1e15
    const hemp = PLANTS.find((p) => p.id === 'cbdhanf')
    assert.ok(hemp.requiresLicense === 1)
    selectPlant('cbdhanf')
    assert.notEqual(s.selectedPlantId, 'cbdhanf', 'no license, no selection')

    assert.equal(buyLicense(), false, 'requirement (parcels ≥ 2) not met')
    s.parcels = 2
    assert.ok(buyLicense())
    assert.equal(s.licenses, 1)
    selectPlant('cbdhanf')
    assert.equal(s.selectedPlantId, 'cbdhanf')

    // care malus: without Gießkanne 5 the plant grows at half speed
    assert.ok(sowPlot(0))
    tick(s, hemp.growTime)
    assert.equal(plotReady(s.plots[0]), false, 'under-watered hemp is slow')
    tick(s, hemp.growTime)
    assert.ok(plotReady(s.plots[0]))

    // licenses survive prestige
    s.lifetimeEarned = 1e15
    assert.ok(leaseParcel() > 0)
    assert.equal(s.licenses, 1)
  })
})

test('records & history: best harvest, combo, earnings buckets', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 100
    sowPlot(0)
    tick(s, PLANTS[0].growTime) // exact ripen — no history bucket yet
    harvestPlot(0)
    assert.equal(s.history.length, 0)
    assert.equal(s.records.bestHarvest, PLANTS[0].yield)
    assert.equal(s.records.longestCombo, 1)
    s.marketTime = 0
    sellPlant('basilikum')
    const earned = s.totalEarned
    assert.ok(earned > 0)
    tick(s, 1800)
    assert.equal(s.history.length, 1)
    assert.ok(s.history[0] >= earned, 'bucket captures the earnings (incl. tick income)')
  })
})

test('plant data: ascending unlocks, doubling profit curve, ROI ≥ 3', () => {
  let lastUnlock = -1
  let lastProfit = 0
  for (const plant of PLANTS) {
    assert.ok(plant.unlockAtTotalEarned > lastUnlock || plant.unlockAtTotalEarned === 0, `${plant.id}: unlocks must ascend`)
    if (plant.beautyBonus || plant.passiveIncome) {
      assert.ok(plant.yield === 0 && plant.sellValue === 0, `${plant.id}: no harvest, no sale value`)
      lastUnlock = plant.unlockAtTotalEarned
      continue
    }
    const profit = steadyProfitPerSecond(plant)
    assert.ok(
      profit > lastProfit * 1.5,
      `${plant.id}: steady profit/s must clearly beat the previous plant (${profit.toFixed(2)} vs ${lastProfit.toFixed(2)})`
    )
    const roi = (plant.yield * plant.sellValue) / plant.seedCost
    if (plant.regrowTime) {
      assert.ok(roi >= 1 / 3, `${plant.id}: seed must pay back within three harvests (×${roi.toFixed(2)})`)
      assert.ok(plant.regrowTime < plant.growTime, `${plant.id}: regrow must be faster than first growth`)
    } else {
      assert.ok(roi >= 3, `${plant.id}: a seed must at least triple its money (×${roi.toFixed(2)})`)
    }
    lastUnlock = plant.unlockAtTotalEarned
    lastProfit = profit
  }
})

test('PHASE 8: produce names — deliver goods, not the plant', () => {
  const apple = PLANTS.find((p) => p.id === 'apfelbaum')
  const basil = PLANTS.find((p) => p.id === 'basilikum')
  assert.equal(produceName(apple), 'Äpfel') // not "Apfelbaum"
  assert.equal(produceName(basil), 'Basilikum') // falls back to the name
  // every harvestable plant (the only ones quests ask for) has a label
  for (const p of PLANTS) {
    if (p.beautyBonus || p.passiveIncome) continue
    assert.ok(produceName(p).length > 0, `${p.id}: missing produce label`)
  }
})

test('PHASE 11: softlock guard sees reserved stock; gnome skips ornamentals', () => {
  withBoringRng(() => {
    // stock that open orders fully reserve is NOT freely sellable → rescue
    const s = fresh()
    s.money = 0
    s.inventory['basilikum'] = 5
    s.quests.push({
      id: 1, kind: 'single', items: [{ plantId: 'basilikum', amount: 10 }],
      reward: 1, rewardTickets: 0, rewardCompost: 0, xp: 1, tier: 'bronze', client: 'X', skipCooldown: 0,
    })
    tick(s, 0.1)
    assert.equal(s.money, CONFIG.startMoney, 'reserved-only stock still triggers the notgroschen')

    // but genuinely free stock blocks the rescue (player can just sell it)
    const t = fresh()
    t.money = 0
    t.inventory['basilikum'] = 5
    tick(t, 0.1)
    assert.equal(t.money, 0, 'free stock means no rescue')

    // PHASE 44: ornamentals are gallery-only — never selectable, never sown.
    // Even with the Sä-Gnom running, the field stays free of beauty plants.
    const g = fresh()
    g.money = 1e9
    g.totalEarned = 1e15
    selectPlant('nachtrose')
    assert.notEqual(g.selectedPlantId, 'nachtrose', 'ornamentals can never be selected')
    g.upgrades['saegnom'] = 10
    for (const p of g.plots) p.plantId = null
    tick(g, 10)
    assert.ok(
      g.plots.every((p) => !plantById(p.plantId)?.beautyBonus),
      'gnome never sows ornamentals onto the field'
    )
  })
})

test('PHASE 44: Ziergalerie — ornamentals are a permanent collection, not field plants', () => {
  const s = fresh()
  s.totalEarned = 1e18 // unlock the whole ladder
  s.money = 1e18

  // ORNAMENTALS = every plant with a beautyBonus (field plants + lab specials)
  assert.ok(ORNAMENTALS.length > 0)
  assert.ok(ORNAMENTALS.every((p) => (p.beautyBonus ?? 0) > 0))

  // buying raises beauty without touching a plot; cost escalates per copy
  const o = ORNAMENTALS[0]
  const c0 = nextOrnamentalCost(o, 0)
  assert.ok(gardenBeauty(s) === 0 && !ownsAnyOrnamental(s))
  assert.ok(buyOrnamental(o.id))
  assert.equal(ornamentalCount(s, o.id), 1)
  assert.ok(ownsAnyOrnamental(s))
  assert.ok(gardenBeauty(s) > 0, 'a bought ornamental contributes beauty immediately')
  assert.ok(s.plots.every((p) => p.plantId === null), 'gallery purchases never plant on the field')
  const c1 = nextOrnamentalCost(o, 1)
  assert.ok(c1 > c0, 'each further copy costs more')

  // the cap is real
  s.ornamentals[o.id] = CONFIG.galleryMaxCopies
  assert.ok(!Number.isFinite(nextOrnamentalCost(o, CONFIG.galleryMaxCopies)))
  assert.ok(!buyOrnamental(o.id), 'cannot buy past the cap')

  // old saves: a beauty plant left on the field migrates into the collection
  const m = fresh()
  m.totalEarned = 1e18
  const code = exportSave()
  // hand-craft a save that still has an ornamental sitting on a plot
  const env = JSON.parse(Buffer.from(code, 'base64').toString('utf8'))
  env.state.plots = [{ plantId: o.id, progress: o.growTime, waterLeft: 0, regrowing: false }]
  env.state.ornamentals = {}
  const migrated = importSave(Buffer.from(JSON.stringify(env), 'utf8').toString('base64'))
  assert.ok(migrated, 'save with field ornamental still loads')
  const after = getState()
  assert.equal(ornamentalCount(after, o.id), 1, 'field ornamental folded into the collection')
  assert.ok(after.plots.every((p) => p.plantId === null), 'and its plot was freed')
})

test('PHASE 11 endgame: mastery, specialisation, bulk-clear + undo, survive prestige', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e15
    s.totalEarned = 1e18 // unlock everything

    // mastery level derives from harvested units and lifts that plant's yield
    s.mastery['basilikum'] = masteryThreshold(3)
    assert.equal(masteryLevel(s.mastery['basilikum']), 3)
    assert.ok(Math.abs(masteryYieldBonus(s, 'basilikum') - 1.3) < 1e-9)
    assert.equal(masteryYieldBonus(s, 'tomate'), 1, 'mastery is per-plant')

    // harvesting accrues mastery
    selectPlant('basilikum')
    const before = s.mastery['basilikum']
    assert.ok(sowPlot(0))
    tick(s, PLANTS[0].growTime)
    assert.ok(harvestPlot(0).units > 0)
    assert.ok(s.mastery['basilikum'] > before, 'harvest grows mastery')

    // specialisation costs gold, lifts a whole category, rejects bad input
    const cost0 = specializationCost(0)
    const moneyBefore = s.money
    assert.ok(buySpecialization('kraeuter'))
    assert.equal(specializationLevel(s, 'kraeuter'), 1)
    assert.equal(s.money, moneyBefore - cost0)
    assert.ok(Math.abs(specializationYieldBonus(s, 'kraeuter') - 1.05) < 1e-9, 'level 1 = +5 % (PHASE 15 base)')
    assert.equal(specializationYieldBonus(s, 'gemuese'), 1, 'specialisation is per-category')
    assert.ok(!buySpecialization('nichtskategorie'))

    // bulk clear + undo
    selectPlant('basilikum')
    for (let i = 0; i < s.plots.length; i++) if (s.plots[i].plantId === null) sowPlot(i)
    const planted = s.plots.filter((p) => p.plantId !== null).length
    assert.ok(planted >= 1)
    const moneyPre = s.money
    const res = clearAllPlots()
    assert.equal(res.count, planted)
    assert.ok(s.plots.every((p) => p.plantId === null), 'everything is cleared')
    assert.equal(s.money, moneyPre + res.refund)
    assert.ok(restorePlots(res.cleared, res.refund))
    assert.equal(s.plots.filter((p) => p.plantId !== null).length, planted, 'undo restores plants')
    assert.equal(s.money, moneyPre, 'undo takes the refund back')

    // both survive a prestige (meta progression)
    s.lifetimeEarned = 1e12
    s.totalEarned = 1e12
    const keptMastery = s.mastery['basilikum']
    assert.ok(leaseParcel() > 0)
    assert.equal(getState().mastery['basilikum'], keptMastery, 'mastery survives prestige')
    assert.equal(specializationLevel(getState(), 'kraeuter'), 1, 'specialisation survives prestige')
  })
})

test('PHASE 14: unique category perks, compost cost, progression gate', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e18
    s.totalEarned = 1e18

    // each category has its own perk; it only reads on the matching kind/category
    s.specializations['kraeuter'] = 4 // below the first milestone → perk mult ×1
    assert.ok(Math.abs(specUniqueBonus(s, 'kraeuter', 'growth') - 0.2) < 1e-9, 'kraeuter perk = growth')
    assert.equal(specUniqueBonus(s, 'kraeuter', 'crit'), 0, 'kraeuter has no crit perk')
    assert.equal(specUniqueBonus(s, 'gemuese', 'growth'), 0, 'perk is per-category')
    // PHASE 15: at level 5 the first milestone amplifies the unique perk (×1.5)
    s.specializations['gemuese'] = 5
    assert.ok(Math.abs(specUniqueBonus(s, 'gemuese', 'crit') - 0.075) < 1e-9, 'gemuese perk × milestone 1.5')

    // the growth perk actually speeds that category's plots in tick
    const a = fresh()
    a.money = 1e18
    a.totalEarned = 1e18
    a.specializations['kraeuter'] = 10 // +50 % growth
    selectPlant('basilikum')
    assert.ok(sowPlot(0))
    const b = fresh()
    b.money = 1e18
    b.totalEarned = 1e18
    selectPlant('basilikum')
    assert.ok(sowPlot(0))
    const dt = PLANTS[0].growTime * 0.5
    tick(a, dt)
    tick(b, dt)
    assert.ok(a.plots[0].progress > b.plots[0].progress, 'kraeuter perk grows faster')

    // compost cost: free below threshold, scales above
    assert.equal(specializationCompostCost(0), 0)
    assert.equal(specializationCompostCost(CONFIG.specCompostFromLevel - 1), 0)
    assert.equal(specializationCompostCost(CONFIG.specCompostFromLevel), CONFIG.specCompostBase)
    assert.ok(
      specializationCompostCost(CONFIG.specCompostFromLevel + 2) > CONFIG.specCompostBase,
      'compost cost scales'
    )

    // progression gate rises with level
    assert.equal(specializationRequirement(0).parcels, 1)
    assert.ok(specializationRequirement(20).parcels > 1, 'high levels need more parcels')
    assert.ok(specializationRequirement(20).gardener > 1, 'high levels need a higher gardener level')

    // a gated level is refused until parcels/level are met, then deducts compost
    const g = fresh()
    g.money = 1e18
    g.compost = 1e6
    g.specializations['beeren'] = CONFIG.specCompostFromLevel // owes compost + a gate
    g.parcels = 1
    g.level = 1
    assert.ok(!buySpecialization('beeren'), 'gated by parcels/level')
    const need = specializationRequirement(CONFIG.specCompostFromLevel)
    g.parcels = need.parcels
    g.level = need.gardener
    const compostBefore = g.compost
    const spentBefore = g.compostSpent
    const owed = specializationCompostCost(CONFIG.specCompostFromLevel)
    assert.ok(buySpecialization('beeren'), 'buys once requirements are met')
    assert.equal(g.specializations['beeren'], CONFIG.specCompostFromLevel + 1)
    assert.equal(g.compost, compostBefore - owed, 'compost pool drops')
    assert.equal(g.compostSpent, spentBefore + owed, 'compostSpent keeps total intact')

    // the purchase descriptor mirrors the gate for the UI
    const blocked = specializationPurchase(g, 'magie')
    g.parcels = 0
    const reblocked = specializationPurchase(g, 'magie')
    assert.equal(reblocked.parcelsMet, false)
    assert.ok(blocked.gold > 0)
  })
})

test('PHASE 15: escalating spec value, milestones, repeatable compost sinks', () => {
  withBoringRng(() => {
    // ── specialisation value ESCALATES per tier (no longer flat) ──
    const inc1 = specYieldSum(1) - specYieldSum(0) // tier 0 per-level value
    const inc6 = specYieldSum(6) - specYieldSum(5) // tier 1 per-level value
    const inc21 = specYieldSum(21) - specYieldSum(20) // tier 4 per-level value
    assert.ok(inc6 > inc1 + 1e-9, 'per-level yield grows after the first tier')
    assert.ok(inc21 > inc6 + 1e-9, 'per-level yield keeps growing in late tiers')
    assert.ok(specYieldSum(25) > 25 * inc1, 'level 25 beats the old flat curve')
    assert.ok(Number.isFinite(specYieldSum(25)), 'no NaN/overflow at max')

    // ── milestones amplify the unique perk ──
    assert.equal(specPerkMultiplier(4), 1, 'no milestone before level 5')
    assert.equal(specPerkMultiplier(5), 1.5, 'first milestone at 5')
    assert.equal(specPerkMultiplier(25), 3.5, 'five milestones at 25')
    assert.equal(nextSpecMilestone(3), 5)
    assert.equal(nextSpecMilestone(5), 10)
    assert.equal(nextSpecMilestone(25), null, 'no milestone past max')

    // ── geometric compost cost is a real, finite sink ──
    assert.equal(specializationCompostCost(0), 0)
    assert.ok(
      specializationCompostCost(20) > specializationCompostCost(10) * 4,
      'compost cost climbs geometrically at high levels'
    )
    assert.ok(Number.isFinite(specializationCompostCost(24)), 'finite compost cost')

    // ── repeatable compost upgrades exist, are parcel-gated, never trivially max ──
    const urhumus = COMPOST_UPGRADES.find((u) => u.id === 'urhumus')
    assert.ok(urhumus?.repeatable, 'urhumus is a repeatable endgame sink')
    assert.ok(compostUpgradeCost(urhumus, 50) !== null, 'still buyable at level 50')
    assert.ok(
      compostUpgradeCost(urhumus, 30) > compostUpgradeCost(urhumus, 10),
      'repeatable cost rises every level'
    )
    assert.ok(Number.isFinite(compostUpgradeCost(urhumus, 60)), 'finite repeatable cost')

    // the compost sink is no longer tiny: maxing every CAPPED upgrade once is far
    // more than one prestige's worth was before — and the repeatable ones go on.
    const g = fresh()
    g.parcels = 20
    g.compost = 1e9
    let bought = 0
    for (let i = 0; i < 40; i++) if (buyCompostUpgrade('urhumus')) bought++
    assert.ok(bought >= 30, 'urhumus keeps absorbing compost (no early MAX)')
    assert.ok(g.compostSpent > 0 && g.compost < 1e9, 'compost actually spent')
    assert.ok(Number.isFinite(yieldMultiplier(g)) && yieldMultiplier(g) > 1, 'urhumus lifts yield, no overflow')

    // ── top-of-ladder unlocks were widened (endgame is a longer climb) ──
    const weltenrose = PLANTS.find((p) => p.id === 'weltenrose')
    const ewig = PLANTS.find((p) => p.id === 'ewigkeitsbluete')
    assert.ok(weltenrose.unlockAtTotalEarned >= 8e15, 'final plant pushed further out')
    assert.ok(weltenrose.unlockAtTotalEarned > ewig.unlockAtTotalEarned * 4, 'big top-end gap')
  })
})

test('PHASE 16: goal engine always offers several well-formed targets', () => {
  withBoringRng(() => {
    // fresh game: at least a next-plant and a next-upgrade goal, all well-formed
    const s = fresh()
    const early = activeGoals(s)
    assert.ok(early.length >= 2, 'a new game already shows multiple goals')
    for (const g of early) {
      assert.ok(g.fraction >= 0 && g.fraction <= 1, `${g.id}: fraction in [0,1]`)
      assert.ok(Number.isFinite(g.current) && Number.isFinite(g.target), `${g.id}: finite numbers`)
      assert.ok(g.label.length > 0 && g.reward.length > 0, `${g.id}: has label + reward`)
    }
    assert.ok(early.some((g) => g.id === 'plant'), 'next plant is a goal early on')

    // the next-plant goal points at the lowest still-locked plant and tracks earnings
    const plantGoal = early.find((g) => g.id === 'plant')
    assert.equal(plantGoal.target, PLANTS.find((p) => p.unlockAtTotalEarned > 0).unlockAtTotalEarned)
    s.totalEarned = plantGoal.target / 2
    const mid = activeGoals(s).find((g) => g.id === 'plant')
    assert.ok(Math.abs(mid.fraction - 0.5) < 0.01, 'plant goal fraction tracks totalEarned')

    // a richer state spans multiple tiers (short → endgame) and marks ready goals
    const r = fresh()
    r.money = 1e15
    r.totalEarned = 1e15
    r.parcels = 6
    r.compost = 1e6
    r.specializations['magie'] = 7
    r.mastery['basilikum'] = 200
    r.compostUpgrades = {}
    const rich = activeGoals(r)
    const tiers = new Set(rich.map((g) => g.tier))
    assert.ok(tiers.size >= 3, 'goals span at least three time horizons')
    assert.ok(rich.some((g) => g.id === 'spec'), 'specialisation milestone is a goal once invested')
    // sorted short → endgame
    const order = { kurz: 0, mittel: 1, lang: 2, endgame: 3 }
    for (let i = 1; i < rich.length; i++) {
      assert.ok(order[rich[i].tier] >= order[rich[i - 1].tier], 'goals sorted by horizon')
    }
  })
})

test('PHASE 17: skill tree (points from progress, gated, survives prestige)', () => {
  withBoringRng(() => {
    const s = fresh()
    // points come from parcels + achievements + level (never gold)
    assert.equal(totalSkillPoints(s), 0, 'fresh game has no skill points')
    s.parcels = 4 // +3
    s.achievementTiers = { ernte: 6 } // +2 (skill point at tier ≥3 and ≥6)
    s.level = 41 // +2 (floor(40/20))
    assert.equal(totalSkillPoints(s), 7, '3 parcels + 2 achievement + 2 level points')
    assert.equal(availableSkillPoints(s), 7)

    // gold does NOT buy skills; the branch skill needs the root first
    s.money = 1e18
    assert.ok(!buySkill('erntefokus'), 'branch skill gated behind the root')
    assert.ok(buySkill('gartenplanung'), 'root buyable')
    assert.equal(skillLevel(s, 'gartenplanung'), 1)
    assert.ok(Math.abs(skillBonus(s, 'yield') - 0.03) < 1e-9, 'root gives +3 % yield')
    assert.ok(buySkill('erntefokus'), 'branch buyable after root')
    assert.ok(skillBonus(s, 'crit') > 0, 'erntefokus lifts crit')

    // points are finite: spending reduces the pool, over-spend is refused
    const spentPts = 1 + 1 // root(1) + erntefokus(1)
    assert.equal(availableSkillPoints(s), 7 - spentPts)
    s.skills = {}
    s.parcels = 1
    s.achievementTiers = {}
    s.level = 1
    assert.equal(availableSkillPoints(s), 0)
    assert.ok(!buySkill('gartenplanung'), 'no points → no buy')

    // survives prestige (skills + the meta progression that funds them)
    const t = fresh()
    t.parcels = 3
    t.skills = { gartenplanung: 1, tiefwurzel: 2 }
    t.lifetimeEarned = 1e12
    t.totalEarned = 1e12
    assert.ok(leaseParcel() > 0)
    assert.equal(getState().skills['tiefwurzel'], 2, 'skills survive prestige')

    // save roundtrip keeps skills
    const u = fresh()
    u.skills = { gartenplanung: 1, schaugarten: 3 }
    const code = exportSave()
    fresh()
    assert.notEqual(importSave(code), null)
    assert.equal(getState().skills['schaugarten'], 3, 'skills survive save/load')
    assert.deepEqual(getState().skills['unknownskill'], undefined, 'unknown skills dropped')
  })
})

test('PHASE 17: beauty milestones turn Zier into a real aura build', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e15
    s.totalEarned = 1e18 // unlock ornamentals

    // no ornamentals → no beauty, no aura
    assert.equal(gardenBeauty(s), 0)
    assert.equal(beautyMilestoneBonus(0, 'yield'), 0)

    // PHASE 44: own enough ornamentals in the gallery to cross the first milestone
    const ornamentals = PLANTS.filter((p) => p.beautyBonus)
    for (const p of ornamentals) s.ornamentals[p.id] = CONFIG.galleryMaxCopies
    const beauty = gardenBeauty(s)
    assert.ok(beauty > 0, 'owned ornamentals create beauty')
    assert.ok(s.plots.every((p) => p.plantId === null), 'beauty needs no plots')

    // crossing a threshold activates its garden-wide aura perk
    const first = BEAUTY_MILESTONES[0]
    assert.equal(beautyMilestoneBonus(first.beauty - 0.0001, first.effect), 0, 'inactive below threshold')
    assert.ok(beautyMilestoneBonus(first.beauty, first.effect) > 0, 'active at threshold')
    // milestones are cumulative and finite
    const top = BEAUTY_MILESTONES[BEAUTY_MILESTONES.length - 1].beauty
    let totalYield = 0
    for (const m of BEAUTY_MILESTONES) if (m.effect === 'yield') totalYield += m.value
    assert.ok(Math.abs(beautyMilestoneBonus(top, 'yield') - totalYield) < 1e-9, 'sums active yield perks')
    assert.ok(Number.isFinite(beautyMilestoneBonus(top, 'yield')))
  })
})

test('PHASE 18: Zier softcap, scratch scaling, skill expansion + respec, events', () => {
  withBoringRng(() => {
    // ── Zier softcap: high beauty is compressed, the build keeps value ──
    const z = fresh()
    z.totalEarned = 1e18
    // PHASE 44: stock the gallery with several copies of the strongest ornamentals
    const ornamentals = PLANTS.filter((p) => p.beautyBonus).sort((a, b) => b.beautyBonus - a.beautyBonus)
    let rawSum = 0
    for (let i = 0; i < 6; i++) {
      const p = ornamentals[i % ornamentals.length]
      z.ornamentals[p.id] = (z.ornamentals[p.id] ?? 0) + 5
      rawSum += p.beautyBonus * 5
    }
    const beauty = gardenBeauty(z)
    assert.ok(beauty > CONFIG.beautySoftcap, 'beauty still strong above the cap')
    assert.ok(beauty < rawSum, 'but compressed below the raw sum (softcap, not a wall)')
    assert.ok(Number.isFinite(beauty))

    // ── scratch gold scales with REAL income (yield × sell), not raw ──
    const a = fresh()
    a.totalEarned = 1e9
    const baseEff = effectiveHarvestValue(a)
    const b = fresh()
    b.totalEarned = 1e9
    b.skills = { gartenplanung: 1 } // +3 % yield
    b.parcels = 6
    b.compost = 1e6 // compost yield bonus
    assert.ok(effectiveHarvestValue(b) > baseEff, 'effective prize value follows the multipliers')
    assert.ok(Number.isFinite(effectiveHarvestValue(b)))

    // ── skill tree expansion + the luck branch are wired ──
    const s = fresh()
    s.parcels = 12
    s.achievementTiers = { ernte: 6, gold: 6, level: 6 } // plenty of points
    s.level = 100
    assert.ok(buySkill('gartenplanung'))
    assert.ok(buySkill('gluecksklee'), 'new luck branch buyable after the root')
    assert.ok(skillBonus(s, 'scratchLuck') > 0, 'gluecksklee feeds scratch luck')
    assert.ok(buySkill('erntefokus') && buySkill('ueppige_ernte'), 'deeper ernte node behind erntefokus')

    // ── respec clears skills for a compost fee, frees the points again ──
    const beforePts = availableSkillPoints(s)
    s.compost = CONFIG.skillRespecCompost
    assert.ok(respecSkills())
    assert.deepEqual(getState().skills, {}, 'respec clears all skills')
    assert.equal(getState().compost, 0, 'respec charged the compost fee')
    assert.ok(availableSkillPoints(getState()) > beforePts, 'points returned to the pool')
    assert.ok(!respecSkills(), 'nothing to respec / no compost → refused')

    // ── events are opportunities, wired & bounded ──
    const e = fresh()
    assert.equal(eventMasteryMult(e), 1)
    e.weather = { id: 'meistertag', remaining: 60 }
    assert.equal(eventMasteryMult(e), 2, 'Meistertag doubles mastery XP')
    e.weather = { id: 'erntefest', remaining: 60 }
    const plain = fresh()
    assert.ok(yieldMultiplier(e) > yieldMultiplier(plain), 'Erntefest lifts yield')
  })
})

test('PHASE 19: old saves migrate without a reward flood; late game stays open', () => {
  withBoringRng(() => {
    // a pre-v26 save (old achievements[] array, NO achievementTiers): a player
    // deep into the game. Migration must set tiers from stats WITHOUT paying
    // out the one-time rewards for every passed tier.
    const old = JSON.stringify({
      version: 25,
      savedAt: Date.now(),
      state: {
        money: 1e9,
        totalEarned: 1e9,
        lifetimeEarned: 1e12, // gold track: Bronze..Platin reached
        parcels: 10, // parcellen track: Bronze..Gold
        compost: 500,
        achievements: ['goldgrube', 'latifundium'], // old format, ignored
        stats: { planted: 1, harvested: 1e5, sold: 1, crits: 0 },
        selectedPlantId: 'basilikum',
        createdAt: 1,
      },
    })
    fresh()
    assert.notEqual(importSave(old), null)
    const m = getState()
    // tiers initialised from stats
    assert.equal(m.achievementTiers['gold'], 4, 'gold tier set from lifetimeEarned (1T → Platin)')
    assert.equal(m.achievementTiers['parzellen'], 3, 'parcel tier set from parcels (10 → Gold)')
    // NO retroactive one-time reward flood: compost stayed as saved (+0 from init)
    assert.equal(m.compost, 500, 'migration did not re-pay one-time rewards')
    // but permanent bonuses apply right away
    assert.ok(achievementBonus(m, 'yield') > 0, 'claimed tiers give their permanent yield')
    assert.ok(achievementSkillPoints(m) >= 2, 'high tiers grant achievement skill points')

    // late-game state: not everything is done — legendary tiers remain open
    const late = fresh()
    late.lifetimeEarned = 1e15
    late.parcels = 30
    late.stats.harvested = 1e7
    let openTracks = 0
    for (const def of ACHIEVEMENTS) if (reachedTier(late, def) < def.tiers.length) openTracks++
    assert.ok(openTracks >= 5, 'plenty of achievement tracks still have open tiers in the late game')

    // the goal panel surfaces an achievement target
    const goals = activeGoals(late)
    assert.ok(goals.some((g) => g.id === 'achievement'), 'achievement appears as a goal')
  })
})

test('PHASE 48: mini-campaign claims, rewards, migrates, surfaces as a goal', () => {
  withBoringRng(() => {
    // ── fresh start: a brand-new save begins at the very first chapter ──
    assert.equal(createDefaultState().campaign, 0, 'a brand-new save starts at the first chapter')

    // ── auto-claim: meeting a target pays the reward once and advances ──
    const s = fresh()
    s.campaign = 0 // re-open the campaign (fresh() finishes it for test isolation)
    assert.equal(currentCampaignStep(s).id, CAMPAIGN[0].id, 'current step is the first one')
    s.stats.planted = 5 // first step: säe 5
    const ticketsBefore = s.scratchTickets
    const done = claimCampaign(s)
    assert.ok(done.length >= 1 && done[0].id === 'first-seeds', 'first chapter auto-claims')
    assert.equal(s.campaign, 1, 'index advanced past the claimed step')
    assert.equal(s.scratchTickets, ticketsBefore + 3, 'first-seeds paid +3 tickets')
    // claiming again without new progress does nothing (no double pay)
    const again = claimCampaign(s)
    assert.equal(again.length, 0, 'no re-claim without fresh progress')
    assert.equal(s.scratchTickets, ticketsBefore + 3, 'reward not paid twice')

    // ── several steps at once: a big jump claims a run in one call ──
    const j = fresh()
    j.campaign = 0
    j.stats.planted = 100
    j.stats.harvested = 100
    j.totalEarned = 1e6
    const compostBefore = j.compost
    const run = claimCampaign(j)
    assert.ok(run.length >= 3, 'a multi-step jump claims the whole satisfied run')
    assert.ok(j.compost >= compostBefore, 'compost rewards accrued in the run')

    // ── migration: an old save (no campaign field) inits PAST satisfied steps
    //    WITHOUT paying rewards (no flood), resuming at the real frontier ──
    const mid = fresh()
    mid.stats.planted = 1000
    mid.stats.harvested = 1000
    mid.totalEarned = 1e9
    mid.stats.questsDone = 10
    mid.scratchTickets = 0
    mid.compost = 0
    initCampaign(mid)
    assert.ok(mid.campaign >= 4, 'migration skips every already-satisfied early chapter')
    assert.equal(mid.scratchTickets, 0, 'migration pays NO retroactive ticket rewards')
    assert.equal(mid.compost, 0, 'migration pays NO retroactive compost rewards')

    // a full save roundtrip preserves the campaign index
    const r = fresh()
    r.campaign = 4
    const code = exportSave()
    fresh()
    assert.notEqual(importSave(code), null)
    assert.equal(getState().campaign, 4, 'campaign index survives save/load')

    // ── the campaign chapter headlines the goal board ──
    const g = fresh()
    g.campaign = 0
    const board = goalBoard(g)
    const camp = board.find((x) => x.id === 'campaign')
    assert.ok(camp && camp.campaign === true, 'campaign goal is on the board')
    assert.equal(board[0].id, 'campaign', 'campaign goal headlines (first on the board)')
  })
})

test('PHASE 49: decorations buy, add beauty, render, persist, migrate', () => {
  withBoringRng(() => {
    // every decoration has a real 16×16 sprite registered
    for (const d of DECORATIONS) {
      const g = SPRITES[d.sprite]
      assert.ok(Array.isArray(g) && g.length === 16 && g.every((r) => r.length === 16), `${d.id} has a 16×16 sprite`)
    }

    // ── buy: spends gold, bumps the count, raises beauty ──
    const s = fresh()
    s.money = 1e7
    const d0 = DECORATIONS[0]
    assert.equal(decorationCount(s, d0.id), 0)
    assert.equal(ownsAnyDecoration(s), false)
    const beautyBefore = gardenBeauty(s)
    const cost = nextDecorationCost(d0, 0)
    assert.ok(buyDecoration(d0.id), 'first copy buys')
    assert.equal(getState().decorations[d0.id], 1, 'count bumped')
    assert.equal(getState().money, 1e7 - cost, 'gold spent')
    assert.ok(gardenBeauty(getState()) > beautyBefore, 'decoration raises garden beauty')
    assert.ok(ownsAnyDecoration(getState()), 'now owns a decoration')
    assert.ok(decorationBeauty(getState()) >= d0.beautyBonus - 1e-9, 'raw decoration beauty counted')

    // ── escalating cost + per-kind cap ──
    const s2 = fresh()
    s2.money = 1e12
    let last = 0
    for (let i = 0; i < CONFIG.decorationMaxCopies; i++) {
      const c = nextDecorationCost(d0, i)
      assert.ok(c > last, 'each copy costs strictly more')
      last = c
      assert.ok(buyDecoration(d0.id), `copy ${i + 1} buys`)
    }
    assert.equal(decorationCount(getState(), d0.id), CONFIG.decorationMaxCopies, 'reached the cap')
    assert.equal(nextDecorationCost(d0, CONFIG.decorationMaxCopies), Infinity, 'cost is Infinity at the cap')
    assert.equal(buyDecoration(d0.id), false, 'cannot buy past the cap')

    // ── can't afford → no purchase ──
    const poor = fresh()
    poor.money = 0
    assert.equal(buyDecoration(d0.id), false, 'no gold, no decoration')

    // ── save roundtrip + pre-v31 migration default ──
    const r = fresh()
    r.money = 1e7
    buyDecoration(DECORATIONS[1].id)
    const code = exportSave()
    fresh()
    assert.notEqual(importSave(code), null)
    assert.equal(getState().decorations[DECORATIONS[1].id], 1, 'decorations survive save/load')

    const old = JSON.stringify({
      version: 30,
      savedAt: Date.now(),
      state: { money: 5, totalEarned: 5, selectedPlantId: 'basilikum', stats: { planted: 0, harvested: 0, sold: 0 }, createdAt: 1 },
    })
    fresh()
    assert.notEqual(importSave(old), null)
    assert.deepEqual(getState().decorations, {}, 'pre-v31 save defaults to no decorations')
  })
})

test('PHASE 51: Weltensaat banks Sternensaat, resets the prestige layer, keeps meta', () => {
  withBoringRng(() => {
    const min = CONFIG.weltensaatMinParcels

    // ── gain gating ──
    const low = fresh()
    low.parcels = min - 1
    assert.equal(starseedGain(low), 0, 'no gain below the parcel threshold')
    assert.equal(canWeltensaat(low), false, 'not available below threshold')
    assert.equal(weltensaat(), 0, 'weltensaat is a no-op when ineligible')

    const at = fresh()
    at.parcels = min
    assert.equal(starseedGain(at), 1, 'exactly at threshold banks 1')
    const deep = fresh()
    deep.parcels = min + 9
    assert.equal(starseedGain(deep), 10, 'deeper worlds bank more (parcels − min + 1)')

    // ── the multiplier ──
    const m = fresh()
    assert.equal(worldseedYieldFactor(m), 1, 'no Sternensaat → factor 1')
    const before = yieldMultiplier(m)
    m.starseed = 5
    // PHASE 56: compounding — factor = (1 + per)^banked, not 1 + n·per
    assert.ok(Math.abs(worldseedYieldFactor(m) - Math.pow(1 + CONFIG.starseedYieldPer, 5)) < 1e-9, 'factor = (1+per)^banked')
    assert.ok(worldseedYieldFactor(m) > 1 + 5 * CONFIG.starseedYieldPer, 'compounding beats the old flat bonus')
    assert.ok(yieldMultiplier(m) > before, 'Sternensaat raises the global yield multiplier')
    // a deep player's bank (e.g. 79 from a parcel-98 world) is a real power spike,
    // not the old ×10.5 — and it stays finite even at absurd banks
    const deepBank = fresh()
    deepBank.starseed = 79
    assert.ok(worldseedYieldFactor(deepBank) > 1000, '79 Sternensaat is a ×1000+ spike, not ×10')
    const absurd = fresh()
    absurd.starseed = 1e6
    assert.ok(Number.isFinite(worldseedYieldFactor(absurd)), 'factor stays finite at absurd banks')

    // ── the reset: banks gain, wipes the prestige layer + round, keeps meta ──
    const s = fresh()
    s.parcels = min + 4 // gain 5
    s.compost = 500
    s.compostSpent = 200
    s.compostUpgrades = { tiefenmoor: 3 }
    s.money = 9_999
    s.totalEarned = 1e12
    s.lifetimeEarned = 5e12
    s.maxUnlockEarned = 1e12
    s.mastery = { erdbeere: 99999 }
    s.specializations = { beeren: 7 }
    s.skills = { gartenplanung: 2 }
    s.discoveredVariants = ['humusveilchen']
    s.ornamentals = { nachtrose: 2 }
    s.decorations = { teich: 1 }
    s.licenses = 3
    s.starseed = 2
    s.worldResets = 1

    const gained = weltensaat()
    const g = getState()
    assert.equal(gained, 5, 'banked the expected Sternensaat')
    assert.equal(g.starseed, 7, 'Sternensaat added to the bank')
    assert.equal(g.worldResets, 2, 'reset counter advanced')
    // prestige layer wiped — PHASE 61: + the 'Sternenpfad' world-2 milestone
    // head-start (worldResets is now 2), so parcels reset to 1 + that bonus
    assert.equal(g.parcels, 1 + worldMilestoneBonus(2, 'startParcels'), 'parcels reset to start (+ world milestone head-start)')
    assert.equal(g.compost, 0, 'compost wiped')
    assert.equal(g.compostSpent, 0, 'compostSpent wiped')
    assert.deepEqual(g.compostUpgrades, {}, 'compost-garden upgrades wiped')
    // round wiped
    assert.equal(g.money, CONFIG.startMoney, 'money back to start')
    assert.equal(g.totalEarned, 0, 'round earnings wiped')
    assert.equal(g.plots.length, CONFIG.startPlots, 'plots reset to start')
    // everything permanent survives
    assert.equal(g.lifetimeEarned, 5e12, 'lifetime stat kept')
    assert.equal(g.maxUnlockEarned, 1e12, 'unlock floor kept (no quest softlock)')
    assert.equal(g.mastery['erdbeere'], 99999, 'mastery kept')
    assert.equal(g.specializations['beeren'], 7, 'specialisations kept')
    assert.equal(g.skills['gartenplanung'], 2, 'skills kept')
    assert.deepEqual(g.discoveredVariants, ['humusveilchen'], 'variants kept')
    assert.equal(g.ornamentals['nachtrose'], 2, 'gallery kept')
    assert.equal(g.decorations['teich'], 1, 'decorations kept')
    assert.equal(g.licenses, 3, 'licenses kept')

    // ── save roundtrip + pre-v32 migration default ──
    const r = fresh()
    r.starseed = 12
    r.worldResets = 3
    const code = exportSave()
    fresh()
    assert.notEqual(importSave(code), null)
    assert.equal(getState().starseed, 12, 'Sternensaat survives save/load')
    assert.equal(getState().worldResets, 3, 'reset count survives save/load')

    const old = JSON.stringify({
      version: 31,
      savedAt: Date.now(),
      state: { money: 5, totalEarned: 5, selectedPlantId: 'basilikum', stats: { planted: 0, harvested: 0, sold: 0 }, createdAt: 1 },
    })
    fresh()
    assert.notEqual(importSave(old), null)
    assert.equal(getState().starseed, 0, 'pre-v32 save defaults Sternensaat to 0')
    assert.equal(getState().worldResets, 0, 'pre-v32 save defaults reset count to 0')
  })
})

test('PHASE 53: Sternenkammer spends Sternensaat without weakening the flat bonus', () => {
  withBoringRng(() => {
    const yieldDef = STAR_UPGRADES.find((u) => u.effect === 'yield')
    const compostDef = STAR_UPGRADES.find((u) => u.effect === 'compostGain')
    const startDef = STAR_UPGRADES.find((u) => u.effect === 'startParcels')

    // ── flat banked bonus uses starseed + starseedSpent (spending never weakens) ──
    const s = fresh()
    s.starseed = 10
    const factorBefore = worldseedYieldFactor(s)
    const ymBefore = yieldMultiplier(s)
    assert.equal(starseedBanked(s), 10, 'banked = pool when nothing spent')
    const cost0 = starUpgradeCost(yieldDef, 0)
    assert.ok(buyStarUpgrade(yieldDef.id), 'buy first yield level')
    const g = getState()
    assert.equal(g.starseed, 10 - cost0, 'Sternensaat spent from the pool')
    assert.equal(g.starseedSpent, cost0, 'spent tracked separately')
    assert.equal(starseedBanked(g), 10, 'total banked unchanged by spending')
    assert.ok(Math.abs(worldseedYieldFactor(g) - factorBefore) < 1e-9, 'flat yield bonus NOT weakened by spending')
    assert.equal(starUpgradeLevel(g, yieldDef.id), 1, 'upgrade level bumped')
    assert.ok(starUpgradeBonus(g, 'yield') >= yieldDef.perLevel - 1e-9, 'yield bonus applies')
    assert.ok(yieldMultiplier(g) > ymBefore, 'Sternenkammer yield raises the multiplier')

    // ── can't afford → no buy ──
    const poor = fresh()
    poor.starseed = 0
    assert.equal(buyStarUpgrade(yieldDef.id), false, 'no Sternensaat, no upgrade')

    // ── compostGain upgrade raises the next prestige gain ──
    const c = fresh()
    c.lifetimeEarned = 1e12
    const gainBase = compostGain(c)
    c.starUpgrades = { [compostDef.id]: 3 }
    assert.ok(compostGain(c) > gainBase, 'Sternendünger raises compost gain')

    // ── startParcels gives a head-start on the Weltensaat reset ──
    const w = fresh()
    w.parcels = CONFIG.weltensaatMinParcels + 2
    w.starUpgrades = { [startDef.id]: 4 }
    weltensaat()
    assert.equal(getState().parcels, 1 + 4, 'Sternenkeim head-starts the re-climb')

    // ── save roundtrip + pre-v33 migration default ──
    const r = fresh()
    r.starseed = 5
    r.starseedSpent = 7
    r.starUpgrades = { [yieldDef.id]: 2 }
    const code = exportSave()
    fresh()
    assert.notEqual(importSave(code), null)
    assert.equal(getState().starseedSpent, 7, 'starseedSpent survives save/load')
    assert.equal(getState().starUpgrades[yieldDef.id], 2, 'star upgrades survive save/load')

    const old = JSON.stringify({
      version: 32,
      savedAt: Date.now(),
      state: { money: 5, totalEarned: 5, starseed: 4, selectedPlantId: 'basilikum', stats: { planted: 0, harvested: 0, sold: 0 }, createdAt: 1 },
    })
    fresh()
    assert.notEqual(importSave(old), null)
    assert.equal(getState().starseedSpent, 0, 'pre-v33 save defaults starseedSpent to 0')
    assert.deepEqual(getState().starUpgrades, {}, 'pre-v33 save defaults star upgrades to {}')
    assert.equal(getState().starseed, 4, 'existing Sternensaat preserved through migration')
  })
})

test('PHASE 54: the campaign extends through the Weltensaat/Sternenkammer endgame', () => {
  withBoringRng(() => {
    // the chain now reaches the higher-prestige content
    const ids = CAMPAIGN.map((c) => c.id)
    for (const id of ['world-ready', 'world-sower', 'star-chamber', 'star-gardener']) {
      assert.ok(ids.includes(id), `campaign has the ${id} endgame chapter`)
    }

    // a deep player who satisfies every chapter claims the WHOLE chain at once
    const s = fresh()
    s.campaign = 0
    s.stats.planted = 1000
    s.stats.harvested = 1000
    s.totalEarned = 1e9
    s.stats.questsDone = 50
    s.plots = Array.from({ length: 30 }, () => ({ plantId: null, progress: 0, waterLeft: 0, regrowing: false }))
    s.stats.scratchesDone = 50
    s.parcels = 30
    s.specializations = { beeren: 4 }
    s.records.bestBeauty = 1
    s.mastery = { erdbeere: 1e9 }
    s.discoveredVariants = ['a', 'b', 'c', 'd']
    s.worldResets = 5
    s.starUpgrades = { sternenfeuer: 2 }
    claimCampaign(s)
    assert.equal(getState().campaign, CAMPAIGN.length, 'a maxed deep state finishes the whole campaign')

    // a player at parcel 8 (old end) now has the next chapter waiting, not "done"
    const mid = fresh()
    mid.campaign = 0
    mid.stats.planted = 1000
    mid.stats.harvested = 1000
    mid.totalEarned = 1e9
    mid.stats.questsDone = 50
    mid.plots = Array.from({ length: 30 }, () => ({ plantId: null, progress: 0, waterLeft: 0, regrowing: false }))
    mid.stats.scratchesDone = 50
    mid.parcels = 8
    mid.specializations = { beeren: 4 }
    mid.records.bestBeauty = 1
    mid.mastery = { erdbeere: 1e9 }
    mid.discoveredVariants = ['a', 'b', 'c', 'd']
    claimCampaign(mid)
    assert.ok(getState().campaign < CAMPAIGN.length, 'the endgame chapters remain ahead of a parcel-8 player')
    assert.equal(currentCampaignStep(getState()).id, 'landlord', 'next chapter is the first endgame one')
  })
})

test('PHASE 69/72: creatures — attract, befriend, roam-and-collect gifts, bonus, save', () => {
  const s = fresh()
  const bee = creatureById('biene') // attract: beauty ≥ 0.5
  assert.equal(isCreatureAttracted(s, bee, 0), false, 'bee needs a blooming garden')
  assert.equal(befriendCreature(s, 'biene', 0, 1000), false, 'cannot befriend before attracted')
  assert.equal(isCreatureAttracted(s, bee, 1), true, 'beauty 1 attracts the bee')
  assert.equal(befriendCreature(s, 'biene', 1, 1000), true, 'befriended at t=1000')
  assert.equal(creatureLevel(s, 'biene'), 1, 'friendship level 1')
  assert.equal(befriendCreature(s, 'biene', 1, 1000), false, 'cannot befriend twice')

  // PHASE 72: a gift cooks on a real-time timer — not ready right away, then ready
  assert.equal(isGiftReady(s, 'biene', 1000), false, 'no gift right after befriending')
  const done = 1000 + bee.giftSeconds * 1000
  assert.equal(isGiftReady(s, 'biene', done), true, 'gift ready after giftSeconds')
  assert.equal(collectGift(s, 'biene', 1000), null, 'cannot collect early')

  // collecting grants the reward, raises friendship, and restarts the timer
  const ticketsBefore = s.scratchTickets
  const fertBefore = s.fertilizerCharges
  const reward = collectGift(s, 'biene', done)
  assert.ok(reward && reward.amount > 0, 'collected a gift')
  const got = bee.gift === 'tickets' ? s.scratchTickets - ticketsBefore : s.fertilizerCharges - fertBefore
  assert.equal(got, reward.amount, 'reward currency granted')
  assert.equal(creatureLevel(s, 'biene'), 2, 'friendship rose on collect')
  assert.equal(isGiftReady(s, 'biene', done), false, 'timer restarted after collect')
  assert.ok(giftReward(bee, 5).amount > giftReward(bee, 1).amount, 'higher friendship → bigger gift')

  // bonus feeds the permanent multipliers
  const base = yieldMultiplier(fresh())
  const g = fresh()
  g.creatures = { schmetterling: 5 } // a yield creature
  assert.ok(creatureBonus(g, 'yield') > 0 && yieldMultiplier(g) > base, 'creatures lift the yield multiplier')

  // the ladybug is attractable from the very start (level ≥ 1)
  assert.equal(isCreatureAttracted(fresh(), creatureById('marienkaefer'), 0), true, 'ladybug from the start')

  // PHASE 80: new creatures tied to the other systems (expeditions metric)
  const squirrel = creatureById('eichhoernchen')
  assert.ok(squirrel && squirrel.attract.kind === 'expeditions', 'squirrel drawn by expeditions')
  const e = fresh()
  assert.equal(isCreatureAttracted(e, squirrel, 0), false, 'squirrel needs expeditions done')
  e.expeditionsDone = 3
  assert.equal(isCreatureAttracted(e, squirrel, 0), true, 'squirrel attracted after 3 expeditions')

  // save round-trip (friendship + gift timers)
  const s3 = fresh()
  s3.creatures = { igel: 3 }
  s3.creatureGifts = { igel: 5000 }
  const blob = exportSave()
  replaceState(createDefaultState())
  importSave(blob)
  assert.equal(getState().creatures.igel, 3, 'friendship persists through save/load')
  assert.equal(getState().creatureGifts.igel, 5000, 'gift timer persists')
})

test('PHASE 78: creature companion boosts risky expeditions', () => {
  const s = fresh()
  s.money = 1e30
  // bonus needs a befriended creature, scales per level, capped at +30%
  assert.equal(companionRiskBonus(s, 'fuchs'), 0, 'unbefriended companion → no bonus')
  s.creatures = { fuchs: 10 }
  assert.ok(Math.abs(companionRiskBonus(s, 'fuchs') - 0.2) < 1e-9, 'level 10 → +20% (0.02/level)')
  s.creatures = { fuchs: 100 }
  assert.ok(companionRiskBonus(s, 'fuchs') <= 0.3 + 1e-9, 'capped at +30%')

  // starting with a companion stores it; a non-befriended one is dropped
  s.creatures = { fuchs: 5 }
  const now = 1000
  startExpedition(s, 'wiese', 'igel', now) // igel not befriended → dropped
  assert.equal(s.activeExpedition.companion, undefined, 'invalid companion dropped')
  s.activeExpedition = null
  startExpedition(s, 'wiese', 'fuchs', now)
  assert.equal(s.activeExpedition.companion, 'fuchs', 'valid companion stored')

  // the risky claim uses the boosted chance (would fail without the companion)
  s.creatures = { fuchs: 15 } // +30% → wiese 0.6 + 0.3 = 0.9
  const done = now + expeditionById('wiese').durationSeconds * 1000
  const orig = Math.random
  Math.random = () => 0.85 // fails at 0.6, succeeds at 0.9
  const r = claimExpedition(s, 'risky', done)
  Math.random = orig
  assert.ok(r && r.success, 'companion bonus pushed the risky roll to success')

  // companion survives save/load
  const s2 = fresh()
  s2.activeExpedition = { id: 'wiese', endsAt: 5_000_000, companion: 'fuchs' }
  const blob = exportSave()
  replaceState(createDefaultState())
  importSave(blob)
  assert.equal(getState().activeExpedition.companion, 'fuchs', 'companion persists through save/load')
})

test('PHASE 76: expedition return events + double-reward mode', () => {
  // an event is stable per trip (derived from endsAt) and has valid options
  const ev = expeditionEvent(123456000)
  assert.ok(ev && ev.options.length >= 2, 'event has at least two options')
  assert.equal(expeditionEvent(123456000).id, ev.id, 'event stable for the same endsAt')
  for (const e of EXPEDITION_EVENTS)
    for (const o of e.options) assert.ok(['safe', 'risky', 'double'].includes(o.mode), `valid mode ${o.mode}`)

  // the 'double' option grants two guaranteed relics from the safe pool
  const s = fresh()
  s.money = 1e30
  const now = 1000
  startExpedition(s, 'wiese', undefined, now)
  const done = now + expeditionById('wiese').durationSeconds * 1000
  const r = claimExpedition(s, 'double', done)
  assert.ok(r && r.copies === 2, 'double yields two copies')
  assert.equal(totalRelics(s), 2, 'two relics collected')
})

test('PHASE 68: expeditions — real-time gate, relics, press-your-luck claim', () => {
  const s = fresh()
  s.money = 1e30
  const wiese = expeditionById('wiese')
  assert.ok(isExpeditionUnlocked(wiese, 0), 'wiese available from the start')
  const sternenpfad = expeditionById('sternenpfad')
  assert.ok(!isExpeditionUnlocked(sternenpfad, 0), 'sternenpfad gated by worlds')
  assert.ok(isExpeditionUnlocked(sternenpfad, 1), 'sternenpfad unlocks after a world')

  // start: one slot, costs gold, sets a wall-clock timer
  const now = 1_000_000
  assert.equal(startExpedition(s, 'wiese', undefined, now), true, 'started an expedition')
  assert.ok(s.activeExpedition && s.activeExpedition.id === 'wiese', 'slot occupied')
  assert.equal(s.money, 1e30 - wiese.cost, 'gold cost deducted')
  assert.equal(startExpedition(s, 'wald', undefined, now), false, 'only one expedition at a time')

  // not claimable until the duration elapses (real time, runaway-proof)
  assert.equal(expeditionReady(s, now + 1000), false, 'still travelling')
  assert.equal(claimExpedition(s, 'safe', now + 1000), null, 'cannot claim early')
  const done = now + wiese.durationSeconds * 1000
  assert.equal(expeditionReady(s, done), true, 'returned after the duration')

  // safe claim always grants exactly one relic from the safe pool
  const r = claimExpedition(s, 'safe', done)
  assert.ok(r && r.success && r.relicId && wiese.safePool.includes(r.relicId), 'safe relic from pool')
  assert.equal(relicCount(s, r.relicId), 1, 'relic added to the collection')
  assert.equal(s.activeExpedition, null, 'slot freed after claim')
  assert.equal(s.expeditionsDone, 1, 'completed stat advanced')

  // relics feed the permanent multipliers (survive prestige + Weltensaat)
  const baseYield = yieldMultiplier(fresh())
  const g = fresh()
  g.relics = { weltenkern: 3 }
  assert.ok(relicBonus(g, 'yield') > 0 && yieldMultiplier(g) > baseYield, 'relics lift the yield multiplier')

  // risky claim can miss (forced fail above the success chance)
  const s2 = fresh()
  s2.money = 1e30
  startExpedition(s2, 'wiese', undefined, now)
  const orig = Math.random
  Math.random = () => 0.999
  const miss = claimExpedition(s2, 'risky', done)
  Math.random = orig
  assert.ok(miss && !miss.success && miss.relicId === null, 'a risky miss grants nothing')
  assert.equal(totalRelics(s2), 0, 'no relic on a miss')

  // save round-trip: active expedition, relics and the stat all persist
  const s3 = fresh()
  s3.relics = { sonnenstein: 2 }
  s3.activeExpedition = { id: 'wald', endsAt: 5_000_000 }
  s3.expeditionsDone = 3
  const blob = exportSave()
  replaceState(createDefaultState())
  importSave(blob)
  const loaded = getState()
  assert.equal(loaded.relics.sonnenstein, 2, 'relics persist through save/load')
  assert.ok(loaded.activeExpedition && loaded.activeExpedition.id === 'wald', 'active expedition persists')
  assert.equal(loaded.expeditionsDone, 3, 'completed stat persists')
})

test('PHASE 84: deep level + parcels survive save/load (no stale clamp)', () => {
  const s = fresh()
  s.level = 1_141_199
  s.parcels = 5000
  s.maxParcels = 5000
  const before = totalSkillPoints(s)
  const blob = exportSave()
  replaceState(createDefaultState())
  importSave(blob)
  const g = getState()
  assert.equal(g.level, 1_141_199, 'million-level survives load (was clamped to 9999)')
  assert.equal(g.parcels, 5000, 'deep parcels survive load (was clamped to 1000)')
  assert.equal(g.maxParcels, 5000, 'maxParcels survives load')
  assert.equal(totalSkillPoints(g), before, 'skill points are not crushed on reload')
})

test('PHASE 67: skill points use the parcel high-water mark, survive Weltensaat', () => {
  const s = fresh()
  s.parcels = CONFIG.weltensaatMinParcels + 25
  s.maxParcels = s.parcels
  const hw = s.maxParcels
  const pool = totalSkillPoints(s)
  assert.ok(pool >= hw - 1, 'deep prestige grants skill points')
  // sowing a world resets parcels — the skill pool must NOT drop (no re-climb)
  weltensaat()
  const g = getState()
  assert.ok(g.parcels < CONFIG.weltensaatMinParcels, 'Weltensaat reset the parcel count')
  assert.equal(g.maxParcels, hw, 'high-water mark kept through Weltensaat')
  assert.equal(totalSkillPoints(g), pool, 'skill pool unchanged after a world reset')

  // leasing a parcel raises the high-water mark
  const s2 = fresh()
  s2.parcels = 10
  s2.maxParcels = 10
  s2.lifetimeEarned = 1e30
  assert.ok(leaseParcel() > 0, 'leased a parcel')
  assert.ok(getState().maxParcels >= 11, 'leasing raises the high-water mark')
})

test('PHASE 65: cosmic decorations gate on worlds sown (Weltensaat reward)', () => {
  const portal = DECORATIONS.find((d) => d.id === 'sternenportal')
  assert.ok(portal && portal.unlockWorlds === 1, 'Sternenportal needs 1 world')
  assert.ok(!isDecorationUnlocked(portal, 0), 'locked at 0 worlds')
  assert.ok(isDecorationUnlocked(portal, 1), 'unlocked at 1 world')

  const s = fresh()
  s.money = 1e12
  s.worldResets = 0
  assert.equal(purchaseDecoration(s, 'sternenportal'), false, 'world-locked deco cannot be bought')
  assert.equal(decorationCount(s, 'sternenportal'), 0, 'nothing placed while locked')
  s.worldResets = 1
  assert.equal(purchaseDecoration(s, 'sternenportal'), true, 'buyable after the first Weltensaat')
  assert.ok(decorationBeauty(s) > 0, 'placed cosmic deco adds beauty')

  // an ungated deco is always buyable, no worlds required
  const s2 = fresh()
  s2.money = 1e12
  assert.equal(purchaseDecoration(s2, 'steinweg'), true, 'ungated deco buyable from the start')
})

test('PHASE 63: helpers can be paused and the choice round-trips through save', () => {
  const s = fresh()
  s.upgrades = { marktkarren: 3, erntehelfer: 5, saegnom: 2 }
  assert.ok(isHelperUpgrade(upgradeById('marktkarren')), 'marktkarren is a pausable helper')
  assert.ok(!isHelperUpgrade(upgradeById('duenger')), 'duenger (yield upgrade) is not a helper')
  assert.ok(Number.isFinite(autoSellInterval(s)), 'market cart sells on a finite interval')
  assert.ok(autoHarvestRate(s) > 0 && autoSowRate(s) > 0, 'helpers run')

  toggleHelperPause('marktkarren')
  assert.deepEqual(getState().pausedHelpers, ['marktkarren'], 'pause recorded')
  assert.equal(autoSellInterval(getState()), Infinity, 'paused market cart never sells')
  assert.ok(autoHarvestRate(getState()) > 0, 'other helpers unaffected')

  // round-trips through save/load; invalid + non-helper ids are dropped
  getState().pausedHelpers.push('not-a-helper', 'duenger')
  const blob = exportSave()
  replaceState(createDefaultState())
  importSave(blob)
  assert.deepEqual(getState().pausedHelpers, ['marktkarren'], 'only valid helper ids survive load')

  toggleHelperPause('marktkarren')
  assert.equal(getState().pausedHelpers.length, 0, 'resume clears the pause')
})

test('PHASE 62: Sternenkammer expansion — new star effects sum and wire through', () => {
  const s = fresh()
  s.starUpgrades = { sternenmarkt: 5, sternengilde: 3, sternenschlaf: 4, sternenglueck: 2 }
  assert.ok(Math.abs(starUpgradeBonus(s, 'sellPrice') - 0.25) < 1e-9, 'Sternenmarkt +5%/lvl ×5 = +25% sell')
  assert.ok(Math.abs(starUpgradeBonus(s, 'questReward') - 0.3) < 1e-9, 'Sternengilde +10%/lvl ×3')
  assert.ok(Math.abs(starUpgradeBonus(s, 'offline') - 4) < 1e-9, 'Sternenschlaf +1h/lvl ×4')
  assert.ok(Math.abs(starUpgradeBonus(s, 'ticketLuck') - 0.08) < 1e-9, 'Sternenglück +4%/lvl ×2')
  // end-to-end through the live modifier functions (proves the wiring points)
  const base = fresh()
  assert.ok(offlineCapHours(s) > offlineCapHours(base), 'Sternenschlaf lifts the offline cap')
  assert.ok(scratchDropChance(s, 600) > scratchDropChance(base, 600), 'Sternenglück lifts ticket luck')
})

test('PHASE 61: world milestones grant permanent, derived perks from worldResets', () => {
  // summation + gating
  assert.equal(worldMilestoneBonus(0, 'yield'), 0, 'no worlds → no bonus')
  assert.equal(worldMilestoneBonus(1, 'yield'), 0.25, 'world 1 → +25% yield')
  assert.equal(worldMilestoneBonus(20, 'yield'), 0.25 + 1.5, 'reached yield milestones sum (world 1 + 12)')
  assert.equal(worldMilestoneBonus(5, 'starseedGain'), 1, 'world 5 → +1 Sternensaat/sowing')
  assert.equal(worldMilestoneBonus(20, 'starseedGain'), 1 + 2, 'world 5 + 20 stack')
  assert.equal(nextWorldMilestone(0)?.world, 1, 'next from 0 is world 1')
  assert.equal(nextWorldMilestone(20), null, 'all reached past the last')
  assert.equal(WORLD_MILESTONES.length, 8, 'eight world milestones')

  // integration: more worlds → higher yield multiplier (derived, no save field)
  const a = fresh()
  const b = fresh()
  b.worldResets = 12
  assert.ok(yieldMultiplier(b) > yieldMultiplier(a), 'world milestones lift the yield multiplier')
  assert.ok(growthMultiplier(b) > growthMultiplier(a), 'and the growth multiplier')

  // integration: starseedGain folds in the milestone bonus
  const deep = fresh()
  deep.parcels = CONFIG.weltensaatMinParcels // depth bonus = 1
  assert.equal(starseedGain(deep), 1, 'no worlds yet → just the depth')
  deep.worldResets = 5
  assert.equal(starseedGain(deep), 1 + 1, 'world-5 milestone adds +1 Sternensaat per sowing')

  // PHASE 66: endless yield tier past the last fixed milestone (never stops)
  assert.equal(worldMilestoneBonus(20, 'yield'), 0.25 + 1.5, 'at world 20: only fixed yield milestones')
  assert.ok(worldMilestoneBonus(25, 'yield') > worldMilestoneBonus(20, 'yield'), 'past 20 keeps growing')
  assert.ok(
    Math.abs(worldMilestoneBonus(30, 'yield') - worldMilestoneBonus(20, 'yield') - 10 * 0.02) < 1e-9,
    '10 worlds past the last milestone = +20% endless yield'
  )
  const e1 = fresh()
  const e2 = fresh()
  e2.worldResets = 50
  assert.ok(yieldMultiplier(e2) > yieldMultiplier(e1), 'endless world tier lifts the yield multiplier')
})

test('PHASE 60: plot timer reflects REAL seconds, not raw growth-progress units', () => {
  // The bug: the tile showed formatDuration(target−progress), but progress is in
  // growth-adjusted units — at a huge growth multiplier a floored cosmic crop
  // that read "10h" actually ripens in ~floor seconds. The tile must derive its
  // remaining time from effectiveCycleSeconds (real time).
  const s = fresh()
  s.parcels = 98
  s.compost = 1e9
  s.compostSpent = 1e19
  s.level = 1141199
  s.licenses = 5
  const def = plantById('sternensaat')
  const real = effectiveCycleSeconds(s, def, false)
  assert.ok(real <= CONFIG.minCycleFloorSeconds + 0.01, `real cycle ~floor (${real.toFixed(2)}s)`) // ~3s
  assert.ok(real < def.growTime / 1000, 'real time is orders of magnitude below raw growTime units')
  assert.ok(real < 10, 'a deep-prestige cosmic plot ripens in seconds, not hours')
})

test('PHASE 59: number/duration formatting is robust at extreme scale', () => {
  // normal cases
  assert.equal(formatNumber(999), '999')
  assert.equal(formatNumber(1500), '1.5K')
  assert.equal(formatNumber(1e6), '1M')
  assert.equal(formatDuration(0), '0s')
  assert.equal(formatDuration(3661), '1h 1m')
  // extreme scale — the user plays at parcel ~98, 2e47 earnings, ×1e300 factors
  assert.equal(formatNumber(2.1e47), '2.10e47')
  assert.equal(formatNumber(1e300), '1.00e300')
  assert.equal(formatNumber(Infinity), '∞')
  // the bug: formatDuration must NOT render "Infinityd NaNh" / "NaNd NaNh"
  assert.equal(formatDuration(Infinity), '∞', 'non-finite duration → ∞, not garbage')
  assert.equal(formatDuration(NaN), '∞', 'NaN duration → ∞, not garbage')
  assert.ok(!formatDuration(1e9).includes('NaN'), 'huge finite duration has no NaN')
  assert.equal(formatDuration(-5), '0s', 'negative clamps to 0s')
})

test('PHASE 71: goal panel surfaces a returned expedition + new-system nudges', () => {
  const s = fresh()
  s.activeExpedition = { id: 'wiese', endsAt: Date.now() - 1000 } // already returned
  const g = activeGoals(s).find((x) => x.id === 'expedition-claim')
  assert.ok(g && g.ready, 'returned expedition shows a ready claim goal')
  // not while still travelling
  const s2 = fresh()
  s2.activeExpedition = { id: 'wiese', endsAt: Date.now() + 60_000 }
  assert.ok(!activeGoals(s2).some((x) => x.id === 'expedition-claim'), 'no claim goal while travelling')
  // first-time discovery nudge for the new systems is offered to a fresh player
  const s3 = fresh()
  s3.money = 1e9
  const ids = activeGoals(s3).map((x) => x.id)
  assert.ok(ids.includes('build-expedition') || ids.includes('build-tier'), 'a new-system nudge is offered')
})

test('PHASE 70: achievement tracks for expeditions, relics and creatures', () => {
  const expDef = ACHIEVEMENTS.find((a) => a.id === 'expeditionen')
  const relDef = ACHIEVEMENTS.find((a) => a.id === 'relikte')
  const tierDef = ACHIEVEMENTS.find((a) => a.id === 'tierfreund')
  assert.ok(expDef && relDef && tierDef, 'all three new tracks exist')

  const s = fresh()
  assert.equal(reachedTier(s, expDef), 0, 'no expeditions → tier 0')
  s.expeditionsDone = 15
  assert.equal(reachedTier(s, expDef), 3, '15 expeditions → tier 3')
  s.relics = { weltenkern: 6, sonnenstein: 4 } // 10 total
  assert.equal(reachedTier(s, relDef), 4, '10 relics → tier 4')
  s.creatures = { biene: 2, igel: 1 } // 2 befriended
  assert.equal(reachedTier(s, tierDef), 2, '2 creatures befriended → tier 2')

  // claimed tiers add a permanent bonus (ties the systems into the economy)
  const before = achievementBonus(s, 'yield')
  s.achievementTiers = { expeditionen: 6 }
  assert.ok(achievementBonus(s, 'yield') > before, 'claimed expedition tiers add permanent yield')
})

test('PHASE 58: Weltensaat achievement track rewards worlds sown', () => {
  const def = ACHIEVEMENTS.find((a) => a.id === 'weltensaat')
  assert.ok(def, 'Weltenwanderer track exists')
  const s = fresh()
  s.worldResets = 0
  assert.equal(reachedTier(s, def), 0, 'no worlds → no tier')
  s.worldResets = 3
  assert.equal(reachedTier(s, def), 3, '3 worlds → tier 3 (Gold)')
  s.worldResets = 20
  assert.equal(reachedTier(s, def), 6, '20 worlds → tier 6 (Legendär)')
  const before = achievementBonus(s, 'yield')
  s.achievementTiers = { weltensaat: 6 }
  assert.ok(achievementBonus(s, 'yield') > before, 'claimed Weltensaat tiers add permanent yield')
})

test('PHASE 20: seed lab crosses, discovers, applies bonus, persists', () => {
  withBoringRng(() => {
    // ── pure eligibility checks (crossEligibility takes the state directly) ──
    const locked = fresh()
    locked.money = 1e9
    locked.totalEarned = 0
    assert.equal(crossEligibility(locked, 'basilikum', 'tomate').status, 'locked-parents')
    assert.equal(crossEligibility(locked, 'basilikum', 'basilikum').status, 'same')
    assert.equal(crossEligibility(locked, 'basilikum', 'schnittlauch').status, 'nomatch')
    const reqState = fresh()
    reqState.totalEarned = 1e18
    reqState.money = 1e12
    reqState.compost = 1e6
    reqState.parcels = 1
    assert.equal(crossEligibility(reqState, 'weltenbaum', 'weltenrose').status, 'locked-req', 'parcel/mastery gate')

    // ── main flow: crossPlants acts on the LIVE state, so build it last ──
    const s = fresh()
    s.totalEarned = 1e6 // unlock both parents
    s.money = 1e6
    s.inventory = { basilikum: 100, tomate: 100 } // PHASE 21: produce for the recipe
    const v = VARIANTS.find((x) => x.id === 'mediterrane-tomate')
    const moneyBefore = s.money
    const yieldBefore = yieldMultiplier(s)
    const out = crossPlants('basilikum', 'tomate')
    assert.ok(out.ok && out.variantId === 'mediterrane-tomate')
    assert.equal(s.money, moneyBefore - v.goldCost, 'gold cost deducted')
    assert.equal(s.inventory['basilikum'], 80, 'produce consumed (20 basil)')
    assert.ok(isDiscovered(s, 'mediterrane-tomate'))
    assert.ok(Math.abs(variantBonus(s, 'yield') - v.value) < 1e-9, 'variant yield bonus registered')
    assert.ok(yieldMultiplier(s) > yieldBefore, 'discovered variant lifts yield')

    // crossing again is a no-op (already discovered, no double charge)
    const moneyAfter = s.money
    assert.equal(crossPlants('basilikum', 'tomate').ok, false, 'already discovered')
    assert.equal(s.money, moneyAfter, 'no double charge')

    // the goal panel surfaces a seed-lab goal
    assert.ok(activeGoals(s).some((gl) => gl.id === 'variant'), 'seed lab appears as a goal')

    // discovery survives prestige AND a save roundtrip
    s.lifetimeEarned = 1e12
    s.totalEarned = 1e12
    assert.ok(leaseParcel() > 0)
    assert.ok(getState().discoveredVariants.includes('mediterrane-tomate'), 'survives prestige')
    const code = exportSave()
    fresh()
    importSave(code)
    assert.ok(getState().discoveredVariants.includes('mediterrane-tomate'), 'survives save/load')

    // ── a compost-cost recipe deducts compost too (fresh live state) ──
    const g = fresh()
    g.totalEarned = 1e18
    g.money = 1e12
    g.compost = 100
    g.parcels = 5
    const hum = VARIANTS.find((x) => x.id === 'humusveilchen')
    const compostBefore = g.compost
    assert.ok(crossPlants('veilchen', 'ringelblume').ok, 'compost recipe works')
    assert.equal(g.compost, compostBefore - hum.compostCost, 'compost cost deducted')

    // ── old saves migrate: no discoveredVariants field → empty collection ──
    const old = JSON.stringify({
      version: 26,
      savedAt: Date.now(),
      state: { money: 1, totalEarned: 1, selectedPlantId: 'basilikum', stats: { planted: 0, harvested: 0, sold: 0, crits: 0 }, createdAt: 1 },
    })
    fresh()
    assert.notEqual(importSave(old), null)
    assert.deepEqual(getState().discoveredVariants, [], 'old saves load with an empty collection')
  })
})

test('PHASE 21: produce costs (free only), event synergy, skill discount', () => {
  withBoringRng(() => {
    // ── produce costs consume only FREE (unreserved) storage ──
    const s = fresh()
    s.totalEarned = 1e6
    s.money = 1e9
    // recipe needs 20 basilikum + 10 tomate; give 25 basil but reserve most via a quest
    s.inventory = { basilikum: 25, tomate: 50 }
    s.quests = [{
      id: 1, kind: 'single', items: [{ plantId: 'basilikum', amount: 20 }],
      reward: 1, rewardTickets: 0, rewardCompost: 0, xp: 1, tier: 'bronze', client: 'X', skipCooldown: 0,
    }]
    // only 25 − 20 = 5 basil are free → not enough for the 20 needed
    assert.equal(freeStock(s, 'basilikum'), 5, 'reserved stock is not free')
    assert.equal(crossEligibility(s, 'basilikum', 'tomate').status, 'missing-produce', 'reserved stock blocks the cross')
    assert.equal(crossPlants('basilikum', 'tomate').ok, false, 'cross refused on missing free produce')
    assert.equal(s.inventory['basilikum'], 25, 'nothing consumed when refused')

    // drop the order → now the basil is free and the cross succeeds, consuming produce
    s.quests = []
    const produce = produceStatus(s, { ...crossEligibility(s, 'basilikum', 'tomate').variant })
    assert.ok(produce.every((p) => p.ok), 'all produce free now')
    assert.ok(crossPlants('basilikum', 'tomate').ok, 'cross works with free produce')
    assert.equal(s.inventory['basilikum'], 5, '20 basil consumed')
    assert.equal(s.inventory['tomate'], 40, '10 tomate consumed')

    // ── event synergy: discovering Humusveilchen boosts Komposttag ──
    const e = fresh()
    e.totalEarned = 1e18
    e.lifetimeEarned = 1e12
    assert.equal(variantEventBonus(e, 'komposttag'), 0)
    e.discoveredVariants = ['humusveilchen']
    assert.ok(Math.abs(variantEventBonus(e, 'komposttag') - 0.5) < 1e-9, 'variant tied to its event')
    e.weather = { id: 'komposttag', remaining: 60 }
    const withVariant = compostGain(e)
    e.discoveredVariants = []
    assert.ok(withVariant > compostGain(e), 'Humusveilchen makes Komposttag stronger')

    // ── skill discount lowers the effective gold cost ──
    const g = fresh()
    const v = { goldCost: 1e6, value: 0, parents: ['a', 'b'] }
    assert.equal(effectiveGoldCost(g, v), 1e6, 'no discount without the skill')
    g.skills = { saatgutforschung: 2 } // −30 %
    assert.equal(effectiveGoldCost(g, v), 700000, 'Saatgut-Forschung discounts gold cost')
  })
})

test('PHASE 22/44: discovery-gated special ornamental lives in the Ziergalerie', () => {
  withBoringRng(() => {
    const sp = SPECIAL_PLANTS.find((p) => p.id === 'spv-prachtorchidee')
    assert.ok(sp && sp.special && sp.unlockVariant === 'prachtorchidee')
    assert.ok(plantById('spv-prachtorchidee'), 'special plant resolves via plantById')
    assert.ok(ORNAMENTALS.includes(sp), 'PHASE 44: the special ornamental is a gallery item')

    // before discovery: locked — neither selectable, sowable, nor buyable
    const s = fresh()
    s.money = 1e12
    s.totalEarned = 1e18
    assert.equal(isPlantUnlocked(sp, s), false, 'locked before discovery')
    selectPlant('spv-prachtorchidee')
    assert.notEqual(s.selectedPlantId, 'spv-prachtorchidee', 'ornaments are never selectable')
    assert.equal(buyOrnamental('spv-prachtorchidee'), false, 'cannot buy an undiscovered special')

    // discover the variant → buyable into the gallery (still never plantable)
    s.discoveredVariants = ['prachtorchidee']
    assert.equal(isPlantUnlocked(sp, s), true, 'unlocked after discovery')
    selectPlant('spv-prachtorchidee')
    assert.notEqual(s.selectedPlantId, 'spv-prachtorchidee', 'still gallery-only, not field')
    assert.ok(buyOrnamental('spv-prachtorchidee'), 'special ornamental buys into the gallery')
    assert.equal(ornamentalCount(s, 'spv-prachtorchidee'), 1)
    assert.ok(s.plots.every((p) => p.plantId === null), 'gallery purchase never plants on the field')

    // it feeds the beauty aura (reuses gardenBeauty)
    assert.ok(gardenBeauty(s) > 0, 'special ornamental contributes beauty')

    // goal gone once it's in the collection
    assert.ok(!activeGoals(s).some((g) => g.id === 'specialplant'), 'goal gone once collected')

    // save/load keeps the gallery copy (s is still the live state)
    const code = exportSave()
    fresh()
    importSave(code)
    assert.equal(ornamentalCount(getState(), 'spv-prachtorchidee'), 1, 'gallery copy survives save/load')

    // goal shown when discovered but not yet collected
    const fresh2 = fresh()
    fresh2.discoveredVariants = ['prachtorchidee']
    fresh2.totalEarned = 1e18
    assert.ok(activeGoals(fresh2).some((g) => g.id === 'specialplant'), 'goal shown when discovered, none collected')
  })
})

test('PHASE 23: late-game ladder extends past Weltenrose with distinct roles', () => {
  const ids = PLANTS.map((p) => p.id)
  const wIdx = ids.indexOf('weltenrose')
  // there are now plants AFTER Weltenrose
  assert.ok(wIdx >= 0 && wIdx < PLANTS.length - 1, 'Weltenrose is no longer the finale')

  const after = PLANTS.slice(wIdx + 1)
  const cats = new Set(after.map((p) => p.category))
  // role variety beyond Weltenrose: a Zier (beauty), a Holz (passive), Magie + Hanf
  assert.ok(after.some((p) => p.beautyBonus && p.category === 'zier'), 'a Zier endgame plant (Schönheit)')
  assert.ok(after.some((p) => p.passiveIncome && p.category === 'baeume'), 'a Holz endgame plant (Offline/Passiv)')
  assert.ok(after.some((p) => p.category === 'magie' && p.yield > 0), 'a Magie endgame harvest plant')
  assert.ok(after.some((p) => p.category === 'cannabis'), 'a Hanf endgame plant')
  assert.ok(cats.size >= 3, 'several categories beyond Weltenrose')

  // every new plant unlocks strictly later than Weltenrose (real new goals)
  const wUnlock = PLANTS[wIdx].unlockAtTotalEarned
  for (const p of after) assert.ok(p.unlockAtTotalEarned > wUnlock, `${p.id} unlocks after Weltenrose`)

  // the new top harvest plant clearly beats Weltenrose's steady profit
  const top = [...PLANTS].filter((p) => p.yield > 0).pop()
  assert.ok(
    steadyProfitPerSecond(top) > steadyProfitPerSecond(PLANTS[wIdx]),
    'top harvest plant out-earns Weltenrose'
  )

  // the endgame Hanf is licence-gated (grows the Hanf category)
  const hanf = after.find((p) => p.category === 'cannabis')
  assert.equal(hanf.requiresLicense, 3, 'endgame Hanf needs licence III')
  assert.ok(plantById('dauerbluetenhanf'), 'new Hanf resolves via plantById')
})

test('PHASE 24: distinct endgame sprites + very-late-game goals', () => {
  // every plant (incl. specials) has a registered, valid 16×16 mature sprite
  for (const p of [...PLANTS, ...SPECIAL_PLANTS]) {
    const grid = SPRITES[`${p.id}-3`]
    assert.ok(grid, `${p.id}: mature sprite registered`)
    assert.equal(grid.length, 16, `${p.id}: 16 rows`)
    assert.ok(grid.every((row) => row.length === 16), `${p.id}: 16 cols`)
  }

  // the formerly-aliased endgame plants now have their OWN distinct sprites
  const distinct = [
    ['traumorchidee', 'himmelsorchidee'],
    ['ewigrose', 'weltenrose'],
    ['sternenzeder', 'mondzeder'],
    ['dauerbluetenhanf', 'goldhanf'],
    ['spv-prachtorchidee', 'leuchtlilie'],
  ]
  for (const [a, b] of distinct) {
    assert.notStrictEqual(SPRITES[`${a}-3`], SPRITES[`${b}-3`], `${a} no longer aliases ${b}`)
    assert.notDeepEqual(SPRITES[`${a}-3`], SPRITES[`${b}-3`], `${a} sprite differs from ${b}`)
  }
  // the new very-late plants have their own sprites too
  for (const id of ['kometbeere', 'nebelzeder', 'himmelshanf', 'galaxieorchidee', 'schoepfungsrose', 'mondkristall', 'urweltbaum']) {
    assert.ok(SPRITES[`${id}-3`], `${id}: own sprite`)
  }

  // a 570 Qi player still has several real plant goals ahead
  const at570 = 5.7e20
  const ahead = PLANTS.filter((p) => p.unlockAtTotalEarned > at570)
  assert.ok(ahead.length >= 3, `≥3 plant goals remain above 570 Qi (got ${ahead.length})`)
  // those goals span more than one role/category
  assert.ok(new Set(ahead.map((p) => p.category)).size >= 2, 'late goals span multiple categories')
})

test('PHASE 25: tiny early quests (no softlock), scaling, steeper late levels', () => {
  withBoringRng(() => {
    // a brand-new gardener gets SMALL orders — no reservation softlock
    let maxEarly = 0
    for (let i = 0; i < 60; i++) {
      const f = fresh()
      const q = generateQuest(f)
      for (const it of q.items) if (it.plantId === 'basilikum') maxEarly = Math.max(maxEarly, it.amount)
    }
    assert.ok(maxEarly > 0 && maxEarly <= 30, `fresh basil order stays small (got max ${maxEarly})`)

    // amounts ramp with progression
    const prog = fresh()
    prog.level = 40
    prog.plots = Array.from({ length: 16 }, () => ({ plantId: null, progress: 0, waterLeft: 0, regrowing: false }))
    let maxLate = 0
    for (let i = 0; i < 60; i++) {
      const q = generateQuest(prog)
      for (const it of q.items) if (it.plantId === 'basilikum') maxLate = Math.max(maxLate, it.amount)
    }
    assert.ok(maxLate > maxEarly * 3, 'orders grow a lot with level/plots')

    // free surplus is always sellable past the small reservation → no softlock
    const s = fresh()
    s.money = 0
    s.inventory = { basilikum: 30 }
    s.quests = [{
      id: 1, kind: 'single', items: [{ plantId: 'basilikum', amount: 8 }],
      reward: 1, rewardTickets: 0, rewardCompost: 0, xp: 1, tier: 'bronze', client: 'X', skipCooldown: 0,
    }]
    assert.equal(questReserved(s, 'basilikum'), 8, 'only the small order amount is reserved')
    assert.ok(sellableValue(s) > 0, 'the 22 free basil can still be sold (no softlock)')

    // late level curve is far steeper than before → levels stop racing
    assert.ok(xpToNext(1000) > 5e6, 'level 1000 costs millions of XP')
    assert.ok(xpToNext(10000) > 50 * xpToNext(1000), 'cost keeps climbing super-linearly')
    // still monotonic + finite
    for (const lv of [1, 100, 1000, 11300]) assert.ok(Number.isFinite(xpToNext(lv)) && xpToNext(lv) > 0)
  })
})

test('PHASE 26: parcel soft-gate paces the very-late ladder (no instant skip)', () => {
  withBoringRng(() => {
    const gated = PLANTS.filter((p) => p.unlockParcel)
    assert.ok(gated.length >= 6, 'several very-late plants are parcel-gated')

    // a racing multiplier (huge earnings) still can't sow a parcel-gated plant
    const top = PLANTS.find((p) => p.id === 'urweltbaum')
    const s = fresh()
    s.totalEarned = 1e24 // far past every earnings threshold
    s.licenses = 3
    s.parcels = 5
    assert.equal(isPlantUnlocked(top, s), false, 'huge earnings alone do NOT unlock the finale')
    s.parcels = top.unlockParcel
    assert.equal(isPlantUnlocked(top, s), true, 'leasing enough parcels unlocks it')
    // earnings still required on top of parcels
    const poor = fresh()
    poor.parcels = 99
    poor.totalEarned = 0
    assert.equal(isPlantUnlocked(top, poor), false, 'parcels alone are not enough either')

    // un-gated plants are unaffected by the parcel gate
    const basil = PLANTS.find((p) => p.id === 'basilikum')
    assert.equal(isPlantUnlocked(basil, { ...fresh(), parcels: 1, totalEarned: 0 }), true)

    // quests never ask for a plant the player can't sow yet (parcel-gated)
    const q = fresh()
    q.totalEarned = 1e20
    q.maxUnlockEarned = 1e20
    q.parcels = 12
    q.level = 50
    for (let i = 0; i < 80; i++) {
      for (const it of generateQuest(q).items) {
        const def = it.plantId ? plantById(it.plantId) : null
        if (def?.unlockParcel) assert.ok(q.parcels >= def.unlockParcel, `quest never asks for parcel-gated ${def.id}`)
      }
    }

    // the goal panel turns an earnings-met-but-parcel-gated plant into a parcel goal
    const g = fresh()
    g.totalEarned = 1e24
    g.licenses = 3
    g.parcels = 5
    const pg = activeGoals(g).find((x) => x.id === 'plant')
    assert.ok(pg && /Parzelle/.test(pg.label), 'plant goal guides toward leasing parcels')

    // an already-planted gated plant still resolves + grows (no brick)
    const planted = fresh()
    planted.plots[0] = { plantId: 'urweltbaum', progress: 100, waterLeft: 0, regrowing: false }
    assert.ok(plantById('urweltbaum'), 'gated plant still resolves via plantById')
    tick(planted, 60)
    assert.equal(planted.plots[0].plantId, 'urweltbaum', 'existing gated plot keeps growing, never bricks')
  })
})

test('PHASE 27: parcel-gated shop tiers, trade licenses, late compost sinks, goals', () => {
  withBoringRng(() => {
    // --- B: late shop tiers are parcel-gated (pace via prestige) -------------
    const gatedUp = UPGRADES.filter((u) => u.unlockParcel)
    assert.ok(gatedUp.length >= 6, 'several late-tier upgrades are parcel-gated')
    const edel = upgradeById('edelkompost')
    assert.ok(edel && edel.repeatable && edel.maxLevel > 100, 'edelkompost is the endless gold sink')

    const s = fresh()
    s.money = 1e24 // can afford anything
    s.parcels = 1
    const tier = gatedUp[0]
    assert.equal(isUpgradeUnlocked(tier, s), false, 'gated tier locked at 1 parcel')
    assert.equal(buyUpgrade(tier.id), false, 'cannot buy a parcel-locked tier yet')
    assert.equal(upgradeLevel(s, tier.id), 0)
    s.parcels = tier.unlockParcel
    assert.equal(isUpgradeUnlocked(tier, s), true, 'unlocks once enough parcels are leased')
    assert.ok(buyUpgrade(tier.id), 'buyable at/above the parcel gate')
    assert.equal(upgradeLevel(s, tier.id), 1)
    // un-gated upgrades remain available from the start
    assert.equal(isUpgradeUnlocked(upgradeById('giesskanne'), fresh()), true)

    // --- D: trade licenses IV/V exist and pay a permanent quest bonus --------
    assert.ok(LICENSES.find((l) => l.level === 4), 'Lizenz IV exists')
    assert.ok(LICENSES.find((l) => l.level === 5), 'Lizenz V exists')
    assert.equal(licenseQuestBonus(3), 0, 'no quest bonus below Lizenz IV')
    assert.equal(licenseQuestBonus(4), 0.2)
    assert.ok(Math.abs(licenseQuestBonus(5) - 0.5) < 1e-9, 'IV+V stack to +50 %')

    // buying past license 3 works (cap raised to 5)
    const lic = fresh()
    lic.licenses = 3
    lic.parcels = 12
    lic.money = LICENSES.find((l) => l.level === 4).cost
    assert.ok(buyLicense(), 'Lizenz IV is purchasable past III')
    assert.equal(getState().licenses, 4)

    // --- E: licenses make orders pay more (same order, more reward) ----------
    const payoutWith = (licenses) => {
      const g = fresh()
      g.licenses = licenses
      g.inventory['basilikum'] = 100000
      g.quests = [{
        id: 1, kind: 'single', items: [{ plantId: 'basilikum', amount: 10 }],
        reward: 1000, rewardTickets: 0, rewardCompost: 0, xp: 0, tier: 'bronze', client: 'X', skipCooldown: 0,
      }]
      replaceState(g)
      return fulfillQuest(1).reward
    }
    assert.ok(payoutWith(5) > payoutWith(0), 'trade licenses raise quest payouts')

    // --- C: every compost effect now has an endless late sink ----------------
    const repeatables = COMPOST_UPGRADES.filter((u) => u.repeatable)
    const effects = new Set(repeatables.map((u) => u.effect))
    for (const eff of ['yield', 'growth', 'questReward', 'passive', 'offline']) {
      assert.ok(effects.has(eff), `endless compost sink for ${eff}`)
    }

    // --- F: goal panel surfaces shop + license goals, demotes trivial chores -
    const g = fresh()
    g.parcels = 3 // below the late shop gates → a shop goal appears
    g.scratchTickets = 2 // a trivial always-ready chore
    const goals = activeGoals(g)
    assert.ok(goals.find((x) => x.id === 'shop'), 'shop goal guides toward late tiers')
    assert.ok(goals.find((x) => x.id === 'license'), 'license goal is shown')
    // within a tier, a trivial ready chore never sorts above a substantive goal
    for (let i = 1; i < goals.length; i++) {
      if (goals[i - 1].id === 'scratch' && goals[i].tier === goals[i - 1].tier) {
        assert.ok(['scratch', 'skill'].includes(goals[i].id), 'chores grouped, not crowding real goals')
      }
    }

    // --- save safety: licenses up to 5 survive a roundtrip -------------------
    const save = fresh()
    save.licenses = 5
    replaceState(save)
    const code = exportSave()
    fresh()
    importSave(code)
    assert.equal(getState().licenses, 5, 'license V survives save/load')
  })
})

test('PHASE 28: goal board prioritises real progress over trivial chores', () => {
  withBoringRng(() => {
    // --- upgradeGoal targets an UNAFFORDABLE upgrade (a real savings bar) -----
    const fresh1 = fresh()
    fresh1.money = 10
    const up0 = activeGoals(fresh1).find((g) => g.id === 'upgrade')
    assert.ok(up0 && !up0.ready && up0.fraction < 1, 'fresh start: upgrade goal is a real target, not "bereit"')

    // --- a rich player is NOT headlined by a sub-1000-gold trivial upgrade ----
    const rich = fresh()
    rich.money = 1e9 // can afford every basic upgrade
    rich.totalEarned = 5e4 // but still early on the ladder → real plant goals exist
    const goalsRich = activeGoals(rich)
    const dom = goalsRich[0]
    assert.ok(!dom.chore, 'dominant goal is substantive, not a chore')
    const upRich = goalsRich.find((g) => g.id === 'upgrade')
    // with this much money every basic upgrade is affordable → upgrade is a chore
    assert.ok(upRich && upRich.chore && upRich.ready, 'all-affordable upgrade becomes a low-priority chore')

    // chores never sort above a substantive goal within the same horizon
    for (let i = 1; i < goalsRich.length; i++) {
      if (goalsRich[i - 1].tier === goalsRich[i].tier && !goalsRich[i - 1].chore && goalsRich[i].chore) {
        // ok: substantive before chore
      } else if (goalsRich[i - 1].tier === goalsRich[i].tier && goalsRich[i - 1].chore && !goalsRich[i].chore) {
        assert.fail('a chore sorted above a substantive goal in the same horizon')
      }
    }

    // --- goalBoard caps each horizon so the panel stays scannable ------------
    const board = goalBoard(rich, 3)
    const perTier = {}
    for (const g of board) perTier[g.tier] = (perTier[g.tier] ?? 0) + 1
    for (const [t, n] of Object.entries(perTier)) assert.ok(n <= 3, `≤3 goals per horizon (${t}=${n})`)

    // --- very-late state still offers several real options across horizons ----
    const late = fresh()
    late.money = 5.7e20
    late.totalEarned = 5.7e20
    late.lifetimeEarned = 1.6e18
    late.parcels = 12
    late.compost = 3.2e5
    late.licenses = 3
    late.level = 886
    const goalsLate = activeGoals(late)
    const horizons = new Set(goalsLate.map((g) => g.tier))
    assert.ok(horizons.size >= 3, 'very late: goals span ≥3 horizons')
    const substantive = goalsLate.filter((g) => !g.chore)
    assert.ok(substantive.length >= 3, 'very late: ≥3 substantive options, never a dead end')
    // a 570-Qi player is never headlined by a sub-1000-gold purchase
    assert.ok(!(goalsLate[0].id === 'upgrade' && goalsLate[0].target < 1000), 'no trivial gold headline in the endgame')

    // --- no NaN/Infinity fractions anywhere ----------------------------------
    for (const st of [fresh1, rich, late]) {
      for (const g of activeGoals(st)) {
        assert.ok(Number.isFinite(g.fraction) && g.fraction >= 0 && g.fraction <= 1, `clean fraction for ${g.id}`)
        assert.ok(Number.isFinite(g.current) && Number.isFinite(g.target), `clean numbers for ${g.id}`)
      }
    }
  })
})

test('PHASE 29: toast system aggregates bursts and never floods the screen', () => {
  // a 120-plot "alle ernten" fires many level-ups + ticket drops in a row
  clearToasts()
  for (let i = 0; i < 120; i++) {
    pushAggregateToast({
      key: 'levelup', icon: '⭐', priority: 'important', ttlMs: 6000,
      merge: (prev) => {
        const levels = (prev?.levels ?? 0) + 1
        return { acc: { levels }, text: `+${levels} Level` }
      },
    })
    if (i % 3 === 0) pushTicketToast(1)
  }
  const live = get(toasts)
  // 120 level-up events + 40 ticket events collapse into exactly TWO toasts
  assert.equal(live.length, 2, 'bursts aggregate by key, not stack')
  const lvl = live.find((t) => t.key === 'levelup')
  const tix = live.find((t) => t.key === 'ticket')
  assert.equal(lvl.count, 120, 'all level-ups merged into one toast')
  assert.equal(tix.acc, 40, 'all tickets merged into one toast')
  assert.match(tix.text, /40 Rubbellose/, 'ticket toast shows the aggregate count')

  // render-cap: at most 3 visible even with many distinct toasts; priority wins
  clearToasts()
  for (let i = 0; i < 5; i++) pushToast(`spam ${i}`, '·', 6000, { priority: 'low', key: `low-${i}` })
  pushToast('JACKPOT!', '💰', 6000, { priority: 'critical', key: 'jackpot' })
  const all = get(toasts)
  assert.equal(all.length, 6, 'distinct keys do not merge')
  const visible = [...all].sort((a, b) => b.priority - a.priority || b.id - a.id).slice(0, 3)
  assert.equal(visible.length, 3, 'never more than three visible')
  assert.ok(visible.some((t) => t.key === 'jackpot'), 'a critical toast is never buried by low-priority spam')
  clearToasts()
})

test('PHASE 29: goal board is economic, diverse and explained', () => {
  withBoringRng(() => {
    // --- quest economics: only headline when it pays off ---------------------
    // a fixed order worth exactly its raw produce value (premium = 1 / sellMult)
    const N = 50
    const bas = PLANTS.find((p) => p.id === 'basilikum')
    const order = () => ({
      id: 1, kind: 'single', items: [{ plantId: 'basilikum', amount: N }],
      reward: N * bas.sellValue, rewardTickets: 0, rewardCompost: 0, xp: 0, tier: 'bronze', client: 'X', skipCooldown: 0,
    })

    const base = fresh()
    base.money = 1e6; base.totalEarned = 1e6; base.level = 40
    base.quests = [order()]
    const qBase = activeGoals(base).find((g) => g.id === 'quest')
    assert.ok(qBase, 'a fair order is shown')

    // heavy Marktstand raises the sell baseline → delivering loses its edge → dropped
    const sellHeavy = fresh()
    sellHeavy.money = 1e6; sellHeavy.totalEarned = 1e6; sellHeavy.level = 40
    sellHeavy.upgrades = { marktstand: 10 }
    sellHeavy.quests = [order()]
    const qHeavy = activeGoals(sellHeavy).find((g) => g.id === 'quest')
    assert.ok(!qHeavy || qHeavy.chore, 'order worse than selling is hidden or quiet, never headlined')

    // a license premium makes the SAME order clearly worthwhile again
    const licensed = fresh()
    licensed.money = 1e6; licensed.totalEarned = 1e6; licensed.level = 40; licensed.parcels = 22; licensed.licenses = 5
    licensed.quests = [order()]
    assert.ok(expectedQuestPayout(licensed, order()) > expectedQuestPayout(base, order()), 'license raises payout')
    const qLic = activeGoals(licensed).find((g) => g.id === 'quest')
    assert.ok(qLic && !qLic.chore, 'with a license bonus the order is strongly recommended')

    // almost-done order is a short-term, non-chore deliver-now goal
    const almost = fresh()
    almost.level = 40
    almost.quests = [order()]
    almost.inventory = { basilikum: N }
    const qAlmost = activeGoals(almost).find((g) => g.id === 'quest')
    assert.ok(qAlmost && qAlmost.tier === 'kurz' && qAlmost.ready && !qAlmost.chore, 'near-complete order is surfaced to deliver')

    // --- build-discovery nudge appears for an un-engaged, eligible style ------
    const mid = fresh()
    mid.money = 1e9; mid.totalEarned = 1e9; mid.level = 40; mid.parcels = 4
    const goalsMid = activeGoals(mid)
    const build = goalsMid.find((g) => g.discovery)
    assert.ok(build, 'a build-discovery suggestion appears mid-game')
    assert.ok(build.why && build.why.length > 0, 'discovery goals explain themselves')

    // --- diversity + horizons on the board -----------------------------------
    const board = goalBoard(mid)
    assert.ok(board.filter((g) => g.chore).length <= 1, 'at most one trivial chore on the board')
    assert.ok(board.filter((g) => g.discovery).length <= 1, 'at most one build nudge on the board')
    assert.ok(new Set(board.map((g) => g.tier)).size >= 3, 'board spans several horizons')
    const perTier = {}
    for (const g of board) perTier[g.tier] = (perTier[g.tier] ?? 0) + 1
    for (const n of Object.values(perTier)) assert.ok(n <= 3, 'no horizon floods with one kind of goal')

    // --- explanations + clean numbers ----------------------------------------
    for (const g of board) {
      assert.ok(Number.isFinite(g.fraction) && g.fraction >= 0 && g.fraction <= 1, `clean fraction for ${g.id}`)
    }
  })
})

test('PHASE 30: toast log keeps a readable history without re-spamming', () => {
  clearToasts()
  clearToastLog()
  // a burst of aggregated events collapses to ONE log line each (not N)
  for (let i = 0; i < 50; i++) {
    pushAggregateToast({
      key: 'levelup', icon: '⭐', priority: 'important', ttlMs: 6000,
      merge: (prev) => ({ acc: { n: (prev?.n ?? 0) + 1 }, text: `+${(prev?.n ?? 0) + 1} Level` }),
    })
    pushTicketToast(1)
  }
  const log = get(toastLog)
  assert.equal(log.length, 2, 'aggregated bursts produce one log entry per kind')
  const lvl = log.find((e) => e.logKey === 'levelup')
  assert.equal(lvl.count, 50, 'log entry reflects the aggregate count')
  assert.equal(get(toastLogUnseen) > 0, true, 'unseen badge counts events')
  markToastLogSeen()
  assert.equal(get(toastLogUnseen), 0, 'opening the log clears the unseen badge')

  // the log is capped so it never grows without bound
  clearToastLog()
  for (let i = 0; i < 60; i++) pushToast(`distinct ${i}`, '·', 6000)
  assert.ok(get(toastLog).length <= 40, 'history is capped to the most recent few dozen')
  // newest first
  assert.match(get(toastLog)[0].text, /distinct 59/, 'most recent entry is on top')
  clearToasts()
  clearToastLog()
})

test('PHASE 37: affordable plots + bulk-buy, permanent ornamentals, new top plants, Kreuzungen', () => {
  withBoringRng(() => {
    // --- plot cost stays buyable across a 150+ plot deep-prestige garden -------
    const s = fresh()
    s.parcels = 40 // maxPlots = 16 + 39*4 = 172
    s.plots = Array.from({ length: 160 }, () => ({ plantId: null, progress: 0, waterLeft: 0, regrowing: false }))
    const naive = CONFIG.plotBaseCost * Math.pow(CONFIG.plotCostFactor, 156)
    assert.ok(nextPlotCost(s) < naive / 1e9, 'late plots are FAR cheaper than the naive 1.5^n curve')
    // early plots keep the steep price (within the knee)
    const e = fresh()
    assert.equal(nextPlotCost(e), CONFIG.plotBaseCost)
    e.plots.push({ plantId: null, progress: 0, waterLeft: 0, regrowing: false })
    assert.equal(nextPlotCost(e), Math.floor(CONFIG.plotBaseCost * CONFIG.plotCostFactor))

    // --- buy-all fills the field in one call ---------------------------------
    const b = fresh()
    b.parcels = 5 // maxPlots = 16 + 16 = 32
    b.money = 1e12
    const before = b.plots.length
    const bought = buyAllPlots()
    assert.ok(bought > 0 && getState().plots.length === before + bought, 'buyAllPlots adds many plots at once')
    assert.equal(getState().plots.length, maxPlots(getState()), 'fills up to the parcel cap when rich')

    // --- ornamentals are permanent: "alle roden" skips them ------------------
    const g = fresh()
    g.totalEarned = 1e12
    g.plots = [
      { plantId: 'nachtrose', progress: 99999, waterLeft: 0, regrowing: false }, // ornamental
      { plantId: 'basilikum', progress: 99999, waterLeft: 0, regrowing: false }, // crop
    ]
    const res = clearAllPlots((_, def) => !def.beautyBonus)
    assert.equal(res.count, 1, 'only the crop is roded')
    assert.equal(getState().plots[0].plantId, 'nachtrose', 'ornamental stays as a permanent beauty field')
    assert.equal(getState().plots[1].plantId, null, 'crop was cleared')

    // --- new top plants: ascending, parcel-gated, uniform cadence ------------
    for (const id of ['singularitaetsblume', 'quasarkern', 'leerenbluete', 'schoepfungskern']) {
      const p = plantById(id)
      assert.ok(p && p.category === 'kosmos' && p.unlockParcel > 78, `${id} extends the ladder past urknallfrucht`)
      assert.equal(cycleFloorSeconds(p), cycleFloorSeconds(plantById('urknallfrucht')), `${id} shares the uniform cadence (no slower)`)
    }
    const newTop = plantById('schoepfungskern')
    assert.equal(isPlantUnlocked(newTop, { ...fresh(), totalEarned: 1e40, parcels: 90 }), false, 'gated past current reach')
    assert.equal(isPlantUnlocked(newTop, { ...fresh(), totalEarned: 1e40, parcels: 98 }), true, 'unlocks with enough parcels')

    // --- seed-lab specials live in their own „Kreuzungen" category ------------
    const special = SPECIAL_PLANTS.find((p) => p.id === 'spv-prachtorchidee')
    assert.equal(special.category, 'kreuzungen', 'special plant moved to its own Kreuzungen category')
    assert.ok(!PLANTS.some((p) => p.category === 'kreuzungen'), 'Kreuzungen is special-only (not in the normal spec ladder)')
  })
})

test('PHASE 39: every seed-lab variant is plantable in the Kreuzungen category', () => {
  withBoringRng(() => {
    // each discovered variant has a matching plantable cross in „Kreuzungen"
    for (const v of VARIANTS) {
      const cross = SPECIAL_PLANTS.find((p) => p.unlockVariant === v.id)
      assert.ok(cross, `variant ${v.id} has a plantable cross`)
      assert.equal(cross.category, 'kreuzungen', `${cross.id} lives in Kreuzungen`)
      assert.ok(cross.special && cross.maxPlots > 0 && cross.beautyBonus > 0, `${cross.id} is a capped beauty cross`)
    }
    assert.equal(SPECIAL_PLANTS.length, VARIANTS.length, 'all variants are plantable (not just one)')

    // gated by discovery: locked until the variant is found, then sowable
    const cross = SPECIAL_PLANTS.find((p) => p.unlockVariant === 'weltenhybride')
    assert.equal(isPlantUnlocked(cross, { ...fresh(), discoveredVariants: [] }), false, 'locked before discovery')
    assert.equal(isPlantUnlocked(cross, { ...fresh(), discoveredVariants: ['weltenhybride'] }), true, 'plantable once discovered')

    // higher rarity = more beauty (a reason to plant the rarer crosses)
    const bronze = SPECIAL_PLANTS.find((p) => p.unlockVariant === 'eilkraut')
    const legend = SPECIAL_PLANTS.find((p) => p.unlockVariant === 'weltenhybride')
    assert.ok(legend.beautyBonus > bronze.beautyBonus * 3, 'legendary cross far outshines a bronze one')
  })
})

test('PHASE 36: toast log persists across a reload', () => {
  const orig = globalThis.localStorage
  const store = {}
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
  }
  try {
    clearToastLog()
    pushToast('persist me', '🔔', 6000, { priority: 'important' })
    flushToastLog() // force the throttled write
    assert.ok(get(toastLog).some((e) => e.text === 'persist me'), 'logged in memory')
    // simulate a reload: drop the in-memory store, then re-read from localStorage
    toastLog.set([])
    assert.equal(get(toastLog).length, 0, 'memory cleared')
    reloadToastLog()
    assert.ok(get(toastLog).some((e) => e.text === 'persist me'), 'restored from storage after reload')
    // clearing wipes the persisted copy too
    clearToastLog()
    reloadToastLog()
    assert.equal(get(toastLog).length, 0, 'cleared log stays cleared after reload')
  } finally {
    globalThis.localStorage = orig
    clearToasts()
    clearToastLog()
  }
})

test('PHASE 30: quest goal weighs real production time', () => {
  withBoringRng(() => {
    const bas = PLANTS.find((p) => p.id === 'basilikum')
    const fewPlots = () => Array.from({ length: 2 }, () => ({ plantId: null, progress: 0, waterLeft: 0, regrowing: false }))
    const order = (amount) => ({
      id: 1, kind: 'single', items: [{ plantId: 'basilikum', amount }],
      reward: amount * bas.sellValue, rewardTickets: 0, rewardCompost: 0, xp: 0, tier: 'bronze', client: 'X', skipCooldown: 0,
    })

    // huge order + tiny field + strong license premium → lucrative but a long grind:
    // shown quietly (chore), and the reason names the long cultivation time
    const grind = fresh()
    grind.level = 40; grind.parcels = 22; grind.licenses = 5
    grind.plots = fewPlots()
    grind.quests = [order(5_000_000)]
    const qGrind = activeGoals(grind).find((g) => g.id === 'quest')
    assert.ok(qGrind, 'a feasible order still appears')
    assert.ok(qGrind.chore, 'an unrealistically long order is not headlined')
    assert.match(qGrind.why, /langer Anbau|~/, 'the reason reflects the time cost')

    // small order on a big field → quick and worthwhile, with a time hint
    const quick = fresh()
    quick.level = 40; quick.parcels = 22; quick.licenses = 5
    quick.plots = Array.from({ length: 50 }, () => ({ plantId: null, progress: 0, waterLeft: 0, regrowing: false }))
    quick.quests = [order(20)]
    const qQuick = activeGoals(quick).find((g) => g.id === 'quest')
    assert.ok(qQuick && !qQuick.chore, 'a quick lucrative order is recommended')
    assert.match(qQuick.why, /Direktverkauf/, 'reason explains the economic edge')
  })
})

test('PHASE 31: endless Erntedrohnen keep up with a fast endgame field', () => {
  withBoringRng(() => {
    const drones = upgradeById('erntedrohnen')
    assert.ok(drones && drones.repeatable && drones.effect === 'autoHarvest', 'erntedrohnen is a repeatable auto-harvest sink')

    // parcel-gated: not buyable before the endgame, available deep in prestige
    assert.equal(isUpgradeUnlocked(drones, { ...fresh(), parcels: 4 }), false)
    assert.equal(isUpgradeUnlocked(drones, { ...fresh(), parcels: 16 }), true)

    // a big field of fast crops, every bed ripe at once
    const s = fresh()
    s.totalEarned = 1e15
    s.parcels = 16
    s.plots = Array.from({ length: 40 }, () => ({ plantId: 'basilikum', progress: 1e9, waterLeft: 0, regrowing: false }))
    const ready = () => s.plots.filter((p) => p.plantId !== null).length
    assert.equal(ready(), 40)

    // without the helper, nothing auto-harvests
    assert.equal(autoHarvestRate(s), 0)
    tick(s, 1)
    assert.equal(ready(), 40, 'no helper → field stays ripe')

    // enough drone levels out-pace the field → one second clears all ripe beds
    s.upgrades.erntedrohnen = 20 // +3/level = 60 beete/s ≥ 40 plots
    assert.equal(autoHarvestRate(s), 60, 'rate scales with the repeatable level')
    tick(s, 1)
    assert.equal(ready(), 0, 'a high enough rate harvests every ripe bed at once')

    // the cost escalates geometrically → a genuine endless Sp sink
    assert.ok(drones.baseCost >= 1e21 && drones.costFactor > 1, 'priced as an endgame gold sink')
  })
})

test('PHASE 34: late-cycle floor, truthful time, Holz forest aura, bulk scratch, level softcap', () => {
  withBoringRng(() => {
    // --- A: late crops get a real cadence; tooltip time is truthful ----------
    const s = fresh()
    s.parcels = 39; s.compost = 1e9; s.licenses = 3; s.level = 44000; s.upgrades = { giesskanne: 10 }
    const mk = plantById('mondkristall')
    const sh = plantById('sonnenhanf')
    // mondkristall has no per-plant floor but is late-game → gets the global floor
    assert.ok(mk.growTime >= CONFIG.floorGrowTimeThreshold && (mk.minGrowSeconds ?? 0) === 0, 'mondkristall floored only globally')
    // PHASE 46: deep prestige shrinks the floor (here parcels=39 → near the min),
    // but it never drops below minCycleFloorMin and never makes ripening instant
    assert.ok(effectiveCycleSeconds(s, mk, true) >= CONFIG.minCycleFloorMin, 'never below the hard minimum')
    // higher tier is never FASTER than the (uniform) floor (no inversion)
    assert.ok(effectiveCycleSeconds(s, sh, true) >= effectiveCycleSeconds(s, mk, true) - 0.01, 'newer crop not faster than old')
    // a fast early plant is exempt from the late floor
    const basil = plantById('basilikum')
    assert.equal(cycleFloorSeconds(basil), 0, 'early plant exempt from the late-game floor')

    // PHASE 46: the floor falls with prestige depth (parcels) — fresh = 8s, deep < 8s
    const fresh1 = fresh()
    fresh1.parcels = 1
    assert.equal(effectiveCycleFloor(fresh1, mk), CONFIG.minCycleFloorSeconds, 'fresh garden keeps the full 8s floor')
    const deep = fresh()
    deep.parcels = 30
    assert.ok(effectiveCycleFloor(deep, mk) < CONFIG.minCycleFloorSeconds, 'deep prestige buys speed: floor drops below 8s')
    assert.ok(effectiveCycleFloor(deep, mk) >= CONFIG.minCycleFloorMin, 'but never past the minimum')

    // --- B: Holz forest aura is a real, bounded yield multiplier -------------
    const f = fresh()
    f.plots = Array.from({ length: 10 }, () => ({ plantId: 'urweltbaum', progress: 1e9, waterLeft: 0, regrowing: false }))
    const fb = forestBonus(f)
    assert.ok(fb > 0.3 && fb < 2, `10 mature trees give a meaningful but bounded aura (got +${(fb * 100).toFixed(0)}%)`)
    // immature trees give nothing
    const f2 = fresh()
    f2.plots = [{ plantId: 'urweltbaum', progress: 0, waterLeft: 0, regrowing: false }]
    assert.equal(forestBonus(f2), 0, 'only MATURE trees contribute the aura')

    // --- C: bulk scratch cashes the whole hoard at once ----------------------
    const sc = fresh()
    sc.scratchTickets = 5000
    sc.totalEarned = 1e18
    const r = scratchAll()
    assert.equal(r.scratched, 5000, 'all tickets scratched')
    assert.equal(getState().scratchTickets, 0, 'hoard cleared')
    assert.ok(r.gold > 0, 'a lump of gold is paid out')

    // --- D: level yield bonus soft-caps (high levels keep mattering) ---------
    assert.equal(levelYieldBonus(1), 0, 'level 1 = no bonus')
    assert.ok(Math.abs(levelYieldBonus(301) - CONFIG.levelYieldMaxBonus) < 0.05, 'hits the old cap around level ~300')
    assert.ok(levelYieldBonus(44000) > CONFIG.levelYieldMaxBonus * 3, 'level 44k far exceeds the old hard cap')
    assert.ok(levelYieldBonus(440000) > levelYieldBonus(44000), 'still rising at extreme levels (diminishing, endless)')
  })
})

test('PHASE 33: cosmic „Kosmisch" category — plants, sell-spec, distinct sprites', () => {
  withBoringRng(() => {
    // --- the new category exists with its own specialisation perk ------------
    const spec = categorySpecById('kosmos')
    assert.ok(spec && spec.unique.kind === 'sell', 'Kosmisch has a sell-price specialisation')

    // --- 3 cosmic plants, floored, parcel-gated beyond the Hanf spike --------
    for (const id of ['sternensaat', 'nebularbluete', 'urknallfrucht']) {
      const p = plantById(id)
      assert.ok(p && p.category === 'kosmos' && cycleFloorSeconds(p) >= CONFIG.minCycleFloorSeconds && p.regrowTime, `${id} is a floored cosmic crop`)
    }
    const top = plantById('urknallfrucht')
    assert.equal(isPlantUnlocked(top, { ...fresh(), totalEarned: 1e40, parcels: 40 }), false, 'gated past current reach')
    assert.equal(isPlantUnlocked(top, { ...fresh(), totalEarned: 1e40, parcels: 78 }), true, 'unlocks with enough parcels')

    // --- the sell perk lifts ONLY the cosmic category's sale price -----------
    assert.ok(specUniqueBonus({ ...fresh(), specializations: { kosmos: 10 } }, 'kosmos', 'sell') > 0, 'kosmos sell perk active')
    assert.equal(specUniqueBonus({ ...fresh(), specializations: { kosmos: 10 } }, 'magie', 'sell'), 0, 'perk is per-category')

    const plain = fresh()
    plain.inventory = { sternensaat: 1000 }
    const g0 = sellPlant('sternensaat', 1000)
    const boosted = fresh()
    boosted.specializations = { kosmos: 10 }
    boosted.inventory = { sternensaat: 1000 }
    const g1 = sellPlant('sternensaat', 1000)
    assert.ok(g1 > g0, 'Kosmisch specialisation raises the cosmic sale price')

    const ctrl = fresh()
    ctrl.specializations = { kosmos: 10 }
    ctrl.inventory = { basilikum: 1000 }
    const ck = sellPlant('basilikum', 1000)
    const ref = fresh()
    ref.inventory = { basilikum: 1000 }
    const cr = sellPlant('basilikum', 1000)
    assert.equal(ck, cr, 'kosmos spec never touches other categories')

    // --- each new endgame plant has a DISTINCT mature sprite -----------------
    const matureKeys = ['sonnenhanf-3', 'sternenhanf-3', 'nebelhanf-3', 'kosmoshanf-3', 'ewigkeitshanf-3', 'sternenrose-3', 'sternensaat-3', 'nebularbluete-3', 'urknallfrucht-3']
    const grids = matureKeys.map((k) => SPRITES[k])
    for (const k of matureKeys) {
      assert.ok(Array.isArray(SPRITES[k]) && SPRITES[k].length === 16, `${k} sprite present & 16 rows`)
    }
    assert.ok(SPRITES['seedling-kosmos'], 'cosmic seedling sprite present')
    // the five Hanf colas are not all the same grid (distinct mature art)
    const hanf = ['sonnenhanf-3', 'sternenhanf-3', 'nebelhanf-3', 'kosmoshanf-3', 'ewigkeitshanf-3'].map((k) => SPRITES[k])
    assert.equal(new Set(hanf).size, 5, 'each Hanf tier has its own distinct cola sprite')
  })
})

test('PHASE 32: endgame growth floor, Hanf ladder, endless skill, zier steps', () => {
  withBoringRng(() => {
    // --- A: minGrowSeconds floors real maturation despite a huge multiplier ---
    const s = fresh()
    s.totalEarned = 1e30
    s.parcels = 60
    s.licenses = 3
    s.compost = 1e12 // deep-prestige compost → growth multiplier far above the floor ratio
    s.upgrades = { giesskanne: 10 } // meet cannabis watering (care = 1, like a real endgame save)
    const hanf = plantById('ewigkeitshanf')
    assert.ok(hanf && hanf.regrowTime, 'capstone hanf regrows')
    // PHASE 37: endgame plants share the GLOBAL floor (no per-plant escalation,
    // so newer crops are never slower than older ones — no inversion)
    const cad = cycleFloorSeconds(hanf)
    assert.equal(cad, CONFIG.minCycleFloorSeconds, 'late crop uses the uniform global BASE floor')
    // PHASE 46: deep prestige (parcels=60) lowers the REAL floor toward the minimum
    const eff = effectiveCycleFloor(s, hanf)
    assert.ok(eff < cad && eff >= CONFIG.minCycleFloorMin, 'deep prestige lowers the floor toward the minimum')
    s.plots = [{ plantId: 'ewigkeitshanf', progress: 0, waterLeft: 99, regrowing: false }]
    tick(s, eff - 1) // just under the real floor
    assert.ok(!plotReady(s.plots[0]), 'floored plant is NOT ripe in a fraction of a second')
    tick(s, 2) // cross the floor
    assert.ok(plotReady(s.plots[0]), 'ripe after ~the floor, not before')

    // a fast early plant is EXEMPT from the floor — its growth upgrade still works
    s.plots = [{ plantId: 'basilikum', progress: 0, waterLeft: 0, regrowing: false }]
    tick(s, 1)
    assert.ok(plotReady(s.plots[0]), 'un-floored early plant stays instant at this multiplier')

    // no inversion: every late crop has the SAME floor, so higher tier ≥ lower tier
    assert.equal(cycleFloorSeconds(plantById('mondkristall')), cycleFloorSeconds(plantById('sonnenhanf')), 'old and new late crops share one cadence')

    // --- B: new Hanf ladder gated by license + parcels ------------------------
    for (const id of ['sonnenhanf', 'sternenhanf', 'nebelhanf', 'kosmoshanf', 'ewigkeitshanf']) {
      const p = plantById(id)
      assert.ok(p && p.category === 'cannabis' && p.requiresLicense === 3 && cycleFloorSeconds(p) >= CONFIG.minCycleFloorSeconds, `${id} is a floored licensed hanf`)
    }
    const top = plantById('ewigkeitshanf')
    assert.equal(isPlantUnlocked(top, { ...fresh(), totalEarned: 1e30, licenses: 3, parcels: 5 }), false, 'parcel-gated past the current top')
    assert.equal(isPlantUnlocked(top, { ...fresh(), totalEarned: 1e30, licenses: 3, parcels: 60 }), true, 'unlocks with enough parcels')

    // --- C: endless skill absorbs a big point surplus in one MAX buy ----------
    const sk = fresh()
    sk.parcels = 200 // deep prestige → big point surplus
    sk.skills = { gartenplanung: 1, erntefokus: 1, ueppige_ernte: 1 }
    const before = availableSkillPoints(sk)
    assert.ok(before > 100, 'deep prestige yields a big point surplus')
    const bought = buySkillMax('ahnenwissen')
    assert.ok(bought > 100, 'MAX buy dumps the surplus into the endless skill')
    assert.equal(availableSkillPoints(getState()), before - bought, 'points spent exactly')

    // --- D: ornamental beauty steps scale with tier (proportional) -----------
    assert.ok(plantById('galaxieorchidee').beautyBonus > plantById('mohn').beautyBonus * 5, 'top ornamental is a far bigger step than a low one')
    // PHASE 44: a maxed Ziergalerie reaches the top beauty milestone
    const z = fresh()
    for (const o of ORNAMENTALS) z.ornamentals[o.id] = CONFIG.galleryMaxCopies
    const topMs = BEAUTY_MILESTONES[BEAUTY_MILESTONES.length - 1].beauty
    assert.ok(gardenBeauty(z) >= topMs, 'a maxed Ziergalerie can reach the top beauty milestone')
  })
})

test('regrow plants: stay after harvest, faster cycles, clearPlot removes', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e12
    s.totalEarned = 1e15 // unlock everything
    selectPlant('erdbeere')
    const berry = PLANTS.find((p) => p.id === 'erdbeere')
    assert.ok(sowPlot(0))
    tick(s, berry.growTime)
    assert.ok(plotReady(s.plots[0]))

    const first = harvestPlot(0)
    assert.equal(first.units, berry.yield)
    assert.equal(s.plots[0].plantId, 'erdbeere', 'bush must stay planted')
    assert.equal(s.plots[0].regrowing, true)
    assert.equal(s.plots[0].waterLeft, CONFIG.waterChargesPerCrop, 'fresh charges per cycle')

    // not ready after the OLD grow time fraction, but after regrowTime it is
    tick(s, berry.regrowTime - 1)
    assert.equal(plotReady(s.plots[0]), false)
    tick(s, 1)
    assert.ok(plotReady(s.plots[0]), 'regrow cycle uses the shorter time')
    assert.equal(harvestPlot(0).units, berry.yield)

    // regrow state survives a save roundtrip
    const code = exportSave()
    fresh()
    importSave(code)
    assert.equal(getState().plots[0].regrowing, true)

    // rip out the bush
    assert.ok(clearPlot(0))
    assert.equal(getState().plots[0].plantId, null)
    assert.equal(clearPlot(0), null)
  })
})

test('PHASE 1: clearing refunds half the seed, softlock guard rescues', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e9
    s.totalEarned = 1e15 // unlock everything
    selectPlant('kristallbeere')
    const rose = PLANTS.find((p) => p.id === 'kristallbeere')
    assert.ok(sowPlot(0))
    const before = s.money
    const refund = clearPlot(0)
    assert.equal(refund, Math.floor(rose.seedCost / 2))
    assert.equal(s.money, before + refund)
    assert.equal(s.plots[0].plantId, null)
    assert.equal(clearPlot(0), null) // empty plot → nothing to clear

    // softlock guard: broke + empty garden + empty storage → seed money returns
    const t = fresh()
    t.money = 0
    tick(t, 0.1)
    assert.equal(t.money, CONFIG.startMoney)

    // ...but never while something is still planted or stored
    assert.ok(sowPlot(0)) // basil, seedCost 1
    t.money = 0
    tick(t, 0.1)
    assert.equal(t.money, 0)

    t.plots[0].plantId = null
    t.inventory['basilikum'] = 1
    tick(t, 0.1)
    assert.equal(t.money, 0)

    delete t.inventory['basilikum']
    tick(t, 0.1)
    assert.equal(t.money, CONFIG.startMoney)
  })
})

test('PHASE 2: partial sales, quest reservation, market cart keeps order stock', () => {
  withBoringRng(() => {
    const s = fresh()
    const basil = PLANTS.find((p) => p.id === 'basilikum')
    s.inventory['basilikum'] = 10
    s.marketTime = 0
    const before = s.money

    // exact partial sale: money and storage follow, overshoot is capped
    const gain = sellPlant('basilikum', 3)
    assert.equal(gain, Math.round(3 * basil.sellValue))
    assert.equal(s.money, before + gain)
    assert.equal(s.inventory['basilikum'], 7)
    assert.equal(sellPlant('basilikum', 99), Math.round(7 * basil.sellValue))
    assert.equal(s.inventory['basilikum'], undefined)
    assert.equal(sellPlant('basilikum', 5), 0)

    // open orders reserve their stock against quick sells
    s.inventory['basilikum'] = 10
    s.quests.push({
      id: 999,
      kind: 'single',
      items: [{ plantId: 'basilikum', amount: 6 }],
      reward: 1,
      rewardTickets: 0,
      rewardCompost: 0,
      xp: 1,
      tier: 'bronze',
      client: 'Test',
      skipCooldown: 0,
    })
    assert.equal(questReserved(s, 'basilikum'), 6)
    assert.equal(quickSellAmount(s, 'basilikum', 1), 4)
    assert.equal(quickSellAmount(s, 'basilikum', 0.5), 2)
    assert.equal(quickSellAmount(s, 'basilikum', 0.25), 1) // never rounds to nothing
    sellAll()
    assert.equal(s.inventory['basilikum'], 6, 'quick sell keeps the reserved units')

    // the market cart only ships the surplus
    s.inventory['basilikum'] = 10
    s.upgrades['marktkarren'] = 1 // one trip per 60 s
    tick(s, 61)
    assert.equal(s.inventory['basilikum'], 6, 'cart leaves the order stock alone')

    // an explicit amount deliberately overrides the shield
    assert.ok(sellPlant('basilikum', 6) > 0)
    assert.equal(s.inventory['basilikum'], undefined)
  })
})

test('prestige: compost payout, round reset, permanent perks stay', () => {
  withBoringRng(() => {
    const s = fresh()
    assert.equal(compostGain(s), 0)
    assert.equal(leaseParcel(), 0, 'no prestige below the threshold')

    s.totalEarned = 4 * CONFIG.prestigeBase // → floor(sqrt(4)) = 2 compost
    s.lifetimeEarned = 4 * CONFIG.prestigeBase
    s.money = 5e6
    s.level = 7
    s.upgrades['giesskanne'] = 5
    s.inventory['basilikum'] = 99
    assert.equal(compostGain(s), 2)

    assert.equal(leaseParcel(), 2)
    assert.equal(s.parcels, 2)
    assert.equal(s.compost, 2)
    assert.equal(s.money, CONFIG.startMoney)
    assert.equal(s.totalEarned, 0)
    assert.equal(s.lifetimeEarned, 4 * CONFIG.prestigeBase, 'lifetime stats survive')
    assert.equal(s.plots.length, CONFIG.startPlots)
    assert.deepEqual(s.upgrades, {})
    assert.deepEqual(s.inventory, {})
    assert.equal(s.level, 7, 'gardener level is permanent')
    assert.equal(s.quests.length >= 1, true, 'fresh quest board')
    assert.equal(maxPlots(s), CONFIG.maxPlots + CONFIG.parcelExtraPlots)

    // compost beats the lost upgrades? not necessarily — but it must apply
    // (incl. the parcel-2 milestone yield bonus reached by this prestige):
    const effective = Math.pow(2, CONFIG.compostSoftcapExp)
    const expectedYield =
      (1 + CONFIG.compostYieldPerPoint * effective) *
      (1 + CONFIG.levelYieldPerLevel * 6) *
      (1 + parcelBonus(s.parcels, 'yield'))
    assert.ok(Math.abs(yieldMultiplier(s) - expectedYield) < 1e-9)

    // lifetime-based: immediately prestiging again earns nothing extra
    assert.equal(compostGain(s), 0, 'no compost from re-leasing without new earnings')
    s.lifetimeEarned = 9 * CONFIG.prestigeBase // √9 = 3 total → 1 new point
    assert.equal(compostGain(s), 1)
    // parcel 3 demands at least +2 compost at once — no mini prestiges
    assert.equal(leaseParcel(), 0, 'gain below the parcel requirement is refused')
    assert.equal(s.parcels, 2)
  })
})

test('helpers: auto-harvest/sow/sell run through tick (and thus offline)', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1000
    s.upgrades['erntehelfer'] = 5 // 2 plots/s
    s.upgrades['saegnom'] = 5
    s.upgrades['marktkarren'] = 6 // sells every 10 s
    const basil = PLANTS[0]

    // gnome sows by itself, helper harvests, cart sells — money grows hands-free
    const moneyStart = s.money
    for (let i = 0; i < 24; i++) tick(s, 10)
    assert.ok(s.stats.planted > 0, 'gnome must sow')
    assert.ok(s.stats.harvested > 0, 'helper must harvest')
    assert.ok(s.stats.sold > 0, 'cart must sell')
    assert.ok(s.money > moneyStart, `idle play must be profitable (${s.money} vs ${moneyStart})`)
    assert.ok(s.totalEarned > 0, 'auto sales count as earnings')

    // helpers never crit or build combo; basil's ticket rate sits far below
    // the 0.5 boring-rng roll, so none drop here (PHASE 3 drops covered below)
    assert.equal(s.stats.crits, 0)
    assert.equal(s.combo.count, 0)
    assert.equal(s.scratchTickets, 0)
    assert.ok(basil.yield >= 1)
  })
})

test('PHASE 3: live auto-harvest drops tickets, offline stays sober, gnome uses its pin', () => {
  // live auto-harvest is as lucky as harvesting by hand
  withRngQueue([0.0], () => {
    const s = fresh()
    assert.ok(sowPlot(0)) // basil, the default selection
    tick(s, PLANTS[0].growTime) // ripen (no rng consumed by growth)
    s.upgrades['erntehelfer'] = 10
    tick(s, 1) // helper grabs the ready plot
    assert.ok(s.stats.harvested > 0, 'helper must harvest')
    assert.ok(s.scratchTickets > 0, 'live auto-harvest drops a ticket')
  })

  // the chunked offline pass never tops off the pocket
  withRngQueue([0.0], () => {
    const s = fresh()
    assert.ok(sowPlot(0))
    tick(s, PLANTS[0].growTime)
    s.upgrades['erntehelfer'] = 10
    tick(s, 1, { offline: true })
    assert.ok(s.stats.harvested > 0)
    assert.equal(s.scratchTickets, 0, 'offline auto-harvest stays ticket-free')
  })

  // the gnome sows its pinned plant, ignoring the live hand selection
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e12
    s.totalEarned = 1e15 // unlock everything
    setAutoSowPlant('basilikum')
    selectPlant('nachtrose') // hand selection moves to an ornamental
    s.upgrades['saegnom'] = 10
    for (const p of s.plots) p.plantId = null
    tick(s, 10)
    assert.ok(
      s.plots.some((p) => p.plantId === 'basilikum'),
      'gnome sows the pinned plant'
    )
    assert.ok(
      !s.plots.some((p) => p.plantId === 'nachtrose'),
      'gnome ignores the hand selection'
    )

    // unpinning makes it follow the selection again
    setAutoSowPlant(null)
    assert.equal(getState().autoSowPlantId, null)
  })
})

test('offline catch-up is chunked: regrow cycles produce while away', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e12
    s.totalEarned = 1e15
    s.upgrades['erntehelfer'] = 5
    selectPlant('erdbeere')
    const berry = PLANTS.find((p) => p.id === 'erdbeere')
    assert.ok(sowPlot(0))
    // away long enough for first growth + several regrow cycles
    const away = berry.growTime + berry.regrowTime * 3 + 60
    const report = applyOfflineProgress(Date.now() - away * 1000)
    assert.ok(report)
    // one big un-chunked tick could harvest at most once — chunking must
    // capture multiple regrow cycles
    assert.ok(
      report.autoHarvested >= berry.yield * 3,
      `expected ≥${berry.yield * 3} auto-harvested units, got ${report.autoHarvested}`
    )
  })
})

test('effect upgrades: water charges, combo window, offline cap, crit luck', () => {
  const s = fresh()
  s.money = 1e12
  s.upgrades['wasserfass'] = 2
  assert.equal(waterCharges(s), CONFIG.waterChargesPerCrop + 2)
  withBoringRng(() => sowPlot(0))
  assert.equal(s.plots[0].waterLeft, CONFIG.waterChargesPerCrop + 2)

  s.upgrades['sternenuhr'] = 4
  assert.ok(Math.abs(comboWindowSeconds(s) - (CONFIG.comboWindowSeconds + 2)) < 1e-9)

  s.upgrades['nachteule'] = 8
  // PHASE 12: Sternenuhr (level 4 above) now also stretches the offline cap
  assert.equal(offlineCapHours(s), CONFIG.offlineCapHours + 16 + 4 * CONFIG.sternenuhrOfflinePerLevel)

  // crit luck: a roll that misses by default becomes a perfect with clover
  const probe = CONFIG.critLegendaryChance + CONFIG.critPerfectChance + 0.02
  withRngQueue([probe, 0.5, 0.5], () => {
    tick(s, 99999)
    assert.equal(harvestPlot(0).crit, 'none', 'baseline: roll misses')
  })
  s.upgrades['kleeblatt'] = 5 // +5 % perfect, +1 % legendary
  withBoringRng(() => sowPlot(0))
  withRngQueue([probe, 0.5, 0.5], () => {
    tick(s, 99999)
    assert.equal(harvestPlot(0).crit, 'perfect', 'clover turns the same roll golden')
  })
})

test('PHASE 12: post-prestige quests stay on tier; idle upgrade bonuses', () => {
  withBoringRng(() => {
    // post-prestige: low round earnings but a high all-time floor → no basil,
    // and never an order for produce the player has never reached
    const s = fresh()
    s.totalEarned = 0
    s.maxUnlockEarned = 1e12
    for (let i = 0; i < 30; i++) {
      const q = generateQuest(s)
      for (const it of q.items) {
        if (it.plantId) {
          assert.notEqual(it.plantId, 'basilikum', 'no trivial basil after prestige')
          const def = PLANTS.find((p) => p.id === it.plantId)
          assert.ok(def.unlockAtTotalEarned <= s.maxUnlockEarned, 'order plant was reachable before')
          assert.ok(!def.beautyBonus && !def.passiveIncome, 'only harvestable produce')
        } else {
          const reachable = PLANTS.some(
            (p) => p.category === it.category && !p.beautyBonus && !p.passiveIncome && p.unlockAtTotalEarned <= s.maxUnlockEarned
          )
          assert.ok(reachable, 'category order has reachable produce')
        }
      }
    }
    // a fresh start (no progress) may still ask for basil
    const e = fresh()
    e.totalEarned = 0
    e.maxUnlockEarned = 0
    assert.equal(generateQuest(e).items[0].plantId, 'basilikum', 'fresh start can ask basil')
  })

  // Wasserfass: passive growth bonus (idle value) + counts toward cannabis care
  const w = fresh()
  assert.ok(Math.abs(growthMultiplier(w) - 1) < 1e-9)
  w.upgrades['wasserfass'] = 3
  assert.ok(Math.abs(growthMultiplier(w) - (1 + 3 * CONFIG.wasserfassGrowthPerLevel)) < 1e-9, 'wasserfass adds growth')
  w.money = 1e15
  w.totalEarned = 1e18
  w.licenses = 3
  w.upgrades['giesskanne'] = 3 // cbdhanf needs 5; 3 + wasserfass 3 = 6 ≥ 5 → full speed
  selectPlant('cbdhanf')
  assert.ok(sowPlot(0))
  const cbd = PLANTS.find((p) => p.id === 'cbdhanf')
  tick(w, cbd.growTime)
  assert.ok(plotReady(w.plots[0]), 'wasserfass tops up the cannabis watering care')
})

test('PHASE 13: fair amounts, order types, reservation, milestones, compost garden', () => {
  // fair amounts: a fast crop asks for far more units than a slow endgame one
  withBoringRng(() => {
    const fast = fresh()
    fast.level = 40 // full effort scale (PHASE 25 ramps amounts with progression)
    const fq = generateQuest(fast)
    assert.equal(fq.items[0].plantId, 'basilikum')
    const fastAmount = fq.items[0].amount
    assert.ok(fastAmount > 50, 'a fast crop can be asked for in bulk (once progressed)')

    const slow = fresh()
    slow.level = 40
    slow.totalEarned = 2e15
    slow.maxUnlockEarned = 2e15
    const si = generateQuest(slow).items[0]
    const slowPlant = PLANTS.find((p) => p.id === si.plantId)
    assert.ok(si.amount < fastAmount, 'slow plant asks for fewer units than a fast one')
    assert.ok(si.amount <= slowPlant.yield * 4, 'no absurd haul for a slow endgame crop')
  })

  // order types via controlled rolls: tier, client, kind, then picks/amounts
  const make = (kindRoll) => {
    const s = fresh()
    s.parcels = 2
    s.totalEarned = 1e7
    s.maxUnlockEarned = 1e7
    s.plots = Array.from({ length: 16 }, () => ({ plantId: null, progress: 0, waterLeft: 0, regrowing: false }))
    let q
    withRngQueue([0.5, 0.5, kindRoll, 0.5, 0.5, 0.5, 0.5, 0.5], () => {
      q = generateQuest(s)
    })
    return { s, q }
  }
  const combi = make(0.1).q
  assert.equal(combi.kind, 'combi')
  assert.ok(combi.items.length === 2 && combi.items.every((it) => it.plantId), 'combo = two plant lines')
  const category = make(0.2).q
  assert.equal(category.kind, 'category')
  assert.ok(category.items.length === 1 && category.items[0].category, 'category order targets a category')
  const big = make(0.35).q
  assert.equal(big.kind, 'big')
  assert.ok(big.rewardTickets >= 1, 'big haul drops an extra ticket')

  // reservation for combi (per plant) and category (the category's held stock)
  const cr = make(0.1)
  cr.s.quests = [cr.q]
  const a = cr.q.items[0]
  cr.s.inventory[a.plantId] = a.amount + 5
  assert.equal(questReserved(cr.s, a.plantId), a.amount, 'combi reserves each plant line')

  const kr = make(0.2)
  kr.s.quests = [kr.q]
  const catItem = kr.q.items[0]
  const catPlant = PLANTS.find((p) => p.category === catItem.category)
  kr.s.inventory[catPlant.id] = 3
  assert.equal(questReserved(kr.s, catPlant.id), Math.min(catItem.amount, 3), 'category reserves held stock')

  // parcel milestones
  assert.equal(parcelBonus(1, 'yield'), 0)
  assert.ok(parcelBonus(2, 'yield') > 0, 'parcel 2 gives a yield bonus')
  const slotS = fresh()
  slotS.parcels = 5
  assert.equal(questSlotCount(slotS), questSlots(1) + 1, 'parcel 5 adds a quest slot')

  // compost garden: spend compost, keep the flat bonus, gated by parcel
  const g = fresh()
  g.compost = 1000
  g.parcels = 1
  const claimedBefore = compostClaimed(g)
  assert.ok(buyCompostUpgrade('fruchtbarerBoden'))
  assert.equal(g.compostUpgrades['fruchtbarerBoden'], 1)
  assert.equal(compostClaimed(g), claimedBefore, 'spending keeps total claimed (flat bonus intact)')
  assert.ok(g.compostSpent > 0 && g.compost < 1000)
  assert.ok(yieldMultiplier(g) > 1, 'compost upgrade lifts yield')
  assert.ok(!buyCompostUpgrade('auftragshumus'), 'parcel-gated upgrade locked at parcel 1')
  g.parcels = 10
  assert.ok(buyCompostUpgrade('auftragshumus'), 'auftragshumus unlocks at parcel 10')
  assert.equal(compostGain(g), 0, 'spending compost grants no extra prestige gain')
  assert.ok(Number.isFinite(yieldMultiplier(g)) && Number.isFinite(growthMultiplier(g)), 'no NaN')
})

test('PHASE 44: ornamentals are gallery-only and their beauty raises sell prices', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e12
    s.totalEarned = 1e15

    // never sown on the field — selectPlant + sowPlot both refuse ornamentals
    selectPlant('nachtrose')
    assert.notEqual(s.selectedPlantId, 'nachtrose', 'ornamentals are never selectable')
    s.selectedPlantId = 'nachtrose' // force past selectPlant to test the sow guard
    assert.equal(sowPlot(0), false, 'sowPlot refuses an ornamental')

    // buying it into the gallery raises every sale by its beauty (no plot used)
    assert.ok(buyOrnamental('nachtrose'))
    assert.equal(ornamentalCount(s, 'nachtrose'), 1)
    assert.ok(s.plots.every((p) => p.plantId === null), 'no field plot consumed')
    assert.ok(Math.abs(beautyMultiplier(s) - 1.05) < 1e-9)
    s.marketTime = 0
    s.inventory['basilikum'] = 100
    assert.equal(sellPlant('basilikum'), Math.round(100 * 3 * 1.05))

    // quests never order ornamentals or timber (no harvest)
    for (let i = 0; i < 25; i++) {
      const q = generateQuest(s)
      for (const it of q.items) {
        if (it.plantId) {
          const def = PLANTS.find((p) => p.id === it.plantId)
          assert.ok(!def.beautyBonus && !def.passiveIncome, 'no orders for ornamentals/timber')
        }
      }
    }

    // beauty survives prestige (the collection is permanent)
    const beautyBefore = beautyMultiplier(s)
    s.compost = 1e9
    leaseParcel()
    assert.ok(Math.abs(beautyMultiplier(getState()) - beautyBefore) < 1e-9, 'gallery beauty survives prestige')
  })
})

test('offline progress runs through the same tick', () => {
  const s = fresh()
  s.money = 100
  assert.ok(sowPlot(0))
  const report = applyOfflineProgress(Date.now() - PLANTS[0].growTime * 1000 - 5000)
  assert.ok(report !== null && report.ripened >= 1)
  assert.ok(plotReady(getState().plots[0]))
})

test('PHASE 89: „Göttlich" category — beyond cosmic, NO parcel gate (buy by earnings)', () => {
  const divine = PLANTS.filter((p) => p.category === 'goettlich')
  assert.ok(divine.length >= 6, 'a full divine ladder exists')
  const topCosmos = PLANTS.filter((p) => p.category === 'kosmos').at(-1)
  for (const p of divine) {
    // the whole point of the request: these must NOT be parcel-gated
    assert.ok(!p.unlockParcel, `${p.id}: no parcel gate`)
    // strictly beyond the cosmic top in both value and unlock
    assert.ok(p.unlockAtTotalEarned > topCosmos.unlockAtTotalEarned, `${p.id}: unlocks past cosmic`)
    assert.ok(p.regrowTime && p.regrowTime < p.growTime, `${p.id}: regrow plant`)
  }
  // reachable by EARNINGS alone with only a starter parcel count — no re-climb wall
  const first = divine[0]
  assert.equal(
    isPlantUnlocked(first, { ...fresh(), totalEarned: first.unlockAtTotalEarned, parcels: 1 }),
    true,
    'one parcel + enough earnings is enough — bought directly'
  )
  assert.equal(
    isPlantUnlocked(first, { ...fresh(), totalEarned: first.unlockAtTotalEarned * 0.5, parcels: 999 }),
    false,
    'below the earnings threshold it stays locked (earnings are the only gate)'
  )
  // the divine category has its own specialisation (growth build)
  const spec = categorySpecById('goettlich')
  assert.ok(spec && spec.unique.kind === 'growth', 'divine specialisation boosts growth')
  // every stage sprite resolves (missing sprite would throw at render time)
  for (const p of divine) for (const st of ['-1', '-2', '-3']) assert.ok(SPRITES[`${p.id}${st}`], `${p.id}${st} sprite`)
  assert.ok(SPRITES['seedling-goettlich'], 'divine seedling sprite')
})

test('PHASE 88: relic sets grant a flat bonus only when every member is owned', () => {
  const s = fresh()
  s.relics = {}
  // no relics → no set bonus anywhere
  assert.equal(relicSetBonus(s, 'yield'), 0, 'empty: no yield set bonus')
  assert.equal(isRelicSetComplete(s, 'urelemente'), false, 'empty: urelemente incomplete')

  const urelemente = RELIC_SETS.find((x) => x.id === 'urelemente')
  assert.ok(urelemente, 'urelemente set exists')
  // owning a subset does not complete the set (no partial bonus)
  s.relics[urelemente.members[0]] = 3 // stacking one relic ≠ breadth
  assert.equal(relicSetOwned(s, 'urelemente'), 1, 'one distinct member owned')
  assert.equal(isRelicSetComplete(s, 'urelemente'), false, 'partial: still incomplete')
  assert.equal(relicSetBonus(s, 'yield'), 0, 'partial: no set bonus yet')

  // own >= 1 of every member → set completes, flat bonus applies (once)
  for (const id of urelemente.members) s.relics[id] = 1
  assert.equal(isRelicSetComplete(s, 'urelemente'), true, 'complete: all members owned')
  assert.equal(relicSetBonus(s, 'yield'), urelemente.bonus, 'complete: exactly the flat set bonus')

  // extra copies of a member do NOT scale the set bonus (only completion matters)
  s.relics[urelemente.members[0]] = 99
  assert.equal(relicSetBonus(s, 'yield'), urelemente.bonus, 'flat: extra copies do not stack the set')

  // full collection: owning every relic completes the capstone too (adds to yield)
  for (const r of RELICS) s.relics[r.id] = 1
  const voll = RELIC_SETS.find((x) => x.id === 'vollsammlung')
  assert.ok(voll && isRelicSetComplete(s, 'vollsammlung'), 'full: capstone complete')
  // all yield sets active now sum (robust to added sets like the grand capstone)
  const expectedYield = RELIC_SETS.filter((x) => x.effect === 'yield' && isRelicSetComplete(s, x.id)).reduce(
    (n, x) => n + x.bonus,
    0
  )
  assert.equal(relicSetBonus(s, 'yield'), expectedYield, 'full: all complete yield sets sum')
  assert.ok(relicSetBonus(s, 'yield') >= urelemente.bonus + voll.bonus, 'full: at least urelemente + capstone')
})

test('PHASE 90: mythic relic tier deepens expeditions — new sets, deep destinations', () => {
  const mythic = RELICS.filter((r) => r.rarity === 'mythic')
  assert.ok(mythic.length === 3, 'three mythic relics exist')
  // the mythic set completes only with all three mythics (breadth, like other sets)
  const s = fresh()
  s.relics = {}
  assert.equal(isRelicSetComplete(s, 'mythischer_bund'), false, 'no mythics → bund incomplete')
  for (const r of mythic) s.relics[r.id] = 1
  assert.equal(isRelicSetComplete(s, 'mythischer_bund'), true, 'all three mythics → bund complete')
  assert.ok(relicSetBonus(s, 'growth') > 0, 'mythic bund boosts growth')

  // adding the mythic tier must NOT revoke the original 8-relic capstone
  const s2 = fresh()
  s2.relics = {}
  for (const r of RELICS.filter((r) => r.rarity !== 'mythic')) s2.relics[r.id] = 1
  assert.equal(isRelicSetComplete(s2, 'vollsammlung'), true, 'the 8 originals still complete Vollständige Sammlung')
  assert.equal(isRelicSetComplete(s2, 'allsammlung'), false, 'the grand capstone still needs the mythics')

  // the two deep destinations are the only mythic source, gated deep by worlds
  const deep = EXPEDITIONS.filter((e) => (e.unlockWorlds ?? 0) >= 3)
  assert.ok(deep.length >= 2, 'two deep (worlds ≥ 3) destinations exist')
  const dropsMythic = new Set(deep.flatMap((e) => [...e.safePool, ...e.riskyPool]))
  for (const r of mythic) assert.ok(dropsMythic.has(r.id), `${r.id} is obtainable from a deep destination`)
  // no shallow destination leaks a mythic relic
  const shallow = EXPEDITIONS.filter((e) => (e.unlockWorlds ?? 0) < 3)
  for (const e of shallow) for (const id of [...e.safePool, ...e.riskyPool]) {
    assert.ok(!mythic.some((m) => m.id === id), `shallow ${e.id} must not drop mythic ${id}`)
  }
})

console.log(`\nAlle ${passed} Sanity-Tests bestanden.`)
