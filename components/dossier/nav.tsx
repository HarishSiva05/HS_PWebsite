"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useDossier } from "./store"
import { jump, lockScroll } from "./smooth-scroll"
import { Stamp } from "./primitives"
import { SECTIONS, SUBJECT, PAGE_COUNT, type Section } from "@/lib/dossier"
import * as gtag from "@/lib/gtag"

const pad = (n: number) => String(n).padStart(2, "0")

// Menu caption under each label: the dossier name, or the rest of the fuller heading
// ("Experience" + "& education") so the line never repeats the word above it.
const caption = (s: Section) =>
  s.dossier ?? (s.heading?.startsWith(s.label) ? s.heading.slice(s.label.length).trim() : s.heading)

function useProgress() {
  const total = useDossier((s) => s.total)
  const opened = useDossier((s) => s.opened)
  return { ratio: total ? opened / total : 0, complete: total > 0 && opened >= total }
}

// Reading progress = redactions lifted. A thin line under the bar, because a labelled
// counter next to the résumé button read to recruiters as a stat or a loading widget.
function ProgressLine() {
  const { ratio, complete } = useProgress()
  return (
    <span className={`nav-progress ${complete ? "is-complete" : ""}`} aria-hidden="true">
      <span className="nav-progress-fill" style={{ transform: `scaleX(${ratio})` }} />
    </span>
  )
}

// One-off payoff once every redaction is lifted. Rendered outside the header: the bar's
// backdrop-filter would otherwise make it the containing block for this fixed element.
function DeclassifiedStamp() {
  const { complete } = useProgress()
  const [stamp, setStamp] = useState(false)

  useEffect(() => {
    if (!complete) return
    setStamp(true)
    const t = setTimeout(() => setStamp(false), 2800)
    return () => clearTimeout(t)
  }, [complete])

  return (
    <AnimatePresence>
      {stamp && (
        <motion.div
          className="declass-toast"
          aria-hidden="true"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3 }}
        >
          <Stamp tone="red" rotate={-7} play delay={0.1}>
            Fully declassified
          </Stamp>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Nav() {
  const [active, setActive] = useState("cover")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive(e.target.id)
            gtag.event({ action: "section_view", category: "engagement", label: e.target.id })
          }
        })
      },
      { rootMargin: "-45% 0px -50% 0px" },
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return
    lockScroll(true)
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => {
      lockScroll(false)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const current = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0]
  const go = (id: string) => {
    setOpen(false)
    // wait a frame so the scroll lock is released first
    requestAnimationFrame(() => jump(id))
  }

  return (
    <>
      <header className={`nav ${active === "contact" ? "nav-ops" : ""}`}>
        <button className="nav-brand" onClick={() => go("cover")} aria-label="Back to top" data-cursor="Top">
          <span className="brand-glyph">HS</span>
          <span className="nav-brand-text">
            <strong>Harish Sivaram</strong>
          </span>
        </button>

        <nav className="nav-links" aria-label="Sections">
          {SECTIONS.slice(1).map((s) => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={`nav-link ${active === s.id ? "is-active" : ""}`}
              aria-current={active === s.id ? "true" : undefined}
              title={s.heading}
            >
              <span className="mono">{s.no}</span>
              <span>
                {s.label}
                {s.heading && <span className="nav-more"> {caption(s)}</span>}
              </span>
            </button>
          ))}
        </nav>

        <div className="nav-right">
          <a
            className="nav-cv"
            href={SUBJECT.resume}
            download
            data-cursor="Download"
            onClick={() => gtag.event({ action: "resume_download", category: "engagement", label: "Nav" })}
          >
            Résumé <span aria-hidden="true">↓</span>
          </a>
          <button className="nav-menu" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="toc">
            Menu
          </button>
        </div>
        <ProgressLine />
      </header>
      <DeclassifiedStamp />

      <div className="rail" aria-hidden="true">
        <span className="mono">
          File {SUBJECT.fileNo} — {current.label} — Page {pad(current.page)} / {pad(PAGE_COUNT)}
        </span>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="toc"
            className="toc"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="toc-head">
              <span className="mono">Menu</span>
              <button className="mono toc-close" onClick={() => setOpen(false)} autoFocus>
                Close ✕
              </button>
            </div>
            <ol className="toc-list">
              {SECTIONS.map((s, i) => (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.04, duration: 0.5 }}
                >
                  <button onClick={() => go(s.id)} className={active === s.id ? "is-active" : ""}>
                    <span className="mono">{s.no}</span>
                    <span className="toc-name">
                      {s.label}
                      {caption(s) && <small className="mono">{caption(s)}</small>}
                    </span>
                  </button>
                </motion.li>
              ))}
            </ol>
            <div className="toc-foot">
              <a
                className="toc-cv"
                href={SUBJECT.resume}
                download
                onClick={() => gtag.event({ action: "resume_download", category: "engagement", label: "Menu" })}
              >
                Download résumé (PDF) <span aria-hidden="true">↓</span>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
