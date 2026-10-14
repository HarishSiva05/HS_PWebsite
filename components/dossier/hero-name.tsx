"use client"

import { useEffect, useRef } from "react"
import { play } from "@/lib/sound"

/**
 * THE NAME, RECONSTRUCTED. Each word is cut into vertical strips (windows onto the full
 * word, 1px overlap). On entrance the strips fly in from scattered offsets and snap into
 * line on a spring, like a shredded page being pieced back together; afterwards the strips
 * nearest a fine pointer lift and part a few px, then settle. At rest each word swaps back
 * to a single unbroken copy, so the resting name is exactly as crisp as plain text.
 * The repeated glyphs come from CSS `content: attr(data-w)`: the DOM holds the name once.
 */

const WORDS = [
  { w: "Harish", n: 18 },
  { w: "Sivaram", n: 21 },
]

// small deterministic PRNG so every load scatters the same way (and SSR never sees it)
function prng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Strip = {
  el: HTMLElement
  paper: HTMLElement
  word: number
  cx: number // centre, as a fraction of the word width
  x: number
  y: number
  r: number
  vx: number
  vy: number
  vr: number
  o: number
  tx: number
  ty: number
  tr: number
  lift: number
  tlift: number
  release: number
}

export type ShredApi = { enter: () => void }

/**
 * `api` receives { enter } once the strips are wired up (before the parent's effects run), so the
 * parent can scatter the strips and reveal the hero in the same task: no frame of the whole name.
 */
