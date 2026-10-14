"use client"

import { PenNote, Redact, Reveal, Scramble, SectionHead } from "./primitives"
import { AFFILIATIONS, EXHIBITS, FIELD_NOTES } from "@/lib/dossier"

export function Summary() {
  return (
    <section id="summary" className="page summary" aria-label="Analyst summary">
      <SectionHead
        no="01"
        label="Analyst summary"
        page={2}
        title={
          <>
            Reads{" "}
            <Redact block delay={0}>
              adversaries.
            </Redact>
            <br />
            Ships{" "}
            <Redact block delay={220}>
              software.
            </Redact>
          </>
        }
      />

      <div className="summary-grid">
        <div className="summary-lede">
          <Reveal>
            <p className="lede-xl">
              Cybersecurity professional with an M.Sc. in Cybersecurity &amp; Threat Intelligence from the University
              of Guelph and <Redact mark>4+ years</Redact> of software engineering in{" "}
              <Redact mark delay={150}>
                enterprise production
              </Redact>{" "}
              environments. Equally at home{" "}
              <Redact mark delay={100}>
                reverse-engineering malware
              </Redact>{" "}
              and{" "}
              <Redact mark delay={250}>
                shipping an iPhone app
              </Redact>
              .
            </p>
          </Reveal>
          <PenNote arrow="up" arrowFirst rotate={-3} className="pen-lede">
            reads malware &amp; writes Swift
          </PenNote>
        </div>

        <Reveal className="assessment" delay={0.1}>
          <div className="assessment-head mono">
            <span>Assessment</span>
            <span>Confidence: High</span>
          </div>
          <p>
            Maps adversary behaviour to MITRE ATT&amp;CK, then builds and ships the tooling that acts on it. Turns
            technical findings into clear, actionable guidance for engineers and non-technical stakeholders alike.
          </p>
          <div className="assessment-foot mono">
            <span>Python · C# · Swift · SQL</span>
            <span>MITRE ATT&amp;CK · STRIDE</span>
          </div>
        </Reveal>
      </div>

      <div className="notes-grid">
        {FIELD_NOTES.map((n, i) => (
          <Reveal key={n.head} className="note-card" delay={i * 0.08}>
            <span className="mono note-num">
              Note {i + 1}/{FIELD_NOTES.length}
            </span>
            <h3>{n.head}</h3>
            <p>{n.body}</p>
          </Reveal>
        ))}
      </div>

      <div className="exhibits">
        {EXHIBITS.map((x, i) => (
          <Reveal key={x.id} className="exhibit" delay={i * 0.07}>
            <span className="mono exhibit-tag">Exhibit {x.id}</span>
            <span className="exhibit-num">
              <Scramble text={String(x.value)} digitsOnly duration={1100} />
              <em>{x.suffix}</em>
            </span>
            <span className="exhibit-label">{x.label}</span>
          </Reveal>
        ))}
      </div>

      <div className="affil">
        <span className="mono">Affiliations on record</span>
        <ul>
          {AFFILIATIONS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
