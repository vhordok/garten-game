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
import { PLANTS, steadyProfitPerSecond } from '../src/lib/data/plants.ts'
import { levelUpReward, questSlots, xpToNext } from '../src/lib/data/progression.ts'
import { upgradeById } from '../src/lib/data/upgrades.ts'
import {
  buyPlot,
  buyUpgrade,
  clearPlot,
  compostGain,
  drawScratchCard,
  ensureQuests,
  fulfillQuest,
  harvestAllReady,
  harvestPlot,
  leaseParcel,
  maxPlots,
  nextPlotCost,
  nextUpgradeCost,
  refundScratchTicket,
  selectPlant,
  sellPlant,
  settleScratchCard,
  skipQuest,
  sowPlot,
  upgradeLevel,
  waterPlot,
} from '../src/lib/game/actions.ts'
import { questTier } from '../src/lib/data/questFlavor.ts'
import { bestHarvestValue } from '../src/lib/data/scratch.ts'
import {
  comboWindowSeconds,
  growthMultiplier,
  offlineCapHours,
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
  const code = exportSave()
  fresh()
  assert.notEqual(importSave(code), null)
  assert.equal(getState().money, 1234)
  assert.equal(getState().upgrades['giesskanne'], 3)

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
    const plant = PLANTS.find((p) => p.id === quest.plantId)
    assert.ok(plant, 'quest plant must exist')
    assert.equal(quest.reward, Math.round(quest.amount * plant.sellValue * questTier(quest.tier).rewardFactor))
    assert.ok(quest.client.length > 0, 'every order has a client')

    // not enough in storage → refused, nothing changes
    assert.equal(fulfillQuest(quest.id), null)

    // stock up and deliver (streak 0 → payout = base reward, then streak 1)
    s.inventory[quest.plantId] = quest.amount + 2
    const moneyBefore = s.money
    const earnedBefore = s.totalEarned
    const result = fulfillQuest(quest.id)
    assert.ok(result)
    assert.equal(s.money, moneyBefore + quest.reward)
    assert.equal(s.totalEarned, earnedBefore + quest.reward)
    assert.equal(s.questStreak, 1)
    assert.equal(s.inventory[quest.plantId], 2)
    assert.equal(s.quests.length, 1, 'slot is refilled')
    assert.notEqual(s.quests[0].id, quest.id, 'a fresh order replaces the delivered one')

    // a gold order pays the streak bonus and drops a ticket
    s.quests[0] = {
      id: 9999,
      plantId: 'basilikum',
      amount: 2,
      reward: 100,
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
    assert.equal(goldResult.bonusTicket, true)
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

    // full hit pays everything, partial 40 %, miss a consolation (min 1)
    assert.equal(settleScratchCard(card, 3).amount, card.amount)
    assert.equal(settleScratchCard(card, 2).amount, Math.max(Math.round(card.amount * CONFIG.scratchPartialFactor), 1))
    assert.equal(settleScratchCard(card, 0).amount, Math.max(Math.round(card.amount * CONFIG.scratchConsolationFactor), 1))
    assert.equal(s.totalEarned, 0, 'lottery winnings are not sales')
  })

  // 0.97 lands in the jackpot bracket; fertilizer settle grants charges
  withRngQueue([0.97], () => {
    const card = drawScratchCard()
    assert.equal(card.prizeType, 'jackpot')
    const moneyBefore = s.money
    assert.equal(settleScratchCard(card, 3).amount, 80 * hv)
    assert.equal(s.money, moneyBefore + 80 * hv)
  })
  withRngQueue([0.9], () => {
    const card = drawScratchCard()
    assert.equal(card.prizeType, 'fertilizer')
    const before = s.fertilizerCharges
    const won = settleScratchCard(card, 3)
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

test('plant data: ascending unlocks, doubling profit curve, ROI ≥ 3', () => {
  let lastUnlock = -1
  let lastProfit = 0
  for (const plant of PLANTS) {
    assert.ok(plant.unlockAtTotalEarned > lastUnlock || plant.unlockAtTotalEarned === 0, `${plant.id}: unlocks must ascend`)
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
    assert.equal(clearPlot(0), false)
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

    // compost beats the lost upgrades? not necessarily — but it must apply:
    const expectedYield =
      (1 + CONFIG.compostYieldPerPoint * 2) * (1 + CONFIG.levelYieldPerLevel * 6)
    assert.ok(Math.abs(yieldMultiplier(s) - expectedYield) < 1e-9)
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

    // helpers are sober: no crits, no combo, no tickets
    assert.equal(s.stats.crits, 0)
    assert.equal(s.combo.count, 0)
    assert.equal(s.scratchTickets, 0)
    assert.ok(basil.yield >= 1)
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
  assert.equal(offlineCapHours(s), CONFIG.offlineCapHours + 16)

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

test('offline progress runs through the same tick', () => {
  const s = fresh()
  s.money = 100
  assert.ok(sowPlot(0))
  const report = applyOfflineProgress(Date.now() - PLANTS[0].growTime * 1000 - 5000)
  assert.ok(report !== null && report.ripened >= 1)
  assert.ok(plotReady(getState().plots[0]))
})

console.log(`\nAlle ${passed} Sanity-Tests bestanden.`)
