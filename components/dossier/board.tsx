"use client"

// The evidence board: Harish's own link chart. Every skill card is tied with red string to the
// work that proves it. Cards can be dragged (fine pointers). A string tightens as you pull its card
// away, droops as you bring it closer (it has a fixed length), and wobbles as it settles.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { dossier } from "./store"
import { jump } from "./smooth-scroll"
import { play } from "@/lib/sound"
import { MATRIX } from "@/lib/dossier"
import { COMPACT, EDGES, ITEM, ITEMS, WIDE, pinPenalty, pinsOf, type Edge, type Item, type Layout } from "./board-data"
import { CaseCard, CertCard, JobCard, SkillCard, SubjectCard, TrainingCard, itemLabel } from "./board-items"
import { BoardReadout } from "./board-readout"

type Pos = { x: number; y: number; r: number }
type Pt = { x: number; y: number }
type Focus = { id: string; line?: number } | null
type Phase = "static" | "armed" | "playing" | "done"
/** How one string is tied: pin indexes on each end, which end it is drawn from, its resting chord and rope length. */
type Tie = { pa: number; pb: number; flip: boolean; dist: number; rest: number; rope: number; slack: number }
/** A string's live state: the control point of its curve and that point's velocity. */
type Str = { cx: number; cy: number; vx: number; vy: number; key: string; paths: SVGPathElement[] }

// ---------- geometry ----------

const RAD = Math.PI / 180
/** a lit string pulls to this fraction of its sag */
const TIGHT = 0.22
const MAX_SAG = 150
const K_STRING = 190
const C_STRING = 12
const K_SPIN = 170
const C_SPIN = 14
/** a rope's sag from its length L and chord D: sqrt(3/16 (L² − D²)), exact for shallow sags, sane for deep ones */
const SAG_K = 0.1875

function pinPoint(it: Item, p: Pos, off: [number, number]): Pt {
  const lx = off[0] - it.w / 2
  const ly = off[1] - it.h / 2
  const c = Math.cos(p.r * RAD)
  const s = Math.sin(p.r * RAD)
  return { x: p.x + it.w / 2 + lx * c - ly * s, y: p.y + it.h / 2 + lx * s + ly * c }
}

/** The sag a string is given in the home layout: grows with span, mostly with horizontal span. */
function designSag(a: Pt, b: Pt) {
  return Math.min(58, 2 + Math.abs(b.x - a.x) * 0.062 + Math.abs(b.y - a.y) * 0.018)
}

/**
 * Where the curve's control point rests (k < 1 pulls it tighter). Brought closer than at home, the string
 * droops like a rope of fixed length; pulled further, it tightens, down to a third of its natural sag.
 */
function restCtrl(A: Pt, B: Pt, t: Tie, k = 1): Pt {
  const D = Math.hypot(B.x - A.x, B.y - A.y)
  const natural = designSag(A, B) * t.slack
  const sag =
    D <= t.rest
      ? Math.max(natural, Math.sqrt(Math.max(0, SAG_K * (t.rope * t.rope - D * D))))
      : natural * Math.max(0.3, 1 - (D / t.rest - 1) * 1.5)
  // the curve's midpoint hangs `sag` below the chord when the control point sits 2·sag below it
  return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 + 2 * Math.min(MAX_SAG, sag) * k }
}

const f1 = (n: number) => Math.round(n * 10) / 10
const pathOf = (a: Pt, c: Pt, b: Pt) => `M${f1(a.x)} ${f1(a.y)}Q${f1(c.x)} ${f1(c.y)} ${f1(b.x)} ${f1(b.y)}`
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

const homeOf = (layout: Layout): Record<string, Pos> =>
  Object.fromEntries(ITEMS.map((it) => [it.id, { ...layout.at[it.id] }])) as Record<string, Pos>

const ends = (e: Edge, t: Tie, at: Record<string, Pos>, layout: Layout): [Pt, Pt] => [
  pinPoint(ITEM[e.a], at[e.a], pinsOf(e.a, layout)[t.pa]),
  pinPoint(ITEM[e.b], at[e.b], pinsOf(e.b, layout)[t.pb]),
]

