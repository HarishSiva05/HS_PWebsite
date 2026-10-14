"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import ExhibitFrame from "./exhibits/frame"
import { PenNote, Stamp } from "./primitives"
import { getLenis } from "./smooth-scroll"
import { PILE_QUERY, REDUCED, clamp, openCase, pad2, trackLink, useMedia } from "./cases-shared"
import { play } from "@/lib/sound"
import type { CaseFile } from "@/lib/dossier"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

// Each folder slides onto the pile a little askew and squares up as it lands.
const TILT_IN = [-2.2, 1.9, -1.7, 2.1]
const SHIFT_IN = [-22, 26, -18, 24]
// Layout adjustments tried in order until a sheet's text fits its fixed height (see .fit-N in cases.css).
const FIT_MAX = 6

const easeOut = (t: number) => 1 - (1 - t) ** 3
const smoothstep = (a: number, b: number, t: number) => {
  const x = clamp((t - a) / (b - a))
  return x * x * (3 - 2 * x)
}

type SheetProps = {
  c: CaseFile
  i: number
  pile: boolean
  landed: boolean
  covered: boolean
  onTab: (i: number) => void
  onFocusIn: (i: number) => void
}

function Sheet({ c, i, pile, landed, covered, onTab, onFocusIn }: SheetProps) {
  const titleId = `case-${c.id}-title`
  return (
    <article
      className="sheet"
      style={{ "--k": i } as CSSProperties}
      aria-labelledby={titleId}
      onFocus={() => onFocusIn(i)}
      data-case={c.id}
    >
      <div className="sheet-inner">
        {/* The folder tab. Once the folder sinks into the pile, clicking its peeking tab pulls it back
            out. A pointer shortcut only: keyboard focus inside a buried folder does the same. */}
        <div className="sheet-tab" onClick={() => onTab(i)} data-cursor={pile ? `Case ${c.no}` : undefined} aria-hidden="true">
          <span className="sheet-tab-no">Case {c.no}</span>
          <span className="sheet-tab-title">{c.title}</span>
          <span className="sheet-shade" />
        </div>

        {/* a deeper shadow while the folder is still in the air */}
        <span className="sheet-lift" aria-hidden="true" />
        <div className="sheet-body">
          <div className="sheet-left">
            <div className="sheet-ex">
              <ExhibitFrame caseId={c.id} paused={covered} />
            </div>
            {/* evidence tag: a paper slip under the exhibit with the stack and the sources */}
            <div className="sheet-tag">
              <div className="sheet-tag-stack">
                <span className="mono sheet-label">Methods &amp; tools</span>
                <ul className="chips sheet-chips">
                  {c.stack.map((s) => (
                    <li key={s} className="chip mono">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="sheet-tag-ev">
                <span className="mono sheet-label">Evidence</span>
                {c.links.length ? (
                  <ul>
                    {c.links.map((l) => (
                      <li key={l.href}>
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackLink(c, l.label)}
                          data-cursor="Open link"
                        >
                          {l.label} <span aria-hidden="true">↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <>
                    <span className="sheet-sealed mono">Source kept private</span>
                    <span className="sheet-sealed-note mono">Walkthrough on request</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="sheet-right">
            <div className="sheet-text">
              <p className="sheet-meta mono">
                <span className="sheet-file">Case file {c.no}</span>
                <span>{c.class}</span>
                <span>{c.year}</span>
              </p>
              <h3 id={titleId} className="sheet-title" onClick={() => openCase(c)} data-cursor="Open file">
                {c.title}
              </h3>
              <p className="cs-sr">Status: {c.status}</p>
              <p className="sheet-abstract">{c.abstract}</p>
              {c.metrics && (
                <dl className="sheet-metrics">
                  {c.metrics.map((m) => (
                    <div key={m.l}>
                      <dt className="mono">{m.l}</dt>
                      <dd>
                        {m.v.replace(/\+$/, "")}
                        {m.v.endsWith("+") && <em>+</em>}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <div className="sheet-actions">
                <span className="mono sheet-label">Actions taken</span>
                <ol>
                  {c.actions.slice(0, 3).map((a, j) => (
                    <li key={j}>
                      <span className="mono">{pad2(j + 1)}</span>
                      {a}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="sheet-outcome">
                <span className="mono sheet-label">Outcome</span>
                <p>
                  <mark>{c.outcome}</mark>
                </p>
              </div>
              <Stamp
                tone={c.status === "In Review" ? "ink" : "red"}
                rotate={-9}
                delay={0.06}
                className="sheet-stamp"
                play={pile ? landed : undefined}
              >
                {c.status}
              </Stamp>
              {c.note && (
                <PenNote arrow="up" arrowFirst rotate={-5} className="sheet-note">
                  {c.note}
                </PenNote>
              )}
            </div>
            <div className="sheet-foot">
              <button type="button" className="fc-open" onClick={() => openCase(c)} data-cursor="Open file">
                Open full file <span aria-hidden="true">→</span>
              </button>
            </div>
            <span className="sheet-num" aria-hidden="true">
              {c.no}
            </span>
          </div>

          <span className="sheet-shade" aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}

/**
 * The lead case files as a pile on a desk. Each folder is sticky a little lower than the one
 * before, so the earlier folders' tabs peek out above it; as the next folder slides over, the ones
 * beneath sink back (smaller, tilted, darker) and their exhibits go idle. Off the pile query
 * (phones, short windows, reduced motion) the same folders sit in an ordinary column.
 */
export function CasePile({ cases }: { cases: CaseFile[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const pile = useMedia(PILE_QUERY)
  const [landed, setLanded] = useState<boolean[]>(() => cases.map(() => false))
  const [covered, setCovered] = useState<boolean[]>(() => cases.map(() => false))
  const coveredRef = useRef(covered)
  coveredRef.current = covered
  const goTo = useRef<(i: number) => void>(() => {})

  // Fit each sheet's text column to the fixed sheet height: step through the .fit-N levels.
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const texts = Array.from(root.querySelectorAll<HTMLElement>(".sheet-text"))
    const clear = (t: HTMLElement) => {
      for (let l = 1; l <= FIT_MAX; l++) t.classList.remove(`fit-${l}`)
    }
    if (!pile) {
      texts.forEach(clear)
      root.classList.remove("is-fitted")
      return
    }
    let raf = 0
    const fit = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        for (const t of texts) {
          clear(t)
          for (let l = 1; l <= FIT_MAX && t.scrollHeight > t.clientHeight + 1; l++) t.classList.add(`fit-${l}`)
        }
        root.classList.add("is-fitted")
      })
    }
    const ro = new ResizeObserver(fit)
    root.querySelectorAll(".sheet-body").forEach((b) => ro.observe(b))
    document.fonts?.ready.then(fit).catch(() => {})
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [pile])

  // Scroll choreography: landing, sinking, stamps, and idling covered exhibits.
  useEffect(() => {
    const root = ref.current
    if (!root) return
    // right after hydration `pile` is still its server value; wait for it to catch up rather than
    // briefly setting up the column (and hiding folders that are already on screen)
    if (pile !== window.matchMedia(PILE_QUERY).matches) return
    const sheets = Array.from(root.querySelectorAll<HTMLElement>(":scope > .sheet"))
    const inners = sheets.map((s) => s.querySelector<HTMLElement>(".sheet-inner"))
    const shades = sheets.map((s) => Array.from(s.querySelectorAll<HTMLElement>(".sheet-shade")))
    const lifts = sheets.map((s) => s.querySelector<HTMLElement>(".sheet-lift"))
    const desk = root.querySelector<HTMLElement>(".pile-desk")
    const n = sheets.length
    const timers: number[] = []

    // opacity on its own layer; hidden outright at zero so idle layers cost nothing
    const fade = (el: HTMLElement, o: string) => {
      el.style.opacity = o
      el.style.visibility = +o > 0 ? "visible" : "hidden"
    }

    const reset = () => {
      inners.forEach((el) => el && (el.style.transform = ""))
      ;[...shades.flat(), ...lifts].forEach((el) => {
        if (!el) return
        el.style.opacity = ""
        el.style.visibility = ""
      })
      if (desk) {
        desk.style.opacity = ""
        desk.style.visibility = ""
        desk.classList.remove("is-lit")
      }
      timers.forEach((t) => window.clearTimeout(t))
      sheets.forEach((s) => s.classList.remove("is-thump"))
    }

    if (!pile) {
      reset()
      setCovered(cases.map(() => false))
      goTo.current = () => {}
      // the plain column still gets a little life: folders settle in as they arrive
      if (window.matchMedia(REDUCED).matches) return
      root.classList.add("is-reveal")
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return
            e.target.classList.add("is-in")
            io.unobserve(e.target)
          }),
        { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
      )
      sheets.forEach((s) => io.observe(s))
      return () => {
        io.disconnect()
        root.classList.remove("is-reveal")
        sheets.forEach((s) => s.classList.remove("is-in"))
      }
    }

    let vh = window.innerHeight
    let tops: number[] = sheets.map(() => 0)
    const measure = () => {
      vh = window.innerHeight
      tops = sheets.map((s) => parseFloat(getComputedStyle(s).top) || 0)
    }

    const isLanded = sheets.map(() => false)
    const stamped = sheets.map(() => false)
    const isCovered = sheets.map(() => false)
    const lastT: string[] = []
    const lastS: string[] = []
    const lastL: string[] = []
    let lastDesk = ""
    let lampOn = false
    let lastY = window.scrollY
    let primed = false

    // the stamp hits: the folder takes the blow
    const thump = (i: number) => {
      play("stamp")
      const s = sheets[i]
      s.classList.remove("is-thump")
      void s.offsetWidth
      s.classList.add("is-thump")
      timers.push(window.setTimeout(() => s.classList.remove("is-thump"), 520))
    }

    let dead = false
    let raf = 0
    const update = () => {
      if (dead) return
      const y = window.scrollY
      const down = y > lastY
      lastY = y
      // read: how far each folder has travelled from the bottom of the viewport to its resting place
      const rects = sheets.map((s) => s.getBoundingClientRect())
      const arrive = rects.map((r, i) => clamp((vh - r.top) / Math.max(1, vh - tops[i])))
      // how far the pile has started to leave: the last folder lifting off its resting place
      const leave = clamp((tops[n - 1] - rects[n - 1].top) / 240)
      // write
      // the desk lamp: the room dims as the first folder lands, and the lights come back up
      // as the pile leaves, before the ledger below scrolls in
      if (desk) {
        const o = smoothstep(0.45, 1, arrive[0]) * (1 - smoothstep(0, 1, leave))
        const os = o.toFixed(3)
        if (os !== lastDesk) {
          desk.style.opacity = os
          desk.style.visibility = o > 0.001 ? "visible" : "hidden"
          lastDesk = os
        }
        if (!lampOn && o > 0.6) {
          lampOn = true
          if (primed) {
            play("lamp", { volume: 0.6 })
            // the lamp stutters on
            desk.classList.remove("is-lit")
            void desk.offsetWidth
            desk.classList.add("is-lit")
          }
        } else if (lampOn && o < 0.15) lampOn = false
      }
      let stampChange = false
      let coverChange = false
      let above = 0
      for (let i = n - 1; i >= 0; i--) {
        const depth = above
        above += smoothstep(0.18, 1, arrive[i])
        const d1 = Math.min(depth, 1)
        const d2 = clamp(depth - 1, 0, 2)
        const air = 1 - easeOut(arrive[i])
        // tilt so the side with this folder's tab lifts: the tab stays in view as it sinks
        const dir = i < (n - 1) / 2 ? 1 : -1
        const rot = TILT_IN[i % 4] * air + dir * (0.55 * d1 + 0.15 * d2)
        const tx = SHIFT_IN[i % 4] * air
        const sc = 1 - 0.042 * d1 - 0.018 * d2
        const t = `translate3d(${tx.toFixed(1)}px,0,0) rotate(${rot.toFixed(3)}deg) scale(${sc.toFixed(4)})`
        if (t !== lastT[i] && inners[i]) {
          inners[i]!.style.transform = t
          lastT[i] = t
        }
        const sh = (0.3 * d1 + 0.12 * d2).toFixed(3)
        if (sh !== lastS[i]) {
          for (const el of shades[i]) fade(el, sh)
          lastS[i] = sh
        }
        const lf = (arrive[i] > 0 ? air : 0).toFixed(3)
        if (lf !== lastL[i] && lifts[i]) {
          fade(lifts[i]!, lf)
          lastL[i] = lf
        }

        const nowLanded = arrive[i] > 0.97
        if (nowLanded !== isLanded[i]) {
          isLanded[i] = nowLanded
          if (nowLanded && primed && down) play("paper", { volume: 0.5 })
        }
        if (nowLanded && !stamped[i]) {
          stamped[i] = true
          stampChange = true
          if (primed) timers.push(window.setTimeout(() => thump(i), 170))
        }
        const nowCovered = isCovered[i] ? depth > 0.82 : depth > 0.97
        if (nowCovered !== isCovered[i]) {
          isCovered[i] = nowCovered
          coverChange = true
        }
      }
      primed = true
      if (stampChange) setLanded([...stamped])
      if (coverChange) setCovered([...isCovered])
    }

    goTo.current = (i: number) => {
      // where this folder rests: its place in the flow (sticky offsets ignored), minus its sticky top
      let y = root.getBoundingClientRect().top + window.scrollY
      for (let j = 0; j <= i; j++) {
        const cs = getComputedStyle(sheets[j])
        y += parseFloat(cs.marginTop) || 0
        if (j < i) y += sheets[j].offsetHeight + (parseFloat(cs.marginBottom) || 0)
      }
      const target = Math.max(0, Math.round(y - tops[i]))
      const lenis = getLenis()
      if (lenis) {
        // start from where the page really is: a focus scroll may have just moved it natively
        lenis.scrollTo(window.scrollY, { immediate: true, force: true })
        lenis.scrollTo(target, { duration: 1.2, force: true })
      } else window.scrollTo({ top: target, behavior: "smooth" })
    }

    measure()
    update()
    // Driven by ScrollTrigger so it shares Lenis's clock, but gated by a live IntersectionObserver
    // rather than measured start/end positions, which go stale if a section above changes height.
    let near = false
    const io = new IntersectionObserver(
      ([e]) => {
        near = e.isIntersecting
        update()
      },
      { rootMargin: "50% 0px" },
    )
    io.observe(root)
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: () => near && update(),
      onRefresh: () => {
        measure()
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(update)
      },
    })
    const onResize = () => {
      measure()
      update()
    }
    window.addEventListener("resize", onResize)
    return () => {
      dead = true
      cancelAnimationFrame(raf)
      st.kill()
      io.disconnect()
      window.removeEventListener("resize", onResize)
      reset()
    }
  }, [pile, cases])

  return (
    <div ref={ref} className="pile" style={{ "--pile-n": cases.length } as CSSProperties}>
      {/* the room dims to a desk lamp while the folders land (pile mode only) */}
      <div className="pile-desk" aria-hidden="true" />
      {cases.map((c, i) => (
        <Sheet
          key={c.id}
          c={c}
          i={i}
          pile={pile}
          landed={landed[i]}
          covered={covered[i]}
          onTab={(k) => goTo.current(k)}
          onFocusIn={(k) => coveredRef.current[k] && goTo.current(k)}
        />
      ))}
    </div>
  )
}
