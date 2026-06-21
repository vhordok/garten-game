// Weltensaat loop audit (PHASE 57): plays the REAL core greedily WITH prestige to
// the Weltensaat threshold, sows a world, then measures the re-climb — does the
// higher prestige actually pay off, and is the parcel re-climb feasible (not a
// soft-lock)? Not part of npm test. Run: npx tsx scripts/weltensaat.sim.mjs
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} }

import { PLANTS } from '../src/lib/data/plants.ts'
import { UPGRADES } from '../src/lib/data/upgrades.ts'
import {
  buyPlot,
  buySpecialization,
  buyUpgrade,
  compostGain,
  harvestAllReady,
  leaseParcel,
  leaseRequirement,
  maxPlots,
  nextPlotCost,
  nextUpgradeCost,
  selectPlant,
  sellPlant,
  sowPlot,
  weltensaat,
} from '../src/lib/game/actions.ts'
import { specializationCost, specializationLevel, yieldMultiplier } from '../src/lib/game/modifiers.ts'
import { starseedGain, worldseedYieldFactor } from '../src/lib/game/worldseed.ts'
import { CONFIG } from '../src/lib/data/config.ts'
import { createDefaultState, getState, replaceState } from '../src/lib/game/state.ts'
import { tick } from '../src/lib/game/tick.ts'

const STEP = 30
const fmtT = (s) => (s < 3600 ? `${(s / 60).toFixed(0)}m` : s < 86400 ? `${(s / 3600).toFixed(1)}h` : `${(s / 86400).toFixed(1)}d`)
const fmtN = (v) => {
  if (!Number.isFinite(v)) return '∞'
  if (v >= 1e15) return v.toExponential(2)
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return `${Math.round(v)}`
}

function bestPlant(s) {
  let best = PLANTS[0]
  for (const p of PLANTS) {
    if (p.beautyBonus || p.passiveIncome) continue
    if (p.requiresLicense && s.licenses < p.requiresLicense) continue
    if (s.totalEarned < p.unlockAtTotalEarned) continue
    if (p.seedCost > s.money) continue
    best = p
  }
  return best
}

function activeBeat(s) {
  harvestAllReady()
  for (const p of PLANTS) {
    const have = s.inventory[p.id] ?? 0
    if (have > 0) sellPlant(p.id, have)
  }
  const plant = bestPlant(s)
  if (s.selectedPlantId !== plant.id) selectPlant(plant.id)
  for (let i = 0; i < s.plots.length; i++) if (s.plots[i].plantId === null) sowPlot(i)
  if (s.plots.length < maxPlots(s) && nextPlotCost(s) < s.money * 0.35) buyPlot()
  for (const u of UPGRADES) {
    const cost = nextUpgradeCost(u, s)
    if (cost !== null && cost < s.money * 0.35) buyUpgrade(u.id)
  }
  const sc = specializationCost(specializationLevel(s, plant.category))
  if (sc !== null && sc < s.money * 0.35) buySpecialization(plant.category)
  // greedily climb parcels whenever the next one is affordable
  if (compostGain(s) >= leaseRequirement(s)) leaseParcel()
}

/** Run greedy play until `targetParcels` reached or the time cap; return seconds. */
function climbTo(s, targetParcels, capSeconds) {
  let t = 0
  while (t < capSeconds && s.parcels < targetParcels) {
    tick(s, STEP)
    activeBeat(s)
    t += STEP
  }
  return t
}

replaceState(createDefaultState())
const s = getState()
const MIN = CONFIG.weltensaatMinParcels
const CAP = 60 * 86400 // 60 sim-days safety cap

console.log('\n════════ WELTENSAAT-LOOP AUDIT ════════\n')

// ── 1) first climb to the Weltensaat threshold ──
const t1 = climbTo(s, MIN, CAP)
console.log(`① Erstklettern auf Parzelle ${MIN}: ${fmtT(t1)} (Lvl ${s.level}, ${s.plots.length} Beete)`)
console.log(`   verdient gesamt: ${fmtN(s.lifetimeEarned)} · Ertrags-Mult vorher: ×${fmtN(yieldMultiplier(s))}`)

if (s.parcels < MIN) {
  console.log(`   ⚠ Parzelle ${MIN} in ${fmtT(CAP)} NICHT erreicht — Erstklettern zu langsam.`)
  process.exit(0)
}

// ── 2) sow the first Weltensaat ──
const gain1 = starseedGain(s)
const factorBefore = worldseedYieldFactor(s)
const multBefore = yieldMultiplier(s)
weltensaat()
const g = getState()
console.log(`\n② Erste Weltensaat: +${gain1} Sternensaat → Ertrag-Faktor ×${fmtN(worldseedYieldFactor(g))} (war ×${fmtN(factorBefore)})`)
console.log(`   nach Reset: Parzelle ${g.parcels}, Kompost ${fmtN(g.compost)}, lifetimeEarned ${fmtN(g.lifetimeEarned)} (behalten)`)

// ── 3) re-climb to the threshold (feasible? faster?) ──
const t2 = climbTo(g, MIN, CAP)
const reclimbReached = g.parcels >= MIN
console.log(`\n③ Wiederaufstieg auf Parzelle ${MIN}: ${fmtT(t2)} ${reclimbReached ? '' : '(NICHT erreicht!)'}`)
if (reclimbReached) {
  const speedup = t1 > 0 ? (t1 / Math.max(t2, 1)).toFixed(1) : '∞'
  console.log(`   → Wiederaufstieg ist ${speedup}× ${t2 <= t1 ? 'schneller' : 'LANGSAMER'} als das Erstklettern`)
}

// ── 4) second Weltensaat — does it compound? ──
if (reclimbReached) {
  const gain2 = starseedGain(g)
  weltensaat()
  const g2 = getState()
  console.log(`\n④ Zweite Weltensaat: +${gain2} Sternensaat → Ertrag-Faktor ×${worldseedYieldFactor(g2).toFixed(2)}`)
  console.log(`   (kompoundiert über Welten: Bank ${g2.starseed} Sternensaat)`)
}

// ── 5) what a DEEPER ascent would bank (the optimal play) ──
console.log('\n⑤ Tiefe lohnt sich — Sternensaat & Faktor je Säh-Parzelle:')
for (const p of [MIN, MIN + 10, MIN + 30, MIN + 78]) {
  const gn = p - MIN + 1
  console.log(`   Parzelle ${String(p).padStart(3)} → +${String(gn).padStart(3)} Sternensaat = ×${fmtN(Math.pow(1 + CONFIG.starseedYieldPer, gn))} Ertrag`)
}

// ── verdict ──
console.log('\n──────── BEWERTUNG ────────')
console.log(`  Wiederaufstieg machbar : ${reclimbReached ? `JA (${fmtT(t2)}, ${(t1 / Math.max(t2, 1)).toFixed(1)}× schneller)` : 'NEIN — Soft-Lock!'}`)
console.log(`  Flach säen (Parz. ${MIN})  : nur ×${(1 + CONFIG.starseedYieldPer).toFixed(2)} — Falle, tief säen ist optimal`)
console.log(`  Reset behält Permanentes: Meisterschaft/Spez./Skills/Sammlungen bleiben (per Code)`)
console.log('\n════════ ENDE ════════\n')
