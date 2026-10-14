"use client"

import "@/styles/exhibit-security.css"
import { useCallback, useId, useRef } from "react"
import { Camera, Check, Clock, Plane, UserRound } from "lucide-react"
import type { ExhibitProps } from "./types"
import { span, useCue, useLoop, useReducedMotion } from "./security/use-loop"
import { Glitter, Landscape } from "./security/landscape"
import { CHIPS, DURATION, FIELDS, FILE, MARKS, SCAN, STILL_AT, STRIKES, T, VEIL } from "./security/metawipe-data"

const LABEL =
  "Illustration of MetaWipe stripping a photo before it is shared. A scan passes over a lakeside photo while its metadata sheet is struck through field by field: GPS latitude, longitude and altitude, location name, date taken, camera make and model, lens, software, body serial, owner name, image unique ID, orientation and embedded thumbnail. The map pin fades away and the counter reads 14 of 14 removed, 0 network requests. Ready to share."

const ICONS = { clock: Clock, camera: Camera, user: UserRound }

// enough copies of the tag dump to cover the whole photo at any size
const VEIL_TEXT = Array.from({ length: 9 }, () => VEIL).join(" · ")

export default function Exhibit({ mode = "live", active = false }: ExhibitProps) {
  const reduced = useReducedMotion()
  const still = mode === "still" || reduced
  const running = !still && active
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")

  const photo = useRef<HTMLDivElement>(null)
  const beam = useRef<HTMLDivElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const veilIn = useRef<HTMLDivElement>(null)

  // the beam and the wiped edge of the veil move every frame, on the compositor
  const drawn = useRef<{ p: number; on: boolean; el: HTMLDivElement | null }>({ p: NaN, on: false, el: null })
  const onFrame = useCallback((t: number) => {
    const p = span(t, T.scan, SCAN)
    const on = t >= T.scan && t < T.clean
    // nothing moves before or after the sweep: skip the writes
    if (p === drawn.current.p && on === drawn.current.on && beam.current === drawn.current.el) return
    drawn.current = { p, on, el: beam.current }
    if (beam.current) {
      beam.current.style.transform = `translateY(${(p * 100).toFixed(3)}%)`
      beam.current.dataset.on = on ? "1" : "0"
    }
    if (veil.current) veil.current.style.transform = `translateY(${(p * 100).toFixed(3)}%)`
    if (veilIn.current) veilIn.current.style.transform = `translateY(${(-p * 100).toFixed(3)}%)`
  }, [])

  // the "try it" bit: a torch under the mouse shows what the file is still carrying
  const torch = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = photo.current
    if (!el || e.pointerType !== "mouse") return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(2)}%`)
    el.style.setProperty("--my", `${(((e.clientY - r.top) / r.height) * 100).toFixed(2)}%`)
    el.dataset.torch = "1"
  }, [])
  const torchOff = useCallback(() => {
    if (photo.current) photo.current.dataset.torch = "0"
  }, [])

  // paper at different heights on the desk: the print, the sheet and the map drift apart under the mouse
  const root = useRef<HTMLDivElement>(null)
  const drift = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = root.current
    if (!el || e.pointerType !== "mouse") return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3))
    el.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3))
  }, [])
  const driftOff = useCallback(() => {
    root.current?.style.setProperty("--px", "0")
    root.current?.style.setProperty("--py", "0")
  }, [])

  const { step, lap } = useLoop({ duration: DURATION, marks: MARKS, running, still, stillAt: STILL_AT, onFrame })
  const at = (mark: number) => step > MARKS.indexOf(mark as (typeof MARKS)[number])
  const removed = STRIKES.filter((s) => at(s)).length
  const clean = at(T.clean)
  const done = at(T.done)
  const pinGone = removed >= 2
  useCue("stamp", done, running)

  return (
    <div
      ref={root}
      className={`mw ${still ? "is-still" : "is-live"} ${running || still ? "" : "is-paused"} ${done ? "is-done" : ""}`}
      role="img"
      aria-label={LABEL}
      onPointerMove={still ? undefined : drift}
      onPointerLeave={still ? undefined : driftOff}
    >
      <div className="mw-stage" key={lap} data-fading={at(T.fade) ? "1" : "0"}>
        {/* ---------- the photo ---------- */}
        <div className="mw-left">
          <div className="mw-print">
            <div
              className="mw-photo"
              ref={photo}
              data-clean={clean ? "1" : "0"}
              onPointerMove={torch}
              onPointerLeave={torchOff}
            >
              <div className="mw-photo-img">
                <Landscape uid={uid} />
                <Glitter />
                <Glitter alt />
                <div className="mw-mist" />
              </div>
              <div className="mw-veil" ref={veil} aria-hidden="true">
                <div className="mw-veil-in" ref={veilIn}>
                  <div className="mw-veil-txt">{VEIL_TEXT}</div>
                  <div className="mw-torch">{VEIL_TEXT}</div>
                </div>
              </div>
              {CHIPS.map((c) => {
                const Icon = ICONS[c.icon]
                return (
                  <span
                    key={c.field}
                    className={`mw-chip mw-chip-${c.side} ${removed > c.field ? "is-gone" : ""}`}
                    style={{ top: `${(c.y * 100).toFixed(1)}%`, [c.side]: c.x }}
                    aria-hidden="true"
                  >
                    <Icon strokeWidth={2.2} />
                    {c.text}
                  </span>
                )
              })}
              <div className="mw-beam" ref={beam} data-on="0" aria-hidden="true">
                <i />
              </div>
              <div className="mw-glint" aria-hidden="true" />
              <div className="mw-lamp" aria-hidden="true" />
              <span className="mw-nodata" aria-hidden="true">
                No metadata
              </span>
            </div>

            <div className={`mw-map ${pinGone ? "is-gone" : ""}`} aria-hidden="true">
              <MiniMap />
              <span className="mw-pin">
                <svg viewBox="0 0 24 32">
                  <path d="M12 31C12 31 2 18.6 2 11.4 2 5.7 6.5 1.5 12 1.5S22 5.7 22 11.4C22 18.6 12 31 12 31Z" />
                  <circle cx="12" cy="11.5" r="3.6" />
                </svg>
              </span>
              <span className="mw-pin-ring" />
              <span className="mw-map-off">No location</span>
            </div>
          </div>

          <div className="mw-cap">
            <span>
              {FILE}
              <span className="w-only"> · 4032 × 3024</span>
            </span>
            <span className="mw-offline">
              <Plane aria-hidden="true" strokeWidth={2.2} />
              On-device
            </span>
          </div>
        </div>

        {/* ---------- the metadata sheet ---------- */}
        <div className="mw-sheet">
          <header className="mw-sheet-head">
            <strong>Metadata</strong>
            <span>
              <span className="w-only">{FILE} · </span>
              {FIELDS.length} fields
            </span>
          </header>
          <ol className="mw-rows">
            {FIELDS.map((f, i) => (
              <li key={f.label} className={`mw-row ${i < removed ? "is-struck" : ""}`} style={{ ["--r" as string]: `${[-1.6, 0.9, -0.6, 1.4][i % 4]}deg` }}>
                <span className="mw-label">
                  <span className="w-only">{f.label}</span>
                  <span className="c-only">{f.short}</span>
                </span>
                <span className="mw-val">
                  <span className="w-only">{f.value}</span>
                  <span className="c-only">{f.valueShort ?? f.value}</span>
                </span>
                <span className="mw-gone">removed</span>
              </li>
            ))}
          </ol>
          <footer className="mw-foot">
            <span className="mw-bar" aria-hidden="true">
              {FIELDS.map((f, i) => (
                <i key={f.label} className={i < removed ? "is-on" : ""} />
              ))}
            </span>
            <span className="mw-count">
              <b>
                {removed} of {FIELDS.length} removed
              </b>
              <span className="mw-count-sep"> · </span>
              <span className="mw-count-net">0 network requests</span>
            </span>
          </footer>
          <span className="mw-stamp" aria-hidden="true">
            <span className="mw-stamp-inner">
              Ready to share
              <Check strokeWidth={3.2} />
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

/** A small street map: lake, park, a few roads. Generic, not any real place's layout. */
function MiniMap() {
  return (
    <svg className="mw-mapsvg" viewBox="0 0 80 60" preserveAspectRatio="xMidYMid slice">
      <rect width="80" height="60" fill="#ebe5d6" />
      <path d="M-2 40C10 36 18 44 28 42S44 50 46 62L-2 62Z" fill="#b7cbd2" />
      <rect x="52" y="6" width="22" height="16" rx="2" fill="#d3dfbd" />
      <g fill="none" strokeLinecap="round">
        <g stroke="#d8cfbb" strokeWidth="4.6">
          <path d="M-2 18L82 24" />
          <path d="M38 -2L34 62" />
          <path d="M60 30L82 52" />
        </g>
        <g stroke="#fffdf7" strokeWidth="3">
          <path d="M-2 18L82 24" />
          <path d="M38 -2L34 62" />
          <path d="M60 30L82 52" />
        </g>
        <g stroke="#fffdf7" strokeWidth="1.2">
          <path d="M14 -2L12 30" />
          <path d="M-2 31L36 30" />
          <path d="M50 -2L48 60" />
          <path d="M36 44L82 40" />
          <path d="M62 -2L60 30" />
        </g>
      </g>
    </svg>
  )
}
