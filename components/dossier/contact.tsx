"use client"

import { useState } from "react"
import { Scramble, SectionHead, Stamp } from "./primitives"
import { jump } from "./smooth-scroll"
import { PAGE_COUNT, SUBJECT } from "@/lib/dossier"
import * as gtag from "@/lib/gtag"

// Deterministic barcode bars from the file number
const BARS = Array.from({ length: 46 }, (_, i) => ((i * 7919 + 13) % 5) + 1)

export function Contact() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SUBJECT.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${SUBJECT.email}`
    }
    gtag.event({ action: "contact_interaction", category: "engagement", label: "Copy email" })
  }

  const ext = (label: string) => () => gtag.event({ action: "external_link_click", category: "engagement", label })

  return (
    <section id="contact" className="page ops contact" aria-label="Contact">
      <SectionHead
        id="contact"
        tone="ops"
        title={
          <>
            Got a threat to model,
            <br />
            or a product to ship?
            <br />
            <span className="contact-em">Let&apos;s talk.</span>
          </>
        }
      />

      <div className="contact-email-row">
        <a
          className="contact-email"
          href={`mailto:${SUBJECT.email}`}
          data-cursor="Write"
          onClick={() => gtag.event({ action: "contact_interaction", category: "engagement", label: "Email CTA" })}
        >
          <Scramble text={SUBJECT.email} duration={1400} />
        </a>
        <button className="contact-copy mono" onClick={copy} aria-live="polite">
          {copied ? "Copied ✓" : "Copy address"}
        </button>
      </div>

      <div className="contact-grid">
        <div className="contact-col">
          <span className="mono">Elsewhere</span>
          <a href={SUBJECT.linkedin} target="_blank" rel="noopener noreferrer" onClick={ext("LinkedIn")}>
            LinkedIn ↗
          </a>
          <a href={SUBJECT.github} target="_blank" rel="noopener noreferrer" onClick={ext("GitHub")}>
            GitHub ↗
          </a>
        </div>
        <div className="contact-col">
          <span className="mono">Full file</span>
          <a
            href={SUBJECT.resume}
            download
            onClick={() => gtag.event({ action: "resume_download", category: "engagement", label: "Contact" })}
          >
            Résumé, PDF ↓
          </a>
        </div>
        <div className="contact-col">
          <span className="mono">Location</span>
          <span>{SUBJECT.location}, Canada</span>
          <span className="mono">{SUBJECT.coords}</span>
        </div>
        <div className="contact-col">
          <span className="mono">Availability</span>
          <span>
            <span className="pulse" /> Open to security engineering, threat intelligence and software roles.
          </span>
        </div>
      </div>

      <footer className="eof">
        <div className="eof-left">
          <svg className="barcode" viewBox={`0 0 ${BARS.length * 4} 40`} aria-hidden="true" preserveAspectRatio="none">
            {BARS.reduce<{ x: number; els: React.ReactNode[] }>(
              (acc, w, i) => {
                if (i % 2 === 0) acc.els.push(<rect key={i} x={acc.x} y="0" width={w} height="40" />)
                acc.x += w + 1
                return acc
              },
              { x: 0, els: [] },
            ).els}
          </svg>
          <span className="mono">
            {SUBJECT.fileNo} · {PAGE_COUNT} pages · © {new Date().getFullYear()} {SUBJECT.name}
          </span>
        </div>
        <Stamp tone="lime" rotate={-6} className="eof-stamp">
          End of file
        </Stamp>
        <button className="mono eof-top" onClick={() => jump("cover")}>
          Back to top ↑
        </button>
      </footer>
    </section>
  )
}