export function ShredName({ api }: { api: React.MutableRefObject<ShredApi | null> }) {
  const root = useRef<HTMLHeadingElement>(null)
  const started = useRef(false)

  // build the physics once the strips exist
  useEffect(() => {
    const h1 = root.current
    if (!h1) return
    const wordEls = Array.from(h1.querySelectorAll<HTMLElement>(".shred-word"))
    const strips: Strip[] = []
    wordEls.forEach((wEl, wi) => {
      const els = Array.from(wEl.querySelectorAll<HTMLElement>(".shred"))
      els.forEach((el, i) => {
        strips.push({
          el,
          paper: el.querySelector<HTMLElement>(".shred-paper")!,
          word: wi,
          cx: (i + 0.5) / els.length,
          x: 0, y: 0, r: 0, vx: 0, vy: 0, vr: 0, o: 1,
          tx: 0, ty: 0, tr: 0, lift: 0, tlift: 0,
          release: 0,
        })
      })
    })

    // a click or tap sends a flutter through the strips: a delayed kick per strip, by distance
    const kicks = strips.map(() => ({ at: 0, vy: 0, vr: 0 }))
    let raf = 0
    let running = false
    let last = 0
    let mode: "enter" | "hover" = "hover"
    let pointer: { x: number; y: number } | null = null
    let rects: DOMRect[] = []

    const setRest = (rest: boolean) => wordEls.forEach((w) => w.classList.toggle("is-rest", rest))

    const write = (s: Strip) => {
      const moving = Math.abs(s.x) > 0.02 || Math.abs(s.y) > 0.02 || Math.abs(s.r) > 0.005
      // 2D on purpose: strips paint in the parent layer, so neighbours never drift apart by a
      // rounding pixel (separate compositor layers each snap on their own and show seams)
      s.el.style.transform = moving ? `translate(${s.x.toFixed(2)}px,${s.y.toFixed(2)}px) rotate(${s.r.toFixed(3)}deg)` : ""
      s.el.style.opacity = s.o >= 0.999 ? "" : s.o.toFixed(3)
      const p = Math.min(1, Math.max(s.lift * 0.9, Math.abs(s.y) / 26 + Math.abs(s.r) / 5))
      s.paper.style.opacity = p < 0.01 ? "" : p.toFixed(3)
    }

    const aim = () => {
      // hover targets from the pointer: a gaussian of influence around it, per word
      for (const s of strips) {
        s.tx = s.ty = s.tr = s.tlift = 0
      }
      if (!pointer || !rects.length) return
      for (const s of strips) {
        const r = rects[s.word]
        if (!r) continue
        const vy = pointer.y < r.top ? r.top - pointer.y : pointer.y > r.bottom ? pointer.y - r.bottom : 0
        const vf = Math.max(0, 1 - vy / 46)
        if (vf <= 0) continue
        const sx = r.left + s.cx * r.width
        const d = (sx - pointer.x) / Math.max(56, r.height * 0.55)
        const w = Math.exp(-d * d) * vf
        if (w < 0.01) continue
        const side = sx < pointer.x ? -1 : 1
        s.ty = -w * 7
        s.tx = side * w * 3.2
        s.tr = side * w * 1.5
        s.tlift = w
      }
    }

    const step = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000 || 1 / 60)
      last = now
      if (mode === "hover") aim()
      let busy = false
      const subs = dt > 1 / 70 ? 2 : 1
      const h = dt / subs
      for (let n = 0; n < strips.length; n++) {
        const s = strips[n]
        if (mode === "enter" && now < s.release) {
          busy = true
          continue
        }
        const kick = kicks[n]
        if (kick.at) {
          if (now >= kick.at) {
            s.vy += kick.vy
            s.vr += kick.vr
            kick.at = 0
          }
          busy = true
        }
        if (mode === "enter" && s.o < 1) s.o = Math.min(1, s.o + dt / 0.16)
        const k = mode === "enter" ? 250 : 190
        const c = mode === "enter" ? 21 : 19
        for (let i = 0; i < subs; i++) {
          s.vx += (-k * (s.x - s.tx) - c * s.vx) * h
          s.vy += (-k * (s.y - s.ty) - c * s.vy) * h
          s.vr += (-k * (s.r - s.tr) - c * s.vr) * h
          s.x += s.vx * h
          s.y += s.vy * h
          s.r += s.vr * h
        }
        s.lift += (s.tlift - s.lift) * Math.min(1, dt * 10)
        const settled =
          Math.abs(s.x - s.tx) < 0.03 && Math.abs(s.y - s.ty) < 0.03 && Math.abs(s.r - s.tr) < 0.004 &&
          Math.abs(s.vx) + Math.abs(s.vy) < 0.05 && Math.abs(s.vr) < 0.01 && Math.abs(s.lift - s.tlift) < 0.01 && s.o >= 1
        if (settled) {
          s.x = s.tx
          s.y = s.ty
          s.r = s.tr
          s.vx = s.vy = s.vr = 0
          s.lift = s.tlift
        } else busy = true
        write(s)
      }
      const atRest = strips.every((s) => s.tx === 0 && s.ty === 0 && s.tr === 0 && s.x === 0 && s.y === 0 && s.r === 0 && s.lift < 0.01)
      if (!busy && atRest) {
        running = false
        mode = "hover"
        strips.forEach((s) => {
          s.lift = 0
          write(s)
        })
        setRest(true)
        return
      }
      if (!busy && mode === "enter") mode = "hover"
      raf = requestAnimationFrame(step)
    }

    const run = () => {
      if (running) return
      running = true
      setRest(false)
      last = performance.now()
      raf = requestAnimationFrame(step)
    }

    const measure = () => {
      rects = wordEls.map((w) => w.getBoundingClientRect())
    }

    api.current = {
      enter: () => {
        if (started.current) return
        started.current = true
        const rnd = prng(519)
        const fs = parseFloat(getComputedStyle(h1).fontSize) || 120
        const t0 = performance.now() + 40
        strips.forEach((s) => {
          const order = s.cx * 0.8 + rnd() * 0.2
          s.release = t0 + s.word * 110 + order * 520
          const dir = rnd() < 0.5 ? -1 : 1
          s.y = dir * fs * (0.35 + rnd() * 0.85)
          s.x = (rnd() - 0.5) * fs * 0.1
          s.r = (rnd() < 0.5 ? -1 : 1) * (1.5 + rnd() * 6)
          s.vx = s.vy = s.vr = 0
          s.o = 0
          s.tx = s.ty = s.tr = s.tlift = 0
          s.lift = 0
          write(s)
        })
        mode = "enter"
        play("shred")
        run()
      },
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const onClick = (e: MouseEvent) => {
      if (still || mode === "enter") return
      measure()
      const now = performance.now()
      strips.forEach((s, n) => {
        const r = rects[s.word]
        if (!r) return
        const dx = r.left + s.cx * r.width - e.clientX
        const dist = Math.abs(dx) + Math.abs(r.top + r.height / 2 - e.clientY) * 0.6
        const fall = Math.max(0.3, 1 - dist / 950)
        kicks[n] = {
          at: now + dist * 0.85,
          vy: -(230 + Math.random() * 150) * fall,
          vr: (dx < 0 ? -1 : 1) * (35 + Math.random() * 45) * fall,
        }
      })
      play("paper")
      run()
    }
    if (!still) h1.addEventListener("click", onClick)

    // pointer: strips near it lift and part, like loose shreds (fine pointers, motion allowed)
    const interactive = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !still
    let onMove: ((e: PointerEvent) => void) | null = null
    let onLeave: (() => void) | null = null
    let onScroll: (() => void) | null = null
    let onScreen = true
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting
    })
    io.observe(h1)
    if (interactive) {
      onMove = (e: PointerEvent) => {
        if (!onScreen || (e.pointerType !== "mouse" && e.pointerType !== "pen")) return
        measure()
        const near = rects.some((r) => e.clientX > r.left - 80 && e.clientX < r.right + 80 && e.clientY > r.top - 50 && e.clientY < r.bottom + 50)
        pointer = { x: e.clientX, y: e.clientY }
        if (near) run()
        else if (running && mode === "hover") pointer = null
      }
      onLeave = () => {
        pointer = null
      }
      onScroll = () => {
        if (running) measure()
      }
      window.addEventListener("pointermove", onMove, { passive: true })
      document.documentElement.addEventListener("pointerleave", onLeave)
      window.addEventListener("scroll", onScroll, { passive: true })
    }

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      h1.removeEventListener("click", onClick)
      if (onMove) window.removeEventListener("pointermove", onMove)
      if (onLeave) document.documentElement.removeEventListener("pointerleave", onLeave)
      if (onScroll) window.removeEventListener("scroll", onScroll)
      api.current = null
    }
  }, [api])

  return (
    <h1 className="cover-name hero-name" ref={root}>
      <span className="hs-sr">Harish Sivaram</span>
      {WORDS.map(({ w, n }) => (
        <span className="shred-line" aria-hidden="true" key={w}>
          <span className="shred-word is-rest" style={{ ["--n" as string]: n }}>
            <span className="shred-whole" data-w={w} />
            {Array.from({ length: n }, (_, i) => (
              <span className="shred" key={i} style={{ ["--i" as string]: i }}>
                <span className="shred-paper" />
                <span className="shred-win">
                  <span className="shred-ink" data-w={w} />
                </span>
              </span>
            ))}
          </span>
        </span>
      ))}
    </h1>
  )
}
