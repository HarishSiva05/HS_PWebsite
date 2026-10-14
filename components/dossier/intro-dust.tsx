"use client"

/**
 * Dust motes drifting through the lamp's beam, for the cold open.
 * One canvas, ~70–90 additive sprites, DPR capped at 2. The intro drives it through
 * a plain state object: `lamp` (0–1, flickers with the bulb), `push` (0–1, the camera
 * moving forward: motes stream outward and swell) and `fade` (0–1, overall).
 */

export type DustState = { lamp: number; push: number; fade: number }

type Mote = {
  x: number
  y: number
  z: number // 0 far … 1 near the lens
  r: number
  vx: number
  vy: number
  ph: number
  sp: number
  a: number
}

function sprite(size: number, core: string, mid: string, edge: string) {
  const c = document.createElement("canvas")
  c.width = c.height = size
  const g = c.getContext("2d")!
  const h = size / 2
  const grd = g.createRadialGradient(h, h, 0, h, h, h)
  grd.addColorStop(0, core)
  grd.addColorStop(0.22, core)
  grd.addColorStop(0.42, mid)
  grd.addColorStop(1, edge)
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  return c
}

export function startDust(canvas: HTMLCanvasElement, S: DustState): () => void {
  const ctx = canvas.getContext("2d")
  if (!ctx) return () => {}
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  let W = 1
  let H = 1

  const resize = () => {
    W = canvas.clientWidth || window.innerWidth
    H = canvas.clientHeight || window.innerHeight
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()

  const fleck = sprite(64, "rgba(255,244,222,1)", "rgba(255,226,182,.5)", "rgba(255,210,150,0)")
  const bokeh = sprite(128, "rgba(255,232,196,.55)", "rgba(255,220,170,.42)", "rgba(255,206,140,0)")

  // the beam: apex above the top edge, widening toward the desk
  const beam = (x: number, y: number) => {
    const depth = Math.max(0, (y + 0.08 * H) / (1.12 * H))
    const half = 0.07 * W + depth * 0.26 * Math.max(W, 900)
    const dx = Math.abs(x - W / 2) / half
    if (dx >= 1) return 0
    return (1 - dx * dx) * (1 - 0.5 * depth)
  }

  const count = W < 700 ? 62 : 90
  const rnd = (a: number, b: number) => a + Math.random() * (b - a)
  const spawn = (m?: Mote): Mote => {
    const z = Math.random() ** 1.6
    const near = z > 0.86
    const o = m ?? ({} as Mote)
    o.z = z
    o.x = W / 2 + rnd(-0.34, 0.34) * Math.max(W, 900) * (0.35 + z * 0.65)
    o.y = rnd(-0.05, 1.02) * H
    o.r = near ? rnd(8, 18) : rnd(1.1, 2.3) + z * 1.5
    o.vx = rnd(-7, 7)
    o.vy = rnd(-4, 6)
    o.ph = rnd(0, Math.PI * 2)
    o.sp = rnd(0.3, 1.1)
    o.a = near ? rnd(0.07, 0.17) : rnd(0.5, 1)
    return o
  }
  const motes = Array.from({ length: count }, () => spawn())

  let raf = 0
  let last = performance.now()
  let running = true

  const frame = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    ctx.clearRect(0, 0, W, H)
    const live = S.lamp * S.fade
    if (live > 0.004) {
      ctx.globalCompositeOperation = "lighter"
      const cx = W / 2
      const cy = H * 0.46
      const push = S.push * S.push
      for (const m of motes) {
        m.ph += dt * m.sp
        m.x += (m.vx + Math.sin(m.ph) * 5) * dt * (0.4 + m.z)
        m.y += (m.vy + Math.cos(m.ph * 0.7) * 3.5) * dt * (0.4 + m.z)
        if (push > 0) {
          const k = push * 2.6 * (0.35 + m.z)
          m.x += (m.x - cx) * k * dt
          m.y += (m.y - cy) * k * dt
        }
        if (m.x < -60 || m.x > W + 60 || m.y < -60 || m.y > H + 60) {
          if (S.push > 0.05) continue
          spawn(m)
        }
        const lit = 0.05 + 0.95 * beam(m.x, m.y)
        const tw = 0.6 + 0.4 * Math.sin(m.ph * 2.7)
        const a = live * lit * tw * m.a * (1 - push * 0.6)
        if (a < 0.008) continue
        const near = m.r > 6
        const size = m.r * (1 + push * 2.4 * m.z)
        ctx.globalAlpha = Math.min(1, a)
        ctx.drawImage(near ? bokeh : fleck, m.x - size, m.y - size, size * 2, size * 2)
      }
      ctx.globalAlpha = 1
    }
    if (running) raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  const onResize = () => resize()
  window.addEventListener("resize", onResize)
  return () => {
    running = false
    cancelAnimationFrame(raf)
    window.removeEventListener("resize", onResize)
  }
}
