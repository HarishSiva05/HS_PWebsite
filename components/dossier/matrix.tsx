"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { dossier } from "./store"
import { jump } from "./smooth-scroll"
import { Redact, SectionHead } from "./primitives"
import { MATRIX, evidenceLabel, type EvidenceRef } from "@/lib/dossier"

const key = (e: EvidenceRef) => `${e.kind}:${e.id}`
const tid = (t: number, i: number) => `T${String(t + 1).padStart(2, "0")}.${String(i + 1).padStart(2, "0")}`

function follow(e: EvidenceRef) {
  if (e.kind === "case") dossier.openCase(e.id)
  else jump(e.id === "certs" ? "honours" : `rec-${e.id}`)
}

export function Matrix() {
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

  const totalTechniques = MATRIX.reduce((n, t) => n + t.techniques.length, 0)

  return (
    <section id="capabilities" className="page matrix-sec" aria-label="Capability matrix">
      <SectionHead
        no="02"
        label="Capability matrix"
        page={3}
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
            Laid out like a MITRE ATT&amp;CK matrix: {MATRIX.length} tactics, {totalTechniques} techniques. Hover or tap
            any technique to pull the case file or record entry that backs it up.
          </>
        }
      />

      <div className="matrix-wrap" data-lenis-prevent-horizontal>
        <div className="matrix" role="group" aria-label="Techniques by tactic">
          {MATRIX.map((tac, t) => (
            <div className="tactic" key={tac.id}>
              <div className="tactic-head">
                <span className="mono">{tac.id}</span>
                <h3>{tac.name}</h3>
                <span className="mono tactic-count">{tac.techniques.length} techniques</span>
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
                <span className="blink-caret" /> Select a technique to pull its evidence.
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
            <i className="ev-rec" /> Record
          </span>
        </div>
      </div>
    </section>
  )
}
