"use client"

import { useEffect } from "react"
import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import * as gtag from "@/lib/gtag"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

let lenis: Lenis | null = null

/** The running Lenis instance, or null (reduced motion, or before mount). */
export const getLenis = () => lenis

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

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

/** Lenis drives the scroll; GSAP's ticker drives Lenis, so ScrollTrigger and Lenis share one clock. */
export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    lenis = new Lenis({ autoRaf: false, lerp: 0.11, wheelMultiplier: 0.95 })
    lenis.on("scroll", ScrollTrigger.update)
    const tick = (time: number) => lenis?.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis?.destroy()
      lenis = null
    }
  }, [])
  return null
}
