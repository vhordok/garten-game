// Sprite atlas (PHASE 24): renders every plant's mature sprite to a PNG so the
// pixel work can actually be eyeballed (no more blind editing). Run:
//   npx tsx scripts/sprite-atlas.mjs   → writes sprite-atlas.png + prints the grid order
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { PLANTS, SPECIAL_PLANTS } from '../src/lib/data/plants.ts'
import { SPRITES } from '../src/lib/ui/pixel/sprites.ts'
import { COLORS, LEGEND } from '../src/lib/ui/pixel/palette.ts'

const SCALE = 7
const CELL = 16 * SCALE
const PAD = 6
const COLS = 8
const BG = [16, 20, 31, 255] // night1

function hexRgba(hex) {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255]
}
const colorOf = (ch) => (ch === '.' || !LEGEND[ch] ? null : hexRgba(COLORS[LEGEND[ch]]))

// stage-3 (mature) sprite per plant, in list order (PLANTS then specials)
const all = [...PLANTS, ...SPECIAL_PLANTS]
const cells = all.map((p) => ({ id: p.id, name: p.name, cat: p.category, grid: SPRITES[`${p.id}-3`] }))

const rows = Math.ceil(cells.length / COLS)
const W = COLS * (CELL + PAD) + PAD
const H = rows * (CELL + PAD) + PAD
const px = Buffer.alloc(W * H * 4)
for (let i = 0; i < W * H; i++) px.set(BG, i * 4)

function blit(grid, ox, oy) {
  if (!grid) return
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const c = colorOf(grid[y][x])
      if (!c) continue
      for (let sy = 0; sy < SCALE; sy++) {
        for (let sx = 0; sx < SCALE; sx++) {
          const X = ox + x * SCALE + sx
          const Y = oy + y * SCALE + sy
          px.set(c, (Y * W + X) * 4)
        }
      }
    }
  }
}

cells.forEach((cell, i) => {
  const cx = i % COLS
  const cy = Math.floor(i / COLS)
  blit(cell.grid, PAD + cx * (CELL + PAD), PAD + cy * (CELL + PAD))
})

// ── minimal PNG encoder (RGBA, 8-bit, no interlace) ──
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td) >>> 0, 0)
  return Buffer.concat([len, td, crc])
}
const CRC_TABLE = (() => {
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
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
const raw = Buffer.alloc(H * (W * 4 + 1))
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0 // filter none
  px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4)
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync('sprite-atlas.png', png)

console.log(`\nSprite-Atlas → sprite-atlas.png (${W}×${H}, ${cells.length} Pflanzen, ${COLS} pro Reihe)\n`)
cells.forEach((c, i) => {
  const tag = c.grid ? '' : '  ⚠ KEIN Sprite'
  process.stdout.write(`${String(i).padStart(2)} ${c.name.padEnd(18)}${i % COLS === COLS - 1 ? '\n' : ''}${tag}`)
})
console.log('')
