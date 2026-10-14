"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import ExhibitFrame from "./exhibits/frame"
import { FINE_POINTER, REDUCED, clamp, openCase, useMedia } from "./cases-shared"
import { play } from "@/lib/sound"
import type { CaseFile } from "@/lib/dossier"

type Trail = {
  tx: number
  ty: number
  x: number
  y: number
  px: number
  tilt: number
  w: number
  h: number
  on: boolean
  offAt: number
  raf: number
}

/**
 * The rest of the files, as ledger rows. With a mouse, hovering a row floats a small live
 * exhibit next to the cursor; it trails behind with a little lag and leans into the movement.
 * Touch and pen get the plain rows.
 */
export function CasesLedger({ cases }: { cases: CaseFile[] }) {
  const fine = useMedia(FINE_POINTER)
  const [pid, setPid] = useState<string | null>(null)
  const [shown, setShown] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const reduced = useRef(false)
  const s = useRef<Trail>({ tx: 0, ty: 0, x: 0, y: 0, px: 0, tilt: 0, w: 380, h: 300, on: false, offAt: 0, raf: 0 })

  // float above and to the right of the cursor; flip when that would leave the window
  const place = () => {
    const t = s.current
    const el = box.current
    if (!el) return
    let x = t.x + 34
    if (x + t.w > window.innerWidth - 12) x = t.x - t.w - 34
    let y = t.y - t.h - 18
    if (y < 72) y = Math.min(t.y + 30, window.innerHeight - t.h - 12)
    el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(t.tilt - 1.6).toFixed(2)}deg)`
  }

  const frame = () => {
    const t = s.current
    const still = reduced.current
    const k = still ? 1 : 0.13
    t.x += (t.tx - t.x) * k
    t.y += (t.ty - t.y) * k
    const vx = t.x - t.px
    t.px = t.x
    t.tilt += ((still ? 0 : clamp(vx * 0.45, -11, 11)) - t.tilt) * 0.14
    place()
    const settled = Math.abs(t.tx - t.x) < 0.2 && Math.abs(t.ty - t.y) < 0.2 && Math.abs(t.tilt) < 0.03
    const fading = !t.on && performance.now() - t.offAt < 420
    t.raf = (t.on && !settled) || fading ? requestAnimationFrame(frame) : 0
  }

  const kick = () => {
    if (!s.current.raf) s.current.raf = requestAnimationFrame(frame)
  }

  useEffect(() => {
    const m = window.matchMedia(REDUCED)
    const sync = () => (reduced.current = m.matches)
    sync()
    m.addEventListener("change", sync)
    const trail = s.current
    return () => {
      m.removeEventListener("change", sync)
      cancelAnimationFrame(trail.raf)
      trail.raf = 0
    }
  }, [])

  // the box's size is set by CSS; read it whenever a new exhibit drops in
  useEffect(() => {
    const el = box.current
    if (!el || !pid) return
    s.current.w = el.offsetWidth
    s.current.h = el.offsetHeight
    place()
  }, [pid, fine])

  const show = (c: CaseFile, e: ReactPointerEvent) => {
    if (!fine || e.pointerType !== "mouse") return
    const t = s.current
    t.tx = e.clientX
    t.ty = e.clientY
    if (!t.on) {
      // appear at the cursor, not fly in from wherever it was last hidden
      t.x = t.px = t.tx
      t.y = t.ty
      t.tilt = 0
      place()
    }
    t.on = true
    if (pid !== c.id) play("tick", { volume: 0.3 })
    setPid(c.id)
    setShown(true)
    kick()
  }

  const move = (e: ReactPointerEvent) => {
    const t = s.current
    if (!t.on) return
    t.tx = e.clientX
    t.ty = e.clientY
    kick()
  }

  const hide = () => {
    const t = s.current
    if (!t.on) return
    t.on = false
    t.offAt = performance.now()
    setShown(false)
    kick()
  }

  const first = cases[0]?.no
  const last = cases[cases.length - 1]?.no

  return (
    <div className="also">
      <div className="also-head">
        <h3 className="also-title">Also on file</h3>
        <span className="mono">
          Files {first}–{last}
          <span className="also-hint"> · open any one for the full brief</span>
        </span>
      </div>
      <div className="ledger also-ledger">
        <div className="ledger-head mono" aria-hidden="true">
          <span>No.</span>
          <span>Subject</span>
          <span className="hide-md">Methods</span>
          <span>Year</span>
          <span>Status</span>
        </div>
        <ul onPointerMove={move} onPointerLeave={hide}>
          {cases.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="ledger-row"
                onClick={() => {
                  hide()
                  openCase(c)
                }}
                onPointerEnter={(e) => show(c, e)}
                data-cursor="Open file"
              >
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
            </li>
          ))}
        </ul>
      </div>

      {fine && (
        <div ref={box} className={`lp ${shown ? "is-on" : ""}`} aria-hidden="true">
          <div className="lp-in">
            {pid && (
              <div className="lp-card" key={pid}>
                <ExhibitFrame caseId={pid} compact overlay eager paused={!shown} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
