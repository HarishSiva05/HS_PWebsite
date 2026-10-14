"use client"

import { useId, useRef } from "react"
import "@/styles/exhibit-ledger.css"
import type { ExhibitProps } from "./types"
import { lodOf, useLoop, useNodes, useReducedMotion, type Frame, type Lod } from "./ledger/use-loop"
import { along, clamp, cleanId, cubic, ease, hash, HEX, lerp, mix, pathOf, seg, spring, track, writer } from "./ledger/kit"

// EthChat: a message is written, encrypted to hex, sent as ChatWei.sendMessage(0x…, 0x…);
// its 32 bytes peel off the composer and pour into a block that is mined onto the chain, then
// the receiver's inbox reads it back and decrypts it. Contract lines are quoted verbatim from
// contracts/ChatWei.sol (Solidity ^0.4.18) and the status strings and gas settings come from
// the app's src/js/app.js. Addresses, hashes, timestamps and block numbers are example values.

const LOOP = 14.4
const STILL = 13.2

const C = {
  bg: "#0f0f0d",
  well: "#0b0b09",
  line: "#2d2b25",
  line2: "#3d3a32",
  stripe: "#3a382f",
  paper: "#ede9df",
  paper2: "#cfc9ba",
  mute: "#918b7c",
  dim: "#67625a",
  lime: "#c8ff3d",
  limeDim: "#a6d23a",
  pen: "#e8573d",
  ink: "#151513",
  manila: "#d9c38b",
}

const MSG = "only you can read this"
const CIPHER = "9f3c71e2a4b80d5e6c1f27a93b48e0d5c7a2196f84e3b05d2c7f9a1e60b4d38c"
const HEX1 = "0x" + CIPHER.slice(0, 30)
const HEX2 = CIPHER.slice(30)
const SENDER = "0xA11C…E1F3"
const RECEIVER = "0xB0B0…9C42"
const TS0 = 1696255339 // the real inbox table printed the raw uint timestamp
const BLOCK0 = 4281330
const EXAMPLE_ROWS = [
  { date: "1696254988", from: "0x7E21…3B90" },
  { date: "1696251640", from: "0xC0FF…EE07" },
  { date: "1696250114", from: "0x7E21…3B90" },
]

// Timeline, in seconds within one loop
const T = {
  camIn: [0.6, 1.6],
  type: [1.5, 3.2],
  enc: [3.35, 4.25],
  send: 4.45,
  card: [4.55, 4.95],
  confirm: 5.3,
  collapse: [5.6, 5.9],
  fly: [5.8, 7.0],
  camChain: [5.9, 7.1],
  drop: [7.0, 7.28],
  mine: [7.25, 8.35],
  seal: 8.35,
  camInbox: [8.9, 9.9],
  beam: [9.15, 9.8],
  row: [9.7, 10.1],
  dec: [10.15, 11.0],
  camOut: [11.2, 12.4],
  note: [12.3, 13.1],
  reset: [13.5, 14.35],
} as const

// Camera framings: centre x, centre y, zoom. Small stages push in closer on each beat so the
// message, the transaction and the inbox stay readable at hover-preview and phone sizes.
type Shot = "O" | "L" | "R" | "I"
const CAMS: Record<Lod, Record<Shot, readonly [number, number, number]>> = {
  full: { O: [400, 250, 1], L: [270, 168, 1.5], R: [530, 333, 1.5], I: [530, 167, 1.5] },
  compact: { O: [400, 250, 1], L: [198, 124, 2.05], R: [598, 316, 1.85], I: [602, 125, 2.05] },
  thumb: { O: [400, 200, 1.1], L: [198, 124, 2.05], R: [598, 316, 1.85], I: [602, 125, 2.05] },
}
const STILL_CAM: Record<Lod, readonly [number, number, number]> = {
  full: CAMS.full.O,
  compact: [586, 206, 1.42],
  thumb: CAMS.thumb.O,
}
const MOVES: [readonly [number, number], Shot, Shot][] = [
  [T.camIn, "O", "L"],
  [T.camChain, "L", "R"],
  [T.camInbox, "R", "I"],
  [T.camOut, "I", "O"],
]

// ChatWei.sol, lines 57–74, verbatim
const CODE: { n: number; ind: number; s: string }[] = [
  { n: 57, ind: 1, s: "function sendMessage(address _receiver, bytes32 _content) public {" },
  { n: 58, ind: 2, s: "newMessage.content = _content;" },
  { n: 59, ind: 2, s: "newMessage.timestamp = now;" },
  { n: 60, ind: 2, s: "newMessage.sender = msg.sender;" },
  { n: 61, ind: 2, s: "// Update senders inbox" },
  { n: 62, ind: 2, s: "Inbox storage sendersInbox = userInboxes[msg.sender];" },
  { n: 63, ind: 2, s: "sendersInbox.sentMessages[sendersInbox.numSentMessages] = newMessage;" },
  { n: 64, ind: 2, s: "sendersInbox.numSentMessages++;" },
  { n: 65, ind: 0, s: "" },
  { n: 66, ind: 2, s: "// Update receivers inbox" },
  { n: 67, ind: 2, s: "Inbox storage receiversInbox = userInboxes[_receiver];" },
  { n: 68, ind: 2, s: "receiversInbox.receivedMessages[receiversInbox.numReceivedMessages] = newMessage;" },
  { n: 69, ind: 2, s: "receiversInbox.numReceivedMessages++;" },
  { n: 70, ind: 2, s: "return;" },
  { n: 71, ind: 1, s: "}" },
  { n: 72, ind: 0, s: "" },
  { n: 73, ind: 1, s: "function receiveMessages() public view returns (bytes32[16], uint[], address[]) {" },
  { n: 74, ind: 2, s: "Inbox storage receiversInbox = userInboxes[msg.sender];" },
]
// ChatWei.sol, lines 5–9, verbatim
const STRUCT: { n: number; ind: number; s: string }[] = [
  { n: 5, ind: 1, s: "struct Message {" },
  { n: 6, ind: 2, s: "address sender;" },
  { n: 7, ind: 2, s: "bytes32 content;" },
  { n: 8, ind: 2, s: "uint timestamp;" },
  { n: 9, ind: 1, s: "}" },
]

const KW = /^(function|public|view|returns|storage|memory|struct|mapping|return|contract)$/
const TY = /^(address|bytes32|uint|Inbox|Message|bool)$/

function tokens(s: string) {
  if (s.startsWith("//")) return [{ t: s, c: "c" }]
  return s
    .split(/(\b)/)
    .filter(Boolean)
    .map((t) => ({ t, c: KW.test(t) ? "k" : TY.test(t) ? "y" : "p" }))
}

