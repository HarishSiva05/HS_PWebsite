// Canvas renderer for the 35 x 35 confusion matrix. Draws one frame from a plain description
// (MatrixFrame), so the live loop, the still frame and frozen test frames share one code path.
// All coordinates are device pixels; the canvas is DPR-capped by the caller.

import {
  DIAG_MAX,
  LANDS,
  LIT,
  MAGNET,
  MISS_MAX,
  MISS_SAMPLES,
  N,
  SAMPLES,
  clamp01,
  countLE,
  easeOutCubic,
} from "./apt-model"

export type MatrixGeom = {
  dpr: number
  /** cell pitch, device px */
  P: number
  /** gap between cells, device px */
  gap: number
  /** canvas margin around the grid (room for glow, beam caps and tracers), device px */
  M: number
}

export type MatrixFrame = {
  /** scan-relative seconds: samples with land <= s are in their cells */
  s: number
  /** grid power-on, 0..1 */
  power: number
  /** beam position in rows (0..N); < 0 hides it */
  beam: number
  beamAlpha: number
  /** 1 scanning down, -1 rewinding up */
  beamDir: 1 | -1
  /** rows at or below this index are wiped (the rewind); N shows everything */
  cut: number
  /** global multiplier for lit cells */
  litFade: number
  /** diagonal shimmer centre in cells; < -4 disables */
  shimmer: number
  shimmerAmp: number
  /** highlight of the column that collects the most misses, 0..1 */
  band: number
  hover: { r: number; c: number } | null
}

const LIME: [number, number, number] = [200, 255, 61]
const RED: [number, number, number] = [255, 84, 56]
const BASE: [number, number, number] = [31, 31, 27]
const BASE_ALT: [number, number, number] = [26, 26, 22]

