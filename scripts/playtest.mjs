// PHASE 28 — End-to-End-Playtest-Diagnose. Baut 20 repräsentative Spielstände
// vom frischen Start bis ins Very Late Game und prüft pro Stand durch die ECHTEN
// Core-Funktionen, ob die Progression rund ist: nächste sinnvolle Schritte je
// System, welche Systeme relevant/tot/dominant sind und ob das Ziel-Panel
// passende Ziele liefert. Reine Lesefunktion (kein Mutations-Seiteneffekt auf
// persistenten State). Lauf:  npx tsx scripts/playtest.mjs
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }

import { PLANTS, plantById } from '../src/lib/data/plants.ts'
import { UPGRADES } from '../src/lib/data/upgrades.ts'
import { LICENSES } from '../src/lib/data/licenses.ts'
import { COMPOST_UPGRADES } from '../src/lib/data/compostUpgrades.ts'
import { CATEGORY_SPECS } from '../src/lib/data/specializations.ts'
import { VARIANTS } from '../src/lib/data/variants.ts'
import { ACHIEVEMENTS } from '../src/lib/data/achievements.ts'
import { yieldMultiplier, sellMultiplier, growthMultiplier } from '../src/lib/game/modifiers.ts'
import { isPlantUnlocked } from '../src/lib/game/actions.ts'
import { refillQuests } from '../src/lib/game/quests.ts'
import { activeGoals } from '../src/lib/game/goals.ts'
import { claimAchievements } from '../src/lib/game/achievements.ts'
import { createDefaultState } from '../src/lib/game/state.ts'

