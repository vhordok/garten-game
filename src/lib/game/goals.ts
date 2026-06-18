// Goal engine (PHASE 16): derives a handful of always-visible "next targets"
// from the live state — short / mid / long / endgame — so the player always has
// several meaningful things to work toward ("nur noch dieses Ziel"). Pure TS, no
// Svelte: a read-only projection of state, so it is unit-testable and the UI just
// renders it. Adds no new persisted data.

import { CONFIG } from '../data/config'
import { ACHIEVEMENTS, TIER_NAMES } from '../data/achievements'
import { claimedTier } from './achievements'
import { nextBeautyMilestone } from '../data/beautyMilestones'
import { COMPOST_UPGRADES, compostUpgradeCost } from '../data/compostUpgrades'
import { nextMilestone } from '../data/milestones'
import { PLANTS, SPECIAL_PLANTS, plantById, produceName } from '../data/plants'
import { CATEGORY_SPECS } from '../data/specializations'
import { UPGRADES } from '../data/upgrades'
import { LICENSES } from '../data/licenses'
import { compostGain, expectedQuestPayout, isPlantUnlocked, leaseRequirement, nextUpgradeCost, plotsWithPlant, upgradeLevel } from './actions'
import { gardenBeauty, masteryLevel, masteryThreshold, nextSpecMilestone, sellMultiplier, specializationLevel } from './modifiers'
import { availableSkillPoints } from './skills'
import { crossEligibility, discoverableVariants, produceStatus } from './seedlab'
import { VARIANTS } from '../data/variants'
import type { GameState } from './types'

export type GoalTier = 'kurz' | 'mittel' | 'lang' | 'endgame'

export interface Goal {
  id: string
  tier: GoalTier
  icon: string
  /** short German headline, e.g. "Nächste Sorte: Tomate" */
  label: string
  /** what completing it gives, e.g. "schaltet Tomaten frei" */
  reward: string
  current: number
  target: number
  /** 0..1 progress for the bar */
  fraction: number
  /** true once the goal is reachable/affordable right now */
  ready: boolean
  /** PHASE 28: a trivial "you can do this anytime" nudge (buy a cheap upgrade,
   * cash a ticket). Useful, but it must never dominate the board or inflate the
   * HUD ready-badge — sorts below substantive goals within its horizon. */
  chore?: boolean
  /** PHASE 29: one short clause explaining WHY this is worth doing right now
   * (economic/strategic). Kept terse — no formulas, mobile-friendly. */
  why?: string
  /** PHASE 29: a soft suggestion to explore a play-style, not a hard target.
   * Rendered without a strong progress bar and never displaces real progression. */
  discovery?: boolean
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0)

/** Held units that count toward a quest line (a plant, or a whole category). */
function heldFor(state: GameState, item: { plantId?: string; category?: string }): number {
  if (item.plantId) return state.inventory[item.plantId] ?? 0
  let sum = 0
  for (const [id, n] of Object.entries(state.inventory)) {
    if (plantById(id)?.category === item.category) sum += n
  }
  return sum
}

/** Next plant to unlock — the clearest short-term carrot. */
function plantGoal(state: GameState): Goal | null {
  for (const p of PLANTS) {
    if (isPlantUnlocked(p, state)) continue
    // only surface plants gated purely by earnings (license gates are their own UI)
    if (p.requiresLicense && state.licenses < p.requiresLicense) continue
    const earnedMet = state.totalEarned >= p.unlockAtTotalEarned
    // PHASE 26: earnings met but parcel-gated → guide toward leasing parcels
    if (earnedMet && p.unlockParcel && state.parcels < p.unlockParcel) {
      return {
        id: 'plant',
        tier: 'lang',
        icon: p.emoji,
        label: `Parzelle ${p.unlockParcel} für ${p.name}`,
        reward: `schaltet ${produceName(p)} frei (Prestige/Parzelle)`,
        current: state.parcels,
        target: p.unlockParcel,
        fraction: clamp01(state.parcels / p.unlockParcel),
        ready: false,
      }
    }
    return {
      id: 'plant',
      tier: 'kurz',
      icon: p.emoji,
      label: `Nächste Sorte: ${p.name}`,
      reward: `schaltet ${produceName(p)} frei`,
      current: state.totalEarned,
      target: p.unlockAtTotalEarned,
      fraction: clamp01(state.totalEarned / p.unlockAtTotalEarned),
      ready: false,
    }
  }
  return null
}

