"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Exhibit } from "./index"
import { useDossier } from "../store"
import { CASES, type CaseFile } from "@/lib/dossier"
import "@/styles/cases.css"

type Kind = CaseFile["exhibit"]["kind"]

const KIND_CLASS: Record<Kind, string> = {
  "Real data": "xf-data",
  "Real footage": "xf-footage",
  Simulation: "xf-sim",
  Illustration: "xf-illus",
}

export type ExhibitFrameProps = {
  /** Case id: picks the exhibit, its kind badge and its caption. */
  caseId: string
  /** Number in the bar ("EXHIBIT 0N"). Defaults to the case number. */
  index?: number | string
  /** Replaces the bar label entirely. */
  label?: string
  /** Aspect ratio of the exhibit area, as a number (1.6) or "16 / 10". Default 16:10. */
  aspect?: number | string
  /** Hold the exhibit idle even when on screen (covered by another sheet, hidden preview). */
  paused?: boolean
  /** Lives in an overlay (case drawer, hover preview): keeps running while a case file is open. */
  overlay?: boolean
  /** Slim chrome and a one-line caption, for small previews. */
  compact?: boolean
  /** Mount the exhibit at once instead of waiting until it comes near the viewport. */
  eager?: boolean
  className?: string
  style?: CSSProperties
}

const ratio = (a: number | string) => {
  if (typeof a === "number") return a > 0 ? a : 1.6
  const [w, h] = a.split("/").map((s) => parseFloat(s))
  return w > 0 && h > 0 ? w / h : w > 0 ? w : 1.6
}

/**
 * The dark evidence screen every exhibit sits in: a bar with the exhibit number and an honest
 * badge for what it shows, corner brackets, and the caption along the bottom. The exhibit itself
 * mounts only once the frame comes near the viewport, and is told to idle whenever the frame is
 * off screen, the tab is hidden, or a case file is open over the page.
 */
export default function ExhibitFrame({
  caseId,
  index,
  label,
  aspect = 1.6,
  paused = false,
  overlay = false,
  compact = false,
  eager = false,
  className = "",
  style,
}: ExhibitFrameProps) {
  const ref = useRef<HTMLElement>(null)
  const [near, setNear] = useState(eager)
  const [onScreen, setOnScreen] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [booted, setBooted] = useState(false)
  const caseOpen = useDossier((s) => s.openCase !== null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const m = window.matchMedia("(prefers-reduced-motion: reduce)")
    const syncMotion = () => setReduced(m.matches)
    const syncPage = () => setPageVisible(document.visibilityState !== "hidden")
    syncMotion()
    syncPage()
    m.addEventListener("change", syncMotion)
    document.addEventListener("visibilitychange", syncPage)

    let nearObs: IntersectionObserver | null = null
    let visObs: IntersectionObserver | null = null
    if (typeof IntersectionObserver === "undefined") {
      setNear(true)
      setOnScreen(true)
    } else {
      nearObs = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return
          setNear(true)
          nearObs?.disconnect()
        },
        { rootMargin: "600px" },
      )
      visObs = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0 })
      nearObs.observe(el)
      visObs.observe(el)
    }
    return () => {
      nearObs?.disconnect()
      visObs?.disconnect()
      m.removeEventListener("change", syncMotion)
      document.removeEventListener("visibilitychange", syncPage)
    }
  }, [])

  const active = onScreen && pageVisible && !paused && (overlay || !caseOpen)

  // the screen powers on the first time its exhibit goes live (an overlay: the exhibit itself is never transformed)
  useEffect(() => {
    if (active && near && !booted) setBooted(true)
  }, [active, near, booted])

  const c = CASES.find((x) => x.id === caseId)
  if (!c) return null

  const no = String(index ?? c.no).padStart(2, "0")
  const bar = label ?? `Exhibit ${no}`
  const { kind, caption } = c.exhibit
  const ar = ratio(aspect)

  return (
    <figure
      ref={ref}
      className={`xf ${KIND_CLASS[kind]} ${compact ? "xf-compact" : ""} ${active ? "is-live" : ""} ${booted ? "is-booted" : ""} ${className}`}
      style={{ ...style, "--xf-ar": ar } as CSSProperties}
      aria-label={`Exhibit: ${caption}`}
      data-exhibit={caseId}
    >
      <div className="xf-bar">
        <span className="xf-no mono" aria-hidden="true">
          {bar}
        </span>
        <span className="xf-kind mono">
          <i className="xf-dot" aria-hidden="true" />
          {kind === "Real footage" && (
            <b className="xf-rec" aria-hidden="true">
              Rec
            </b>
          )}
          {kind}
        </span>
      </div>
      <div className="xf-screen" style={{ aspectRatio: ar }}>
        <div className="xf-stage">
          {near ? (
            <Exhibit id={caseId} mode={reduced ? "still" : "live"} active={active} />
          ) : (
            <div className="xf-wait" aria-hidden="true">
              <span className="mono">{bar} · standby</span>
            </div>
          )}
        </div>
        {near && !reduced && (
          <span className="xf-boot" aria-hidden="true">
            <i />
            <i />
          </span>
        )}
        <span className="xf-corners" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      <figcaption className="xf-cap" aria-hidden="true">
        {caption}
      </figcaption>
    </figure>
  )
}
