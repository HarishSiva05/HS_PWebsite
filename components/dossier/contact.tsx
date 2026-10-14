"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { PenNote, Scramble, SectionHead, Stamp } from "./primitives"
import { jump } from "./smooth-scroll"
import { PAGE_COUNT, SUBJECT } from "@/lib/dossier"
import { play } from "@/lib/sound"
import * as gtag from "@/lib/gtag"
import "@/styles/finale.css"

// Deterministic barcode bars from the file number
const BARS = Array.from({ length: 46 }, (_, i) => ((i * 7919 + 13) % 5) + 1)

const MAIL_SUBJECT = "Hello from your portfolio"

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

// ============ SECURE CHANNEL ============
// A terminal that "opens a channel" when it scrolls into view, then a composer whose live
// ciphertext is pure theatre: Send opens the visitor's own mail app with a normal email.

type Line = { kind: "cmd" | "res" | "open"; text: string; ok?: boolean }

const HANDSHAKE: Line[] = [
  { kind: "cmd", text: "open-channel --to harish" },
  { kind: "res", text: `resolving ${SUBJECT.email}`, ok: true },
  { kind: "res", text: "negotiating TLS 1.3 · X25519 · AES-256-GCM", ok: true },
  { kind: "open", text: "channel open. say hello." },
]

type Shake = { chars: number[]; ok: ("wait" | "spin" | "ok")[]; at: number; phase: "idle" | "live" | "open" }

const FINAL: Shake = {
  chars: HANDSHAKE.map((l) => l.text.length),
  ok: HANDSHAKE.map(() => "ok"),
  at: HANDSHAKE.length - 1,
  phase: "open",
}
const EMPTY: Shake = { chars: HANDSHAKE.map(() => 0), ok: HANDSHAKE.map(() => "wait"), at: 0, phase: "idle" }

const SPIN = ["|", "/", "–", "\\"]

function Spinner() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % SPIN.length), 90)
    return () => window.clearInterval(t)
  }, [])
  return <span className="chan-spin">{SPIN[i]}</span>
}

/** Purely visual "ciphertext": a chained, keyed scramble of the message, one hex byte per character. */
function cipherBytes(msg: string): string[] {
  const out: string[] = []
  let h = 0x2f6b9e1d
  for (let i = 0; i < msg.length; i++) {
    h = Math.imul(h ^ msg.charCodeAt(i), 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b)
    h ^= h >>> 15
    out.push(((h >>> 7) & 0xff).toString(16).padStart(2, "0"))
  }
  return out
}

// ---- session-key randomart ----
// OpenSSH's "drunken bishop": a bishop starts mid-field and takes four diagonal steps per key
// byte; the more often a cell is visited, the denser its glyph. Theatre, like the handshake.
const ART_W = 17
const ART_H = 9
const ART_GLYPHS = " .o+=*BOX@%&#/^"
const ART_TOP = "+--[X25519 256]---+"
const ART_BOTTOM = "+----[SHA256]-----+"

function keyBytes(seed?: number): number[] {
  const out = new Array<number>(16)
  if (seed === undefined && typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(new Uint8Array(16)).forEach((b, i) => (out[i] = b))
    return out
  }
  let x = (seed ?? 0x5eed) >>> 0 || 1
  for (let i = 0; i < 16; i++) {
    x ^= x << 13
    x >>>= 0
    x ^= x >>> 17
    x ^= x << 5
    x >>>= 0
    out[i] = x & 0xff
  }
  return out
}

/** The field after `steps` moves (all of them by default): rows of glyphs and where the bishop stands. */
function bishop(bytes: number[], steps = bytes.length * 4) {
  const field = new Array<number>(ART_W * ART_H).fill(0)
  let x = 8
  let y = 4
  for (let n = 0; n < Math.min(steps, bytes.length * 4); n++) {
    const bits = (bytes[n >> 2] >> ((n & 3) * 2)) & 3
    x = Math.max(0, Math.min(ART_W - 1, x + (bits & 1 ? 1 : -1)))
    y = Math.max(0, Math.min(ART_H - 1, y + (bits & 2 ? 1 : -1)))
    field[y * ART_W + x]++
  }
  const rows: string[] = []
  for (let r = 0; r < ART_H; r++) {
    let line = ""
    for (let c = 0; c < ART_W; c++) {
      if (c === x && r === y && steps > 0) line += "E"
      else if (c === 8 && r === 4) line += "S"
      else line += ART_GLYPHS[Math.min(field[r * ART_W + c], ART_GLYPHS.length - 1)]
    }
    rows.push(line)
  }
  return rows
}

