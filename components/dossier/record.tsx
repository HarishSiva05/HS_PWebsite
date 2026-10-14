"use client"

import { useRef } from "react"
import { motion, useScroll, useSpring } from "framer-motion"
import { Redact, Reveal, SectionHead, Stamp } from "./primitives"
import { AWARDS, CERTIFICATIONS, EDUCATION, EXPERIENCE, TRAINING } from "@/lib/dossier"

export function Record() {
  const line = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: line, offset: ["start 75%", "end 60%"] })
  const draw = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <section id="record" className="page record-sec" aria-label="Service record">
      <SectionHead
        no="04"
        label="Service record"
        page={5}
        title={
          <>
            Service{" "}
            <Redact block delay={80}>
              record.
            </Redact>
          </>
        }
        kicker="Employment, ongoing operations and education, most recent first."
      />

      <div className="record-grid">
        <div className="record-label">
          <span className="mono">A / Employment</span>
        </div>
        <ol className="timeline" ref={line}>
          <motion.span className="timeline-line" style={{ scaleY: draw }} aria-hidden="true" />
          {EXPERIENCE.map((x, i) => (
            <Reveal as="li" key={x.id} className="tl-item" delay={i * 0.05}>
              <span id={`rec-${x.id}`} className="anchor" />
              <span className="tl-dot" aria-hidden="true" />
              <div className="tl-when mono">
                <span>{x.period}</span>
                <span>{x.meta}</span>
              </div>
              <div className="tl-body">
                <h3>
                  {x.role} <span className="tl-at">at</span> <span className="tl-org">{x.org}</span>
                </h3>
                <ul>
                  {x.points.map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </ol>

        <div className="record-label">
          <span className="mono">B / Active operations</span>
        </div>
        <div className="ops-grid">
          {TRAINING.map((t, i) => (
            <Reveal as="article" key={t.id} className="op-card" delay={i * 0.08}>
              <span id={`rec-${t.id}`} className="anchor" />
              <div className="op-top mono">
                <span className="op-live">
                  <i /> {t.meta}
                </span>
                <span>{t.period}</span>
              </div>
              <h3>{t.role}</h3>
              <span className="op-org mono">{t.org}</span>
              {t.points.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </Reveal>
          ))}
        </div>

        <div className="record-label">
          <span className="mono">C / Education</span>
        </div>
        <div className="edu-grid">
          {EDUCATION.map((e, i) => (
            <Reveal as="article" key={e.degree} className={`edu-card ${i === 0 ? "is-primary" : ""}`} delay={i * 0.08}>
              <div className="edu-top mono">
                <span>{e.period}</span>
                <span className="edu-grade">{e.grade}</span>
              </div>
              <h3>{e.degree}</h3>
              <span className="edu-school">{e.school}</span>
              <p>{e.detail}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ COMMENDATIONS ============

function Seal({ ring, issuer, year, tone, idx }: { ring: string; issuer: string; year: string; tone: string; idx: number }) {
  const id = `seal-path-${idx}`
  return (
    <svg className={`seal seal-${tone}`} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id={id} d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
      </defs>
      <circle cx="100" cy="100" r="96" className="seal-edge" />
      <circle cx="100" cy="100" r="90" className="seal-rim" />
      <circle cx="100" cy="100" r="58" className="seal-rim" />
      <g className="seal-ring">
        <text>
          <textPath href={`#${id}`} textLength={2 * Math.PI * 74 - 6}>
            {ring}
          </textPath>
        </text>
      </g>
      <text x="100" y="98" textAnchor="middle" className="seal-issuer">
        {issuer}
      </text>
      <text x="100" y="122" textAnchor="middle" className="seal-year">
        ★ {year} ★
      </text>
    </svg>
  )
}

const SEAL_TONES = ["ink", "red", "ink", "red"]

export function Honours() {
  return (
    <section id="honours" className="page honours-sec" aria-label="Commendations">
      <SectionHead
        no="05"
        label="Commendations"
        page={6}
        title={
          <>
            Certified &amp;{" "}
            <Redact block delay={80}>
              commended.
            </Redact>
          </>
        }
      />

      <ul className="seals">
        {CERTIFICATIONS.map((c, i) => (
          <Reveal as="li" key={c.title} className="seal-item" delay={i * 0.08}>
            <Seal ring={c.ring} issuer={c.issuer} year={c.year} tone={SEAL_TONES[i]} idx={i} />
            <span className="seal-title">{c.title}</span>
            <span className="mono">
              {c.issuer} · {c.year}
            </span>
          </Reveal>
        ))}
      </ul>

      <ol className="awards">
        {AWARDS.map((a, i) => (
          <Reveal as="li" key={a.title} className={`award ${a.featured ? "is-featured" : ""}`} delay={i * 0.06}>
            <span className="mono award-rank">{a.rank}</span>
            <span className="award-title">{a.title}</span>
            <span className="award-detail">{a.detail}</span>
            {a.featured && (
              <Stamp tone="red" rotate={-7} className="award-stamp">
                ★ Winner
              </Stamp>
            )}
          </Reveal>
        ))}
      </ol>
    </section>
  )
}