/**
 * Next upgrade worth saving for (PHASE 28 rework). The old version always pointed
 * at the CHEAPEST upgrade, so a rich player saw the same trivial "Gießkanne,
 * bereit" headline at every stage. Instead: target the cheapest upgrade you can't
 * yet afford (a real progress bar). Only when literally everything unlocked is
 * already affordable does it become a low-priority "spend surplus" chore — and
 * then it prefers the endless repeatable sink (the real late-game gold home).
 */
function upgradeGoal(state: GameState): Goal | null {
  const open: { def: (typeof UPGRADES)[number]; cost: number }[] = []
  for (const def of UPGRADES) {
    // PHASE 27: skip parcel-gated late tiers — they get their own shopGoal
    if (def.unlockParcel && state.parcels < def.unlockParcel) continue
    const cost = nextUpgradeCost(def, state)
    if (cost === null) continue
    open.push({ def, cost })
  }
  if (open.length === 0) return null
  // a genuine savings target: the cheapest one still out of reach
  const target = open.filter((o) => state.money < o.cost).sort((a, b) => a.cost - b.cost)[0]
  if (target) {
    return {
      id: 'upgrade',
      tier: 'kurz',
      icon: '🛠️',
      label: `Nächstes Upgrade: ${target.def.name}`,
      reward: `Stufe ${upgradeLevel(state, target.def.id) + 1}`,
      current: state.money,
      target: target.cost,
      fraction: clamp01(state.money / target.cost),
      ready: false,
    }
  }
  // everything affordable → a spend nudge (prefer the endless sink), never dominant
  const spend = open.find((o) => o.def.repeatable) ?? open.sort((a, b) => b.cost - a.cost)[0]
  return {
    id: 'upgrade',
    tier: 'kurz',
    icon: '🛠️',
    label: `Upgrade kaufen: ${spend.def.name}`,
    reward: `Stufe ${upgradeLevel(state, spend.def.id) + 1}`,
    current: spend.cost,
    target: spend.cost,
    fraction: 1,
    ready: true,
    chore: true,
  }
}

/** Gold selling a quest's required produce raw would fetch (the farming baseline). */
function questSellGold(state: GameState, q: GameState['quests'][number]): number {
  const sm = sellMultiplier(state)
  let gold = 0
  for (const it of q.items) {
    let rep = 0
    if (it.plantId) rep = plantById(it.plantId)?.sellValue ?? 0
    else {
      const inCat = PLANTS.filter((p) => p.category === it.category)
      rep = inCat.length ? Math.min(...inCat.map((p) => p.sellValue)) : 0
    }
    gold += it.amount * rep * sm
  }
  return gold
}

/** Can the player realistically grow everything this order asks for? */
function questFeasible(state: GameState, q: GameState['quests'][number]): boolean {
  return q.items.every((it) => {
    if (it.plantId) {
      const d = plantById(it.plantId)
      return !!d && isPlantUnlocked(d, state)
    }
    return PLANTS.some((p) => p.category === it.category && isPlantUnlocked(p, state))
  })
}

/**
 * The single best delivery order to recommend (PHASE 29 economic weighting).
 * A quest is only headlined when it actually pays off:
 *  • almost done (you already hold most of it → just deliver), or
 *  • economically competitive — pays a real premium over simply SELLING the same
 *    produce. That premium folds in every relevant bonus automatically: licenses
 *    IV/V, Mykorrhiza/Auftragshumus, variants and the streak raise the payout,
 *    while Marktstand/Markt-Welle raise the sell baseline.
 * Orders clearly worse than farming (and barely started) are dropped, infeasible
 * ones (parcel-gated produce) never headline.
 */
