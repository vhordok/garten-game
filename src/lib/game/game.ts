// Boot orchestration: load save → offline catch-up → start loop & autosave.

import { CONFIG } from '../data/config'
import { startLoop } from './loop'
import { applyOfflineProgress, type OfflineReport } from './offline'
import { loadFromStorage, save } from './save'

export function initGame(): { offline: OfflineReport | null } {
  const savedAt = loadFromStorage()
  const offline = savedAt !== null ? applyOfflineProgress(savedAt) : null
  // Persist the caught-up state right away so a quick reload doesn't replay it.
  save()

  startLoop()

  setInterval(() => save(), CONFIG.autosaveSeconds * 1000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save()
  })
  window.addEventListener('pagehide', () => save())

  return { offline }
}
