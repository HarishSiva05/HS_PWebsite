"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useDossier } from "./store"
import { jump } from "./smooth-scroll"
import { PenNote, Redact, Stamp } from "./primitives"
import { ShredName, type ShredApi } from "./hero-name"
import { CctvFeed } from "./hero-cctv"
import { FIELDS, PAGE_COUNT, SUBJECT, TAPE, sectionName } from "@/lib/dossier"
import * as gtag from "@/lib/gtag"
import "@/styles/hero.css"

/**
 * Page 01: the subject sheet. The shredded name reconstructs itself, the CCTV feed tracks
 * his face, a desk lamp follows the pointer across the paper, and on the way out the sheet
 * sinks back while the next page slides over it.
 *
 * Structure: section#cover (dark desk, only seen during the handoff) > .hero-sheet (the
 * paper; recedes) > .hero-focus.cover.page (the content; the intro blurs this one).
 */
export function Hero() {
  const root = useRef<HTMLElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const shade = useRef<HTMLSpanElement>(null)
  const pool = useRef<HTMLSpanElement>(null)
  const dimPool = useRef<HTMLSpanElement>(null)
  const dName = useRef<HTMLDivElement>(null)
  const dFields = useRef<HTMLDivElement>(null)
  const dExhibit = useRef<HTMLDivElement>(null)
  const tilt = useRef<HTMLDivElement>(null)
  const cast = useRef<HTMLSpanElement>(null)
  const nameApi = useRef<ShredApi | null>(null)
  const introDone = useDossier((s) => s.introDone)
  const [live, setLive] = useState(false) // the entrance has started
  const [covered, setCovered] = useState(false) // fully under the next sheet
  const [still, setStill] = useState(false) // prefers-reduced-motion

  // ---- entrance: waits for the cold open (or runs straight away when it was skipped) ----
  useEffect(() => {
    const el = root.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true)
      return
    }
    if (!introDone) {
      el.classList.add("is-armed")
      return
    }
    // on a repeat visit the CSS failsafe reveals the name at 2.5s; if hydration was that slow, keep it still
    const late = document.documentElement.dataset.intro === "skip" && performance.now() > 2400
    // scatter the strips first, then lift the pre-entrance state, in the same task
    if (!late) nameApi.current?.enter()
    el.classList.add("is-in")
    setLive(true)
  }, [introDone])

  // ---- lamp light + pointer parallax (fine pointers); a slow idle drift on touch ----
  useEffect(() => {
    const el = root.current
    const sh = sheet.current
    const lp = pool.current
    if (!el || !sh || !lp) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      // touch: the lamp drifts on its own, and rests while the sheet is off screen
      sh.classList.add("lamp-drift")
      const io = new IntersectionObserver(([e]) => sh.classList.toggle("lamp-idle", !e.isIntersecting))
      io.observe(sh)
      return () => {
        io.disconnect()
        sh.classList.remove("lamp-drift", "lamp-idle")
      }
    }
    sh.classList.add("lamp-live")
    const layers: [HTMLElement | null, number][] = [
      [dName.current, 8],
      [dFields.current, 4],
      [dExhibit.current, 10],
    ]
    // offsets land on whole device pixels, so text in these layers is never resampled
    const dpr = window.devicePixelRatio || 1
    const snap = (v: number) => (Math.round(v * dpr) / dpr).toFixed(3)
    let w = sh.offsetWidth
    let h = sh.offsetHeight
    const cur = { x: 0.3, y: 0.32, nx: 0, ny: 0 }
    const tgt = { ...cur }
    let raf = 0
    let tiltRaf = 0

    const dp = dimPool.current
    const apply = () => {
      // both pools move by transform only: compositing, never a repaint of the sheet
      const at = `translate3d(${(cur.x * w).toFixed(1)}px,${(cur.y * h).toFixed(1)}px,0)`
      lp.style.transform = at
      if (dp) dp.style.transform = `${at} scale(3)`
      for (const [node, d] of layers) {
        if (node) node.style.transform = `translate3d(${snap(-cur.nx * d)}px,${snap(-cur.ny * d)}px,0)`
      }
    }
    const tick = () => {
      const k = 0.085
      cur.x += (tgt.x - cur.x) * k
      cur.y += (tgt.y - cur.y) * k
      cur.nx += (tgt.nx - cur.nx) * k
      cur.ny += (tgt.ny - cur.ny) * k
      apply()
      const done =
        Math.abs(tgt.x - cur.x) * w < 0.4 &&
        Math.abs(tgt.y - cur.y) * h < 0.4 &&
        Math.abs(tgt.nx - cur.nx) < 0.002 &&
        Math.abs(tgt.ny - cur.ny) < 0.002
      raf = done ? 0 : requestAnimationFrame(tick)
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return
      const r = sh.getBoundingClientRect()
      tgt.x = (e.clientX - r.left) / r.width
      tgt.y = (e.clientY - r.top) / r.height
      tgt.nx = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1))
      tgt.ny = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1))
      kick()
      // the exhibit tilts toward the pointer, like a photo lifted off the desk
      cancelAnimationFrame(tiltRaf)
      tiltRaf = requestAnimationFrame(() => {
        tilt.current?.style.setProperty("--ry", `${(tgt.nx * 3.5).toFixed(2)}deg`)
        tilt.current?.style.setProperty("--rx", `${(-tgt.ny * 3).toFixed(2)}deg`)
      })
    }
    const onLeave = () => {
      // the lamp stays where it was left; the page settles back flat
      tgt.nx = 0
      tgt.ny = 0
      tilt.current?.style.setProperty("--ry", "0deg")
      tilt.current?.style.setProperty("--rx", "0deg")
      kick()
    }
    const ro = new ResizeObserver(() => {
      w = sh.offsetWidth
      h = sh.offsetHeight
      apply()
    })
    ro.observe(sh)
    apply()
    el.addEventListener("pointermove", onMove, { passive: true })
    el.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(tiltRaf)
      ro.disconnect()
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
      sh.classList.remove("lamp-live")
    }
  }, [])

  // ---- the handoff: the sheet sinks back while the next page slides over it ----
  useEffect(() => {
    const el = root.current
    const sh = sheet.current
    const sd = shade.current
    const cs = cast.current
    if (!el || !sh || !sd || !cs) return
    const mm = gsap.matchMedia()
    mm.add("(min-width: 720px) and (prefers-reduced-motion: no-preference)", () => {
      el.classList.add("has-handoff")
      // scale about the middle of what is on screen when the sheet starts to sink
      const origin = () => `50% ${Math.max(0, sh.offsetHeight - window.innerHeight / 2).toFixed(0)}px`
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "bottom bottom",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
          onLeave: () => {
            gsap.set(sh, { visibility: "hidden" })
            setCovered(true)
          },
          onEnterBack: () => {
            gsap.set(sh, { visibility: "visible" })
            setCovered(false)
          },
        },
      })
      tl.fromTo(sh, { y: 0, scale: 1, transformOrigin: origin }, { y: () => window.innerHeight * 0.84, scale: 0.94, transformOrigin: origin }, 0)
      tl.fromTo(sd, { opacity: 0 }, { opacity: 0.4 }, 0)
      // the next sheet's edge casts its shadow onto this one only once it is actually sliding over
      tl.fromTo(cs, { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0)
      return () => {
        el.classList.remove("has-handoff")
        gsap.set(sh, { clearProps: "transform,transformOrigin,visibility" })
        gsap.set([sd, cs], { clearProps: "opacity" })
        setCovered(false)
      }
    })
    let alive = true
    document.fonts?.ready.then(() => alive && ScrollTrigger.refresh())
    return () => {
      alive = false
      mm.revert()
    }
  }, [])

  return (
    <section id="cover" ref={root} className="hero" aria-label={sectionName("cover")}>
      <div className="hero-sheet" ref={sheet}>
        <div className="cover page hero-focus" data-intro-focus>
          <div className="doc-strip mono">
            <span>
              <span className="hide-sm">File no. </span>
              {SUBJECT.fileNo}
            </span>
            <span className="hide-sm">Subject dossier</span>
            <span>
              <s>Restricted</s> <b>Declassified</b>
            </span>
            <span className="hide-sm">Rev. Oct 2026</span>
            <span>
              <span className="hide-sm">Page </span>01 / {String(PAGE_COUNT).padStart(2, "0")}
            </span>
          </div>

          <div className="cover-grid">
            <div className="cover-main">
              <span className="mono cover-eyebrow">Subject /</span>
              <div className="hero-depth hero-depth-name" ref={dName}>
                <ShredName api={nameApi} />
              </div>

              <div className="hero-depth" ref={dFields}>
                <p className="cover-tag">
                  Threat analyst by{" "}
                  <Redact mark delay={520}>
                    training
                  </Redact>
                  .{" "}
                  <br />
                  Engineer by{" "}
                  <Redact mark delay={760}>
                    trade
                  </Redact>
                  .
                </p>

                <dl className="fields">
                  {FIELDS.map((f) => (
                    <div className="field" key={f.k}>
                      <dt className="mono">{f.k}</dt>
                      <dd>{f.v}</dd>
                    </div>
                  ))}
                  <div className="field field-status">
                    <dt className="mono">Status</dt>
                    <dd>
                      <span className="pulse" /> Open to work · security, threat intel &amp; software roles
                    </dd>
                    <PenNote arrow="left" arrowFirst rotate={-5} className="pen-status">
                      verified
                    </PenNote>
                  </div>
                </dl>

                <div className="cover-cta">
                  <button className="btn btn-ink" onClick={() => jump("cases")} data-cursor="Open">
                    View projects <span aria-hidden="true">→</span>
                  </button>
                  <a
                    className="btn btn-line"
                    href={SUBJECT.resume}
                    download
                    data-cursor="Download"
                    onClick={() => gtag.event({ action: "resume_download", category: "engagement", label: "Hero" })}
                  >
                    Download résumé <span aria-hidden="true">↓</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="cover-exhibit hero-depth" ref={dExhibit}>
              <div className="exhibit-tilt" ref={tilt}>
                <CctvFeed live={live} active={!covered} />

                <figure className="idcard">
                  <svg className="clip" viewBox="0 0 24 64" aria-hidden="true">
                    <path
                      d="M8 50 V12 a6 6 0 0 1 12 0 V54 a9 9 0 0 1 -18 0 V18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <img src="/subject.jpg" alt="Portrait of Harish Sivaram" width={640} height={640} />
                  <figcaption className="mono">Fig. A — Subject</figcaption>
                </figure>

                {still ? (
                  <span className="stamp cover-stamp" style={{ transform: "rotate(-9deg)" }} aria-hidden="true">
                    <span className="stamp-inner">Declassified</span>
                  </span>
                ) : (
                  <Stamp tone="red" rotate={-9} play={live} delay={1.15} className="cover-stamp">
                    Declassified
                  </Stamp>
                )}

                <PenNote arrow="down" rotate={4} className="pen-cctv">
                  caught pushing to main.
                  <br />
                  again.
                </PenNote>
              </div>
            </div>
          </div>

          <button className="cover-scroll mono" onClick={() => jump("summary")}>
            Continue reading <span aria-hidden="true">↓</span>
          </button>

          <div className="hero-dim" aria-hidden="true">
            <span className="dim-pool" ref={dimPool} />
          </div>
          <div className="hero-lamp" aria-hidden="true">
            <span className="lamp-pool" ref={pool} />
          </div>
        </div>
        <span className="hero-shade" ref={shade} aria-hidden="true" />
      </div>
      <span className="hero-cast" ref={cast} aria-hidden="true" />
    </section>
  )
}

export function Tapes() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const xa = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"])
  const xb = useTransform(scrollYProgress, [0, 1], ["-18%", "0%"])
  const items = [...TAPE, ...TAPE]

  return (
    <div className="tapes" ref={ref} aria-hidden="true">
      <div className="tape tape-a">
        <motion.div className="tape-track" style={{ x: xa }}>
          {[0, 1].map((k) => (
            <span className="tape-run" key={k}>
              {items.map((t, i) => (
                <span key={i}>
                  {t} <i>✱</i>
                </span>
              ))}
            </span>
          ))}
        </motion.div>
      </div>
      <div className="tape tape-b">
        <motion.div className="tape-track" style={{ x: xb }}>
          {[0, 1].map((k) => (
            <span className="tape-run" key={k}>
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i}>
                  File {SUBJECT.fileNo} <i>—</i> Declassified <i>—</i>
                </span>
              ))}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
