"use client"

import "@/styles/exhibit-security.css"
import { useCallback, useId, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { History, KeyRound, PenLine, SendHorizontal, ShieldCheck, TriangleAlert } from "lucide-react"
import type { ExhibitProps } from "./types"
import { span, useCue, useLoop, useReducedMotion } from "./security/use-loop"
import {
  DURATION,
  EVENTS,
  HISTORY,
  MARKERS,
  MARKS,
  QUESTION,
  REPLY,
  REPLY_STREAM,
  REPO,
  RISK,
  S,
  SCORE_FROM,
  SCORE_STEP,
  SCORE_TO,
  STEPS,
  STILL_AT,
  T,
  THRESHOLD,
  score,
  type RepoEvent,
} from "./security/repo-watch-data"

// chart space: x 0..100 across the score window, y 0..40 top to bottom
const VB_W = 100
const VB_H = 40
const cx = (t: number) => ((t - SCORE_FROM) / (SCORE_TO - SCORE_FROM)) * VB_W
const cy = (v: number) => (1 - v) * VB_H
const Y_THRESHOLD = cy(THRESHOLD)

function linePath(end: number) {
  let d = ""
  for (let k = SCORE_FROM; k < end; k += SCORE_STEP) d += `${d ? "L" : "M"}${cx(k).toFixed(2)} ${cy(score(k)).toFixed(2)}`
  return `${d}L${cx(end).toFixed(2)} ${cy(score(end)).toFixed(2)}`
}

// where each anomaly sits on the line, once its jump has landed
const MARK_POINTS = MARKERS.map((m) => {
  const t = m.at + 520
  return { ...m, x: cx(t), y: (cy(score(t)) / VB_H) * 100 }
})
const markerFor = (id: string) => ({ e7: 0, e8: 1, e9: 2 })[id as "e7" | "e8" | "e9"]

const LABEL =
  "Simulated repository-monitoring console. A sign-in from a new network (198.51.100.23), a force-push that rewrites history on main and a token scope escalation push the anomaly score into the alert band. The assistant flags possible code tampering on main and recommends revoking the token used, restoring main from the last trusted commit and requiring signed commits."

const WORDS = REPLY.split(" ")

const SPRING = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.9,
  // fade in a beat after the move starts, so a message never flashes over the one sliding up above it
  opacity: { duration: 0.32, delay: 0.09, ease: "easeOut" as const },
}

