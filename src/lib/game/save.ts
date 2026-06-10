// Persistence: localStorage save/load with versioning, export/import as
// base64 code. Bump SAVE_VERSION + add a migrate() step on format changes.

import { CONFIG } from '../data/config'
import { PLANTS, plantById } from '../data/plants'
import { createDefaultState, emptyPlot, getState, replaceState } from './state'
import type { GameState, PlotState } from './types'

export const SAVE_VERSION = 1

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
  state.createdAt = clampNumber(r.createdAt, state.createdAt)

  if (Array.isArray(r.plots)) {
    const plots = r.plots.slice(0, 1000).map((p): PlotState => {
      if (typeof p !== 'object' || p === null) return emptyPlot()
      const plot = p as Record<string, unknown>
      const def = typeof plot.plantId === 'string' ? plantById(plot.plantId) : undefined
      if (!def) return emptyPlot()
      return { plantId: def.id, progress: clampNumber(plot.progress, 0, 0, def.growTime) }
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

  if (typeof r.stats === 'object' && r.stats !== null) {
    const stats = r.stats as Record<string, unknown>
    state.stats = {
      planted: Math.floor(clampNumber(stats.planted, 0)),
      harvested: Math.floor(clampNumber(stats.harvested, 0)),
      sold: Math.floor(clampNumber(stats.sold, 0)),
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
