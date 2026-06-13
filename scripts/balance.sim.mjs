// Balance audit: plays the game through the REAL core with a greedy strategy.
// Two modes:
//   (default)            first-session pacing — continuous active play, snapshots
//                        at 5/15/30/60/120 minutes (PHASE 6).
//   day [activeHours]    long-horizon audit — N active hours/day over 14 days,
//                        prints a time-to-milestone table.
// Run via `npx tsx scripts/balance.sim.mjs [day [activeHoursPerDay]]`.
// Not part of npm test.

globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }

import { PLANTS } from '../src/lib/data/plants.ts'
import { steadyProfitPerSecond } from '../src/lib/data/plants.ts'
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

const STEP = 5 // seconds per loop
const DAY = 86400

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

/** best unlocked & affordable-ish plant by list order (later = stronger) */
function bestPlant(s) {
  let best = PLANTS[0]
  for (const p of PLANTS) {
    if (p.beautyBonus || p.passiveIncome) continue // not the sim's business
    if (p.requiresLicense && s.licenses < p.requiresLicense) continue
    if (s.totalEarned < p.unlockAtTotalEarned) continue
    if (p.seedCost > s.money) continue
    best = p
  }
  return best
}

/** One greedy active beat: harvest, sell, replant, reinvest. */
function activeBeat(s) {
  harvestAllReady()
  sellAll()
  const plant = bestPlant(s)
  if (s.selectedPlantId !== plant.id) selectPlant(plant.id)
  for (let i = 0; i < s.plots.length; i++) {
    if (s.plots[i].plantId === null) sowPlot(i)
  }
  if (s.plots.length < maxPlots(s) && nextPlotCost(s) < s.money * 0.35) buyPlot()
  for (const u of UPGRADES) {
    const cost = nextUpgradeCost(u, s)
    if (cost !== null && cost < s.money * 0.35) buyUpgrade(u.id)
  }
}

const unlockedCount = (s) => PLANTS.filter((p) => s.totalEarned >= p.unlockAtTotalEarned).length

// ── first-session pacing ───────────────────────────────────────────────────
function runSession() {
  replaceState(createDefaultState())
  const s = getState()
  const CHECKPOINTS = [5, 15, 30, 60, 120].map((m) => m * 60)
  const limit = CHECKPOINTS[CHECKPOINTS.length - 1]
  const rows = []
  const unlockLog = []
  let prestigeReadyAt = null
  let nextCp = 0
  let seenUnlocks = unlockedCount(s)

  for (let t = 0; t <= limit; t += STEP) {
    tick(s, STEP)
    activeBeat(s)

    if (prestigeReadyAt === null && compostGain(s) >= 1) prestigeReadyAt = t
    const nowUnlocks = unlockedCount(s)
    if (nowUnlocks > seenUnlocks) {
      for (const p of PLANTS) {
        if (s.totalEarned >= p.unlockAtTotalEarned && !unlockLog.some((u) => u.id === p.id)) {
          unlockLog.push({ id: p.id, name: p.name, t })
        }
      }
      seenUnlocks = nowUnlocks
    }

    if (nextCp < CHECKPOINTS.length && t >= CHECKPOINTS[nextCp]) {
      rows.push({
        t,
        money: s.money,
        earned: s.totalEarned,
        level: s.level,
        plots: `${s.plots.length}/${maxPlots(s)}`,
        sorten: nowUnlocks,
        prestige: compostGain(s),
        best: bestPlant(s).name,
      })
      nextCp++
    }
  }

  console.log('\n══ Erste Session — durchgehend aktiv (greedy) ══\n')
  console.log('  Zeit |     Geld | verdient | Lvl | Beete |Sort| Prestige | beste Sorte')
  console.log('  ─────┼──────────┼──────────┼─────┼───────┼────┼──────────┼────────────')
  for (const r of rows) {
    console.log(
      `  ${fmtT(r.t).padStart(4)} | ${fmtN(r.money).padStart(8)} | ${fmtN(r.earned).padStart(8)} | ` +
        `${String(r.level).padStart(3)} | ${r.plots.padStart(5)} | ${String(r.sorten).padStart(2)} | ` +
        `${(r.prestige + ' K').padStart(8)} | ${r.best}`
    )
  }
  console.log('\nFreischaltungen in den ersten 2 h:')
  if (unlockLog.length <= 1) console.log('  (nur die Start-Sorten)')
  for (const u of unlockLog) console.log(`  ${fmtT(u.t).padStart(5)}  ${u.name}`)
  console.log(
    `\nPrestige #1 verfügbar: ${prestigeReadyAt === null ? 'noch nicht in 2 h' : 'ab ' + fmtT(prestigeReadyAt)}`
  )
}

