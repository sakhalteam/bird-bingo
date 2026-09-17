/**
 * Render Bird Bingo's app icons to PNG with no image dependencies.
 *
 * The mark is a bird mid-call: a glowing body, a violet wing, an amber beak and
 * two sound arcs leaving it. It is drawn in the same idiom as its sibling apps
 * (adhdo, traction) — near-black nebula, soft-edged shapes, haloes that fall off
 * as the square of the distance — so the three read as a set on a home screen.
 * The cyan and violet are the app's own, straight out of `.gradient-bg`.
 *
 * Everything is drawn inside the middle ~64% of the canvas so the same art is
 * safe as a `maskable` icon, where Android may crop to a circle of 80% diameter.
 *
 * Run: node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// ---- PNG encoding --------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** RGBA bytes → a PNG buffer (8-bit truecolour+alpha, no interlace). */
function encodePNG(width, height, rgba) {
  const stride = width * 4
  // Each scanline is prefixed with its filter byte; 0 = None.
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---- Drawing -------------------------------------------------------------

/* The background is adhdo's to the byte; the cyan and violet are Bird Bingo's
 * own, and happen to be the same pair — these apps were always a family. */
const BG = [0x0a, 0x0a, 0x1a]
const CYAN = [0x22, 0xd3, 0xee]
const VIOLET = [0xa7, 0x8b, 0xfa]
const AMBER = [0xfb, 0xbf, 0x24]
const WHITE = [0xff, 0xff, 0xff]

const lerp = (a, b, t) => a + (b - a) * t
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const clamp01 = v => Math.max(0, Math.min(1, v))

/**
 * Paint one shape the way adhdo paints a glob: a halo that falls off as the
 * square of the distance, then a core with a soft edge rather than a hard one.
 * `d` is a signed distance — negative inside the shape, in canvas units.
 */
function paint(c, d, color, { soft, glow, glowStrength = 0.4 }) {
  let out = c
  if (d < glow) {
    const halo = 1 - Math.max(0, d) / glow
    out = mix(out, color, halo * halo * glowStrength)
  }
  const edge = clamp01(-d / soft)
  if (edge > 0) out = mix(out, color, edge)
  return out
}

/** Signed distance to a rotated ellipse. Approximate, which a glow forgives. */
function sdEllipse(u, v, cx, cy, rx, ry, rot) {
  const cos = Math.cos(-rot)
  const sin = Math.sin(-rot)
  const dx = u - cx
  const dy = v - cy
  const lx = dx * cos - dy * sin
  const ly = dx * sin + dy * cos
  const k = Math.hypot(lx / rx, ly / ry)
  return (k - 1) * Math.min(rx, ry)
}

/**
 * Signed distance to a segment thickened by `half` — a capsule. When `half` is
 * a pair it tapers from the first value to the second along the segment, which
 * is what turns the tail from a nub into a swept tail.
 */
function sdCapsule(u, v, ax, ay, bx, by, half) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : clamp01(((u - ax) * dx + (v - ay) * dy) / len2)
  const w = Array.isArray(half) ? lerp(half[0], half[1], t) : half
  return Math.hypot(u - (ax + t * dx), v - (ay + t * dy)) - w
}

/** Unsigned distance to a triangle, negated inside it — the beak. */
function sdTriangle(u, v, p) {
  let d = Infinity
  let inside = true
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = p[i]
    const [bx, by] = p[(i + 1) % 3]
    d = Math.min(d, sdCapsule(u, v, ax, ay, bx, by, 0))
    // Consistent winding means every cross product shares a sign inside.
    if ((bx - ax) * (v - ay) - (by - ay) * (u - ax) < 0) inside = false
  }
  return inside ? -d : d
}

/** Signed distance to an arc band with rounded caps — one ring of sound. */
function sdArc(u, v, cx, cy, r, span, half) {
  const dx = u - cx
  const dy = v - cy
  const ang = Math.atan2(dy, dx)
  if (Math.abs(ang) <= span) return Math.abs(Math.hypot(dx, dy) - r) - half
  const ex = cx + Math.cos(span) * r
  const ey = cy + Math.sin(span) * r
  return Math.min(Math.hypot(u - ex, v - ey), Math.hypot(u - ex, v - (2 * cy - ey))) - half
}

/* Bird geometry, laid out at S = 1 and scaled about the centre. A bird is a
 * wide mark where adhdo's globs are a compact one, so at the same footprint it
 * reads lighter than its siblings on a home screen — S buys that weight back.
 * The reach of the finished art is checked for real at the bottom of this file. */
const S = 1.1
const px = x => 0.5 + (x - 0.5) * S
const py = y => 0.5 + (y - 0.5) * S
const pr = r => r * S

const BODY = { cx: px(0.415), cy: py(0.570), rx: pr(0.150), ry: pr(0.112), rot: -0.28 }
const TAIL = { ax: px(0.372), ay: py(0.612), bx: px(0.250), by: py(0.668), half: [pr(0.058), pr(0.017)] }
const HEAD = { cx: px(0.530), cy: py(0.430), r: pr(0.080) }
const BEAK = [[px(0.592), py(0.406)], [px(0.674), py(0.437)], [px(0.592), py(0.468)]]
const WING = { cx: px(0.425), cy: py(0.560), rx: pr(0.086), ry: pr(0.043), rot: -0.38 }
const CALL = { cx: px(0.678), cy: py(0.437), span: 0.72 }
const ARCS = [[pr(0.056), 0.5], [pr(0.090), 0.38]]
const ARC_HALF = pr(0.015)
const EYE = { cx: px(0.562), cy: py(0.414), r: pr(0.017) }

