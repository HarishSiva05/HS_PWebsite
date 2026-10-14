"use client"

import { useEffect, useRef } from "react"

/**
 * Fig. B, the CCTV feed, alive: a face-tracking box locked onto Harish, a confidence
 * readout, an occasional re-acquire, and a 100–150ms signal glitch every ~7s.
 *
 * The track is real: the centroid of the lit skin region of public/hero-bg.mp4
 * (1280×720, 4s loop), measured every 0.2s, in video pixels. The box follows it by the
 * video's currentTime, so it moves when his head does.
 */
const TRACK: [number, number][] = [
  [722.0, 208.0], [721.7, 208.5], [721.1, 208.9], [720.7, 210.0], [721.2, 210.0], [721.1, 209.9],
  [720.5, 209.9], [720.2, 209.7], [718.4, 206.5], [716.6, 201.1], [717.3, 199.8], [718.1, 198.6],
  [719.0, 198.7], [719.2, 198.7], [719.3, 199.7], [720.2, 200.9], [721.8, 205.9], [723.3, 207.0],
  [722.3, 208.1], [721.8, 208.5], [721.4, 208.9],
]
const VIDEO = { w: 1280, h: 720, loop: 4 }
// face box in video px around the track point (the box centre sits 18px below the centroid)
const FACE = { w: 200, h: 228, dy: 18 }
const MEAN = { x: 720.4, y: 205.3 }
const MATCH = 99.1

const pad = (n: number) => String(n).padStart(2, "0")
/** The burnt-in timestamp, written straight to the DOM once a second (no React re-render). */
function useClockText() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const fmt = () => {
      const d = new Date()
      if (ref.current) {
        ref.current.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      }
    }
    fmt()
    const id = setInterval(fmt, 1000)
    return () => clearInterval(id)
  }, [])
  return ref
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const backOut = (t: number) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2)