function questGoal(state: GameState): Goal | null {
  let best: { q: GameState['quests'][number]; frac: number; have: number; need: number; premium: number } | null = null
  for (const q of state.quests) {
    let have = 0
    let need = 0
    for (const it of q.items) {
      have += Math.min(heldFor(state, it), it.amount)
      need += it.amount
    }
    if (need <= 0 || !questFeasible(state, q)) continue
    const frac = have / need
    const premium = expectedQuestPayout(state, q) / Math.max(questSellGold(state, q), 1)
    // rank: prefer near-complete, then the most economically attractive
    const score = (frac >= 0.8 ? 1000 : 0) + premium + frac
    if (!best || score > (best.frac >= 0.8 ? 1000 : 0) + best.premium + best.frac) {
      best = { q, frac, have, need, premium }
    }
  }
  if (!best) return null

  const almostDone = best.frac >= 0.8
  const worthwhile = best.premium >= 1.3
  // not nearly done AND clearly worse than just selling → don't clutter the board
  if (!almostDone && best.premium < 0.95 && best.frac < 0.4) return null

  const synergy =
    state.licenses >= 4 ? ' · Lizenz-Bonus' : state.weather.id ? ' · Event aktiv' : ''
  const why = almostDone
    ? 'Fast fertig — nur noch liefern'
    : worthwhile
      ? `Zahlt ~${best.premium.toFixed(1)}× über Direktverkauf${synergy}`
      : 'Knapp lohnend — Lager nicht blockieren'

  return {
    id: 'quest',
    tier: almostDone ? 'kurz' : 'mittel',
    icon: '📜',
    label: 'Auftrag erfüllen',
    reward: 'Gold, XP & Lose',
    current: best.have,
    target: best.need,
    fraction: clamp01(best.frac),
    ready: best.frac >= 1,
    // marginal orders show, but quietly (chore) so they never displace real goals
    chore: !almostDone && !worthwhile,
    why,
  }
}

/** Push the most-invested category to its next specialisation milestone. */
function specGoal(state: GameState): Goal | null {
  let best: { cat: (typeof CATEGORY_SPECS)[number]; level: number } | null = null
  for (const c of CATEGORY_SPECS) {
    const level = specializationLevel(state, c.id)
    if (level <= 0 || level >= CONFIG.specMaxLevel) continue
    if (!best || level > best.level) best = { cat: c, level }
  }
  if (!best) return null
  const ms = nextSpecMilestone(best.level)
  if (ms === null) return null
  const prev = ms - CONFIG.specMilestoneEvery
  return {
    id: 'spec',
    tier: 'mittel',
    icon: '⭐',
    label: `${best.cat.label}-Meilenstein: Stufe ${ms}`,
    reward: best.cat.milestoneDesc,
    current: best.level - prev,
    target: ms - prev,
    fraction: clamp01((best.level - prev) / (ms - prev)),
    ready: false,
  }
}

/** Next leasable parcel (prestige) — mid/long bridge. */
function parcelGoal(state: GameState): Goal | null {
  const need = leaseRequirement(state)
  const gain = compostGain(state)
  return {
    id: 'parcel',
    tier: 'lang',
    icon: '🌱',
    label: `Parzelle ${state.parcels + 1} pachten`,
    reward: `+${gain > 0 ? gain : '?'} Kompost · +${CONFIG.parcelExtraPlots} Beete`,
    current: Math.min(gain, need),
    target: need,
    fraction: clamp01(gain / Math.max(need, 1)),
    ready: gain >= need,
    why: 'Dauerhafte Boni + näher an Endgame-Pflanzen',
  }
}

