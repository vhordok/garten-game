import { CONFIG } from '../data/config'
import { getState, notify } from './state'
import { tick } from './tick'

let rafId = 0
let lastTime = 0
let running = false

export function startLoop(): void {
  if (running) return
  running = true
  lastTime = performance.now()
  rafId = requestAnimationFrame(frame)
}

function frame(now: number): void {
  // rAF pauses in background tabs; the large delta on return advances growth
  // just like offline progress does. Clamp to the same offline cap.
  const dtSeconds = Math.min((now - lastTime) / 1000, CONFIG.offlineCapHours * 3600)
  lastTime = now
  if (tick(getState(), dtSeconds)) notify()
  rafId = requestAnimationFrame(frame)
}

export function stopLoop(): void {
  running = false
  cancelAnimationFrame(rafId)
}
