// Transient UI notifications (not part of the game state, never saved).
//
// PHASE 29 — anti-spam rework. The late game can fire dozens of harvest events
// in a row (manual + repeated "alle ernten"), each previously stacking its own
// level-up and scratch-ticket toast into the playfield. Now toasts:
//   • carry a PRIORITY so rare/important messages never get buried by spam,
//   • can AGGREGATE by key — a repeated event updates one toast (accumulating a
//     count/amount) instead of pushing a new one,
//   • are render-capped to the few most important (see Toasts.svelte),
//   • live in a fixed corner, away from the hotbar and main buttons.

import { writable } from 'svelte/store'

export type ToastPriority = 'low' | 'normal' | 'important' | 'critical'

/** numeric weight for sorting/capping — higher wins a crowded screen */
export const PRIORITY_WEIGHT: Record<ToastPriority, number> = {
  low: 0,
  normal: 1,
  important: 2,
  critical: 3,
}

export interface Toast {
  id: number
  icon: string
  text: string
  priority: number
  /** aggregation key: a new event with the same key updates this toast */
  key?: string
  /** how many events were merged into this toast */
  count: number
  /** epoch ms when this toast should disappear (refreshed on aggregation) */
  expires: number
  /** opaque accumulator carried across aggregated events (e.g. summed gold) */
  acc?: unknown
}

let nextId = 1
let sweeper: ReturnType<typeof setInterval> | null = null

export const toasts = writable<Toast[]>([])

// PHASE 30 — toast log. Aggregation deliberately hides detail on screen, so keep
// a short, persistent-in-session HISTORY the player can review ("what did I just
// miss?"). Never saved; capped to the most recent few dozen. Keyed/aggregated
// toasts update their single log entry (so the bundle reads as one line), and an
// unseen counter drives a small HUD badge until the log is opened.
export interface ToastLogEntry {
  logKey: string
  icon: string
  text: string
  priority: number
  count: number
  at: number
}

const LOG_MAX = 40
export const toastLog = writable<ToastLogEntry[]>([])
export const toastLogUnseen = writable(0)

function logToast(t: { id: number; icon: string; text: string; priority: number; key?: string; count: number }): void {
  const logKey = t.key ?? `id:${t.id}`
  const at = Date.now()
  toastLog.update((log) => {
    const rest = log.filter((e) => e.logKey !== logKey)
    return [{ logKey, icon: t.icon, text: t.text, priority: t.priority, count: t.count, at }, ...rest].slice(0, LOG_MAX)
  })
  toastLogUnseen.update((n) => Math.min(n + 1, 99))
}

/** Mark the log as seen (clears the HUD badge) — call when the log panel opens. */
export function markToastLogSeen(): void {
  toastLogUnseen.set(0)
}

/** Wipe the in-session toast history. */
export function clearToastLog(): void {
  toastLog.set([])
  toastLogUnseen.set(0)
}

/** Drop expired toasts; stop the timer when the screen is clear (test-friendly). */
function sweep(now = Date.now()): void {
  toasts.update((list) => {
    const live = list.filter((t) => t.expires > now)
    if (live.length === 0 && sweeper !== null) {
      clearInterval(sweeper)
      sweeper = null
    }
    return live.length === list.length ? list : live
  })
}

function ensureSweeper(): void {
  // jsdom/node test runs have setInterval; guard anyway and never block exit
  if (sweeper === null && typeof setInterval === 'function') {
    sweeper = setInterval(() => sweep(), 250)
    // don't keep the process alive in node (tests / SSR)
    ;(sweeper as { unref?: () => void })?.unref?.()
  }
}

export interface PushOpts {
  priority?: ToastPriority
  /** aggregation key — repeated pushes with the same key update one toast */
  key?: string
}

/**
 * Show a one-shot toast. Backward-compatible signature; pass `opts.key` to make
 * repeated identical messages collapse into one, and `opts.priority` so it can
 * out-rank low-priority spam on a crowded screen.
 */
export function pushToast(text: string, icon = '🌱', ttlMs = 6000, opts: PushOpts = {}): void {
  ensureSweeper()
  const priority = PRIORITY_WEIGHT[opts.priority ?? 'normal']
  const expires = Date.now() + ttlMs
  let logged: { id: number; count: number } = { id: 0, count: 1 }
  toasts.update((list) => {
    if (opts.key) {
      const existing = list.find((t) => t.key === opts.key)
      if (existing) {
        existing.text = text
        existing.icon = icon
        existing.priority = priority
        existing.count += 1
        existing.expires = expires
        logged = { id: existing.id, count: existing.count }
        return [...list]
      }
    }
    const id = nextId++
    logged = { id, count: 1 }
    return [...list, { id, icon, text, priority, key: opts.key, count: 1, expires }]
  })
  logToast({ id: logged.id, icon, text, priority, key: opts.key, count: logged.count })
}

export interface AggregateSpec<A> {
  key: string
  icon: string
  priority?: ToastPriority
  ttlMs?: number
  /** merge this event into the previous accumulator (null on first), returning
   * the new accumulator and the toast text to display */
  merge: (prev: A | null) => { acc: A; text: string }
}

/**
 * Aggregating toast: a stream of similar events (level-ups, scratch tickets…)
 * collapses into ONE live toast that keeps updating its count/amount, instead of
 * stacking N toasts. The TTL is refreshed on every merge so the bundle stays
 * visible while the burst lasts, then ages out as one message.
 */
export function pushAggregateToast<A>(spec: AggregateSpec<A>): void {
  ensureSweeper()
  const priority = PRIORITY_WEIGHT[spec.priority ?? 'normal']
  const expires = Date.now() + (spec.ttlMs ?? 6000)
  let logged: { id: number; text: string; count: number } = { id: 0, text: '', count: 1 }
  toasts.update((list) => {
    const existing = list.find((t) => t.key === spec.key)
    if (existing) {
      const { acc, text } = spec.merge(existing.acc as A)
      existing.acc = acc
      existing.text = text
      existing.icon = spec.icon
      existing.priority = priority
      existing.count += 1
      existing.expires = expires
      logged = { id: existing.id, text, count: existing.count }
      return [...list]
    }
    const { acc, text } = spec.merge(null)
    const id = nextId++
    logged = { id, text, count: 1 }
    return [...list, { id, icon: spec.icon, text, priority, key: spec.key, count: 1, expires, acc }]
  })
  logToast({ id: logged.id, icon: spec.icon, text: logged.text, priority, key: spec.key, count: logged.count })
}

/**
 * Scratch tickets found while harvesting. Repeated finds (and a big "alle ernten"
 * that drops many at once) collapse into ONE updating toast instead of stacking.
 */
export function pushTicketToast(found: number): void {
  if (found <= 0) return
  pushAggregateToast<number>({
    key: 'ticket',
    icon: '🎟️',
    priority: 'normal',
    ttlMs: 6000,
    merge: (prev) => {
      const n = (prev ?? 0) + found
      return { acc: n, text: `+${n} Rubbellos${n === 1 ? '' : 'e'} in der Ernte gefunden` }
    },
  })
}

export function dismissToast(id: number): void {
  toasts.update((list) => list.filter((t) => t.id !== id))
}

/** Test/utility hook: clear everything immediately. */
export function clearToasts(): void {
  toasts.set([])
}