// ── long-horizon audit (legacy) ────────────────────────────────────────────
function runLongHorizon(activeHours) {
  replaceState(createDefaultState())
  const s = getState()
  const SIM_DAYS = 14
  const activeSecs = activeHours * 3600
  const milestones = []
  const seen = new Set()
  const note = (key, label, t) => {
    if (seen.has(key)) return
    seen.add(key)
    milestones.push({ t, label })
  }
  let t = 0
  let prestiges = 0

  while (t < SIM_DAYS * DAY) {
    const active = t % DAY < activeSecs
    tick(s, STEP)
    t += STEP
    if (active) {
      activeBeat(s)
      const gain = compostGain(s)
      if (gain >= Math.max(s.parcels, 2)) {
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

  console.log(`\n══ Langzeit-Audit: ${activeHours} h aktiv/Tag, Rest idle ══\n`)
  for (const m of milestones.sort((a, b) => a.t - b.t)) {
    console.log(`${fmtT(m.t).padStart(6)}  ${m.label}`)
  }
  console.log(
    `\nEnde nach ${SIM_DAYS}d: Geld ${fmtN(s.money)}, verdient (Runde) ${fmtN(s.totalEarned)}, ` +
      `lifetime ${fmtN(s.lifetimeEarned)}, Level ${s.level}, Parzelle ${s.parcels}, Kompost ${s.compost}, ` +
      `Beete ${s.plots.length}/${maxPlots(s)}`
  )
  console.log(`Upgrades: ${UPGRADES.map((u) => `${u.name}:${upgradeLevel(s, u.id)}`).join(' ')}`)
}

// ── subsystem balance audit (PHASE 7) ──────────────────────────────────────
// Static arithmetic — checks whether the passive trees, the daily gift and the
// watering boost are tier-appropriate against the active crop economy.
function runSubsystems() {
  console.log('\n══ Subsystem-Audit (Phase 7) ══\n')

  // best active steady profit/s among harvest crops unlocked at-or-before tier
  const bestActiveAt = (earned) => {
    let best = 0
    let name = '—'
    for (const p of PLANTS) {
      if (p.beautyBonus || p.passiveIncome) continue
      if (p.unlockAtTotalEarned > earned) continue
      const v = steadyProfitPerSecond(p)
      if (v > best) {
        best = v
        name = p.name
      }
    }
    return { best, name }
  }

  console.log('Passiv-Bäume vs. beste aktive Sorte derselben Stufe (Gold/s, ohne Multis):')
  console.log('  Baum        | passiv/s | beste aktive Sorte (Stufe) | Verhältnis')
  console.log('  ────────────┼──────────┼────────────────────────────┼──────────')
  for (const p of PLANTS) {
    if (!p.passiveIncome) continue
    const a = bestActiveAt(p.unlockAtTotalEarned)
    const ratio = a.best > 0 ? (p.passiveIncome / a.best).toFixed(2) : '—'
    console.log(
      `  ${p.name.padEnd(11)} | ${String(p.passiveIncome).padStart(8)} | ` +
        `${(a.name + ' (' + fmtN(p.unlockAtTotalEarned) + ')').padEnd(26)} | ×${ratio}`
    )
  }
  console.log(
    '\n  Lesart: ~0.9–1.9× ist gesund — Passiv handelt Crit/Kombo/Aufträge/Lose\n' +
      '  gegen Null-Aufwand + Offline-Lauf ein. Lücke: zwischen Eiche (800K) und\n' +
      '  Mammutbaum (120M) fehlt ein mittlerer Passiv-Baum → Kandidat für Phase 9.'
  )

  // daily gift: 7-day streak total in units of one best harvest (hv)
  const dailyGoldXhv = 5 + 10 + 20 + 25 // days 1,3,6,7 pay gold in ×hv
  console.log(
    `\nTagesbonus: 7-Tage-Serie zahlt ${dailyGoldXhv}× eine Besternte (hv) + ` +
      '5 Tickets + 9 Dünger.\n  Gold zählt NICHT als Einnahme (kein Unlock-Push), ' +
      'skaliert linear mit der besten\n  Sorte — beschränkt und progressionsgekoppelt, kein Runaway.'
  )

  // watering: active splash skips a flat fraction of grow time
  console.log(
    '\nGießen: je Guss +' +
      Math.round(0.15 * 100) +
      ' % der Wuchszeit (Config waterProgressBoost), 3 Ladungen/Aussaat,\n' +
      '  via Wasserfass bis 6 → max ~90 % Skip pro Sorte. Rein aktiv (kein Auto-\n' +
      '  Gießer), pro Sorte gedeckelt — lohnt bei langsamen Sorten, belanglos bei schnellen.'
  )
}

if (process.argv[2] === 'day') {
  runLongHorizon(Number(process.argv[3] ?? 2))
} else if (process.argv[2] === 'subsystems') {
  runSubsystems()
} else {
  runSession()
}
