"use client"

import { useEffect } from "react"
import "@/styles/finale.css"

// Click or tap on bare paper and you leave a fingerprint: an inked whorl that fades in about
// 1.6 s. Purely decorative: pointer-events none, aria-hidden, off with reduced motion, and never
// on anything you can use (links, buttons, fields), the evidence board, exhibits, dialogs or
// dark sections. Add data-no-prints to any other surface that shouldn't take prints.

const SKIP = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "label",
  "summary",
  "video",
  "canvas",
  "iframe",
  "img",
  "[role=button]",
  "[role=link]",
  "[role=tab]",
  "[role=slider]",
  "[role=switch]",
  "[role=checkbox]",
  "[role=menuitem]",
  "[role=dialog]",
  "[aria-modal=true]",
  "[contenteditable]:not([contenteditable=false])",
  "[draggable=true]",
  "[data-cursor]",
  "[data-no-prints]",
  ".nav",
  ".toc",
  ".intro",
  ".drawer-layer",
  ".ops",
  "[class*=board]",
  "[class*=exhibit]",
].join(",")

const MAX_PRINTS = 6
const LIFE_MS = 1600
const SVG_NS = "http://www.w3.org/2000/svg"

// ============ SURFACE ============

/** Relative luminance (0–1) of a CSS color string, or null when it is transparent or unknown. */
function colorLuminance(css: string): number | null {
  const m = css.match(/^(rgba?|color|oklab|oklch)\((.*)\)$/)
  if (!m) return null
  const [fn, body] = [m[1], m[2]]
  const parts = body.replace(/^srgb\s+/, "").split(/[\s,/]+/).filter(Boolean)
  const num = (s: string | undefined, scale = 1) => {
    if (s === undefined) return 1
    return s.endsWith("%") ? parseFloat(s) / 100 : parseFloat(s) / scale
  }
  const alpha = num(parts[3])
  if (!(alpha > 0.5)) return null
  if (fn === "oklab" || fn === "oklch") {
    const l = num(parts[0])
    return l * l * l // OKLab lightness is perceptual; cube it to approximate luminance
  }
  const scale = fn === "color" ? 1 : 255
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = [0, 1, 2].map((i) => lin(Math.min(1, Math.max(0, num(parts[i], scale)))))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Luminance of the first opaque background at or above `el` (the page paper when none). */
export function surfaceLuminance(el: Element | null): number {
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    const l = colorLuminance(getComputedStyle(n).backgroundColor)
    if (l !== null) return l
  }
  return colorLuminance(getComputedStyle(document.body).backgroundColor) ?? 0.8
}

// ============ THE PRINT ============
// A whorl: concentric ridges that step outward around a hooked core, clipped to a fingertip,
// broken by ridge endings, inked heavier in the middle where the pressure is.

function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

function whorl(seed: number): string[] {
  const r = rng(seed * 9973 + 17)
  const cx = 30 + (r() - 0.5) * 3
  const cy = 33 + (r() - 0.5) * 3
  const [ax, ay, ox, oy, floor] = [25, 33, 30, 38, 68] // fingertip ellipse and its flat crease
  const sp = 3.05 // ridge spacing
  const per = 120 // samples per turn
  const w1 = r() * 6.28
  const w2 = r() * 6.28
  const ph = r() * 6.28
  const bands = ["", "", ""]
  const f1 = (v: number) => v.toFixed(1)
  let pen = false
  let band = -1
  let px = 0
  let py = 0
  for (let i = 0; i <= 12 * per; i++) {
    const th = (i / per) * Math.PI * 2
    const turn = i / per
    const k = Math.floor(turn)
    const f = turn - k
    const s = f < 0.8 ? 0 : (f - 0.8) / 0.2
    const rad = 0.8 + sp * (k + s * s * (3 - 2 * s)) + (k === 0 ? sp * f : 0)
    const wob = 1 + 0.05 * Math.sin(3 * th + w1) + 0.03 * Math.sin(5 * th + w2)
    const x = cx + Math.cos(th + ph) * rad * 0.82 * wob
    let y = cy + Math.sin(th + ph) * rad * 1.02 * wob
    if (y > cy) y += (y - cy) * (Math.max(0, rad - 13) / 22) * 0.35 // outer ridges sag into the crease
    const e = ((x - ox) / ax) ** 2 + ((y - oy) / ay) ** 2
    if (e > 1 || y >= floor || r() < 0.018) {
      pen = false
      px = x
      py = y
      continue
    }
    const b = e < 0.34 ? 0 : e < 0.7 ? 1 : 2
    if (!pen) bands[b] += `M${f1(x)} ${f1(y)}`
    else if (b !== band) bands[b] += `M${f1(px)} ${f1(py)}L${f1(x)} ${f1(y)}`
    else bands[b] += `L${f1(x)} ${f1(y)}`
    pen = true
    band = b
    px = x
    py = y
  }
  return bands
}