const SSR_KEY = keyBytes(0x2f6b9e1d)

function RandomArt({ bytes, steps, show }: { bytes: number[]; steps: number; show: boolean }) {
  const rows = bishop(bytes, steps)
  return (
    <pre className={`chan-art${show ? " is-on" : ""}`}>
      {ART_TOP}
      {rows.map((row, r) => (
        <span key={r}>
          {"\n|"}
          {row.split("").map((ch, c) =>
            ch === "E" || ch === "S" ? (
              <b key={c} className={ch === "E" ? "is-bishop" : undefined}>
                {ch}
              </b>
            ) : (
              ch
            ),
          )}
          {"|"}
        </span>
      ))}
      {"\n"}
      {ART_BOTTOM}
    </pre>
  )
}

function SecureChannel() {
  const panel = useRef<HTMLDivElement>(null)
  const [hs, setHs] = useState<Shake>(FINAL)
  const [booting, setBooting] = useState(false)
  const [msg, setMsg] = useState("")
  const [focused, setFocused] = useState(false)
  const [sent, setSent] = useState(false)
  const [art, setArt] = useState({ bytes: SSR_KEY, steps: SSR_KEY.length * 4, show: true })

  // Before first paint on the client: if the panel hasn't been seen yet, clear it and wait.
  useIsoLayoutEffect(() => {
    const el = panel.current
    if (!el || reducedMotion() || typeof IntersectionObserver === "undefined") return
    if (el.getBoundingClientRect().top < 0) return // already scrolled past: leave it open
    setHs(EMPTY)
    const key = keyBytes()
    setArt({ bytes: key, steps: 0, show: false })

    const timers: number[] = []
    let cancelled = false
    const wait = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)))

    const run = async () => {
      setBooting(true)
      play("lamp", { volume: 0.45 })
      await wait(520)
      if (cancelled) return
      setBooting(false)
      let s: Shake = { ...EMPTY, phase: "live" }
      const put = (patch: Partial<Shake>) => {
        s = { ...s, ...patch }
        setHs(s)
      }
      put({})
      for (let i = 0; i < HANDSHAKE.length; i++) {
        const line = HANDSHAKE[i]
        const human = line.kind !== "res"
        for (let c = 1; c <= line.text.length; c++) {
          if (cancelled) return
          put({ at: i, chars: s.chars.map((n, j) => (j === i ? c : n)) })
          if (line.kind === "cmd" && c % 3 === 1) play("type", { volume: 0.55 })
          await wait(human ? 26 + Math.random() * 34 : 7)
        }
        if (line.ok) {
          put({ ok: s.ok.map((v, j) => (j === i ? "spin" : v)) })
          if (i === 2) {
            // the key exchange: the bishop walks the session key while the spinner turns
            setArt({ bytes: key, steps: 0, show: true })
            await wait(140)
            for (let step = 1; step <= key.length * 4; step++) {
              if (cancelled) return
              setArt({ bytes: key, steps: step, show: true })
              await wait(11)
            }
            await wait(120)
          } else await wait(420)
          if (cancelled) return
          put({ ok: s.ok.map((v, j) => (j === i ? "ok" : v)) })
          play("tick")
        }
        await wait(i === 0 ? 280 : 160)
      }
      if (cancelled) return
      put({ phase: "open" })
      play("chime")
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        run()
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const bytes = cipherBytes(msg)
  const tail = bytes.slice(-96)
  const lastKey = bytes.length

  const send = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const body = msg.trim() ? `&body=${encodeURIComponent(msg.replace(/\r?\n/g, "\r\n"))}` : ""
    play("whoosh")
    setSent(true)
    gtag.event({ action: "contact_interaction", category: "engagement", label: "Secure channel send" })
    window.location.href = `mailto:${SUBJECT.email}?subject=${encodeURIComponent(MAIL_SUBJECT)}${body}`
  }

  const state = hs.phase === "open" ? "Open" : hs.phase === "live" ? "Handshake" : "Standby"

  return (
    <div ref={panel} className={`chan is-${hs.phase}${booting ? " is-booting" : ""}`}>
      <div className="chan-bar">
        <svg className="chan-lock" viewBox="0 0 12 14" aria-hidden="true">
          <path d="M3 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <rect x="1" y="6" width="10" height="7.5" rx="1" fill="currentColor" />
        </svg>
        <span className="mono chan-title">Secure channel</span>
        <span className="chan-bar-rule" aria-hidden="true" />
        <span className="mono chan-state" aria-hidden="true">
          <i /> {state}
        </span>
      </div>

      <div className="chan-screen">
        <div className="chan-log" aria-hidden="true">
          <div className="chan-lines">
            {HANDSHAKE.map((line, i) => {
              const n = hs.chars[i]
              const typedAll = n >= line.text.length
              const visible = hs.phase !== "idle" && (line.kind === "cmd" || n > 0)
              const caret =
                hs.phase === "idle"
                  ? i === 0
                  : hs.phase === "open"
                    ? i === HANDSHAKE.length - 1 && !focused
                    : hs.at === i && !(line.ok && typedAll)
              const full = (
                <>
                  {line.kind === "cmd" && <span className="chan-p">$ </span>}
                  {line.text}
                  {line.ok && (
                    <>
                      <span className="chan-dim"> … </span>
                      <span className="chan-ok">ok</span>
                    </>
                  )}
                </>
              )
              return (
                <p key={i} className={`chan-line chan-${line.kind}`}>
                  <span className="chan-ghost">{full}</span>
                  <span className="chan-live">
                    {visible && (
                      <>
                        {line.kind === "cmd" && <span className="chan-p">$ </span>}
                        {line.text.slice(0, n)}
                        {line.ok && typedAll && hs.ok[i] !== "wait" && (
                          <>
                            <span className="chan-dim"> … </span>
                            {hs.ok[i] === "spin" ? <Spinner /> : <span className="chan-ok">ok</span>}
                          </>
                        )}
                      </>
                    )}
                    {caret && <i className="chan-caret" />}
                  </span>
                </p>
              )
            })}
            {sent && (
              <p className="chan-line chan-sent">
                <span className="chan-p">→ </span>handing your message to your mail app. nothing was sent from this page.
              </p>
            )}
          </div>
          <RandomArt bytes={art.bytes} steps={art.steps} show={art.show} />
        </div>
        <p className="fin-sr">
          Contact form. A simulated secure-channel handshake plays above it. Sending opens a normal email in your own mail
          app.
        </p>
        <p className="fin-sr" role="status">
          {sent ? "Opening your mail app with your message." : ""}
        </p>

        <form className="chan-form" action={`mailto:${SUBJECT.email}`} method="get" onSubmit={send}>
          <input type="hidden" name="subject" value={MAIL_SUBJECT} />
          <label htmlFor="chan-msg" className="mono chan-label">
            Message to Harish
          </label>
          <div className="chan-field">
            <span className="chan-prompt" aria-hidden="true">
              ›
            </span>
            <textarea
              id="chan-msg"
              name="body"
              rows={4}
              maxLength={2000}
              placeholder="Write a message…"
              value={msg}
              aria-describedby="chan-note"
              onChange={(e) => {
                setMsg(e.target.value)
                play("type", { volume: 0.5 })
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  const form = e.currentTarget.form
                  if (!form) return
                  if (typeof form.requestSubmit === "function") form.requestSubmit()
                  else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
                }
              }}
            />
          </div>

          <div className="chan-cipher" aria-hidden="true">
            <span className="mono chan-cipher-k">Ciphertext</span>
            <span className="chan-cipher-out">
              {tail.length ? (
                <span>
                  {tail.slice(0, -1).join(" ")}
                  {tail.length > 1 ? " " : ""}
                  <b key={lastKey}>{tail[tail.length - 1]}</b>
                </span>
              ) : (
                <span className="chan-cipher-idle">awaiting plaintext</span>
              )}
            </span>
            <span className="mono chan-bytes">{bytes.length} B</span>
          </div>

          <div className="chan-foot">
            <p id="chan-note" className="chan-note">
              Just for show: this opens a normal email
            </p>
            <span className="chan-actions">
              <span className="mono chan-hint">⌘/Ctrl + Enter</span>
              <button type="submit" className="chan-send" data-cursor="Send">
                Send <span aria-hidden="true">→</span>
              </button>
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============ CONTACT ============

