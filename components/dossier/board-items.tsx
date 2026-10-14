"use client"

// The paper on the board: index cards, polaroids, memos, tickets and a certificate.
// Purely visual; the board owns position, drag, focus and string state.

import { memo } from "react"
import { Exhibit } from "@/components/dossier/exhibits"
import { CASES, EXPERIENCE, MATRIX, SUBJECT, TRAINING, evidenceLabel } from "@/lib/dossier"
import { CERT, type Item } from "./board-data"

const caseOf = (id: string) => CASES.find((c) => c.id === id)!
const jobOf = (id: string) => EXPERIENCE.find((x) => x.id === id)!
const trainingOf = (id: string) => TRAINING.find((x) => x.id === id)!

const yearsOf = (period: string) => period.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) /g, "")

/** Screen-reader name for each card. */
export function itemLabel(it: Item, skillsCiting: string[]): string {
  const backs = skillsCiting.length ? ` Evidence for: ${skillsCiting.join(", ")}.` : ""
  switch (it.kind) {
    case "subject":
      return `${SUBJECT.name}, the subject of this file. Red string ties him to his three employers.`
    case "skill": {
      const t = MATRIX[Number(it.ref)]
      return `${t.name}: ${t.techniques.length} skills. Use the arrow keys to go through them.`
    }
    case "case": {
      const c = caseOf(it.ref)
      return `Case ${c.no}, ${c.title}, ${c.year}.${backs} Open the case file.`
    }
    case "job": {
      const j = jobOf(it.ref)
      return `Work: ${j.role} at ${j.org}, ${j.period}.${backs} Go to the experience entry.`
    }
    case "training": {
      const t = trainingOf(it.ref)
      return `Training: ${t.role}, ${t.org}, ${t.period}.${backs} Go to the training entry.`
    }
    case "cert":
      return `Certification: ${CERT.title}, ${CERT.issuer}, ${CERT.year}.${backs} Go to certifications.`
  }
}

// ---------- subject ----------

export const SubjectCard = memo(function SubjectCard() {
  return (
    <div className="bc bc-polaroid bc-subject" aria-hidden="true">
      <span className="bc-photo">
        <img src="/subject.jpg" alt="" width={312} height={312} loading="lazy" decoding="async" draggable={false} />
        <span className="bc-gloss" />
      </span>
      <span className="bc-cap">{SUBJECT.name}</span>
      <span className="bc-tag mono">Subject · {SUBJECT.fileNo}</span>
    </div>
  )
})

// ---------- project polaroid ----------

export const CaseCard = memo(function CaseCard({ id, near }: { id: string; near: boolean }) {
  const c = caseOf(id)
  return (
    <div className={`bc bc-polaroid bc-case ${c.featured ? "" : "is-small"}`} aria-hidden="true">
      <span className="bc-photo">
        {near ? <Exhibit id={c.id} mode="still" active={false} /> : <span className="exhibit-loading" />}
        <span className="bc-gloss" />
        <span className="bc-no mono">Case {c.no}</span>
        <span className="bc-kind mono">{c.exhibit.kind}</span>
      </span>
      <span className="bc-cap">{c.title}</span>
    </div>
  )
})

// ---------- employment memo ----------

export const JobCard = memo(function JobCard({ id }: { id: string }) {
  const j = jobOf(id)
  return (
    <div className="bc bc-memo" aria-hidden="true">
      <span className="bc-memo-top mono">
        <span>Work</span>
        <span>{yearsOf(j.period)}</span>
      </span>
      <strong className="bc-memo-org">{j.org.replace(" Technologies", "")}</strong>
      <span className="bc-memo-role">{j.role}</span>
    </div>
  )
})

// ---------- training ticket ----------

export const TrainingCard = memo(function TrainingCard({ id }: { id: string }) {
  const t = trainingOf(id)
  return (
    <div className="bc bc-ticket" aria-hidden="true">
      <span className="bc-ticket-stub mono">Training</span>
      <span className="bc-ticket-body">
        <span className="bc-ticket-top mono">
          {t.live && <i className="bc-live" />}
          {yearsOf(t.period)}
        </span>
        <strong>{t.role}</strong>
        <span className="mono bc-ticket-org">{t.org}</span>
      </span>
    </div>
  )
})

// ---------- certificate ----------

export const CertCard = memo(function CertCard() {
  return (
    <div className="bc bc-cert" aria-hidden="true">
      <svg className="bc-seal" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="27" className="bc-seal-edge" />
        <circle cx="30" cy="30" r="21.5" className="bc-seal-rim" />
        <path d="M21 31.5 l6 6 l12 -14" className="bc-seal-tick" />
      </svg>
      <span className="bc-cert-body">
        <span className="mono bc-cert-top">Certified</span>
        <strong>{CERT.title}</strong>
        <span className="mono bc-cert-by">
          {CERT.issuer} · {CERT.year}
        </span>
      </span>
    </div>
  )
})

// ---------- skill index card ----------

export const SkillCard = memo(function SkillCard({
  t,
  hits,
  onLine,
  onLineKey,
  onLineClick,
  onLineFocus,
}: {
  t: number
  /** technique indexes lit right now */
  hits: number[] | null
  onLine: (t: number, i: number | null) => void
  onLineKey: (e: React.KeyboardEvent<HTMLButtonElement>, t: number, i: number) => void
  onLineClick: (t: number, i: number) => void
  onLineFocus: (t: number, i: number | null) => void
}) {
  const tac = MATRIX[t]
  return (
    <div className="bc bc-skill">
      <span className="bc-skill-top mono" aria-hidden="true">
        {tac.id}
      </span>
      <h3 className="bc-skill-name">{tac.name}</h3>
      <ul className="bc-skill-list">
        {tac.techniques.map((tech, i) => {
          const proofs = tech.evidence.length
          return (
            <li key={tech.name}>
              <button
                type="button"
                tabIndex={-1}
                className={`bc-line tech ${hits?.includes(i) ? "is-hit" : ""} ${proofs ? "" : "is-bare"}`}
                data-line={i}
                onPointerEnter={(e) => e.pointerType === "mouse" && onLine(t, i)}
                onPointerLeave={(e) => e.pointerType === "mouse" && onLine(t, null)}
                onFocus={(e) => e.currentTarget.matches(":focus-visible") && onLineFocus(t, i)}
                onBlur={() => onLineFocus(t, null)}
                onKeyDown={(e) => onLineKey(e, t, i)}
                onClick={() => onLineClick(t, i)}
                aria-label={`${tech.name}${tech.note ? ` (${tech.note})` : ""}. ${
                  proofs
                    ? `Evidence: ${tech.evidence
                        .map((e) => {
                          const l = evidenceLabel(e)
                          return `${l.tag}, ${l.title}`
                        })
                        .join("; ")}.`
                    : "Listed on the résumé."
                }`}
              >
                <span className="bc-line-text">
                  {tech.name}
                  {tech.note && <em> ({tech.note})</em>}
                </span>
                <span className="bc-line-ev" aria-hidden="true">
                  {tech.evidence.map((e) => (
                    <i key={`${e.kind}:${e.id}`} className={e.kind === "case" ? "ev-case" : "ev-rec"} />
                  ))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
})
