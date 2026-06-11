// Persistence: localStorage save/load with versioning, export/import as
// base64 code. Bump SAVE_VERSION + add a migrate() step on format changes.

import { CONFIG } from '../data/config'
import { PLANTS, plantById } from '../data/plants'
import { questSlots } from '../data/progression'
import { UPGRADES } from '../data/upgrades'
import { createDefaultState, emptyPlot, getState, replaceState } from './state'
import type { GameState, PlotState } from './types'

export const SAVE_VERSION = 10

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
  state.parcels = Math.floor(clampNumber(r.parcels, 1, 1, 1000))
  state.compost = Math.floor(clampNumber(r.compost, 0, 0, 1e9))
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

  state.scratchTickets = Math.floor(clampNumber(r.scratchTickets, 0, 0, CONFIG.scratchMaxPending))
  state.fertilizerCharges = Math.floor(clampNumber(r.fertilizerCharges, 0, 0, 999))

  state.questCounter = Math.floor(clampNumber(r.questCounter, 0))
  const quests: GameState['quests'] = []
  if (Array.isArray(r.quests)) {
    for (const raw of r.quests.slice(0, questSlots(state.level))) {
      if (typeof raw !== 'object' || raw === null) continue
      const q = raw as Record<string, unknown>
      const plant = typeof q.plantId === 'string' ? plantById(q.plantId) : undefined
      if (!plant) continue
      const amount = Math.floor(clampNumber(q.amount, 0, 1))
      quests.push({
        id: Math.floor(clampNumber(q.id, ++state.questCounter, 1)),
        plantId: plant.id,
        amount,
        reward: Math.floor(clampNumber(q.reward, amount * plant.sellValue, 0)),
        xp: Math.floor(clampNumber(q.xp, amount, 0)),
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