let variants: string[] | null = null
function printMarkup() {
  if (!variants) {
    variants = [3, 4, 5, 6, 8].map((seed) => {
      const [core, mid, edge] = whorl(seed)
      return `<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${core}"/><path d="${mid}" opacity=".72"/><path d="${edge}" opacity=".38"/></g>`
    })
  }
  return variants[Math.floor(Math.random() * variants.length)]
}

// ============ COMPONENT ============

export default function Fingerprints() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (typeof Element.prototype.animate !== "function") return

    const layer = document.createElement("div")
    layer.className = "fp-layer"
    layer.setAttribute("aria-hidden", "true")
    document.body.appendChild(layer)

    const live: { el: SVGSVGElement; anims: Animation[] }[] = []
    let down: { x: number; y: number; t: number } | null = null

    const drop = (p: { el: SVGSVGElement; anims: Animation[] }) => {
      p.anims.forEach((a) => a.cancel())
      p.el.remove()
    }

    const leave = (x: number, y: number) => {
      while (live.length >= MAX_PRINTS) {
        const old = live.shift()
        if (!old) break
        // the oldest gives way quickly instead of vanishing
        const quick = old.el.animate([{ opacity: getComputedStyle(old.el).opacity }, { opacity: 0 }], {
          duration: 160,
          fill: "forwards",
        })
        old.anims.push(quick)
        quick.onfinish = () => drop(old)
      }

      const red = Math.random() < 0.38
      const el = document.createElementNS(SVG_NS, "svg")
      el.setAttribute("viewBox", "0 0 60 76")
      el.setAttribute("class", `fp ${red ? "fp-red" : "fp-ink"}`)
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.style.setProperty("--fp-grain", `${Math.round(Math.random() * 260)}px ${Math.round(Math.random() * 260)}px`)
      el.innerHTML = printMarkup()
      layer.appendChild(el)

      const base = `translate(-50%, -50%) rotate(${Math.round(Math.random() * 76 - 38)}deg) scaleX(${Math.random() < 0.5 ? -1 : 1})`
      const peak = red ? 0.8 : 0.68
      const anim = el.animate(
        [
          { opacity: 0, transform: `${base} scale(1.16)`, filter: "blur(1.4px)", easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
          { opacity: peak, transform: `${base} scale(1)`, filter: "blur(0px)", offset: 0.08, easing: "linear" },
          { opacity: peak * 0.9, transform: `${base} scale(1)`, filter: "blur(0px)", offset: 0.3, easing: "cubic-bezier(0.4, 0, 0.7, 1)" },
          { opacity: 0, transform: `${base} scale(1)`, filter: "blur(0.7px)" },
        ],
        { duration: LIFE_MS, fill: "forwards" },
      )
      const print = { el, anims: [anim] }
      live.push(print)
      anim.onfinish = () => {
        const i = live.indexOf(print)
        if (i >= 0) live.splice(i, 1)
        drop(print)
      }
    }

    const onDown = (e: PointerEvent) => {
      down = e.isPrimary ? { x: e.clientX, y: e.clientY, t: performance.now() } : null
    }

    const onClick = (e: MouseEvent) => {
      // real, single, primary presses only: no keyboard or scripted clicks, no double-click selections
      if (e.button !== 0 || e.detail !== 1 || e.defaultPrevented) return
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.t > 900) return
      const target = e.target instanceof Element ? e.target : null
      if (!target || target.closest(SKIP)) return
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed && sel.toString().trim()) return
      if (surfaceLuminance(target) < 0.45) return

      const docW = document.documentElement.clientWidth
      const docH = document.documentElement.scrollHeight
      leave(Math.min(Math.max(e.pageX, 24), docW - 24), Math.min(e.pageY, docH - 32))
    }

    document.addEventListener("pointerdown", onDown, { capture: true, passive: true })
    document.addEventListener("click", onClick)
    return () => {
      document.removeEventListener("pointerdown", onDown, { capture: true })
      document.removeEventListener("click", onClick)
      live.splice(0).forEach(drop)
      layer.remove()
    }
  }, [])

  return null
}