/** Next parcel milestone (permanent perk). */
function parcelMilestoneGoal(state: GameState): Goal | null {
  const m = nextMilestone(state.parcels)
  if (!m) return null
  return {
    id: 'parcelMilestone',
    tier: 'lang',
    icon: '🏞️',
    label: `Parzellen-Meilenstein: ${m.label}`,
    reward: m.desc,
    current: state.parcels,
    target: m.parcel,
    fraction: clamp01(state.parcels / m.parcel),
    ready: false,
  }
}

/** A repeatable compost sink the player can already start (endgame goal). */
function compostGoal(state: GameState): Goal | null {
  const repeatable = COMPOST_UPGRADES.filter((u) => u.repeatable && state.parcels >= u.unlockParcel)
  if (repeatable.length === 0) return null
  // the one with the cheapest next level → the immediate compost target
  let best: { def: (typeof COMPOST_UPGRADES)[number]; cost: number } | null = null
  for (const u of repeatable) {
    const cost = compostUpgradeCost(u, state.compostUpgrades[u.id] ?? 0)
    if (cost === null) continue
    if (!best || cost < best.cost) best = { def: u, cost }
  }
  if (!best) return null
  return {
    id: 'compost',
    tier: 'endgame',
    icon: '♻️',
    label: `Kompost-Sink: ${best.def.name}`,
    reward: best.def.desc,
    current: Math.min(state.compost, best.cost),
    target: best.cost,
    fraction: clamp01(state.compost / best.cost),
    ready: state.compost >= best.cost,
    why: 'Bester Langzeit-Sink für gestauten Kompost',
  }
}

/** Next parcel-gated late-tier shop upgrade — guides toward prestige (PHASE 27). */
function shopGoal(state: GameState): Goal | null {
  let best: { def: (typeof UPGRADES)[number]; parcel: number } | null = null
  for (const def of UPGRADES) {
    const gate = def.unlockParcel ?? 0
    if (gate <= 0 || state.parcels >= gate) continue
    if (!best || gate < best.parcel) best = { def, parcel: gate }
  }
  if (!best) return null
  return {
    id: 'shop',
    tier: 'lang',
    icon: '🛒',
    label: `Werkstatt-Ausbau: ${best.def.name}`,
    reward: `ab Parzelle ${best.parcel} kaufbar`,
    current: state.parcels,
    target: best.parcel,
    fraction: clamp01(state.parcels / best.parcel),
    ready: false,
  }
}

/** Next cannabis/trade license — a hard money sink with a lasting benefit (PHASE 27). */
function licenseGoal(state: GameState): Goal | null {
  const next = LICENSES.find((l) => l.level === state.licenses + 1)
  if (!next) return null
  const met = next.requirementMet(state)
  return {
    id: 'license',
    tier: next.level >= 4 ? 'endgame' : 'lang',
    icon: '📜',
    label: next.name,
    reward: met ? next.benefit ?? next.description : next.requirementText,
    current: met ? Math.min(state.money, next.cost) : 0,
    target: next.cost,
    fraction: met ? clamp01(state.money / next.cost) : 0,
    ready: met && state.money >= next.cost,
    why: next.level >= 4 ? 'Erhöht dauerhaft die Auftragsqualität' : 'Schaltet eine Hanf-Sorte frei',
  }
}

/** Master the plant you're already closest to levelling up. */
function masteryGoal(state: GameState): Goal | null {
  let best: { id: string; xp: number; level: number; frac: number } | null = null
  for (const [id, xp] of Object.entries(state.mastery)) {
    if (!plantById(id) || xp <= 0) continue
    const level = masteryLevel(xp)
    if (level >= CONFIG.masteryMaxLevel) continue
    const lo = masteryThreshold(level)
    const hi = masteryThreshold(level + 1)
    const frac = (xp - lo) / Math.max(hi - lo, 1)
    if (!best || frac > best.frac) best = { id, xp, level, frac }
  }
  if (!best) return null
  const def = plantById(best.id)!
  const lo = masteryThreshold(best.level)
  const hi = masteryThreshold(best.level + 1)
  return {
    id: 'mastery',
    tier: 'lang',
    icon: '🏅',
    label: `${def.name} meistern: Lv ${best.level + 1}`,
    reward: `+${Math.round(CONFIG.masteryYieldPerLevel * 100)} % Ertrag der Sorte`,
    current: best.xp - lo,
    target: hi - lo,
    fraction: clamp01(best.frac),
    ready: false,
  }
}

