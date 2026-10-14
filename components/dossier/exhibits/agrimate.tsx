"use client"

import { useId, useRef } from "react"
import "@/styles/exhibit-ledger.css"
import type { ExhibitProps } from "./types"
import { lodOf, useLoop, useNodes, useReducedMotion, type Frame } from "./ledger/use-loop"
import { clamp, cleanId, ease, hash, lerp, seg, spring, writer } from "./ledger/kit"

// Agrimate, the native Android app that won the Yugam 2020 48-hour hackathon, walked through
// screen by screen. The screens follow the layouts in the repo (res/layout): the splash, "I am ?:"
// with Investor and Farmer, Corporate or Individual, Sign up / Login, the Sign Up form with
// name and phone number, and Enter OTP. Colours come from its drawables and colors.xml (the
// 2020 Android Studio Material defaults: #3700B3 status bar, #03DAC5 accent). Typed values are
// examples.

const LOOP = 15
const STILL = 2.0
// centre of the phone, in stage units, when small stages drop the walkthrough map (CSS: left 13%)
const PHONE_X_SMALL = 800 * (0.13 + 0.2725 / 2)

const C = {
  bg: "#0f0f0d",
  paper: "#ede9df",
  paper2: "#cfc9ba",
  mute: "#918b7c",
  dim: "#625d52",
  line: "#34322b",
  lime: "#c8ff3d",
  // the app
  screen: "#f1f1ef",
  olive: "#84942a",
  leafGrey: "#5b5b54",
  btn: "#a3ab5c",
  btnEdge: "#707070",
  field: "#f9f9f9",
  statusBar: "#3700b3",
  accent: "#03dac5",
  text: "#000000",
  btnText: "#1f1f1f",
}

// ---------- screens, in the repo's order; local coords: 202 × 394 dp-scaled units ----------
type Btn = { id: string; x: number; y: number; w: number; h: number; label: string; fs: number; dark?: boolean }
type Field = { id: string; x: number; y: number; w: number; h: number; hint: string; fs: number; text?: boolean }
type Screen = { id: string; title?: { text: string; x: number; y: number; fs: number }; btns: Btn[]; fields: Field[] }

const SCREENS: Screen[] = [
  { id: "splash", btns: [], fields: [] },
  {
    id: "role", // activity_inv_farm.xml
    title: { text: "I am ?:", x: 105, y: 160, fs: 28 },
    btns: [
      { id: "investor", x: 28.7, y: 184.6, w: 156, h: 34.2, label: "INVESTOR", fs: 16.8 },
      { id: "farmer", x: 26.3, y: 234.4, w: 158.8, h: 33.1, label: "FARMER", fs: 16.8 },
    ],
    fields: [],
  },
  {
    id: "farmerSL", // s_l_farm.xml
    btns: [
      { id: "signup", x: 11.5, y: 151.5, w: 179, h: 33.1, label: "SIGN UP", fs: 16.8, dark: true },
      { id: "login", x: 12.4, y: 210.3, w: 177.3, h: 32.5, label: "LOGIN", fs: 16.8, dark: true },
    ],
    fields: [],
  },
  {
    id: "signup", // activity_login_farm.xml
    title: { text: "Sign Up", x: 101, y: 99, fs: 28 },
    btns: [{ id: "send", x: 20, y: 236.5, w: 162, h: 31.4, label: "SEND OTP", fs: 21 }],
    fields: [
      { id: "name", x: 28.6, y: 122.8, w: 144.7, h: 32, hint: "Name", fs: 10.5 },
      { id: "phone", x: 26.6, y: 178.9, w: 148.7, h: 34.2, hint: "Phone number", fs: 10.5 },
    ],
  },
  {
    id: "otp", // activity_otp.xml
    btns: [{ id: "login", x: 53, y: 279, w: 96, h: 32, label: "LOGIN", fs: 21 }],
    fields: [{ id: "code", x: 25, y: 137.8, w: 147, h: 30.3, hint: "Enter OTP", fs: 17, text: true }],
  },
  {
    id: "invType", // activity_choose.xml
    title: { text: "I am ?:", x: 101, y: 164, fs: 28 },
    btns: [
      { id: "corporate", x: 13.3, y: 190, w: 175, h: 33.7, label: "CORPORATE", fs: 16.8, dark: true },
      { id: "individual", x: 13.3, y: 238, w: 175, h: 33.7, label: "INDIVIDUAL", fs: 16.8, dark: true },
    ],
    fields: [],
  },
  {
    id: "invSL", // s_l_inv.xml: here Login sits above Sign up
    btns: [
      { id: "login", x: 13.8, y: 141.5, w: 177.3, h: 32.5, label: "LOGIN", fs: 16.8, dark: true },
      { id: "signup", x: 13.2, y: 192, w: 179, h: 33.1, label: "SIGN UP", fs: 16.8, dark: true },
    ],
    fields: [],
  },
]

