"use client"

import { useEffect, useRef } from "react"

/** Targeting reticle for fine pointers. Labels come from the nearest [data-cursor]. */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    document.documentElement.classList.add("has-reticle")

    const target = { x: -100, y: -100 }
    const pos = { x: -100, y: -100 }
    let raf = 0
    let current = ""

    const onMove = (e: PointerEvent) => {
      if (target.x === -100) {
        pos.x = e.clientX
        pos.y = e.clientY
        ring.current?.classList.add("is-live")
        dot.current?.classList.add("is-live")
      }
      target.x = e.clientX
      target.y = e.clientY
      if (dot.current) dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-cursor], a, button")
      const next = el ? el.dataset.cursor ?? "" : ""
      const interactive = !!el
      ring.current?.classList.toggle("is-hot", interactive)
      if (next !== current && label.current) {
        current = next
        label.current.textContent = next
        ring.current?.classList.toggle("has-label", !!next)
      }
    }
    const onLeave = () => ring.current?.classList.add("is-hidden")
    const onEnter = () => ring.current?.classList.remove("is-hidden")
    const onDown = () => ring.current?.classList.add("is-down")
    const onUp = () => ring.current?.classList.remove("is-down")

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.2
      pos.y += (target.y - pos.y) * 0.2
      if (ring.current) ring.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener("pointermove", onMove, { passive: true })
    document.addEventListener("pointerleave", onLeave)
    document.addEventListener("pointerenter", onEnter)
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)
    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove("has-reticle")
      window.removeEventListener("pointermove", onMove)
      document.removeEventListener("pointerleave", onLeave)
      document.removeEventListener("pointerenter", onEnter)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
    }
  }, [])

  return (
    <>
      <div ref={ring} className="reticle" aria-hidden="true">
        <span className="reticle-ring" />
        <span ref={label} className="reticle-label mono" />
      </div>
      <div ref={dot} className="reticle-dot" aria-hidden="true" />
    </>
  )
}
