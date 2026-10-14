"use client"

import { useId, useRef } from "react"
import "@/styles/exhibit-ledger.css"
import type { ExhibitProps } from "./types"
import { lodOf, useLoop, useNodes, useReducedMotion, type Frame, type Lod } from "./ledger/use-loop"
import { along, clamp, cleanId, ease, hash, lerp, mix, seg, spring, track, writer, type Track } from "./ledger/kit"

// Peer-to-peer energy trading: a street of six homes, three with rooftop solar, through one
// day. Faces are lit and shadows cast from the sun's position; surplus runs along the street's
// power lines to a neighbour, lighting each pole it passes, and every trade settles on a ledger.
// At dusk the street lamps and windows come on. Addresses and amounts are example values.

const LOOP = 18
const DAY = 15 // seconds of daylight per loop; the rest is night
const STILL = 6.05

const C = {
  bg: "#0e0e0c",
  slab: "#1a1a16",
  slabL: "#121210",
  slabR: "#16160f",
  rim: "#34322b",
  street: "#121210",
  dark: "#1b1a16",
  paper: "#ede9df",
  paper2: "#cfc9ba",
  mute: "#918b7c",
  dim: "#67625a",
  lime: "#c8ff3d",
  limeDim: "#a6d23a",
  wire: "#6d685c",
  warm: "#ffcf86",
  glass: "#2a2f35",
  panel: "#1d2633",
  panelLine: "#3c4c60",
}

// ---------- projection: 2:1 isometric, z up ----------
const OX = 400
const OY = 262
type V2 = [number, number]
type V3 = [number, number, number]
const P = (x: number, y: number, z = 0): V2 => [OX + (x - y), OY + (x + y) * 0.5 - z]
const pts = (a: V2[]) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

// The street is scaled up around its centre so the houses carry the frame; smaller stages
// crop in tighter. (s: scale, c: the street point placed at x, y.)
const FRAMING: Record<Lod, { s: number; cx: number; cy: number; x: number; y: number }> = {
  full: { s: 1.3, cx: 413, cy: 236, x: 404, y: 268 },
  compact: { s: 1.44, cx: 413, cy: 236, x: 404, y: 262 },
  thumb: { s: 1.52, cx: 413, cy: 236, x: 404, y: 252 },
}

// ---------- the street ----------
type House = {
  id: string
  addr: string
  x0: number
  x1: number
  y0: number
  y1: number
  h: number
  r: number
  roof: "gx" | "gy" | "flat"
  solar?: boolean
  wall: string
  roofC: string
  front: boolean // front row (across the street, seen from behind)
  pole: number
}

const HOUSES: House[] = [
  { id: "A", addr: "0x3f…a9", x0: -120, x1: -72, y0: -112, y1: -42, h: 30, r: 20, roof: "gx", solar: true, wall: "#ebe5d6", roofC: "#7a6b5a", front: false, pole: 0 },
  { id: "B", addr: "0x71…0c", x0: -58, x1: -16, y0: -108, y1: -46, h: 40, r: 0, roof: "flat", wall: "#ddd7c8", roofC: "#58544b", front: false, pole: 1 },
  { id: "C", addr: "0x8c…2e", x0: -2, x1: 46, y0: -112, y1: -42, h: 28, r: 18, roof: "gy", solar: true, wall: "#efe9db", roofC: "#6b6359", front: false, pole: 2 },
  { id: "D", addr: "0xe4…13", x0: 60, x1: 118, y0: -112, y1: -48, h: 46, r: 18, roof: "gx", solar: true, wall: "#e3ddce", roofC: "#575c61", front: false, pole: 3 },
  { id: "E", addr: "0x5d…b7", x0: -100, x1: -56, y0: 48, y1: 104, h: 26, r: 16, roof: "gx", wall: "#e7e0d0", roofC: "#83705c", front: true, pole: 0 },
  { id: "F", addr: "0x2a…f6", x0: 24, x1: 66, y0: 50, y1: 106, h: 30, r: 16, roof: "gy", wall: "#ddd6c6", roofC: "#676a6d", front: true, pole: 2 },
]
const byId = Object.fromEntries(HOUSES.map((h) => [h.id, h])) as Record<string, House>

const TREES = [
  { x: -18, y: 74, h: 30, r: 11 },
  { x: 102, y: 70, h: 26, r: 9.5 },
]

const POLE_X = [-96, -37, 22, 89]
const POLE_Y = -30
const POLE_H = 58
const poleTop = (i: number, dz = 0) => P(POLE_X[i], POLE_Y, POLE_H - 2 + dz)

type Face = { pts: V2[]; n: V3; base: string; kind: "wall" | "roof" }
type Rect = V2[]