// walkthrough: which screen shows from when
const SEQ: { s: string; at: number; back?: boolean; fade?: boolean }[] = [
  { s: "splash", at: 0 },
  { s: "role", at: 1.4 },
  { s: "farmerSL", at: 2.6 },
  { s: "signup", at: 3.65 },
  { s: "otp", at: 7.35 },
  { s: "role", at: 9.9, back: true },
  { s: "invType", at: 11.05 },
  { s: "invSL", at: 12.1 },
  { s: "splash", at: 13.65, fade: true },
]
// taps: screen.button
const TAPS: { at: number; target: string }[] = [
  { at: 2.3, target: "role.farmer" },
  { at: 3.35, target: "farmerSL.signup" },
  { at: 4.25, target: "signup.name" },
  { at: 5.5, target: "signup.phone" },
  { at: 7.05, target: "signup.send" },
  { at: 7.95, target: "otp.code" },
  { at: 9.6, target: "otp.login" },
  { at: 10.75, target: "role.investor" },
  { at: 11.8, target: "invType.individual" },
  { at: 12.85, target: "invSL.login" },
]
const TYPING: { field: string; from: number; to: number; text: string }[] = [
  { field: "signup.name", from: 4.7, to: 5.3, text: "Ravi K." },
  { field: "signup.phone", from: 5.72, to: 6.4, text: "98765 •••••" },
  { field: "otp.code", from: 8.4, to: 8.95, text: "4 8 2 1 0 6" },
]
const KEYBOARD: { from: number; to: number; pad: "qwerty" | "num"; swap?: number }[] = [
  { from: 4.3, to: 6.55, pad: "qwerty", swap: 5.55 },
  { from: 8.0, to: 9.1, pad: "qwerty" },
]

// flow map rows: a label, and under it what the screen asks for
const FLOW = [
  { id: "01", label: "Splash", sub: "AgriMate", x: 52, y: 100 },
  { id: "02", label: "I am ?:", sub: "Investor · Farmer", x: 52, y: 136 },
  { id: "03", label: "Sign up / Login", sub: "", x: 74, y: 192 },
  { id: "04", label: "Sign Up", sub: "name · phone", x: 74, y: 218 },
  { id: "05", label: "Enter OTP", sub: "then Login", x: 74, y: 254 },
  { id: "06", label: "I am ?:", sub: "Corporate · Individual", x: 74, y: 314 },
  { id: "07", label: "Sign up / Login", sub: "", x: 74, y: 350 },
]
const LINK_X = 226 // where the pointer from the active row to the phone starts
const STEPS: [number, number][] = [
  [0, 0],
  [1.4, 1],
  [2.6, 2],
  [3.65, 3],
  [7.35, 4],
  [9.9, 1],
  [11.05, 5],
  [12.1, 6],
  [13.65, 0],
]

const btnIndex: Record<string, Btn | Field> = {}
for (const sc of SCREENS) {
  for (const b of sc.btns) btnIndex[`${sc.id}.${b.id}`] = b
  for (const f of sc.fields) btnIndex[`${sc.id}.${f.id}`] = f
}
const centerOf = (key: string): [number, number] => {
  const b = btnIndex[key]
  return [9 + b.x + b.w * 0.56, 23 + b.y + b.h * 0.55]
}

// keyboard geometry (local to the keyboard, 202 × 150)
const KB_H = 150
const QWERTY = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
function qwertyKeys() {
  const keys: { x: number; y: number; w: number; label: string; fn?: boolean }[] = []
  const kw = 17.2
  const gap = 2.9
  const top = 24
  const rh = 27
  QWERTY.forEach((row, r) => {
    const n = row.length
    const total = n * kw + (n - 1) * gap
    const x0 = r === 2 ? (202 - total) / 2 : (202 - total) / 2
    for (let i = 0; i < n; i++) keys.push({ x: x0 + i * (kw + gap), y: top + r * rh, w: kw, label: row[i] })
  })
  keys.push({ x: 3, y: top + 2 * rh, w: 22, label: "⇧", fn: true }, { x: 177, y: top + 2 * rh, w: 22, label: "⌫", fn: true })
  keys.push({ x: 3, y: top + 3 * rh, w: 28, label: "?123", fn: true }, { x: 34, y: top + 3 * rh, w: 17, label: "," , fn: true })
  keys.push({ x: 54, y: top + 3 * rh, w: 94, label: "" }, { x: 151, y: top + 3 * rh, w: 17, label: ".", fn: true }, { x: 171, y: top + 3 * rh, w: 28, label: "↵", fn: true })
  return keys
}
function numKeys() {
  const keys: { x: number; y: number; w: number; label: string; fn?: boolean }[] = []
  const rows = [
    ["1", "2", "3", "-"],
    ["4", "5", "6", "␣"],
    ["7", "8", "9", "⌫"],
    [",", "0", ".", "↵"],
  ]
  rows.forEach((row, r) =>
    row.forEach((label, i) => keys.push({ x: 3 + i * 49.6, y: 24 + r * 27, w: i === 3 ? 44.6 : 46.6, label, fn: i === 3 || r === 3 && i !== 1 })),
  )
  return keys
}
const QW = qwertyKeys()
const NUM = numKeys()

