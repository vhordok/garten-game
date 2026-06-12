// Procedural sound design on WebAudio: every effect is synthesized in code
// (no audio assets, GAME_DESIGN.md §9.5) behind the stable playSound() API.
// A master compressor keeps overlapping bursts civilized, per-id throttles
// stop spam (16 plots ripening at once = one pling), and slight random
// detune keeps repeated sounds organic. Preference persists outside the save.

export type SoundId =
  | 'sow'
  | 'harvest'
  | 'sell'
  | 'buy'
  | 'click'
  | 'error'
  | 'unlock'
  | 'perfect'
  | 'legendary'
  | 'levelup'
  | 'water'
  | 'ripe'
  | 'ticket'
  | 'scratch'
  | 'open'
  | 'close'
  | 'welcome'

const PREF_KEY = 'garten-imperium-sound'
const MUSIC_KEY = 'garten-imperium-music'
const AMBIENCE_KEY = 'garten-imperium-ambience'

/** minimum ms between two plays of the same id */
const THROTTLE: Partial<Record<SoundId, number>> = {
  ripe: 350,
  click: 35,
  scratch: 35,
  harvest: 25,
  water: 50,
}

let enabled = readPref()
let musicEnabled = readToggle(MUSIC_KEY)
let ambienceEnabled = readToggle(AMBIENCE_KEY)
let atmosphereStarted = false
let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
const lastPlayed = new Map<SoundId, number>()

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off'
  } catch {
    return true
  }
}

function readToggle(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'off'
  } catch {
    return true
  }
}