function fmtN(v) {
  if (!isFinite(v)) return '∞'
  const u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp']
  let i = 0
  let n = Math.abs(v)
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++ }
  return `${v < 0 ? '-' : ''}${n.toFixed(n < 10 && i > 0 ? 2 : n < 100 && i > 0 ? 1 : 0)}${u[i]}`
}
function fmtT(s) {
  if (!isFinite(s)) return '∞'
  if (s <= 0) return 'sofort'
  if (s < 60) return `${s.toFixed(0)}s`
  if (s < 3600) return `${(s / 60).toFixed(1)}m`
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`
  return `${(s / 86400).toFixed(1)}d`
}

// ── state builder ───────────────────────────────────────────────────────────
function build(over = {}) {
  const s = createDefaultState()
  Object.assign(s, over)
  // sensible derived defaults
  if (over.lifetimeEarned === undefined) s.lifetimeEarned = Math.max(s.totalEarned, s.lifetimeEarned)
  if (over.maxUnlockEarned === undefined) s.maxUnlockEarned = s.totalEarned
  // grow the plot array to match the parcel count (cap to a believable size)
  const plotCount = over.plotCount ?? Math.min(4 + (s.parcels - 1) * 3, 60)
  s.plots = Array.from({ length: plotCount }, () => ({ plantId: null, progress: 0, waterLeft: 0, regrowing: false }))
  // optionally plant something so beauty/passive builds read correctly
  if (over.plant) {
    const def = plantById(over.plant)
    for (const p of s.plots) { p.plantId = over.plant; p.progress = def?.growTime ?? 0 }
  }
  // fill the quest board for the tier
  refillQuests(s)
  // claim reached achievement tiers (the loop does this every tick in real play),
  // so the achievement goal reflects the NEXT open tier, not a stale 100% one
  claimAchievements(s)
  return s
}

// best harvestable plant gold/s across the current plots, with real multipliers
function bestGoldPerSec(s) {
  const yM = yieldMultiplier(s), sM = sellMultiplier(s), gM = growthMultiplier(s)
  let best = 0
  for (const p of PLANTS) {
    if (p.yield <= 0 || !isPlantUnlocked(p, s)) continue
    const cycle = (p.regrowTime ?? p.growTime) / gM
    const perPlot = (p.yield * yM * p.sellValue * sM) / cycle
    if (perPlot > best) best = perPlot
  }
  return best * s.plots.length
}

const ALL_SYSTEMS = ['plant', 'upgrade', 'shop', 'license', 'quest', 'spec', 'skill', 'parcel', 'parcelMilestone', 'beauty', 'mastery', 'variant', 'achievement', 'compost', 'collection', 'scratch']

function diagnose(name, s) {
  const goals = activeGoals(s)
  const byId = {}
  for (const g of goals) if (!byId[g.id]) byId[g.id] = g
  const pick = (...ids) => { for (const id of ids) if (byId[id]) return byId[id]; return null }
  const lbl = (g) => g ? `${g.label} (${(g.fraction * 100).toFixed(0)}%${g.ready ? ', bereit' : ''})` : '—'

  const gps = bestGoldPerSec(s)
  // time to the top money-gated goal (plant/upgrade/shop/license) the player works toward
  const moneyGoal = goals.find((g) => !g.ready && ['plant', 'upgrade', 'shop', 'license'].includes(g.id) && g.target > g.current && g.id !== 'shop')
  let ttp = '—'
  if (moneyGoal && gps > 0) {
    // crude: the bar is money/target for money goals → remaining gold / gold-per-sec
    const remaining = moneyGoal.target - moneyGoal.current
    ttp = fmtT(remaining / gps)
  } else if (goals.some((g) => g.ready)) ttp = 'sofort (bereit-Ziel)'

  const present = new Set(goals.map((g) => g.id))
  const dead = ALL_SYSTEMS.filter((sys) => !present.has(sys))
  const nonReady = goals.filter((g) => !g.ready)
  const dominant = goals[0]

  console.log(`\n■ ${name}`)
  console.log(`   Stand: Lvl ${s.level} · ${fmtN(s.money)} Gold · ${s.parcels} Parz · ${s.plots.length} Beete · ${fmtN(s.compost)} Kompost · Lizenz ${s.licenses} · totalEarned ${fmtN(s.totalEarned)}`)
  console.log(`   1 Pflanze : ${lbl(pick('plant', 'collection'))}`)
  console.log(`   2 Shop    : ${lbl(pick('upgrade', 'shop'))}`)
  console.log(`   3 Kompost : ${lbl(pick('compost', 'parcel', 'parcelMilestone'))}`)
  console.log(`   4 Lizenz  : ${lbl(pick('license'))}`)
  console.log(`   5 Auftrag : ${lbl(pick('quest'))}`)
  console.log(`   6 Erfolg/Skill/Labor : ${lbl(pick('achievement', 'skill', 'variant'))}`)
  console.log(`   7 Zeit bis Fortschritt : ${ttp}  (beste Sorte ${fmtN(gps)} Gold/s auf ${s.plots.length} Beete)`)
  console.log(`   8 relevante Systeme (${present.size}) : ${[...present].join(', ')}`)
  console.log(`   9 tot wirkende Systeme : ${dead.length ? dead.join(', ') : '—'}`)
  console.log(`  10 dominantes Ziel : ${dominant ? `${dominant.id} → ${dominant.label}` : '—'}`)
  console.log(`  11 Ziel-Panel : ${goals.length} Ziele über ${new Set(goals.map((g) => g.tier)).size} Horizonte`)
  console.log(`  12 mehrere echte Optionen : ${nonReady.length >= 3 ? `JA (${nonReady.length} offene)` : `KNAPP (${nonReady.length})`}`)
  return { name, goals, dead, nonReady }
}

// unlock helper: totalEarned tiers (rough magnitudes from the ladder)
const T = { early: 5e3, mid10: 5e5, prestige1: 2e6, mid: 5e8, weltenrose: 8e15, qi570: 5.7e20, sx1: 1e21 }

console.log('════════ PHASE 28: END-TO-END-PLAYTEST (20 Szenarien) ════════')

const results = []
const push = (n, s) => results.push(diagnose(n, s))

// 1 frischer Start
push('1. Frischer Start (Lvl 1, 10 Gold, 4 Beete)', build({ money: 10, totalEarned: 0, level: 1, parcels: 1 }))
// 2 early
push('2. Early Game (Lvl 20)', build({ money: 5e4, totalEarned: T.early, level: 20, parcels: 1 }))
// 3 erstes Prestige
push('3. Erstes Prestige (Parzelle 2)', build({ money: 200, totalEarned: 0, level: 22, parcels: 2, compost: 2, lifetimeEarned: T.prestige1 }))
// 4 midgame mehrere parzellen
push('4. Midgame (Parzelle 5)', build({ money: 5e8, totalEarned: T.mid, level: 60, parcels: 5, compost: 60, lifetimeEarned: 5e9 }))
// 5 late mit weltenrose
push('5. Late Game (Weltenrose, Parzelle 8)', build({ money: 5e15, totalEarned: T.weltenrose, level: 200, parcels: 8, compost: 500, lifetimeEarned: 5e16, licenses: 3 }))
// 6 very late 570 Qi
push('6. Very Late (570 Qi, Parzelle 12)', build({ money: 5.7e20, totalEarned: T.qi570, level: 886, parcels: 12, compost: 3.2e5, compostSpent: 1.8e4, lifetimeEarned: 1.6e18, licenses: 3 }))
// 7 very late 1 Sx
push('7. Very Late (1 Sx, Parzelle 16)', build({ money: 1e21, totalEarned: T.sx1, level: 1500, parcels: 16, compost: 1e6, compostSpent: 5e4, lifetimeEarned: 5e18, licenses: 4 }))
// 8 parzelle 12
push('8. Parzelle 12', build({ money: 1e17, totalEarned: 1e17, level: 400, parcels: 12, compost: 1e4, lifetimeEarned: 1e18 }))
// 9 parzelle 20
push('9. Parzelle 20', build({ money: 1e19, totalEarned: 1e20, level: 900, parcels: 20, compost: 1e6, compostSpent: 1e5, lifetimeEarned: 1e20, licenses: 4 }))
// 10 parzelle 36
push('10. Parzelle 36', build({ money: 1e22, totalEarned: 1e22, level: 3000, parcels: 36, compost: 1e8, compostSpent: 1e7, lifetimeEarned: 1e22, licenses: 5 }))
// 11 shop fast maxed
const shopMax = build({ money: 1e18, totalEarned: 1e18, level: 600, parcels: 16, compost: 1e5, lifetimeEarned: 1e18, licenses: 4 })
for (const u of UPGRADES) if (!u.repeatable) shopMax.upgrades[u.id] = u.maxLevel
push('11. Shop fast maxed', shopMax)
// 12 kompost stark ausgebaut
const compMax = build({ money: 1e17, totalEarned: 1e17, level: 500, parcels: 16, compost: 5e5, compostSpent: 5e5, lifetimeEarned: 1e18, licenses: 3 })
for (const u of COMPOST_UPGRADES) if (!u.repeatable) compMax.compostUpgrades[u.id] = u.maxLevel
push('12. Kompost stark ausgebaut', compMax)
// 13 lizenzen III/IV/V
push('13a. Lizenz III', build({ money: 1e13, totalEarned: 1e13, level: 150, parcels: 6, compost: 200, lifetimeEarned: 1e14, licenses: 3 }))
push('13b. Lizenz IV bereit', build({ money: 1e17, totalEarned: 1e17, level: 400, parcels: 12, compost: 1e4, lifetimeEarned: 1e18, licenses: 3 }))
push('13c. Lizenz V bereit', build({ money: 1e20, totalEarned: 1e20, level: 800, parcels: 22, compost: 1e6, lifetimeEarned: 1e20, licenses: 4 }))
// 14 aufträge ignoriert (streak 0, voller Lager)
const ignored = build({ money: 1e9, totalEarned: 1e9, level: 80, parcels: 4, compost: 30, lifetimeEarned: 1e10 })
ignored.questStreak = 0
push('14. Aufträge ignoriert', ignored)
// 15 hanf build
const hemp = build({ money: 5e12, totalEarned: 5e12, level: 140, parcels: 6, compost: 150, lifetimeEarned: 5e13, licenses: 3 })
push('15. Hanf-Build (Lizenz III)', hemp)
// 16 zier build
push('16. Zier-Build', build({ money: 5e15, totalEarned: 5e15, level: 200, parcels: 8, compost: 400, lifetimeEarned: 5e16, plant: 'nachtrose' }))
// 17 magie/gold build (mastery)
const magic = build({ money: 5e14, totalEarned: 5e14, level: 180, parcels: 7, compost: 300, lifetimeEarned: 5e15 })
magic.mastery['leuchtlilie'] = 8000 // partial mastery (≈ Lv 6/10) so the goal is live
for (const c of CATEGORY_SPECS) magic.specializations[c.id] = 8
push('17. Magie-/Gold-Build (Mastery)', magic)
// 18 holz/offline build
push('18. Holz-/Offline-Build', build({ money: 5e13, totalEarned: 5e13, level: 160, parcels: 7, compost: 250, lifetimeEarned: 5e14, plant: 'eiche' }))
// 19 saatlabor teilweise
const lab = build({ money: 5e14, totalEarned: 5e14, level: 180, parcels: 8, compost: 300, lifetimeEarned: 5e15 })
lab.discoveredVariants = VARIANTS.slice(0, 4).map((v) => v.id)
push('19. Saatlabor teilweise (4/' + VARIANTS.length + ')', lab)
// 20 achievements teilweise
const ach = build({ money: 5e14, totalEarned: 5e14, level: 180, parcels: 8, compost: 300, lifetimeEarned: 5e15 })
ach.stats = { ...ach.stats, harvested: 5e6, sold: 5e6, questsDone: 200, scratchesDone: 80, planted: 1e5, crits: 2e4 }
for (const def of ACHIEVEMENTS) ach.achievementTiers[def.id] = 2
push('20. Achievements teilweise', ach)

// ── Gesamtauswertung ───────────────────────────────────────────────────────
console.log('\n════════ ZUSAMMENFASSUNG ════════\n')
const deadCount = {}
let thin = 0
for (const r of results) {
  for (const d of r.dead) deadCount[d] = (deadCount[d] ?? 0) + 1
  if (r.nonReady.length < 3) thin++
}
console.log('Wie oft wirkt ein System „tot" (kein Ziel) über alle 20+ Szenarien:')
for (const [sys, n] of Object.entries(deadCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${sys.padEnd(16)} ${n}×`)
}
console.log(`\nSzenarien mit < 3 offenen Optionen: ${thin}/${results.length}`)
console.log('⇒ Tote Systeme sind oft KONTEXTUELL korrekt (z. B. keine Lizenz im Frühspiel).')
console.log('  Auffällig wird ein System nur, wenn es trotz passendem Kontext kein Ziel liefert.')
console.log('\n════════ ENDE PLAYTEST ════════\n')
