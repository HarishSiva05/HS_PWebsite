"use client"

import "@/styles/exhibit-pico.css"
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react"
import type { ExhibitProps } from "./types"
import { CUTS, FPS, clock, mapTime, posAt, timeAtPos, timecode, type Cut, type CutId } from "./pico-film"
import { paintGlow, type Rect } from "./pico-glow"
import { play as sfx } from "@/lib/sound"

/*
 * Exhibit 02 · Pico, real footage.
 *
 * The 2.39:1 product film sits in the 16:10 frame and lights it: a tiny canvas repaints the current
 * frame ~11 times a second, mirrored outward, and CSS blurs it into the letterbox, so the film glows
 * into its own frame. Camera chrome sits in that light: REC, a frame-accurate timecode, the beat being
 * shown, and a chapter rail (click to jump, drag to scrub). Phones get the 9:16 cut in a phone-shaped
 * crop with the same glow.
 *
 * Plays muted, only while `active` and the tab is visible; nothing loads before the first activation.
 * With reduced motion (or mode="still") it shows the poster and offers a play button instead.
 */

type Layout = "wide" | "side" | "stack" | "mini"
type Geo = {
  w: number
  h: number
  layout: Layout
  cut: CutId
  film: Rect
  pad: number
  gap: number
  blur: number
  margin: number
}
type Status = "idle" | "loading" | "playing" | "paused" | "blocked"
type Intent = "auto" | "play" | "pause"
type Scrub = { id: number; x0: number; y0: number; on: boolean; was: boolean; left: number; width: number }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const two = (n: number) => String(n).padStart(2, "0")

/** Where everything goes in a box of this size. Phones (box or viewport ≤ 600 px) get the vertical cut. */
function measure(w: number, h: number, vw: number): Geo {
  const blur = Math.round(clamp(Math.max(w, h) * 0.028, 8, 36))
  const margin = blur * 2
  if (w > 600 && vw > 600) {
    const ratio = CUTS.wide.w / CUTS.wide.h
    const minBand = clamp(w * 0.055, 46, 72)
    let fw = w
    let fh = w / ratio
    if (h - fh < 2 * minBand) {
      fh = Math.max(h - 2 * minBand, h * 0.55)
      fw = Math.min(w, fh * ratio)
      fh = fw / ratio
    }
    const pad = Math.round(clamp(w * 0.024, 14, 30))
    const film = { x: (w - fw) / 2, y: (h - fh) / 2, w: fw, h: fh }
    return { w, h, layout: "wide", cut: "wide", film, pad, gap: 0, blur, margin }
  }

  const r = CUTS.tall.w / CUTS.tall.h
  if (w < 300 || h < 170) {
    const pad = Math.round(clamp(h * 0.07, 6, 12))
    const fh = h - 2 * pad
    const fw = fh * r
    return { w, h, layout: "mini", cut: "tall", film: { x: (w - fw) / 2, y: pad, w: fw, h: fh }, pad, gap: 0, blur, margin }
  }

  const pad = Math.round(clamp(w * 0.034, 12, 20))
  const gap = Math.round(clamp(w * 0.036, 12, 22))
  // Side by side: the beat on the left, the phone in the middle, the chapters on the right.
  const sideH = h - 2 * pad
  const sideX = (w - sideH * r) / 2
  if (sideX - pad - gap >= 84) {
    return { w, h, layout: "side", cut: "tall", film: { x: sideX, y: pad, w: sideH * r, h: sideH }, pad, gap, blur, margin }
  }
  // Stacked: status above the phone, the rail below it.
  const top = 46
  const bottom = 82
  const availH = h - top - bottom
  const fw = Math.min(availH * r, w - 2 * pad)
  const fh = fw / r
  return {
    w,
    h,
    layout: "stack",
    cut: "tall",
    film: { x: (w - fw) / 2, y: top + (availH - fh) / 2, w: fw, h: fh },
    pad,
    gap,
    blur,
    margin,
  }
}

function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [query])
  return match
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>"

