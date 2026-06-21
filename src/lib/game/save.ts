// Persistence: localStorage save/load with versioning, export/import as
// base64 code. Bump SAVE_VERSION + add a migrate() step on format changes.

import { ACHIEVEMENTS } from '../data/achievements'
import { initAchievementTiers } from './achievements'
import { initCampaign } from './campaign'
import { CAMPAIGN } from '../data/campaign'
import { decorationById } from '../data/decorations'
import { CONFIG } from '../data/config'
import { COMPOST_UPGRADES } from '../data/compostUpgrades'
import { STAR_UPGRADES } from '../data/starUpgrades'
import { maxScratchTickets } from './modifiers'
import { PLANTS, plantById } from '../data/plants'
import { QUEST_CLIENTS, QUEST_TIERS } from '../data/questFlavor'
import { questSlotCount } from './quests'
import { SKILLS } from '../data/skills'
import { variantById } from '../data/variants'
import { UPGRADES } from '../data/upgrades'
import { createDefaultState, emptyPlot, getState, replaceState } from './state'
import type { GameState, PlotState, QuestItem, QuestKind } from './types'

export const SAVE_VERSION = 33

interface SaveEnvelope {
  version: number
  savedAt: number
  state: GameState
}

export function save(now = Date.now()): void {
  const envelope: SaveEnvelope = { version: SAVE_VERSION, savedAt: now, state: getState() }
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(envelope))
  } catch (err) {
    console.warn('Speichern fehlgeschlagen:', err)
  }
}

/**
 * Load from localStorage into the live state.
 * Returns the save's timestamp (for offline progress) or null if absent/invalid.
 */
export function loadFromStorage(): number | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(CONFIG.saveKey)
  } catch (err) {
    console.warn('localStorage nicht verfügbar:', err)
    return null
  }
  if (!raw) return null
  const parsed = parseEnvelope(raw)
  if (!parsed) {
    // Keep the broken payload around instead of silently overwriting it.
    try {
      localStorage.setItem(`${CONFIG.saveKey}.backup`, raw)
    } catch {
      /* ignore */
    }
    console.warn('Spielstand unlesbar — Backup unter', `${CONFIG.saveKey}.backup`)
    return null
  }
  replaceState(parsed.state)
  return parsed.savedAt
}

/** Serialized save as a copy-friendly base64 code. */
export function exportSave(): string {
  const envelope: SaveEnvelope = { version: SAVE_VERSION, savedAt: Date.now(), state: getState() }
  return toBase64(JSON.stringify(envelope))
}

/**
 * Import a save code (base64 or raw JSON). Replaces the live state and
 * persists immediately. Returns the save's timestamp or null on failure.
 */
export function importSave(code: string): number | null {
  const text = code.trim()
  if (!text) return null
  const json = fromBase64(text) ?? text
  const parsed = parseEnvelope(json)
  if (!parsed) return null
  replaceState(parsed.state)
  save()
  return parsed.savedAt
}

/** Wipe the save and start over. */
export function resetSave(): void {
  try {
    localStorage.removeItem(CONFIG.saveKey)
  } catch {
    /* ignore */
  }
  replaceState(createDefaultState())
  save()
}

function parseEnvelope(json: string): { savedAt: number; state: GameState } | null {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const envelope = raw as Record<string, unknown>
  if (typeof envelope.version !== 'number') return null
  const migrated = migrate(envelope)
  if (!migrated) return null
  return {
    savedAt: clampNumber(migrated.savedAt, Date.now()),
    state: sanitize(migrated.state),
  }
}

/**
 * One case per published save version. When the format changes: bump
 * SAVE_VERSION and add a step that rewrites the old shape to the new one.
 */
