"use client"

import { useEffect } from "react"
import Lenis from "lenis"
import * as gtag from "@/lib/gtag"

let lenis: Lenis | null = null

const NAV_OFFSET = -72

/** Scroll to a section id, through Lenis when it's running. */
export function jump(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  // measure against the real scroll position: Lenis ignores native scrolls (focus, clicks)
  // that land mid-animation, so its own idea of "here" can be stale
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY + (id === "cover" ? 0 : NAV_OFFSET))
  if (lenis) {
    lenis.scrollTo(window.scrollY, { immediate: true, force: true })
    lenis.scrollTo(top, { duration: 1.4, force: true })
  } else window.scrollTo({ top })
  gtag.event({ action: "navigation_click", category: "engagement", label: id })
}

export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop()
    else lenis.start()
  }
  document.documentElement.style.overflow = locked ? "hidden" : ""
}

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    lenis = new Lenis({ autoRaf: true, lerp: 0.11, wheelMultiplier: 0.95 })
    return () => {
      lenis?.destroy()
      lenis = null
    }
  }, [])
  return null
}
