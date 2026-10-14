"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { play, type SoundName } from "@/lib/sound"

/** Live `prefers-reduced-motion: reduce`. Exhibits render their still frame when it is on. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  )
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return reduced
}

/** How many marks have passed at time t. Marks are sorted, in ms. */
export const stepAt = (marks: readonly number[], t: number) => {
  let s = 0
  while (s < marks.length && marks[s] <= t) s++
  return s
}

type LoopOptions = {
  /** Length of one pass, in ms. */
  duration: number
  /** Sorted times (ms) where the discrete state changes. `step` counts the marks already passed. */
  marks: readonly number[]
  /** True while the loop should advance (live, on screen, motion allowed). */
  running: boolean
  /** Render the frozen frame at `stillAt` instead of looping. */
  still: boolean
  /** The moment the still frame shows. */
  stillAt: number
  /** Called every animation frame (and once for the still frame) for continuous visuals, written straight to the DOM. */
  onFrame?: (t: number) => void
  /** After this long off screen, the next run starts again from the top. */
  rewindAfter?: number
}

/**
 * One clock per exhibit. It only advances while `running`, so pausing is free: no timers, no rAF.
 * Discrete changes (a log row arrives, a field is struck) come back as `step`; continuous ones
 * (a beam position, a sparkline head) go through `onFrame` without re-rendering React.
 * `lap` increments on every wrap so the caller can remount the animated subtree cleanly.
 */
export function useLoop({ duration, marks, running, still, stillAt, onFrame, rewindAfter = 6000 }: LoopOptions) {
  const [state, setState] = useState(() => ({ step: still ? stepAt(marks, stillAt) : 0, lap: 0 }))
  const t = useRef(0)
  const step = useRef(state.step)
  const lap = useRef(0)
  const frame = useRef(onFrame)

  useLayoutEffect(() => {
    frame.current = onFrame
  })

  // still frame: freeze at `stillAt`, and paint the continuous bits once before the browser paints
  useLayoutEffect(() => {
    if (!still) return
    const s = stepAt(marks, stillAt)
    step.current = s
    setState((x) => (x.step === s ? x : { step: s, lap: x.lap }))
    frame.current?.(stillAt)
  }, [still, stillAt, marks])

  // leaving still mode (e.g. reduced motion switched off): resume from wherever the clock stands
  useLayoutEffect(() => {
    if (still) return
    if (step.current !== stepAt(marks, t.current)) {
      step.current = stepAt(marks, t.current)
      setState({ step: step.current, lap: lap.current })
    }
    frame.current?.(t.current)
  }, [still, marks])

  // a new lap remounts the animated subtree: repaint its continuous bits before the browser paints it
  useLayoutEffect(() => {
    frame.current?.(still ? stillAt : t.current)
  }, [state.lap]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (still) return
    if (!running) {
      // off screen for a while: rewind, so the visitor arrives at the start of the story
      const id = setTimeout(() => {
        if (t.current === 0) return
        t.current = 0
        step.current = 0
        lap.current += 1
        setState({ step: 0, lap: lap.current })
      }, rewindAfter)
      return () => clearTimeout(id)
    }

    let raf = 0
    let last = 0
    const tick = (now: number) => {
      // clamp the step so a dropped frame or a returning tab never skips part of the story
      const dt = last ? Math.min(now - last, 50) : 0
      last = now
      let next = t.current + dt
      let wrapped = false
      if (next >= duration) {
        next %= duration
        wrapped = true
        lap.current += 1
      }
      t.current = next
      const s = stepAt(marks, next)
      if (wrapped || s !== step.current) {
        step.current = s
        setState({ step: s, lap: lap.current })
      }
      frame.current?.(next)
      raf = requestAnimationFrame(tick)
    }
    const start = () => {
      if (raf) return
      last = 0
      raf = requestAnimationFrame(tick)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onVisibility = () => (document.hidden ? stop() : start())
    if (!document.hidden) start()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [running, still, duration, marks, rewindAfter])

  return { step: state.step, lap: state.lap }
}

/** Ease-out cubic on 0..1. */
export const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3)

/** 0..1 progress of t through [from, from + span]. */
export const span = (t: number, from: number, length: number) => Math.min(1, Math.max(0, (t - from) / length))

/**
 * Play a sound cue when `when` turns true, at most once per activation, so a looping exhibit never
 * nags. `play` itself stays silent unless the visitor has switched sound on.
 */
export function useCue(name: SoundName, when: boolean, running: boolean) {
  const done = useRef(false)
  useEffect(() => {
    if (!running) done.current = false
  }, [running])
  useEffect(() => {
    if (running && when && !done.current) {
      done.current = true
      play(name)
    }
  }, [name, when, running])
}
