"use client"

// The strip under the board that says, in words, what the red string shows: a skill's evidence,
// or what a piece of evidence proves. Its buttons follow the evidence, like the list view's panel.

import { dossier } from "./store"
import { jump } from "./smooth-scroll"
import { EXPERIENCE, MATRIX, SUBJECT, TRAINING, evidenceLabel, type EvidenceRef } from "@/lib/dossier"
import { EDGES, ITEM, type Item } from "./board-data"

type Focus = { id: string; line?: number } | null

const tid = (t: number, i: number) => `T${String(t + 1).padStart(2, "0")}.${String(i + 1).padStart(2, "0")}`

function refOf(it: Item): EvidenceRef | null {
  if (it.kind === "case") return { kind: "case", id: it.ref }
  if (it.kind === "job" || it.kind === "training") return { kind: "record", id: it.ref }
  if (it.kind === "cert") return { kind: "record", id: "certs" }
  return null
}

function follow(e: EvidenceRef) {
  if (e.kind === "case") dossier.openCase(e.id)
  else jump(e.id === "certs" ? "honours" : `rec-${e.id}`)
}

/** Skills each evidence item proves, in matrix order. */
const PROVES: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {}
  for (const e of EDGES) {
    if (ITEM[e.a].kind !== "skill") continue
    const tac = MATRIX[Number(ITEM[e.a].ref)]
    out[e.b] = [...(out[e.b] ?? []), ...e.skills.map((i) => tac.techniques[i].name)]
  }
  return out
})()

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "6 projects and 1 job" for the evidence strung to a skill card. */
function backing(cardId: string) {
  const n = { case: 0, job: 0, training: 0, cert: 0 }
  for (const e of EDGES) if (e.a === cardId) n[ITEM[e.b].kind as keyof typeof n]++
  const parts = [
    n.case && plural(n.case, "project"),
    n.job && plural(n.job, "job"),
    n.training && plural(n.training, "training course", "training courses"),
    n.cert && "a certification",
  ].filter(Boolean) as string[]
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0] ?? "nothing yet"
}

function FollowButton({ e }: { e: EvidenceRef }) {
  const l = evidenceLabel(e)
  return (
    <li>
      <button type="button" onClick={() => follow(e)} data-cursor="Follow">
        <span className={`mono ev-kind ${e.kind === "case" ? "ev-kind-case" : ""}`}>{l.tag}</span>
        {l.title}
        <span aria-hidden="true">{e.kind === "case" ? "Open file →" : "Jump ↓"}</span>
      </button>
    </li>
  )
}

function Body({ focus }: { focus: Focus }) {
  if (!focus)
    return (
      <p className="evidence-empty">
        <span className="blink-caret" /> Hover or tap a card to follow its red string. Pick a skill to pin its evidence here.
      </p>
    )

  const it = ITEM[focus.id]

  if (it.kind === "skill") {
    const t = Number(it.ref)
    const tac = MATRIX[t]
    if (focus.line != null) {
      const tech = tac.techniques[focus.line]
      return (
        <>
          <p className="evidence-what">
            <span className="mono">{tid(t, focus.line)}</span> {tech.name}
          </p>
          {tech.evidence.length === 0 ? (
            <p className="evidence-none">Listed on the résumé. Happy to walk through it in an interview.</p>
          ) : (
            <ul className="evidence-list">
              {tech.evidence.map((e) => (
                <FollowButton key={`${e.kind}:${e.id}`} e={e} />
              ))}
            </ul>
          )}
        </>
      )
    }
    return (
      <>
        <p className="evidence-what">
          <span className="mono">{tac.id}</span> {tac.name}
        </p>
        <p className="ro-sub">
          {plural(tac.techniques.length, "skill")}, backed by {backing(it.id)}. Point at a skill for its own evidence.
        </p>
      </>
    )
  }

  if (it.kind === "subject") {
    return (
      <>
        <p className="evidence-what">
          <span className="mono">{SUBJECT.fileNo}</span> {SUBJECT.name}, the subject
        </p>
        <ul className="evidence-list">
          {EXPERIENCE.map((x) => (
            <FollowButton key={x.id} e={{ kind: "record", id: x.id }} />
          ))}
        </ul>
      </>
    )
  }

  const ref = refOf(it)!
  const proves = PROVES[it.id] ?? []
  // evidence no skill cites yet: say what it is instead, straight from the record
  const job = it.kind === "job" ? EXPERIENCE.find((x) => x.id === it.ref) : undefined
  const course = it.kind === "training" ? TRAINING.find((x) => x.id === it.ref) : undefined
  const about = job ? `${job.period}. ${job.points[0] ?? ""}` : course ? `${course.meta} · ${course.period}` : ""
  return (
    <>
      <ul className="evidence-list ro-first">
        <FollowButton e={ref} />
      </ul>
      <p className="ro-sub">
        {proves.length ? (
          <>
            <span className="mono ro-proves">Proves</span> {proves.join(" · ")}
          </>
        ) : (
          about
        )}
      </p>
    </>
  )
}

export function BoardReadout({ focus }: { focus: Focus }) {
  const k = focus ? `${focus.id}:${focus.line ?? ""}` : "none"
  return (
    <div className="evidence board-readout" aria-live="polite">
      <span className="mono evidence-tag">Evidence</span>
      <div className="evidence-body ro-body" key={k}>
        <Body focus={focus} />
      </div>
      <div className="evidence-key mono" aria-hidden="true">
        <span>
          <i className="ev-case" /> Case file
        </span>
        <span>
          <i className="ev-rec" /> Work / training
        </span>
      </div>
    </div>
  )
}