// a pointed leaf with a midrib and veins, like the app's background art
function leaf(cx: number, cy: number, len: number, ang: number) {
  const a = (ang * Math.PI) / 180
  const ux = Math.cos(a)
  const uy = Math.sin(a)
  const px = -uy
  const py = ux
  const w = len * 0.32
  const at = (s: number, o: number) => `${(cx + ux * s + px * o).toFixed(1)} ${(cy + uy * s + py * o).toFixed(1)}`
  let d = `M${at(0, 0)}C${at(len * 0.25, w)} ${at(len * 0.75, w)} ${at(len, 0)}C${at(len * 0.75, -w)} ${at(len * 0.25, -w)} ${at(0, 0)}Z`
  d += `M${at(len * 0.04, 0)}L${at(len * 0.86, 0)}`
  for (const s of [0.3, 0.5, 0.68]) d += `M${at(len * s, 0)}L${at(len * (s + 0.13), w * 0.62)}M${at(len * s, 0)}L${at(len * (s + 0.13), -w * 0.62)}`
  return d
}
const pod = (cx: number, cy: number, len: number, ang: number) => {
  const a = (ang * Math.PI) / 180
  const ux = Math.cos(a)
  const uy = Math.sin(a)
  const w = len * 0.36
  const at = (s: number, o: number) => `${(cx + ux * s - uy * o).toFixed(1)} ${(cy + uy * s + ux * o).toFixed(1)}`
  return `M${at(0, 0)}C${at(len * 0.2, w)} ${at(len * 0.8, w)} ${at(len, 0)}C${at(len * 0.8, -w)} ${at(len * 0.2, -w)} ${at(0, 0)}Z`
}
function Leaves({ h }: { h: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={leaf(-6, 6, 44, 38)} stroke={C.olive} strokeWidth="1.5" />
      <path d={leaf(4, -4, 34, -8)} stroke={C.olive} strokeWidth="1.5" />
      <path d={pod(24, 20, 17, 18)} stroke={C.leafGrey} strokeWidth="1.4" />
      <path d={leaf(208, h - 6, 44, 218)} stroke={C.olive} strokeWidth="1.5" />
      <path d={leaf(198, h + 4, 34, 172)} stroke={C.olive} strokeWidth="1.5" />
      <path d={pod(178, h - 20, 17, 198)} stroke={C.leafGrey} strokeWidth="1.4" />
    </g>
  )
}

