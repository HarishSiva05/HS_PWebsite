"use client"

import { memo } from "react"

// A dawn photograph drawn in SVG: layered ridges in haze, a still lake, a spruce point in the
// foreground. Everything is generated from fixed seeds, so every render (and the still frame) is
// identical. viewBox 0 0 400 300 (4:3, like an iPhone photo).

export const W = 400
export const H = 300
const HORIZON = 207
export const SUN = { x: 292, y: 174 }

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f = (n: number) => n.toFixed(1)

/** Smooth rolling ridge through points (Catmull-Rom), closed down to `floor`. */
function ridge(pts: [number, number][], floor: number) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return `${d}L${W} ${floor}L0 ${floor}Z`
}

/** A treeline: a ragged edge of small spruce tips riding on a base line, between x0 and x1. */
function treeline(
  seed: number,
  base: (x: number) => number,
  tip: [number, number],
  floor: number,
  x0 = 0,
  x1 = W,
) {
  const r = rng(seed)
  let d = `M${f(x0)} ${f(base(x0))}`
  let x = x0
  while (x < x1) {
    const w = Math.min(1.6 + r() * 2.6, x1 - x)
    const h = tip[0] + r() * (tip[1] - tip[0])
    d += `L${f(x + w / 2)} ${f(base(x + w / 2) - h)}L${f(x + w)} ${f(base(x + w))}`
    x += w
  }
  return `${d}L${f(x1)} ${floor}L${f(x0)} ${floor}Z`
}

/** A spruce silhouette: drooping tiers, narrow crown, a sliver of trunk. */
function spruce(x: number, foot: number, h: number, seed: number) {
  const r = rng(seed)
  const top = foot - h
  const tiers = Math.max(5, Math.round(h / 6.5))
  const s = (h * 0.9) / tiers
  const left: string[] = []
  const right: string[] = []
  for (let i = 1; i <= tiers; i++) {
    const k = i / tiers
    const y = top + k * h * 0.9
    const w = (0.05 + 0.2 * Math.pow(k, 0.8)) * h * (0.82 + r() * 0.36)
    const wr = w * (0.8 + r() * 0.4)
    left.push(`L${f(x - w * 0.3)} ${f(y - s * 0.55)}L${f(x - w)} ${f(y + s * 0.12)}`)
    right.unshift(`L${f(x + wr)} ${f(y + s * 0.12)}L${f(x + wr * 0.3)} ${f(y - s * 0.55)}`)
  }
  return `M${f(x)} ${f(top)}${left.join("")}L${f(x - 0.9)} ${f(foot)}L${f(x + 0.9)} ${f(foot)}${right.join("")}Z`
}

function glitter(seed: number) {
  const r = rng(seed)
  const out: { x: number; y: number; w: number; o: number }[] = []
  for (let y = HORIZON + 1.5; y < H; y += 1.6 + r() * 1.6) {
    const half = 5 + (y - HORIZON) * 0.36
    const n = 1 + Math.round(r() * 2)
    for (let j = 0; j < n; j++) {
      const off = (r() - 0.5) * 2 * half * Math.pow(r(), 0.6)
      out.push({
        x: SUN.x + off,
        y,
        w: 1.5 + r() * (4 + (y - HORIZON) * 0.08),
        o: Math.max(0.12, (1 - (y - HORIZON) / (H - HORIZON)) * (0.45 + r() * 0.55)),
      })
    }
  }
  return out
}

type Dash = { x: number; y: number; w: number; o: number }

/** Group dashes into opacity bands, one path per band, to keep the DOM light. */
function bands(dashes: Dash[], levels: number[], h: number, center = false) {
  return levels.map((level, i) => {
    const lo = i === 0 ? -Infinity : (levels[i - 1] + level) / 2
    const hi = i === levels.length - 1 ? Infinity : (level + levels[i + 1]) / 2
    const d = dashes
      .filter((g) => g.o > lo && g.o <= hi)
      .map((g) => `M${f(center ? g.x - g.w / 2 : g.x)} ${f(g.y)}h${f(g.w)}v${h}h${f(-g.w)}z`)
      .join("")
    return { o: level, d }
  })
}