/** The achievement tier you're closest to reaching. */
function achievementGoal(state: GameState): Goal | null {
  let best: { def: (typeof ACHIEVEMENTS)[number]; frac: number; value: number; next: number; tier: number } | null = null
  for (const def of ACHIEVEMENTS) {
    const cur = claimedTier(state, def.id)
    if (cur >= def.tiers.length) continue
    const value = def.metric(state)
    const prev = cur > 0 ? def.tiers[cur - 1].threshold : 0
    const next = def.tiers[cur].threshold
    const frac = clamp01((value - prev) / (next - prev))
    if (!best || frac > best.frac) best = { def, frac, value, next, tier: cur }
  }
  if (!best) return null
  return {
    id: 'achievement',
    tier: best.frac > 0.6 ? 'mittel' : 'lang',
    icon: best.def.icon,
    label: `${best.def.name}: ${TIER_NAMES[best.tier]}`,
    reward: 'Erfolg-Belohnung',
    current: Math.round(best.value),
    target: Math.round(best.next),
    fraction: best.frac,
    ready: false,
  }
}

/** Discover the next seed-lab variant you can already reach. */
function variantGoal(state: GameState): Goal | null {
  const discovered = state.discoveredVariants.length
  if (discovered >= VARIANTS.length) return null
  const reachable = discoverableVariants(state)
  // a variant you can afford & meet conditions for → ready
  const ready = reachable.find((v) => crossEligibility(state, v.parents[0], v.parents[1]).status === 'ok')
  if (ready) {
    return {
      id: 'variant',
      tier: 'mittel',
      icon: ready.emoji,
      label: `Saatlabor: ${ready.name} kreuzbar`,
      reward: ready.role,
      current: 1,
      target: 1,
      fraction: 1,
      ready: true,
    }
  }
  // PHASE 21: a recipe blocked only on FREE produce → guide the player to grow it
  for (const v of reachable) {
    const r = crossEligibility(state, v.parents[0], v.parents[1])
    if (r.status === 'missing-produce') {
      const lines = produceStatus(state, v)
      const have = lines.reduce((a, l) => a + Math.min(l.free, l.need), 0)
      const need = lines.reduce((a, l) => a + l.need, 0)
      return {
        id: 'variant',
        tier: 'mittel',
        icon: v.emoji,
        label: `Saatlabor: ${v.name} braucht Produkte`,
        reward: lines.map((l) => `${l.free}/${l.need} ${l.name}`).join(' · '),
        current: have,
        target: need,
        fraction: clamp01(have / need),
        ready: false,
      }
    }
  }
  return {
    id: 'variant',
    tier: 'lang',
    icon: '🧬',
    label: 'Saatlabor: neue Variante entdecken',
    reward: `${discovered}/${VARIANTS.length} Varianten gesammelt`,
    current: discovered,
    target: VARIANTS.length,
    fraction: clamp01(discovered / VARIANTS.length),
    ready: false,
  }
}

/** Plant a freshly unlocked seed-lab special plant for the first time (PHASE 22). */
function specialPlantGoal(state: GameState): Goal | null {
  for (const sp of SPECIAL_PLANTS) {
    if (!isPlantUnlocked(sp, state)) continue
    if (plotsWithPlant(state, sp.id) > 0) continue
    return {
      id: 'specialplant',
      tier: 'mittel',
      icon: sp.emoji,
      label: `${sp.name} anpflanzen`,
      reward: 'Spezialpflanze — starke Schönheit',
      current: 0,
      target: 1,
      fraction: 0,
      ready: true,
    }
  }
  return null
}

