"use client"

import { useEffect, useState } from "react"
import { dossier } from "./store"
import { play } from "@/lib/sound"
import * as gtag from "@/lib/gtag"
import type { CaseFile } from "@/lib/dossier"

/**
 * The sticky pile runs only where it has room and the visitor accepts motion. Everywhere else
 * (phones, short windows, reduced motion) the same sheets render as an ordinary column of folders.
 * Keep in sync with the pile media query in styles/cases.css.
 */
export const PILE_QUERY =
  "(min-width: 1000px) and (min-height: 680px) and (min-aspect-ratio: 1/1) and (prefers-reduced-motion: no-preference)"
export const FINE_POINTER = "(hover: hover) and (pointer: fine)"
export const REDUCED = "(prefers-reduced-motion: reduce)"

export const pad2 = (n: number | string) => String(n).padStart(2, "0")
export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)

export function openCase(c: CaseFile) {
  dossier.openCase(c.id)
  gtag.event({ action: "project_view", category: "engagement", label: c.title })
  play("paper")
}

export function trackLink(c: CaseFile, label: string) {
  gtag.event({ action: "external_link_click", category: "engagement", label: `${c.title}: ${label}` })
}

/** matchMedia as state. False on the server and on the first client render, so hydration matches. */
export function useMedia(query: string) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const m = window.matchMedia(query)
    const sync = () => setOn(m.matches)
    sync()
    m.addEventListener("change", sync)
    return () => m.removeEventListener("change", sync)
  }, [query])
  return on
}

export const useReducedMotion = () => useMedia(REDUCED)