// Code strip: [time, executing line index, first visible line]
const STEPS: [number, number, number][] = [
  [4.55, 0, 0],
  [7.3, 1, 0],
  [7.44, 2, 0],
  [7.58, 3, 0],
  [7.74, 5, 4],
  [7.86, 6, 4],
  [7.98, 7, 4],
  [8.1, 10, 9],
  [8.2, 11, 9],
  [8.3, 12, 9],
  [8.45, 13, 10],
  [9.2, 16, 14],
]

// Chain geometry: isometric blocks, 120 apart
const BX = (i: number) => 96 + 120 * i
const BY = 292
const TOP = "M0 -21L42 0L0 21L-42 0Z"
const LEFT = "M-42 0L0 21L0 63L-42 42Z"
const RIGHT = "M42 0L0 21L0 63L42 42Z"
const EDGE = "M0 -21L42 0L42 42L0 63L-42 42L-42 0Z M-42 0L0 21L42 0 M0 21L0 63"
const blockHash = (num: number) => "0x0000" + Math.floor(hash(num * 0.731) * 0xffff).toString(16).padStart(4, "0")

const FLY = track(cubic([306, 192], [338, 262], [590, 250], [696, 254], 60))

const MONO = 0.6 // IBM Plex Mono advance, in em

function camAt(t: number, lod: Lod): [number, number, number] {
  const CAM = CAMS[lod]
  let cur: readonly number[] = CAM.O
  for (const [[a, b], from, to] of MOVES) {
    if (t < a) break
    const p = ease.inOutCubic(seg(t, a, b))
    const A = CAM[from]
    const B = CAM[to]
    cur = [lerp(A[0], B[0], p), lerp(A[1], B[1], p), lerp(A[2], B[2], p)]
  }
  return [cur[0], cur[1], cur[2]]
}

// The 32 bytes of the ciphertext leave the composer one by one and stream into the pending
// block: 15 from the first line ("0x" + 30 hex digits), 17 from the second. The box drains from
// the right (second line first, each line right to left): every byte slides right over space
// already emptied, drops through the gap between the panels, then runs along the corridor above
// the chain, so it never crosses text that is still there.
const NBYTES = 32
const B_T0 = 6.0 // first byte lifts off
const B_GAP = 0.03
const B_FLY = 1.05
const B_DROP = 0.22
const BYTES = Array.from({ length: NBYTES }, (_, k) => {
  const line = k < 15 ? 1 : 2
  const c = line === 1 ? 2 + 2 * k : 2 * (k - 15) // first character of the byte in its line
  const x0 = 52 + (c + 1) * 10.4 * MONO // centre of the two characters
  const y0 = (line === 1 ? 147 : 164) - 3.5
  const s = CIPHER.slice(2 * k, 2 * k + 2)
  const lane = (hash(k * 1.7) - 0.5) * 12 // a little spread, so the stream has body
  const tr = track(cubic([x0, y0], [370, y0 + 10], [386 + lane * 0.3, 290 + lane * 0.5], [694 + (hash(k * 4.9) - 0.5) * 10, 250 + lane * 0.4], 44))
  const order = line === 2 ? 31 - k : 31 - k + 3 // 31…15, then 14…0 after a beat
  return { s, tr, at: B_T0 + order * B_GAP, dim: hash(k * 5.3) > 0.62 }
})
const byteGone = (k: number, t: number) => t >= BYTES[k].at
const LAST_OUT = Math.max(...BYTES.map((B) => B.at))

const rowFor = (j: number) =>
  j < 0 ? EXAMPLE_ROWS[Math.min(EXAMPLE_ROWS.length - 1, -j - 1)] : { date: String(TS0 + 247 * j), from: SENDER }