function migrate(envelope: Record<string, unknown>): Record<string, unknown> | null {
  switch (envelope.version) {
    case 1:
      // v1 → v2: upgrades were introduced; sanitize() fills the missing
      // field with level 0 for everything.
      return { ...envelope, version: 2 }
    case 2:
      // v2 → v3: stats gained the crits counter; sanitize() defaults it to 0.
      return { ...envelope, version: 3 }
    case 3:
      // v3 → v4: combo state added — transient anyway, sanitize() resets it.
      return { ...envelope, version: 4 }
    case 4:
      // v4 → v5: gardener level/xp added; sanitize() defaults to level 1.
      return { ...envelope, version: 5 }
    case 5:
      // v5 → v6: quest board added; boot refills missing slots.
      return { ...envelope, version: 6 }
    case 6:
      // v6 → v7: watering charges per plot; sanitize() grants growing
      // crops the full charge set.
      return { ...envelope, version: 7 }
    case 7:
      // v7 → v8: scratch tickets + fertilizer charges; default 0.
      return { ...envelope, version: 8 }
    case 8:
      // v8 → v9: regrow flag per plot (berries/trees); defaults to false.
      return { ...envelope, version: 9 }
    case 9:
      // v9 → v10: prestige (parcels/compost) + lifetimeEarned; sanitize()
      // seeds lifetimeEarned from the round earnings of old saves.
      return { ...envelope, version: 10 }
    case 10:
      // v10 → v11: quest tiers/clients + delivery streak; old quests get
      // bronze tier and a fresh client via sanitize().
      return { ...envelope, version: 11 }
    case 11:
      // v11 → v12: helper accumulators; sanitize() defaults them to 0.
      return { ...envelope, version: 12 }
    case 12:
      // v12 → v13: market-wave clock; defaults to 0.
      return { ...envelope, version: 13 }
    case 13:
      // v13 → v14: daily gift streak; defaults claimable.
      return { ...envelope, version: 14 }
    case 14:
      // v14 → v15: weather events — transient, sanitize() clears them.
      return { ...envelope, version: 15 }
    case 15:
      // v15 → v16: achievements list; defaults empty (re-earned via checks).
      return { ...envelope, version: 16 }
    case 16:
      // v16 → v17: cannabis licenses; default 0.
      return { ...envelope, version: 17 }
    case 17:
      // v17 → v18: records + earnings history; defaults empty.
      return { ...envelope, version: 18 }
    case 18:
      // v18 → v19: separate auto-sow plant for the gnome; sanitize() defaults
      // it to null (= keep following the manual selection, old behavior).
      return { ...envelope, version: 19 }
    case 19:
      // v19 → v20: plant mastery + category specialisations; sanitize() defaults
      // both to empty maps (= no bonuses yet, old saves unaffected).
      return { ...envelope, version: 20 }
    case 20:
      // v20 → v21: maxUnlockEarned (post-prestige quest floor); sanitize()
      // seeds it from the round's totalEarned for old saves.
      return { ...envelope, version: 21 }
    case 21:
      // v21 → v22: multi-line quests + compost garden; sanitize() converts old
      // single-plant orders to the new items[] shape and defaults the rest.
      return { ...envelope, version: 22 }
    case 22:
      // v22 → v23: PHASE 14 enriches category specialisations (unique per-category
      // perks, gold+compost cost, progression gates). No new persisted fields —
      // perks derive from the existing `specializations` levels and compost spend
      // flows through compost/compostSpent — so old saves carry over unchanged;
      // sanitize() still clamps specialisation levels to specMaxLevel.
      return { ...envelope, version: 23 }
    case 26:
      // v26 → v27: PHASE 20 seed lab — new `discoveredVariants` id list. sanitize()
      // defaults it to [] (empty collection), so old saves are unaffected.
      return { ...envelope, version: 27 }
    case 27:
      // v27 → v28: PHASE 27 late-game sinks. No new persisted fields — new shop
      // upgrades + compost sinks default to level 0 for old saves, licenses IV/V
      // just lift the existing `licenses` clamp from 3 to 5. Pure passthrough.
      return { ...envelope, version: 28 }
    case 28:
      // v28 → v29: PHASE 44 Ziergalerie — ornamentals move off the field into a
      // permanent `ornamentals` collection. sanitize() defaults it to {} AND
      // folds any beauty plants still sitting on the field (old saves) into the
      // collection, freeing those plots. No beauty is lost.
      return { ...envelope, version: 29 }
    case 29:
      // v29 → v30: PHASE 48 mini-campaign — a new `campaign` index (next unclaimed
      // step). sanitize() defaults it to 0 AND, for saves that arrive without it,
      // advances it past every already-satisfied step WITHOUT paying rewards
      // (initCampaign) so existing players resume at their real frontier.
      return { ...envelope, version: 30 }
    case 30:
      // v30 → v31: PHASE 49 Garten-Deko — new `decorations` count map. sanitize()
      // defaults it to {} (no decorations placed), so old saves are unaffected.
      return { ...envelope, version: 31 }
    case 31:
      // v31 → v32: PHASE 51 Weltensaat — new `starseed` + `worldResets`. sanitize()
      // defaults both to 0, so old saves carry no higher-prestige progress yet.
      return { ...envelope, version: 32 }
    case 32:
      // v32 → v33: PHASE 53 Sternenkammer — new `starseedSpent` + `starUpgrades`.
      // sanitize() defaults them to 0 / {}, so old saves have nothing spent yet.
      return { ...envelope, version: 33 }
    case 25:
      // v25 → v26: PHASE 19 tiered achievements. The old `achievements` string[]
      // is dropped; `achievementTiers` is initialised from the loaded stats in
      // sanitize() (claimed = reached, no retroactive one-time rewards). New
      // stats (questsDone/scratchesDone) + records.bestBeauty default to 0.
      return { ...envelope, version: 26 }
    case 24:
      // v24 → v25: PHASE 17 skill tree — new `skills` map. sanitize() defaults it
      // to {} (no skills taken), so old saves are unaffected; points are derived
      // from existing progress (parcels/achievements/level).
      return { ...envelope, version: 25 }
    case 23:
      // v23 → v24: PHASE 15 late-game rebalance — escalating specialisation value
      // + milestones, repeatable endgame compost sinks, wider top-of-ladder
      // unlocks. No new persisted fields: specialisation levels and compost-upgrade
      // levels keep the same Record<string,number> shape (new compost ids default
      // to 0 for old saves), and re-priced future purchases don't touch stored
      // values. compostSpent's sanitize ceiling is raised for the new sinks.
      return { ...envelope, version: 24 }
    case SAVE_VERSION:
      return envelope
    default:
      // Unknown (e.g. newer) format — refuse instead of corrupting.
      return null
  }
}

