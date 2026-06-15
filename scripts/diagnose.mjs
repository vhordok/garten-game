// Late-game economy diagnosis (PHASE 15). Models the user's reported endgame
// state and prints hard numbers through the REAL core functions, so the fixes
// are driven by measured ratios, not guesses. Run:
//   npx tsx scripts/diagnose.mjs
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }

import { PLANTS, steadyProfitPerSecond } from '../src/lib/data/plants.ts'
import { UPGRADES } from '../src/lib/data/upgrades.ts'
import { LICENSES, licenseQuestBonus } from '../src/lib/data/licenses.ts'
import { COMPOST_UPGRADES, compostUpgradeCost } from '../src/lib/data/compostUpgrades.ts'
import { CATEGORY_SPECS } from '../src/lib/data/specializations.ts'
import { CONFIG } from '../src/lib/data/config.ts'
import {
  growthMultiplier,
  yieldMultiplier,
  sellMultiplier,
  specializationCost,
  specializationCompostCost,
  specializationYieldBonus,
  specYieldSum,
  compostClaimed,
  effectiveCompost,
  gardenBeauty,
} from '../src/lib/game/modifiers.ts'
import { BEAUTY_MILESTONES } from '../src/lib/data/beautyMilestones.ts'
import { VARIANTS } from '../src/lib/data/variants.ts'
import { variantBonus } from '../src/lib/game/seedlab.ts'
import { ACHIEVEMENTS, TIER_NAMES } from '../src/lib/data/achievements.ts'
import { achievementBonus, initAchievementTiers, reachedTier, totalClaimedTiers } from '../src/lib/game/achievements.ts'
import { SCRATCH_PRIZES, effectiveHarvestValue, scratchPrizeAmount } from '../src/lib/data/scratch.ts'
import { CONFIG as CFG } from '../src/lib/data/config.ts'
import { compostGain, isPlantUnlocked } from '../src/lib/game/actions.ts'
import { activeGoals } from '../src/lib/game/goals.ts'
import { generateQuest } from '../src/lib/game/quests.ts'
import { xpToNext } from '../src/lib/data/progression.ts'
import { createDefaultState, getState, replaceState } from '../src/lib/game/state.ts'

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
  if (s < 60) return `${s.toFixed(0)}s`
  if (s < 3600) return `${(s / 60).toFixed(1)}m`
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`
  return `${(s / 86400).toFixed(1)}d`
}

// ── reconstruct the reported late-game state ───────────────────────────────
// compost flat bonus = compostYieldPerPoint × sqrt(claimed). User reports
// +14664 % yield ⇒ claimed ≈ (146.64 / 0.25)^2 ≈ 344k. parcels 12, level 886.
replaceState(createDefaultState())
const s = getState()
s.level = 886
s.parcels = 12
s.compost = 326_000
s.compostSpent = 18_000 // ⇒ claimed ≈ 344k ⇒ matches reported multipliers
s.achievements = []
// 56 plots
s.plots = Array.from({ length: 56 }, () => ({ plantId: null, progress: 0, waterLeft: 0, regrowing: false }))
// max the compost garden (user says it is) + specialisations at 18
for (const u of COMPOST_UPGRADES) s.compostUpgrades[u.id] = u.maxLevel
for (const c of CATEGORY_SPECS) s.specializations[c.id] = 18
// lifetime that yields the reported next gain (~935k): gain = sqrt(life/1e6) − claimed
// 935k + 344k = sqrt(life/1e6) ⇒ life ≈ (1.279e6)^2 × 1e6 ≈ 1.636e18
s.lifetimeEarned = 1.636e18
s.totalEarned = 2.88e17 // gemeldetes Rundengold ~288 Qa → alle Sorten freigeschaltet

const yM = yieldMultiplier(s)
const gM = growthMultiplier(s)
const sM = sellMultiplier(s) // includes market wave (neutral at t=0) + beauty(=1 here)

console.log('\n════════ A. HARTE ECONOMY-DIAGNOSE (gemeldeter Spielstand) ════════\n')
console.log(`claimed Kompost      : ${fmtN(compostClaimed(s))} (frei ${fmtN(s.compost)} + spent ${fmtN(s.compostSpent)})`)
console.log(`effektiv (^${CONFIG.compostSoftcapExp}) : ${fmtN(effectiveCompost(s))}`)
console.log(`Ertrags-Multiplikator: ×${yM.toFixed(0)}  (+${((yM - 1) * 100).toFixed(0)} %)`)
console.log(`Tempo-Multiplikator  : ×${gM.toFixed(0)}  (+${((gM - 1) * 100).toFixed(0)} %)`)
console.log(`Verkaufs-Multiplikat.: ×${sM.toFixed(2)} (Markt neutral @ t0, Beauty=1)`)

// best harvest plant: gold/s on all 56 plots, using real multipliers
function plantGoldPerSec(p) {
  // effective cycle time with growth multiplier
  const cycle = (p.regrowTime ?? p.growTime) / gM
  const grossPerHarvest = p.yield * yM * p.sellValue * sM
  return grossPerHarvest / cycle
}
const harvestPlants = PLANTS.filter((p) => p.yield > 0 && !p.requiresLicense)
let best = harvestPlants[0]
for (const p of harvestPlants) if (plantGoldPerSec(p) > plantGoldPerSec(best)) best = p
const gps = plantGoldPerSec(best) * s.plots.length
console.log(`\nBeste Sorte (alle ${s.plots.length} Beete): ${best.name}`)
console.log(`  Gold/s ${fmtN(gps)} · Gold/min ${fmtN(gps * 60)} · Gold/h ${fmtN(gps * 3600)}`)
const goldPerHour = gps * 3600

console.log('\n── Letzte 10 Pflanzen: Kosten / Ertrag-pro-Ernte / ROI (Ernten bis Saat raus) ──')
const last10 = PLANTS.slice(-10)
for (const p of last10) {
  const perHarvest = p.yield * p.sellValue // raw, no multipliers (ROI is multiplier-invariant)
  const roi = p.yield > 0 ? p.seedCost / perHarvest : Infinity
  console.log(
    `  ${p.name.padEnd(16)} Saat ${fmtN(p.seedCost).padStart(7)} · ` +
      `Ernte ${fmtN(perHarvest).padStart(8)} · ROI ${roi === Infinity ? 'passiv/zier' : roi.toFixed(2) + ' Ernten'} · ` +
      `unlock ${fmtN(p.unlockAtTotalEarned)}`
  )
}

console.log('\n── Spezialisierung: Kosten vs. Nutzen (PHASE 15: eskalierend + Meilensteine) ──')
console.log('  Stufe |   Gold-Kosten | Kompost | ΔErtrag(Stufe) | Σ Ertrag(Kat) | Amortisation')
for (const lvl of [10, 15, 18, 20, 24]) {
  const gold = specializationCost(lvl)
  if (gold === null) { console.log(`  ${String(lvl).padStart(5)} | MAX`); continue }
  const compost = specializationCompostCost(lvl)
  // TRUE marginal category yield from buying lvl→lvl+1 (escalating curve)
  const dCatYield = specYieldSum(lvl + 1) - specYieldSum(lvl)
  const sumCatYield = specYieldSum(lvl + 1)
  const catShareOfGoldPerHour = goldPerHour / 8 // rough: 8 categories
  const extraGoldPerHour = catShareOfGoldPerHour * dCatYield
  const payback = gold / extraGoldPerHour
  console.log(
    `  ${String(lvl).padStart(5)} | ${fmtN(gold).padStart(13)} | ${String(compost).padStart(7)} | ` +
      `+${(dCatYield * 100).toFixed(1)} %         | +${(sumCatYield * 100).toFixed(0)} %        | ${fmtT(payback)}`
  )
}

console.log('\n── Kompost-Garten: gedeckelte Upgrades vs. endlose PHASE-15-Sinks ──')
let totalCappedToMax = 0
for (const u of COMPOST_UPGRADES) {
  if (u.repeatable) {
    // how many levels does the reported 326k free compost buy into this sink?
    let lvl = 0
    let spent = 0
    while (spent + compostUpgradeCost(u, lvl) <= s.compost) { spent += compostUpgradeCost(u, lvl); lvl++ }
    console.log(`  ${u.name.padEnd(18)} ENDLOS · 326K Kompost kauft ~Stufe ${lvl} (≈ +${(u.perLevel * lvl * 100).toFixed(0)} %), nächste Stufe ${fmtN(compostUpgradeCost(u, lvl))}`)
  } else {
    let sum = 0
    for (let l = 0; l < u.maxLevel; l++) sum += compostUpgradeCost(u, l)
    totalCappedToMax += sum
    console.log(`  ${u.name.padEnd(18)} max ${u.maxLevel} · Gesamtkosten ${fmtN(sum)} Kompost`)
  }
}
console.log(`  ─────`)
console.log(`  Gedeckelte Upgrades bis MAX : ${fmtN(totalCappedToMax)} Kompost (Frühphasen-Sink)`)
console.log(`  Verfügbar JETZT             : ${fmtN(s.compost)} Kompost (frei)`)
console.log(`  ⇒ endlose Sinks (Urhumus/Tiefenkultur/Mykorrhiza) absorbieren den Rest dauerhaft`)

console.log('\n── Kompost-Gewinn pro Prestige bei Parzelle 5/10/12/15/20 ──')
console.log('  (gain = floor(sqrt(lifetime/1e6)) − claimed; lifetime hier fix)')
for (const pc of [5, 10, 12, 15, 20]) {
  const probe = { ...s, parcels: pc }
  const gain = compostGain(probe)
  console.log(`  Parzelle ${String(pc).padStart(2)} : +${fmtN(gain)} Kompost  (Lease-Kosten: ${pc} Kompost)`)
}

console.log('\n── Post-Prestige: wie viele Pflanzen sind „sofort" wieder erreichbar? ──')
// After prestige the yield multiplier persists. Estimate totalEarned reachable
// in T minutes from basil upward and count how many unlocks that clears.
const persistMult = yM * sM
function reachableUnlocksIn(seconds) {
  // crude: assume the player keeps planting the best AFFORDABLE-unlocked plant;
  // model cumulative earned as best steady gold/s of the highest unlocked plant.
  let earned = 0
  let t = 0
  const dt = 30
  while (t < seconds) {
    let cur = harvestPlants[0]
    for (const p of harvestPlants) if (earned >= p.unlockAtTotalEarned && p.unlockAtTotalEarned >= cur.unlockAtTotalEarned) cur = p
    const cycle = (cur.regrowTime ?? cur.growTime) / gM
    const perPlot = (cur.yield * yM * cur.sellValue * sM) / cycle
    earned += perPlot * s.plots.length * dt
    t += dt
  }
  return PLANTS.filter((p) => earned >= p.unlockAtTotalEarned).length
}
for (const mins of [5, 15, 30, 60]) {
  console.log(`  nach ${String(mins).padStart(3)} min: ${reachableUnlocksIn(mins * 60)}/${PLANTS.length} Sorten freigeschaltet`)
}
console.log(`  (persistenter Multiplikator nach Reset: ×${persistMult.toFixed(0)} Ertrag×Verkauf)`)

// ── PHASE 17: Kategorie-Rollen & Zier-Build-Vergleich ──────────────────────
console.log('\n════════ PHASE 17: KATEGORIE-DIAGNOSE ════════\n')
const roleOf = (cat) => {
  const ps = PLANTS.filter((p) => p.category === cat)
  const harvest = ps.some((p) => p.yield > 0)
  const passive = ps.some((p) => p.passiveIncome)
  const aura = ps.some((p) => p.beautyBonus)
  if (aura) return 'Aura/Schönheit — globale Boni, kein Direktertrag (Build)'
  if (passive) return 'Passiv/Offline — Holz tröpfelt ohne Klicks'
  if (harvest) return 'Direktertrag — aktiv ernten & verkaufen'
  return '—'
}
const cats = [...new Set(PLANTS.map((p) => p.category))]
for (const c of cats) {
  console.log(`  ${c.padEnd(10)} → ${roleOf(c)}`)
}

console.log('\n── Zier-Build: lohnt es, Beete für Schönheit zu opfern? ──')
function gardenGoldPerHour(state) {
  let gps = 0
  const ym = yieldMultiplier(state)
  const sm = sellMultiplier(state)
  const gm = growthMultiplier(state)
  for (const plot of state.plots) {
    if (!plot.plantId) continue
    const def = PLANTS.find((p) => p.id === plot.plantId)
    if (!def || def.yield <= 0) continue // ornamentals/passive add 0 direct
    const cycle = (def.regrowTime ?? def.growTime) / gm
    gps += (def.yield * ym * def.sellValue * sm) / cycle
  }
  return gps * 3600
}
const bestGold = PLANTS.filter((p) => p.yield > 0 && !p.requiresLicense).sort(
  (a, b) => plantGoldPerSec(b) - plantGoldPerSec(a)
)[0]
const orn = PLANTS.filter((p) => p.beautyBonus).sort((a, b) => b.beautyBonus - a.beautyBonus)[0]
const N = s.plots.length
for (const z of [0, 6, 12, 20]) {
  const g = { ...s, plots: [] }
  g.plots = Array.from({ length: N }, (_, i) =>
    i < z
      ? { plantId: orn.id, progress: orn.growTime, waterLeft: 0, regrowing: false }
      : { plantId: bestGold.id, progress: 0, waterLeft: 0, regrowing: false }
  )
  const beauty = gardenBeauty(g)
  const activeMs = BEAUTY_MILESTONES.filter((m) => beauty >= m.beauty).length
  const goldH = gardenGoldPerHour(g)
  console.log(
    `  ${String(z).padStart(2)} Zier + ${String(N - z).padStart(2)} Gold : Schönheit ${(beauty * 100).toFixed(0).padStart(4)} % · ` +
      `${activeMs} Aura-Boni aktiv · Gold/h ${fmtN(goldH).padStart(8)}`
  )
}
console.log('  ⇒ Zier ist sinnvoll, wenn die Aura (Sell-% + Meilenstein-Boni) den Verlust der Gold-Beete schlägt.')

console.log('\n── PHASE 18: Rubbellos-Gewinne skalieren mit Einkommen (Voll-Treffer) ──')
const eff = effectiveHarvestValue(s)
console.log(`  effektiver Ernte-Wert (mit Multis): ${fmtN(eff)} Gold (roh ×${fmtN(yieldMultiplier(s) * sellMultiplier(s))})`)
for (const id of ['money-large', 'jackpot']) {
  const def = SCRATCH_PRIZES.find((p) => p.type === id)
  const full = scratchPrizeAmount(def, s) * CFG.scratchFullMult
  console.log(`  ${id.padEnd(12)} Voll-Treffer ≈ ${fmtN(full).padStart(8)} Gold = ${(full / goldPerHour * 60).toFixed(1)} min Einkommen`)
}
console.log('  ⇒ Lose bleiben im Qi-Endgame relevant (skalieren mit Ertrag×Verkauf), kein fixer Kleinkram mehr.')

console.log('\n── PHASE 19: Erfolg-Tiers im gemeldeten Endgame ──')
s.stats = { ...s.stats, harvested: 5e9, questsDone: 1200, scratchesDone: 600 }
s.records = { ...s.records, bestBeauty: 2.5 }
initAchievementTiers(s)
const totalTiers = ACHIEVEMENTS.length * TIER_NAMES.length
console.log(`  erreichte Stufen: ${totalClaimedTiers(s)}/${totalTiers}`)
let open = 0
for (const def of ACHIEVEMENTS) {
  const r = reachedTier(s, def)
  if (r < def.tiers.length) open++
  console.log(`  ${def.name.padEnd(18)} ${(r > 0 ? TIER_NAMES[r - 1] : '—').padEnd(9)} (${r}/${def.tiers.length})`)
}
console.log(`  noch offen: ${open} Tracks · Erfolg-Ertragsbonus: +${(achievementBonus(s, 'yield') * 100).toFixed(0)} %`)
console.log('  ⇒ auch im Endgame bleiben Legendär-Stufen als Langzeitziele offen.')

console.log('\n── PHASE 20: Saatlabor — Varianten-Gesamtbonus (alle entdeckt) ──')
const allVar = { ...createDefaultState(), discoveredVariants: VARIANTS.map((v) => v.id) }
const byEffect = {}
for (const v of VARIANTS) byEffect[v.effect] = (byEffect[v.effect] ?? 0) + v.value
console.log(`  ${VARIANTS.length} Varianten · Effekte: ${Object.entries(byEffect).map(([e, val]) => `${e} +${(val * 100).toFixed(0)}%`).join(' · ')}`)
console.log(`  Ertrags-Gesamtbonus aller Varianten: +${(variantBonus(allVar, 'yield') * 100).toFixed(0)} % (klein & gedeckelt, keine Explosion)`)
console.log('  ⇒ Varianten sind Sammelziele mit kleinen Boni, nicht Ersatz für die Pflanzenleiter.')

// ── PHASE 24: Very-Late-Game-Progression gegen echte Extrem-Stände ──────────
console.log('\n── PHASE 24: Pflanzenziele bei sehr hohem totalEarned (Very Late Game) ──')
const harvestable = PLANTS.filter((p) => !p.requiresLicense || true)
function plantsAtEarned(earned) {
  const unlocked = PLANTS.filter((p) => earned >= p.unlockAtTotalEarned)
  const ahead = PLANTS.filter((p) => earned < p.unlockAtTotalEarned).sort(
    (a, b) => a.unlockAtTotalEarned - b.unlockAtTotalEarned
  )
  return { unlocked: unlocked.length, ahead }
}
const scenarios = [
  ['nach Weltenrose', 8e15],
  ['10 Qi', 1e19],
  ['100 Qi', 1e20],
  ['570 Qi (gemeldet)', 5.7e20],
  ['1 Sx', 1e21],
]
for (const [label, earned] of scenarios) {
  const { unlocked, ahead } = plantsAtEarned(earned)
  const next = ahead.slice(0, 4).map((p) => `${p.name} (${fmtN(p.unlockAtTotalEarned)})`).join(', ')
  console.log(`  ${label.padEnd(18)}: ${unlocked}/${PLANTS.length} frei · noch offen: ${ahead.length}${ahead.length ? ` → ${next}` : ' (alle frei)'}`)
}
console.log('  ⇒ Bei 570 Qi bleiben echte Pflanzenziele offen (Galaxieorchidee/Schöpfungsrose), statt sofort leer.')

// ── PHASE 25: Quest-Skalierung, Level-Kurve, Prestige-Skip ──────────────────
console.log('\n── PHASE 25: Quest-Größe nach Fortschritt (Basilikum, Beispiel) ──')
function sampleQuestAmount(level, parcels) {
  replaceState(createDefaultState())
  const st = getState()
  st.level = level
  st.parcels = parcels
  let min = Infinity, max = 0
  for (let i = 0; i < 40; i++) {
    const q = generateQuest(st)
    const it = q.items.find((x) => x.plantId === 'basilikum')
    if (it) { min = Math.min(min, it.amount); max = Math.max(max, it.amount) }
  }
  return min === Infinity ? '—' : `${min}–${max}`
}
console.log(`  frisch (Lvl 1, 1 Parzelle) : Basilikum-Auftrag ~ ${sampleQuestAmount(1, 1)} Stück (klein → kein Reservierungs-Softlock)`)
console.log(`  Lvl 10                     : ~ ${sampleQuestAmount(10, 1)} Stück`)
console.log(`  Lvl 30+ / Parzellen        : ~ ${sampleQuestAmount(40, 4)} Stück (volle Skala)`)

console.log('\n── PHASE 25: Level-Kurve (XP bis nächstes Level) ──')
for (const lv of [1, 10, 100, 1000, 5000, 11300]) {
  console.log(`  Lvl ${String(lv).padStart(5)} : ${fmtN(xpToNext(lv))} XP  (Level-Ertragsbonus bis +${(CFG.levelYieldMaxBonus * 100).toFixed(0)} %)`)
}
console.log('  ⇒ Späte Level kosten massiv mehr XP → kein 5–10 Level/Sekunde mehr, jedes Level zählt.')

console.log('\n── PHASE 26: Prestige-Soft-Gate — Parzellen pacen die Spitze ──')
const gated = PLANTS.filter((p) => p.unlockParcel)
console.log(`  ${gated.length} sehr späte Pflanzen sind zusätzlich an Parzellen gebunden:`)
console.log(`    ${gated.map((p) => `${p.name}→P${p.unlockParcel}`).join(', ')}`)
console.log('  Bei totalEarned = 1 Sx (Multiplikator rast), aber unterschiedlichen Parzellen:')
for (const parc of [12, 16, 22, 30, 40]) {
  const st = { ...createDefaultState(), totalEarned: 1e21, lifetimeEarned: 1e21, licenses: 3, parcels: parc }
  const sowable = PLANTS.filter((p) => isPlantUnlocked(p, st)).length
  const gatedOpen = gated.filter((p) => st.parcels < p.unlockParcel).length
  console.log(`    Parzelle ${String(parc).padStart(2)}: ${sowable}/${PLANTS.length} pflanzbar · ${gatedOpen} Spitzen-Pflanzen noch durch Parzellen gesperrt`)
}
console.log('  ⇒ Der persistente Multiplikator beschleunigt weiter, aber die Spitze wird durch Parzellen (≈1/Prestige) gepact — kein Sofort-Skip.')

// ── PHASE 27: Late-Game-Sinks, Lizenz-Wirtschaft & Ziel-Panel ───────────────
console.log('\n════════ PHASE 27: LATE-GAME-SINKS & AUFTRAGS-WIRTSCHAFT ════════\n')

console.log('── B. Shop: parzellen-gegatete Spät-Stufen (pacen via Prestige) ──')
const gatedUpgrades = UPGRADES.filter((u) => u.unlockParcel)
for (const u of gatedUpgrades) {
  const repeat = u.repeatable ? ' · ENDLOS' : ` · max ${u.maxLevel}`
  console.log(`  ${u.name.padEnd(16)} ab Parzelle ${String(u.unlockParcel).padStart(2)} · ${u.effect}${repeat} · Start-Kosten ${fmtN(u.baseCost)}`)
}
// Edelkompost als endloser Gold-Sink: wie tief frisst das gemeldete Gold (570 Qi)?
const edel = UPGRADES.find((u) => u.id === 'edelkompost')
if (edel) {
  let lvl = 0, spent = 0, gold = 5.7e20
  while (spent + Math.floor(edel.baseCost * edel.costFactor ** lvl) <= gold && lvl < edel.maxLevel) {
    spent += Math.floor(edel.baseCost * edel.costFactor ** lvl); lvl++
  }
  console.log(`  ⇒ Edelkompost: 570 Qi Gold kauft ~Stufe ${lvl} (+${(edel.perLevel * lvl * 100).toFixed(0)} % Ertrag), nächste Stufe ${fmtN(Math.floor(edel.baseCost * edel.costFactor ** lvl))} Gold`)
}

console.log('\n── D/E. Lizenz-Wirtschaft: machen Aufträge wieder lohnend? ──')
for (const l of LICENSES) {
  const bonus = licenseQuestBonus(l.level)
  console.log(`  ${l.name.padEnd(24)} Kosten ${fmtN(l.cost).padStart(8)} Gold · Auftrags-Bonus +${(bonus * 100).toFixed(0)} %`)
}
// quest reward vs. farming: a representative big order at the reported tier
const baseQuestBonus = 1 + variantBonus(s, 'questReward') // ohne Lizenz (Diag-Stand hat keine Spät-Lizenz)
const withLicenses = baseQuestBonus + licenseQuestBonus(5)
console.log(`  Auftragsbelohnung ohne Spät-Lizenz: ×${baseQuestBonus.toFixed(2)} · mit Lizenz IV+V: ×${withLicenses.toFixed(2)} (+${((withLicenses / baseQuestBonus - 1) * 100).toFixed(0)} %)`)
console.log('  ⇒ Lizenz IV/V heben die Auftragsbelohnung dauerhaft → Liefern bleibt neben dem Farmen konkurrenzfähig.')

console.log('\n── C. Kompost: jeder Effekt hat jetzt einen endlosen Spät-Sink ──')
const repeatSinks = COMPOST_UPGRADES.filter((u) => u.repeatable)
for (const u of repeatSinks) {
  const per = u.effect === 'offline' ? `+${u.perLevel} h/Stufe` : `+${(u.perLevel * 100).toFixed(1)} %/Stufe`
  console.log(`  ${u.name.padEnd(18)} ab Parzelle ${String(u.unlockParcel).padStart(2)} · Effekt ${u.effect} · ${per}`)
}
const covered = new Set(repeatSinks.map((u) => u.effect))
console.log(`  abgedeckte Effekte: ${[...covered].join(', ')} (vorher fehlten passive & offline)`)

console.log('\n── F. Ziel-Panel: Zusammensetzung im Spät-Game ──')
{
  const probe = { ...createDefaultState(), parcels: 6, totalEarned: 1e16, lifetimeEarned: 1e16, money: 1e15, scratchTickets: 3, licenses: 3 }
  for (const c of CATEGORY_SPECS) probe.specializations[c.id] = 10
  const goals = activeGoals(probe)
  const byTier = {}
  for (const g of goals) (byTier[g.tier] ??= []).push(g.id)
  for (const [t, ids] of Object.entries(byTier)) console.log(`  ${t.padEnd(8)}: ${ids.join(', ')}`)
  console.log(`  shop-Ziel vorhanden: ${goals.some((g) => g.id === 'shop')} · license-Ziel: ${goals.some((g) => g.id === 'license')}`)
  console.log('  ⇒ Shop-/Lizenz-/Kompost-Ziele sind sichtbar; triviale Dauer-„ready"-Ziele (Lose/Skill) stehen hinten.')
}

console.log('\n════════ ENDE DIAGNOSE ════════\n')