/**
 * PHASE 29 — build-discovery nudge. The game has many viable play-styles, but a
 * player won't stumble on them without a hint. This surfaces ONE soft suggestion
 * for a style the player hasn't engaged yet AND can realistically try now. It
 * rotates by parcel count (stable within a prestige, varies across them), is
 * flagged `discovery` so it never displaces real progression, and disappears
 * once the style is in use. No new save data.
 */
function buildGoal(state: GameState): Goal | null {
  const hasOrnamentalPlanted = state.plots.some((p) => p.plantId && plantById(p.plantId)?.beautyBonus)
  const hasTimberPlanted = state.plots.some((p) => p.plantId && plantById(p.plantId)?.passiveIncome)
  const ornamentalUnlocked = PLANTS.some((p) => p.beautyBonus && isPlantUnlocked(p, state))
  const timberUnlocked = PLANTS.some((p) => p.passiveIncome && isPlantUnlocked(p, state))
  const anySpec = Object.values(state.specializations).some((l) => l > 0)
  const luckLevel = state.upgrades['glueckslos'] ?? 0

  type Sug = { id: string; icon: string; label: string; why: string }
  const candidates: Sug[] = []
  if (ornamentalUnlocked && gardenBeauty(state) <= 0 && !hasOrnamentalPlanted) {
    candidates.push({
      id: 'build-zier',
      icon: '✿',
      label: 'Zier-Build testen',
      why: 'Zierpflanzen geben gartenweite Boni, solange sie blühen',
    })
  }
  if (timberUnlocked && !hasTimberPlanted) {
    candidates.push({
      id: 'build-holz',
      icon: '🌲',
      label: 'Holz/Offline ausbauen',
      why: 'Bäume tröpfeln Gold — auch während du weg bist',
    })
  }
  if (state.level >= 30 && !anySpec) {
    candidates.push({
      id: 'build-spezial',
      icon: '⭐',
      label: 'Eine Kategorie spezialisieren',
      why: 'Dauerhafter Kategorie-Ertrag, übersteht Prestige',
    })
  }
  if (state.level >= 15 && luckLevel === 0) {
    candidates.push({
      id: 'build-glueck',
      icon: '🍀',
      label: 'Glücks-/Los-Build testen',
      why: 'Glückslos lässt öfter Rubbellose in der Ernte liegen',
    })
  }
  if (candidates.length === 0) return null
  // deterministic rotation: changes across prestiges, stable within one
  const pick = candidates[state.parcels % candidates.length]
  return {
    id: pick.id,
    tier: 'mittel',
    icon: pick.icon,
    label: pick.label,
    reward: 'Neue Spielweise entdecken',
    current: 0,
    target: 1,
    fraction: 0,
    ready: false,
    discovery: true,
    why: pick.why,
  }
}

/** Collection goal: unlock every plant. */
function collectionGoal(state: GameState): Goal | null {
  const unlocked = PLANTS.filter((p) => isPlantUnlocked(p, state)).length
  if (unlocked >= PLANTS.length) return null
  return {
    id: 'collection',
    tier: 'endgame',
    icon: '🗂️',
    label: 'Alle Sorten freischalten',
    reward: `${PLANTS.length - unlocked} fehlen noch`,
    current: unlocked,
    target: PLANTS.length,
    fraction: clamp01(unlocked / PLANTS.length),
    ready: false,
  }
}

/** Spend unspent skill points (mid-term, only when you have some). */
function skillGoal(state: GameState): Goal | null {
  const pts = availableSkillPoints(state)
  if (pts <= 0) return null
  return {
    id: 'skill',
    tier: 'mittel',
    icon: '✦',
    label: 'Fähigkeit freischalten',
    reward: `${pts} Skillpunkt${pts === 1 ? '' : 'e'} frei`,
    current: pts,
    target: pts,
    fraction: 1,
    ready: true,
    chore: true,
  }
}