/** Text that decodes from noise when it changes, like a log line resolving. */
function Decode({ text, animate, className }: { text: string; animate: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef<string | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const from = shown.current
    shown.current = text
    if (!animate || from === null || from === text) {
      el.textContent = text
      return
    }
    const t0 = performance.now()
    let last = 0
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 460)
      if (now - last > 42 || p === 1) {
        last = now
        const settled = Math.floor((1 - (1 - p) * (1 - p)) * text.length)
        let out = ""
        for (let i = 0; i < text.length; i++) {
          const ch = text[i]
          out += i < settled || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]
        }
        el.textContent = out
      }
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      el.textContent = text
    }
  }, [text, animate])

  return <span ref={ref} className={className} aria-hidden="true" />
}

const PlayIcon = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M3.2 1.6v8.8L10.4 6z" fill="currentColor" />
  </svg>
)
const PauseIcon = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2.7 1.8h2.4v8.4H2.7zM6.9 1.8h2.4v8.4H6.9z" fill="currentColor" />
  </svg>
)

export default function PicoExhibit({ mode = "live", active = false }: ExhibitProps) {
  const live = mode === "live"
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const posterRef = useRef<HTMLImageElement>(null)
  const glowRef = useRef<HTMLCanvasElement>(null)
  const descId = useId()

  const [geo, setGeo] = useState<Geo | null>(null)
  const [nested, setNested] = useState(false)
  const [intent, setIntent] = useState<Intent>("auto")
  const [armed, setArmed] = useState(false) // a <video> exists (always in live mode; still mode after a play press)
  const [primed, setPrimed] = useState(false) // preload="auto", from the first activation on
  const [status, setStatus] = useState<Status>("idle")
  const [reveal, setReveal] = useState<"none" | "run" | "done">("none")
  const [chapter, setChapter] = useState(0)
  const [onScreen, setOnScreen] = useState(false)
  const [pageShown, setPageShown] = useState(true)
  const [scrubbing, setScrubbing] = useState(false)
  const reduced = useMedia("(prefers-reduced-motion: reduce)")

  const cut = geo ? CUTS[geo.cut] : null
  const interactive = !nested && !!geo && geo.layout !== "mini"
  // The frame decides when we're "on"; a viewer's own play press also counts while we're on screen.
  const gate = (live && active) || (intent === "play" && onScreen)
  const wants = !!cut && pageShown && gate && !scrubbing && (intent === "play" || (intent === "auto" && live && !reduced))
  const hasVideo = live || armed
  const running = wants && status !== "blocked"
  const showPill = interactive && !running && !scrubbing && (intent === "pause" || status === "blocked" || !live || reduced)
  const motion = !reduced && live

  // ---- the playhead, written straight to the DOM ----
  const lastT = useRef(0)
  const frameNo = useRef(-1)
  const chapterNo = useRef(-1)
  const played = useRef(false)
  const pendingSeek = useRef<number | null>(null)
  const seekTarget = useRef<number | null>(null)
  const cutRef = useRef<Cut | null>(null)
  const scrub = useRef<Scrub | null>(null)
  const swallowClick = useRef(false)
  const ppRef = useRef<HTMLButtonElement>(null)
  const pillHadFocus = useRef(false)
  const fills = useRef<HTMLElement[][]>([]) // each rail's fill bars, in chapter order
  const filledTo = useRef(-1) // the chapter the bars were last laid out for
  const tcText = useRef<Text | null>(null) // the timecode is one text node we keep rewriting

  /**
   * Per frame this is one inline transform (the live bar) and one text-node write (the timecode),
   * both cheap fast paths; the other bars and React state only change when the chapter does.
   */
  const syncAt = useCallback((t: number, c: Cut) => {
    lastT.current = t
    const p = posAt(c, t)
    const i = Math.floor(p)
    const f = `scaleX(${(p - i).toFixed(4)})`
    if (i !== filledTo.current) {
      filledTo.current = i
      for (const bars of fills.current) bars.forEach((el, k) => (el.style.transform = k < i ? "scaleX(1)" : k > i ? "scaleX(0)" : f))
    } else for (const bars of fills.current) if (bars[i]) bars[i].style.transform = f
    const fr = Math.floor(t * FPS + 1e-4)
    if (fr !== frameNo.current && tcText.current) {
      frameNo.current = fr
      tcText.current.data = timecode(t)
    }
    if (i !== chapterNo.current) {
      chapterNo.current = i
      setChapter(i)
    }
  }, [])

  const glowCtx = useRef<CanvasRenderingContext2D | null>(null)
  const paint = useCallback(
    (alpha: number) => {
      const c = glowRef.current
      if (!c || !geo) return
      if (glowCtx.current?.canvas !== c) glowCtx.current = c.getContext("2d", { alpha: false })
      const ctx = glowCtx.current
      if (!ctx) return
      const v = videoRef.current
      const img = posterRef.current
      const src =
        v && v.readyState >= 2 && v.dataset.ready ? v : img && img.complete && img.naturalWidth > 0 ? img : null
      if (src) paintGlow(ctx, src, geo.film, geo, geo.margin, alpha)
    },
    [geo],
  )

  // ---- measure the box (before paint, so nothing jumps) ----
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    setNested(!!el.parentElement?.closest("a[href], button, [role='button'], [role='link']"))
    const apply = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      const g = measure(w, h, window.innerWidth)
      setGeo((prev) => (prev && prev.w === g.w && prev.h === g.h && prev.cut === g.cut ? prev : g))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    window.addEventListener("resize", apply)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", apply)
    }
  }, [])

  // ---- new geometry: size the glow, carry the playhead across a change of cut ----
  useLayoutEffect(() => {
    if (!geo) return
    const next = CUTS[geo.cut]
    const prev = cutRef.current
    cutRef.current = next
    if (!prev) lastT.current = next.posterAt
    else if (prev.id !== next.id) {
      lastT.current = played.current ? mapTime(prev, next, lastT.current) : next.posterAt
      if (played.current) pendingSeek.current = lastT.current
    }
    const c = glowRef.current
    if (c) {
      const span = geo.w + 2 * geo.margin
      const cw = Math.round(clamp(span / 14, 40, 96))
      c.width = cw
      c.height = Math.max(8, Math.round((cw * (geo.h + 2 * geo.margin)) / span))
    }
    // the chrome for this layout just rendered: pick up its bars and timecode
    const root = rootRef.current
    fills.current = Array.from(root?.querySelectorAll<HTMLElement>(".pico-rail") ?? []).map((r) =>
      Array.from(r.querySelectorAll<HTMLElement>(".pico-ch-fill")),
    )
    filledTo.current = -1
    const tc = root?.querySelector<HTMLElement>(".pico-tc-now")
    if (tc && !tc.firstChild) tc.appendChild(document.createTextNode(""))
    tcText.current = (tc?.firstChild as Text | null) ?? null
    frameNo.current = -1
    syncAt(lastT.current, next)
    paint(1)
  }, [geo, interactive, paint, syncAt])

  // ---- page visibility and our own on-screen check (for still mode, where the frame may not track it) ----
  useEffect(() => {
    const on = () => setPageShown(document.visibilityState !== "hidden")
    on()
    document.addEventListener("visibilitychange", on)
    return () => document.removeEventListener("visibilitychange", on)
  }, [])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // ---- play / pause ----
  const onPlayError = useCallback((e: unknown) => {
    if ((e as { name?: string } | null)?.name === "NotAllowedError") setStatus("blocked")
  }, [])

  useEffect(() => {
    if (!wants) return
    setPrimed(true)
    setArmed(true)
  }, [wants])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (wants) {
      if (v.paused) {
        setStatus((s) => (s === "playing" ? s : "loading"))
        v.play().catch(onPlayError)
      }
    } else if (!v.paused) v.pause()
  }, [wants, hasVideo, primed, geo?.cut, onPlayError])

  // the big play button goes away once playing: keep keyboard focus in the player
  useLayoutEffect(() => {
    if (showPill || !pillHadFocus.current) return
    pillHadFocus.current = false
    ppRef.current?.focus({ preventScroll: true })
  }, [showPill])

  // the gate (or the phone's screen) opens once, on the first frames
  useEffect(() => {
    if (reveal !== "run") return
    const id = setTimeout(() => setReveal("done"), 1300)
    return () => clearTimeout(id)
  }, [reveal])

  // ---- the clock: only while playing ----
  // The chrome follows the frame actually being presented (requestVideoFrameCallback's mediaTime),
  // so the rail and timecode turn over on the same frame as the film's cuts. rAF is the fallback,
  // and paints the glow ~11 times a second.
  useEffect(() => {
    if (status !== "playing" || !cut) return
    const v = videoRef.current
    if (!v) return
    const perFrame = typeof v.requestVideoFrameCallback === "function"
    let raf = 0
    let vfc = 0
    let lastGlow = 0
    const onFrame: VideoFrameRequestCallback = (_now, meta) => {
      if (!scrub.current?.on) syncAt(meta.mediaTime, cut)
      vfc = v.requestVideoFrameCallback(onFrame)
    }
    const tick = (now: number) => {
      if (!perFrame && !scrub.current?.on) syncAt(v.currentTime, cut)
      if (now - lastGlow > 88) {
        lastGlow = now
        paint(0.34)
      }
      raf = requestAnimationFrame(tick)
    }
    if (perFrame) vfc = v.requestVideoFrameCallback(onFrame)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (perFrame) v.cancelVideoFrameCallback(vfc)
    }
  }, [status, cut, syncAt, paint])

  // ---- the <video> element: muted for autoplay rules, released when it goes away ----
  const setVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el
    if (!el) return
    el.muted = true
    el.defaultMuted = true
    el.setAttribute("muted", "")
    return () => {
      if (videoRef.current === el) videoRef.current = null
      el.pause()
      // Free the decoder once the node has really left the page. (Dev StrictMode detaches and
      // re-attaches the same node; stripping its src then would leave it empty.)
      queueMicrotask(() => {
        if (el.isConnected) return
        el.removeAttribute("src")
        el.load()
      })
    }
  }, [])

  const onPlaying = () => {
    played.current = true
    setStatus("playing")
    if (reveal === "none") setReveal(motion ? "run" : "done")
  }
  const onPause = () => setStatus((s) => (s === "blocked" ? s : "paused"))
  const onError = () => setStatus("blocked")
  const onWaiting = () => setStatus((s) => (s === "playing" ? "loading" : s))
  const onLoadedMeta = (e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    if (pendingSeek.current != null) {
      v.currentTime = pendingSeek.current
      pendingSeek.current = null
    }
  }
  const onLoadedData = (e: SyntheticEvent<HTMLVideoElement>) => {
    e.currentTarget.dataset.ready = "1"
    paint(1)
  }
  const onSeeked = (e: SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    if (seekTarget.current != null) {
      const t = seekTarget.current
      seekTarget.current = null
      v.currentTime = t
      return
    }
    if (cut && !scrub.current?.on) syncAt(v.currentTime, cut)
    paint(1)
  }

  // ---- controls ----
  const startPlayback = useCallback(() => {
    setIntent("play")
    setArmed(true)
    setPrimed(true)
    // called inside the press, which strict autoplay policies (iOS Low Power Mode) require
    const v = videoRef.current
    if (v && v.paused) v.play().catch(onPlayError)
  }, [onPlayError])

  const toggle = useCallback(() => {
    sfx("tick")
    if (running) {
      setIntent("pause")
      videoRef.current?.pause()
    } else startPlayback()
  }, [running, startPlayback])

  const jump = useCallback(
    (i: number) => {
      if (!cut) return
      if (swallowClick.current) return
      sfx("tick")
      const t = cut.chapters[i].start + 0.034
      const v = videoRef.current
      if (v && v.readyState >= 1) v.currentTime = t
      else pendingSeek.current = t
      played.current = true
      syncAt(t, cut)
      startPlayback()
    },
    [cut, syncAt, startPlayback],
  )

  // drag along the rail to scrub; a plain press is a click (jump to that chapter)
  const onRailDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasVideo || !cut || e.button !== 0) return
    const r = e.currentTarget.getBoundingClientRect()
    scrub.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, was: running, left: r.left, width: r.width }
  }
  const onRailMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = scrub.current
    if (!s || s.id !== e.pointerId || !cut) return
    if (!s.on) {
      const dx = Math.abs(e.clientX - s.x0)
      if (dx < 7 || Math.abs(e.clientY - s.y0) > dx) return
      s.on = true
      e.currentTarget.setPointerCapture(e.pointerId)
      setScrubbing(true)
    }
    const t = timeAtPos(cut, clamp((e.clientX - s.left) / s.width, 0, 0.9999) * cut.chapters.length)
    syncAt(t, cut)
    const v = videoRef.current
    if (!v || v.readyState < 1) return
    if (v.seeking) seekTarget.current = t
    else v.currentTime = t
  }
  const onRailUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = scrub.current
    if (!s || s.id !== e.pointerId) return
    scrub.current = null
    if (!s.on) return
    swallowClick.current = true
    setTimeout(() => (swallowClick.current = false), 0)
    played.current = true
    setScrubbing(false)
    const v = videoRef.current
    if (!v || v.readyState < 1) {
      // nothing loaded yet (reduced motion): start from where they let go
      pendingSeek.current = lastT.current
      startPlayback()
    } else if (s.was || intent !== "pause") setIntent("play")
  }

  // arrow keys move between chapters, like a toolbar
  const onRailKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const keys = geo?.layout === "side" ? ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"] : ["ArrowRight", "ArrowLeft"]
    if (!keys.includes(e.key) && e.key !== "Home" && e.key !== "End") return
    const btns = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button.pico-ch"))
    const i = btns.indexOf(document.activeElement as HTMLButtonElement)
    if (i < 0) return
    e.preventDefault()
    const n = btns.length
    const j =
      e.key === "Home" ? 0 : e.key === "End" ? n - 1 : e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n
    btns[j].focus()
  }

  // ---- render ----
  const n = cut?.chapters.length ?? 0
  const cur = cut?.chapters[Math.min(chapter, n - 1)]
  const vars = geo
    ? ({
        "--px-fx": `${geo.film.x}px`,
        "--px-fy": `${geo.film.y}px`,
        "--px-fw": `${geo.film.w}px`,
        "--px-fh": `${geo.film.h}px`,
        "--px-pad": `${geo.pad}px`,
        "--px-gap": `${geo.gap}px`,
        "--px-blur": `${geo.blur}px`,
        "--px-gm": `${geo.margin}px`,
        "--px-n": n,
      } as CSSProperties)
    : undefined

  const rec = (
    <span className="pico-rec">
      <i aria-hidden="true" />
      <span>{intent === "pause" || status === "blocked" ? "Paused" : "Rec"}</span>
    </span>
  )
  const tc = cut && (
    <span className="pico-tc" aria-hidden="true">
      <span className="pico-tc-now" />
      <span className="pico-tc-dur"> / {timecode(cut.duration)}</span>
    </span>
  )
  const caption = cur && (
    <span className="pico-cap" aria-hidden="true">
      <span className="pico-cap-no">
        {two(chapter + 1)}
        <i>/</i>
        {two(n)}
      </span>
      <Decode className="pico-cap-text" text={cur.feature} animate={motion && running} />
    </span>
  )
  const pp = interactive && (
    <button
      ref={ppRef}
      type="button"
      className="pico-pp"
      tabIndex={showPill ? -1 : undefined}
      onClick={toggle}
      aria-label={running ? "Pause the Pico film" : "Play the Pico film"}
      data-cursor={running ? "Pause" : "Play"}
    >
      {running ? <PauseIcon /> : <PlayIcon />}
    </button>
  )
  const rail = (labels: boolean) =>
    cut && (
      <div
        className="pico-rail"
        role={interactive ? "group" : undefined}
        aria-label={interactive ? "Film chapters" : undefined}
        aria-hidden={interactive ? undefined : true}
        onPointerDown={interactive && geo?.layout !== "side" ? onRailDown : undefined}
        onPointerMove={interactive && geo?.layout !== "side" ? onRailMove : undefined}
        onPointerUp={interactive && geo?.layout !== "side" ? onRailUp : undefined}
        onPointerCancel={interactive && geo?.layout !== "side" ? onRailUp : undefined}
        onKeyDown={interactive ? onRailKey : undefined}
      >
        {cut.chapters.map((c, i) => {
          const inner = (
            <>
              <span className="pico-ch-track">
                <span className="pico-ch-fill" />
              </span>
              {labels && (
                <span className="pico-ch-label">
                  <b>{two(i + 1)}</b>
                  {c.label}
                </span>
              )}
              {labels && interactive && geo?.layout === "wide" && (
                <span className="pico-ch-tip" aria-hidden="true">
                  {c.feature}
                  <em>{clock(c.start)}</em>
                </span>
              )}
            </>
          )
          return interactive ? (
            <button
              key={c.id}
              type="button"
              className="pico-ch"
              aria-current={i === chapter ? "true" : undefined}
              aria-label={`${c.label}: ${c.feature}. From ${clock(c.start)}.`}
              tabIndex={i === chapter ? 0 : -1}
              data-cursor="Jump"
              onClick={() => jump(i)}
            >
              {inner}
            </button>
          ) : (
            <span key={c.id} className="pico-ch" data-current={i === chapter ? "true" : undefined}>
              {inner}
            </span>
          )
        })}
      </div>
    )

  let chrome = null
  if (geo && cut) {
    if (geo.layout === "wide") {
      chrome = (
        <>
          <div className="pico-top">
            {rec}
            {caption}
            {tc}
          </div>
          <div className="pico-bot">
            {pp}
            {rail(true)}
          </div>
        </>
      )
    } else if (geo.layout === "stack") {
      chrome = (
        <>
          <div className="pico-top">
            {rec}
            {tc}
          </div>
          <div className="pico-bot">
            <div className="pico-bot-row">
              {pp}
              {rail(false)}
            </div>
            {caption}
          </div>
        </>
      )
    } else if (geo.layout === "side") {
      chrome = (
        <>
          <div className="pico-col pico-col-l">
            {rec}
            {caption}
            <div className="pico-col-foot">
              {tc}
              {pp}
            </div>
          </div>
          <div className="pico-col pico-col-r">{rail(true)}</div>
        </>
      )
    } else {
      chrome = (
        <>
          <div className="pico-mini-rec">{rec}</div>
          <div className="pico-mini-rail">{rail(false)}</div>
          <div className="pico-mini-tc">{tc}</div>
        </>
      )
    }
  }

  return (
    <div
      ref={rootRef}
      className="pico-x"
      style={vars}
      data-layout={geo?.layout}
      data-cut={geo?.cut}
      data-mode={mode}
      data-status={status}
      data-intent={intent}
      data-running={running ? "1" : undefined}
      data-reveal={reveal}
      data-motion={motion ? "full" : "reduce"}
      data-dim={showPill ? "1" : undefined}
      data-scrub={scrubbing ? "1" : undefined}
      role="group"
      aria-label={cut?.id === "tall" ? "Pico product film, vertical cut" : "Pico product film"}
      aria-describedby={descId}
    >
      {geo && cut && (
        <>
          <canvas ref={glowRef} className="pico-glow" aria-hidden="true" />
          <div className="pico-falloff" aria-hidden="true" />
          <div
            className="pico-film"
            onClick={interactive ? toggle : undefined}
            data-cursor={interactive ? (running ? "Pause" : "Play") : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={posterRef}
              key={cut.poster}
              className="pico-poster"
              src={cut.poster}
              alt=""
              decoding="async"
              draggable={false}
              onLoad={() => paint(1)}
            />
            {hasVideo && (
              <video
                key={cut.id}
                ref={setVideo}
                className="pico-vid"
                src={cut.src}
                muted
                playsInline
                loop
                preload={primed ? "auto" : "none"}
                disablePictureInPicture
                disableRemotePlayback
                tabIndex={-1}
                aria-hidden="true"
                onPlaying={onPlaying}
                onPause={onPause}
                onWaiting={onWaiting}
                onLoadedMetadata={onLoadedMeta}
                onLoadedData={onLoadedData}
                onSeeked={onSeeked}
                onError={onError}
              />
            )}
            <span className="pico-scrim" aria-hidden="true" />
            <span className="pico-slit" aria-hidden="true" />
            <span className="pico-sheen" aria-hidden="true" />
          </div>
          <div className="pico-grain" aria-hidden="true" />
          <div className="pico-vignette" aria-hidden="true" />
          {showPill && (
            <button
              type="button"
              className="pico-pill"
              onClick={(e) => {
                pillHadFocus.current = document.activeElement === e.currentTarget
                toggle()
              }}
              aria-label={
                played.current ? "Resume the Pico film" : `Play the Pico film, ${clock(cut.duration)}, no sound`
              }
              data-cursor="Play"
            >
              <span className="pico-pill-icon">
                <PlayIcon />
              </span>
              <span className="pico-pill-text">
                {played.current ? (
                  "Resume"
                ) : (
                  <>
                    Play film<em>{clock(cut.duration)}</em>
                  </>
                )}
              </span>
            </button>
          )}
          {chrome}
          <p id={descId} className="pico-sr">
            {cut.transcript}
          </p>
        </>
      )}
    </div>
  )
}