function writeToggle(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? 'on' : 'off')
  } catch {
    /* ignore */
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

function audio(): { ctx: AudioContext; master: GainNode } | null {
  if (!ctx) {
    try {
      ctx = new AudioContext()
    } catch {
      return null
    }
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.knee.value = 24
    compressor.ratio.value = 6
    master = ctx.createGain()
    master.gain.value = 0.6
    master.connect(compressor)
    compressor.connect(ctx.destination)
  }
  // browsers start contexts suspended until a user gesture
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return master ? { ctx, master } : null
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

interface ToneOpts {
  from: number
  to?: number
  /** start delay in ms */
  at?: number
  dur: number
  type?: OscillatorType
  vol?: number
}

/** One enveloped oscillator gliding from→to. */
function tone(o: ToneOpts, pitch = 1): void {
  const a = audio()
  if (!a) return
  const t0 = a.ctx.currentTime + (o.at ?? 0) / 1000
  const t1 = t0 + o.dur / 1000
  const drift = 1 + (Math.random() - 0.5) * 0.03
  const osc = a.ctx.createOscillator()
  const gain = a.ctx.createGain()
  osc.type = o.type ?? 'square'
  osc.frequency.setValueAtTime(Math.max(o.from * pitch * drift, 1), t0)
  osc.frequency.exponentialRampToValueAtTime(Math.max((o.to ?? o.from) * pitch * drift, 1), t1)
  gain.gain.setValueAtTime(o.vol ?? 0.08, t0)
  gain.gain.exponentialRampToValueAtTime(0.001, t1)
  osc.connect(gain)
  gain.connect(a.master)
  osc.start(t0)
  osc.stop(t1)
}

interface NoiseOpts {
  at?: number
  dur: number
  vol?: number
  /** band/lowpass center frequency */
  freq?: number
  q?: number
  type?: BiquadFilterType
}

/** Filtered white-noise burst (splashes, rustles, foil scratches). */
function noise(o: NoiseOpts): void {
  const a = audio()
  if (!a) return
  const t0 = a.ctx.currentTime + (o.at ?? 0) / 1000
  const t1 = t0 + o.dur / 1000
  const src = a.ctx.createBufferSource()
  src.buffer = noiseBuffer(a.ctx)
  const filter = a.ctx.createBiquadFilter()
  filter.type = o.type ?? 'bandpass'
  filter.frequency.value = o.freq ?? 2000
  filter.Q.value = o.q ?? 0.9
  const gain = a.ctx.createGain()
  gain.gain.setValueAtTime(o.vol ?? 0.1, t0)
  gain.gain.exponentialRampToValueAtTime(0.001, t1)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(a.master)
  src.start(t0, Math.random() * 0.4)
  src.stop(t1)
}

/**
 * Fire-and-forget sound effect. `pitch` scales all frequencies — harvest
 * calls pass a rising factor with the combo chain.
 */
export function playSound(id: SoundId, pitch = 1): void {
  if (!enabled) return
  const minGap = THROTTLE[id]
  if (minGap) {
    const now = performance.now()
    if (now - (lastPlayed.get(id) ?? -1e9) < minGap) return
    lastPlayed.set(id, now)
  }

  switch (id) {
    case 'click':
      tone({ from: 800, to: 740, dur: 30, vol: 0.045 })
      break
    case 'open':
      tone({ from: 330, to: 540, dur: 80, type: 'triangle', vol: 0.07 })
      tone({ from: 1080, dur: 35, at: 60, type: 'triangle', vol: 0.035 })
      break
    case 'close':
      tone({ from: 540, to: 310, dur: 90, type: 'triangle', vol: 0.06 })
      break
    case 'sow':
      noise({ dur: 90, freq: 750, type: 'lowpass', vol: 0.16 })
      tone({ from: 210, to: 150, dur: 80, vol: 0.05 })
      break
    case 'water':
      noise({ dur: 130, freq: 1700, q: 0.7, vol: 0.16 })
      tone({ from: 520, to: 260, dur: 90, type: 'sine', vol: 0.08 })
      tone({ from: 880, to: 1420, dur: 45, at: 85, type: 'sine', vol: 0.05 })
      break
    case 'ripe':
      tone({ from: 659, dur: 100, type: 'triangle', vol: 0.06 })
      tone({ from: 988, dur: 130, at: 80, type: 'triangle', vol: 0.045 })
      break
    case 'harvest':
      tone({ from: 420, to: 580, dur: 55, vol: 0.09 }, pitch)
      tone({ from: 960, to: 1260, dur: 70, at: 45, type: 'triangle', vol: 0.07 }, pitch)
      break
    case 'sell':
      tone({ from: 740, dur: 60, type: 'triangle', vol: 0.11 })
      tone({ from: 1108, dur: 70, at: 70, type: 'triangle', vol: 0.1 })
      noise({ dur: 35, at: 70, freq: 5200, q: 2, vol: 0.04 })
      tone({ from: 1480, dur: 80, at: 145, type: 'triangle', vol: 0.05 })
      break
    case 'buy':
      tone({ from: 230, to: 320, dur: 90, vol: 0.1 })
      tone({ from: 480, dur: 80, at: 95, vol: 0.08 })
      break
    case 'error':
      tone({ from: 130, to: 85, dur: 160, type: 'sawtooth', vol: 0.07 })
      tone({ from: 62, dur: 110, vol: 0.04 })
      break
    case 'unlock':
      tone({ from: 523, dur: 75, vol: 0.08 })
      tone({ from: 659, dur: 75, at: 85, vol: 0.08 })
      tone({ from: 784, dur: 90, at: 170, vol: 0.09 })
      tone({ from: 1046, dur: 160, at: 260, type: 'triangle', vol: 0.08 })
      break
    case 'perfect':
      tone({ from: 700, to: 1400, dur: 130, type: 'triangle', vol: 0.1 })
      tone({ from: 1760, dur: 70, at: 110, type: 'triangle', vol: 0.07 })
      noise({ dur: 60, at: 100, freq: 6500, q: 2.5, vol: 0.03 })
      break
    case 'legendary':
      tone({ from: 220, to: 880, dur: 260, type: 'sawtooth', vol: 0.06 })
      tone({ from: 440, dur: 190, at: 250, vol: 0.11 })
      tone({ from: 660, dur: 190, at: 250, vol: 0.09 })
      tone({ from: 1760, to: 2350, dur: 220, at: 270, type: 'triangle', vol: 0.06 })
      break
    case 'levelup':
      tone({ from: 392, dur: 90, vol: 0.1 })
      tone({ from: 523, dur: 90, at: 110, vol: 0.1 })
      tone({ from: 659, dur: 90, at: 220, vol: 0.1 })
      tone({ from: 784, to: 1046, dur: 320, at: 330, type: 'triangle', vol: 0.12 })
      noise({ dur: 220, at: 330, freq: 7000, q: 1.2, vol: 0.025 })
      break
    case 'ticket':
      tone({ from: 1046, dur: 60, type: 'triangle', vol: 0.08 })
      tone({ from: 1318, dur: 60, at: 65, type: 'triangle', vol: 0.08 })
      tone({ from: 1568, dur: 70, at: 130, type: 'triangle', vol: 0.08 })
      tone({ from: 2093, dur: 110, at: 200, type: 'triangle', vol: 0.06 })
      break
    case 'scratch':
      noise({ dur: 50, freq: 2600, q: 0.8, vol: 0.1 })
      break
    case 'welcome':
      tone({ from: 392, dur: 130, type: 'triangle', vol: 0.07 })
      tone({ from: 494, dur: 130, at: 140, type: 'triangle', vol: 0.07 })
      tone({ from: 587, dur: 200, at: 280, type: 'triangle', vol: 0.08 })
      break
  }
}


// --- Atmosphere: generative night music + ambience (no audio assets) -----

let windGain: GainNode | null = null
let windSource: AudioBufferSourceNode | null = null
let cricketTimer: ReturnType<typeof setTimeout> | null = null
let musicTimer: ReturnType<typeof setTimeout> | null = null

export function musicOn(): boolean {
  return musicEnabled
}

export function ambienceOn(): boolean {
  return ambienceEnabled
}

export function setMusicEnabled(value: boolean): void {
  musicEnabled = value
  writeToggle(MUSIC_KEY, value)
  if (value) startMusic()
  else stopMusic()
}

export function setAmbienceEnabled(value: boolean): void {
  ambienceEnabled = value
  writeToggle(AMBIENCE_KEY, value)
  if (value) startAmbience()
  else stopAmbience()
}

/** Call once after the first user gesture — browsers gate audio until then. */
export function startAtmosphere(): void {
  if (atmosphereStarted) return
  atmosphereStarted = true
  if (ambienceEnabled) startAmbience()
  if (musicEnabled) startMusic()
}

function startAmbience(): void {
  const a = audio()
  if (!a || windSource) return
  // soft night wind: looped noise through a deep lowpass, slowly breathing
  windSource = a.ctx.createBufferSource()
  windSource.buffer = noiseBuffer(a.ctx)
  windSource.loop = true
  const filter = a.ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 280
  windGain = a.ctx.createGain()
  windGain.gain.value = 0.014
  const lfo = a.ctx.createOscillator()
  lfo.frequency.value = 0.06
  const lfoGain = a.ctx.createGain()
  lfoGain.gain.value = 0.007
  lfo.connect(lfoGain)
  lfoGain.connect(windGain.gain)
  windSource.connect(filter)
  filter.connect(windGain)
  windGain.connect(a.master)
  windSource.start()
  lfo.start()
  scheduleCricket()
}

function scheduleCricket(): void {
  if (!ambienceEnabled) return
  cricketTimer = setTimeout(() => {
    if (ambienceEnabled && enabledContextRunning()) {
      const chirps = 2 + Math.floor(Math.random() * 3)
      const base = 3800 + Math.random() * 900
      for (let i = 0; i < chirps; i++) {
        tone({ from: base, to: base * 0.97, at: i * 70, dur: 28, type: 'sine', vol: 0.012 })
      }
    }
    scheduleCricket()
  }, 1500 + Math.random() * 4500)
}

function stopAmbience(): void {
  if (cricketTimer) clearTimeout(cricketTimer)
  cricketTimer = null
  try {
    windSource?.stop()
  } catch {
    /* already stopped */
  }
  windSource = null
  windGain = null
}

function enabledContextRunning(): boolean {
  return ctx !== null && ctx.state === 'running'
}

// A-minor pentatonic, two octaves — every walk sounds gentle
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33]
let melodyIndex = 3
let musicBeat = 0

function startMusic(): void {
  if (musicTimer) return
  scheduleMusicStep()
}

function scheduleMusicStep(): void {
  if (!musicEnabled) return
  musicTimer = setTimeout(() => {
    if (musicEnabled && enabledContextRunning()) {
      // melody: small random walk over the pentatonic scale
      const step = Math.floor(Math.random() * 5) - 2
      melodyIndex = Math.min(Math.max(melodyIndex + step, 0), SCALE.length - 1)
      if (Math.random() > 0.22) {
        tone({ from: SCALE[melodyIndex], dur: 700, type: 'triangle', vol: 0.028 })
      }
      // soft bass root every fourth beat
      if (musicBeat % 4 === 0) {
        tone({ from: 110, dur: 1500, type: 'sine', vol: 0.03 })
      } else if (musicBeat % 4 === 2 && Math.random() > 0.5) {
        tone({ from: 164.81, dur: 1200, type: 'sine', vol: 0.022 })
      }
      musicBeat += 1
    }
    musicTimer = null
    scheduleMusicStep()
  }, 1100 + Math.random() * 350)
}

function stopMusic(): void {
  if (musicTimer) clearTimeout(musicTimer)
  musicTimer = null
}