/** Cash in pending scratch tickets (short-term, ready when you hold some). */
function scratchGoal(state: GameState): Goal | null {
  const t = state.scratchTickets
  if (t <= 0) return null
  return {
    id: 'scratch',
    tier: 'kurz',
    icon: '🎟️',
    label: 'Rubbellose einlösen',
    reward: 'Gold, Kompost, Booster & mehr',
    current: t,
    target: t,
    fraction: 1,
    ready: true,
    chore: true,
  }
}

/** Push the garden toward its next beauty (Zier) milestone aura. */
function beautyGoal(state: GameState): Goal | null {
  const beauty = gardenBeauty(state)
  const m = nextBeautyMilestone(beauty)
  if (!m) return null
  // only surface this once the player has started a beauty garden, or owns zier
  const hasOrnamental = state.plots.some((p) => {
    const def = p.plantId ? plantById(p.plantId) : null
    return def?.beautyBonus
  })
  if (beauty <= 0 && !hasOrnamental) return null
  return {
    id: 'beauty',
    tier: 'lang',
    icon: '✿',
    label: `Schönheit: ${m.label}`,
    reward: m.desc,
    current: Math.round(beauty * 100),
    target: Math.round(m.beauty * 100),
    fraction: clamp01(beauty / m.beauty),
    ready: false,
  }
}

const TIER_ORDER: Record<GoalTier, number> = { kurz: 0, mittel: 1, lang: 2, endgame: 3 }

/**
 * The active goal board: one representative goal per generator, filtered to what
 * applies, sorted short → endgame. Always returns several goals across tiers so
 * the player can pick what to chase.
 */
export function activeGoals(state: GameState): Goal[] {
  const goals = [
    plantGoal(state),
    upgradeGoal(state),
    shopGoal(state),
    licenseGoal(state),
    scratchGoal(state),
    questGoal(state),
    specGoal(state),
    skillGoal(state),
    parcelGoal(state),
    parcelMilestoneGoal(state),
    beautyGoal(state),
    masteryGoal(state),
    variantGoal(state),
    specialPlantGoal(state),
    achievementGoal(state),
    compostGoal(state),
    buildGoal(state),
    collectionGoal(state),
  ].filter((g): g is Goal => g !== null)
  goals.sort((a, b) => {
    const t = TIER_ORDER[a.tier] - TIER_ORDER[b.tier]
    if (t !== 0) return t
    // PHASE 28/29: soft nudges sort below real progress within a horizon — first
    // trivial "anytime" chores (cheap upgrade, cash a ticket), then discovery
    // suggestions — so the board never headlines a boring or optional point.
    const rank = (g: Goal) => (g.chore ? 2 : g.discovery ? 1 : 0)
    const r = rank(a) - rank(b)
    if (r !== 0) return r
    return b.fraction - a.fraction
  })
  return goals
}

/**
 * The goal BOARD shown in the UI (PHASE 28, diversified in PHASE 29). Capped per
 * horizon so it stays scannable on mobile, and composed for VARIETY: at most one
 * trivial chore and at most one build-discovery nudge survive, so the panel never
 * fills up with "do this anytime" filler and always mixes real horizons.
 */
export function goalBoard(state: GameState, perTier = 3): Goal[] {
  const counts: Record<GoalTier, number> = { kurz: 0, mittel: 0, lang: 0, endgame: 0 }
  let chores = 0
  let discoveries = 0
  const out: Goal[] = []
  for (const g of activeGoals(state)) {
    if (g.chore && chores >= 1) continue
    if (g.discovery && discoveries >= 1) continue
    if (counts[g.tier] >= perTier) continue
    counts[g.tier] += 1
    if (g.chore) chores += 1
    if (g.discovery) discoveries += 1
    out.push(g)
  }
  return out
}

export const TIER_LABEL: Record<GoalTier, string> = {
  kurz: 'Kurzfristig',
  mittel: 'Mittelfristig',
  lang: 'Langfristig',
  endgame: 'Endgame',
}
