"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { dossier } from "./store"
import { jump } from "./smooth-scroll"
import { Redact, SectionHead } from "./primitives"
import { EvidenceBoard } from "./board"
import { MATRIX, evidenceLabel, sectionName, type EvidenceRef } from "@/lib/dossier"
import { play } from "@/lib/sound"
import "@/styles/board.css"

const key = (e: EvidenceRef) => `${e.kind}:${e.id}`
const tid = (t: number, i: number) => `T${String(t + 1).padStart(2, "0")}.${String(i + 1).padStart(2, "0")}`

function follow(e: EvidenceRef) {
  if (e.kind === "case") dossier.openCase(e.id)
  else jump(e.id === "certs" ? "honours" : `rec-${e.id}`)
}

type View = "auto" | "board" | "list"
const VIEW_KEY = "hs-skills-view"
const totalTechniques = MATRIX.reduce((n, t) => n + t.techniques.length, 0)

export function Matrix() {
  // "auto" until mounted: CSS shows the board on wide fine-pointer screens and the list elsewhere,
  // so the server render already matches what the client will pick.
  const [view, setView] = useState<View>("auto")
  const [switched, setSwitched] = useState(false)

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = sessionStorage.getItem(VIEW_KEY)
    } catch {}
    if (stored === "board" || stored === "list") setView(stored)
    else setView(window.matchMedia("(min-width: 1024px) and (hover: hover)").matches ? "board" : "list")
  }, [])

  // the section changes height when the view flips: let every ScrollTrigger re-measure
  useEffect(() => {
    if (view === "auto") return
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [view])

  const choose = (v: "board" | "list") => {
    if (v === view) return
    play("paper", { volume: 0.4 })
    setSwitched(true)
    setView(v)
    try {
      sessionStorage.setItem(VIEW_KEY, v)
    } catch {}
  }

  return (
    <section id="capabilities" className="page matrix-sec" data-view={view} aria-label={sectionName("capabilities")}>
      <SectionHead
        id="capabilities"
        title={
          <>
            Capabilities,{" "}
            <Redact block delay={100}>
              with evidence.
            </Redact>
          </>
        }
        kicker={
          <>
            {MATRIX.length} skill areas and {totalTechniques} skills, pinned to the projects, jobs, training and
            certification that prove them.{" "}
            <span className="kick-board">Hover or tap a card to follow its red string.</span>
            <span className="kick-list">Select any skill to see the evidence behind it.</span>
          </>
        }
      />

      <div className="skills-bar">
        <div className="view-switch" role="group" aria-label="Show skills as">
          <button
            type="button"
            className="vs-board"
            aria-pressed={view === "board"}
            onClick={() => choose("board")}
            data-cursor="Board"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
              <path d="M4.5 6.5 L8 10 L11.5 5.5" />
              <circle cx="4.5" cy="6.5" r="1.3" />
              <circle cx="8" cy="10" r="1.3" />
              <circle cx="11.5" cy="5.5" r="1.3" />
            </svg>
            Board
          </button>
          <button type="button" className="vs-list" aria-pressed={view === "list"} onClick={() => choose("list")} data-cursor="List">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5.5 4h9M5.5 8h9M5.5 12h9" />
              <circle cx="2.4" cy="4" r="1" />
              <circle cx="2.4" cy="8" r="1" />
              <circle cx="2.4" cy="12" r="1" />
            </svg>
            List
          </button>
        </div>
        <ul className="skills-bar-board board-legend mono" aria-label="Key">
          <li>
            <i className="lg-pin lg-skill" aria-hidden="true" /> Skill area
          </li>
          <li>
            <i className="lg-pin lg-case" aria-hidden="true" /> Project
          </li>
          <li>
            <i className="lg-pin lg-rec" aria-hidden="true" /> Work · training · cert
          </li>
          <li>
            <svg className="lg-string" viewBox="0 0 30 10" aria-hidden="true">
              <path d="M1 3 Q15 12 29 3" />
            </svg>
            Evidence
          </li>
        </ul>
      </div>

      {/* before hydration both views render and CSS shows one; after it, only the chosen view exists */}
      {view !== "list" && (
        <div className="sv-board">
          <EvidenceBoard intro={switched ? "now" : "scroll"} />
        </div>
      )}
      {view !== "board" && (
        <div className="sv-list">
          <MatrixList />
        </div>
      )}
    </section>
  )
}

