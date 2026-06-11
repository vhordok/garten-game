// Placeholder sound hooks (GAME_DESIGN.md §9.5): tiny WebAudio synth blips
// behind a stable playSound() API — real samples can replace the presets
// later without touching call sites. Preference persists outside the save.

export type SoundId = 'sow' | 'harvest' | 'sell' | 'buy' | 'click' | 'error' | 'unlock'

const PREF_KEY = 'garten-imperium-sound'

let enabled = readPref()
let ctx: AudioContext | null = null

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off'
  } catch {
    return true
  }
}

export function soundEnabled(): boolean {
  return enabled
}

export function setSoundEnabled(value: boolean): void {
  enabled = value
  try {
    localStorage.setItem(PREF_KEY, value ? 'on' : 'off')
  } catch {
    /* ignore */
  }
}

function audioContext(): AudioContext | null {
  if (ctx) return ctx
  try {
    ctx = new AudioContext()
  } catch {
    ctx = null
  }
  return ctx
}

/** One synth blip: frequency glides from→to over the duration. */
function blip(
  from: number,
  to: number,
  durationMs: number,
  type: OscillatorType = 'square',
  volume = 0.12,
  delayMs = 0
): void {
  const ac = audioContext()
  if (!ac) return
  const t0 = ac.currentTime + delayMs / 1000
  const t1 = t0 + durationMs / 1000
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t0)
  osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t1)
  gain.gain.setValueAtTime(volume, t0)
  gain.gain.exponentialRampToValueAtTime(0.001, t1)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t1)
}

/** Fire-and-forget sound effect. Call from user-gesture handlers. */
export function playSound(id: SoundId): void {
  if (!enabled) return
  switch (id) {
    case 'sow':
      blip(240, 170, 90, 'square', 0.08)
      break
    case 'harvest':
      blip(520, 660, 70, 'square', 0.1)
      blip(700, 920, 80, 'square', 0.08, 60)
      break
    case 'sell':
      blip(880, 1320, 90, 'triangle', 0.14)
      blip(1100, 1760, 110, 'triangle', 0.1, 70)
      break
    case 'buy':
      blip(300, 420, 120, 'square', 0.1)
      blip(420, 560, 110, 'square', 0.09, 100)
      break
    case 'click':
      blip(720, 680, 35, 'square', 0.05)
      break
    case 'error':
      blip(140, 90, 130, 'sawtooth', 0.08)
      break
    case 'unlock':
      blip(523, 523, 80, 'square', 0.1)
      blip(659, 659, 80, 'square', 0.1, 90)
      blip(784, 784, 130, 'square', 0.11, 180)
      break
  }
}