export function CctvFeed({ live, active }: { live: boolean; active: boolean }) {
  const fig = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const trk = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const pct = useRef<HTMLElement>(null)
  const bar = useRef<HTMLElement>(null)
  const bands = useRef<HTMLDivElement>(null)
  const clock = useClockText()
  const state = useRef({ live, active })
  const sync = useRef<() => void>(() => {})

  useEffect(() => {
    state.current = { live, active }
    sync.current()
  }, [live, active])

  useEffect(() => {
    const f = fig.current
    const v = video.current
    const box = trk.current
    if (!f || !v || !box) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause()
      return
    }

    let near = false // within 160px: load + play the footage, run the tracker
    let seen = false // a third of it on screen: time to power on
    let raf = 0
    let glitchT = 0
    let size = { w: f.clientWidth, h: f.clientHeight }
    let geo = { s: 1, ox: 0, oy: 0 }

    const layout = () => {
      size = { w: f.clientWidth, h: f.clientHeight }
      // object-fit: cover mapping from video px to frame px
      const s = Math.max(size.w / VIDEO.w, size.h / VIDEO.h)
      geo = { s, ox: (size.w - VIDEO.w * s) / 2, oy: (size.h - VIDEO.h * s) / 2 }
      const bw = FACE.w * s
      const bh = FACE.h * s
      box.style.left = `${(geo.ox + MEAN.x * s - bw / 2).toFixed(1)}px`
      box.style.top = `${(geo.oy + (MEAN.y + FACE.dy) * s - bh / 2).toFixed(1)}px`
      box.style.width = `${bw.toFixed(1)}px`
      box.style.height = `${bh.toFixed(1)}px`
    }
    layout()
    const ro = new ResizeObserver(layout)
    ro.observe(f)

    // ---- tracker state ----
    let on = false
    let liveAt = 0 // when the hero's entrance started
    let bootT = 0
    let bootedAt = 0 // when the feed powered on
    let acquireAt = 0 // when the first lock began
    let reAt = 0 // when the current re-acquire began (0 = none)
    let nextRe = 0
    let jump = { x: 0, y: 0 }
    let shownPct = ""
    let shownLabel = ""

    const setReadout = (word: string, value: number) => {
      const p = `${value.toFixed(1)}%`
      if (word !== shownLabel && label.current) {
        label.current.textContent = word
        shownLabel = word
      }
      if (p !== shownPct && pct.current) {
        pct.current.textContent = p
        shownPct = p
      }
      if (bar.current) bar.current.style.transform = `scaleX(${(value / 100).toFixed(3)})`
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!acquireAt) {
        if (!bootedAt) return
        acquireAt = bootedAt + 650
        nextRe = acquireAt + 7000 + Math.random() * 4000
      }
      if (!on && now >= acquireAt) {
        on = true
        box.classList.add("is-on")
      }
      // where the face is in this frame of the loop
      const t = ((v.currentTime || 0) % VIDEO.loop) / 0.2
      const i = Math.min(TRACK.length - 2, Math.floor(t))
      const u = t - i
      const px = TRACK[i][0] + (TRACK[i + 1][0] - TRACK[i][0]) * u
      const py = TRACK[i][1] + (TRACK[i + 1][1] - TRACK[i][1]) * u
      // a live estimate is never perfectly still
      const jx = Math.sin(now / 370) * 0.35 + Math.sin(now / 1130) * 0.3
      const jy = Math.cos(now / 410) * 0.3 + Math.sin(now / 970) * 0.25
      let x = (px - MEAN.x) * geo.s + jx
      let y = (py - MEAN.y) * geo.s + jy
      let sc = 1
      let word = "Match"
      let value = MATCH

      const a = Math.min(1, Math.max(0, (now - acquireAt) / 900))
      if (a < 1) {
        // first acquisition: a wide box sweeps in and tightens onto the face
        const e = easeOut(a)
        sc = 1 + 0.9 * (1 - e)
        x += (1 - e) * size.w * 0.07
        y -= (1 - e) * size.h * 0.05
        word = "Acquiring"
        value = 38 + (MATCH - 38) * e
        box.classList.toggle("is-blink", a < 0.25 && Math.floor(now / 70) % 2 === 0)
      } else if (!reAt && now > nextRe) {
        reAt = now
        jump = { x: (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 10), y: (Math.random() - 0.5) * 16 }
      }
      if (reAt) {
        const r = now - reAt
        if (r < 430) {
          // lost it: the box jumps, swells and hunts
          sc = 1.16
          x += jump.x + Math.sin(now / 23) * 1.5
          y += jump.y + Math.cos(now / 29) * 1.2
          word = "Re-acquiring"
          value = 86.4 + Math.sin(now / 60) * 2.2
          box.classList.add("is-hunt")
        } else if (r < 760) {
          // lock: snap back with a little overshoot
          const k = backOut((r - 430) / 330)
          sc = 1.16 - 0.16 * k
          x += jump.x * (1 - k)
          y += jump.y * (1 - k)
          word = "Match"
          value = 86.4 + (MATCH - 86.4) * Math.min(1, k)
          box.classList.remove("is-hunt")
        } else {
          reAt = 0
          nextRe = now + 8000 + Math.random() * 5000
        }
      }
      box.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${sc.toFixed(4)})`
      setReadout(word, value)
    }

    const glitch = () => {
      const g = bands.current
      if (g && raf) {
        const kids = Array.from(g.children) as HTMLElement[]
        kids.forEach((b, n) => {
          const top = Math.random() * 82
          const h = 3 + Math.random() * (n === 0 ? 16 : 7)
          b.style.clipPath = `inset(${top.toFixed(1)}% 0 ${(100 - top - h).toFixed(1)}% 0)`
          b.style.transform = `translate3d(${((Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 18)).toFixed(1)}px,0,0)`
        })
        f.classList.add("is-glitch")
        window.setTimeout(() => f.classList.remove("is-glitch"), 110 + Math.random() * 40)
      }
      glitchT = window.setTimeout(glitch, 6000 + Math.random() * 2500)
    }

    const start = () => {
      if (raf) return
      raf = requestAnimationFrame(frame)
      window.clearTimeout(glitchT)
      glitchT = window.setTimeout(glitch, 2600 + Math.random() * 2000)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
      window.clearTimeout(glitchT)
      f.classList.remove("is-glitch")
    }

    sync.current = () => {
      const { live, active } = state.current
      if (live && !liveAt) liveAt = performance.now()
      // the footage loads once the page is revealed (never under the cold open) and only near the viewport
      const on = live && near && active && !document.hidden
      if (on) {
        if (v.preload !== "auto") v.preload = "auto"
        v.play().catch(() => {})
        start()
      } else {
        v.pause()
        stop()
      }
      // the feed powers on the first time it is properly on screen, a beat after the name starts
      if (on && seen && !bootedAt && !bootT) {
        bootT = window.setTimeout(() => {
          f.classList.add("is-booted")
          bootedAt = performance.now()
        }, Math.max(0, 420 - (performance.now() - liveAt)))
      }
    }

    const io = new IntersectionObserver(
      ([e]) => {
        near = e.isIntersecting
        sync.current()
      },
      { rootMargin: "160px 0px" },
    )
    io.observe(f)
    const seenIo = new IntersectionObserver(
      ([e]) => {
        seen = e.intersectionRatio >= 0.3
        sync.current()
      },
      { threshold: [0, 0.3, 0.6] },
    )
    seenIo.observe(f)
    const onVis = () => sync.current()
    document.addEventListener("visibilitychange", onVis)

    return () => {
      stop()
      window.clearTimeout(bootT)
      io.disconnect()
      seenIo.disconnect()
      ro.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      sync.current = () => {}
    }
  }, [])

  return (
    <figure className="cctv" ref={fig}>
      <video
        ref={video}
        poster="/cctv-poster.jpg"
        muted
        loop
        playsInline
        preload="none"
        aria-label="CCTV-style footage of Harish at a workstation, pushing code"
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>
      <div className="cctv-glitch" ref={bands} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="cctv-scan" aria-hidden="true" />

      <div className="trk" ref={trk} aria-hidden="true">
        <i className="trk-c trk-tl" />
        <i className="trk-c trk-tr" />
        <i className="trk-c trk-bl" />
        <i className="trk-c trk-br" />
        <span className="trk-tag mono">
          <span className="trk-id">Subject · H. Sivaram</span>
          <span className="trk-row">
            <span ref={label}>Match</span> <b ref={pct}>{MATCH}%</b>
            <span className="trk-bar">
              <i ref={bar} />
            </span>
          </span>
        </span>
      </div>

      <div className="cctv-hud mono" aria-hidden="true">
        <span className="cctv-tl">Cam 04 · Workstation</span>
        <span className="cctv-tr">
          <i className="rec-dot" /> Rec
        </span>
        <span className="cctv-bl" ref={clock}>
          ————-——-——  ——:——:——
        </span>
        <span className="cctv-br">Fig. B</span>
        <i className="cctv-corner c1" />
        <i className="cctv-corner c2" />
        <i className="cctv-corner c3" />
        <i className="cctv-corner c4" />
      </div>
      <div className="cctv-boot" aria-hidden="true">
        <i />
        <i />
        <b />
      </div>

      <svg className="hs-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="hs-rgb-split" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx="4" dy="0" result="r2" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
          <feOffset in="gb" dx="-2" dy="0" result="gb2" />
          <feBlend in="r2" in2="gb2" mode="screen" />
        </filter>
      </svg>
    </figure>
  )
}