/** The list view: the original matrix and evidence panel. Also the accessible equivalent of the board. */
function MatrixList() {
  const [active, setActive] = useState<{ t: number; i: number } | null>(null)

  const current = active ? MATRIX[active.t].techniques[active.i] : null
  const linked = useMemo(() => {
    if (!current) return new Set<string>()
    const keys = new Set(current.evidence.map(key))
    const out = new Set<string>()
    MATRIX.forEach((tac, t) =>
      tac.techniques.forEach((tech, i) => {
        if (tech.evidence.some((e) => keys.has(key(e)))) out.add(`${t}-${i}`)
      }),
    )
    return out
  }, [current])

  return (
    <>
      <div className="matrix-wrap" data-lenis-prevent-horizontal>
        <div className="matrix" role="group" aria-label="Skills by area">
          {MATRIX.map((tac, t) => (
            <div className="tactic" key={tac.id}>
              <div className="tactic-head">
                <span className="mono">{tac.id}</span>
                <h3>{tac.name}</h3>
                <span className="mono tactic-count">{tac.techniques.length} skills</span>
              </div>
              <ul>
                {tac.techniques.map((tech, i) => {
                  const isActive = active?.t === t && active?.i === i
                  const isLinked = !isActive && linked.has(`${t}-${i}`)
                  return (
                    <li key={tech.name}>
                      <button
                        className={`tech ${isActive ? "is-active" : ""} ${isLinked ? "is-linked" : ""} ${
                          active && !isActive && !isLinked ? "is-dim" : ""
                        }`}
                        onPointerEnter={(e) => e.pointerType === "mouse" && setActive({ t, i })}
                        onFocus={() => setActive({ t, i })}
                        onClick={() => setActive({ t, i })}
                        aria-pressed={isActive}
                        data-cursor="Inspect"
                      >
                        <span className="mono tech-id">{tid(t, i)}</span>
                        <span className="tech-name">
                          {tech.name}
                          {tech.note && <em> ({tech.note})</em>}
                        </span>
                        <span className="tech-ev" aria-label={`${tech.evidence.length} evidence items`}>
                          {tech.evidence.map((e) => (
                            <i key={key(e)} className={e.kind === "case" ? "ev-case" : "ev-rec"} />
                          ))}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="evidence" aria-live="polite">
        <span className="mono evidence-tag">Evidence</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active ? `${active.t}-${active.i}` : "none"}
            className="evidence-body"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {!current || !active ? (
              <p className="evidence-empty">
                <span className="blink-caret" /> Select a skill to see its evidence.
              </p>
            ) : (
              <>
                <p className="evidence-what">
                  <span className="mono">{tid(active.t, active.i)}</span> {current.name}
                </p>
                {current.evidence.length === 0 ? (
                  <p className="evidence-none">Listed on the résumé. Happy to walk through it in an interview.</p>
                ) : (
                  <ul className="evidence-list">
                    {current.evidence.map((e) => {
                      const l = evidenceLabel(e)
                      return (
                        <li key={key(e)}>
                          <button onClick={() => follow(e)} data-cursor="Follow">
                            <span className={`mono ev-kind ${e.kind === "case" ? "ev-kind-case" : ""}`}>{l.tag}</span>
                            {l.title}
                            <span aria-hidden="true">{e.kind === "case" ? "Open file →" : "Jump ↓"}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="evidence-key mono" aria-hidden="true">
          <span>
            <i className="ev-case" /> Case file
          </span>
          <span>
            <i className="ev-rec" /> Work / training
          </span>
        </div>
      </div>
    </>
  )
}
