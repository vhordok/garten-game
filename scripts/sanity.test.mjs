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
import { PLANTS, produceName, steadyProfitPerSecond } from '../src/lib/data/plants.ts'
import { levelUpReward, questSlots, xpToNext } from '../src/lib/data/progression.ts'
import { upgradeById } from '../src/lib/data/upgrades.ts'
import {
  buyCompostUpgrade,
  buyLicense,
  buyPlot,
  buySpecialization,
  buyUpgrade,
  catchFirefly,
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
  refundScratchTicket,
  selectPlant,
  sellAll,
  sellPlant,
  setAutoSowPlant,
  settleScratchCard,
  skipQuest,
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
  specializationCompostCost,
  specializationCost,
  specializationLevel,
  specializationPurchase,
  specializationRequirement,
  specializationYieldBonus,
  specUniqueBonus,
  waterCharges,
  yieldMultiplier,
} from '../src/lib/game/modifiers.ts'
import { applyOfflineProgress } from '../src/lib/game/offline.ts'
import { exportSave, importSave } from '../src/lib/game/save.ts'
import { createDefaultState, getState, replaceState } from '../src/lib/game/state.ts'
import { plotReady, tick } from '../src/lib/game/tick.ts'

/** Reset to a fresh default state and return the live reference. */
function fresh() {
  replaceState(createDefaultState())
  return getState()
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
  withRngQueue([0.9], () => {
    const card = drawScratchCard()
    assert.equal(card.prizeType, 'fertilizer')
    const before = s.fertilizerCharges
    const won = settleScratchCard(card, [card.symbol, card.symbol, card.symbol])
    assert.equal(s.fertilizerCharges, before + won.amount)
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

test('achievements: tick unlocks them, each grants +1 % yield', () => {
  withBoringRng(() => {
    const s = fresh()
    assert.equal(s.achievements.length, 0)
    s.stats.planted = 50
    s.lifetimeEarned = 1000
    tick(s, 0.1)
    assert.ok(s.achievements.includes('gruener-daumen'))
    assert.ok(s.achievements.includes('erster-tausender'))
    const count = s.achievements.length
    const expected = 1 + 0.01 * count
    assert.ok(Math.abs(yieldMultiplier(s) - expected) < 1e-9)
    tick(s, 0.1)
    assert.equal(s.achievements.length, count, 'no duplicates')

    // survives a save roundtrip
    const code = exportSave()
    fresh()
    importSave(code)
    assert.equal(getState().achievements.length, count)
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

    // the Sä-Gnom never auto-sows ornamentals (no money-drain on autopilot)
    const g = fresh()
    g.money = 1e9
    g.totalEarned = 1e15
    selectPlant('nachtrose')
    g.upgrades['saegnom'] = 10
    for (const p of g.plots) p.plantId = null
    tick(g, 10)
    assert.ok(g.plots.every((p) => p.plantId === null), 'gnome leaves the field empty for ornamentals')
  })
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
    assert.ok(Math.abs(specializationYieldBonus(s, 'kraeuter') - 1.08) < 1e-9)
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
    s.specializations['kraeuter'] = 4
    assert.ok(Math.abs(specUniqueBonus(s, 'kraeuter', 'growth') - 0.2) < 1e-9, 'kraeuter perk = growth')
    assert.equal(specUniqueBonus(s, 'kraeuter', 'crit'), 0, 'kraeuter has no crit perk')
    assert.equal(specUniqueBonus(s, 'gemuese', 'growth'), 0, 'perk is per-category')
    s.specializations['gemuese'] = 5
    assert.ok(Math.abs(specUniqueBonus(s, 'gemuese', 'crit') - 0.05) < 1e-9, 'gemuese perk = crit')

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
    selectPlant('nachtrose')
    const rose = PLANTS.find((p) => p.id === 'nachtrose')
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
    const fq = generateQuest(fast)
    assert.equal(fq.items[0].plantId, 'basilikum')
    const fastAmount = fq.items[0].amount
    assert.ok(fastAmount > 50, 'a fast crop can be asked for in bulk')

    const slow = fresh()
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

test('ornamentals: never harvestable, beauty raises sell prices', () => {
  withBoringRng(() => {
    const s = fresh()
    s.money = 1e12
    s.totalEarned = 1e15
    selectPlant('nachtrose')
    assert.ok(sowPlot(0))
    tick(s, 99999)
    assert.equal(plotReady(s.plots[0]), false, 'ornamentals never become harvestable')
    assert.equal(harvestPlot(0).units, 0)
    assert.equal(s.plots[0].plantId, 'nachtrose', 'the rose keeps standing')

    // +5 % on every sale while it stands (market neutralized for exactness)
    assert.ok(Math.abs(beautyMultiplier(s) - 1.05) < 1e-9)
    s.marketTime = 0
    s.inventory['basilikum'] = 100
    assert.equal(sellPlant('basilikum'), Math.round(100 * 3 * 1.05))

    // helpers ignore ornamentals
    s.upgrades['erntehelfer'] = 10
    tick(s, 60)
    assert.equal(s.plots[0].plantId, 'nachtrose')

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

    // rip out works
    assert.ok(clearPlot(0))
    assert.ok(Math.abs(beautyMultiplier(s) - 1) < 1e-9)
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

console.log(`\nAlle ${passed} Sanity-Tests bestanden.`)
