"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { dossier, useDossier } from "./store"
import { lockScroll } from "./smooth-scroll"
import { PenNote, Redact, Reveal, SectionHead, Stamp } from "./primitives"
import { CASES, CASE_FILTERS, type CaseFile } from "@/lib/dossier"
import * as gtag from "@/lib/gtag"

type Filter = (typeof CASE_FILTERS)[number]["id"]

const matches = (c: CaseFile, f: Filter) => f === "all" || c.filters.includes(f)

function openCase(c: CaseFile) {
  dossier.openCase(c.id)
  gtag.event({ action: "project_view", category: "engagement", label: c.title })
}

function FolderCard({ c, out }: { c: CaseFile; out: boolean }) {
  return (
    <article className={`folder-card ${out ? "is-out" : ""}`}>
      <div className="fc-paper" aria-hidden="true">
        <span className="mono">Brief — Case {c.no}</span>
        <p>{c.brief}</p>
        <span className="fc-paper-lines" />
      </div>
      <div className="fc-body">
        <span className="fc-tab mono">Case {c.no}</span>
        <div className="fc-top mono">
          <span>{c.class}</span>
          <span>{c.year}</span>
        </div>
        <h3 className="fc-title">{c.title}</h3>
        <p className="fc-abstract">{c.abstract}</p>
        <ul className="chips">
          {c.stack.slice(0, 4).map((s) => (
            <li key={s} className="chip mono">
              {s}
            </li>
          ))}
        </ul>
        {c.metrics && (
          <dl className="fc-metrics">
            {c.metrics.map((m) => (
              <div key={m.l} className="fc-metric">
                <dt className="mono">{m.l}</dt>
                <dd>
                  {m.v.replace(/\+$/, "")}
                  {m.v.endsWith("+") && <em>+</em>}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <button className="fc-open mono" onClick={() => openCase(c)} data-cursor="Open file">
          Open file <span aria-hidden="true">→</span>
        </button>
        <Stamp tone={c.status === "In Review" ? "ink" : "red"} rotate={-11} className="fc-stamp" delay={0.15}>
          {c.status}
        </Stamp>
        {c.note && (
          <PenNote arrow="up" arrowFirst rotate={-4} className="fc-note">
            {c.note}
          </PenNote>
        )}
      </div>
    </article>
  )
}

export function Cases() {
  const [filter, setFilter] = useState<Filter>("all")
  const featured = CASES.filter((c) => c.featured)
  const rest = CASES.filter((c) => !c.featured)
  const shown = rest.filter((c) => matches(c, filter))

  return (
    <section id="cases" className="page cases-sec" aria-label="Case files">
      <SectionHead
        no="03"
        label="Case files"
        page={4}
        title={
          <>
            Seven files.{" "}
            <Redact block delay={120}>
              All open.
            </Redact>
          </>
        }
        kicker="From APT attribution to an iPhone app in App Store review. Open any file for the brief, the method and the evidence."
      />

      <div className="filters" role="toolbar" aria-label="Filter case files">
        {CASE_FILTERS.map((f) => {
          const n = CASES.filter((c) => matches(c, f.id)).length
          return (
            <button
              key={f.id}
              className={`filter ${filter === f.id ? "is-on" : ""}`}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
            >
              {f.label} <span className="mono">{String(n).padStart(2, "0")}</span>
            </button>
          )
        })}
      </div>

      <div className="featured">
        {featured.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.1}>
            <FolderCard c={c} out={!matches(c, filter)} />
          </Reveal>
        ))}
      </div>

      <div className="ledger">
        <div className="ledger-head mono" aria-hidden="true">
          <span>No.</span>
          <span>Subject</span>
          <span className="hide-md">Methods</span>
          <span>Year</span>
          <span>Status</span>
        </div>
        <motion.ul layout>
          <AnimatePresence initial={false}>
            {shown.map((c) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <button className="ledger-row" onClick={() => openCase(c)} data-cursor="Open file">
                  <span className="mono ledger-no">{c.no}</span>
                  <span className="ledger-main">
                    <strong>{c.title}</strong>
                    <span className="mono">{c.class}</span>
                  </span>
                  <span className="ledger-stack hide-md">{c.stack.slice(0, 3).join(" · ")}</span>
                  <span className="mono ledger-year">{c.year}</span>
                  <span className="ledger-status mono">{c.status}</span>
                  <span className="ledger-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
        {shown.length === 0 && <p className="ledger-empty mono">No further files in this category.</p>}
      </div>
    </section>
  )
}

// ============ CASE DRAWER ============

export function CaseDrawer() {
  const openId = useDossier((s) => s.openCase)
  const idx = CASES.findIndex((c) => c.id === openId)
  const c = idx >= 0 ? CASES[idx] : null
  const sheet = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!c) return
    if (!returnTo.current) returnTo.current = document.activeElement as HTMLElement
    lockScroll(true)
    sheet.current?.scrollTo({ top: 0 })
    sheet.current?.querySelector<HTMLElement>(".drawer-close")?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dossier.closeCase()
      if (e.key === "ArrowRight") dossier.openCase(CASES[(idx + 1) % CASES.length].id)
      if (e.key === "ArrowLeft") dossier.openCase(CASES[(idx - 1 + CASES.length) % CASES.length].id)
      if (e.key === "Tab" && sheet.current) {
        const f = sheet.current.querySelectorAll<HTMLElement>("a[href], button")
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
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
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              gtag.event({ action: "external_link_click", category: "engagement", label: `${c.title}: ${l.label}` })
                            }
                          >
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

            <nav className="drawer-nav" aria-label="Other case files">
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
