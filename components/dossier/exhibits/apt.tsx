"use client"

// Exhibit for case 01, APT Malware Classification: "the attribution engine".
// A replay of the real Random Forest results. A scan beam classifies the 308 held-out samples
// row by row; each one flies along its actual group's row to the group the model predicted.
// The diagonal fills in lime, the 15 misattributions flash red, 95.1% is declassified from under
// redaction tape, and the four tuned classifiers take their places on the leaderboard.
// Props: ExhibitProps. `at` (seconds) freezes the replay on one frame; it exists for tests only.

import "@/styles/exhibit-apt.css"
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import type { ExhibitProps } from "./types"
import { AptEngine, computeLayout, type Layout } from "./apt-engine"
import {
  ACCURACY_TEXT,
  APT_DATASET,
  APT_MODELS,
  AXIS,
  CORRECT,
  LIT,
  MAGNET,
  MATRIX_SUMMARY,
  MISSED,
  MODEL_ABBR,
  N,
  OPCODES,
  TOTAL,
  axisFrac,
} from "./apt-model"

const TICKS = [0, 5, 10, 15, 20, 25, 30, 34]
const STREAM_LINES = 16

const reducedNow = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

const opLine = (i: number) => {
  const [a, b] = OPCODES[i % OPCODES.length]
  return `${a.padEnd(10, " ")} ${b}`
}

