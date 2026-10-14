// The attribution engine's clock. Maps time to a frame, paints the canvas and writes the few
// DOM values that change (counter, legend, stream, leaderboard), outside React. One rAF loop,
// running only while the exhibit is live, active and the tab is visible.

import { play } from "@/lib/sound"
import { MatrixRenderer, type MatrixFrame } from "./apt-render"
import {
  ACCURACY_TEXT,
  APT_MODELS,
  CORRECT,
  DUR,
  LANDS,
  LANDS_OK,
  LAST_LAND,
  MISS_SAMPLES,
  N,
  OPCODES,
  PREFIX_ALL,
  PREFIX_OK,
  TOTAL,
  axisFrac,
  clamp01,
  clockFor,
  countLE,
  describeCell,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  pad2,
  pad3,
  scanRows,
  type Clock,
} from "./apt-model"

// ============ LAYOUT ============

export type Size = "xl" | "l" | "m" | "s" | "xs"

export type Layout = {
  W: number
  H: number
  dpr: number
  size: Size
  orient: "row" | "col"
  pad: number
  /** left and bottom gutters of the matrix block (tick labels, axis titles), css px */
  gl: number
  gb: number
  /** cell pitch, gap and canvas margin in device px */
  P: number
  cg: number
  M: number
  /** grid side and pitch in css px */
  grid: number
  pc: number
  mx: { x: number; y: number; w: number; h: number }
  panel: { x: number; y: number; w: number; h: number }
  /** status line above the readout */
  status: boolean
  stream: boolean
  /** which visible stream line is the read head */
  streamHead: number
  /** legend on two lines */
  legend2: boolean
  /** leaderboard: one line per model, name over track, abbreviated lines (phones), or bare dots (thumbnails) */
  board: "wide" | "stack" | "compact" | "dots"
  /** leaderboard caption line */
  boardCap: boolean
  /** full model names or RF / SVM / KNN / DT */
  fullNames: boolean
  /** every whole percent on the axis, or just the ends and the middle */
  ticksAll: boolean
  ticks: boolean
  titles: boolean
  note: boolean
  interactive: boolean
  fs: { tick: number; label: number; stream: number; board: number; big: number }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// em widths of the wide leaderboard columns (name, value, tag) and its gaps; mirrored in the CSS
const C_NAME = 9.2
const C_VAL = 3.2
const C_TAG = 3.7
const C_GAP = 0.9

export function computeLayout(W: number, H: number, dprRaw: number): Layout {
  const dpr = clamp(dprRaw || 1, 1, 2)
  const orient = W / H >= 1.18 ? "row" : "col"
  const size: Size = W >= 760 ? "xl" : W >= 590 ? "l" : W >= 460 ? "m" : W >= 280 ? "s" : "xs"
  const k = clamp(W / 900, 0.5, 1.3)
  const pad = Math.round(clamp(W * 0.026, 7, 28))
  const gap = Math.round(clamp(W * 0.036, 9, 38))
  const titles = size === "xl" || size === "l"
  const ticks = size !== "xs"
  const tick = clamp(9 * k, 7.5, 11)
  const gl = titles ? Math.round(tick * 2.6 + 12) : ticks ? Math.round(tick * 1.5 + 5) : 0
  const gb = titles ? Math.round(tick * 2.6 + 11) : ticks ? Math.round(tick * 1.3 + 5) : 0

  const row = orient === "row"
  const xs = size === "xs"
  const fsL = clamp(10 * k, xs ? 7 : 8.5, 12.5)
  const fsB = fsL
  const fsS = clamp(11 * k, 9, 13.5)

  // ---- panel budget, mirrored from the CSS (line-height 1.2) ----
  const status = row && (size === "xl" || size === "l" || size === "m")
  const statusH = status ? fsL * 4.05 + 1 : 0
  const kickerH = fsL * 1.2
  const gapMin = fsL * 1.4
  const boardCap = !xs && W >= 330
  const capH = boardCap ? fsB * 1.7 : 0
  const padTop = fsB * 1.3
  const H_WIDE = padTop + capH + 4 * fsB * 2.15 + fsB * 1.75
  const H_STACK = padTop + capH + 4 * (fsB * 2.05 + 9) + fsB * 1.75
  const H_COMPACT = padTop + capH + 4 * fsB * 2
  const H_DOTS = 6 + 4 * 9
  const trackOf = (w: number) => w - (C_NAME + C_VAL + C_TAG + 3 * C_GAP) * fsB

  let side: number
  let mx: Layout["mx"]
  let panel: Layout["panel"]
  let board: Layout["board"]
  let boardH: number
  let readW: number
  let boardW: number
  let P: number

  if (row) {
    const share = size === "xl" ? 0.335 : size === "l" ? 0.355 : 0.36
    side = Math.min(H - 2 * pad - gb, W - 2 * pad - gl - gap - W * share)
    P = Math.max(2, Math.floor((Math.max(N, side) * dpr) / N))
    const grid = (P / dpr) * N
    const bw = gl + grid
    const bh = grid + gb
    mx = { x: pad, y: pad + Math.round((H - 2 * pad - bh) / 2), w: bw, h: bh }
    const px = Math.round(pad + bw + gap)
    panel = { x: px, y: pad, w: W - pad - px, h: H - 2 * pad }
    readW = boardW = panel.w
    const legendH0 = xs ? 0 : readW < fsL * 27 ? fsL * 2.85 : fsL * 1.2
    const readH0 = statusH + kickerH + legendH0
    const widthCap0 = Math.min(panel.w * 0.33, 140)
    if (xs) {
      board = "dots"
      boardH = H_DOTS
    } else if (trackOf(boardW) >= 120) {
      board = "wide"
      boardH = H_WIDE
    } else if ((panel.h - readH0 - H_STACK - gapMin) / 1.14 >= widthCap0 * 0.9) {
      board = "stack"
      boardH = H_STACK
    } else {
      board = "compact"
      boardH = H_COMPACT
    }
  } else {
    // portrait or square: size the readout | leaderboard row first, give the matrix the rest
    const pw = W - 2 * pad
    readW = pw * 0.45
    boardW = pw * 0.5
    const legendH0 = xs ? 0 : readW < fsL * 27 ? fsL * 2.85 : fsL * 1.2
    const big0 = clamp(Math.min(readW * 0.44, 96), 16, 96)
    const readNeed = kickerH + big0 * 1.14 + legendH0
    if (xs) {
      board = "dots"
      boardH = H_DOTS
    } else if (trackOf(boardW) >= 120) {
      board = "wide"
      boardH = H_WIDE
    } else if (H - 2 * pad - gb - gap - Math.max(readNeed, H_STACK) >= 150) {
      board = "stack"
      boardH = H_STACK
    } else {
      board = "compact"
      boardH = H_COMPACT
    }
    const need = Math.max(readNeed, boardH)
    side = Math.min(pw - gl, H - 2 * pad - gb - gap - need)
    P = Math.max(2, Math.floor((Math.max(N, side) * dpr) / N))
    const grid = (P / dpr) * N
    const bw = gl + grid
    const bh = grid + gb
    const top = pad + Math.max(0, Math.round((H - 2 * pad - (bh + gap + need)) / 2))
    mx = { x: pad + Math.round((pw - bw) / 2), y: top, w: bw, h: bh }
    const py = Math.round(top + bh + gap)
    panel = { x: pad, y: py, w: pw, h: Math.max(need, H - pad - py) }
  }

  const cg = P >= 22 ? 2 : 1
  const M = Math.ceil(P * 1.9)
  const pc = P / dpr
  const grid = pc * N

  const legend2 = !xs && readW < fsL * 27
  const legendH = xs ? 0 : legend2 ? fsL * 2.85 : fsL * 1.2
  const readH = statusH + kickerH + legendH
  const widthCap = row ? Math.min(panel.w * 0.33, 140) : Math.min(readW * 0.44, 96)
  const wideTrack = trackOf(boardW)
  const fullNames = board === "wide" || (board === "stack" && boardW >= fsB * 19)
  const ticksAll = (board === "wide" ? wideTrack : boardW) >= 110

  let big: number
  let stream = false
  let streamHead = 1
  if (row) {
    const fixed = readH + boardH + gapMin
    big = Math.min(widthCap, (panel.h - fixed) / 1.14)
    if (status) {
      // the stream needs its caption, margins and at least three lines
      const lh = fsS * 1.55
      const need = fsL * 4 + lh * 3.2
      const room = (b: number) => panel.h - fixed - b * 1.14
      if (room(big) >= need) stream = true
      else if (room(widthCap * 0.82) >= need) {
        stream = true
        big = widthCap * 0.82
      }
      // the read head sits about mid-window
      const lines = (room(big) - fsL * 4) / lh
      streamHead = Math.round(clamp(lines * 0.5 - 0.5, 1, 3))
    }
  } else {
    big = Math.min(widthCap, (panel.h - kickerH - legendH - 4) / 1.14)
  }
  big = clamp(big, 16, 140)

  return {
    W,
    H,
    dpr,
    size,
    orient,
    pad,
    gl,
    gb,
    P,
    cg,
    M,
    grid,
    pc,
    mx,
    panel,
    status,
    stream,
    streamHead,
    legend2,
    board,
    boardCap,
    fullNames,
    ticksAll,
    ticks,
    titles,
    note: (size === "xl" || size === "l") && grid >= 340,
    interactive: size !== "xs",
    fs: { tick, label: fsL, stream: fsS, board: fsB, big },
  }
}

// ============ ENGINE ============

type Phase = "intro" | "scan" | "resolve" | "hold" | "outro"

type Row = { pos: HTMLElement; val: HTMLElement; trail: HTMLElement | null }

type Els = {
  status: HTMLElement | null
  kicker: HTMLElement | null
  big: HTMLElement | null
  chars: HTMLElement[]
  flare: HTMLElement | null
  ok: HTMLElement | null
  miss: HTMLElement | null
  scols: HTMLElement[]
  lines: HTMLElement[][]
  rows: Row[]
  best: HTMLElement | null
  spill: HTMLElement | null
  beamTag: HTMLElement | null
  note: HTMLElement | null
  notePath: SVGPathElement | null
  tip: HTMLElement | null
  tipV: HTMLElement | null
  tipL: HTMLElement | null
  hlx: HTMLElement | null
  hly: HTMLElement | null
  live: HTMLElement | null
}

const STREAM_PER_ROW = 3.4
/** seconds into the resolve phase when the last sample has landed and the accuracy is revealed */
const DECODE_AT = LAST_LAND - DUR.scan + 0.32
const FINAL_T = () => clockFor(false).hold0 + 0.001

export class AptEngine {
  private renderer: MatrixRenderer
  private els: Els | null = null
  private L: Layout | null = null
  private clock: Clock = clockFor(true)
  private t = 0
  private first = true
  private run = 0
  private started = false
  private running = false
  private raf = 0
  private last = 0
  private active = false
  private still = false
  private freeze: number | undefined
  private hover: { r: number; c: number } | null = null
  private kbd = false
  private cache = new WeakMap<Element, Map<string, string>>()
  private holdDrawn = false

  constructor(
    private root: HTMLElement,
    canvas: HTMLCanvasElement,
  ) {
    this.renderer = new MatrixRenderer(canvas)
    document.addEventListener("visibilitychange", this.sync)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
    this.running = false
    document.removeEventListener("visibilitychange", this.sync)
  }

  /** Re-collect the DOM nodes after React (re)rendered the structure. */
  bind() {
    const q = <T extends Element = HTMLElement>(k: string) => this.root.querySelector<T>(`[data-a="${k}"]`) as T | null
    const all = (k: string, within: ParentNode = this.root) =>
      Array.from(within.querySelectorAll<HTMLElement>(`[data-a="${k}"]`))
    const scols = all("scol")
    this.els = {
      status: q("status"),
      kicker: q("kicker"),
      big: q("big"),
      chars: all("ch"),
      flare: q("flare"),
      ok: q("nok"),
      miss: q("nmiss"),
      scols,
      lines: scols.map((c) => all("op", c)),
      rows: all("row").map((r) => ({
        pos: r.querySelector<HTMLElement>('[data-a="pos"]')!,
        val: r.querySelector<HTMLElement>('[data-a="val"]')!,
        trail: r.querySelector<HTMLElement>('[data-a="trail"]'),
      })),
      best: q("best"),
      spill: q("spill"),
      beamTag: q("beamtag"),
      note: q("note"),
      notePath: q<SVGPathElement>("notepath"),
      tip: q("tip"),
      tipV: q("tipv"),
      tipL: q("tipl"),
      hlx: q("hlx"),
      hly: q("hly"),
      live: q("live"),
    }
    this.cache = new WeakMap()
  }

  setLayout(L: Layout) {
    this.L = L
    this.renderer.resize({ dpr: L.dpr, P: L.P, gap: L.cg, M: L.M })
    this.holdDrawn = false
    this.paintTip()
    this.paint()
  }

  set(opts: { active: boolean; still: boolean; freeze?: number }) {
    this.active = opts.active
    this.still = opts.still
    this.freeze = opts.freeze
    this.holdDrawn = false
    this.sync()
    if (!this.running) this.paint()
  }

  setHover(cell: { r: number; c: number } | null, keyboard = false) {
    const same = cell && this.hover && cell.r === this.hover.r && cell.c === this.hover.c
    if (same || (!cell && !this.hover)) return
    this.hover = cell
    this.kbd = keyboard
    this.holdDrawn = false
    this.paintTip()
    if (!this.running) this.paint()
  }

  get hovered() {
    return this.hover
  }

  // ---- clock ----

  private sync = () => {
    const want =
      this.active && !this.still && this.freeze === undefined && typeof document !== "undefined" && !document.hidden
    if (want === this.running) return
    this.running = want
    if (want) {
      if (!this.started) {
        // first activation: power the grid on from black
        this.started = true
        this.t = 0
        this.first = true
        this.clock = clockFor(true)
      }
      this.root.dataset.running = "1"
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.tick)
    } else {
      this.root.dataset.running = "0"
      cancelAnimationFrame(this.raf)
      this.raf = 0
    }
  }

  private tick = (now: number) => {
    this.raf = 0
    if (!this.running) return
    // clamp: a long frame (or a resume) never jumps the replay forward
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000))
    this.last = now
    const prev = this.t
    this.t += dt
    this.sounds(prev, this.t)
    if (this.t >= this.clock.end) {
      this.t -= this.clock.end
      this.first = false
      this.run++
      this.clock = clockFor(false)
    }
    this.paint()
    this.raf = requestAnimationFrame(this.tick)
  }

  private sounds(a: number, b: number) {
    if (this.run > 0) return
    const k = this.clock
    for (const m of MISS_SAMPLES) {
      const tl = k.scan0 + m.land
      if (tl > a && tl <= b) play("tick", { volume: 0.5 })
    }
    const done = k.res0 + DECODE_AT + 0.14 + (ACCURACY_TEXT.length - 1) * 0.09 + 0.3
    if (done > a && done <= b) play("chime", { volume: 0.6 })
  }

  // ---- frame ----

  private current(): { t: number; first: boolean; clock: Clock } {
    if (this.freeze !== undefined) return { t: this.freeze, first: true, clock: clockFor(true) }
    if (this.still || !this.started) return { t: FINAL_T(), first: false, clock: clockFor(false) }
    return { t: this.t, first: this.first, clock: this.clock }
  }

  paint() {
    const L = this.L
    const els = this.els
    if (!L || !els) return
    const { t, first, clock: k } = this.current()
    const phase: Phase =
      t < k.scan0 ? "intro" : t < k.res0 ? "scan" : t < k.hold0 ? "resolve" : t < k.out0 ? "hold" : "outro"
    const s = t - k.scan0
    const rr = t - k.res0
    const hh = t - k.hold0
    const o = clamp01((t - k.out0) / DUR.outro)

    // ---- matrix frame ----
    const f: MatrixFrame = {
      s: phase === "hold" || phase === "outro" ? 1e6 : s,
      power: first ? clamp01(t / (k.scan0 * 0.8)) : 1,
      beam: -1,
      beamAlpha: 0,
      beamDir: 1,
      cut: N,
      litFade: 1,
      shimmer: -99,
      shimmerAmp: 0,
      band: 0,
      hover: this.hover,
    }
    if (phase === "intro") f.cut = first ? N : 0
    if (phase === "scan") {
      f.beam = scanRows(s)
      f.beamAlpha = Math.min(1, s / 0.3)
    } else if (phase === "resolve") {
      f.beam = N
      f.beamAlpha = 1 - clamp01(rr / 0.4)
      if (rr > 0.35 && rr < 1.6) {
        f.shimmer = -3 + ((rr - 0.35) / 1.1) * (N + 6)
        f.shimmerAmp = 1
      }
      f.band = easeOutCubic((rr - 1.75) / 0.6)
    } else if (phase === "hold") {
      f.band = 1
      if (hh > 2.6 && hh < 3.9) {
        f.shimmer = -3 + ((hh - 2.6) / 1.3) * (N + 6)
        f.shimmerAmp = 0.42
      }
    } else if (phase === "outro") {
      const e = easeInOutCubic(o)
      f.beam = N * (1 - e)
      f.beamDir = -1
      f.beamAlpha = 0.8 * Math.min(1, o * 8, (1 - o) * 6)
      f.cut = f.beam
      f.band = 1 - clamp01(o * 3)
    }
    if (f.beam >= 0 && f.beamAlpha <= 0) f.beam = -1

    const animatedHold = phase === "hold" && f.shimmer > -4
    if (phase !== "hold" || animatedHold || !this.holdDrawn) {
      this.renderer.draw(f)
      this.holdDrawn = phase === "hold" && !animatedHold
    }

    // ---- counters ----
    let classified = 0
    let ok = 0
    if (phase === "scan" || phase === "resolve") {
      classified = countLE(LANDS, s)
      ok = countLE(LANDS_OK, s)
    } else if (phase === "hold") {
      classified = TOTAL
      ok = CORRECT
    } else if (phase === "outro") {
      const rows = Math.max(0, Math.min(N, Math.floor(f.cut)))
      classified = PREFIX_ALL[rows]
      ok = PREFIX_OK[rows]
    }
    const missed = classified - ok
    this.w(els.ok, "text", String(ok))
    this.w(els.miss, "text", String(missed))

    // ---- the big readout: the counter, then the accuracy, declassified digit by digit ----
    // Only real values are ever on screen: the counter counts replayed samples, and the accuracy
    // is revealed from under tape, never scrambled through made-up numbers.
    const decodeAt = DECODE_AT
    const accMode = phase === "hold" || (phase === "resolve" && rr >= decodeAt) || (phase === "outro" && o < 0.3)
    this.w(els.big, "text", pad3(classified))
    this.w(this.root, "data-done", accMode ? "1" : "0")
    els.chars.forEach((ch, i) => {
      let k = 0
      if (phase === "resolve") k = 1 - easeInOutCubic((rr - decodeAt - 0.14 - i * 0.09) / 0.34)
      else if (phase === "outro") k = easeOutCubic(o / 0.16)
      this.w(ch, "--k", clamp01(k).toFixed(3))
    })
    if (els.flare) {
      // one pulse of light as the last strip of tape comes off
      const peak = decodeAt + 0.14 + (ACCURACY_TEXT.length - 1) * 0.09 + 0.3
      let fl = 0
      if (phase === "resolve" && rr >= decodeAt) {
        const d = rr - peak
        fl = d < 0 ? clamp01(1 + d / 0.25) : Math.exp(-d / 0.5)
      }
      this.w(els.flare, "opacity", fl.toFixed(3))
    }
    this.w(this.root, "data-phase", phase)
    const short = !L.status
    this.w(
      els.kicker,
      "text",
      accMode
        ? short
          ? "Accuracy"
          : `Accuracy · ${TOTAL} held-out samples`
        : short
          ? "Classified"
          : "Classifying held-out samples",
    )
    this.w(
      els.status,
      "text",
      phase === "intro"
        ? first
          ? "Loading samples"
          : "Replay"
        : phase === "outro"
          ? "Rewind"
          : accMode
            ? "Complete"
            : "Classifying",
    )

    // ---- opcode stream ----
    if (L.stream && els.scols.length) {
      const scanned = phase === "scan" ? scanRows(s) : phase === "intro" ? 0 : N
      const pos = (this.run * N + scanned) * STREAM_PER_ROW
      const base = Math.floor(pos)
      const lh = L.fs.stream * 1.55
      const y = -(pos - base) * lh
      for (const col of els.scols) this.w(col, "transform", `translate3d(0,${y.toFixed(2)}px,0)`)
      for (const lines of els.lines)
        lines.forEach((el, i) => {
          const [a, b] = OPCODES[(base + i) % OPCODES.length]
          this.w(el, "text", `${a.padEnd(10, " ")} ${b}`)
        })
    }

    // ---- leaderboard: dots slide to their accuracy on a 92-96% scale ----
    els.rows.forEach((row, i) => {
      let p = 0
      let v = 0
      if (phase === "resolve") {
        // beat two: the leaderboard, once the number is out
        const u = (rr - 1.35 - i * 0.13) / 1.1
        p = easeOutExpo(u)
        v = u > 0 && u < 1 ? Math.pow(2, -10 * u) : 0
      } else if (phase === "hold") p = 1
      else if (phase === "outro") p = 1 - easeInOutCubic(o * 1.25)
      const target = axisFrac(APT_MODELS[i].accuracy * 100)
      const x = target * p
      this.w(row.pos, "transform", `translate3d(${(x * 100).toFixed(3)}%,0,0)`)
      // until a model's dot starts moving it is not shown at all: a parked dot would read as "92%"
      this.w(row.pos, "opacity", p > 0.001 ? "1" : "0")
      if (row.trail) this.w(row.trail, "transform", `scaleX(${v.toFixed(3)})`)
      // the value appears when the dot lands; no in-between numbers
      this.w(row.val, "text", p > 0.985 ? (APT_MODELS[i].accuracy * 100).toFixed(1) : "--.-")
    })
    if (els.best) {
      let b = 0
      if (phase === "resolve") b = clamp01((rr - 2.35) / 0.45)
      else if (phase === "hold") b = 1
      else if (phase === "outro") b = 1 - clamp01(o * 4)
      const sc = phase === "outro" ? 1 : 1.55 - 0.55 * easeOutBack(b)
      this.w(els.best, "opacity", b <= 0 ? "0" : String(Math.min(1, b * 3).toFixed(3)))
      this.w(els.best, "transform", `rotate(-5deg) scale(${sc.toFixed(3)})`)
    }

    // ---- the analyst's note on the column that collects the misses ----
    if (els.note) {
      let n = 0
      let a = 0
      if (phase === "resolve") {
        // beat three: the analyst's note
        n = clamp01((rr - 1.9) / 0.5)
        a = clamp01((rr - 2.15) / 0.6)
      } else if (phase === "hold") n = a = 1
      else if (phase === "outro") n = a = 1 - clamp01(o * 3.5)
      this.w(els.note, "opacity", n.toFixed(3))
      this.w(els.note, "transform", `translate3d(0,${((1 - easeOutCubic(n)) * 6).toFixed(2)}px,0)`)
      if (els.notePath) this.w(els.notePath, "stroke-dashoffset", String(((1 - easeInOutCubic(a)) * 100).toFixed(2)))
    }

    // ---- the read head: which actual group the beam is classifying ----
    if (els.beamTag) {
      const on = f.beam >= 0 && f.beamAlpha > 0
      const row = Math.max(0, Math.min(N - 1, Math.floor(f.beam)))
      this.w(els.beamTag, "text", pad2(row))
      this.w(els.beamTag, "--y", `${(f.beam * L.pc).toFixed(1)}px`)
      this.w(els.beamTag, "opacity", on ? f.beamAlpha.toFixed(3) : "0")
    }

    // ---- the beam lights the room ----
    if (els.spill) {
      const y = L.mx.y + (f.beam >= 0 ? f.beam : N) * L.pc
      this.w(els.spill, "transform", `translate3d(0,${y.toFixed(1)}px,0)`)
      this.w(els.spill, "opacity", (f.beam >= 0 ? f.beamAlpha : 0).toFixed(3))
    }
  }

  // ---- tooltip ----

  private paintTip() {
    const els = this.els
    const L = this.L
    if (!els || !L) return
    const h = this.hover
    this.w(this.root, "data-hover", h ? "1" : "0")
    if (!h) return
    const d = describeCell(h.r, h.c)
    // cell centre in the matrix block's coordinates
    const x = L.gl + (h.c + 0.5) * L.pc
    const y = (h.r + 0.5) * L.pc
    this.w(els.tipV, "text", d.value)
    this.w(els.tipL, "text", d.label)
    this.w(els.hly, "text", pad2(h.r))
    this.w(els.hlx, "text", pad2(h.c))
    if (els.hly) this.w(els.hly, "--y", `${y.toFixed(1)}px`)
    if (els.hlx) this.w(els.hlx, "--x", `${(x - L.gl).toFixed(1)}px`)
    if (els.tip) {
      this.w(els.tip, "data-kind", d.kind)
      // place the bubble clear of the cursor reticle and inside the exhibit (one layout read per new cell)
      const bw = els.tip.offsetWidth
      const bh = els.tip.offsetHeight
      const gx = 28
      const gy = 24
      const minX = -L.mx.x + 6
      const maxX = L.W - L.mx.x - 6
      const minY = -L.mx.y + 6
      const maxY = L.H - L.mx.y - 6
      // prefer the right of the cell while it stays over the matrix, then the left, then centre it
      const matrixR = L.gl + L.grid + 8
      let left = x + gx
      if (left + bw > matrixR) {
        const alt = x - gx - bw
        if (alt >= minX) left = alt
        else if (left + bw > maxX) left = Math.max(minX, Math.min(x - bw / 2, maxX - bw))
      }
      let top = y - gy - bh
      if (top < minY) top = y + gy
      if (top + bh > maxY) top = Math.max(minY, maxY - bh)
      this.w(els.tip, "--tx", `${left.toFixed(1)}px`)
      this.w(els.tip, "--ty", `${top.toFixed(1)}px`)
    }
    if (this.kbd && els.live) els.live.textContent = `${d.value}, ${d.label}`
  }

  // ---- cached DOM writes ----

  private w(el: Element | null, prop: string, v: string) {
    if (!el) return
    let m = this.cache.get(el)
    if (!m) {
      m = new Map()
      this.cache.set(el, m)
    }
    if (m.get(prop) === v) return
    m.set(prop, v)
    if (prop === "text") el.textContent = v
    else if (prop.startsWith("data-") || prop === "stroke-dashoffset") el.setAttribute(prop, v)
    else if (prop.startsWith("--")) (el as HTMLElement).style.setProperty(prop, v)
    else (el as HTMLElement).style.setProperty(prop, v)
  }
}

