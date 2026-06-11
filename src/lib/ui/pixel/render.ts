// Renders sprite grids and frames to data-URLs (cached) and injects every
// color/asset as a CSS variable at boot — the one bridge between the pixel
// definitions and the stylesheet world.

import { FRAME_SLICE, frameCanvas, starsCanvas, type FrameKind } from './frames'
import { COLORS, LEGEND } from './palette'
import { SPRITES, type SpriteGrid } from './sprites'

const urlCache = new Map<string, string>()

function renderGrid(grid: SpriteGrid): HTMLCanvasElement {
  const height = grid.length
  const width = grid[0].length
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  grid.forEach((row, y) => {
    if (row.length !== width) throw new Error(`sprite row ${y} has length ${row.length}, expected ${width}`)
    for (let x = 0; x < width; x++) {
      const ch = row[x]
      if (ch === '.') continue
      const color = LEGEND[ch]
      if (!color) throw new Error(`unknown sprite char '${ch}'`)
      ctx.fillStyle = COLORS[color]
      ctx.fillRect(x, y, 1, 1)
    }
  })
  return canvas
}

/** Data-URL of a named sprite (rendered once, then cached). */
export function spriteUrl(name: string): string {
  let url = urlCache.get(name)
  if (!url) {
    const grid = SPRITES[name]
    if (!grid) throw new Error(`unknown sprite '${name}'`)
    url = renderGrid(grid).toDataURL()
    urlCache.set(name, url)
  }
  return url
}

/** Source pixel size of a named sprite. */
export function spriteSize(name: string): { w: number; h: number } {
  const grid = SPRITES[name]
  if (!grid) throw new Error(`unknown sprite '${name}'`)
  return { w: grid[0].length, h: grid.length }
}

function frameUrl(kind: FrameKind): string {
  const key = `frame:${kind}`
  let url = urlCache.get(key)
  if (!url) {
    url = frameCanvas(kind).toDataURL()
    urlCache.set(key, url)
  }
  return url
}

/**
 * Inject palette colors (--c-<name>), frame border-images (--frame-<kind> +
 * --slice-<kind>) and scene tiles as CSS variables on :root. Call once
 * before mounting the app.
 */
export function initPixelUi(): void {
  const root = document.documentElement.style
  for (const [name, hex] of Object.entries(COLORS)) {
    root.setProperty(`--c-${name}`, hex)
  }
  const frames: FrameKind[] = ['panel', 'btn', 'btn-primary', 'btn-gold', 'btn-danger', 'chip']
  for (const kind of frames) {
    root.setProperty(`--frame-${kind}`, `url("${frameUrl(kind)}")`)
    root.setProperty(`--slice-${kind}`, String(FRAME_SLICE[kind]))
  }
  root.setProperty('--bg-stars', `url("${starsCanvas().toDataURL()}")`)
  for (const tile of ['hedge-near', 'hedge-far', 'soil', 'ghost-plot'] as const) {
    root.setProperty(`--sprite-${tile}`, `url("${spriteUrl(tile)}")`)
  }
}