const rgb = (c: readonly number[], a = 1) =>
  a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`
const mix = (a: readonly number[], b: readonly number[], t: number) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

// Sequential ramps (one hue each): more samples, brighter cell. Anchored at zero, so a cell's
// brightness is proportional to its count, not stretched between the min and max.
const LIME_RAMP = Array.from({ length: DIAG_MAX + 1 }, (_, n) => rgb(mix(BASE, LIME, 0.2 + 0.8 * (n / DIAG_MAX))))
const RED_RAMP = Array.from({ length: MISS_MAX + 1 }, (_, n) => rgb(mix(BASE, RED, 0.62 + 0.38 * (n / MISS_MAX))))

const oddBlock = (r: number, c: number) => (Math.floor(r / 5) + Math.floor(c / 5)) % 2 === 1

function sprite(c: readonly number[]) {
  const s = document.createElement("canvas")
  s.width = s.height = 64
  const x = s.getContext("2d")!
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, rgb(c, 0.85))
  g.addColorStop(0.22, rgb(c, 0.34))
  g.addColorStop(0.55, rgb(c, 0.08))
  g.addColorStop(1, rgb(c, 0))
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  return s
}

export class MatrixRenderer {
  private ctx: CanvasRenderingContext2D
  private base: HTMLCanvasElement | null = null
  private glowLime: HTMLCanvasElement
  private glowRed: HTMLCanvasElement
  private g: MatrixGeom | null = null
  private px = 0

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!
    this.glowLime = sprite(LIME)
    this.glowRed = sprite(RED)
  }

  resize(g: MatrixGeom) {
    this.g = g
    this.px = g.P * N + 2 * g.M
    this.canvas.width = this.px
    this.canvas.height = this.px
    const css = `${this.px / g.dpr}px`
    this.canvas.style.width = css
    this.canvas.style.height = css
    this.base = this.buildBase()
  }

  private buildBase() {
    const g = this.g!
    const b = document.createElement("canvas")
    b.width = b.height = this.px
    const x = b.getContext("2d")!
    const S = g.P - g.gap
    for (const alt of [false, true]) {
      x.fillStyle = rgb(alt ? BASE_ALT : BASE)
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) {
          // 5 x 5 blocks alternate a shade, like graph paper, so rows and columns are easy to follow
          if (oddBlock(r, c) !== alt) continue
          x.fillRect(g.M + c * g.P, g.M + r * g.P, S, S)
        }
    }
    return b
  }

  draw(f: MatrixFrame) {
    const g = this.g
    if (!g || !this.base) return
    const { ctx } = this
    const { P, M, gap, dpr } = g
    const S = P - gap
    const span = N * P
    ctx.globalCompositeOperation = "source-over"
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, this.px, this.px)

    // 1. the grid
    if (f.power >= 1) ctx.drawImage(this.base, 0, 0)
    else if (f.power > 0) this.drawPowerOn(f.power)

    // 2. the column that collects the most misattributions
    if (f.band > 0 && MAGNET.col >= 0) {
      const x = M + MAGNET.col * P
      ctx.fillStyle = rgb(RED, 0.075 * f.band)
      ctx.fillRect(x - gap, M - P * 0.5, P + gap, span + P)
      ctx.fillStyle = rgb(RED, 0.4 * f.band)
      const lw = Math.max(1, Math.round(dpr * 0.75))
      ctx.fillRect(x - gap - lw, M - P * 0.5, lw, span + P)
      ctx.fillRect(x + P, M - P * 0.5, lw, span + P)
    }

    // 3. beam trail (phosphor afterglow), kept inside the grid
    const beamOn = f.beam >= 0 && f.beamAlpha > 0
    const by = M + f.beam * P
    const bx0 = M - P * 0.45
    const bw = span + P * 0.9
    if (beamOn) {
      ctx.globalCompositeOperation = "lighter"
      const len = (f.beamDir === 1 ? 3.6 : 2.4) * P
      const y0 = f.beamDir === 1 ? by - len : by
      const gr = ctx.createLinearGradient(0, y0, 0, y0 + len)
      if (f.beamDir === 1) {
        gr.addColorStop(0, rgb(LIME, 0))
        gr.addColorStop(1, rgb(LIME, 0.13 * f.beamAlpha))
      } else {
        gr.addColorStop(0, rgb(LIME, 0.1 * f.beamAlpha))
        gr.addColorStop(1, rgb(LIME, 0))
      }
      const top = Math.max(M, y0)
      const bottom = Math.min(M + span, y0 + len)
      if (bottom > top) {
        ctx.fillStyle = gr
        ctx.fillRect(M, top, span, bottom - top)
      }
      ctx.globalCompositeOperation = "source-over"
    }

    // 4. lit cells
    const fade = f.litFade
    if (fade > 0) {
      for (const L of LIT) {
        if (L.r >= f.cut) continue
        const shown = countLE(L.lands, f.s)
        let flash = 0
        for (const t of L.lands) {
          const a = f.s - t
          if (a >= 0 && a < 1.2) flash += Math.exp(-a / (L.ok ? 0.14 : 0.42))
        }
        flash = Math.min(1, flash)
        let boost = 0
        if (L.ok && f.shimmer > -4) {
          const d = L.r - f.shimmer
          boost = f.shimmerAmp * Math.exp(-(d * d) / 2.2)
        }
        if (shown === 0 && flash < 0.02) continue
        const x = M + L.c * P
        const y = M + L.r * P
        const cx = x + S / 2
        const cy = y + S / 2
        const lvl = L.ok ? shown / DIAG_MAX : shown / MISS_MAX

        if (shown > 0) {
          ctx.globalAlpha = fade
          ctx.fillStyle = L.ok ? LIME_RAMP[shown] : RED_RAMP[shown]
          ctx.fillRect(x, y, S, S)
          if (P >= 16) {
            // a lit tile has a bevel: light top edge, shaded bottom edge
            const e = Math.max(1, Math.round(dpr))
            ctx.fillStyle = "rgba(255,255,255,0.28)"
            ctx.fillRect(x, y, S, e)
            ctx.fillStyle = "rgba(0,0,0,0.22)"
            ctx.fillRect(x, y + S - e, S, e)
          }
        }
        // bloom
        ctx.globalCompositeOperation = "lighter"
        const hot = Math.min(1, flash + boost)
        const R = P * (L.ok ? 1.25 + 0.75 * lvl + 1.3 * hot : 1.5 + 1.8 * hot)
        ctx.globalAlpha = Math.min(1, (L.ok ? 0.12 + 0.3 * lvl : 0.32 + 0.2 * lvl) * fade + 0.62 * hot)
        ctx.drawImage(L.ok ? this.glowLime : this.glowRed, cx - R, cy - R, R * 2, R * 2)
        if (hot > 0.02) {
          // white-hot core while a sample lands
          ctx.globalAlpha = 0.75 * hot * fade
          ctx.fillStyle = L.ok ? "#f3ffd2" : "#ffd2c4"
          ctx.fillRect(x, y, S, S)
        }
        ctx.globalCompositeOperation = "source-over"
        // misattributions also carry a ring, so they never rely on colour alone
        if (!L.ok && shown > 0 && P >= 9) {
          const lw = Math.max(1, Math.round(dpr))
          const o = Math.max(lw + 1, Math.round(P * 0.16))
          ctx.globalAlpha = 0.9 * fade
          ctx.strokeStyle = rgb(RED)
          ctx.lineWidth = lw
          ctx.strokeRect(x - o + lw / 2, y - o + lw / 2, S + 2 * o - lw, S + 2 * o - lw)
        }
      }
      ctx.globalAlpha = 1
    }

    // 5. a misattribution: the vector from where the sample belonged to where it went, and a ripple
    ctx.globalCompositeOperation = "lighter"
    for (const m of MISS_SAMPLES) {
      const age = f.s - m.land
      if (age < 0 || age > 1.1 || m.r >= f.cut) continue
      const yc = M + m.r * P + S / 2
      const xa = M + m.r * P + S / 2
      const xb = M + m.c * P + S / 2
      const k = 1 - age / 1.1
      ctx.globalAlpha = k * k
      ctx.strokeStyle = rgb(RED)
      ctx.lineWidth = Math.max(1, Math.round(P * 0.09))
      ctx.beginPath()
      ctx.moveTo(xa, yc)
      ctx.lineTo(xb, yc)
      ctx.stroke()
      // the expected cell gets a bracket: "it belonged here"
      const o = Math.round(P * 0.2)
      ctx.strokeRect(M + m.r * P - o, M + m.r * P - o, S + 2 * o, S + 2 * o)
      // ripple
      const ra = age / 0.7
      if (ra < 1) {
        ctx.globalAlpha = (1 - ra) * 0.8
        ctx.lineWidth = Math.max(1, Math.round(dpr))
        ctx.beginPath()
        ctx.arc(xb, yc, P * (0.75 + 2.1 * easeOutCubic(ra)), 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1

    // 6. tracers: each sample flies along its actual-group row to the predicted column
    if (f.s > 0 && f.s < 60) {
      let i = countLE(LANDS, f.s - 0.04)
      for (; i < SAMPLES.length; i++) {
        const sm = SAMPLES[i]
        if (sm.land > f.s + 0.6) break
        if (sm.launch > f.s || sm.r >= f.cut) continue
        const u = clamp01((f.s - sm.launch) / (sm.land - sm.launch))
        const yc = M + sm.r * P + S / 2
        const x0 = M - P * 0.45
        const x1 = M + sm.c * P + S / 2
        const e = easeOutCubic(u)
        const x = x0 + (x1 - x0) * e
        const tail = Math.min(x - x0, P * 0.6 + (x1 - x0) * 0.45 * (1 - u) * (1 - u))
        const col = sm.ok ? LIME : RED
        const fadeOut = 1 - Math.max(0, (f.s - sm.land) / 0.04)
        const gr = ctx.createLinearGradient(x - tail, 0, x, 0)
        gr.addColorStop(0, rgb(col, 0))
        gr.addColorStop(1, rgb(col, 0.9 * fadeOut))
        ctx.strokeStyle = gr
        ctx.lineWidth = Math.max(1, Math.round(P * 0.12))
        ctx.beginPath()
        ctx.moveTo(x - tail, yc)
        ctx.lineTo(x, yc)
        ctx.stroke()
        // a hot point with a little bloom, not a bead
        const R = P * 0.75
        ctx.globalAlpha = 0.55 * fadeOut
        ctx.drawImage(sm.ok ? this.glowLime : this.glowRed, x - R, yc - R, R * 2, R * 2)
        const h = Math.max(2, Math.round(P * 0.16))
        ctx.globalAlpha = fadeOut
        ctx.fillStyle = sm.ok ? "#f6ffe0" : "#ffe1d8"
        ctx.fillRect(x - h / 2, yc - h / 2, h, h)
        ctx.globalAlpha = 1
      }
    }

    // 7. the beam
    if (beamOn) {
      const a = f.beamAlpha
      const halo = ctx.createLinearGradient(0, by - P * 0.9, 0, by + P * 0.9)
      halo.addColorStop(0, rgb(LIME, 0))
      halo.addColorStop(0.5, rgb(LIME, 0.22 * a))
      halo.addColorStop(1, rgb(LIME, 0))
      ctx.fillStyle = halo
      ctx.fillRect(bx0, by - P * 0.9, bw, P * 1.8)
      const lw = Math.max(1, Math.round(dpr * 1.2))
      ctx.fillStyle = `rgba(242,255,206,${(0.95 * a).toFixed(3)})`
      ctx.fillRect(bx0, by - lw / 2, bw, lw)
      const cap = Math.max(2, Math.round(dpr * 2.5))
      ctx.fillRect(bx0 - cap, by - cap / 2, cap, cap)
      ctx.fillRect(bx0 + bw, by - cap / 2, cap, cap)
      // the row under the head
      const row = Math.floor(f.beam)
      if (row >= 0 && row < N) {
        ctx.fillStyle = `rgba(237,233,223,${(0.04 * a).toFixed(3)})`
        ctx.fillRect(M, M + row * P, span, S)
      }
    }
    ctx.globalCompositeOperation = "source-over"

    // 8. hover crosshair
    if (f.hover) {
      const { r, c } = f.hover
      ctx.fillStyle = "rgba(237,233,223,0.07)"
      ctx.fillRect(M - P * 0.5, M + r * P - gap / 2, span + P, P)
      ctx.fillRect(M + c * P - gap / 2, M - P * 0.5, P, span + P)
      const lw = Math.max(1, Math.round(dpr))
      const o = Math.max(lw, Math.round(P * 0.14))
      ctx.strokeStyle = "rgba(246,243,235,0.95)"
      ctx.lineWidth = lw
      ctx.strokeRect(M + c * P - o + lw / 2, M + r * P - o + lw / 2, S + 2 * o - lw, S + 2 * o - lw)
    }
  }

  private drawPowerOn(power: number) {
    const g = this.g!
    const { ctx } = this
    const S = g.P - g.gap
    const span = 2 * N - 2
    const front: [number, number, number][] = []
    for (const alt of [false, true]) {
      ctx.fillStyle = rgb(alt ? BASE_ALT : BASE)
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) {
          if (oddBlock(r, c) !== alt) continue
          const a = clamp01((power * 1.3 - (r + c) / span) / 0.3)
          if (a <= 0) continue
          ctx.globalAlpha = a
          ctx.fillRect(g.M + c * g.P, g.M + r * g.P, S, S)
          if (a < 1) front.push([r, c, a])
        }
    }
    // the wave front glows as it switches cells on
    ctx.fillStyle = rgb(LIME)
    for (const [r, c, a] of front) {
      ctx.globalAlpha = 0.5 * (1 - Math.abs(a - 0.5) * 2)
      ctx.fillRect(g.M + c * g.P, g.M + r * g.P, S, S)
    }
    ctx.globalAlpha = 1
  }
}