function houseGeo(H: House) {
  const { x0, x1, y0, y1, h, r } = H
  const faces: Face[] = []
  const windows: Rect[] = []
  let panel: { q: [V3, V3, V3, V3] } | null = null
  const shadowPts: V3[] = [
    [x0, y0, 0],
    [x1, y0, 0],
    [x1, y1, 0],
    [x0, y1, 0],
  ]
  // face-local rectangles to screen
  const onFront = (u0: number, u1: number, v0: number, v1: number): Rect => [P(x0 + u0, y1, v0), P(x0 + u1, y1, v0), P(x0 + u1, y1, v1), P(x0 + u0, y1, v1)]
  const onRight = (u0: number, u1: number, v0: number, v1: number): Rect => [P(x1, y1 - u0, v0), P(x1, y1 - u1, v0), P(x1, y1 - u1, v1), P(x1, y1 - u0, v1)]
  const wx = x1 - x0
  const wy = y1 - y0

  if (H.roof === "gx") {
    const ym = (y0 + y1) / 2
    const hd = wy / 2
    const p = Math.atan2(r, hd)
    const eave = h - 3 * (r / hd)
    faces.push({ pts: [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(x0, y1, h)], n: [0, 1, 0], base: H.wall, kind: "wall" })
    faces.push({ pts: [P(x1, y1, 0), P(x1, y0, 0), P(x1, y0, h), P(x1, ym, h + r), P(x1, y1, h)], n: [1, 0, 0], base: H.wall, kind: "wall" })
    faces.push({ pts: [P(x0 - 3, ym, h + r), P(x1 + 3, ym, h + r), P(x1 + 3, y0 - 3, eave), P(x0 - 3, y0 - 3, eave)], n: norm([0, -Math.sin(p), Math.cos(p)]), base: H.roofC, kind: "roof" })
    faces.push({ pts: [P(x0 - 3, ym, h + r), P(x1 + 3, ym, h + r), P(x1 + 3, y1 + 3, eave), P(x0 - 3, y1 + 3, eave)], n: norm([0, Math.sin(p), Math.cos(p)]), base: H.roofC, kind: "roof" })
    shadowPts.push([x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h], [x0, ym, h + r], [x1, ym, h + r])
    if (H.solar) {
      const a = 0.18
      const b = 0.86
      const zAt = (k: number) => lerp(h + r, h, k)
      const yAt = (k: number) => lerp(ym, y1, k)
      panel = {
        q: [
          [x0 + 5, yAt(a), zAt(a)],
          [x1 - 5, yAt(a), zAt(a)],
          [x1 - 5, yAt(b), zAt(b)],
          [x0 + 5, yAt(b), zAt(b)],
        ],
      }
    }
    if (H.front) {
      windows.push(onFront(wx * 0.18, wx * 0.42, h * 0.38, h * 0.72), onFront(wx * 0.58, wx * 0.82, h * 0.38, h * 0.72))
      windows.push(onRight(wy * 0.3, wy * 0.55, h * 0.35, h * 0.7))
    } else {
      // street side: a door and windows; a second floor on tall houses
      windows.push(onFront(wx * 0.12, wx * 0.3, 0, h * (h > 40 ? 0.34 : 0.62)))
      windows.push(onFront(wx * 0.44, wx * 0.86, h * 0.26, h * (h > 40 ? 0.42 : 0.66)))
      if (h > 40) windows.push(onFront(wx * 0.12, wx * 0.42, h * 0.58, h * 0.82), onFront(wx * 0.56, wx * 0.86, h * 0.58, h * 0.82))
      windows.push(onRight(wy * 0.2, wy * 0.42, h * 0.38, h * 0.7), onRight(wy * 0.58, wy * 0.8, h * 0.38, h * 0.7))
    }
  } else if (H.roof === "gy") {
    const xm = (x0 + x1) / 2
    const hw = wx / 2
    const p = Math.atan2(r, hw)
    const eave = h - 3 * (r / hw)
    faces.push({ pts: [P(x1, y1, 0), P(x1, y0, 0), P(x1, y0, h), P(x1, y1, h)], n: [1, 0, 0], base: H.wall, kind: "wall" })
    faces.push({ pts: [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(xm, y1, h + r), P(x0, y1, h)], n: [0, 1, 0], base: H.wall, kind: "wall" })
    faces.push({ pts: [P(xm, y0 - 3, h + r), P(xm, y1 + 3, h + r), P(x0 - 3, y1 + 3, eave), P(x0 - 3, y0 - 3, eave)], n: norm([-Math.sin(p), 0, Math.cos(p)]), base: H.roofC, kind: "roof" })
    faces.push({ pts: [P(xm, y0 - 3, h + r), P(xm, y1 + 3, h + r), P(x1 + 3, y1 + 3, eave), P(x1 + 3, y0 - 3, eave)], n: norm([Math.sin(p), 0, Math.cos(p)]), base: H.roofC, kind: "roof" })
    shadowPts.push([x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h], [xm, y0, h + r], [xm, y1, h + r])
    if (H.solar) {
      const a = 0.16
      const b = 0.84
      const zAt = (k: number) => lerp(h + r, h, k)
      const xAt = (k: number) => lerp(xm, x1, k)
      panel = {
        q: [
          [xAt(a), y1 - 6, zAt(a)],
          [xAt(a), y0 + 6, zAt(a)],
          [xAt(b), y0 + 6, zAt(b)],
          [xAt(b), y1 - 6, zAt(b)],
        ],
      }
    }
    windows.push(onFront(wx * 0.36, wx * 0.64, 0, h * 0.62))
    windows.push(onFront(wx * 0.42, wx * 0.58, h + r * 0.18, h + r * 0.5))
    windows.push(onRight(wy * 0.16, wy * 0.4, h * 0.36, h * 0.72), onRight(wy * 0.58, wy * 0.84, h * 0.36, h * 0.72))
  } else {
    faces.push({ pts: [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, h), P(x0, y1, h)], n: [0, 1, 0], base: H.wall, kind: "wall" })
    faces.push({ pts: [P(x1, y1, 0), P(x1, y0, 0), P(x1, y0, h), P(x1, y1, h)], n: [1, 0, 0], base: H.wall, kind: "wall" })
    faces.push({ pts: [P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], n: [0, 0, 1], base: H.roofC, kind: "roof" })
    shadowPts.push([x0, y0, h + 2], [x1, y0, h + 2], [x1, y1, h + 2], [x0, y1, h + 2])
    windows.push(onFront(wx * 0.1, wx * 0.9, h * 0.52, h * 0.82))
    windows.push(onFront(wx * 0.1, wx * 0.34, 0, h * 0.4), onFront(wx * 0.46, wx * 0.9, h * 0.12, h * 0.4))
    windows.push(onRight(wy * 0.14, wy * 0.86, h * 0.52, h * 0.82))
  }
  // panel cells, by bilinear interpolation of the panel quad
  let cells: Rect[] = []
  let panelOutline: V2[] = []
  if (panel) {
    const [a, b, c, d] = panel.q
    const at = (u: number, v: number): V2 => {
      const top: V3 = [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]
      const bot: V3 = [lerp(d[0], c[0], u), lerp(d[1], c[1], u), lerp(d[2], c[2], u)]
      return P(lerp(top[0], bot[0], v), lerp(top[1], bot[1], v), lerp(top[2], bot[2], v))
    }
    const cols = 4
    const rows = 2
    const g = 0.035
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) cells.push([at(i / cols + g, j / rows + g), at((i + 1) / cols - g, j / rows + g), at((i + 1) / cols - g, (j + 1) / rows - g), at(i / cols + g, (j + 1) / rows - g)])
    panelOutline = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)]
  } else cells = []
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const top = H.h + H.r
  const chip = P(cx, cy, top + 16)
  // where the service drop meets the house: the street-facing wall, just under the eave
  const attach = H.front ? P(cx, y0, h - 2) : P(cx, y1, h - 4)
  return { faces, windows, cells, panelOutline, shadowPts, chip, attach, panelNormal: panel ? faces[faces.length - 1].n : null }
}

