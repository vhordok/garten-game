// Pixel particle system: square particles in palette colors, hard pool cap,
// zero allocations per frame beyond spawning. FxLayer.svelte drives
// update/render; gameplay code only calls the spawn helpers.

import { COLORS, type ColorName } from '../pixel/palette'
import { reducedMotion } from './shake'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  /** remaining life in seconds */
  life: number
  ttl: number
  size: number
  color: string
  gravity: number
}

const MAX_PARTICLES = 320
const particles: Particle[] = []

export interface BurstOptions {
  colors: ColorName[]
  count?: number
  /** base speed in px/s */
  speed?: number
  gravity?: number
  /** initial upward kick in px/s (negative vy) */
  lift?: number
  sizeMin?: number
  sizeMax?: number
  ttl?: number
}

export function burst(x: number, y: number, opts: BurstOptions): void {
  if (reducedMotion()) return
  const {
    colors,
    count = 12,
    speed = 130,
    gravity = 420,
    lift = 110,
    sizeMin = 2,
    sizeMax = 5,
    ttl = 0.8,
  } = opts
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break
    const angle = Math.random() * Math.PI * 2
    const v = speed * (0.4 + Math.random() * 0.9)
    const life = ttl * (0.6 + Math.random() * 0.6)
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - lift,
      life,
      ttl: life,
      size: Math.round(sizeMin + Math.random() * (sizeMax - sizeMin)),
      color: COLORS[colors[Math.floor(Math.random() * colors.length)]],
      gravity,
    })
  }
}

/** Gold coins/sparks — harvests and sales. */
export function coinBurst(x: number, y: number, count = 12): void {
  burst(x, y, { colors: ['gold0', 'gold1', 'gold2'], count })
}

/** Green leaves — sowing and growth. */
export function leafBurst(x: number, y: number, count = 10): void {
  burst(x, y, { colors: ['leaf2', 'leaf3', 'leaf4'], count, speed: 90, gravity: 260, lift: 70, ttl: 0.7 })
}

export function update(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= dt
    if (p.life <= 0) {
      // swap-remove keeps this O(1)
      particles[i] = particles[particles.length - 1]
      particles.pop()
      continue
    }
    p.vy += p.gravity * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
}

export function render(ctx: CanvasRenderingContext2D): void {
  for (const p of particles) {
    const fade = p.life / p.ttl
    ctx.globalAlpha = fade < 0.35 ? fade / 0.35 : 1
    ctx.fillStyle = p.color
    // snap to whole pixels — keeps the particles on the pixel grid
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size)
  }
  ctx.globalAlpha = 1
}

export function hasParticles(): boolean {
  return particles.length > 0
}
