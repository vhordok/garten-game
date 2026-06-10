// Transient UI notifications (not part of the game state, never saved).

import { writable } from 'svelte/store'

export interface Toast {
  id: number
  icon: string
  text: string
}

let nextId = 1

export const toasts = writable<Toast[]>([])

export function pushToast(text: string, icon = '🌱', ttlMs = 6000): void {
  const id = nextId++
  toasts.update((list) => [...list, { id, icon, text }])
  setTimeout(() => dismissToast(id), ttlMs)
}

export function dismissToast(id: number): void {
  toasts.update((list) => list.filter((t) => t.id !== id))
}
