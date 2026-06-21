// Scene preview (PHASE 50): composites the night-garden backdrop + landscaped
// decorations to a PNG, so the background look can be eyeballed without a browser.
// Mirrors the placement math in ui/Scene.svelte. Run: npx tsx scripts/scene-preview.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { DECORATIONS } from '../src/lib/data/decorations.ts'
import { SPRITES } from '../src/lib/ui/pixel/sprites.ts'
import { COLORS, LEGEND } from '../src/lib/ui/pixel/palette.ts'

const W = 1280
const H = 560
const px = Buffer.alloc(W * H * 4)

const rgb = (hex) => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const C = Object.fromEntries(Object.entries(COLORS).map(([k, v]) => [k, rgb(v)]))
function set(x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const i = (y * W + x) * 4
  const ia = a / 255
  px[i] = px[i] * (1 - ia) + r * ia
  px[i + 1] = px[i + 1] * (1 - ia) + g * ia
  px[i + 2] = px[i + 2] * (1 - ia) + b * ia
  px[i + 3] = 255
}
function band(y0, y1, color) {
  for (let y = Math.round(y0 * H); y < Math.round(y1 * H); y++) for (let x = 0; x < W; x++) set(x, y, color)
}

// sky bands (approx Scene.svelte)
band(0, 0.22, C.night0)
band(0.22, 0.44, C.sky0)
band(0.44, 0.56, C.sky1)
band(0.56, 0.70, C.sky0)
// ground
for (let y = Math.round(0.70 * H); y < H; y++) {
  const t = (y - 0.7 * H) / (0.3 * H)
  const col = t < 0.35 ? C.leaf0 : t < 0.7 ? [13, 22, 16] : C.night0
  for (let x = 0; x < W; x++) set(x, y, col)
}
// hedge line
band(0.62, 0.70, C.leaf0)

// ── placement (mirror of Scene.svelte) ──
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 11.7) * 43758.5453
  return x - Math.floor(x)
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const colorOf = (ch) => (ch === '.' || !LEGEND[ch] ? null : C[LEGEND[ch]])

// worst case the user hit: every decoration at max copies
const MAX = 6
const counts = DECORATIONS.map(() => MAX)
const items = []
for (let round = 0; round < MAX; round++) DECORATIONS.forEach((d, di) => round < counts[di] && items.push(d))
const n = items.length
const placed = items.map((d, i) => {
  const h1 = hash(i * 2 + 1)
  const h2 = hash(i * 2 + 5)
  const baseX = ((i + 0.5) / n) * 92 + 4
  const left = clamp(baseX + (h1 - 0.5) * 14, 1, 97)
  const top = 70 + h2 * 22
  const depth = (top - 70) / 22
  const size = Math.round(28 + depth * 40)
  return { sprite: d.sprite, left, top, size, depth, z: top }
})
placed.sort((a, b) => a.z - b.z) // far first

for (const p of placed) {
  const grid = SPRITES[p.sprite]
  if (!grid) continue
  const s = p.size / 16
  const ox = (p.left / 100) * W - p.size / 2 // translate -50%
  const oy = (p.top / 100) * H - p.size // translate -100%
  const a = Math.round((0.55 + p.depth * 0.45) * 255)
  for (let gy = 0; gy < 16; gy++)
    for (let gx = 0; gx < 16; gx++) {
      const col = colorOf(grid[gy][gx])
      if (!col) continue
      for (let sy = 0; sy < Math.ceil(s); sy++)
        for (let sx = 0; sx < Math.ceil(s); sx++) set(Math.round(ox + gx * s + sx), Math.round(oy + gy * s + sy), col, a)
    }
}

// ── PNG encode ──
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td) >>> 0, 0)
  return Buffer.concat([len, td, crc])
}
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8
ihdr[9] = 6
const raw = Buffer.alloc(H * (W * 4 + 1))
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0
  px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4)
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync('scene-preview.png', png)
console.log(`Scene-Preview → scene-preview.png (${W}×${H}, ${n} Deko-Objekte maxed)`)
