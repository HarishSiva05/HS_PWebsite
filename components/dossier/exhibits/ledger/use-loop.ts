"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react"

const useIsoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect

const RM = "(prefers-reduced-motion: reduce)"

function subscribeRM(cb: () => void) {
  const mq = window.matchMedia(RM)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

/** Live value of prefers-reduced-motion (false on the server). */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeRM,
    () => window.matchMedia(RM).matches,
    () => false,
  )
}

/**
 * Level of detail for a stage width. The same exhibit appears in the case drawer (~720 px),
 * in hover previews and phone drawers (~300–400 px) and as evidence-board thumbnails
 * (~130–200 px): each level frames and labels the drawing for the size it is read at.
 */
export type Lod = "full" | "compact" | "thumb"
export const lodOf = (w: number): Lod => (w > 0 && w < 250 ? "thumb" : w > 0 && w < 520 ? "compact" : "full")

export type Frame = {
  /** Seconds since the exhibit first started playing (never wraps; exhibits take their own modulo). */
  t: number
  /** Width of the exhibit's stage in CSS pixels (0 before the first measure). */
  w: number
  /** True when this frame is the fixed still frame (mode="still" or reduced motion). */
  still: boolean
  /** Mouse position over the exhibit, eased, from -1 to 1 on each axis; 0 when away, on touch, or still. */
  px: number
  py: number
}

/**
 * Drives an exhibit. `render` must draw the complete frame for the given time.
 * - live + active + tab visible: a rAF loop advances time.
 * - live but inactive or hidden: the loop stops and the last frame holds.
 * - still (or reduced motion): one representative frame at `stillAt`, redrawn only on resize.
 */
export function useLoop(
  render: (f: Frame) => void,
  { live, active, stillAt, stage }: { live: boolean; active: boolean; stillAt: number; stage: React.RefObject<HTMLElement | null> },
) {
  const time = useRef(0)
  const width = useRef(0)
  const draw = useRef(render)
  draw.current = render
  const seeking = useRef(false)
  // pointer: target (tx, ty) set by events, eased (x, y) advanced by the clock
  const ptr = useRef({ tx: 0, ty: 0, x: 0, y: 0, rect: null as DOMRect | null })

  const paint = useCallback(() => {
    const p = ptr.current
    draw.current({ t: live ? time.current : stillAt, w: width.current, still: !live, px: live ? p.x : 0, py: live ? p.y : 0 })
  }, [live, stillAt])

  // first frame before paint, so nothing flashes in an unfinished state
  useIsoLayout(() => {
    if (stage.current) width.current = stage.current.getBoundingClientRect().width
    paint()
  }, [paint, stage])

  // keep the frame in step with the stage size (framing and labels follow the level of detail)
  useEffect(() => {
    const el = stage.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width
      ptr.current.rect = null
      if (Math.abs(w - width.current) < 0.5) return
      width.current = w
      paint()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [paint, stage])

  // the drawing leans a little toward a mouse; touch never moves it, so scrolling stays the page's
  useEffect(() => {
    const el = stage.current?.parentElement
    if (!live || !el) return
    const p = ptr.current
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return
      const r = p.rect ?? (p.rect = el.getBoundingClientRect())
      p.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1))
      p.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))
    }
    const enter = () => (p.rect = null)
    const leave = () => {
      p.tx = 0
      p.ty = 0
    }
    el.addEventListener("pointerenter", enter)
    el.addEventListener("pointermove", move, { passive: true })
    el.addEventListener("pointerleave", leave)
    window.addEventListener("scroll", enter, { passive: true })
    return () => {
      el.removeEventListener("pointerenter", enter)
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerleave", leave)
      window.removeEventListener("scroll", enter)
      p.tx = p.ty = p.x = p.y = 0
    }
  }, [live, stage])

  // the clock
  useEffect(() => {
    if (!live || !active) return
    let raf = 0
    let last = 0
    const frame = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      if (!seeking.current) {
        time.current += dt
        const p = ptr.current
        const k = 1 - Math.exp(-dt * 5)
        p.x += (p.tx - p.x) * k
        p.y += (p.ty - p.y) * k
        paint()
      }
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (raf) return
      last = 0
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener("visibilitychange", onVis)
    if (!document.hidden) start()
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [live, active, paint])

  // test hook: window.dispatchEvent(new CustomEvent("xl:seek", { detail: { t: 3.2 } })) freezes every
  // ledger exhibit at that time; { t: null } lets them run again. Inert unless dispatched.
  useEffect(() => {
    const onSeek = (e: Event) => {
      const t = (e as CustomEvent<{ t: number | null }>).detail?.t
      if (typeof t === "number") {
        seeking.current = true
        time.current = t
        draw.current({ t: live ? t : stillAt, w: width.current, still: !live, px: 0, py: 0 })
      } else seeking.current = false
    }
    window.addEventListener("xl:seek", onSeek)
    return () => window.removeEventListener("xl:seek", onSeek)
  }, [live, stillAt])
}

/** Stable callback refs keyed by name, collected into one map the render function reads. */
export function useNodes() {
  const nodes = useRef<Record<string, Element>>({})
  const cbs = useRef(new Map<string, (el: Element | null) => void>())
  const ref = useCallback((k: string) => {
    let f = cbs.current.get(k)
    if (!f) {
      f = (el: Element | null) => {
        if (el) nodes.current[k] = el
        else delete nodes.current[k]
      }
      cbs.current.set(k, f)
    }
    return f
  }, [])
  return [nodes, ref] as const
}
