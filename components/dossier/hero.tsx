"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useDossier } from "./store"
import { jump } from "./smooth-scroll"
import { PenNote, Redact, Stamp } from "./primitives"
import { FIELDS, PAGE_COUNT, SUBJECT, TAPE, sectionName } from "@/lib/dossier"
import * as gtag from "@/lib/gtag"

function useClock() {
  const [now, setNow] = useState<string | null>(null)
  useEffect(() => {
    const fmt = () => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, "0")
      setNow(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}  ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    fmt()
    const id = setInterval(fmt, 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function Hero() {
  const root = useRef<HTMLElement>(null)
  const exhibit = useRef<HTMLDivElement>(null)
  const introDone = useDossier((s) => s.introDone)
  const clock = useClock()

  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] })
  const exhibitY = useTransform(scrollYProgress, [0, 1], [0, -90])
  const nameY = useTransform(scrollYProgress, [0, 1], [0, 60])

  // Exhibit tilts toward the pointer, like a photo lifted off the desk
  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia("(hover: none), (prefers-reduced-motion: reduce)").matches) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        exhibit.current?.style.setProperty("--ry", `${(x * 7).toFixed(2)}deg`)
        exhibit.current?.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`)
      })
    }
    el.addEventListener("pointermove", onMove)
    return () => {
      el.removeEventListener("pointermove", onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section id="cover" ref={root} className="cover page" aria-label={sectionName("cover")}>
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
        <motion.div className="cover-main" style={{ y: nameY }}>
          <span className="mono cover-eyebrow">Subject /</span>
          <h1 className="cover-name">
            <span className="cover-line">
              <Redact block delay={0}>
                Harish
              </Redact>
            </span>
            <span className="cover-line">
              <Redact block delay={160}>
                Sivaram
              </Redact>
            </span>
          </h1>

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
        </motion.div>

        <motion.div className="cover-exhibit" style={{ y: exhibitY }}>
          <div className="exhibit-tilt" ref={exhibit}>
            <figure className="cctv">
              <video
                src="/hero-bg.mp4"
                poster="/cctv-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-label="Harish at a workstation, pushing code"
              />
              <div className="cctv-scan" aria-hidden="true" />
              <div className="cctv-hud mono" aria-hidden="true">
                <span className="cctv-tl">Cam 04 · Workstation</span>
                <span className="cctv-tr">
                  <i className="rec-dot" /> Rec
                </span>
                <span className="cctv-bl">{clock ?? "————-——-——  ——:——:——"}</span>
                <span className="cctv-br">Fig. B</span>
                <i className="cctv-corner c1" />
                <i className="cctv-corner c2" />
                <i className="cctv-corner c3" />
                <i className="cctv-corner c4" />
              </div>
            </figure>

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

            <Stamp tone="red" rotate={-9} play={introDone} delay={1.0} className="cover-stamp">
              Declassified
            </Stamp>

            <PenNote arrow="down" rotate={4} className="pen-cctv">
              caught pushing to main.
              <br />
              again.
            </PenNote>
          </div>
        </motion.div>
      </div>

      <button className="cover-scroll mono" onClick={() => jump("summary")}>
        Continue reading <span aria-hidden="true">↓</span>
      </button>
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