const GEO = Object.fromEntries(HOUSES.map((h) => [h.id, houseGeo(h)])) as Record<string, ReturnType<typeof houseGeo>>

// wires: two conductors between consecutive poles, sagging
function span(a: V2, b: V2, sag: number, steps = 14): V2[] {
  const out: V2[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t) + sag * 4 * t * (1 - t)])
  }
  return out
}
const dPath = (a: V2[]) => a.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("")

/** The wire route between two homes, with how far along it each pole sits. */
function routeOf(from: string, to: string): { tr: Track; poles: { pole: number; d: number }[] } {
  const A = byId[from]
  const B = byId[to]
  const out: V2[] = []
  const at: { pole: number; i: number }[] = []
  out.push(...span(GEO[from].attach, poleTop(A.pole), 5, 10))
  at.push({ pole: A.pole, i: out.length - 1 })
  const step = B.pole >= A.pole ? 1 : -1
  for (let i = A.pole; i !== B.pole; i += step) {
    out.push(...span(poleTop(i), poleTop(i + step), 7, 14).slice(1))
    at.push({ pole: i + step, i: out.length - 1 })
  }
  out.push(...span(poleTop(B.pole), GEO[to].attach, 5, 10).slice(1))
  const tr = track(out)
  return { tr, poles: at.map(({ pole, i }) => ({ pole, d: tr.len[i] })) }
}

const TRADES = [
  { from: "A", to: "B", kwh: "2.4" },
  { from: "C", to: "E", kwh: "1.1" },
  { from: "D", to: "F", kwh: "0.8" },
  { from: "A", to: "E", kwh: "1.6" },
  { from: "D", to: "B", kwh: "3.2" },
  { from: "C", to: "F", kwh: "0.6" },
].map((tr, j) => {
  const { tr: route, poles } = routeOf(tr.from, tr.to)
  return { ...tr, start: 0.9 + j * 2.2, route, poles, d: dPath(route.pts) }
})
const TRAVEL = 1.7

const STARS = Array.from({ length: 30 }, (_, i) => ({ x: 24 + hash(i * 3.3) * 752, y: 14 + hash(i * 7.9) * 170, r: 0.5 + hash(i * 1.7) * 0.9 }))

// sun along its arc, s in 0..1 from sunrise to sunset
const SUN = (s: number): V2 => [400 - 368 * Math.cos(Math.PI * s), 330 - 290 * Math.sin(Math.PI * s)]

function sunAt(t: number) {
  const day = t < DAY
  const s = day ? lerp(0.03, 0.97, t / DAY) : 1.05
  const elev = (10 + 52 * Math.sin(Math.PI * clamp(s))) * (Math.PI / 180)
  // light swings from the left, over the viewer's shoulder, to the right
  const left: V3 = [-Math.SQRT1_2, Math.SQRT1_2, 0]
  const front: V3 = [Math.SQRT1_2, Math.SQRT1_2, 0]
  const th = Math.PI * clamp(s)
  const hx = Math.cos(th) * left[0] + 0.7 * Math.sin(th) * front[0]
  const hy = Math.cos(th) * left[1] + 0.7 * Math.sin(th) * front[1]
  const hl = Math.hypot(hx, hy) || 1
  const L: V3 = [(hx / hl) * Math.cos(elev), (hy / hl) * Math.cos(elev), Math.sin(elev)]
  // daylight: 1 by day, easing out at dusk and back in at dawn
  const light = t < DAY ? Math.min(seg(t, -0.6, 0.9), 1 - seg(t, DAY - 1.2, DAY + 0.2)) : seg(t, LOOP - 0.5, LOOP + 0.9)
  return { s, L, light: clamp(light), elev }
}

function hull(points: V2[]): V2[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo: V2[] = []
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop()
    lo.push(q)
  }
  const up: V2[] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop()
    up.push(q)
  }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}

const clock = (hours: number) => {
  const mins = Math.round(hours * 60)
  return `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`
}
const DAWN = 6 + 12 * 0.03
const DUSK = 6 + 12 * 0.97

const ITEM_W = 300
const TAIL = 0.32 // seconds the current's tail runs behind its head