export function Contact() {
  const [copied, setCopied] = useState(false)
  const eof = useRef<HTMLElement>(null)
  const [scanned, setScanned] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SUBJECT.email)
      setCopied(true)
      play("tick")
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${SUBJECT.email}`
    }
    gtag.event({ action: "contact_interaction", category: "engagement", label: "Copy email" })
  }

  // End of file: the barcode is scanned and the stamp lands with a thunk
  useEffect(() => {
    const el = eof.current
    if (!el || typeof IntersectionObserver === "undefined") return
    let t = 0
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        setScanned(true)
        t = window.setTimeout(() => play("stamp", { volume: 0.8 }), 160)
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearTimeout(t)
    }
  }, [])

  const ext = (label: string) => () => gtag.event({ action: "external_link_click", category: "engagement", label })

  return (
    <section id="contact" className="page ops contact" aria-label="Contact">
      <SectionHead
        id="contact"
        tone="ops"
        title={
          <>
            Got a threat to model,
            <br />
            or a product to ship?
            <br />
            <span className="contact-em">
              Let&apos;s talk.
              <span className="contact-caret" aria-hidden="true" />
            </span>
          </>
        }
      />

      <div className="contact-email-row">
        <a
          className="contact-email"
          href={`mailto:${SUBJECT.email}`}
          data-cursor="Write"
          onClick={() => gtag.event({ action: "contact_interaction", category: "engagement", label: "Email CTA" })}
        >
          <Scramble text={SUBJECT.email} duration={1400} />
        </a>
        <button className="contact-copy mono" onClick={copy} aria-live="polite">
          {copied ? "Copied ✓" : "Copy address"}
        </button>
      </div>

      <div className="cx-main">
        <PenNote arrow="down" rotate={-4} className="cx-pen-sm">
          type something, watch it scramble
        </PenNote>
        <SecureChannel />

        <div className="cx-side">
          <dl className="cx-details">
            <div className="cx-row">
              <dt className="mono">Elsewhere</dt>
              <dd className="cx-links">
                <a href={SUBJECT.linkedin} target="_blank" rel="noopener noreferrer" onClick={ext("LinkedIn")}>
                  LinkedIn <span aria-hidden="true">↗</span>
                </a>
                <a href={SUBJECT.github} target="_blank" rel="noopener noreferrer" onClick={ext("GitHub")}>
                  GitHub <span aria-hidden="true">↗</span>
                </a>
              </dd>
            </div>
            <div className="cx-row">
              <dt className="mono">Résumé</dt>
              <dd className="cx-links">
                <a
                  href={SUBJECT.resume}
                  download
                  onClick={() => gtag.event({ action: "resume_download", category: "engagement", label: "Contact" })}
                >
                  Download résumé, PDF <span aria-hidden="true">↓</span>
                </a>
              </dd>
            </div>
            <div className="cx-row">
              <dt className="mono">Location</dt>
              <dd>
                <span className="cx-v">{SUBJECT.location}, Canada</span>
                <span className="mono cx-coords">{SUBJECT.coords}</span>
              </dd>
            </div>
            <div className="cx-row">
              <dt className="mono">Availability</dt>
              <dd>
                <span className="cx-v">
                  <span className="pulse" aria-hidden="true" />
                  Open to security engineering, threat intelligence and software roles.
                </span>
              </dd>
            </div>
          </dl>
          <PenNote arrow="left" arrowFirst rotate={-3} className="cx-pen">
            type something, watch it scramble
          </PenNote>
        </div>
      </div>

      <footer className={`eof${scanned ? " is-scanned" : ""}`} ref={eof}>
        <div className="eof-left">
          <span className="eof-code">
            <svg className="barcode" viewBox={`0 0 ${BARS.length * 4} 40`} aria-hidden="true" preserveAspectRatio="none">
              {BARS.reduce<{ x: number; els: React.ReactNode[] }>(
                (acc, w, i) => {
                  if (i % 2 === 0) acc.els.push(<rect key={i} x={acc.x} y="0" width={w} height="40" />)
                  acc.x += w + 1
                  return acc
                },
                { x: 0, els: [] },
              ).els}
            </svg>
            <span className="eof-scan" aria-hidden="true" />
          </span>
          <span className="mono">
            {SUBJECT.fileNo} · {PAGE_COUNT} pages · © {new Date().getFullYear()} {SUBJECT.name}
          </span>
        </div>
        <Stamp tone="lime" rotate={-6} className="eof-stamp">
          End of file
        </Stamp>
        <button
          className="mono eof-top"
          onClick={() => {
            play("whoosh")
            jump("cover")
          }}
        >
          Back to top ↑
        </button>
      </footer>
    </section>
  )
}