export default function AptExhibit({ mode = "live", active = false, at }: ExhibitProps & { at?: number }) {
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const engine = useRef<AptEngine | null>(null)
  const [L, setL] = useState<Layout | null>(null)
  const [reduced, setReduced] = useState(false)
  const sumId = useId()

  // engine lives as long as the component
  useLayoutEffect(() => {
    if (!root.current || !canvas.current) return
    const e = new AptEngine(root.current, canvas.current)
    engine.current = e
    return () => {
      e.destroy()
      engine.current = null
    }
  }, [])

  // measure the box the frame gives us
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const update = (W: number, H: number) => {
      if (W < 40 || H < 30) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      setL((prev) =>
        prev && Math.abs(prev.W - W) < 0.5 && Math.abs(prev.H - H) < 0.5 && prev.dpr === dpr
          ? prev
          : computeLayout(W, H, dpr),
      )
    }
    const r = el.getBoundingClientRect()
    update(r.width, r.height)
    const ro = new ResizeObserver(([entry]) => update(entry.contentRect.width, entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])

  useLayoutEffect(() => {
    const e = engine.current
    if (!e || !L) return
    e.bind()
    e.setLayout(L)
  }, [L])

  const still = mode === "still" || reduced
  useEffect(() => {
    engine.current?.set({ active, still: still || reducedNow(), freeze: at })
  }, [active, still, at, L])

  const cellAt = (e: React.PointerEvent<HTMLCanvasElement>, snap = 0) => {
    if (!L) return null
    const x = (e.nativeEvent.offsetX - L.M / L.dpr) / L.pc
    const y = (e.nativeEvent.offsetY - L.M / L.dpr) / L.pc
    // fingers are wider than cells: a tap snaps to the nearest non-empty cell within `snap` cells
    if (snap > 0) {
      let best: { r: number; c: number } | null = null
      let bestD = snap * snap
      for (const cell of LIT) {
        const d = (cell.c + 0.5 - x) ** 2 + (cell.r + 0.5 - y) ** 2
        if (d < bestD) {
          bestD = d
          best = { r: cell.r, c: cell.c }
        }
      }
      if (best) return best
    }
    const c = Math.floor(x)
    const r = Math.floor(y)
    return r >= 0 && r < N && c >= 0 && c < N ? { r, c } : null
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "touch" || !L?.interactive) return
    engine.current?.setHover(cellAt(e))
  }
  const onLeave = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    // a touch "leaves" as soon as the finger lifts; keep a tapped cell until the next tap
    if (e?.pointerType === "touch") return
    engine.current?.setHover(null)
  }
  // tap to inspect on touch screens; never prevents scrolling (no preventDefault, no touch-action)
  const tap = useRef<{ x: number; y: number } | null>(null)
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    tap.current = e.pointerType === "touch" ? { x: e.clientX, y: e.clientY } : null
  }
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const start = tap.current
    tap.current = null
    if (!start || !L?.interactive || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return
    const cell = cellAt(e, 2.6)
    const cur = engine.current?.hovered
    engine.current?.setHover(cell && cur && cur.r === cell.r && cur.c === cell.c ? null : cell)
  }
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const eng = engine.current
    if (!eng) return
    let { r, c } = eng.hovered ?? { r: 0, c: 0 }
    switch (e.key) {
      case "ArrowUp":
        r--
        break
      case "ArrowDown":
        r++
        break
      case "ArrowLeft":
        c--
        break
      case "ArrowRight":
        c++
        break
      case "Home":
        c = 0
        break
      case "End":
        c = N - 1
        break
      case "PageUp":
        r -= 5
        break
      case "PageDown":
        r += 5
        break
      default:
        return
    }
    // a focused widget owns its arrow keys (the case drawer listens for them on window)
    e.preventDefault()
    e.stopPropagation()
    eng.setHover({ r: Math.max(0, Math.min(N - 1, r)), c: Math.max(0, Math.min(N - 1, c)) }, true)
  }

  const vars = L
    ? ({
        "--pc": `${L.pc}px`,
        "--gl": `${L.gl}px`,
        "--gb": `${L.gb}px`,
        "--grid": `${L.grid}px`,
        "--m": `${L.M / L.dpr}px`,
        "--mx-x": `${L.mx.x}px`,
        "--mx-y": `${L.mx.y}px`,
        "--mx-w": `${L.mx.w}px`,
        "--mx-h": `${L.mx.h}px`,
        "--px": `${L.panel.x}px`,
        "--py": `${L.panel.y}px`,
        "--pw": `${L.panel.w}px`,
        "--ph": `${L.panel.h}px`,
        "--H": `${L.H}px`,
        "--W": `${L.W}px`,
        "--fs-tick": `${L.fs.tick}px`,
        "--fs-label": `${L.fs.label}px`,
        "--fs-stream": `${L.fs.stream}px`,
        "--fs-board": `${L.fs.board}px`,
        "--fs-big": `${L.fs.big}px`,
        "--head": L.streamHead,
      } as CSSProperties)
    : undefined

  const short = !L || !L.status

  // the analyst's note sits in the empty upper triangle and points at the column with the most misses
  const note = L?.note && MAGNET.col > 8 ? notePlacement(L) : null

  return (
    <div
      ref={root}
      className="apt"
      data-size={L?.size ?? "l"}
      data-orient={L?.orient ?? "row"}
      data-board={L?.board ?? "wide"}
      data-cap={L?.boardCap === false ? "0" : "1"}
      data-status={L?.status ? "1" : "0"}
      data-legend={L?.legend2 ? "2" : "1"}
      data-done="1"
      data-phase="hold"
      style={vars}
    >
      <p id={sumId} className="apt-sr">
        {MATRIX_SUMMARY}
      </p>
      <div className="apt-spill" data-a="spill" aria-hidden="true" />

      <div
        className="apt-mx"
        tabIndex={L?.interactive ? 0 : undefined}
        role={L?.interactive ? "group" : undefined}
        aria-label={L?.interactive ? "Confusion matrix. Use the arrow keys to read each cell." : undefined}
        aria-describedby={sumId}
        onKeyDown={L?.interactive ? onKey : undefined}
        onFocus={(e) => {
          // only a keyboard focus parks the cursor on the first cell; a click or tap shows its own cell
          if (!L?.interactive || engine.current?.hovered || !e.currentTarget.matches(":focus-visible")) return
          engine.current?.setHover({ r: 0, c: 0 }, true)
        }}
        onBlur={() => engine.current?.setHover(null)}
      >
        <canvas
          ref={canvas}
          className="apt-canvas"
          aria-hidden="true"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onPointerDown={onDown}
          onPointerUp={onUp}
        />
        {L?.ticks && (
          <>
            <div className="apt-ty" aria-hidden="true">
              {TICKS.map((i) => (
                <span key={i} style={{ "--i": i } as CSSProperties}>
                  {String(i).padStart(2, "0")}
                </span>
              ))}
              <span className="apt-hl" data-a="hly" />
            </div>
            <div className="apt-tx" aria-hidden="true">
              {TICKS.map((i) => (
                <span key={i} style={{ "--i": i } as CSSProperties}>
                  {String(i).padStart(2, "0")}
                </span>
              ))}
              <span className="apt-hl" data-a="hlx" />
            </div>
          </>
        )}
        {L?.titles && (
          <>
            <span className="apt-axt apt-axt-y" aria-hidden="true">
              Actual group
            </span>
            <span className="apt-axt apt-axt-x" aria-hidden="true">
              Predicted group →
            </span>
          </>
        )}
        {note && (
          <div className="apt-note" data-a="note" aria-hidden="true">
            <span
              className="apt-note-text"
              style={{ left: note.tx, top: note.ty, fontSize: note.fs } as CSSProperties}
            >
              {MAGNET.count} of {MISSED} misses pinned on group {MAGNET.col}
            </span>
            <svg className="apt-note-svg" width="100%" height="100%">
              <path data-a="notepath" d={note.d} pathLength={100} />
            </svg>
          </div>
        )}
        {L?.titles && (
          <span className="apt-head-tag" data-a="beamtag" aria-hidden="true">
            00
          </span>
        )}
        <div className="apt-tip" data-a="tip" aria-hidden="true">
          <i className="apt-tip-key" />
          <b data-a="tipv" />
          <span data-a="tipl" />
        </div>
        <span className="apt-sr" aria-live="polite" data-a="live" />
      </div>

      <div className="apt-panel">
        <div className="apt-status" aria-hidden="true">
          <i className="apt-led" />
          <span data-a="status">Complete</span>
          <span className="apt-status-model">Random Forest</span>
        </div>

        <div className="apt-readout">
          <span className="apt-kicker" data-a="kicker" aria-hidden="true">
            {short ? "Accuracy" : `Accuracy · ${TOTAL} held-out samples`}
          </span>
          <div className="apt-big" aria-hidden="true">
            <i className="apt-flare" data-a="flare" />
            <span className="apt-count">
              <span data-a="big">{TOTAL}</span>
              <span className="apt-sfx">/{TOTAL}</span>
            </span>
            {/* the result is declassified digit by digit: tape over each character lifts away */}
            <span className="apt-acc">
              {ACCURACY_TEXT.split("").map((ch, i) => (
                <span key={i} className="apt-ch" data-a="ch">
                  {ch}
                </span>
              ))}
            </span>
          </div>
          <p className="apt-sr">
            Accuracy {ACCURACY_TEXT}: {CORRECT} of {TOTAL} held-out samples attributed to the right APT group,{" "}
            {MISSED} misattributed.
          </p>
          <div className="apt-legend" aria-hidden="true">
            <span className="apt-lg">
              <i className="apt-sw apt-sw-ok" />
              <b data-a="nok">{CORRECT}</b>
              correct
            </span>
            <span className="apt-lg">
              <i className="apt-sw apt-sw-miss" />
              <b data-a="nmiss">{MISSED}</b>
              misattributed
            </span>
          </div>
        </div>

        {L?.stream && (
          <div className="apt-stream" aria-hidden="true">
            <span className="apt-cap">
              Opcode pairs <em>·</em> {APT_DATASET.opcodePairs.toLocaleString("en-US")} distinct
            </span>
            <div className="apt-win">
              <div className="apt-scol" data-a="scol">
                {Array.from({ length: STREAM_LINES }, (_, i) => (
                  <div key={i} className="apt-op" data-a="op">
                    {opLine(i)}
                  </div>
                ))}
              </div>
              <div className="apt-headclip">
                <div className="apt-scol" data-a="scol">
                  {Array.from({ length: STREAM_LINES }, (_, i) => (
                    <div key={i} className="apt-op" data-a="op">
                      {opLine(i)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="apt-board">
          <div className="apt-board-cap" aria-hidden="true">
            <span>
              {L?.fullNames === false
                ? `${APT_MODELS.length} tuned models`
                : `${APT_MODELS.length} tuned classifiers`}
            </span>
            <span>Accuracy %</span>
          </div>
          <ol className="apt-rows">
            {APT_MODELS.map((m, i) => (
              <li key={m.name} className={`apt-brow ${i === 0 ? "is-best" : ""}`} data-a="row">
                <span className="apt-name" aria-hidden="true">
                  {L?.fullNames === false ? MODEL_ABBR[m.name] ?? m.name : m.name}
                </span>
                <span className="apt-track" aria-hidden="true">
                  <span className="apt-pos" data-a="pos">
                    <i className="apt-trail" data-a="trail" />
                    <i className="apt-dot" />
                  </span>
                </span>
                <span className="apt-val" data-a="val" aria-hidden="true">
                  {(m.accuracy * 100).toFixed(1)}
                </span>
                {i === 0 ? (
                  <span className="apt-best" data-a="best" aria-hidden="true">
                    Best
                  </span>
                ) : (
                  <span className="apt-tagph" aria-hidden="true" />
                )}
                <span className="apt-sr">
                  {m.name}: {(m.accuracy * 100).toFixed(1)}% accuracy{i === 0 ? ", the best of the four" : ""}
                  {`; weighted precision ${(m.precision * 100).toFixed(1)}%, recall ${(m.recall * 100).toFixed(1)}%, F1 ${m.f1.toFixed(3)}`}
                </span>
                {/* hover a model: its other scores replace the caption line */}
                <span className="apt-detail" aria-hidden="true">
                  <b>{L?.fullNames === false ? MODEL_ABBR[m.name] ?? m.name : m.name}</b>
                  <span>
                    P {(m.precision * 100).toFixed(1)} · R {(m.recall * 100).toFixed(1)} · F1 {m.f1.toFixed(3)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <div className="apt-brow apt-axisrow" aria-hidden="true">
            <span className="apt-name" />
            <span className="apt-axis">
              {AXIS.ticks
                .filter((v, i, all) => L?.ticksAll || i === 0 || i === all.length - 1 || v === (AXIS.lo + AXIS.hi) / 2)
                .map((v) => (
                  <span key={v} style={{ "--f": axisFrac(v) } as CSSProperties}>
                    {v}
                    {v === AXIS.hi && <em>%</em>}
                  </span>
                ))}
            </span>
            <span className="apt-val" />
            <span className="apt-tagph" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Where the red-pen note goes: left of the magnet column, a few rows down, arrow up to its top miss. */
function notePlacement(L: Layout) {
  const pc = L.pc
  const col = MAGNET.col
  const gx = (c: number) => L.gl + c * pc
  const tx = gx(col - 1.1)
  const ty = 6.4 * pc
  const fs = Math.max(15, Math.min(24, pc * 1.32))
  // from the end of the text, curve up to just below-left of the topmost big miss in that column;
  // one continuous stroke (shaft, then both barbs) so the pen draws it in a single motion
  const sx = gx(col - 0.55)
  const sy = ty - pc * 0.3
  const ex = gx(col + 0.02)
  const ey = 4.7 * pc
  const f = (n: number) => n.toFixed(1)
  const d =
    `M ${f(sx)} ${f(sy)} ` +
    `C ${f(sx + pc * 0.55)} ${f(sy - pc * 0.12)}, ${f(ex - pc * 0.25)} ${f(ey + pc * 0.85)}, ${f(ex)} ${f(ey)} ` +
    `L ${f(ex - pc * 0.6)} ${f(ey + pc * 0.34)} ` +
    `L ${f(ex)} ${f(ey)} ` +
    `L ${f(ex + pc * 0.1)} ${f(ey + pc * 0.68)}`
  return { tx: `${tx}px`, ty: `${ty}px`, fs: `${fs}px`, d }
}
