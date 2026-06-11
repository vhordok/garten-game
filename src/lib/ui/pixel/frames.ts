// Programmatic 9-slice frames for panels, buttons and chips. Drawn with
// axis-aligned fillRects (no anti-aliasing), used via CSS border-image.
// Corner pixels are cut for the classic rounded-pixel silhouette.

import { COLORS, type ColorName } from './palette'

export type FrameKind = 'panel' | 'btn' | 'btn-primary' | 'btn-gold' | 'btn-danger' | 'chip'

/** border-image-slice per frame (source pixels). */
export const FRAME_SLICE: Record<FrameKind, number> = {
  panel: 6,
  btn: 4,
  'btn-primary': 4,
  'btn-gold': 4,
  'btn-danger': 4,
  chip: 3,
}

interface ButtonColors {
  fill: ColorName
  hi: ColorName
  ledge: ColorName
}

const BUTTON_COLORS: Record<string, ButtonColors> = {
  btn: { fill: 'edge', hi: 'slate', ledge: 'night1' },
  'btn-primary': { fill: 'leaf2', hi: 'leaf3', ledge: 'leaf1' },
  'btn-gold': { fill: 'gold1', hi: 'gold2', ledge: 'gold0' },
  'btn-danger': { fill: 'red1', hi: 'red1', ledge: 'red0' },
}

export function frameCanvas(kind: FrameKind): HTMLCanvasElement {
  return kind === 'panel' ? panelFrame() : kind === 'chip' ? chipFrame() : buttonFrame(kind)
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  return [canvas, ctx]
}

function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: ColorName) {
  ctx.fillStyle = COLORS[c]
  ctx.fillRect(x, y, w, h)
}

/** 1px outline with cut corners (corners stay transparent). */
function outline(ctx: CanvasRenderingContext2D, size: number, c: ColorName) {
  fill(ctx, 1, 0, size - 2, 1, c)
  fill(ctx, 1, size - 1, size - 2, 1, c)
  fill(ctx, 0, 1, 1, size - 2, c)
  fill(ctx, size - 1, 1, 1, size - 2, c)
}

/** 18×18, slice 6 — dark panel with bevel. */
function panelFrame(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(18)
  outline(ctx, 18, 'night0')
  fill(ctx, 1, 1, 16, 16, 'edge')
  fill(ctx, 2, 2, 14, 1, 'slate') // top bevel highlight
  fill(ctx, 2, 2, 1, 14, 'slate')
  fill(ctx, 2, 15, 14, 1, 'night1') // bottom bevel shadow
  fill(ctx, 15, 2, 1, 14, 'night1')
  fill(ctx, 3, 3, 12, 12, 'panel')
  return canvas
}

/** 12×12, slice 4 — chunky arcade button with bottom ledge. */
function buttonFrame(kind: FrameKind): HTMLCanvasElement {
  const { fill: fillColor, hi, ledge } = BUTTON_COLORS[kind]
  const [canvas, ctx] = makeCanvas(12)
  outline(ctx, 12, 'night0')
  fill(ctx, 1, 1, 10, 10, fillColor)
  fill(ctx, 1, 1, 10, 1, hi)
  fill(ctx, 1, 9, 10, 2, ledge)
  return canvas
}

/** 10×10, slice 3 — flat dark chip (HUD readouts). */
function chipFrame(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(10)
  outline(ctx, 10, 'edge')
  fill(ctx, 1, 1, 8, 8, 'night1')
  return canvas
}

/** Sparse starfield tile (96×96) for the night sky, deterministic. */
export function starsCanvas(): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(96)
  const stars: Array<[number, number, ColorName]> = [
    [7, 12, 'cloud'], [23, 4, 'steel'], [40, 18, 'mist'], [58, 9, 'cloud'],
    [74, 30, 'steel'], [12, 44, 'mist'], [33, 57, 'cloud'], [50, 40, 'steel'],
    [68, 62, 'mist'], [85, 50, 'cloud'], [20, 78, 'steel'], [45, 85, 'mist'],
    [70, 80, 'cloud'], [88, 15, 'mist'], [5, 65, 'steel'], [60, 75, 'steel'],
  ]
  for (const [x, y, c] of stars) fill(ctx, x, y, 1, 1, c)
  // one bigger plus-shaped star
  fill(ctx, 30, 29, 1, 3, 'gold2')
  fill(ctx, 29, 30, 3, 1, 'gold2')
  return canvas
}