/** Defensively rebuild a GameState from untrusted parsed data. */
function sanitize(raw: unknown): GameState {
  const state = createDefaultState()
  if (typeof raw !== 'object' || raw === null) return state
  const r = raw as Record<string, unknown>

  state.money = clampNumber(r.money, state.money)
  state.totalEarned = clampNumber(r.totalEarned, 0)
  state.lifetimeEarned = clampNumber(r.lifetimeEarned, state.totalEarned, state.totalEarned)
  // old saves: seed the quest floor from the current round so orders stay on tier
  state.maxUnlockEarned = clampNumber(r.maxUnlockEarned, state.totalEarned, state.totalEarned)
  state.parcels = Math.floor(clampNumber(r.parcels, 1, 1, 1000))
  state.compost = Math.floor(clampNumber(r.compost, 0, 0, 1e9))
  state.compostSpent = Math.floor(clampNumber(r.compostSpent, 0, 0, 1e15))

  // compost-garden upgrade levels — keep only known ids, clamp to maxLevel
  const compostUpgrades: Record<string, number> = {}
  if (typeof r.compostUpgrades === 'object' && r.compostUpgrades !== null) {
    const raw = r.compostUpgrades as Record<string, unknown>
    for (const def of COMPOST_UPGRADES) {
      const level = Math.floor(clampNumber(raw[def.id], 0, 0, def.maxLevel))
      if (level > 0) compostUpgrades[def.id] = level
    }
  }
  state.compostUpgrades = compostUpgrades

  // per-plant mastery XP — keep only known plants, clamp to a sane ceiling
  const mastery: Record<string, number> = {}
  if (typeof r.mastery === 'object' && r.mastery !== null) {
    for (const [id, value] of Object.entries(r.mastery)) {
      if (!plantById(id)) continue
      const n = Math.floor(clampNumber(value, 0, 0, 1e15))
      if (n > 0) mastery[id] = n
    }
  }
  state.mastery = mastery

  // per-category specialisation levels — keep only real categories
  const categories = new Set<string>(PLANTS.map((p) => p.category))
  const specializations: Record<string, number> = {}
  if (typeof r.specializations === 'object' && r.specializations !== null) {
    for (const [cat, value] of Object.entries(r.specializations)) {
      if (!categories.has(cat)) continue
      const n = Math.floor(clampNumber(value, 0, 0, CONFIG.specMaxLevel))
      if (n > 0) specializations[cat] = n
    }
  }
  state.specializations = specializations

  // PHASE 17 skill-tree levels — keep only known skills, clamp to maxLevel
  const skills: Record<string, number> = {}
  if (typeof r.skills === 'object' && r.skills !== null) {
    const raw = r.skills as Record<string, unknown>
    for (const def of SKILLS) {
      const level = Math.floor(clampNumber(raw[def.id], 0, 0, def.maxLevel))
      if (level > 0) skills[def.id] = level
    }
  }
  state.skills = skills

  // PHASE 20 discovered seed-lab variants — keep only known ids, dedupe
  const variants: string[] = []
  if (Array.isArray(r.discoveredVariants)) {
    for (const id of r.discoveredVariants) {
      if (typeof id === 'string' && variantById(id) && !variants.includes(id)) variants.push(id)
    }
  }
  state.discoveredVariants = variants

  state.level = Math.floor(clampNumber(r.level, 1, 1, 9999))
  state.xp = clampNumber(r.xp, 0)
  state.createdAt = clampNumber(r.createdAt, state.createdAt)

  // PHASE 44 Ziergalerie: owned ornamental counts (permanent collection).
  const ornamentals: Record<string, number> = {}
  const addOrnamental = (id: string, n: number) => {
    const def = plantById(id)
    if (!def || !(def.beautyBonus && def.beautyBonus > 0)) return
    const next = Math.min((ornamentals[id] ?? 0) + n, CONFIG.galleryMaxCopies)
    if (next > 0) ornamentals[id] = next
  }
  if (typeof r.ornamentals === 'object' && r.ornamentals !== null) {
    for (const [id, count] of Object.entries(r.ornamentals as Record<string, unknown>)) {
      addOrnamental(id, Math.floor(clampNumber(count, 0, 0, CONFIG.galleryMaxCopies)))
    }
  }

  if (Array.isArray(r.plots)) {
    const plots: PlotState[] = []
    for (const p of r.plots.slice(0, 1000)) {
      if (typeof p !== 'object' || p === null) {
        plots.push(emptyPlot())
        continue
      }
      const plot = p as Record<string, unknown>
      const def = typeof plot.plantId === 'string' ? plantById(plot.plantId) : undefined
      if (!def) {
        plots.push(emptyPlot())
        continue
      }
      // PHASE 44 migration: a beauty plant still on the field (old save) becomes
      // a collection copy and frees its plot — no beauty lost, no clutter kept.
      if (def.beautyBonus && def.beautyBonus > 0) {
        addOrnamental(def.id, 1)
        plots.push(emptyPlot())
        continue
      }
      const regrowing = plot.regrowing === true && typeof def.regrowTime === 'number'
      const target = regrowing && def.regrowTime ? def.regrowTime : def.growTime
      plots.push({
        plantId: def.id,
        progress: clampNumber(plot.progress, 0, 0, target),
        // older saves lack the field — be generous and grant full charges
        waterLeft: Math.floor(
          clampNumber(plot.waterLeft, CONFIG.waterChargesPerCrop, 0, CONFIG.waterChargesPerCrop)
        ),
        regrowing,
      })
    }
    while (plots.length < CONFIG.startPlots) plots.push(emptyPlot())
    state.plots = plots
  }

  state.ornamentals = ornamentals

  // PHASE 49 Garten-Deko: keep only valid ids, clamp counts to the cap
  const decorations: Record<string, number> = {}
  if (typeof r.decorations === 'object' && r.decorations !== null) {
    for (const [id, count] of Object.entries(r.decorations as Record<string, unknown>)) {
      if (!decorationById(id)) continue
      const n = Math.floor(clampNumber(count, 0, 0, CONFIG.decorationMaxCopies))
      if (n > 0) decorations[id] = n
    }
  }
  state.decorations = decorations

  const inventory: Record<string, number> = {}
  if (typeof r.inventory === 'object' && r.inventory !== null) {
    for (const [id, count] of Object.entries(r.inventory)) {
      if (!plantById(id)) continue
      const n = Math.floor(clampNumber(count, 0))
      if (n > 0) inventory[id] = n
    }
  }
  state.inventory = inventory

  // PHASE 44: ornamentals are gallery-only — never the field selection/auto-sow
  const selected = typeof r.selectedPlantId === 'string' ? plantById(r.selectedPlantId) : undefined
  state.selectedPlantId = selected && !selected.beautyBonus ? selected.id : PLANTS[0].id

  const autoSow = typeof r.autoSowPlantId === 'string' ? plantById(r.autoSowPlantId) : undefined
  state.autoSowPlantId = autoSow && !autoSow.beautyBonus ? autoSow.id : null

  const upgrades: Record<string, number> = {}
  if (typeof r.upgrades === 'object' && r.upgrades !== null) {
    const rawUpgrades = r.upgrades as Record<string, unknown>
    for (const def of UPGRADES) {
      const level = Math.floor(clampNumber(rawUpgrades[def.id], 0, 0, def.maxLevel))
      if (level > 0) upgrades[def.id] = level
    }
  }
  state.upgrades = upgrades

  // combo is session-only by design: loading always starts chainless
  state.combo = { count: 0, remaining: 0 }

  state.scratchTickets = Math.floor(clampNumber(r.scratchTickets, 0, 0, maxScratchTickets(state)))
  state.fertilizerCharges = Math.floor(clampNumber(r.fertilizerCharges, 0, 0, 999))

  const acc = (typeof r.helperAcc === 'object' && r.helperAcc !== null ? r.helperAcc : {}) as Record<
    string,
    unknown
  >
  state.helperAcc = {
    harvest: clampNumber(acc.harvest, 0, 0, 3600),
    sow: clampNumber(acc.sow, 0, 0, 3600),
    sell: clampNumber(acc.sell, 0, 0, 3600),
  }
  state.marketTime = clampNumber(r.marketTime, 0, 0, 1e12)
  const daily = (typeof r.daily === 'object' && r.daily !== null ? r.daily : {}) as Record<string, unknown>
  state.daily = {
    lastClaim: Math.floor(clampNumber(daily.lastClaim, 0, 0, 1e7)),
    streak: Math.floor(clampNumber(daily.streak, 0, 0, 1e6)),
  }
  // weather is a live moment — never restored from a save
  state.weather = { id: null, remaining: 0 }

  // PHASE 19 achievement tiers — keep only known tracks, clamp to the tier count
  const achievementTiers: Record<string, number> = {}
  const hasTiers = typeof r.achievementTiers === 'object' && r.achievementTiers !== null
  if (hasTiers) {
    const raw = r.achievementTiers as Record<string, unknown>
    for (const def of ACHIEVEMENTS) {
      const t = Math.floor(clampNumber(raw[def.id], 0, 0, def.tiers.length))
      if (t > 0) achievementTiers[def.id] = t
    }
  }
  state.achievementTiers = achievementTiers
  state.licenses = Math.floor(clampNumber(r.licenses, 0, 0, 5))

  // PHASE 51 Weltensaat: banked Sternensaat + reset count (default 0 for old saves)
  state.starseed = Math.floor(clampNumber(r.starseed, 0, 0, 1e9))
  state.worldResets = Math.floor(clampNumber(r.worldResets, 0, 0, 1e9))
  // PHASE 53 Sternenkammer: spent Sternensaat + upgrade levels (known ids only)
  state.starseedSpent = Math.floor(clampNumber(r.starseedSpent, 0, 0, 1e15))
  const starUpgrades: Record<string, number> = {}
  if (typeof r.starUpgrades === 'object' && r.starUpgrades !== null) {
    const raw = r.starUpgrades as Record<string, unknown>
    for (const def of STAR_UPGRADES) {
      const level = Math.floor(clampNumber(raw[def.id], 0, 0, def.maxLevel))
      if (level > 0) starUpgrades[def.id] = level
    }
  }
  state.starUpgrades = starUpgrades

  const rec = (typeof r.records === 'object' && r.records !== null ? r.records : {}) as Record<string, unknown>
  state.records = {
    bestHarvest: Math.floor(clampNumber(rec.bestHarvest, 0)),
    longestCombo: Math.floor(clampNumber(rec.longestCombo, 0)),
    biggestWin: Math.floor(clampNumber(rec.biggestWin, 0)),
    bestBeauty: clampNumber(rec.bestBeauty, 0, 0, 1e6),
  }
  state.history = Array.isArray(r.history)
    ? r.history.slice(-48).map((v) => clampNumber(v, 0))
    : []
  const hAcc = (typeof r.historyAcc === 'object' && r.historyAcc !== null ? r.historyAcc : {}) as Record<string, unknown>
  state.historyAcc = {
    seconds: clampNumber(hAcc.seconds, 0, 0, 1800),
    earnedStart: clampNumber(hAcc.earnedStart, state.lifetimeEarned, 0),
  }

  state.questCounter = Math.floor(clampNumber(r.questCounter, 0))
  state.questStreak = Math.floor(clampNumber(r.questStreak, 0, 0, 1e6))
  const quests: GameState['quests'] = []
  if (Array.isArray(r.quests)) {
    for (const raw of r.quests.slice(0, questSlotCount(state))) {
      if (typeof raw !== 'object' || raw === null) continue
      const q = raw as Record<string, unknown>
      // accept the new items[] shape; migrate a legacy single-plant order
      const items: QuestItem[] = []
      if (Array.isArray(q.items)) {
        for (const it of q.items) {
          if (typeof it !== 'object' || it === null) continue
          const itr = it as Record<string, unknown>
          const amount = Math.floor(clampNumber(itr.amount, 1, 1))
          if (typeof itr.plantId === 'string' && plantById(itr.plantId)) items.push({ plantId: itr.plantId, amount })
          else if (typeof itr.category === 'string' && categories.has(itr.category)) items.push({ category: itr.category, amount })
        }
      } else if (typeof q.plantId === 'string' && plantById(q.plantId)) {
        items.push({ plantId: q.plantId, amount: Math.floor(clampNumber(q.amount, 1, 1)) })
      }
      if (items.length === 0) continue
      const validKinds: QuestKind[] = ['single', 'combi', 'category', 'big']
      const kind: QuestKind =
        typeof q.kind === 'string' && validKinds.includes(q.kind as QuestKind)
          ? (q.kind as QuestKind)
          : items.length > 1
            ? 'combi'
            : items[0].category
              ? 'category'
              : 'single'
      const tier = typeof q.tier === 'string' && QUEST_TIERS.some((t) => t.id === q.tier) ? q.tier : 'bronze'
      const client =
        typeof q.client === 'string' && q.client.length > 0 && q.client.length <= 40 ? q.client : QUEST_CLIENTS[0]
      const fallbackReward = items.reduce((sum, it) => {
        const p = it.plantId ? plantById(it.plantId) : undefined
        return sum + it.amount * (p ? p.sellValue : 1)
      }, 0)
      const totalUnits = items.reduce((sum, it) => sum + it.amount, 0)
      quests.push({
        id: Math.floor(clampNumber(q.id, ++state.questCounter, 1)),
        kind,
        items,
        reward: Math.floor(clampNumber(q.reward, fallbackReward, 0)),
        rewardTickets: Math.floor(clampNumber(q.rewardTickets, 0, 0, 5)),
        rewardCompost: Math.floor(clampNumber(q.rewardCompost, 0, 0, 1e6)),
        xp: Math.floor(clampNumber(q.xp, totalUnits, 0)),
        tier,
        client,
        skipCooldown: clampNumber(q.skipCooldown, 0, 0, CONFIG.questSkipCooldownSeconds),
      })
    }
  }
  state.quests = quests

  if (typeof r.stats === 'object' && r.stats !== null) {
    const stats = r.stats as Record<string, unknown>
    state.stats = {
      planted: Math.floor(clampNumber(stats.planted, 0)),
      harvested: Math.floor(clampNumber(stats.harvested, 0)),
      sold: Math.floor(clampNumber(stats.sold, 0)),
      crits: Math.floor(clampNumber(stats.crits, 0)),
      questsDone: Math.floor(clampNumber(stats.questsDone, 0)),
      scratchesDone: Math.floor(clampNumber(stats.scratchesDone, 0)),
    }
  }

  // PHASE 19 migration: a save without achievementTiers (pre-v26) gets its tiers
  // initialised from the now-loaded stats — claimed = reached, WITHOUT paying the
  // one-time rewards (no retroactive flood, but permanent bonuses apply at once).
  if (!hasTiers) initAchievementTiers(state)

  // PHASE 48 campaign: a save with a stored index keeps it (clamped); one without
  // (pre-v30) is initialised past every already-satisfied step, no reward flood.
  if (typeof r.campaign === 'number' && Number.isFinite(r.campaign)) {
    state.campaign = Math.min(CAMPAIGN.length, Math.max(0, Math.floor(r.campaign)))
  } else {
    initCampaign(state)
  }

  return state
}

function clampNumber(value: unknown, fallback: number, min = 0, max = Number.MAX_VALUE): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(Math.max(n, min), max)
}

// Unicode-safe base64 helpers (btoa alone chokes on non-Latin1 characters).
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(text: string): string | null {
  try {
    const binary = atob(text)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}