export default function EthChatExhibit({ mode = "live", active = false }: ExhibitProps) {
  const rm = useReducedMotion()
  const live = mode === "live" && !rm
  const stage = useRef<HTMLDivElement>(null)
  const [n, ref] = useNodes()
  const w = useRef(writer()).current
  const id = cleanId(useId())

  const draw = ({ t: clock, still, w: width, px: mx, py: my }: Frame) => {
    const N = n.current
    const lod = lodOf(width)
    w.attr(N.root, "data-lod", lod)
    // the still frame is the closing wide shot of the second loop, so the inbox has history
    const k = still ? 1 : Math.floor(clock / LOOP)
    const t = still ? STILL : clock - k * LOOP
    const tick = Math.floor(clock * 30)

    // ---- camera, with the dot grid moving slower for depth; it leans a little toward the mouse.
    // The still frame on a small stage crops in on the delivered message and the new block.
    const [cx, cy, z] = still ? STILL_CAM[lod] : camAt(t, lod)
    const sa = t - T.seal
    const shake = sa > 0 && sa < 0.4 ? 2.4 * (1 - sa / 0.4) : 0
    const sx = shake * Math.sin(sa * 95) - mx * 9
    const sy = shake * Math.cos(sa * 71) - my * 6
    w.attr(N.world, "transform", `translate(${(400 - cx * z + sx).toFixed(2)} ${(250 - cy * z + sy).toFixed(2)}) scale(${z.toFixed(4)})`)
    w.fade(N.lens, clamp((z - 1) / 0.5))
    const zb = 1 + (z - 1) * 0.55
    w.attr(N.bgDots, "transform", `translate(${(400 - cx * zb - mx * 3).toFixed(2)} ${(250 - cy * zb - my * 2).toFixed(2)}) scale(${zb.toFixed(4)})`)

    const reset = ease.inOutCubic(seg(t, T.reset[0], T.reset[1]))
    const keep = 1 - reset // what this loop produced, fading as the next one is set up

    // ---- composer: type, then encrypt under a scan line
    const typed = Math.round(seg(t, T.type[0], T.type[1]) * MSG.length)
    const encP = seg(t, T.enc[0], T.enc[1])
    const scanX = lerp(40, 360, ease.inOutCubic(seg(encP, 0, 0.72)))
    let plain = ""
    for (let i = 0; i < typed; i++) {
      const x = 52 + i * 13 * MONO
      if (encP <= 0 || x >= scanX) plain += MSG[i]
      else if (x < scanX - 18 || MSG[i] === " ") plain += " "
      else plain += HEX[Math.floor(hash(i * 7.3 + tick) * 16)]
    }
    w.text(N.cMsg, plain)
    w.fade(N.cMsg, encP < 0.75 ? 1 : 0)
    const reveal = (s: string) => {
      if (encP >= 0.72) return s
      let out = ""
      for (let i = 0; i < s.length; i++) {
        const x = 52 + i * 10.4 * MONO
        out += x < scanX - 14 ? s[i] : x < scanX ? HEX[Math.floor(hash(i * 3.1 + tick * 0.7) * 16)] : " "
      }
      return out
    }
    // once sent, each byte's two characters leave the box as that byte lifts off
    const sentOff = (s: string, line: 1 | 2) => {
      if (t < B_T0) return s
      let out = ""
      for (let c = 0; c < s.length; c++) out += byteGone(line === 1 ? Math.max(0, (c - 2) >> 1) : 15 + (c >> 1), t) ? " " : s[c]
      return out
    }
    w.text(N.cHex1, sentOff(reveal(HEX1), 1))
    w.text(N.cHex2, sentOff(reveal(HEX2), 2))
    w.fade(N.cHexG, encP > 0 ? keep : 0)
    w.fade(N.cScan, encP > 0 && encP < 0.78 ? 1 - seg(encP, 0.66, 0.78) : 0)
    w.attr(N.cScan, "transform", `translate(${scanX.toFixed(1)} 0)`)
    // when every byte has left, the box keeps a receipt of what went on chain
    w.fade(N.cSent, seg(t, LAST_OUT + 0.25, LAST_OUT + 0.75) * keep)

    const typing = t >= T.type[0] && t < T.enc[0]
    const blink = Math.floor(clock * 2.2) % 2 === 0
    const caret = typing || ((t < T.type[0] || t >= T.reset[0] + 0.5) && blink)
    w.fade(N.cCaret, caret ? 1 : 0)
    w.attr(N.cCaret, "x", 52.5 + (typing ? typed : 0) * 13 * MONO)
    w.attr(N.cBox, "stroke", typing ? "#5d7a24" : C.line2)
    const bytes = encP >= 0.8 && keep > 0.5
    w.text(N.cCount, bytes ? "32 bytes" : `${t < T.reset[0] ? typed : 0} / 30`)
    w.attr(N.cCount, "fill", bytes ? C.limeDim : C.dim)

    const locked = encP > 0.66 && keep > 0.5
    const lockP = spring(t - (T.enc[0] + 0.6), 0.5, 18)
    w.attr(N.cShackle, "transform", `translate(0 ${locked ? (-3 * (1 - lockP)).toFixed(2) : -3})`)
    w.attr(N.cLock, "stroke", locked ? C.lime : C.dim)

    // status line, worded after the real app's status messages
    const sealed = t >= T.seal
    let status = "MetaMask detected"
    let statusC = C.dim
    if (encP >= 0.8) [status, statusC] = ["encrypted · bytes32", C.limeDim]
    if (t >= T.confirm + 0.2) [status, statusC] = ["sending · open MetaMask → submit → wait", C.mute]
    if (sealed) [status, statusC] = ["message successfully sent", C.lime]
    if (t >= T.reset[0] + 0.45) [status, statusC] = ["MetaMask detected", C.dim]
    w.text(N.cStatus, status)
    w.attr(N.cStatus, "fill", statusC)

    const press = (at: number) => (t >= at && t < at + 0.6 ? Math.max(0, 1 - spring(t - at, 0.35, 22)) : 0)
    w.attr(N.cSend, "transform", `translate(320 200) scale(${(1 - 0.08 * press(T.send)).toFixed(3)}) translate(-320 -200)`)
    const rip = seg(t, T.send, T.send + 0.5)
    w.fade(N.cSendRipple, rip > 0 && rip < 1 ? 0.55 * (1 - rip) : 0)
    w.attr(N.cSendRipple, "r", 4 + 44 * ease.outCubic(rip))

    // ---- MetaMask confirmation, which then folds into the transaction
    const cardIn = ease.outExpo(seg(t, T.card[0], T.card[1]))
    const fold = ease.inOutCubic(seg(t, T.collapse[0], T.collapse[1]))
    w.fade(N.wallet, cardIn * (1 - fold))
    w.attr(
      N.wallet,
      "transform",
      `translate(306 188) scale(${lerp(1, 0.22, fold).toFixed(3)}) translate(-306 -188) translate(0 ${((1 - cardIn) * 22).toFixed(2)})`,
    )
    const signed = t >= T.confirm
    w.text(N.wConfirmLabel, signed ? "SIGNED ✓" : "CONFIRM")
    w.attr(N.wConfirmBg, "fill", signed ? C.paper : C.lime)
    w.attr(N.wConfirm, "transform", `translate(306 188) scale(${(1 - 0.08 * press(T.confirm)).toFixed(3)}) translate(-306 -188)`)

    // ---- the transaction in flight
    const flyP = ease.inOutCubic(seg(t, T.fly[0], T.fly[1]))
    const dropP = ease.inCubic(seg(t, T.drop[0], T.drop[1]))
    const [px, py0, ang] = along(FLY, flyP)
    const py = py0 + dropP * 36
    const pop = Math.min(1.15, spring(t - T.fly[0] + 0.12, 0.55, 18))
    const tilt = flyP > 0 && flyP < 1 ? clamp((ang * 180) / Math.PI - 8, -14, 14) * Math.sin(Math.PI * flyP) : 0
    const inFlight = t >= T.fly[0] - 0.1 && t < T.drop[1]
    w.fade(N.pk, inFlight ? 1 - seg(dropP, 0.7, 1) : 0)
    w.attr(N.pk, "transform", `translate(${px.toFixed(2)} ${py.toFixed(2)}) rotate(${tilt.toFixed(2)}) scale(${(pop * lerp(1, 0.35, dropP)).toFixed(3)})`)
    const tEnd = Math.max(2, Math.floor(flyP * (FLY.pts.length - 1)))
    w.attr(N.pkTrail, "d", pathOf([...FLY.pts.slice(Math.max(0, tEnd - 26), tEnd), [px, py0]]))
    w.fade(N.pkTrail, t >= T.fly[0] && t < T.drop[1] + 0.3 ? 0.9 * (1 - seg(t, T.drop[0], T.drop[1] + 0.3)) : 0)

    // ---- behind it, the ciphertext's bytes stream into the pending block
    for (let b = 0; b < NBYTES; b++) {
      const B = BYTES[b]
      const el = N[`by${b}`]
      const f = seg(t, B.at, B.at + B_FLY)
      const d = seg(t, B.at + B_FLY, B.at + B_FLY + B_DROP)
      if (t < B.at || d >= 1 || t >= T.reset[0]) {
        w.fade(el, 0)
        continue
      }
      // a quick pop as it lifts off, then it shrinks into the block over the end of its flight
      const [bx, by0] = along(B.tr, ease.inOutSine(f))
      const pop = 1 + 0.32 * Math.sin(Math.PI * seg(t, B.at, B.at + 0.16))
      const s = pop * lerp(1, 1.16, Math.sin(Math.PI * f)) * lerp(1, 0.55, ease.inCubic(seg(f, 0.72, 1))) * lerp(1, 0.4, d)
      w.attr(el, "transform", `translate(${bx.toFixed(2)} ${(by0 + ease.inCubic(d) * 32).toFixed(2)}) scale(${s.toFixed(3)})`)
      w.fade(el, (1 - 0.35 * seg(f, 0.8, 1)) * (1 - d))
    }

    // ---- chain: block 5 is mined this loop, then everything shifts one slot left
    w.attr(N.chain, "transform", `translate(${(-120 * reset).toFixed(2)} 0)`)
    const mineP = seg(t, T.mine[0], T.mine[1])
    const sealAge = t - T.seal
    const bob = -8 + Math.sin(clock * 3) * 1.2
    for (let i = 0; i <= 6; i++) {
      const num = BLOCK0 + k + i
      const pending = i === 6 || (i === 5 && !sealed)
      const g = N[`b${i}`]
      let y = BY
      let o = 1
      if (i === 0) o = 1 - seg(reset, 0.15, 0.7)
      if (i === 6) {
        o = seg(reset, 0.4, 1)
        y = BY + bob
      }
      if (i === 5) y = BY + (sealed ? -8 * (1 - spring(sealAge, 0.38, 15)) : bob)
      w.attr(g, "transform", `translate(${BX(i)} ${y.toFixed(2)})`)
      w.fade(g, o)
      // the floor stays put while a block floats, so its shadow spreads and pales with height
      const lift = BY - y
      w.attr(N[`b${i}sh`], "transform", `translate(0 ${lift.toFixed(2)}) scale(${(1 + lift * 0.02).toFixed(3)})`)
      w.attr(N[`b${i}sh`], "opacity", (1 - lift * 0.06).toFixed(3))
      // proof of work happens on the block itself: the nonce counts in its label, candidate
      // hashes spin on its face until one with leading zeros seals it
      const nonce = 1200000 + Math.floor(seg(t, T.mine[0], T.seal) * 3888412)
      w.text(N[`b${i}l`], pending ? (i === 5 && mineP > 0 ? `nonce ${nonce.toLocaleString("en-US")}` : "pending") : `#${num.toLocaleString("en-US")}`)
      let face = blockHash(num)
      if (i === 5 && mineP > 0 && !sealed) {
        face = "0x"
        for (let q = 0; q < 8; q++) face += HEX[Math.floor(hash(q * 5.7 + tick * 1.3) * 16)]
      }
      w.text(N[`b${i}h`], face)
      if (i < 5) {
        // once the new block seals, a pulse runs back down the chain
        const d0 = T.seal + 0.12 + (4 - i) * 0.1
        const pl = sealed ? Math.min(seg(t, d0, d0 + 0.05), 1 - seg(t, d0 + 0.05, d0 + 0.5)) : 0
        w.attr(N[`b${i}e`], "stroke", pl > 0.002 ? mix(C.line2, C.lime, pl * 0.9) : C.line2)
        continue
      }
      const faces = i === 6 ? 0.12 : sealed ? 1 : 0.12 + 0.48 * mineP
      w.fade(N[`b${i}f`], faces)
      w.fade(N[`b${i}h`], i === 5 && (sealed || mineP > 0) ? 1 : 0)
      if (i === 5) w.attr(N.b5h, "fill", sealed ? mix(C.lime, "#5c574c", 1 - keep) : C.paper2)
      for (let s = 0; s < 3; s++) w.fade(N[`b${i}s${s}`], i === 5 ? (sealed ? 1 : seg(mineP, 0.15 + s * 0.25, 0.3 + s * 0.25)) : 0)
      w.attr(N[`b${i}s1`], "stroke", mix(C.lime, C.stripe, 1 - keep))
      const e = N[`b${i}e`]
      w.attr(e, "stroke", pending ? C.lime : mix(C.lime, C.line2, 1 - keep))
      w.attr(e, "stroke-dasharray", pending ? "3 3" : "none")
      w.attr(e, "stroke-opacity", pending ? (i === 5 && mineP > 0 ? 1 : 0.7) : 1)
      w.attr(N[`b${i}l`], "fill", pending ? C.limeDim : mix(C.lime, C.dim, 1 - keep))
    }
    const glow = sealed ? lerp(1, 0.32, seg(sealAge, 0, 1.4)) * keep : seg(t, T.drop[0], T.mine[0] + 0.2) * (0.3 + 0.2 * Math.sin(clock * 14))
    w.fade(N.b5glow, glow)

    // links: the new block snaps on as it seals; the next empty slot arrives with the reset
    for (let i = 0; i < 4; i++) {
      const d0 = T.seal + 0.17 + (3 - i) * 0.1
      const pl = sealed ? Math.min(seg(t, d0, d0 + 0.05), 1 - seg(t, d0 + 0.05, d0 + 0.5)) : 0
      w.attr(N[`l${i}`], "stroke", pl > 0.002 ? mix(C.line2, C.lime, pl) : C.line2)
    }
    w.fade(N.l0, 1 - seg(reset, 0.15, 0.7))
    w.fade(N.l4, sealed ? 0.25 + 0.75 * seg(sealAge, 0.05, 0.35) : 0.25)
    w.attr(N.l4, "stroke", sealed && sealAge < 0.9 ? C.lime : C.line2)
    w.fade(N.l5, seg(reset, 0.5, 1) * 0.25)

    // the seal's shockwave
    const ring = seg(sealAge, 0, 0.75)
    w.fade(N.ring, sealed && ring < 1 ? 1 - ease.outCubic(ring) : 0)
    w.attr(N.ring, "r", 12 + 74 * ease.outCubic(ring))

    // ---- delivery: the receiver's front end reads its inbox from contract state
    const beamP = seg(t, T.beam[0], T.beam[1])
    w.fade(N.beam, t >= T.beam[0] ? 1 - seg(t, T.camOut[0], T.camOut[1]) : 0)
    w.attr(N.beamLine, "stroke-dashoffset", (clock * 40).toFixed(1))
    w.attr(N.beamDot, "cy", lerp(268, 226, ease.inOutCubic(beamP)))
    w.fade(N.beamDot, beamP > 0 && beamP < 1 ? 1 : 0)
    w.attr(N.iCall, "fill", t >= T.beam[0] && t < T.reset[0] ? C.lime : C.dim)

    // inbox rows: slot s shows message k-1-s before the arrival and k-s after it
    const rowP = ease.outCubic(seg(t, T.row[0], T.row[1]))
    const arrived = t >= T.row[0]
    for (let s = 0; s < 4; s++) {
      const r = rowFor(k - s)
      w.text(N[`r${s}d`], r.date)
      w.text(N[`r${s}f`], r.from)
      w.attr(N[`r${s}`], "transform", `translate(0 ${(176 + 18 * (s - 1) + 18 * rowP).toFixed(2)})`)
      w.fade(N[`r${s}`], s === 0 ? (arrived ? rowP : 0) : s === 3 ? 1 - rowP : 1)
    }
    const fresh = arrived ? rowP * (1 - seg(t, T.reset[0], T.reset[0] + 0.5)) : 0
    w.fade(N.r0new, fresh)
    w.fade(N.r0hi, fresh)

    // the received message: hex first, then decrypted under a scan line
    const decP = seg(t, T.dec[0], T.dec[1])
    const decX = lerp(444, 764, ease.inOutCubic(decP))
    const hadOne = k >= 1
    w.fade(N.iPlaceholder, !arrived && !hadOne ? 1 : 0)
    w.fade(N.iHexG, arrived && decP < 1 ? rowP : 0)
    let rec = MSG
    if (arrived && decP > 0 && decP < 1) {
      rec = ""
      for (let i = 0; i < MSG.length; i++) {
        const x = 456 + i * 13 * MONO
        rec += x < decX - 16 ? MSG[i] : x < decX && MSG[i] !== " " ? HEX[Math.floor(hash(i * 9.1 + tick) * 16)] : " "
      }
    }
    w.text(N.iPlain, rec)
    w.fade(N.iPlain, arrived ? (decP > 0 ? 1 : 1 - rowP) * (hadOne || decP > 0 ? 1 : 0) : hadOne ? 1 : 0)
    w.attr(N.iPlain, "fill", decP > 0 && decP < 1 ? C.lime : C.paper)
    const hide = (s: string) => {
      if (decP <= 0) return s
      let out = ""
      for (let i = 0; i < s.length; i++) out += 456 + i * 10.4 * MONO < decX ? " " : s[i]
      return out
    }
    w.text(N.iHex1, hide(HEX1))
    w.text(N.iHex2, hide(HEX2))
    w.fade(N.iScan, decP > 0 && decP < 1 ? 1 - seg(decP, 0.85, 1) : 0)
    w.attr(N.iScan, "transform", `translate(${decX.toFixed(1)} 0)`)
    const open = arrived ? decP >= 1 : hadOne
    const openP = arrived ? spring(t - T.dec[1], 0.45, 16) : 1
    w.attr(N.iShackle, "transform", open ? `translate(${(4 * openP).toFixed(2)} -3)` : "translate(0 0)")
    w.attr(N.iLock, "stroke", open ? C.paper2 : C.lime)
    w.fade(N.iLock, arrived || hadOne ? 1 : 0.35)

    // ---- code strip: the contract lines execute as the block is mined
    let hl = -1
    let first = 0
    let since = 99
    let prevHl = -1
    let prevFirst = 0
    for (const [ts, line, sc] of STEPS) {
      if (t < ts) break
      prevHl = hl
      prevFirst = first
      hl = line
      first = sc
      since = t - ts
    }
    let sc = lerp(prevFirst, first, ease.outCubic(clamp(since / 0.28)))
    const back = ease.inOutCubic(seg(t, T.reset[0], T.reset[1]))
    sc = lerp(sc, 0, back)
    w.attr(N.codeLines, "transform", `translate(0 ${(-sc * 15).toFixed(2)})`)
    const hy = (prevHl < 0 ? hl : lerp(prevHl, hl, ease.outCubic(clamp(since / 0.14)))) - sc
    w.attr(N.codeHl, "transform", `translate(0 ${(hy * 15).toFixed(2)})`)
    w.fade(N.codeHl, hl >= 0 ? 1 - seg(t, T.reset[0], T.reset[0] + 0.3) : 0)
    for (let i = 0; i < CODE.length; i++) w.attr(N[`cl${i}`], "opacity", i === hl && back < 0.5 ? 1 : 0.6)

    // struct slip: bytes32 content takes the highlighter once the hex exists
    const hiP = ease.outCubic(seg(t, T.enc[1] - 0.1, T.enc[1] + 0.45)) * keep
    w.attr(N.slipHi, "width", (96 * hiP).toFixed(1))

    // red pen in the closing wide shot
    const noteP = seg(t, T.note[0], T.note[1])
    w.attr(N.noteClip, "width", (250 * ease.outCubic(seg(noteP, 0, 0.75))).toFixed(1))
    w.attr(N.noteArrow, "stroke-dashoffset", (90 * (1 - ease.inOutCubic(seg(noteP, 0.5, 1)))).toFixed(1))
    // (the small-stage still crops it out, so it is left off rather than cut in half)
    w.fade(N.note, t >= T.note[0] && !(still && lod === "compact") ? 1 - seg(t, T.reset[0], T.reset[0] + 0.4) : 0)
  }

  useLoop(draw, { live, active, stillAt: STILL, stage })

  const u = (s: string) => `${s}-${id}`

  return (
    <div
      ref={ref("root")}
      className="xl xl-eth"
      role="img"
      aria-label="Illustration of EthChat: a message is typed, encrypted into hex, sent with the ChatWei contract's sendMessage function, mined into a block on the chain, then read from the receiver's inbox and decrypted."
    >
      <div className="xl-stage" ref={stage}>
        <svg className="xl-svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <pattern id={u("dots")} width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.75" fill={C.lime} opacity="0.075" />
            </pattern>
            <radialGradient id={u("vig")} cx="50%" cy="46%" r="70%">
              <stop offset="55%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.5" />
            </radialGradient>
            <radialGradient id={u("lens")} cx="50%" cy="50%" r="62%">
              <stop offset="58%" stopColor={C.bg} stopOpacity="0" />
              <stop offset="100%" stopColor={C.bg} stopOpacity="0.78" />
            </radialGradient>
            <radialGradient id={u("shadow")}>
              <stop offset="0%" stopColor="#000" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={u("glow")}>
              <stop offset="0%" stopColor={C.lime} stopOpacity="0.5" />
              <stop offset="45%" stopColor={C.lime} stopOpacity="0.12" />
              <stop offset="100%" stopColor={C.lime} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={u("panel")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1a16" />
              <stop offset="100%" stopColor="#121210" />
            </linearGradient>
            <linearGradient id={u("slip")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#efebe0" />
              <stop offset="100%" stopColor="#e2dccd" />
            </linearGradient>
            <linearGradient id={u("trail")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={C.lime} stopOpacity="0" />
              <stop offset="100%" stopColor={C.lime} stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id={u("scan")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={C.lime} stopOpacity="0" />
              <stop offset="85%" stopColor={C.lime} stopOpacity="0.25" />
              <stop offset="100%" stopColor={C.lime} stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id={u("codefade")} x1="0" y1="0" x2="1" y2="0">
              <stop offset="88%" stopColor="#fff" />
              <stop offset="99%" stopColor="#000" />
            </linearGradient>
            <mask id={u("codemask")} maskUnits="userSpaceOnUse" x="304" y="404" width="468" height="66">
              <rect x="304" y="404" width="468" height="66" fill={`url(#${u("codefade")})`} />
            </mask>
            <clipPath id={u("codeclip")}>
              <rect x="304" y="404" width="468" height="66" />
            </clipPath>
            <clipPath id={u("sendclip")}>
              <rect x="284" y="188" width="72" height="24" rx="4" />
            </clipPath>
            <clipPath id={u("cbox")}>
              <rect x="40" y="126" width="316" height="50" rx="6" />
            </clipPath>
            <clipPath id={u("ibox")}>
              <rect x="444" y="87" width="316" height="48" rx="6" />
            </clipPath>
            <clipPath id={u("rows")}>
              <rect x="432" y="161" width="340" height="58" />
            </clipPath>
            <clipPath id={u("note")}>
              <rect ref={ref("noteClip")} x="36" y="222" width="0" height="48" />
            </clipPath>
          </defs>

          <rect x="-400" y="-300" width="1600" height="1100" fill={C.bg} />
          <g ref={ref("bgDots")}>
            <rect x="-300" y="-200" width="1400" height="900" fill={`url(#${u("dots")})`} />
          </g>

          <g ref={ref("world")}>
            {/* ============ SENDER ============ */}
            <g className="xl-mono">
              <rect x="28" y="28" width="340" height="194" rx="10" fill={`url(#${u("panel")})`} stroke={C.line} />
              <circle cx="46" cy="44.6" r="2.6" fill={C.lime} />
              <text x="56" y="48" fontSize="9" fill={C.mute} letterSpacing="1.1">
                SENDER
              </text>
              {/* both parties have called registerUser(), so each has an inbox on chain */}
              <text x="102" y="47.6" fontSize="7" fill="#7c9a34" letterSpacing="0.9">
                · REGISTERED
              </text>
              <text x="352" y="48" fontSize="9" fill={C.paper} textAnchor="end" letterSpacing="0.4">
                {SENDER}
              </text>
              <line x1="28" x2="368" y1="60" y2="60" stroke={C.line} />
              <text x="44" y="80" fontSize="7.6" fill={C.dim} letterSpacing="1">
                SEND TO
              </text>
              <text x="44" y="98" fontSize="12" fill={C.paper2}>
                {RECEIVER}
              </text>
              <text x="44" y="118" fontSize="7.6" fill={C.dim} letterSpacing="1">
                MESSAGE
              </text>
              <text ref={ref("cCount")} x="352" y="118" fontSize="7.6" fill={C.dim} textAnchor="end" letterSpacing="0.6">
                0 / 30
              </text>
              <rect ref={ref("cBox")} x="40" y="126" width="316" height="50" rx="6" fill={C.well} stroke={C.line2} />
              <g clipPath={`url(#${u("cbox")})`}>
                <rect ref={ref("cScan")} x="-60" y="126" width="62" height="50" fill={`url(#${u("scan")})`} opacity="0" />
                <text ref={ref("cMsg")} x="52" y="156" fontSize="13" fill={C.paper} className="xl-pre" xmlSpace="preserve" />
                <g ref={ref("cHexG")} opacity="0">
                  <text ref={ref("cHex1")} x="52" y="147" fontSize="10.4" fill={C.lime} className="xl-pre" xmlSpace="preserve">
                    {HEX1}
                  </text>
                  <text ref={ref("cHex2")} x="52" y="164" fontSize="10.4" fill={C.lime} className="xl-pre" xmlSpace="preserve">
                    {HEX2}
                  </text>
                </g>
                <rect ref={ref("cCaret")} x="52.5" y="143" width="1.6" height="17" fill={C.lime} />
                <g ref={ref("cSent")} opacity="0" visibility="hidden">
                  <text x="52" y="155" fontSize="10.4" fill={C.limeDim} className="xl-pre" xmlSpace="preserve">
                    0x9f3c71e2…60b4d38c
                  </text>
                  <text x="344" y="154.5" fontSize="7.6" fill={C.mute} textAnchor="end" letterSpacing="1">
                    ON CHAIN ✓
                  </text>
                </g>
              </g>
              <g ref={ref("cLock")} stroke={C.dim} strokeWidth="1.3" fill="none">
                <rect x="44" y="196" width="10" height="8" rx="1.5" />
                <path ref={ref("cShackle")} d="M46.4 196v-2.6a2.6 2.6 0 0 1 5.2 0V196" transform="translate(0 -3)" />
              </g>
              <text ref={ref("cStatus")} x="60" y="203.5" fontSize="8" fill={C.dim} letterSpacing="0.3">
                MetaMask detected
              </text>
              <g ref={ref("cSend")}>
                <rect x="284" y="188" width="72" height="24" rx="4" fill={C.lime} />
                <g clipPath={`url(#${u("sendclip")})`}>
                  <circle ref={ref("cSendRipple")} cx="320" cy="200" r="4" fill="#fff" opacity="0" />
                </g>
                <text x="320" y="203.6" fontSize="9" fill={C.ink} textAnchor="middle" fontWeight="600" letterSpacing="1.2">
                  SEND
                </text>
              </g>

              {/* MetaMask confirmation */}
              <g ref={ref("wallet")} opacity="0" visibility="hidden">
                <rect x="44" y="98" width="316" height="124" rx="8" fill="#000" opacity="0.28" />
                <rect x="42" y="94" width="316" height="124" rx="8" fill="#000" opacity="0.32" />
                <rect x="40" y="90" width="316" height="124" rx="8" fill="#1d1c18" stroke="#56523f" />
                <text x="54" y="108" fontSize="7.6" fill={C.mute} letterSpacing="1">
                  METAMASK · CONFIRM TRANSACTION
                </text>
                <text x="54" y="131" fontSize="11.5" fill={C.paper}>
                  <tspan fill={C.lime}>sendMessage</tspan>(
                </text>
                <text x="70" y="148" fontSize="10.4" fill={C.paper2}>
                  {RECEIVER},
                </text>
                <text x="70" y="165" fontSize="10.4" fill={C.limeDim}>
                  0x9f3c71e2…60b4d38c<tspan fill={C.paper}>)</tspan>
                </text>
                <text x="54" y="192" fontSize="7.6" fill={C.mute} letterSpacing="0.3">
                  gas 6385876 · gasPrice 20 gwei
                </text>
                <g ref={ref("wConfirm")}>
                  <rect ref={ref("wConfirmBg")} x="266" y="176" width="80" height="24" rx="4" fill={C.lime} />
                  <text ref={ref("wConfirmLabel")} x="306" y="191.6" fontSize="8.4" fill={C.ink} textAnchor="middle" fontWeight="600" letterSpacing="1">
                    CONFIRM
                  </text>
                </g>
              </g>
            </g>

            {/* ============ RECEIVER ============ */}
            <g className="xl-mono">
              <rect x="432" y="28" width="340" height="194" rx="10" fill={`url(#${u("panel")})`} stroke={C.line} />
              <circle cx="450" cy="44.6" r="2.6" fill={C.paper2} />
              <text x="460" y="48" fontSize="9" fill={C.mute} letterSpacing="1.1">
                RECEIVER
              </text>
              <text x="517" y="47.6" fontSize="7" fill="#7c9a34" letterSpacing="0.9">
                · REGISTERED
              </text>
              <text x="756" y="48" fontSize="9" fill={C.paper} textAnchor="end" letterSpacing="0.4">
                {RECEIVER}
              </text>
              <line x1="432" x2="772" y1="60" y2="60" stroke={C.line} />
              <text x="448" y="80" fontSize="7.6" fill={C.dim} letterSpacing="1">
                RECEIVED
              </text>
              <text ref={ref("iCall")} x="756" y="80" fontSize="7.6" fill={C.dim} textAnchor="end" letterSpacing="0.4">
                receiveMessages()
              </text>
              <rect x="444" y="87" width="316" height="48" rx="6" fill={C.well} stroke={C.line2} />
              <g clipPath={`url(#${u("ibox")})`}>
                <rect ref={ref("iScan")} x="-60" y="87" width="62" height="48" fill={`url(#${u("scan")})`} opacity="0" />
                <text ref={ref("iPlaceholder")} x="456" y="114.5" fontSize="8.5" fill={C.dim} letterSpacing="0.4">
                  no message selected
                </text>
                <g ref={ref("iHexG")} opacity="0">
                  <text ref={ref("iHex1")} x="456" y="107" fontSize="10.4" fill={C.lime} className="xl-pre" xmlSpace="preserve">
                    {HEX1}
                  </text>
                  <text ref={ref("iHex2")} x="456" y="124" fontSize="10.4" fill={C.lime} className="xl-pre" xmlSpace="preserve">
                    {HEX2}
                  </text>
                </g>
                <text ref={ref("iPlain")} x="456" y="115.5" fontSize="13" fill={C.paper} className="xl-pre" xmlSpace="preserve" opacity="0">
                  {MSG}
                </text>
              </g>
              <g ref={ref("iLock")} stroke={C.lime} strokeWidth="1.3" fill="none">
                <rect x="738" y="106" width="10" height="8" rx="1.5" />
                <path ref={ref("iShackle")} d="M740.4 106v-2.6a2.6 2.6 0 0 1 5.2 0V106" />
              </g>
              <text x="448" y="154" fontSize="7.6" fill={C.dim} letterSpacing="1">
                DATE
              </text>
              <text x="548" y="154" fontSize="7.6" fill={C.dim} letterSpacing="1">
                FROM
              </text>
              <line x1="444" x2="760" y1="160" y2="160" stroke={C.line} />
              <g clipPath={`url(#${u("rows")})`}>
                {[0, 1, 2, 3].map((s) => (
                  <g key={s} ref={ref(`r${s}`)} transform={`translate(0 ${176 + 18 * (s - 1)})`}>
                    {s === 0 && <rect ref={ref("r0hi")} x="444" y="-12.5" width="316" height="17" rx="3" fill={C.lime} fillOpacity="0.09" />}
                    <text ref={ref(`r${s}d`)} x="448" y="0" fontSize="9.4" fill={C.paper2} />
                    <text ref={ref(`r${s}f`)} x="548" y="0" fontSize="9.4" fill={C.paper2} />
                    {s === 0 && (
                      <g ref={ref("r0new")}>
                        <circle cx="722" cy="-3.2" r="2.4" fill={C.lime} />
                        <text x="756" y="0" fontSize="7.6" fill={C.lime} textAnchor="end" letterSpacing="1">
                          NEW
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </g>
            </g>

            {/* ============ CHAIN ============ */}
            <g ref={ref("chain")}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <g
                  key={`l${i}`}
                  ref={ref(`l${i}`)}
                  fill="none"
                  stroke={C.line2}
                  strokeWidth="1.6"
                  opacity={i >= 4 ? 0.25 : 1}
                  transform={`translate(${BX(i)} ${BY})`}
                >
                  <rect x="46" y="16.5" width="18" height="9" rx="4.5" />
                  <rect x="56" y="16.5" width="18" height="9" rx="4.5" />
                </g>
              ))}
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <g key={i} ref={ref(`b${i}`)} transform={`translate(${BX(i)} ${BY})`} opacity={i === 6 ? 0 : 1}>
                  <ellipse ref={ref(`b${i}sh`)} cx="0" cy="66" rx="52" ry="13" fill={`url(#${u("shadow")})`} />
                  {i === 5 && <circle ref={ref("b5glow")} cx="0" cy="18" r="96" fill={`url(#${u("glow")})`} opacity="0" />}
                  <g ref={ref(`b${i}f`)} opacity={i >= 5 ? 0.12 : 1}>
                    <path d={TOP} fill="#27261f" />
                    <path d={LEFT} fill="#1a1915" />
                    <path d={RIGHT} fill="#211f1a" />
                  </g>
                  {/* transactions recorded in the block; the middle one is this message */}
                  <g strokeWidth="2" strokeLinecap="round">
                    <path ref={ref(`b${i}s0`)} d="M-36 12L-12 24" stroke={C.stripe} opacity={i >= 5 ? 0 : 1} />
                    <path ref={ref(`b${i}s1`)} d="M-36 21L-8 35" stroke={C.stripe} opacity={i >= 5 ? 0 : 1} />
                    <path ref={ref(`b${i}s2`)} d="M-36 30L-18 39" stroke={C.stripe} opacity={i >= 5 ? 0 : 1} />
                  </g>
                  <text ref={ref(`b${i}h`)} className="xl-mono" fontSize="6.4" fill="#5c574c" transform="matrix(0.894 -0.447 0 1 8 45)" opacity={i >= 5 ? 0 : 1} />
                  <path
                    ref={ref(`b${i}e`)}
                    d={EDGE}
                    fill="none"
                    stroke={i >= 5 ? C.lime : C.line2}
                    strokeDasharray={i >= 5 ? "3 3" : undefined}
                    strokeOpacity={i >= 5 ? 0.7 : 1}
                    strokeLinejoin="round"
                  />
                  <text ref={ref(`b${i}l`)} className="xl-mono" x="0" y="80" fontSize="7.6" fill={i >= 5 ? C.limeDim : C.dim} textAnchor="middle" letterSpacing="0.4" />
                </g>
              ))}
              <circle ref={ref("ring")} cx={BX(5)} cy={BY + 18} r="12" fill="none" stroke={C.lime} strokeWidth="1.5" opacity="0" />
            </g>

            {/* receiver reading chain state */}
            <g ref={ref("beam")} opacity="0">
              <line ref={ref("beamLine")} x1="696" x2="696" y1="268" y2="224" stroke={C.lime} strokeWidth="1.4" strokeDasharray="3 4" />
              <circle ref={ref("beamDot")} cx="696" cy="268" r="3" fill={C.lime} />
              <text className="xl-mono" x="686" y="250" fontSize="8.2" fill={C.lime} textAnchor="end" letterSpacing="0.3">
                receiveMessages()
              </text>
            </g>

            {/* the transaction in flight */}
            <path ref={ref("pkTrail")} d="M0 0" fill="none" stroke={`url(#${u("trail")})`} strokeWidth="2" strokeLinecap="round" opacity="0" />
            <g ref={ref("pk")} opacity="0">
              <circle r="30" fill={`url(#${u("glow")})`} />
              <rect x="-46" y="-10" width="92" height="20" rx="10" fill={C.lime} />
              <text className="xl-mono" x="0" y="3.2" fontSize="8.6" fill={C.ink} textAnchor="middle" fontWeight="600">
                sendMessage()
              </text>
            </g>
            {/* the message's 32 bytes, in flight */}
            <g className="xl-mono" fontSize="10.4" textAnchor="middle">
              {BYTES.map((B, b) => (
                <text key={b} ref={ref(`by${b}`)} x="0" y="3.6" fill={B.dim ? C.limeDim : C.lime} opacity="0" visibility="hidden">
                  {B.s}
                </text>
              ))}
            </g>

            {/* ============ ChatWei.sol lines 5–9, as a printed slip ============ */}
            <g transform="rotate(-1.6 158 427)" className="xl-mono xl-nothumb">
              <rect x="33" y="388" width="260" height="90" rx="2" fill="#000" opacity="0.35" />
              <rect x="31" y="385" width="260" height="90" rx="2" fill="#000" opacity="0.35" />
              <rect x="28" y="382" width="260" height="90" rx="2" fill={`url(#${u("slip")})`} />
              <text x="40" y="397" fontSize="7.4" fill="#7a7466" letterSpacing="1">
                CHATWEI.SOL
              </text>
              <text x="276" y="397" fontSize="7.4" fill="#9a9384" textAnchor="end" letterSpacing="0.6">
                LINES 5–9
              </text>
              <line x1="36" x2="280" y1="403" y2="403" stroke="#cdc5b2" />
              <rect ref={ref("slipHi")} x="67" y="431" width="0" height="12" fill={C.lime} opacity="0.9" className="xl-multiply" />
              {STRUCT.map((l, i) => (
                <g key={l.n}>
                  <text x="52" y={416 + 12 * i} fontSize="8" fill="#a39b88" textAnchor="end">
                    {l.n}
                  </text>
                  <text x={58 + (l.ind - 1) * 2 * 9.2 * MONO} y={416 + 12 * i} fontSize="9.2" fill="#2a2823" className="xl-pre" xmlSpace="preserve">
                    {tokens(l.s).map((tk, j) => (
                      <tspan key={j} fill={tk.c === "k" ? "#8a3d22" : tk.c === "y" ? "#55661a" : "#2a2823"}>
                        {tk.t}
                      </tspan>
                    ))}
                  </text>
                </g>
              ))}
            </g>

            {/* ============ ChatWei.sol lines 57–74, executing ============ */}
            <g className="xl-mono xl-nothumb">
              <rect x="304" y="382" width="468" height="90" rx="8" fill="#121210" stroke={C.line} />
              <text x="318" y="397" fontSize="7.6" fill={C.mute} letterSpacing="1">
                CHATWEI.SOL
              </text>
              <text x="758" y="397" fontSize="7.4" fill={C.dim} textAnchor="end" letterSpacing="0.5">
                pragma solidity ^0.4.18
              </text>
              <g mask={`url(#${u("codemask")})`}>
                <g clipPath={`url(#${u("codeclip")})`}>
                  <g ref={ref("codeHl")} opacity="0">
                    <rect x="305" y="406" width="466" height="14" fill={C.lime} fillOpacity="0.1" />
                    <rect x="305" y="406" width="2" height="14" fill={C.lime} />
                  </g>
                  <g ref={ref("codeLines")}>
                    {CODE.map((l, i) => (
                      <g key={l.n} ref={ref(`cl${i}`)} opacity="0.6">
                        <text x="338" y={416.5 + 15 * i} fontSize="7.8" fill={C.dim} textAnchor="end">
                          {l.n}
                        </text>
                        <text x={346 + Math.max(0, l.ind - 1) * 2 * 8.8 * MONO} y={416.5 + 15 * i} fontSize="8.8" fill={C.paper2} className="xl-pre" xmlSpace="preserve">
                          {tokens(l.s).map((tk, j) => (
                            <tspan key={j} fill={tk.c === "k" ? C.manila : tk.c === "y" ? "#b9d77a" : tk.c === "c" ? "#6b665a" : C.paper2}>
                              {tk.t}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    ))}
                  </g>
                </g>
              </g>
            </g>

            {/* red pen, closing wide shot */}
            <g ref={ref("note")} opacity="0">
              <g clipPath={`url(#${u("note")})`}>
                <text className="xl-hand" x="40" y="254" fontSize="19" fill={C.pen} transform="rotate(-3 40 254)">
                  the chain only ever sees hex
                </text>
              </g>
              <path
                ref={ref("noteArrow")}
                d="M262 238C290 236 312 248 322 268M322 268L313 263M322 268L323 258"
                fill="none"
                stroke={C.pen}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="90"
                strokeDashoffset="90"
              />
            </g>
          </g>

          <rect x="-400" y="-300" width="1600" height="1100" fill={`url(#${u("vig")})`} pointerEvents="none" />
          <rect ref={ref("lens")} x="-400" y="-300" width="1600" height="1100" fill={`url(#${u("lens")})`} opacity="0" pointerEvents="none" />
        </svg>
      </div>
    </div>
  )
}