export default function EnergyExhibit({ mode = "live", active = false }: ExhibitProps) {
  const rm = useReducedMotion()
  const live = mode === "live" && !rm
  const stage = useRef<HTMLDivElement>(null)
  const [n, ref] = useNodes()
  const w = useRef(writer()).current
  const id = cleanId(useId())

  const draw = ({ t: tc, still, w: width, px, py }: Frame) => {
    const N = n.current
    const lod = lodOf(width)
    w.attr(N.root, "data-lod", lod)
    const k = still ? 1 : Math.floor(tc / LOOP)
    const t = still ? STILL : tc - k * LOOP
    const { s, L, light, elev } = sunAt(t)
    const night = 1 - light

    // ---- framing: a slow drift, seamless over the loop, plus a lean toward the mouse
    const F = FRAMING[lod]
    const ph = (2 * Math.PI * t) / LOOP
    const sc = F.s * (1.006 + 0.008 * Math.sin(ph - Math.PI / 2))
    w.attr(
      N.world,
      "transform",
      `translate(${(F.x + Math.sin(ph) * 4 - px * 12).toFixed(2)} ${(F.y + Math.cos(ph) * 2 - py * 7).toFixed(2)}) scale(${sc.toFixed(4)}) translate(${-F.cx} ${-F.cy})`,
    )
    w.attr(N.sky, "transform", `translate(${(-px * 4).toFixed(2)} ${(-py * 2.5).toFixed(2)})`)

    // ---- sky
    const [sx, sy] = SUN(clamp(s, 0, 1))
    const low = 1 - clamp((elev * 180) / Math.PI / 45)
    w.attr(N.sun, "transform", `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`)
    w.fade(N.sun, t < DAY ? clamp(seg(t, -0.4, 0.5)) * (1 - seg(t, DAY - 0.5, DAY + 0.1)) : 0)
    w.attr(N.sunCore, "fill", mix("#fff2d6", "#ffc27a", low))
    w.attr(N.halo, "transform", `scale(${(1 + low * 0.7).toFixed(3)})`)
    w.attr(N.haloStop, "stop-color", mix("#ffe4ae", "#ff9a52", low))
    w.attr(N.horizon, "opacity", (0.55 * low * light).toFixed(3))
    w.attr(N.horizon, "cx", sx.toFixed(1))
    w.attr(N.dayTint, "opacity", (light * (0.55 + 0.45 * (1 - low))).toFixed(3))
    w.attr(N.skyGlow, "opacity", (0.18 + 0.32 * light).toFixed(3))
    for (let i = 0; i < STARS.length; i++) w.attr(N[`st${i}`], "opacity", (night * (0.35 + 0.65 * Math.abs(Math.sin(tc * 1.3 + i)))).toFixed(2))
    // by night the clock runs on to the next dawn
    w.text(N.clock, clock(t < DAY ? 6 + 12 * s : lerp(DUSK, DAWN + 24, seg(t, DAY, LOOP))))
    const sunDeg = Math.round((elev * 180) / Math.PI)
    w.text(N.sunDeg, t < DAY ? `SUN ${sunDeg}°` : "NIGHT")

    // ---- lighting
    const shade = (base: string, nrm: V3, kind: "wall" | "roof") => {
      const lit = Math.max(0, nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2])
      const amb = kind === "roof" ? 0.46 : 0.4
      const b = lerp(0.17, amb + 0.6 * lit, light)
      let c = mix(C.dark, base, b)
      if (lit > 0) c = mix(c, "#ffd7a1", 0.22 * low * lit * light)
      return c
    }

    // ---- shadows on the slab
    const lz = Math.max(0.12, L[2])
    for (const H of HOUSES) {
      const g = GEO[H.id]
      const pr: V2[] = g.shadowPts.map(([x, y, z]) => P(x - (L[0] * z) / lz, y - (L[1] * z) / lz, 0))
      w.attr(N[`sh${H.id}`], "points", pts(hull(pr)))
    }
    w.attr(N.shadows, "opacity", (0.5 * light).toFixed(3))
    for (let i = 0; i < 2; i++) {
      const tr = TREES[i]
      const [x, y] = P(tr.x - (L[0] * 22) / lz, tr.y - (L[1] * 22) / lz, 0)
      w.attr(N[`tsh${i}`], "cx", x.toFixed(1))
      w.attr(N[`tsh${i}`], "cy", y.toFixed(1))
    }

    // ---- production
    let produce = 0
    for (const H of HOUSES) if (H.solar) produce += (H.id === "D" ? 5.1 : H.id === "A" ? 4.2 : 3.6) * Math.sin(Math.PI * clamp(s)) * light
    w.text(N.solar, `${produce.toFixed(1)} kW`)
    w.attr(N.solarBar, "width", (84 * clamp(produce / 12.9)).toFixed(1))

    // ---- trades: the current runs seller → poles → buyer, lighting each pole it passes
    const glowTo: Record<string, number> = {}
    const sending: Record<string, number> = {}
    const focus: Record<string, number> = {}
    const poleFlash = [0, 0, 0, 0]
    for (let j = 0; j < TRADES.length; j++) {
      const tr = TRADES[j]
      const len = tr.route.total
      const a = tr.start
      const b = tr.start + TRAVEL
      const on = t >= a - 0.3 && t < b + 1
      const p = ease.inOutSine(seg(t, a, b))
      const head = p * len
      const s0 = ease.inOutSine(seg(t, a + TAIL, b + TAIL)) * len
      // one dash from s0 to the head; the offset places it, so no zero-length dash leaves a dot
      const lit = on && head - s0 > 0.4
      const dash = lit ? `${(head - s0).toFixed(1)} ${(len + 20).toFixed(0)}` : "0 1"
      for (const key of [`rc${j}`, `rh${j}`]) {
        w.attr(N[key], "stroke-dasharray", dash)
        w.attr(N[key], "stroke-dashoffset", (-s0).toFixed(1))
      }
      w.fade(N[`rc${j}`], lit ? 1 : 0)
      w.fade(N[`rh${j}`], lit ? 1 : 0)
      // the route ahead shows faintly while the trade is open
      w.fade(N[`rw${j}`], on ? 0.4 * Math.min(seg(t, a - 0.3, a + 0.05), 1 - seg(t, b, b + 0.7)) : 0)
      const [hx, hy] = along(tr.route, p)
      w.fade(N[`pk${j}`], on ? Math.min(seg(t, a - 0.12, a + 0.08), 1 - seg(t, b, b + 0.22)) : 0)
      w.attr(N[`pk${j}`], "transform", `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`)
      if (on && t < b + 0.4)
        for (const pl of tr.poles) if (head >= pl.d) poleFlash[pl.pole] = Math.max(poleFlash[pl.pole], clamp(1 - (head - pl.d) / 60) * (1 - seg(t, b, b + 0.4)))
      // arrival: a ring where the line meets the buyer's wall
      const arr = t - b
      const ring = seg(arr, 0, 0.75)
      w.fade(N[`ar${j}`], arr > 0 && ring < 1 ? 1 - ease.outCubic(ring) : 0)
      w.attr(N[`ar${j}`], "r", (3 + 15 * ease.outCubic(ring)).toFixed(1))
      if (on) sending[tr.from] = Math.max(sending[tr.from] ?? 0, Math.min(seg(t, a - 0.3, a + 0.1), 1 - seg(t, b, b + 0.6)))
      if (arr > 0 && arr < 2.4) glowTo[tr.to] = Math.max(glowTo[tr.to] ?? 0, 1 - seg(arr, 1.2, 2.4))
      focus[tr.from] = Math.max(focus[tr.from] ?? 0, Math.min(seg(t, a - 0.5, a - 0.15), 1 - seg(t, b + 0.6, b + 1)))
      focus[tr.to] = Math.max(focus[tr.to] ?? 0, Math.min(seg(t, a - 0.3, a + 0.05), 1 - seg(t, b + 1.3, b + 1.7)))
      // "+2.4 kWh" rises over the buyer
      const fl = seg(arr, 0, 1.5)
      w.fade(N[`fl${j}`], arr > 0 && fl < 1 ? Math.min(seg(arr, 0, 0.15), 1 - seg(fl, 0.6, 1)) : 0)
      w.attr(N[`flt${j}`], "transform", `translate(0 ${(-16 * ease.outCubic(fl)).toFixed(2)})`)
    }
    for (let i = 0; i < 4; i++) {
      const f = poleFlash[i]
      w.fade(N[`pf${i}`], f)
      w.attr(N[`pfr${i}`], "r", (2 + 9 * (1 - f)).toFixed(2))
    }

    // ---- houses
    const chipK = lod === "full" ? 1 : 1.55
    HOUSES.forEach((H, hi) => {
      const g = GEO[H.id]
      g.faces.forEach((f, i) => w.attr(N[`f${H.id}${i}`], "fill", shade(f.base, f.n, f.kind)))
      // at dusk the lights come on house by house; a delivery warms the buyer's windows
      const dusk = clamp((night - 0.12 - hash(hi * 4.1) * 0.4) / 0.14)
      const lights = Math.max(dusk * 0.92, glowTo[H.id] ?? 0)
      const wc = lights > 0 ? mix(mix(C.glass, "#4b5560", light * 0.4), C.warm, lights) : mix(C.glass, "#5a6672", light * 0.35)
      w.attr(N[`w${H.id}`], "fill", wc)
      w.fade(N[`wg${H.id}`], lights * 0.8)
      const hot = sending[H.id] ?? 0
      const recv = glowTo[H.id] ?? 0
      if (g.cells.length) {
        const pn = g.panelNormal!
        const lit = Math.max(0, pn[0] * L[0] + pn[1] * L[1] + pn[2] * L[2]) * light
        w.attr(N[`pc${H.id}`], "fill", mix(mix("#141a22", "#2a3a52", lit), "#46621c", hot * 0.75))
        w.attr(N[`pl${H.id}`], "stroke", mix(C.panelLine, C.lime, Math.max(0.25 * lit, hot * 0.95)))
        // a glint crosses the array as the sun swings past its angle
        const peak = H.roof === "gy" ? 0.62 : 0.36
        const gl = clamp(1 - Math.abs(s - peak) / 0.14) * light
        const [ax, ay] = g.panelOutline[0]
        const [bx, by] = g.panelOutline[2]
        const k2 = clamp((s - (peak - 0.14)) / 0.28)
        w.attr(N[`gl${H.id}`], "transform", `translate(${lerp(ax - 30, bx + 10, k2).toFixed(1)} ${lerp(ay - 10, by, k2).toFixed(1)})`)
        w.fade(N[`gl${H.id}`], gl)
      }
      // address chips: all of them on the big stage; only the two parties of a trade when small
      const [cx, cy] = g.chip
      if (lod === "full") {
        w.attr(N[`cg${H.id}`], "transform", `translate(${cx.toFixed(1)} ${cy.toFixed(1)})`)
        w.fade(N[`cg${H.id}`], 1)
      } else {
        const f = focus[H.id] ?? 0
        const pop = Math.min(1.08, spring(f * 0.5, 0.55, 14))
        w.attr(N[`cg${H.id}`], "transform", `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${(chipK * lerp(0.6, 1, pop)).toFixed(3)})`)
        w.fade(N[`cg${H.id}`], clamp(f * 1.6))
      }
      w.attr(N[`chip${H.id}`], "stroke", hot > 0 ? mix(C.rim, C.lime, hot) : recv > 0 ? mix(C.rim, C.paper2, recv) : C.rim)
      w.attr(N[`chipT${H.id}`], "fill", hot > 0 ? mix(C.mute, C.lime, hot) : recv > 0 ? mix(C.mute, C.paper, recv) : C.mute)
    })
    TRADES.forEach((tr, j) => {
      const [cx, cy] = GEO[tr.to].chip
      w.attr(N[`fl${j}`], "transform", `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${chipK})`)
    })
    // trees' canopies take the light too
    for (let i = 0; i < 2; i++) {
      const lit = clamp(0.5 - L[0] * 0.5 + L[1] * 0.2)
      w.attr(N[`tc${i}`], "fill", mix("#1f2a14", "#62782f", lerp(0.18, 0.35 + 0.55 * lit, light)))
      w.attr(N[`td${i}`], "fill", mix("#141b0d", "#3f5120", lerp(0.18, 0.4, light)))
    }
    // street lamps on the poles
    for (let i = 0; i < 4; i++) {
      const on = clamp((night - 0.05 - i * 0.05) / 0.12)
      w.fade(N[`lamp${i}`], on)
      w.fade(N[`pool${i}`], on * 0.85)
    }

    // ---- ledger ticker: newest settlement first; earlier ones slide right
    const tk = lod === "full" ? 1 : lod === "compact" ? 1.34 : 1.5
    w.attr(N.tickItems, "transform", `translate(132 474) scale(${tk}) translate(-132 -474)`)
    w.attr(N.tickHead, "transform", `translate(40 474) scale(${tk}) translate(-40 -474)`)
    const g0 = k * TRADES.length
    let started = g0 - 1 // global index of the latest trade that has started
    let slide = 1
    for (let j = 0; j < TRADES.length; j++)
      if (t >= TRADES[j].start) {
        started = g0 + j
        slide = ease.outExpo(seg(t, TRADES[j].start, TRADES[j].start + 0.55))
      }
    for (let q = 0; q < 4; q++) {
      const gi = started - q // the q-th most recent trade
      const j = ((gi % TRADES.length) + TRADES.length) % TRADES.length
      const tr = TRADES[j]
      const loopOf = Math.floor(gi / TRADES.length)
      const tIn = loopOf === k ? t : t + (k - loopOf) * LOOP
      const settled = tIn >= tr.start + TRAVEL
      const pos = q - 1 + slide
      w.attr(N[`ti${q}`], "transform", `translate(${(132 + pos * ITEM_W).toFixed(1)} 0)`)
      w.fade(N[`ti${q}`], q === 0 ? slide : q === 3 ? 1 - slide : 1)
      w.text(N[`tk${q}`], `${tr.kwh} kWh`)
      w.text(N[`tr${q}`], `${byId[tr.from].addr} → ${byId[tr.to].addr}`)
      w.text(N[`ts${q}`], settled ? "SETTLED ✓" : "PENDING")
      w.attr(N[`tsb${q}`], "fill", settled ? C.lime : "none")
      w.attr(N[`tsb${q}`], "stroke", settled ? C.lime : C.dim)
      w.attr(N[`ts${q}`], "fill", settled ? "#151513" : C.mute)
      const age = tIn - (tr.start + TRAVEL)
      const pop = settled && age < 0.6 ? 1 + 0.16 * (1 - spring(age, 0.35, 20)) : 1
      w.attr(N[`tp${q}`], "transform", `translate(245 474) scale(${pop.toFixed(3)}) translate(-245 -474)`)
      w.fade(N[`tf${q}`], settled ? 0.16 * (1 - seg(age, 0, 0.7)) : 0)
    }
    w.attr(N.liveDot, "opacity", (0.45 + 0.55 * Math.abs(Math.sin(tc * 2.4))).toFixed(2))

    // ---- HUD grows on small stages so the time and output stay readable
    const hk = lod === "full" ? 1 : lod === "compact" ? 1.6 : 1.9
    w.attr(N.hudL, "transform", `translate(40 40) scale(${hk}) translate(-40 -40)`)
    w.attr(N.hudR, "transform", `translate(760 40) scale(${hk}) translate(-760 -40)`)
  }

  useLoop(draw, { live, active, stillAt: STILL, stage })
  const u = (s: string) => `${s}-${id}`

  const slabTop: V2[] = [P(-130, -130), P(130, -130), P(130, 130), P(-130, 130)]
  const slabL: V2[] = [P(-130, 130), P(130, 130), P(130, 130, -14), P(-130, 130, -14)]
  const slabR: V2[] = [P(130, -130), P(130, 130), P(130, 130, -14), P(130, -130, -14)]
  const streetPoly: V2[] = [P(-130, -20), P(130, -20), P(130, 24), P(-130, 24)]
  const backHouses = HOUSES.filter((h) => !h.front)
  const frontHouses = HOUSES.filter((h) => h.front)

  const house = (H: House) => {
    const g = GEO[H.id]
    return (
      <g key={H.id}>
        {g.faces.map((f, i) => (
          <polygon key={i} ref={ref(`f${H.id}${i}`)} points={pts(f.pts)} fill={f.base} stroke="#00000030" strokeWidth="0.6" strokeLinejoin="round" />
        ))}
        <g ref={ref(`w${H.id}`)} fill={C.glass}>
          {g.windows.map((r, i) => (
            <polygon key={i} points={pts(r)} />
          ))}
        </g>
        <g ref={ref(`wg${H.id}`)} opacity="0" className="xl-screen">
          {g.windows.map((r, i) => (
            <polygon key={i} points={pts(r)} fill={C.warm} filter={`url(#${u("bloom")})`} />
          ))}
        </g>
        {g.cells.length > 0 && (
          <g>
            <clipPath id={u(`pclip${H.id}`)}>
              <polygon points={pts(g.panelOutline)} />
            </clipPath>
            <polygon points={pts(g.panelOutline)} fill="#0d1117" />
            <g ref={ref(`pc${H.id}`)} fill="#1d2633">
              {g.cells.map((c, i) => (
                <polygon key={i} points={pts(c)} />
              ))}
            </g>
            <g ref={ref(`pl${H.id}`)} fill="none" stroke={C.panelLine} strokeWidth="0.7">
              {g.cells.map((c, i) => (
                <polygon key={i} points={pts(c)} />
              ))}
            </g>
            <g clipPath={`url(#${u(`pclip${H.id}`)})`}>
              <polygon ref={ref(`gl${H.id}`)} points="0,0 16,-8 34,10 18,18" fill="#fff" opacity="0" />
            </g>
          </g>
        )}
      </g>
    )
  }

  return (
    <div
      ref={ref("root")}
      className="xl xl-nrg"
      role="img"
      aria-label="Illustration of peer-to-peer energy trading: through one day, three homes with rooftop solar send surplus energy along the street's power lines to their neighbours, and each trade settles on a ledger. Example values."
    >
      <div className="xl-stage" ref={stage}>
        <svg className="xl-svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <linearGradient id={u("sky")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b0c0a" />
              <stop offset="62%" stopColor="#14130f" />
              <stop offset="100%" stopColor="#0e0e0c" />
            </linearGradient>
            <linearGradient id={u("day")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#181814" />
              <stop offset="58%" stopColor="#211f19" />
              <stop offset="100%" stopColor="#131310" />
            </linearGradient>
            <radialGradient id={u("halo")}>
              <stop ref={ref("haloStop")} offset="0%" stopColor="#ffe4ae" stopOpacity="0.55" />
              <stop offset="40%" stopColor="#ffb36b" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ff9a52" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={u("horizon")}>
              <stop offset="0%" stopColor="#ff8f4a" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ff8f4a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={u("pool")} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f6e7c8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#f6e7c8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={u("lampPool")}>
              <stop offset="0%" stopColor="#ffd9a0" stopOpacity="0.42" />
              <stop offset="55%" stopColor="#ffc47a" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffc47a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={u("pk")}>
              <stop offset="0%" stopColor="#f4ffd6" stopOpacity="0.95" />
              <stop offset="22%" stopColor={C.lime} stopOpacity="0.55" />
              <stop offset="60%" stopColor={C.lime} stopOpacity="0.12" />
              <stop offset="100%" stopColor={C.lime} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={u("drop")}>
              <stop offset="0%" stopColor="#000" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={u("tickfade")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="72%" stopColor="#fff" />
              <stop offset="93%" stopColor="#000" />
            </linearGradient>
            <mask id={u("tickmask")} maskUnits="userSpaceOnUse" x="118" y="448" width="682" height="52">
              <rect x="118" y="448" width="682" height="52" fill={`url(#${u("tickfade")})`} />
            </mask>
            <clipPath id={u("slabclip")}>
              <polygon points={pts(slabTop)} />
            </clipPath>
            <filter id={u("bloom")} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>

          {/* ============ SKY ============ */}
          <rect x="-400" y="-300" width="1600" height="1100" fill={`url(#${u("sky")})`} />
          <rect ref={ref("dayTint")} x="-400" y="-300" width="1600" height="1100" fill={`url(#${u("day")})`} opacity="0" />
          <ellipse ref={ref("skyGlow")} cx="400" cy="300" rx="420" ry="230" fill={`url(#${u("pool")})`} />
          <g ref={ref("sky")}>
            {STARS.map((st, i) => (
              <circle key={i} ref={ref(`st${i}`)} cx={st.x} cy={st.y} r={st.r} fill={C.paper} opacity="0" />
            ))}
            <ellipse ref={ref("horizon")} cx="60" cy="330" rx="260" ry="90" fill={`url(#${u("horizon")})`} opacity="0" />
            {/* the sun's path, with hours */}
            <path d={dPath(Array.from({ length: 61 }, (_, i) => SUN(i / 60)))} fill="none" stroke="#3a372f" strokeDasharray="1.5 5" strokeLinecap="round" />
            <g className="xl-fine">
              {[0, 0.25, 0.5, 0.75, 1].map((q, i) => {
                const [x, y] = SUN(q)
                const [ox, oy] = [(x - 400) * 0.055, (y - 330) * 0.075]
                return (
                  <g key={i} className="xl-mono">
                    <circle cx={x} cy={y} r="1.6" fill="#4d493f" />
                    <text x={x + ox} y={y + oy - 4} fontSize="7.4" fill="#5c574d" textAnchor="middle" letterSpacing="0.6">
                      {String(6 + 3 * i).padStart(2, "0")}:00
                    </text>
                  </g>
                )
              })}
            </g>
            <g ref={ref("sun")}>
              <circle ref={ref("halo")} r="72" fill={`url(#${u("halo")})`} />
              <circle ref={ref("sunCore")} r="11" fill="#fff2d6" />
            </g>
          </g>

          <g ref={ref("world")}>
            {/* ============ SLAB ============ */}
            <ellipse cx="400" cy="420" rx="300" ry="34" fill={`url(#${u("drop")})`} opacity="0.8" />
            <polygon points={pts(slabL)} fill={C.slabL} />
            <polygon points={pts(slabR)} fill={C.slabR} />
            <polygon points={pts(slabTop)} fill={C.slab} />
            <g clipPath={`url(#${u("slabclip")})`}>
              {/* survey grid */}
              <g stroke="#22211c" strokeWidth="0.7">
                {Array.from({ length: 11 }, (_, i) => -130 + i * 26).map((v) => (
                  <g key={v}>
                    <line x1={P(v, -130)[0]} y1={P(v, -130)[1]} x2={P(v, 130)[0]} y2={P(v, 130)[1]} />
                    <line x1={P(-130, v)[0]} y1={P(-130, v)[1]} x2={P(130, v)[0]} y2={P(130, v)[1]} />
                  </g>
                ))}
              </g>
              <polygon points={pts(streetPoly)} fill={C.street} />
              <line x1={P(-130, -20)[0]} y1={P(-130, -20)[1]} x2={P(130, -20)[0]} y2={P(130, -20)[1]} stroke="#2a2923" strokeWidth="1.2" />
              <line x1={P(-130, 24)[0]} y1={P(-130, 24)[1]} x2={P(130, 24)[0]} y2={P(130, 24)[1]} stroke="#2a2923" strokeWidth="1.2" />
              <line x1={P(-130, 2)[0]} y1={P(-130, 2)[1]} x2={P(130, 2)[0]} y2={P(130, 2)[1]} stroke="#4a473d" strokeWidth="1.1" strokeDasharray="7 7" />
              {/* lamp light on the road */}
              {POLE_X.map((x, i) => {
                const [cx, cy] = P(x + 4, -6, 0)
                return <ellipse key={i} ref={ref(`pool${i}`)} cx={cx} cy={cy} rx="38" ry="19" fill={`url(#${u("lampPool")})`} opacity="0" visibility="hidden" />
              })}
              <g ref={ref("shadows")} fill="#000" opacity="0.4">
                {HOUSES.map((h) => (
                  <polygon key={h.id} ref={ref(`sh${h.id}`)} points="0,0" />
                ))}
                {TREES.map((tr, i) => (
                  <ellipse key={i} ref={ref(`tsh${i}`)} cx="0" cy="0" rx={tr.r * 1.25} ry={tr.r * 0.7} />
                ))}
              </g>
            </g>
            <polyline points={pts([P(-130, 130), P(-130, -130), P(130, -130)])} fill="none" stroke={C.rim} strokeWidth="1" />
            <polyline points={pts([P(-130, 130), P(130, 130), P(130, -130)])} fill="none" stroke="#2b2a24" strokeWidth="1" />

            {/* ============ BACK ROW ============ */}
            {backHouses.map(house)}

            {/* ============ POWER LINES ============ */}
            <g fill="none" stroke={C.wire} strokeWidth="0.9" opacity="0.85">
              {POLE_X.slice(0, -1).map((_, i) => (
                <g key={i}>
                  <path d={dPath(span(poleTop(i), poleTop(i + 1), 7))} />
                  <path d={dPath(span(poleTop(i, 3.5), poleTop(i + 1, 3.5), 7))} opacity="0.6" />
                </g>
              ))}
              {HOUSES.map((h) => (
                <path key={h.id} d={dPath(span(GEO[h.id].attach, poleTop(h.pole), 5, 10))} opacity="0.8" />
              ))}
            </g>
            {POLE_X.map((x, i) => {
              const [bx, by] = P(x, POLE_Y, 0)
              const [tx, ty] = P(x, POLE_Y, POLE_H)
              const [c0x, c0y] = P(x - 7, POLE_Y, POLE_H - 4)
              const [c1x, c1y] = P(x + 7, POLE_Y, POLE_H - 4)
              const [lx, ly] = P(x + 4, POLE_Y + 4, POLE_H - 14)
              return (
                <g key={i}>
                  <g stroke="#5d584d" strokeLinecap="round">
                    <line x1={bx} y1={by} x2={tx} y2={ty} strokeWidth="1.8" />
                    <line x1={c0x} y1={c0y} x2={c1x} y2={c1y} strokeWidth="1.4" />
                    <line x1={bx} y1={ly + 2} x2={lx} y2={ly} strokeWidth="1.1" />
                  </g>
                  <g ref={ref(`lamp${i}`)} opacity="0" visibility="hidden">
                    <circle cx={lx} cy={ly + 1} r="7" fill={`url(#${u("lampPool")})`} />
                    <circle cx={lx} cy={ly + 1} r="1.5" fill="#fff1d2" />
                  </g>
                </g>
              )
            })}
            {/* active routes: faint path ahead, a halo, the current itself */}
            {TRADES.map((tr, j) => (
              <g key={j}>
                <path ref={ref(`rw${j}`)} d={tr.d} fill="none" stroke={C.lime} strokeWidth="0.9" strokeDasharray="1.5 4" strokeLinecap="round" opacity="0" visibility="hidden" />
                <path ref={ref(`rh${j}`)} className="xl-nrg-halo" d={tr.d} fill="none" stroke={C.lime} strokeWidth="7" strokeOpacity="0.16" strokeLinecap="round" strokeLinejoin="round" opacity="0" visibility="hidden" />
                <path ref={ref(`rc${j}`)} className="xl-nrg-cur" d={tr.d} fill="none" stroke="#e9ffad" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0" visibility="hidden" />
              </g>
            ))}
            {/* poles light as the current passes */}
            {POLE_X.map((_, i) => {
              const [x, y] = poleTop(i)
              return (
                <g key={i} ref={ref(`pf${i}`)} opacity="0" visibility="hidden">
                  <circle cx={x} cy={y} r="12" fill={`url(#${u("pk")})`} />
                  <circle ref={ref(`pfr${i}`)} cx={x} cy={y} r="2" fill="none" stroke={C.lime} strokeWidth="1" />
                </g>
              )
            })}
            {TRADES.map((tr, j) => {
              const [x, y] = GEO[tr.to].attach
              return <circle key={j} ref={ref(`ar${j}`)} cx={x} cy={y} r="3" fill="none" stroke={C.lime} strokeWidth="1.3" opacity="0" visibility="hidden" />
            })}
            {TRADES.map((_, j) => (
              <g key={j} ref={ref(`pk${j}`)} opacity="0" visibility="hidden">
                <circle r="16" fill={`url(#${u("pk")})`} />
                <circle r="2.6" fill="#fbffe9" />
              </g>
            ))}

            {/* ============ FRONT ROW ============ */}
            {TREES.map((tr, i) => {
              const [bx, by] = P(tr.x, tr.y, 0)
              const [cx2, cy2] = P(tr.x, tr.y, tr.h)
              return (
                <g key={i}>
                  <line x1={bx} y1={by} x2={cx2} y2={cy2 + tr.r * 0.6} stroke="#4a3f30" strokeWidth="2.4" strokeLinecap="round" />
                  <circle ref={ref(`td${i}`)} cx={cx2 + 1.5} cy={cy2 + 1.5} r={tr.r} fill="#2c3a18" />
                  <circle ref={ref(`tc${i}`)} cx={cx2 - 1.2} cy={cy2 - 1.2} r={tr.r * 0.82} fill="#4c6224" />
                </g>
              )
            })}
            {frontHouses.map(house)}

            {/* ============ LABELS ============ */}
            <g className="xl-nothumb">
              {HOUSES.map((h) => {
                const [x, y] = GEO[h.id].chip
                return (
                  <g key={h.id} ref={ref(`cg${h.id}`)} className="xl-mono" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                    <line x1="0" y1="7" x2="0" y2="13" stroke="#3d3a32" />
                    <rect ref={ref(`chip${h.id}`)} x="-27" y="-8" width="54" height="15" rx="7.5" fill="#121210" stroke={C.rim} />
                    {h.solar && <circle cx="-18.5" cy="-0.5" r="2.2" fill={C.lime} />}
                    <text ref={ref(`chipT${h.id}`)} x={h.solar ? 3 : 0} y="2.6" fontSize="7.6" fill={C.mute} textAnchor="middle" letterSpacing="0.2">
                      {h.addr}
                    </text>
                  </g>
                )
              })}
              {TRADES.map((tr, j) => (
                <g key={j} ref={ref(`fl${j}`)} opacity="0" visibility="hidden">
                  <text ref={ref(`flt${j}`)} className="xl-mono" x="0" y="-14" fontSize="9.6" fill={C.lime} textAnchor="middle" fontWeight="600">
                    +{tr.kwh} kWh
                  </text>
                </g>
              ))}
            </g>
          </g>

          {/* ============ HUD ============ */}
          <g className="xl-mono xl-nothumb">
            <g ref={ref("hudL")}>
              <text ref={ref("clock")} x="40" y="58" fontSize="20" fill={C.paper} letterSpacing="0.5">
                06:00
              </text>
              <text ref={ref("sunDeg")} className="xl-fine" x="41" y="74" fontSize="7.6" fill={C.dim} letterSpacing="1">
                SUN 10°
              </text>
            </g>
            <g ref={ref("hudR")}>
              <text x="760" y="46" fontSize="7.6" fill={C.dim} textAnchor="end" letterSpacing="1">
                ROOFTOP SOLAR
              </text>
              <text ref={ref("solar")} x="760" y="64" fontSize="14" fill={C.lime} textAnchor="end">
                0.0 kW
              </text>
              <rect x="676" y="71" width="84" height="2.5" fill="#2a2923" />
              <rect ref={ref("solarBar")} x="676" y="71" width="0" height="2.5" fill={C.lime} />
            </g>
          </g>

          {/* ============ LEDGER ============ */}
          <g className="xl-mono">
            <rect x="-400" y="448" width="1600" height="120" fill="#11110e" />
            <line x1="-400" x2="1200" y1="448.5" y2="448.5" stroke="#2c2a24" />
            <g ref={ref("tickHead")}>
              <circle ref={ref("liveDot")} cx="40" cy="471" r="2.6" fill={C.lime} />
              <text x="48" y="474" fontSize="8.4" fill={C.paper2} letterSpacing="1.2">
                LEDGER
              </text>
              <text className="xl-fine" x="40" y="487" fontSize="6.8" fill={C.dim} letterSpacing="0.8">
                SMART CONTRACT
              </text>
            </g>
            <line x1="118" x2="118" y1="458" y2="490" stroke="#2c2a24" />
            <g mask={`url(#${u("tickmask")})`}>
              <g ref={ref("tickItems")}>
                {[0, 1, 2, 3].map((q) => (
                  <g key={q} ref={ref(`ti${q}`)} transform={`translate(${132 + q * ITEM_W} 0)`}>
                    <rect ref={ref(`tf${q}`)} x="-10" y="452" width={ITEM_W - 6} height="44" fill={C.lime} opacity="0" />
                    <text ref={ref(`tk${q}`)} x="0" y="479" fontSize="15.5" fill={C.paper} fontWeight="600" />
                    <text ref={ref(`tr${q}`)} className="xl-nothumb" x="80" y="478" fontSize="10.6" fill={C.mute} />
                    <g ref={ref(`tp${q}`)}>
                      <rect ref={ref(`tsb${q}`)} x="208" y="465" width="74" height="18" rx="9" fill="none" stroke={C.dim} />
                      <text ref={ref(`ts${q}`)} x="245" y="477" fontSize="8" fill={C.mute} textAnchor="middle" letterSpacing="0.9" fontWeight="600" />
                    </g>
                    <line x1={ITEM_W - 10} x2={ITEM_W - 10} y1="460" y2="488" stroke="#2c2a24" />
                  </g>
                ))}
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}
