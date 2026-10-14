"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { dossier, useDossier } from "./store"
import { PAGE_COUNT, sectionById } from "@/lib/dossier"

const EASE = [0.2, 0.7, 0.2, 1] as const

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

// ============ REDACTION ============
// Text is always in the DOM; the black bar is decoration that retracts once
// the line scrolls into view (or is hovered). Each reveal ticks the nav meter.

export function Redact({
  children,
  delay = 0,
  mark = false,
  block = false,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  mark?: boolean
  block?: boolean
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const introDone = useDossier((s) => s.introDone)
  const handle = useRef<ReturnType<typeof dossier.registerRedaction> | null>(null)

  useEffect(() => {
    handle.current = dossier.registerRedaction()
    return () => handle.current?.unregister()
  }, [])

  useEffect(() => {
    if (open) handle.current?.open()
  }, [open])

  useEffect(() => {
    if (open || !introDone || !ref.current) return
    if (prefersReducedMotion()) {
      setOpen(true)
      return
    }
    let timer: ReturnType<typeof setTimeout>
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          timer = setTimeout(() => setOpen(true), delay)
          obs.disconnect()
        }
      },
      { rootMargin: "0px 0px -18% 0px", threshold: 0.9 },
    )
    obs.observe(ref.current)
    return () => {
      obs.disconnect()
      clearTimeout(timer)
    }
  }, [introDone, open, delay])

  return (
    <span
      ref={ref}
      className={`${block ? "rd-b" : "rd"} ${mark ? "rd-mark" : ""} ${open ? "is-open" : ""} ${className}`}
      onPointerEnter={() => setOpen(true)}
    >
      {children}
    </span>
  )
}

// ============ STAMP ============

export function Stamp({
  children,
  tone = "red",
  rotate = -8,
  delay = 0,
  play,
  className = "",
  style,
}: {
  children: React.ReactNode
  tone?: "red" | "ink" | "lime"
  rotate?: number
  delay?: number
  play?: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const from = { opacity: 0, scale: 1.7, rotate: rotate - 9 }
  const to = { opacity: 1, scale: 1, rotate }
  const transition = { delay, type: "spring" as const, stiffness: 520, damping: 26, mass: 0.9 }
  const controlled = play !== undefined

  return (
    <motion.span
      className={`stamp stamp-${tone} ${className}`}
      style={style}
      initial={from}
      {...(controlled
        ? { animate: play ? to : from }
        : { whileInView: to, viewport: { once: true, amount: 0.6 } })}
      transition={transition}
      aria-hidden="true"
    >
      <span className="stamp-inner">{children}</span>
    </motion.span>
  )
}

// ============ PEN NOTE ============

const ARROWS = {
  left: "M70 30 C 52 10, 30 12, 6 26 M6 26 L 18 14 M6 26 L 20 34",
  right: "M4 30 C 22 10, 44 12, 68 26 M68 26 L 56 14 M68 26 L 54 34",
  down: "M30 4 C 10 22, 12 44, 26 66 M26 66 L 14 54 M26 66 L 34 52",
  up: "M26 66 C 10 46, 12 24, 30 6 M30 6 L 16 16 M30 6 L 36 20",
}

export function PenNote({
  children,
  arrow,
  rotate = -4,
  className = "",
  style,
  arrowFirst = false,
}: {
  children: React.ReactNode
  arrow?: keyof typeof ARROWS
  rotate?: number
  className?: string
  style?: React.CSSProperties
  arrowFirst?: boolean
}) {
  const vertical = arrow === "down" || arrow === "up"
  const svg = arrow && (
    <svg
      className="pen-arrow"
      viewBox={vertical ? "0 0 40 70" : "0 0 74 40"}
      width={vertical ? 30 : 58}
      height={vertical ? 52 : 32}
      aria-hidden="true"
    >
      <motion.path
        d={ARROWS[arrow]}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.9, delay: 0.35, ease: "easeInOut" }}
      />
    </svg>
  )
  return (
    <motion.span
      className={`pen ${vertical ? "pen-v" : ""} ${className}`}
      style={{ ...style, rotate }}
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.6, ease: EASE }}
      aria-hidden="true"
    >
      {arrowFirst && svg}
      <span className="pen-text">{children}</span>
      {!arrowFirst && svg}
    </motion.span>
  )
}

// ============ SCRAMBLE ============

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/<>"

export function Scramble({
  text,
  duration = 900,
  className = "",
  digitsOnly = false,
}: {
  text: string
  duration?: number
  className?: string
  digitsOnly?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [out, setOut] = useState(text)
  const started = useRef(false)

  useEffect(() => {
    if (prefersReducedMotion() || !ref.current) return
    const pool = digitsOnly ? "0123456789" : GLYPHS
    const rnd = () => pool[Math.floor(Math.random() * pool.length)]
    setOut(text.replace(/[^\s.@·—-]/g, rnd))
    let raf = 0
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || started.current) return
        started.current = true
        obs.disconnect()
        const t0 = performance.now()
        let last = 0
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration)
          if (t - last > 40 || p === 1) {
            last = t
            const settled = Math.floor(p * text.length)
            setOut(
              text
                .split("")
                .map((ch, i) => (i < settled || /[\s.@·—-]/.test(ch) ? ch : rnd()))
                .join(""),
            )
          }
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.6 },
    )
    obs.observe(ref.current)
    return () => {
      obs.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [text, duration, digitsOnly])

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </span>
  )
}

// ============ REVEAL ============

export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = "",
  as = "div",
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  className?: string
  as?: "div" | "li" | "article"
}) {
  const M = motion[as]
  return (
    <M
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </M>
  )
}

// ============ SECTION HEAD ============

export function SectionHead({
  id,
  title,
  kicker,
  tone = "paper",
}: {
  id: string
  title: React.ReactNode
  kicker?: React.ReactNode
  tone?: "paper" | "ops"
}) {
  const s = sectionById(id)
  return (
    <header className={`sec-head sec-head-${tone}`}>
      <div className="sec-rule">
        <span className="mono">§ {s.no}</span>
        <span className="mono sec-label">{s.heading ?? s.label}</span>
        {s.dossier && <span className="mono sec-dossier hide-sm">/ {s.dossier}</span>}
        <span className="sec-rule-line" />
        <span className="mono hide-sm">
          Page {String(s.page).padStart(2, "0")} / {String(PAGE_COUNT).padStart(2, "0")}
        </span>
      </div>
      <h2 className="sec-title">{title}</h2>
      {kicker && <p className="sec-kicker">{kicker}</p>}
    </header>
  )
}