/** The nebula alone, with no bird on it — also the reference the safe-zone
 *  check below measures the mark against. */
function background(u, v) {
  // The same two washes `.gradient-bg` paints behind the board.
  const washA = Math.max(0, 1 - Math.hypot((u - 0.2) / 0.9, (v - 0.0) / 0.55))
  const washB = Math.max(0, 1 - Math.hypot((u - 0.9) / 0.85, (v - 1.0) / 0.55))
  return mix(mix(BG, CYAN, washA * washA * 0.17), VIOLET, washB * washB * 0.2)
}

/** Colour of the icon at a point, in canvas-relative units (0..1 both axes). */
function sample(u, v) {
  let c = background(u, v)

  // Sound first, behind the bird, so the beak sits on top of the near arc.
  for (const [r, strength] of ARCS) {
    const d = sdArc(u, v, CALL.cx, CALL.cy, r, CALL.span, ARC_HALF)
    c = paint(c, d, VIOLET, { soft: 0.014, glow: 0.05, glowStrength: 0.3 * strength })
  }

  // Tail, then body, then head — back to front, so each caps the last.
  c = paint(c, sdCapsule(u, v, TAIL.ax, TAIL.ay, TAIL.bx, TAIL.by, TAIL.half), CYAN,
    { soft: 0.022, glow: 0.07, glowStrength: 0.3 })
  c = paint(c, sdEllipse(u, v, BODY.cx, BODY.cy, BODY.rx, BODY.ry, BODY.rot), CYAN,
    { soft: 0.026, glow: 0.085, glowStrength: 0.34 })
  c = paint(c, sdTriangle(u, v, BEAK), AMBER,
    { soft: 0.014, glow: 0.05, glowStrength: 0.34 })
  c = paint(c, Math.hypot(u - HEAD.cx, v - HEAD.cy) - HEAD.r, CYAN,
    { soft: 0.024, glow: 0.08, glowStrength: 0.34 })

  // Wing over the body, and the highlight adhdo gives every glob: up and left.
  c = paint(c, sdEllipse(u, v, WING.cx, WING.cy, WING.rx, WING.ry, WING.rot), VIOLET,
    { soft: 0.016, glow: 0.045, glowStrength: 0.26 })
  const hi = Math.hypot(u - (HEAD.cx - HEAD.r * 0.3), v - (HEAD.cy - HEAD.r * 0.34))
  if (hi < HEAD.r * 0.6) c = mix(c, WHITE, (1 - hi / (HEAD.r * 0.6)) * 0.3)

  // Eye. Dark rather than white — a pale dot on a pale head disappears.
  const eye = Math.hypot(u - EYE.cx, v - EYE.cy) - EYE.r
  c = paint(c, eye, BG, { soft: 0.009, glow: 0.014, glowStrength: 0.3 })

  return c
}

/** Render at 4× and box-filter down, so every edge lands antialiased. */
function render(size) {
  const SS = 4
  const rgba = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const n = SS * SS
      const i = (y * size + x) * 4
      rgba[i] = Math.round(clamp01(r / n / 255) * 255)
      rgba[i + 1] = Math.round(clamp01(g / n / 255) * 255)
      rgba[i + 2] = Math.round(clamp01(b / n / 255) * 255)
      rgba[i + 3] = 255
    }
  }
  return encodePNG(size, size, rgba)
}

/**
 * Maskable safe zone, measured rather than trusted. Android may crop a
 * `maskable` icon to a circle of 80% diameter — radius 0.40 from the centre —
 * so this walks a fine polar grid and finds how far the mark actually reaches
 * over the bare nebula. Two bounds, because a clipped halo and a clipped tail
 * are not the same failure: the solid art has to sit clear of the crop, while
 * the faint outer glow only has to stay inside it.
 *
 * Geometry drifts the moment someone nudges a constant. This is what catches it.
 */
const BOUNDS = [
  { name: 'core', threshold: 120, limit: 0.35 },
  { name: 'glow', threshold: 8, limit: 0.4 },
]

function reach(threshold) {
  let worst = 0
  let at = null
  for (let i = 0; i < 2048; i++) {
    const ang = (i / 2048) * Math.PI * 2
    for (let r = 0.46; r > 0; r -= 0.0015) {
      const u = 0.5 + Math.cos(ang) * r
      const v = 0.5 + Math.sin(ang) * r
      if (u < 0 || u > 1 || v < 0 || v > 1) continue
      const a = sample(u, v)
      const b = background(u, v)
      const delta = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))
      if (delta > threshold) {
        if (r > worst) {
          worst = r
          at = `${u.toFixed(3)}, ${v.toFixed(3)}`
        }
        break
      }
    }
  }
  return { worst, at }
}

for (const { name, threshold, limit } of BOUNDS) {
  const { worst, at } = reach(threshold)
  if (worst > limit) {
    throw new Error(`${name} reaches ${worst.toFixed(3)} from centre at (${at}), past ${limit}`)
  }
  console.log(`safe zone ok — ${name} reaches ${worst.toFixed(3)} of ${limit}`)
}

mkdirSync(OUT, { recursive: true })
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
]) {
  writeFileSync(join(OUT, name), render(size))
  console.log(`wrote public/${name} (${size}x${size})`)
}