export default function Exhibit({ mode = "live", active = false }: ExhibitProps) {
  const reduced = useReducedMotion()
  const still = mode === "still" || reduced
  const running = !still && active

  const line = useRef<SVGPathElement>(null)
  const lineHot = useRef<SVGPathElement>(null)
  const area = useRef<SVGPathElement>(null)
  const head = useRef<HTMLDivElement>(null)
  const value = useRef<HTMLSpanElement>(null)
  const scoreBox = useRef<HTMLDivElement>(null)
  const typed = useRef<HTMLSpanElement>(null)
  const composer = useRef<HTMLDivElement>(null)
  const reply = useRef<HTMLSpanElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  // last chart state written, so the long hold after the climb costs nothing per frame
  const drawn = useRef<{ end: number; el: SVGPathElement | null }>({ end: NaN, el: null })

  // continuous visuals, written straight to the DOM every frame
  const onFrame = useCallback((t: number) => {
    const end = Math.min(t, SCORE_TO)
    if (end !== drawn.current.end || line.current !== drawn.current.el) {
      drawn.current = { end, el: line.current }
      const v = score(end)
      const d = linePath(end)
      line.current?.setAttribute("d", d)
      lineHot.current?.setAttribute("d", d)
      area.current?.setAttribute("d", `${d}L${cx(end).toFixed(2)} ${VB_H}L0 ${VB_H}Z`)
      if (head.current) head.current.style.transform = `translate(${cx(end)}%, ${(cy(v) / VB_H) * 100}%)`
      if (value.current) value.current.textContent = v.toFixed(2)
      if (scoreBox.current) scoreBox.current.dataset.hot = v >= THRESHOLD ? "1" : "0"
    }

    const n = t >= T.compose && t < T.send ? Math.round(span(t, T.compose, 1050) * QUESTION.length) : 0
    if (typed.current && typed.current.textContent !== QUESTION.slice(0, n)) typed.current.textContent = QUESTION.slice(0, n)
    if (composer.current) composer.current.dataset.typing = n > 0 ? "1" : "0"

    // the reply streams in word by word, the way the assistant generates it
    if (reply.current) {
      const k = Math.ceil(span(t, T.reply, REPLY_STREAM) * WORDS.length)
      const text = WORDS.slice(0, Math.max(1, k)).join(" ")
      if (reply.current.textContent !== text) reply.current.textContent = text
    }
  }, [])

  const { step, lap } = useLoop({ duration: DURATION, marks: MARKS, running, still, stillAt: STILL_AT, onFrame })
  const at = (mark: number) => step >= S[mark]

  const rows = EVENTS.filter((e) => e.at <= 0 || at(e.at))
  const incident = at(T.force)
  const typing1 = at(T.typing1) && !at(T.alert)
  const typing2 = at(T.typing2) && !at(T.reply)
  const stepsShown = [T.step1, T.step2, T.step3].filter(at).length
  useCue("chime", at(T.alert), running)

  const anim = !still
  const enter = anim ? { opacity: 0, y: 14, scale: 0.985 } : false
  const shown = { opacity: 1, y: 0, scale: 1 }

  return (
    <div
      className={`rw ${still ? "is-still" : "is-live"} ${running || still ? "" : "is-paused"} ${incident ? "is-incident" : ""}`}
      role="img"
      aria-label={LABEL}
    >
      <div className="rw-stage" key={lap} data-fading={at(T.fade) ? "1" : "0"}>
        <header className="rw-bar">
          <span className="rw-brand">
            <i className="rw-live" aria-hidden="true" />
            Repo watch
          </span>
          <span className="rw-repo">{REPO}</span>
          <span className="rw-sim">
            <span className="w-only">Simulated data</span>
            <span className="c-only">Sim</span>
          </span>
          <span className="rw-status">
            <i aria-hidden="true" />
            {incident ? "Incident open" : "All clear"}
          </span>
        </header>

        <div className="rw-body">
          {/* ---------- left: event stream + anomaly score ---------- */}
          <section className="rw-left">
            <div className="rw-pane-head">
              <span>Event stream</span>
              <span className="rw-pane-meta w-only">webhook · {rows.length + 1279} today</span>
            </div>

            <ol className="rw-log">
              {rows.map((e) => (
                <LogRow
                  key={e.id}
                  e={e}
                  anim={anim}
                  rewritten={incident && !!e.hash}
                  onHover={(on) => {
                    const m = markerFor(e.id)
                    if (m !== undefined) setHover(on ? m : null)
                  }}
                />
              ))}
            </ol>

            <div className="rw-score" ref={scoreBox} data-hot="0">
              <div className="rw-score-head">
                <span className="rw-score-label">Anomaly score</span>
                <span className="rw-score-band">
                  <i aria-hidden="true" />
                  Alert ≥ {THRESHOLD.toFixed(2)}
                </span>
                <span className="rw-score-value" ref={value} />
              </div>
              <div className="rw-chart">
                <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <clipPath id={`rw-cold-${uid}`}>
                      <rect x="0" y={Y_THRESHOLD} width={VB_W} height={VB_H - Y_THRESHOLD} />
                    </clipPath>
                    <clipPath id={`rw-hot-${uid}`}>
                      <rect x="0" y="0" width={VB_W} height={Y_THRESHOLD} />
                    </clipPath>
                    <linearGradient id={`rw-fill-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={VB_H}>
                      <stop offset="0" stopColor="#f0533a" stopOpacity="0.38" />
                      <stop offset={Y_THRESHOLD / VB_H} stopColor="#f0533a" stopOpacity="0.22" />
                      <stop offset={Y_THRESHOLD / VB_H + 0.001} stopColor="#ede9df" stopOpacity="0.13" />
                      <stop offset="1" stopColor="#ede9df" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <rect className="rw-band" x="0" y="0" width={VB_W} height={Y_THRESHOLD} />
                  <line className="rw-grid" x1="0" x2={VB_W} y1={cy(0.5)} y2={cy(0.5)} />
                  <line className="rw-threshold" x1="0" x2={VB_W} y1={Y_THRESHOLD} y2={Y_THRESHOLD} />
                  <path ref={area} className="rw-area" fill={`url(#rw-fill-${uid})`} />
                  <path ref={line} className="rw-line" clipPath={`url(#rw-cold-${uid})`} />
                  <path ref={lineHot} className="rw-line rw-line-hot" clipPath={`url(#rw-hot-${uid})`} />
                </svg>
                <span className="rw-chart-t" style={{ top: `${(Y_THRESHOLD / VB_H) * 100}%` }} aria-hidden="true">
                  {THRESHOLD.toFixed(2)}
                </span>
                {MARK_POINTS.map((m, i) => (
                  <div
                    key={i}
                    className={`rw-mark rw-mark-${m.level} ${at(m.at) ? "is-on" : ""} ${hover === i ? "is-hover" : ""}`}
                    style={{ transform: `translate(${m.x}%, ${m.y}%)` }}
                    aria-hidden="true"
                  >
                    <i />
                  </div>
                ))}
                <div className="rw-head" ref={head} aria-hidden="true">
                  <i />
                </div>
              </div>
            </div>
          </section>

          {/* ---------- right: the assistant ---------- */}
          <section className="rw-chat">
            <div className="rw-chat-head">
              <span className="rw-avatar" aria-hidden="true">
                <ShieldCheck strokeWidth={2.2} />
              </span>
              <span className="rw-who">
                <strong>Security assistant</strong>
                <span>
                  online<span className="w-only"> · watching 1 repo</span>
                </span>
              </span>
            </div>

            <div className="rw-msgs">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key="h1"
                  layout={anim ? "position" : false}
                  className="rw-msg rw-msg-user rw-m0"
                  transition={SPRING}
                >
                  {HISTORY.q}
                </motion.div>
                <motion.div key="h2" layout={anim ? "position" : false} className="rw-msg rw-m0" transition={SPRING}>
                  {HISTORY.a}
                </motion.div>

                {typing1 && <Typing key="t1" anim={anim} />}

                {at(T.alert) && (
                  <motion.div
                    key="alert"
                    layout={anim ? "position" : false}
                    className="rw-alert"
                    initial={enter}
                    animate={shown}
                    transition={SPRING}
                  >
                    <div className="rw-alert-title">
                      <TriangleAlert aria-hidden="true" strokeWidth={2.2} />
                      Possible code tampering on main
                    </div>
                    <p className="rw-alert-body">
                      A force-push rewrote 6 commits on main<span className="w-only">,</span>
                      <span className="c-only">.</span>
                      <span className="w-only"> 22 s after bob signed in from a network never seen on this repo.</span>
                    </p>
                    <div className="rw-alert-facts">
                      <span>198.51.100.23</span>
                      <span className="w-only">AS64511</span>
                      <span className="rw-risk">Risk {RISK}</span>
                    </div>
                  </motion.div>
                )}

                {stepsShown > 0 && (
                  <motion.div
                    key="steps"
                    layout={anim ? "position" : false}
                    className="rw-steps"
                    initial={enter}
                    animate={shown}
                    transition={SPRING}
                  >
                    <div className="rw-steps-head">Recommended next steps</div>
                    <ol>
                      {STEPS.map((s, i) => {
                        const Icon = [KeyRound, History, PenLine][i]
                        return (
                          <li key={s.title} className={i < stepsShown ? "is-on" : ""}>
                            <span className="rw-step-n">{i + 1}</span>
                            <span className="rw-step-txt">
                              {s.title}
                              <span className="rw-step-sub">
                                <Icon aria-hidden="true" strokeWidth={2} />
                                {s.sub}
                              </span>
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                  </motion.div>
                )}

                {at(T.send) && (
                  <motion.div
                    key="q"
                    layout={anim ? "position" : false}
                    className="rw-msg rw-msg-user rw-x"
                    initial={enter}
                    animate={shown}
                    transition={SPRING}
                  >
                    {QUESTION}
                  </motion.div>
                )}

                {typing2 && <Typing key="t2" anim={anim} />}

                {at(T.reply) && (
                  <motion.div
                    key="a"
                    layout={anim ? "position" : false}
                    className="rw-msg rw-x"
                    initial={enter}
                    animate={shown}
                    transition={SPRING}
                  >
                    {/* the bubble takes its final size at once; the words stream in on top */}
                    <span className="rw-stream">
                      <span className="rw-stream-ghost" aria-hidden="true">
                        {REPLY}
                      </span>
                      <span ref={reply} />
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="rw-composer" ref={composer} data-typing="0">
              <span className="rw-input">
                <span className="rw-placeholder">Ask about an event…</span>
                <span className="rw-typed" ref={typed} />
                <i className="rw-caret" aria-hidden="true" />
              </span>
              <span className="rw-send" aria-hidden="true">
                <SendHorizontal strokeWidth={2.2} />
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function LogRow({
  e,
  anim,
  rewritten,
  onHover,
}: {
  e: RepoEvent
  anim: boolean
  rewritten: boolean
  onHover: (on: boolean) => void
}) {
  // rows already on screen when a pass starts just slide up; rows that arrive get the entrance
  const arrives = anim && e.at > 0
  return (
    <motion.li
      layout={anim ? "position" : false}
      className={`rw-row rw-${e.level} ${arrives ? "is-new" : ""} ${rewritten ? "is-rewritten" : ""}`}
      initial={arrives ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <span className="rw-time">{e.time}</span>
      <span className="rw-kind">{e.kind}</span>
      <span className="rw-actor">{e.actor}</span>
      <span className="rw-detail">
        {e.hash ? (
          <>
            {e.detail.split(e.hash)[0]}
            {/* the force-push knocks this commit off main: the one the assistant says to restore */}
            <span className="rw-hash">{e.hash}</span>
            {e.detail.split(e.hash)[1]}
          </>
        ) : (
          e.detail
        )}
      </span>
      <span className="rw-short">{e.short}</span>
      {e.note && (
        <span className="rw-note">
          <span className="w-only">{e.note}</span>
          <span className="c-only">{e.noteShort}</span>
        </span>
      )}
    </motion.li>
  )
}

function Typing({ anim }: { anim: boolean }) {
  return (
    <motion.div
      layout={anim ? "position" : false}
      className="rw-msg rw-typing"
      initial={anim ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={SPRING}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
    </motion.div>
  )
}
