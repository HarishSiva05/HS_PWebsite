"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useDossier } from "./store"
import { jump, lockScroll } from "./smooth-scroll"
import { SECTIONS, SUBJECT, PAGE_COUNT } from "@/lib/dossier"
import * as gtag from "@/lib/gtag"

const pad = (n: number) => String(n).padStart(2, "0")

function Meter() {
  const total = useDossier((s) => s.total)
  const opened = useDossier((s) => s.opened)
  const complete = total > 0 && opened >= total
  return (
    <div className={`meter ${complete ? "is-complete" : ""}`} title="Redactions lifted as you read">
      <span className="mono meter-label">{complete ? "Fully declassified ✓" : "Declassified"}</span>
      {!complete && (
        <span className="mono meter-count">
          {pad(opened)}/{pad(total)}
        </span>
      )}
      <span className="meter-track">
        <span className="meter-fill" style={{ transform: `scaleX(${total ? opened / total : 0})` }} />
      </span>
    </div>
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
            <span className="mono">File {SUBJECT.fileNo}</span>
          </span>
        </button>

        <nav className="nav-links" aria-label="Sections">
          {SECTIONS.slice(1).map((s) => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={`nav-link ${active === s.id ? "is-active" : ""}`}
              aria-current={active === s.id ? "true" : undefined}
            >
              <span className="mono">{s.no}</span>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="nav-right">
          <Meter />
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
            Index
          </button>
        </div>
      </header>

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
            aria-label="Table of contents"
            initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.55, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="toc-head">
              <span className="mono">Table of contents · {SUBJECT.fileNo}</span>
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
                    <span className="mono">§ {s.no}</span>
                    <span className="toc-name">{s.label}</span>
                    <span className="toc-leader" />
                    <span className="mono">p. {pad(s.page)}</span>
                  </button>
                </motion.li>
              ))}
            </ol>
            <div className="toc-foot">
              <Meter />
              <a className="mono" href={SUBJECT.resume} download>
                Download résumé (PDF) ↓
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