/** Tie every string onto the closest pin pair in the home layout and measure its rope. */
function rigOf(layout: Layout): Record<string, Tie> {
  const home = homeOf(layout)
  const subj = home.subject
  const sc = { x: subj.x + ITEM.subject.w / 2, y: subj.y + ITEM.subject.h / 2 }
  const out: Record<string, Tie> = {}
  for (const e of EDGES) {
    const A = ITEM[e.a]
    const B = ITEM[e.b]
    const pa = pinsOf(e.a, layout)
    const pb = pinsOf(e.b, layout)
    let best = { pa: 0, pb: 0, d: Infinity }
    const forced = layout.ties?.[e.id]
    if (forced) best = { pa: forced[0], pb: forced[1], d: 0 }
    else
      pa.forEach((oa, i) =>
        pb.forEach((ob, j) => {
          const p = pinPoint(A, home[e.a], oa)
          const q = pinPoint(B, home[e.b], ob)
          const d = Math.hypot(p.x - q.x, p.y - q.y) + pinPenalty(e.a, i) + pinPenalty(e.b, j)
          if (d < best.d) best = { pa: i, pb: j, d }
        }),
      )
    const p = pinPoint(A, home[e.a], pa[best.pa])
    const q = pinPoint(B, home[e.b], pb[best.pb])
    const D = Math.max(1, Math.hypot(p.x - q.x, p.y - q.y))
    const slack = layout.slack?.[e.id] ?? 1
    const s0 = designSag(p, q) * slack
    const dp = Math.hypot(p.x - sc.x, p.y - sc.y)
    const dq = Math.hypot(q.x - sc.x, q.y - sc.y)
    out[e.id] = {
      pa: best.pa,
      pb: best.pb,
      flip: dq < dp,
      dist: Math.min(dp, dq),
      rest: D,
      rope: Math.sqrt(D * D + (s0 * s0) / SAG_K),
      slack,
    }
  }
  return out
}

// ---------- notes ----------
// Torn slips in the analyst's red pen, in patches of cork no string crosses. Same hand and arrows as
// the PenNote primitive, but plain markup (CSS draws the arrow), so they read without JavaScript too.

const ARROW = {
  up: { box: "0 0 40 70", w: 22, h: 36, d: "M26 66 C 10 46, 12 24, 30 6 M30 6 L 16 16 M30 6 L 36 20" },
  right: { box: "0 0 74 40", w: 36, h: 20, d: "M4 30 C 22 10, 44 12, 68 26 M68 26 L 56 14 M68 26 L 54 34" },
}

type Note = { text: string; x: number; y: number; r: number; arrow: "right" | "up"; cls: string }
const NOTES: Record<Layout["name"], Note[]> = {
  wide: [
    { text: "follow the|red string", x: 900, y: 478, r: -3.5, arrow: "up", cls: "board-note-follow" },
    { text: "drag the cards", x: 716, y: 646, r: 1.5, arrow: "right", cls: "board-note-drag" },
  ],
  compact: [
    { text: "follow the|red string", x: 24, y: 672, r: -4, arrow: "up", cls: "board-note-follow" },
    { text: "drag the cards", x: 748, y: 798, r: -2, arrow: "right", cls: "board-note-drag" },
  ],
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
const finePointer = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches

const cursorWord = (it: Item) =>
  it.kind === "case"
    ? "Open file"
    : it.kind === "job" || it.kind === "training"
      ? "Go to record"
      : it.kind === "cert"
        ? "Go to certs"
        : "Drag"

/** For each evidence item, the skills it proves (for its accessible name). */
const SKILLS_CITING: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {}
  for (const e of EDGES) {
    if (ITEM[e.a].kind !== "skill") continue
    const tac = MATRIX[Number(ITEM[e.a].ref)]
    out[e.b] = [...(out[e.b] ?? []), ...e.skills.map((i) => tac.techniques[i].name)]
  }
  return out
})()

// ---------- component ----------

/**
 * intro "scroll": the entrance plays when the board first scrolls into view.
 * intro "now": it plays right away (the visitor just switched to the board).
 */