export default function AgrimateExhibit({ mode = "live", active = false }: ExhibitProps) {
  const rm = useReducedMotion()
  const live = mode === "live" && !rm
  const stage = useRef<HTMLDivElement>(null)
  const [n, ref] = useNodes()
  const w = useRef(writer()).current
  const id = cleanId(useId())
  const widths = useRef(new Map<string, number>())

  const textWidth = (el: Element | undefined, s: string) => {
    if (!el || !s) return 0
    const hit = widths.current.get(s)
    if (hit !== undefined) return hit
    const v = (el as SVGTextElement).getComputedTextLength?.() ?? s.length * 6
    if (document.fonts?.status === "loaded") widths.current.set(s, v)
    return v
  }

  const draw = ({ t: tc, still, w: width, px, py }: Frame) => {
    const N = n.current
    const lod = lodOf(width)
    w.attr(N.root, "data-lod", lod)
    const k = still ? 1 : Math.floor(tc / LOOP)
    const t = still ? STILL : tc - k * LOOP
    const blink = Math.floor(tc * 2.2) % 2 === 0

    // ---- the phone sways under the light and turns a little toward the mouse
    const ry = (still ? -14 : -14 + 4.5 * Math.sin((2 * Math.PI * tc) / 7)) + px * 10
    const rx = (still ? 5 : 5 + 1.6 * Math.sin((2 * Math.PI * tc) / 9)) - py * 6
    const rz = still ? -1.6 : -1.6 + 0.7 * Math.sin((2 * Math.PI * tc) / 11)
    const bob = still ? 0 : Math.sin((2 * Math.PI * tc) / 6) * 0.35
    // first time through, the phone swings up into its pose and the entry card drops onto the
    // desk before the stamp comes down; later loops and the still frame start composed
    const first = !still && k === 0
    const ip = first ? spring(t - 0.05, 0.6, 7.2) : 1
    const cp = first ? ease.outCubic(seg(t, 0.3, 1.0)) : 1
    w.style(N.phone, "opacity", first ? clamp(t / 0.3).toFixed(3) : "1")
    w.style(
      N.phone,
      "transform",
      `translateY(${(bob + (1 - ip) * 9).toFixed(3)}cqh) perspective(240cqw) rotateY(${(ry - (1 - ip) * 38).toFixed(2)}deg) rotateX(${(rx + (1 - ip) * 14).toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${lerp(0.9, 1, ip).toFixed(4)})`,
    )
    w.attr(N.floorShadow, "opacity", clamp(ip).toFixed(3))
    w.style(N.card, "opacity", first ? clamp((t - 0.3) / 0.2).toFixed(3) : "1")
    w.attr(N.glare, "transform", `translate(${((ry + 14) * 9).toFixed(1)} 0)`)
    // on small stages the phone sits left of centre (see the CSS); its light and shadow follow it
    const shift = lod === "full" ? 0 : PHONE_X_SMALL - 400
    w.attr(N.floorShadow, "transform", `translate(${(shift - (ry + 14) * 1.2).toFixed(1)} 0)`)
    w.attr(N.spot, "transform", `translate(${shift} 0)`)

    // ---- screens
    let idx = 0
    for (let i = 0; i < SEQ.length; i++) if (t >= SEQ[i].at) idx = i
    const cur = SEQ[idx]
    const prev = idx > 0 ? SEQ[idx - 1] : null
    const dur = cur.fade ? 0.6 : 0.34
    const p = ease.outCubic(seg(t, cur.at, cur.at + dur))
    for (const sc of SCREENS) {
      let o = 0
      let y = 0
      if (sc.id === cur.s) {
        if (cur.back || cur.fade) o = 1
        else {
          o = idx === 0 ? 1 : p
          y = idx === 0 ? 0 : 16 * (1 - p)
        }
      }
      if (prev && sc.id === prev.s && sc.id !== cur.s && p < 1) {
        if (cur.back) {
          o = 1 - p
          y = 18 * p
        } else if (cur.fade) o = 1 - p
        else o = 1
      }
      w.fade(N[`sc-${sc.id}`], o)
      w.attr(N[`sc-${sc.id}`], "transform", `translate(9 ${(sc.id === "splash" ? 9 : 23) + y})`)
    }
    // the splash is fullscreen; everything else has the status bar
    const onSplash = cur.s === "splash" ? (cur.fade ? p : 1) : prev?.s === "splash" ? 1 - p : 0
    w.fade(N.status, 1 - onSplash)
    // splash art breathes
    w.attr(N.sprout, "transform", `translate(101 176) scale(${(1 + 0.03 * Math.sin(tc * 3)).toFixed(3)}) translate(-101 -176)`)

    // ---- typing
    for (const ty of TYPING) {
      const [sid, fid] = ty.field.split(".")
      const el = N[`tx-${sid}-${fid}`]
      const hintEl = N[`hint-${sid}-${fid}`]
      const nChars = Math.round(seg(t, ty.from, ty.to) * ty.text.length)
      const done = t >= ty.from
      const str = ty.text.slice(0, nChars)
      w.text(el, str)
      w.fade(hintEl, done ? 0 : 1)
      const focusAt = TAPS.find((x) => x.target === ty.field)!.at
      const next = TAPS.find((x) => x.at > focusAt)!.at
      const focused = t >= focusAt && t < next - 0.15
      const f = btnIndex[ty.field] as Field
      const tw = textWidth(el, str)
      const cxF = f.x + f.w / 2
      w.attr(N[`caret-${sid}-${fid}`], "x", (str ? cxF + tw / 2 + 1 : cxF + 0.5).toFixed(1))
      w.fade(N[`caret-${sid}-${fid}`], focused && (t < ty.to + 0.05 && t > ty.from ? 1 : blink ? 1 : 0) ? 1 : 0)
      w.attr(N[`fb-${sid}-${fid}`], "stroke", focused ? C.accent : C.btnEdge)
      w.attr(N[`fb-${sid}-${fid}`], "stroke-width", focused ? 1.3 : 0.8)
    }

    // ---- keyboard
    let kbUp = 0
    let pad: "qwerty" | "num" = "qwerty"
    for (const kb of KEYBOARD) {
      const up = Math.min(ease.outCubic(seg(t, kb.from, kb.from + 0.3)), 1 - ease.inOutCubic(seg(t, kb.to, kb.to + 0.3)))
      if (up > kbUp) {
        kbUp = up
        pad = kb.swap && t >= kb.swap ? "num" : kb.pad
      }
    }
    w.attr(N.kb, "transform", `translate(9 ${(417 - KB_H * kbUp).toFixed(2)})`)
    w.fade(N.kb, kbUp > 0.001 ? 1 : 0)
    w.fade(N.kbQ, pad === "qwerty" ? 1 : 0)
    w.fade(N.kbN, pad === "num" ? 1 : 0)
    // a key darkens under each typed character
    let lit = -1
    for (const ty of TYPING) {
      if (t < ty.from || t > ty.to + 0.08) continue
      const i = Math.floor(seg(t, ty.from, ty.to) * ty.text.length)
      const q = (t - ty.from) / ((ty.to - ty.from) / ty.text.length) - i
      if (q < 0.6) lit = Math.floor(hash(i * 3.7 + ty.from) * (pad === "num" ? 12 : 26))
    }
    for (let i = 0; i < QW.length; i++) w.attr(N[`kq${i}`], "fill", pad === "qwerty" && i === lit ? "#c9ccd1" : QW[i].fn ? "#d8dbe0" : "#ffffff")
    for (let i = 0; i < NUM.length; i++) w.attr(N[`kn${i}`], "fill", pad === "num" && i === lit ? "#c9ccd1" : NUM[i].fn ? "#d8dbe0" : "#ffffff")

    // ---- taps: a fingertip glides between targets and presses
    let tapIdx = -1
    for (let i = 0; i < TAPS.length; i++) if (t >= TAPS[i].at - 0.55) tapIdx = i
    if (tapIdx >= 0) {
      const tp = TAPS[tapIdx]
      const [tx, tyy] = centerOf(tp.target)
      const prevTap = tapIdx > 0 ? TAPS[tapIdx - 1] : null
      const [fx, fy] = prevTap ? centerOf(prevTap.target) : [tx + 30, tyy + 60]
      const g = ease.inOutCubic(seg(t, tp.at - 0.55, tp.at - 0.08))
      const x = lerp(fx, tx, g)
      const y = lerp(fy, tyy, g)
      const age = t - tp.at
      const press = age >= 0 && age < 0.5 ? Math.max(0, 1 - spring(age, 0.4, 20)) : 0
      const vis = Math.min(seg(t, tp.at - 0.55, tp.at - 0.3), 1 - seg(age, 0.3, 0.55))
      w.attr(N.finger, "transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(1 - 0.18 * press).toFixed(3)})`)
      w.fade(N.finger, (age < 0 ? 0.55 : 0.9) * vis)
      // pressed state and ripple on the target
      for (const tap of TAPS) {
        const a2 = t - tap.at
        const on = a2 >= 0 && a2 < 0.55
        const [sid, bid] = tap.target.split(".")
        w.fade(N[`pr-${sid}-${bid}`], on ? 0.14 * (1 - seg(a2, 0.25, 0.55)) : 0)
        w.fade(N[`rp-${sid}-${bid}`], on ? 0.5 * (1 - seg(a2, 0.1, 0.55)) : 0)
        w.attr(N[`rp-${sid}-${bid}`], "r", (4 + 110 * ease.outCubic(seg(a2, 0, 0.5))).toFixed(1))
      }
    } else w.fade(N.finger, 0)

    // ---- walkthrough map
    let step = 0
    for (const [ts, s] of STEPS) if (t >= ts) step = s
    const investor = t >= 9.9 && t < 13.65
    const visited = new Set<number>()
    for (const [ts, s] of STEPS) if (t >= ts && ts < 13.65) visited.add(s)
    for (let i = 0; i < FLOW.length; i++) {
      const on = i === step
      const was = visited.has(i) && !on
      w.attr(N[`fd${i}`], "fill", on ? C.lime : was ? C.mute : "none")
      w.attr(N[`fd${i}`], "stroke", on ? C.lime : was ? C.mute : C.dim)
      w.attr(N[`fl${i}`], "fill", on ? C.lime : was ? C.paper2 : C.mute)
      w.fade(N[`fh${i}`], on ? 1 : 0)
    }
    w.text(N.stepNo, `STEP ${String(step + 1).padStart(2, "0")} / 07`)
    w.attr(N.brFarmer, "fill", !investor && step >= 1 && t >= 2.3 && t < 9.9 ? C.lime : C.dim)
    w.attr(N.brInvestor, "fill", investor && t >= 10.75 ? C.lime : C.dim)
    w.attr(N.railF, "stroke", t >= 2.3 && t < 9.9 ? "#5f7a24" : C.line)
    w.attr(N.railI, "stroke", t >= 10.75 && t < 13.65 ? "#5f7a24" : C.line)
    w.fade(N.shared, t >= 12.85 && t < 13.65 ? 1 : 0.45)
    const node = FLOW[step]
    w.attr(N.link, "y1", node.y - 3.5)
    w.attr(N.link, "y2", node.y - 3.5)
    w.attr(N.link, "x1", LINK_X)
    w.attr(N.link, "stroke-dashoffset", (-tc * 22).toFixed(1))
    w.attr(N.linkDot, "cy", node.y - 3.5)

    // ---- the stamp lands once, then stays
    const slam = still || k > 0 ? 9 : t - 1.6
    const sp = slam < 0 ? 0 : Math.min(1.04, spring(slam, 0.5, 17))
    const sc = slam < 0 ? 1.9 : lerp(1.9, 1, sp)
    w.style(N.stamp, "opacity", slam < 0 ? "0" : clamp(slam / 0.08).toFixed(3))
    w.style(N.stamp, "transform", `rotate(${lerp(-19, -9, clamp(sp)).toFixed(2)}deg) scale(${sc.toFixed(3)})`)
    const thud = slam > 0.06 && slam < 0.5 ? (1 - slam / 0.5) * Math.sin(slam * 70) * 0.35 : 0
    w.style(N.card, "transform", `rotate(${(3.2 + thud + (1 - cp) * 10).toFixed(3)}deg) translate(${((1 - cp) * 6).toFixed(3)}cqw, ${(thud * 0.6 - (1 - cp) * 7).toFixed(3)}cqw) scale(${lerp(1.08, 1, cp).toFixed(4)})`)
    w.style(N.inkSplash, "opacity", (slam > 0.05 && slam < 0.7 ? 0.55 * (1 - seg(slam, 0.05, 0.7)) : 0).toFixed(3))
  }

  useLoop(draw, { live, active, stillAt: STILL, stage })
  const u = (s: string) => `${s}-${id}`

  const btnEl = (sid: string, b: Btn) => (
    <g key={b.id}>
      <clipPath id={u(`bc-${sid}-${b.id}`)}>
        <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.h / 2} />
      </clipPath>
      <rect x={b.x} y={b.y + 1.6} width={b.w} height={b.h} rx={b.h / 2} fill="#000" opacity="0.12" />
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={b.h / 2} fill={C.btn} stroke={C.btnEdge} strokeWidth="0.8" />
      <g clipPath={`url(#${u(`bc-${sid}-${b.id}`)})`}>
        <rect ref={ref(`pr-${sid}-${b.id}`)} x={b.x} y={b.y} width={b.w} height={b.h} fill="#000" opacity="0" />
        <circle ref={ref(`rp-${sid}-${b.id}`)} cx={b.x + b.w * 0.56} cy={b.y + b.h * 0.55} r="4" fill="#fff" opacity="0" />
      </g>
      <text className="xl-sans" x={b.x + b.w / 2} y={b.y + b.h / 2 + b.fs * 0.35} fontSize={b.fs} fill={b.dark ? C.btnText : "#fff"} textAnchor="middle" fontWeight="500" letterSpacing="0.4">
        {b.label}
      </text>
    </g>
  )
  const fieldEl = (sid: string, f: Field) => (
    <g key={f.id}>
      <rect ref={ref(`fb-${sid}-${f.id}`)} x={f.x} y={f.y} width={f.w} height={f.h} rx={f.h / 2} fill={C.field} stroke={C.btnEdge} strokeWidth="0.8" />
      <rect ref={ref(`pr-${sid}-${f.id}`)} x={f.x} y={f.y} width={f.w} height={f.h} rx={f.h / 2} fill="#000" opacity="0" />
      <text ref={ref(`hint-${sid}-${f.id}`)} className="xl-sans" x={f.x + f.w / 2} y={f.y + f.h / 2 + f.fs * 0.36} fontSize={f.fs} fill={C.text} textAnchor="middle">
        {f.hint}
      </text>
      <text ref={ref(`tx-${sid}-${f.id}`)} className="xl-sans xl-pre" xmlSpace="preserve" x={f.x + f.w / 2} y={f.y + f.h / 2 + f.fs * 0.36} fontSize={f.fs} fill={C.text} textAnchor="middle" />
      <rect ref={ref(`caret-${sid}-${f.id}`)} x={f.x + f.w / 2} y={f.y + f.h / 2 - f.fs * 0.55} width="1.1" height={f.fs * 1.08} fill={C.accent} opacity="0" />
    </g>
  )

  return (
    <div
      ref={ref("root")}
      className="xl xl-agr"
      role="img"
      aria-label="Illustration of Agrimate, the native Android app that won the Yugam 2020 hackathon: a walkthrough of its splash screen, the choice between investor and farmer, sign up and login, the sign-up form and the OTP screen."
    >
      <div className="xl-stage" ref={stage}>
        <svg className="xl-svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <radialGradient id={u("spot")} cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor="#f2ead6" stopOpacity="0.16" />
              <stop offset="55%" stopColor="#c8ff3d" stopOpacity="0.035" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={u("floor")}>
              <stop offset="0%" stopColor="#000" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={u("vig")} cx="50%" cy="48%" r="72%">
              <stop offset="60%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
            </radialGradient>
          </defs>
          <rect x="-400" y="-300" width="1600" height="1100" fill={C.bg} />
          {/* the app's leaf art, scaled up and dimmed into the backdrop */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" opacity="0.13">
            <path d={leaf(-30, 520, 170, -52)} stroke={C.olive} />
            <path d={leaf(-40, 430, 130, -18)} stroke={C.olive} />
            <path d={pod(70, 500, 58, -40)} stroke={C.leafGrey} />
            <path d={leaf(830, -20, 170, 128)} stroke={C.olive} />
            <path d={leaf(840, 70, 130, 162)} stroke={C.olive} />
            <path d={pod(730, 0, 58, 140)} stroke={C.leafGrey} />
          </g>
          <ellipse ref={ref("spot")} cx="400" cy="235" rx="250" ry="250" fill={`url(#${u("spot")})`} />
          <ellipse ref={ref("floorShadow")} cx="402" cy="472" rx="122" ry="16" fill={`url(#${u("floor")})`} />

          {/* ============ WALKTHROUGH MAP (big stage only) ============ */}
          <g className="xl-mono xl-fine">
            <text x="40" y="58" fontSize="8.4" fill={C.mute} letterSpacing="1.4">
              WALKTHROUGH
            </text>
            <text ref={ref("stepNo")} x="252" y="58" fontSize="8.4" fill={C.lime} textAnchor="end" letterSpacing="1">
              STEP 01 / 07
            </text>
            <line x1="40" x2="252" y1="68" y2="68" stroke={C.line} />
            {/* rails */}
            <path d="M52 97V133" stroke={C.line} strokeWidth="1.2" fill="none" />
            <path ref={ref("railF")} d="M52 133V167H62M74 167V251" stroke={C.line} strokeWidth="1.2" fill="none" />
            <path ref={ref("railI")} d="M52 167V287H62M74 287V347" stroke={C.line} strokeWidth="1.2" fill="none" />
            <text ref={ref("brFarmer")} x="66" y="170" fontSize="7.6" fill={C.dim} letterSpacing="1.2">
              FARMER
            </text>
            <text ref={ref("brInvestor")} x="66" y="290" fontSize="7.6" fill={C.dim} letterSpacing="1.2">
              INVESTOR
            </text>
            {FLOW.map((f, i) => (
              <g key={f.id}>
                <rect ref={ref(`fh${i}`)} x={f.x + 8} y={f.y - 13} width={LINK_X - f.x - 6} height={f.sub ? 30 : 19} rx="3" fill={C.lime} fillOpacity="0.08" opacity="0" />
                <circle ref={ref(`fd${i}`)} cx={f.x} cy={f.y - 3.5} r="3.6" fill="none" stroke={C.dim} strokeWidth="1.2" />
                <text x={f.x + 13} y={f.y} fontSize="7.6" fill={C.dim} letterSpacing="0.6">
                  {f.id}
                </text>
                <text ref={ref(`fl${i}`)} x={f.x + 31} y={f.y} fontSize="10.6" fill={C.mute}>
                  {f.label}
                </text>
                {f.sub && (
                  <text x={f.x + 31} y={f.y + 12} fontSize="8" fill={C.dim} letterSpacing="0.2">
                    {f.sub}
                  </text>
                )}
              </g>
            ))}
            <text ref={ref("shared")} x="105" y="376" fontSize="8" fill={C.mute} letterSpacing="0.3" opacity="0.45">
              ↳ then 04 · 05, shared
            </text>
            <rect x="40" y="398" width="212" height="44" rx="4" fill="none" stroke={C.line} strokeDasharray="3 3" />
            <text x="52" y="415" fontSize="7.6" fill={C.dim} letterSpacing="1.2">
              BACKEND
            </text>
            <text x="52" y="431" fontSize="8.6" fill={C.mute}>
              secure payments · financial tracking
            </text>
            {/* the active step points at the phone */}
            <line ref={ref("link")} x1={LINK_X} x2="286" y1="97" y2="97" stroke={C.lime} strokeWidth="1.1" strokeDasharray="2 4" />
            <circle ref={ref("linkDot")} cx="288" cy="97" r="2.4" fill={C.lime} />
          </g>
          <rect x="-400" y="-300" width="1600" height="1100" fill={`url(#${u("vig")})`} pointerEvents="none" />
        </svg>

        {/* ============ PHONE ============ */}
        <div className="xl-agr-phone" ref={ref("phone")}>
          <svg viewBox="0 0 224 452" className="xl-agr-phone-svg" aria-hidden="true">
            <defs>
              <linearGradient id={u("body")} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3a3a39" />
                <stop offset="45%" stopColor="#161616" />
                <stop offset="100%" stopColor="#262625" />
              </linearGradient>
              <linearGradient id={u("glare")} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="50%" stopColor="#fff" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <clipPath id={u("display")}>
                <rect x="9" y="9" width="202" height="434" rx="24" />
              </clipPath>
              <clipPath id={u("content")}>
                <rect x="0" y="0" width="202" height="394" />
              </clipPath>
              <clipPath id={u("full")}>
                <rect x="0" y="0" width="202" height="408" />
              </clipPath>
            </defs>
            {/* side keys: power and volume, Android style on the right edge */}
            <rect x="219" y="112" width="4" height="30" rx="1.5" fill="#2a2a29" />
            <rect x="219" y="160" width="4" height="58" rx="1.5" fill="#2a2a29" />
            <rect x="0" y="0" width="221" height="452" rx="32" fill={`url(#${u("body")})`} />
            <rect x="0.8" y="0.8" width="219.4" height="450.4" rx="31.2" fill="none" stroke="#ffffff" strokeOpacity="0.14" />
            <rect x="8" y="8" width="205" height="436" rx="25" fill="#030303" />
            <g clipPath={`url(#${u("display")})`}>
              <rect x="9" y="9" width="202" height="434" fill={C.screen} />
              {SCREENS.map((sc) => (
                <g key={sc.id} ref={ref(`sc-${sc.id}`)} transform={`translate(9 ${sc.id === "splash" ? 9 : 23})`} opacity={sc.id === "splash" ? 1 : 0}>
                  <g clipPath={`url(#${u(sc.id === "splash" ? "full" : "content")})`}>
                    <rect width="202" height={sc.id === "splash" ? 408 : 394} fill={C.screen} />
                    <Leaves h={sc.id === "splash" ? 408 : 394} />
                    {sc.id === "splash" && (
                      <g ref={ref("sprout")}>
                        <circle cx="101" cy="176" r="62" fill="#e3e7cf" />
                        <circle cx="128" cy="146" r="13" fill="#d9c38b" />
                        <clipPath id={u("hill")}>
                          <circle cx="101" cy="176" r="62" />
                        </clipPath>
                        <g clipPath={`url(#${u("hill")})`}>
                          <path d="M30 206C70 190 132 190 172 206V250H30Z" fill="#a3ab5c" />
                          <path d="M30 222C70 208 132 208 172 222V250H30Z" fill="#84942a" />
                          <path d="M40 238C76 228 126 228 162 238" stroke="#e3e7cf" strokeWidth="1.2" fill="none" opacity="0.6" />
                        </g>
                        <path d="M101 204V168" stroke="#5f6b1e" strokeWidth="2.4" strokeLinecap="round" />
                        <path d="M101 182C88 180 80 170 80 160C92 160 100 168 101 182Z" fill="#84942a" />
                        <path d="M101 174C112 170 120 160 120 150C108 150 100 160 101 174Z" fill="#a3ab5c" />
                      </g>
                    )}
                    {sc.id === "splash" && (
                      <text className="xl-sans" x="101" y="338" fontSize="22.4" fill={C.text} textAnchor="middle">
                        AgriMate
                      </text>
                    )}
                    {sc.title && (
                      <text className="xl-sans" x={sc.title.x} y={sc.title.y} fontSize={sc.title.fs} fill={C.text} textAnchor="middle">
                        {sc.title.text}
                      </text>
                    )}
                    {sc.fields.map((f) => fieldEl(sc.id, f))}
                    {sc.btns.map((b) => btnEl(sc.id, b))}
                  </g>
                </g>
              ))}
              {/* soft keyboard */}
              <g ref={ref("kb")} transform={`translate(9 417)`} opacity="0" visibility="hidden">
                <rect width="202" height={KB_H} fill="#e8eaed" />
                <g stroke="#c9ccd1" strokeWidth="0.8">
                  <line x1="67" x2="67" y1="6" y2="16" />
                  <line x1="135" x2="135" y1="6" y2="16" />
                </g>
                <g ref={ref("kbQ")}>
                  {QW.map((key, i) => (
                    <g key={i}>
                      <rect ref={ref(`kq${i}`)} x={key.x} y={key.y} width={key.w} height="22" rx="3" fill={key.fn ? "#d8dbe0" : "#fff"} />
                      <text className="xl-sans" x={key.x + key.w / 2} y={key.y + 14.5} fontSize={key.label.length > 1 ? 6 : 8.4} fill="#3c4043" textAnchor="middle">
                        {key.label}
                      </text>
                    </g>
                  ))}
                </g>
                <g ref={ref("kbN")} opacity="0">
                  {NUM.map((key, i) => (
                    <g key={i}>
                      <rect ref={ref(`kn${i}`)} x={key.x} y={key.y} width={key.w} height="22" rx="3" fill={key.fn ? "#d8dbe0" : "#fff"} />
                      <text className="xl-sans" x={key.x + key.w / 2} y={key.y + 15} fontSize="9.6" fill="#3c4043" textAnchor="middle">
                        {key.label}
                      </text>
                    </g>
                  ))}
                </g>
              </g>
              {/* status bar, in the app theme's colorPrimaryDark */}
              <g ref={ref("status")} opacity="0" visibility="hidden">
                <rect x="9" y="9" width="202" height="14" fill={C.statusBar} />
                <text className="xl-sans" x="36" y="19.4" fontSize="7.4" fill="#fff" fontWeight="500">
                  10:20
                </text>
                <g fill="#fff">
                  <path d="M168 19.6l4.6-5.6h-9.2z" opacity="0.95" />
                  <path d="M176 19.6h5.8v-6.4z" />
                  <rect x="186" y="13.4" width="10" height="6.2" rx="1" fill="none" stroke="#fff" strokeWidth="0.9" />
                  <rect x="187.4" y="14.8" width="6.4" height="3.4" />
                  <rect x="196.4" y="15.4" width="1.2" height="2.2" />
                </g>
              </g>
              {/* fingertip */}
              <g ref={ref("finger")} opacity="0">
                <circle r="11" fill="#141414" fillOpacity="0.22" />
                <circle r="11" fill="none" stroke={C.lime} strokeWidth="1.3" />
                <circle r="2" fill={C.lime} />
              </g>
              <g ref={ref("glare")}>
                <rect x="-120" y="9" width="90" height="434" fill={`url(#${u("glare")})`} transform="skewX(-18)" />
              </g>
            </g>
            {/* 3-button navigation bar */}
            <g clipPath={`url(#${u("display")})`}>
              <rect x="9" y="417" width="202" height="26" fill="#000" />
              <g fill="none" stroke="#e8e8e8" strokeWidth="1.3" strokeLinejoin="round">
                <path d="M66 425.5l-6 4.5 6 4.5z" />
                <circle cx="110" cy="430" r="4.6" />
                <rect x="150.5" y="425.5" width="9" height="9" rx="1" />
              </g>
            </g>
            {/* punch-hole camera, top left */}
            <circle cx="24" cy="16.2" r="4.4" fill="#050505" stroke="#1f1f1f" strokeWidth="0.8" />
            <circle cx="22.8" cy="15" r="1.1" fill="#2a3340" />
          </svg>
        </div>

        {/* ============ ENTRY CARD + STAMP ============ */}
        <div className="xl-agr-card" ref={ref("card")}>
          <i className="xl-agr-tape" />
          <span className="xl-agr-k">Hackathon entry</span>
          <strong className="xl-agr-title">AgriMate</strong>
          <dl className="xl-agr-dl">
            <div>
              <dt>Event</dt>
              <dd>Yugam 2020</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>48-hour hackathon</dd>
            </div>
            <div>
              <dt>Flows</dt>
              <dd>Farmer · Investor</dd>
            </div>
            <div>
              <dt>Build</dt>
              <dd>Native Android · Java</dd>
            </div>
          </dl>
          <i className="xl-agr-ink" ref={ref("inkSplash")} />
          <span className="xl-agr-stampwrap">
            <span className="xl-agr-stamp" ref={ref("stamp")}>
              <span>Winner · Yugam 2020</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
