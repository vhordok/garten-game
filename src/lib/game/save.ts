// Persistence: localStorage save/load with versioning, export/import as
// base64 code. Bump SAVE_VERSION + add a migrate() step on format changes.

import { achievementById } from '../data/achievements'
import { CONFIG } from '../data/config'
import { COMPOST_UPGRADES } from '../data/compostUpgrades'
import { maxScratchTickets } from './modifiers'
import { PLANTS, plantById } from '../data/plants'
import { QUEST_CLIENTS, QUEST_TIERS } from '../data/questFlavor'
import { questSlotCount } from './quests'
import { UPGRADES } from '../data/upgrades'
import { createDefaultState, emptyPlot, getState, replaceState } from './state'
import type { GameState, PlotState, QuestItem, QuestKind } from './types'

export const SAVE_VERSION = 22

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
  state.compostSpent = Math.floor(clampNumber(r.compostSpent, 0, 0, 1e12))

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

  state.level = Math.floor(clampNumber(r.level, 1, 1, 9999))
  state.xp = clampNumber(r.xp, 0)
  state.createdAt = clampNumber(r.createdAt, state.createdAt)

  if (Array.isArray(r.plots)) {
    const plots = r.plots.slice(0, 1000).map((p): PlotState => {
      if (typeof p !== 'object' || p === null) return emptyPlot()
      const plot = p as Record<string, unknown>
      const def = typeof plot.plantId === 'string' ? plantById(plot.plantId) : undefined
      if (!def) return emptyPlot()
      const regrowing = plot.regrowing === true && typeof def.regrowTime === 'number'
      const target = regrowing && def.regrowTime ? def.regrowTime : def.growTime
      return {
        plantId: def.id,
        progress: clampNumber(plot.progress, 0, 0, target),
        // older saves lack the field — be generous and grant full charges
        waterLeft: Math.floor(
          clampNumber(plot.waterLeft, CONFIG.waterChargesPerCrop, 0, CONFIG.waterChargesPerCrop)
        ),
        regrowing,
      }
    })
    while (plots.length < CONFIG.startPlots) plots.push(emptyPlot())
    state.plots = plots
  }

  const inventory: Record<string, number> = {}
  if (typeof r.inventory === 'object' && r.inventory !== null) {
    for (const [id, count] of Object.entries(r.inventory)) {
      if (!plantById(id)) continue
      const n = Math.floor(clampNumber(count, 0))
      if (n > 0) inventory[id] = n
    }
  }
  state.inventory = inventory

  const selected = typeof r.selectedPlantId === 'string' ? plantById(r.selectedPlantId) : undefined
  state.selectedPlantId = selected ? selected.id : PLANTS[0].id

  const autoSow = typeof r.autoSowPlantId === 'string' ? plantById(r.autoSowPlantId) : undefined
  state.autoSowPlantId = autoSow ? autoSow.id : null

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

  const achievements: string[] = []
  if (Array.isArray(r.achievements)) {
    for (const id of r.achievements) {
      if (typeof id === 'string' && achievementById(id) && !achievements.includes(id)) {
        achievements.push(id)
      }
    }
  }
  state.achievements = achievements
  state.licenses = Math.floor(clampNumber(r.licenses, 0, 0, 3))

  const rec = (typeof r.records === 'object' && r.records !== null ? r.records : {}) as Record<string, unknown>
  state.records = {
    bestHarvest: Math.floor(clampNumber(rec.bestHarvest, 0)),
    longestCombo: Math.floor(clampNumber(rec.longestCombo, 0)),
    biggestWin: Math.floor(clampNumber(rec.biggestWin, 0)),
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
    }
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
