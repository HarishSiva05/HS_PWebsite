"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, MotionConfig, motion } from "framer-motion"
import { dossier, useDossier } from "./store"
import { lockScroll } from "./smooth-scroll"
import { Redact, SectionHead, Stamp } from "./primitives"
import ExhibitFrame from "./exhibits/frame"
import { CasePile } from "./cases-pile"
import { CasesLedger } from "./cases-ledger"
import { trackLink } from "./cases-shared"
import { CASES, sectionName } from "@/lib/dossier"
import { play } from "@/lib/sound"
import "@/styles/cases.css"

const FEATURED = CASES.filter((c) => c.featured)
const REST = CASES.filter((c) => !c.featured)

export function Cases() {
  return (
    <section id="cases" className="page cases-sec" aria-label={sectionName("cases")}>
      {/* framer-motion honours prefers-reduced-motion inside this section (stamps, pen notes) */}
      <MotionConfig reducedMotion="user">
        <SectionHead
          id="cases"
          title={
            <>
              Seven files.{" "}
              <Redact block delay={120}>
                All open.
              </Redact>
            </>
          }
          kicker="From APT attribution to an iPhone app in App Store review. Every file comes with its exhibit, labelled for what it is: real data, real footage, a simulation or an illustration."
        />
        <CasePile cases={FEATURED} />
        <CasesLedger cases={REST} />
      </MotionConfig>
    </section>
  )
}

// ============ CASE DRAWER ============

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

export function CaseDrawer() {
  const openId = useDossier((s) => s.openCase)
  const idx = CASES.findIndex((c) => c.id === openId)
  const c = idx >= 0 ? CASES[idx] : null
  const sheet = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!c) return
    if (!returnTo.current) returnTo.current = document.activeElement as HTMLElement
    else play("tick")
    lockScroll(true)
    sheet.current?.scrollTo({ top: 0 })
    sheet.current?.querySelector<HTMLElement>(".drawer-close")?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return dossier.closeCase()
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        // leave arrows alone when an exhibit or a form control is using them
        const t = e.target as HTMLElement | null
        if (e.defaultPrevented || t?.closest("input, textarea, select, [contenteditable='true'], [role='slider']")) return
        const step = e.key === "ArrowRight" ? 1 : -1
        dossier.openCase(CASES[(idx + step + CASES.length) % CASES.length].id)
      }
      if (e.key === "Tab" && sheet.current) {
        const f = Array.from(sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        const inside = sheet.current.contains(document.activeElement)
        if (e.shiftKey && (document.activeElement === first || !inside)) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [c, idx])

  useEffect(() => {
    // only after a file was actually open, so we never unlock the intro's scroll lock
    if (c || !returnTo.current) return
    lockScroll(false)
    returnTo.current?.focus({ preventScroll: true })
    returnTo.current = null
  }, [c])

  const prev = CASES[(idx - 1 + CASES.length) % CASES.length]
  const next = CASES[(idx + 1) % CASES.length]

  return (
    <AnimatePresence>
      {c && (
        <motion.div
          className="drawer-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="drawer-backdrop" onClick={() => dossier.closeCase()} />
          <motion.div
            ref={sheet}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            data-lenis-prevent
            initial={{ x: "104%", rotate: 2 }}
            animate={{ x: 0, rotate: 0 }}
            exit={{ x: "104%", rotate: 2 }}
            transition={{ type: "spring", stiffness: 210, damping: 30 }}
          >
            <div className="drawer-bar mono">
              <span>
                Case {c.no} / {String(CASES.length).padStart(2, "0")}
                <span className="hide-sm"> · {c.class}</span>
              </span>
              <button className="drawer-close" onClick={() => dossier.closeCase()}>
                Close file ✕
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={c.id}
                className="drawer-doc"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <header className="drawer-head">
                  <span className="mono">Case file {c.no}</span>
                  <h2 id="drawer-title">{c.title}</h2>
                  <Stamp tone="red" rotate={-8} play delay={0.25} className="drawer-stamp">
                    {c.status}
                  </Stamp>
                  <dl className="drawer-meta">
                    <div>
                      <dt className="mono">Classification</dt>
                      <dd>{c.class}</dd>
                    </div>
                    <div>
                      <dt className="mono">Filed</dt>
                      <dd>{c.year}</dd>
                    </div>
                    <div>
                      <dt className="mono">Status</dt>
                      <dd>{c.status}</dd>
                    </div>
                  </dl>
                </header>

                <div className="drawer-exhibit">
                  <ExhibitFrame caseId={c.id} overlay />
                </div>

                <section className="drawer-part">
                  <h3 className="mono">01 — Brief</h3>
                  <p className="drawer-brief">{c.brief}</p>
                </section>

                <section className="drawer-part">
                  <h3 className="mono">02 — Actions taken</h3>
                  <ol className="drawer-actions">
                    {c.actions.map((a, i) => (
                      <li key={i}>
                        <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                        {a}
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="drawer-part">
                  <h3 className="mono">03 — Outcome</h3>
                  <p className="drawer-outcome">
                    <mark>{c.outcome}</mark>
                  </p>
                </section>

                <section className="drawer-part">
                  <h3 className="mono">04 — Methods &amp; tools</h3>
                  <ul className="chips">
                    {c.stack.map((s) => (
                      <li key={s} className="chip mono">
                        {s}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="drawer-part">
                  <h3 className="mono">05 — Evidence</h3>
                  {c.links.length ? (
                    <ul className="drawer-links">
                      {c.links.map((l) => (
                        <li key={l.href}>
                          <a href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => trackLink(c, l.label)}>
                            {l.label} <span aria-hidden="true">↗</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="drawer-sealed mono">Source kept private. Walkthrough available on request.</p>
                  )}
                </section>
              </motion.div>
            </AnimatePresence>

            <nav className="drawer-nav" aria-label="Other projects">
              <button onClick={() => dossier.openCase(prev.id)}>
                <span className="mono">← Case {prev.no}</span>
                {prev.title}
              </button>
              <button onClick={() => dossier.openCase(next.id)}>
                <span className="mono">Case {next.no} →</span>
                {next.title}
              </button>
            </nav>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
