// Balance audit: plays the game through the REAL core with a greedy
// strategy and prints time-to-milestone tables. Run via `npx tsx
// scripts/balance.sim.mjs [activeHoursPerDay]` — not part of npm test.

globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }

import { PLANTS } from '../src/lib/data/plants.ts'
import { UPGRADES } from '../src/lib/data/upgrades.ts'
import {
  buyPlot,
  buyUpgrade,
  compostGain,
  harvestAllReady,
  leaseParcel,
  maxPlots,
  nextPlotCost,
  nextUpgradeCost,
  selectPlant,
  sellAll,
  sowPlot,
  upgradeLevel,
} from '../src/lib/game/actions.ts'
import { createDefaultState, getState, replaceState } from '../src/lib/game/state.ts'
import { tick } from '../src/lib/game/tick.ts'

const ACTIVE_HOURS = Number(process.argv[2] ?? 2) // active play per day, rest idles
const SIM_DAYS = 14
const STEP = 5 // seconds per loop

function fmtT(s) {
  if (s < 3600) return `${(s / 60).toFixed(0)}m`
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`
  return `${(s / 86400).toFixed(1)}d`
}
function fmtN(v) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return `${Math.round(v)}`
}

replaceState(createDefaultState())
const s = getState()

const milestones = []
const seen = new Set()
function note(key, label, t) {
  if (seen.has(key)) return
  seen.add(key)
  milestones.push({ t, label })
}

/** best unlocked & affordable-ish plant by steady profit/s */
function bestPlant() {
  let best = PLANTS[0]
  for (const p of PLANTS) {
    if (s.totalEarned < p.unlockAtTotalEarned) continue
    if (p.seedCost > s.money) continue
    best = p
  }
  return best
}

let t = 0
let prestiges = 0
const DAY = 86400
const activeSecs = ACTIVE_HOURS * 3600

while (t < SIM_DAYS * DAY) {
  const tod = t % DAY
  const active = tod < activeSecs

  tick(s, STEP)
  t += STEP

  if (active) {
    harvestAllReady()
    sellAll()
    // sow best plant everywhere
    const plant = bestPlant()
    if (s.selectedPlantId !== plant.id) selectPlant(plant.id)
    for (let i = 0; i < s.plots.length; i++) {
      if (s.plots[i].plantId === null) sowPlot(i)
    }
    // greedy purchases: anything costing < 35 % of cash
    if (s.plots.length < maxPlots(s) && nextPlotCost(s) < s.money * 0.35) buyPlot()
    for (const u of UPGRADES) {
      const cost = nextUpgradeCost(u, s)
      if (cost !== null && cost < s.money * 0.35) {
        buyUpgrade(u.id)
        note(`upg-${u.id}-1`, `Upgrade ${u.name} Stufe 1`, t)
      }
    }
    // prestige once it pays meaningfully more than current compost
    const gain = compostGain(s)
    if (gain >= Math.max(2, Math.ceil(s.compost * 0.6))) {
      prestiges += 1
      note(`prestige-${prestiges}`, `Prestige #${prestiges} (+${gain} Kompost, gesamt ${s.compost + gain})`, t)
      leaseParcel()
    }
  }

  for (const p of PLANTS) {
    if (s.totalEarned >= p.unlockAtTotalEarned) note(`plant-${p.id}`, `Unlock ${p.name}`, t)
  }
  if (s.level >= 5) note('lvl5', 'Level 5 (3. Auftragsslot)', t)
  if (s.level >= 10) note('lvl10', 'Level 10', t)
}

console.log(`\nStrategie: ${ACTIVE_HOURS}h aktiv/Tag, danach idle (Helfer/Offline-Logik via tick)\n`)
for (const m of milestones.sort((a, b) => a.t - b.t)) {
  console.log(`${fmtT(m.t).padStart(6)}  ${m.label}`)
}
console.log(`\nEnde nach ${SIM_DAYS}d: Geld ${fmtN(s.money)}, verdient (Runde) ${fmtN(s.totalEarned)}, ` +
  `lifetime ${fmtN(s.lifetimeEarned)}, Level ${s.level}, Parzelle ${s.parcels}, Kompost ${s.compost}, ` +
  `Beete ${s.plots.length}/${maxPlots(s)}`)
const lvls = UPGRADES.map((u) => `${u.name}:${upgradeLevel(s, u.id)}`).join(' ')
console.log(`Upgrades: ${lvls}`)