// ---- precomputed geometry ----
const FAR = ridge(
  [
    [0, 171],
    [44, 164],
    [92, 168],
    [146, 156],
    [198, 165],
    [246, 160],
    [300, 170],
    [352, 158],
    [400, 166],
  ],
  HORIZON + 2,
)
const MID = ridge(
  [
    [0, 186],
    [52, 179],
    [110, 185],
    [168, 176],
    [226, 186],
    [282, 181],
    [338, 188],
    [400, 178],
  ],
  HORIZON + 2,
)
const NEAR = treeline(7, (x) => 199 + Math.sin(x / 47) * 2.2 + Math.sin(x / 13) * 0.8, [2.5, 7.5], HORIZON + 2)
const NEAR_REFLECT = treeline(7, (x) => 199 + Math.sin(x / 47) * 2.2 + Math.sin(x / 13) * 0.8, [2.5, 7.5], HORIZON)
const ISLAND_Y = 229
const ISLAND = treeline(
  21,
  (x) => ISLAND_Y - 0.5 - Math.sin(((x - 170) / 66) * Math.PI) * 3.2,
  [1.5, 9],
  ISLAND_Y + 1,
  170,
  236,
)
const ROCK =
  "M0 236C18 231 40 229 62 232C86 235 104 241 124 251C140 259 152 270 160 283C164 290 166 296 167 300L0 300Z"
const PINES = [
  spruce(30, 236, 206, 3),
  spruce(60, 234, 150, 5),
  spruce(9, 240, 128, 11),
  spruce(93, 238, 92, 17),
  spruce(118, 251, 58, 23),
  spruce(139, 262, 34, 29),
]
const GLITTER_LEVELS = [0.2, 0.4, 0.6, 0.85]
const GLITTER_A = bands(glitter(41), GLITTER_LEVELS, 0.9, true)
const GLITTER_B = bands(glitter(97), GLITTER_LEVELS, 0.9, true)

const RIPPLES = (() => {
  const r = rng(63)
  const out: Dash[] = []
  for (let i = 0; i < 46; i++) {
    const y = HORIZON + 4 + Math.pow(r(), 1.3) * (H - HORIZON - 6)
    out.push({ x: r() * W, y, w: 14 + r() * 50 + (y - HORIZON) * 0.5, o: 0.05 + r() * 0.09 })
  }
  return bands(out, [0.07, 0.11], 0.6)
})()

const CLOUDS = [
  { x: 96, y: 96, rx: 92, ry: 2.6, o: 0.32 },
  { x: 214, y: 112, rx: 120, ry: 3.2, o: 0.4 },
  { x: 330, y: 128, rx: 86, ry: 2.4, o: 0.5 },
  { x: 150, y: 140, rx: 110, ry: 2.2, o: 0.42 },
  { x: 270, y: 150, rx: 70, ry: 1.6, o: 0.55 },
]