export function EvidenceBoard({ intro = "scroll" }: { intro?: "scroll" | "now" }) {
  const [layout, setLayout] = useState<Layout>(WIDE)
  const home = useMemo(() => homeOf(layout), [layout])
  const rig = useMemo(() => rigOf(layout), [layout])

  const [phase, setPhase] = useState<Phase>("static")
  const [near, setNear] = useState(false)
  const [hover, setHover] = useState<Focus>(null)
  const [kbd, setKbd] = useState<Focus>(null)
  const [picked, setPicked] = useState<Focus>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [moved, setMoved] = useState(false)

  const frameRef = useRef<HTMLDivElement>(null)
  const corkRef = useRef<HTMLDivElement>(null)
  const lampRef = useRef<HTMLDivElement>(null)
  const itemEls = useRef<Record<string, HTMLDivElement | null>>({})
  const pinEls = useRef<Record<string, HTMLSpanElement | null>>({})
  const strs = useRef<Record<string, Str>>({})

  // live geometry, read by the frame loop
  const layoutRef = useRef(layout)
  const rigRef = useRef(rig)
  const homeRef = useRef(home)
  layoutRef.current = layout
  rigRef.current = rig
  homeRef.current = home

  const pos = useRef<Record<string, Pos>>(homeOf(WIDE))
  const spin = useRef<Record<string, { v: number; target: number }>>({})
  const scale = useRef(1)
  const hot = useRef<Set<string>>(new Set())
  /** the card just let go of: its strings sag back even while it is still hovered */
  const relaxed = useRef<string | null>(null)
  const loop = useRef({ raf: 0, running: false, last: 0 })
  const tidyAnim = useRef<{ t0: number; from: Record<string, Pos> } | null>(null)
  const drag = useRef<{
    id: string
    pid: number
    sx: number
    sy: number
    ox: number
    oy: number
    moved: boolean
    lx: number
    lt: number
    vx: number
  } | null>(null)
  const suppressClick = useRef(false)
  const topZ = useRef(100)
  const timers = useRef<number[]>([])
  const lineLeave = useRef(0)
  const kbdLeave = useRef(0)
  const lampRaf = useRef(0)

  // ---------- what is lit ----------

  const focus: Focus = dragId ? { id: dragId } : hover ?? kbd ?? picked

  const view = useMemo(() => {
    const hotEdges = new Set<string>()
    const lit = new Set<string>()
    const hits: Record<string, number[]> = {}
    if (!focus) return { hotEdges, lit, hits }
    lit.add(focus.id)
    for (const e of EDGES) {
      if (e.a !== focus.id && e.b !== focus.id) continue
      if (focus.line != null && !(e.a === focus.id && e.skills.includes(focus.line))) continue
      hotEdges.add(e.id)
      lit.add(e.a)
      lit.add(e.b)
      // reverse lookup: an evidence card lights the exact skills it proves
      if (e.b === focus.id && ITEM[e.a].kind === "skill") hits[e.a] = e.skills
    }
    if (focus.line != null) hits[focus.id] = [focus.line]
    return { hotEdges, lit, hits }
  }, [focus?.id, focus?.line]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- frame loop: card swing, tidy, string springs. Runs only while something moves. ----------

  const applyItem = useCallback((id: string) => {
    const el = itemEls.current[id]
    const p = pos.current[id]
    if (el) el.style.transform = `translate3d(${f1(p.x)}px, ${f1(p.y)}px, 0) rotate(${Math.round(p.r * 100) / 100}deg)`
    const it = ITEM[id]
    pinsOf(id, layoutRef.current).forEach((off, i) => {
      const pin = pinEls.current[`${id}:${i}`]
      if (!pin) return
      const q = pinPoint(it, p, off)
      pin.style.transform = `translate3d(${f1(q.x)}px, ${f1(q.y)}px, 0)`
    })
  }, [])

  const step = useCallback(
    (now: number) => {
      const L = loop.current
      const dt = Math.min(0.034, Math.max(0.001, (now - L.last) / 1000))
      L.last = now
      const still = reduced()
      const d = drag.current
      let busy = !!d?.moved

      // a held card that stops moving swings back to its own tilt
      if (d?.moved && now - d.lt > 60 && Math.abs(d.vx) > 1) {
        d.vx *= 0.82
        const s = spin.current[d.id]
        if (s) s.target = homeRef.current[d.id].r + clamp(d.vx * 0.011, -11, 11)
      }

      const T = tidyAnim.current
      if (T) {
        const k = still ? 1 : Math.min(1, (now - T.t0) / 760)
        const e = 1 - Math.pow(1 - k, 4)
        for (const it of ITEMS) {
          const a = T.from[it.id]
          const b = homeRef.current[it.id]
          pos.current[it.id] = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, r: a.r + (b.r - a.r) * e }
          applyItem(it.id)
        }
        if (k >= 1) tidyAnim.current = null
        else busy = true
      }

      for (const id in spin.current) {
        const s = spin.current[id]
        const p = pos.current[id]
        if (still) {
          p.r = s.target
          delete spin.current[id]
        } else {
          s.v += (K_SPIN * (s.target - p.r) - C_SPIN * s.v) * dt
          p.r += s.v * dt
          if (Math.abs(s.target - p.r) < 0.01 && Math.abs(s.v) < 0.01 && d?.id !== id) {
            p.r = s.target
            delete spin.current[id]
          } else busy = true
        }
        applyItem(id)
      }

      const lay = layoutRef.current
      const R = rigRef.current
      for (const e of EDGES) {
        const s = strs.current[e.id]
        if (!s) continue
        const t = R[e.id]
        const [A, B] = ends(e, t, pos.current, lay)
        const tight = hot.current.has(e.id) && relaxed.current !== e.a && relaxed.current !== e.b ? TIGHT : 1
        const c = restCtrl(A, B, t, tight)
        if (still || Number.isNaN(s.cx)) {
          s.cx = c.x
          s.cy = c.y
          s.vx = s.vy = 0
        } else {
          s.vx += (K_STRING * (c.x - s.cx) - C_STRING * s.vx) * dt
          s.vy += (K_STRING * (c.y - s.cy) - C_STRING * s.vy) * dt
          s.cx += s.vx * dt
          s.cy += s.vy * dt
          if (Math.abs(c.x - s.cx) < 0.03 && Math.abs(c.y - s.cy) < 0.03 && Math.abs(s.vx) < 0.03 && Math.abs(s.vy) < 0.03) {
            s.cx = c.x
            s.cy = c.y
            s.vx = s.vy = 0
          } else busy = true
        }
        const [p0, p1] = t.flip ? [B, A] : [A, B]
        const path = pathOf(p0, { x: s.cx, y: s.cy }, p1)
        if (path !== s.key) {
          s.key = path
          for (const el of s.paths) el.setAttribute("d", path)
        }
      }

      if (busy && !document.hidden) L.raf = requestAnimationFrame(step)
      else L.running = false
    },
    [applyItem],
  )

  const kick = useCallback(() => {
    const L = loop.current
    if (L.running) return
    L.running = true
    L.last = performance.now()
    L.raf = requestAnimationFrame(step)
  }, [step])

  useEffect(
    () => () => {
      cancelAnimationFrame(loop.current.raf)
      cancelAnimationFrame(lampRaf.current)
      window.clearTimeout(lineLeave.current)
      window.clearTimeout(kbdLeave.current)
      loop.current.running = false
    },
    [],
  )

  useEffect(() => {
    hot.current = view.hotEdges
    kick()
  }, [view, kick])

  // the loop parks while the tab is hidden; pick up where it left off
  useEffect(() => {
    const onVis = () => !document.hidden && kick()
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [kick])

  // ---------- layout + scale ----------

  const setScale = useCallback(() => {
    const cork = corkRef.current
    if (!cork) return
    const s = cork.clientWidth / layoutRef.current.W
    if (s > 0) {
      scale.current = s
      cork.style.setProperty("--s", String(s))
    }
  }, [])

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const measure = () => {
      const w = frame.clientWidth
      if (!w) return
      const next = w < 1060 ? COMPACT : WIDE
      setLayout((cur) => (cur.name === next.name ? cur : next))
      setScale()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(frame)
    if (corkRef.current) ro.observe(corkRef.current)
    return () => ro.disconnect()
  }, [setScale])

  // a new layout: everything goes home and the strings come to rest
  useLayoutEffect(() => {
    pos.current = homeOf(layout)
    spin.current = {}
    tidyAnim.current = null
    for (const it of ITEMS) applyItem(it.id)
    for (const e of EDGES) {
      const s = strs.current[e.id]
      if (!s) continue
      const [A, B] = ends(e, rig[e.id], pos.current, layout)
      const c = restCtrl(A, B, rig[e.id])
      s.cx = c.x
      s.cy = c.y
      s.vx = s.vy = 0
      s.key = ""
    }
    setScale()
    setMoved(false)
    kick()
  }, [layout, rig, applyItem, kick, setScale])

  // ---------- strings: first paint (also the server render) ----------

  const restPaths = useMemo(() => {
    const out: Record<string, string> = {}
    for (const e of EDGES) {
      const t = rig[e.id]
      const [A, B] = ends(e, t, home, layout)
      const [p0, p1] = t.flip ? [B, A] : [A, B]
      out[e.id] = pathOf(p0, restCtrl(A, B, t), p1)
    }
    return out
  }, [layout, home, rig])

  // one stable ref per string, so re-renders never reset its spring
  const stringRefs = useMemo(
    () =>
      Object.fromEntries(
        EDGES.map((e) => [
          e.id,
          (g: SVGGElement | null) => {
            if (!g) return
            const paths = Array.from(g.querySelectorAll("path"))
            const prev = strs.current[e.id]
            strs.current[e.id] = prev ? { ...prev, paths } : { cx: NaN, cy: NaN, vx: 0, vy: 0, key: "", paths }
          },
        ]),
      ) as Record<string, (g: SVGGElement | null) => void>,
    [],
  )

  // ---------- camera: the board tilts up off the desk as it scrolls in ----------

  useEffect(() => {
    const el = frameRef.current
    if (!el || reduced()) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { rotateX: 11, scale: 0.94, y: 30, transformPerspective: 1700, transformOrigin: "50% 100%" },
        {
          rotateX: 0,
          scale: 1,
          y: 0,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top 28%", scrub: 0.7 },
          // settle to no transform at all, so the resting board is crisp
          onComplete: () => gsap.set(el, { clearProps: "transform" }),
        },
      )
    }, el)
    return () => ctx.revert()
  }, [])

  // ---------- exhibits mount only when the board is near ----------

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        setNear(true)
        io.disconnect()
      },
      { rootMargin: "700px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // ---------- entrance: pinned one by one, then the string runs out from the subject ----------

  useLayoutEffect(() => {
    if (reduced()) return setPhase("done")
    const el = frameRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const visible = r.height > 0 && r.top < window.innerHeight * 0.8 && r.bottom > 0
    // on screen at load (a reload mid-page): no show, just the board. Switched to on purpose: the show.
    if (intro === "now") setPhase(visible ? "playing" : "armed")
    else setPhase(visible ? "done" : "armed")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== "armed") return
    const el = frameRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        setPhase("playing")
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [phase])

  useLayoutEffect(() => {
    if (phase !== "playing") return
    const anims: Animation[] = []
    const order = [...ITEMS].sort((a, b) => a.order - b.order)
    const STAG = 72
    order.forEach((it, i) => {
      const delay = 80 + i * STAG
      const card = itemEls.current[it.id]?.querySelector<HTMLElement>(".bi-drop")
      const tilt = (i % 2 ? -1 : 1) * (5 + (i % 3) * 2)
      if (card)
        anims.push(
          card.animate(
            [
              { opacity: 0, transform: `translate3d(0, -30px, 0) scale(1.18) rotate(${tilt}deg)`, filter: "brightness(1.08)" },
              { opacity: 1, offset: 0.35 },
              { opacity: 1, transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)", filter: "brightness(1)" },
            ],
            { duration: 540, delay, easing: "cubic-bezier(.25, 1.25, .45, 1)", fill: "backwards" },
          ),
        )
      pinsOf(it.id, layout).forEach((_, j) => {
        const head = pinEls.current[`${it.id}:${j}`]?.firstElementChild as HTMLElement | null
        if (head)
          anims.push(
            head.animate(
              [
                { opacity: 0, scale: 2.6 },
                { opacity: 1, scale: 0.86, offset: 0.7 },
                { opacity: 1, scale: 1 },
              ],
              { duration: 260, delay: delay + 330 + j * 60, easing: "cubic-bezier(.3, .7, .3, 1)", fill: "backwards" },
            ),
          )
      })
      timers.current.push(window.setTimeout(() => play("tick", { volume: 0.5 }), delay + 340))
    })

    // the subject's strings first, then a ripple outward, each drawn from the end nearer the subject
    const t0 = 80 + order.length * STAG - 120
    let end = t0
    for (const e of EDGES) {
      const s = strs.current[e.id]
      if (!s) continue
      const delay = t0 + (e.a === "subject" ? 0 : 260 + rig[e.id].dist * 0.75)
      s.paths.forEach((p) => {
        if (p.classList.contains("str-strand")) {
          anims.push(p.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: "backwards" }))
          return
        }
        const len = p.getTotalLength()
        const dur = 420 + len * 0.55
        p.style.strokeDasharray = `${len} ${len + 2}`
        const a = p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], {
          duration: dur,
          delay,
          easing: "cubic-bezier(.45, .05, .2, 1)",
          fill: "backwards",
        })
        a.onfinish = () => (p.style.strokeDasharray = "")
        anims.push(a)
        end = Math.max(end, delay + dur)
      })
    }
    timers.current.push(window.setTimeout(() => play("whoosh", { volume: 0.35 }), t0))
    timers.current.push(window.setTimeout(() => setPhase("done"), end + 60))

    return () => {
      anims.forEach((a) => a.cancel())
      for (const e of EDGES) strs.current[e.id]?.paths.forEach((p) => (p.style.strokeDasharray = ""))
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- tidy ----------

  const tidy = useCallback(() => {
    drag.current = null
    tidyAnim.current = { t0: performance.now(), from: JSON.parse(JSON.stringify(pos.current)) }
    spin.current = {}
    relaxed.current = null
    for (const it of ITEMS) {
      const el = itemEls.current[it.id]
      if (el) el.style.zIndex = ""
    }
    topZ.current = 100
    play("paper", { volume: 0.5 })
    setMoved(false)
    kick()
  }, [kick])

  // ---------- pointer: drag (mouse and pen; touch scrolls the page) ----------

  const onDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (e.button !== 0 || (e.pointerType !== "mouse" && e.pointerType !== "pen")) return
    if (phase === "playing" || phase === "armed") return
    const p = pos.current[id]
    // the on-screen scale right now (the board may still be tilting in)
    const cork = corkRef.current
    if (cork) scale.current = cork.getBoundingClientRect().width / layoutRef.current.W || scale.current
    drag.current = { id, pid: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, moved: false, lx: p.x, lt: performance.now(), vx: 0 }
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pid) return
    const s = scale.current || 1
    const dx = (e.clientX - d.sx) / s
    const dy = (e.clientY - d.sy) / s
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 5) return
      d.moved = true
      tidyAnim.current = null
      const el = itemEls.current[d.id]
      el?.setPointerCapture(e.pointerId)
      if (el) el.style.zIndex = String(++topZ.current)
      relaxed.current = null
      setDragId(d.id)
      setMoved(true)
      play("paper", { volume: 0.35 })
    }
    e.preventDefault()
    const it = ITEM[d.id]
    const L = layoutRef.current
    const p = pos.current[d.id]
    p.x = clamp(d.ox + dx, 4, L.W - it.w - 4)
    p.y = clamp(d.oy + dy, 4, L.H - it.h - 4)
    const now = performance.now()
    const inst = ((p.x - d.lx) / Math.max(1, now - d.lt)) * 1000
    d.vx = d.vx * 0.75 + inst * 0.25
    d.lx = p.x
    d.lt = now
    const homeR = homeRef.current[d.id].r
    spin.current[d.id] = { v: spin.current[d.id]?.v ?? 0, target: reduced() ? homeR : homeR + clamp(d.vx * 0.011, -11, 11) }
    applyItem(d.id)
    kick()
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pid) return
    drag.current = null
    if (!d.moved) return
    suppressClick.current = true
    window.setTimeout(() => (suppressClick.current = false), 0)
    spin.current[d.id] = { v: spin.current[d.id]?.v ?? 0, target: homeRef.current[d.id].r }
    relaxed.current = d.id
    setDragId(null)
    // the pins go back in
    if (!reduced())
      pinsOf(d.id, layoutRef.current).forEach((_, j) => {
        const head = pinEls.current[`${d.id}:${j}`]?.firstElementChild as HTMLElement | null
        head?.animate([{ scale: 1.5 }, { scale: 0.88, offset: 0.65 }, { scale: 1 }], {
          duration: 300,
          delay: j * 50,
          easing: "cubic-bezier(.3,.7,.3,1)",
        })
      })
    play("tick")
    kick()
  }

  // ---------- the lamp: a warm pool of light that trails the pointer ----------

  const moveLamp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return
    const x = e.clientX
    const y = e.clientY
    cancelAnimationFrame(lampRaf.current)
    lampRaf.current = requestAnimationFrame(() => {
      const cork = corkRef.current
      const lamp = lampRef.current
      if (!cork || !lamp) return
      const r = cork.getBoundingClientRect()
      lamp.style.transform = `translate3d(${Math.round(x - r.left)}px, ${Math.round(y - r.top)}px, 0)`
      lamp.classList.add("is-on")
      frameRef.current?.classList.add("is-lamp")
    })
  }
  const hideLamp = () => {
    cancelAnimationFrame(lampRaf.current)
    lampRef.current?.classList.remove("is-on")
    frameRef.current?.classList.remove("is-lamp")
  }

  // ---------- focus: pointer, keyboard, click ----------

  const enter = (e: React.PointerEvent, id: string) => {
    if (e.pointerType !== "mouse" || drag.current?.moved) return
    setHover({ id })
  }
  const leave = (e: React.PointerEvent, id: string) => {
    if (e.pointerType !== "mouse" || drag.current?.moved) return
    if (relaxed.current === id) relaxed.current = null
    setHover((h) => (h?.id === id ? null : h))
  }

  const onLine = useCallback((t: number, i: number | null) => {
    const id = MATRIX[t].id
    window.clearTimeout(lineLeave.current)
    if (i === null) {
      // wait a beat so gliding between lines does not flash the whole card's strings
      lineLeave.current = window.setTimeout(() => setHover((h) => (h?.id === id ? { id } : h)), 45)
      return
    }
    setHover({ id, line: i })
  }, [])

  const onLineFocus = useCallback((t: number, i: number | null) => {
    const id = MATRIX[t].id
    window.clearTimeout(kbdLeave.current)
    if (i === null) {
      kbdLeave.current = window.setTimeout(() => setKbd((k) => (k?.id === id && k.line != null ? null : k)), 30)
      return
    }
    setKbd({ id, line: i })
  }, [])

  const onLineKey = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, t: number, i: number) => {
    const list = e.currentTarget.closest("ul")
    const n = MATRIX[t].techniques.length
    const go = (j: number) => list?.querySelector<HTMLButtonElement>(`[data-line="${j}"]`)?.focus()
    if (e.key === "ArrowDown") {
      e.preventDefault()
      go((i + 1) % n)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      go((i - 1 + n) % n)
    } else if (e.key === "Escape" || e.key === "ArrowLeft") {
      e.preventDefault()
      e.stopPropagation()
      itemEls.current[MATRIX[t].id]?.querySelector<HTMLButtonElement>(".bi-hit")?.focus()
    }
  }, [])

  const onLineClick = useCallback((t: number, i: number) => {
    const id = MATRIX[t].id
    setPicked((p) => (p?.id === id && p.line === i ? null : { id, line: i }))
  }, [])

  const hitKey = (e: React.KeyboardEvent<HTMLButtonElement>, it: Item) => {
    if (it.kind === "skill" && (e.key === "ArrowDown" || e.key === "ArrowRight")) {
      e.preventDefault()
      itemEls.current[it.id]?.querySelector<HTMLButtonElement>('[data-line="0"]')?.focus()
    }
  }

  const activate = (it: Item) => {
    if (suppressClick.current) return
    switch (it.kind) {
      case "case":
        play("paper")
        dossier.openCase(it.ref)
        break
      case "job":
      case "training":
        jump(`rec-${it.ref}`)
        break
      case "cert":
        jump("honours")
        break
      default:
        setPicked((p) => (p?.id === it.id && p.line == null ? null : { id: it.id }))
    }
  }

  // ---------- render ----------

  const L = layout
  const notesIn = phase === "done" || phase === "static"
  const pins = useMemo(() => {
    const used = new Set<string>()
    for (const e of EDGES) {
      used.add(`${e.a}:${rig[e.id].pa}`)
      used.add(`${e.b}:${rig[e.id].pb}`)
    }
    return ITEMS.flatMap((it) =>
      pinsOf(it.id, layout)
        .map((off, i) => ({ it, i, off }))
        .filter(({ i }) => i === 0 || used.has(`${it.id}:${i}`)),
    )
  }, [layout, rig])

  return (
    <>
    <div
      ref={frameRef}
      className={`board phase-${phase} ${focus ? "has-focus" : ""} ${dragId ? "is-dragging" : ""}`}
      data-layout={L.name}
      style={{ ["--ar" as string]: L.W / L.H }}
      role="group"
      aria-label="Evidence board"
      aria-describedby="board-help"
      onKeyDown={(e) => e.key === "Escape" && setPicked(null)}
    >
      <p id="board-help" className="board-help">
        Each card on the board is a button. On a skill area, press the down arrow to step through its skills; red string
        ties each skill to its evidence. Projects open their case file; jobs, training and the certification jump to
        their entry further down. The List view shows the same skills and evidence as a table.
      </p>
      <div className="board-scroller" data-lenis-prevent-horizontal>
        <div
          ref={corkRef}
          className="board-cork"
          style={{ aspectRatio: `${L.W} / ${L.H}`, ["--bw" as string]: `${L.W}px` }}
          onPointerDown={(e) => {
            if (!(e.target as HTMLElement).closest(".bi")) setPicked(null)
          }}
          onPointerMove={(e) => !reduced() && finePointer() && moveLamp(e)}
          onPointerLeave={hideLamp}
        >
          <div className="board-stage" style={{ width: L.W, height: L.H }}>
            <div className="board-items">
              {NOTES[L.name].map((n) => {
                const a = ARROW[n.arrow]
                const arrow = (
                  <svg className="pen-arrow" viewBox={a.box} width={a.w} height={a.h} aria-hidden="true">
                    <path d={a.d} pathLength={1} />
                  </svg>
                )
                return (
                  <div
                    key={n.text}
                    className={`board-note ${n.cls} ${notesIn ? "is-in" : ""}`}
                    style={{ left: n.x, top: n.y, rotate: `${n.r}deg` }}
                    aria-hidden="true"
                  >
                    <span className={`pen ${n.arrow === "up" ? "pen-v" : ""}`}>
                      {n.arrow === "up" && arrow}
                      <span className="pen-text">
                        {n.text.split("|").map((line, i) => (
                          <span key={line}>
                            {i > 0 && <br />}
                            {line}
                          </span>
                        ))}
                      </span>
                      {n.arrow !== "up" && arrow}
                    </span>
                  </div>
                )
              })}

              {ITEMS.map((it) => {
                const p = home[it.id]
                const lit = view.lit.has(it.id)
                const isFocus = focus?.id === it.id
                return (
                  <div
                    key={it.id}
                    ref={(el) => {
                      itemEls.current[it.id] = el
                    }}
                    className={`bi bi-${it.kind} ${isFocus ? "is-focus" : ""} ${lit && !isFocus ? "is-lit" : ""} ${
                      focus && !lit ? "is-dim" : ""
                    } ${dragId === it.id ? "is-held" : ""}`}
                    style={{ width: it.w, height: it.h, transform: `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.r}deg)` }}
                    data-id={it.id}
                    data-cursor={cursorWord(it)}
                    onPointerDown={(e) => onDown(e, it.id)}
                    onPointerMove={onMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onPointerEnter={(e) => enter(e, it.id)}
                    onPointerLeave={(e) => leave(e, it.id)}
                    onClickCapture={(e) => {
                      if (suppressClick.current) {
                        e.preventDefault()
                        e.stopPropagation()
                      }
                    }}
                  >
                    <div className="bi-drop">
                      <div className="bi-lift">
                        {it.kind === "subject" && <SubjectCard />}
                        {it.kind === "case" && <CaseCard id={it.ref} near={near} />}
                        {it.kind === "job" && <JobCard id={it.ref} />}
                        {it.kind === "training" && <TrainingCard id={it.ref} />}
                        {it.kind === "cert" && <CertCard />}
                        {it.kind === "skill" && (
                          <SkillCard
                            t={Number(it.ref)}
                            hits={view.hits[it.id] ?? null}
                            onLine={onLine}
                            onLineKey={onLineKey}
                            onLineClick={onLineClick}
                            onLineFocus={onLineFocus}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        className="bi-hit"
                        aria-label={itemLabel(it, SKILLS_CITING[it.id] ?? [])}
                        aria-pressed={
                          it.kind === "skill" || it.kind === "subject" ? picked?.id === it.id && picked.line == null : undefined
                        }
                        onFocus={(e) => e.currentTarget.matches(":focus-visible") && setKbd({ id: it.id })}
                        onBlur={() => setKbd((k) => (k?.id === it.id && k.line == null ? null : k))}
                        onKeyDown={(e) => hitKey(e, it)}
                        onClick={() => activate(it)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <svg className="board-strings" viewBox={`0 0 ${L.W} ${L.H}`} width={L.W} height={L.H} aria-hidden="true">
              {EDGES.map((e) => {
                const d = restPaths[e.id]
                const isHot = view.hotEdges.has(e.id)
                return (
                  <g key={e.id} ref={stringRefs[e.id]} className={`str ${isHot ? "is-hot" : ""} ${focus && !isHot ? "is-dim" : ""}`}>
                    <path className="str-shadow" d={d} />
                    <path className="str-glow" d={d} />
                    <path className="str-yarn" d={d} />
                    <path className="str-strand" d={d} />
                  </g>
                )
              })}
            </svg>

            <div className="board-pins" aria-hidden="true">
              {pins.map(({ it, i, off }) => {
                const q = pinPoint(it, home[it.id], off)
                return (
                  <span
                    key={`${it.id}:${i}`}
                    ref={(el) => {
                      pinEls.current[`${it.id}:${i}`] = el
                    }}
                    className={`pin pin-${it.kind} ${focus && !view.lit.has(it.id) ? "is-dim" : ""} ${
                      dragId === it.id ? "is-up" : ""
                    }`}
                    style={{ transform: `translate3d(${f1(q.x)}px, ${f1(q.y)}px, 0)` }}
                  >
                    <i />
                  </span>
                )
              })}
            </div>
          </div>
          <div ref={lampRef} className="board-lamp" aria-hidden="true" />
        </div>
      </div>
      <button type="button" className={`board-tidy ${moved ? "is-on" : ""}`} disabled={!moved} onClick={tidy} data-cursor="Tidy">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.7-4" />
          <path d="M12.6 1.6v3h-3" />
        </svg>
        Tidy the board
      </button>
    </div>
    <BoardReadout focus={focus} />
    </>
  )
}
