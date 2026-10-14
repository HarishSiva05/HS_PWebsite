// Small, dependency-free helpers shared by the EthChat, Energy and Agrimate exhibits.
// Every exhibit is a pure function of time: render(t) writes the whole frame, so a
// paused exhibit holds its frame and a "still" exhibit is just render(STILL).

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
/** Progress of t through [a, b], clamped to 0..1. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
/** Rises over [a, b], holds, falls over [c, d]. */
export const window4 = (t: number, a: number, b: number, c: number, d: number) => Math.min(seg(t, a, b), 1 - seg(t, c, d))

export const ease = {
  linear: (x: number) => x,
  inCubic: (x: number) => x * x * x,
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: (x: number) => 1 - Math.pow(1 - x, 4),
  inOutQuart: (x: number) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: (x: number) =>
    x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
  outBack: (x: number, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  inOutSine: (x: number) => -(Math.cos(Math.PI * x) - 1) / 2,
}

/** Under-damped spring step response for x seconds after release: 0 → 1 with overshoot. */
export function spring(x: number, zeta = 0.42, omega = 16) {
  if (x <= 0) return 0
  const wd = omega * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * omega * x) * (Math.cos(wd * x) + ((zeta * omega) / wd) * Math.sin(wd * x))
}

/** Deterministic hash of a number to [0, 1). */
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return s - Math.floor(s)
}

export const HEX = "0123456789abcdef"

/**
 * Turns `from` into `to` one character at a time. Characters flicker through `glyphs` while
 * they change; `tick` (a frame counter) drives the flicker so a paused frame stays put.
 */
export function scramble(from: string, to: string, p: number, tick: number, glyphs = HEX, spread = 0.55) {
  if (p <= 0) return from
  if (p >= 1) return to
  const n = Math.max(from.length, to.length)
  let out = ""
  for (let i = 0; i < n; i++) {
    const start = (i / n) * spread
    const end = start + (1 - spread)
    const a = start + (end - start) * 0.15
    if (p < start) out += from[i] ?? ""
    else if (p >= end) out += to[i] ?? ""
    else if (p < a && from[i] === " ") out += " "
    else out += glyphs[Math.floor(hash(i * 13.7 + tick * 1.618) * glyphs.length)]
  }
  return out
}

/** Points sampled along a polyline, with cumulative lengths, for constant-speed travel. */
export type Track = { pts: [number, number][]; len: number[]; total: number }

export function track(pts: [number, number][]): Track {
  const len = [0]
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    len.push(len[i - 1] + Math.hypot(bx - ax, by - ay))
  }
  return { pts, len, total: len[len.length - 1] }
}

export function along(tr: Track, p: number): [number, number, number] {
  const d = clamp(p) * tr.total
  let i = 1
  while (i < tr.len.length - 1 && tr.len[i] < d) i++
  const a = tr.pts[i - 1]
  const b = tr.pts[i]
  const span = tr.len[i] - tr.len[i - 1] || 1
  const k = (d - tr.len[i - 1]) / span
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0])]
}

export function cubic(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  steps = 40,
): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return out
}

export const pathOf = (pts: [number, number][]) =>
  pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("")

/** Hex colour mix, a → b by t. */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const k = clamp(t)
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, k))
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, k))
  const bl = Math.round(lerp(pa & 255, pb & 255, k))
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`
}

const fmt = (v: number) => String(Math.round(v * 100) / 100)

/**
 * Writes attributes, styles and text only when they change, so holds and paused frames
 * cost nothing and the browser is never asked to restyle a node that did not move.
 */
export function writer() {
  const cache = new WeakMap<Element, Map<string, string>>()
  const slot = (el: Element) => {
    let m = cache.get(el)
    if (!m) cache.set(el, (m = new Map()))
    return m
  }
  return {
    attr(el: Element | undefined | null, k: string, v: string | number) {
      if (!el) return
      const s = typeof v === "number" ? fmt(v) : v
      const m = slot(el)
      if (m.get(k) === s) return
      m.set(k, s)
      el.setAttribute(k, s)
    },
    style(el: Element | undefined | null, k: string, v: string | number) {
      if (!el) return
      const s = typeof v === "number" ? fmt(v) : v
      const m = slot(el)
      if (m.get("s:" + k) === s) return
      m.set("s:" + k, s)
      ;(el as HTMLElement).style.setProperty(k, s)
    },
    text(el: Element | undefined | null, s: string) {
      if (!el) return
      const m = slot(el)
      if (m.get("#text") === s) return
      m.set("#text", s)
      el.textContent = s
    },
    /** Opacity as an attribute (SVG) with a matching visibility toggle so hidden nodes are skipped. */
    fade(el: Element | undefined | null, o: number) {
      if (!el) return
      const v = clamp(o)
      this.attr(el, "opacity", v)
      this.attr(el, "visibility", v < 0.004 ? "hidden" : "visible")
    },
  }
}
export type Writer = ReturnType<typeof writer>

/** A stable unique id fragment for SVG defs, so several copies of an exhibit can share a page. */
export const cleanId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, "")