/** The static photograph. */
export const Landscape = memo(function Landscape({ uid }: { uid: string }) {
  const id = (s: string) => `mw-${s}-${uid}`
  const url = (s: string) => `url(#${id(s)})`
  return (
    <svg className="mw-land" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={id("sky")} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={HORIZON}>
          <stop offset="0" stopColor="#1a2140" />
          <stop offset="0.28" stopColor="#363b63" />
          <stop offset="0.52" stopColor="#7c6283" />
          <stop offset="0.72" stopColor="#c98479" />
          <stop offset="0.88" stopColor="#efb486" />
          <stop offset="1" stopColor="#f8d9a6" />
        </linearGradient>
        <radialGradient id={id("glow")} gradientUnits="userSpaceOnUse" cx={SUN.x} cy={SUN.y} r="170">
          <stop offset="0" stopColor="#fff2d2" stopOpacity="0.95" />
          <stop offset="0.07" stopColor="#ffdca6" stopOpacity="0.62" />
          <stop offset="0.24" stopColor="#f6aa7c" stopOpacity="0.26" />
          <stop offset="0.6" stopColor="#d9836f" stopOpacity="0.06" />
          <stop offset="1" stopColor="#d9836f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("cloud")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8e6f8a" />
          <stop offset="0.7" stopColor="#e9a688" />
          <stop offset="1" stopColor="#ffd2a1" />
        </linearGradient>
        <linearGradient id={id("far")} gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2={HORIZON}>
          <stop offset="0" stopColor="#b5848c" />
          <stop offset="1" stopColor="#c99486" />
        </linearGradient>
        <linearGradient id={id("mid")} gradientUnits="userSpaceOnUse" x1="0" y1="172" x2="0" y2={HORIZON}>
          <stop offset="0" stopColor="#7b5f78" />
          <stop offset="1" stopColor="#a1767f" />
        </linearGradient>
        <linearGradient id={id("haze")} gradientUnits="userSpaceOnUse" x1="0" y1="168" x2="0" y2={HORIZON}>
          <stop offset="0" stopColor="#ffe3c0" stopOpacity="0" />
          <stop offset="0.75" stopColor="#ffd9b0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe6c4" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={id("lake")} gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON} x2="0" y2={H}>
          <stop offset="0" stopColor="#f3c897" />
          <stop offset="0.12" stopColor="#d79a85" />
          <stop offset="0.38" stopColor="#8a6a83" />
          <stop offset="0.7" stopColor="#433f62" />
          <stop offset="1" stopColor="#1d2038" />
        </linearGradient>
        <radialGradient id={id("lakeglow")} gradientUnits="userSpaceOnUse" cx={SUN.x} cy={HORIZON} r="150">
          <stop offset="0" stopColor="#ffe3b5" stopOpacity="0.7" />
          <stop offset="0.35" stopColor="#f7b98a" stopOpacity="0.22" />
          <stop offset="1" stopColor="#f7b98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("rock")} gradientUnits="userSpaceOnUse" x1="0" y1="228" x2="0" y2={H}>
          <stop offset="0" stopColor="#2a2330" />
          <stop offset="0.25" stopColor="#15141d" />
          <stop offset="1" stopColor="#0c0c12" />
        </linearGradient>
        <linearGradient id={id("streak")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffe9c7" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff4de" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffe9c7" stopOpacity="0" />
        </linearGradient>
        <filter id={id("soft")} x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
        <filter id={id("softer")} x="-5%" y="-30%" width="110%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <radialGradient id={id("vignette")} cx="0.55" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </radialGradient>
      </defs>

      {/* sky */}
      <rect width={W} height={HORIZON + 2} fill={url("sky")} />
      <rect width={W} height={HORIZON + 2} fill={url("glow")} />
      {CLOUDS.map((c, i) => (
        <ellipse key={i} cx={c.x} cy={c.y} rx={c.rx} ry={c.ry} fill={url("cloud")} opacity={c.o} />
      ))}
      <circle cx={SUN.x} cy={SUN.y} r="22" fill="#fff0cf" opacity="0.35" filter={url("softer")} />
      <circle cx={SUN.x} cy={SUN.y} r="10" fill="#fff7e6" />

      {/* hills, far to near, separated by haze */}
      <path d={FAR} fill={url("far")} opacity="0.9" filter={url("soft")} />
      <rect y="150" width={W} height={HORIZON - 148} fill={url("haze")} />
      <path d={MID} fill={url("mid")} filter={url("soft")} />
      <rect y="176" width={W} height={HORIZON - 174} fill={url("haze")} opacity="0.8" />
      <path d={NEAR} fill="#3a2f45" />

      {/* lake */}
      <rect y={HORIZON} width={W} height={H - HORIZON} fill={url("lake")} />
      <rect y={HORIZON} width={W} height={H - HORIZON} fill={url("lakeglow")} />
      <path
        d={MID}
        fill="#7b5f78"
        opacity="0.22"
        filter={url("softer")}
        transform={`translate(0 ${HORIZON * 2}) scale(1 -1)`}
      />
      <path d={NEAR_REFLECT} fill="#3a2f45" opacity="0.42" filter={url("soft")} transform={`translate(0 ${HORIZON * 2}) scale(1 -1)`} />
      <rect y={HORIZON} width={W} height="1.2" fill="#ffe8c4" opacity="0.55" />
      {RIPPLES.map((b, i) => (
        <path key={i} d={b.d} fill="#fff1dc" opacity={b.o} />
      ))}
      {GLITTER_A.map((b, i) => (
        <path key={i} d={b.d} fill="#fff4dc" opacity={b.o * 0.75} />
      ))}

      {/* island */}
      <path d={ISLAND} fill="#231e2d" />
      <path d={ISLAND} fill="#231e2d" opacity="0.32" transform={`translate(0 ${ISLAND_Y * 2 + 1}) scale(1 -1)`} />

      {/* foreground point */}
      <path d={ROCK} fill={url("rock")} />
      {PINES.map((d, i) => (
        <path key={i} d={d} fill="#0f0f17" />
      ))}

      {/* lens streak through the sun */}
      <ellipse cx={SUN.x} cy={SUN.y} rx="150" ry="1.1" fill={url("streak")} opacity="0.55" />

      <rect width={W} height={H} fill={url("vignette")} />
    </svg>
  )
})

/** Sun glitter on its own layer, so it can shimmer without repainting the photograph. */
export const Glitter = memo(function Glitter({ alt = false }: { alt?: boolean }) {
  const set = alt ? GLITTER_B : GLITTER_A
  return (
    <svg className="mw-glitter" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {set.map((b, i) => (
        <path key={i} d={b.d} fill="#fff8e6" opacity={b.o} />
      ))}
    </svg>
  )
})
