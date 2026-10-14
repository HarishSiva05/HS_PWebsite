"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { dossier } from "./store"
import { lockScroll } from "./smooth-scroll"
import { startDust, type DustState } from "./intro-dust"
import { play } from "@/lib/sound"
import { PAGE_COUNT, SUBJECT } from "@/lib/dossier"
import "@/styles/intro.css"

const pad = (n: number) => String(n).padStart(2, "0")
const stampTime = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

// Ink thrown off the stamp on impact: x/y in % of the speck box, r in px at a 600px folder.
const SPECKS = [
  { x: 4, y: 8, r: 3.4 },
  { x: 97, y: 2, r: 2.2 },
  { x: -3, y: 78, r: 1.7 },
  { x: 101, y: 92, r: 3.8 },
  { x: 46, y: -14, r: 1.5 },
  { x: 30, y: 112, r: 2.5 },
  { x: 78, y: 116, r: 1.3 },
  { x: -9, y: 40, r: 1.2 },
  { x: 108, y: 44, r: 1.9 },
  { x: 62, y: -10, r: 1.1 },
  { x: 14, y: 104, r: 1.4 },
]

// The film, in seconds after the lamp clicks on.
const T = { type: 0.3, clear: 0.62, grant: 1.42, push: 1.52, stamp: 2.56, open: 3.02, dive: 3.6 }

/**
 * Cold open, first visit per session only. A desk lamp clicks on over File HS-0519; the
 * folder lifts to camera, gets stamped DECLASSIFIED, swings open on the subject's first
 * page, and the camera dives into that page while the real hero resolves underneath.
 * Click, any key or the wheel fast-forwards to the end; nothing can keep a visitor here
 * past ~9s (JS failsafe at 7.6s, CSS failsafe on .intro at 9s).
 */
export function Intro() {
  const [gone, setGone] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const rig = useRef<HTMLDivElement>(null)
  const camera = useRef<HTMLDivElement>(null)
  const desk = useRef<HTMLDivElement>(null)
  const deskShadow = useRef<HTMLDivElement>(null)
  const folder = useRef<HTMLDivElement>(null)
  const cover = useRef<HTMLDivElement>(null)
  const outShade = useRef<HTMLSpanElement>(null)
  const inShade = useRef<HTMLSpanElement>(null)
  const sheen = useRef<HTMLSpanElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const pageName = useRef<HTMLElement>(null)
  const pageShade = useRef<HTMLSpanElement>(null)
  const stamp = useRef<HTMLSpanElement>(null)
  const specks = useRef<HTMLSpanElement>(null)
  const air = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const hud = useRef<HTMLDivElement>(null)
  const typed = useRef<HTMLSpanElement>(null)
  const clear = useRef<HTMLSpanElement>(null)
  const clearVal = useRef<HTMLElement>(null)
  const tc = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (document.documentElement.dataset.intro === "skip") {
      setGone(true)
      dossier.finishIntro()
      return
    }
    const el = root.current
    const cam = camera.current
    const fold = folder.current
    const dk = desk.current
    const cv = cover.current
    if (!el || !cam || !fold || !dk || !cv) return

    lockScroll(true)
    const W = window.innerWidth
    const H = window.innerHeight
    const fw = fold.offsetWidth
    const focus = document.querySelector<HTMLElement>("[data-intro-focus]")
    if (focus) gsap.set(focus, { filter: "blur(16px)", scale: 1.06, transformOrigin: "50% 40%" })

    // ---- state the tweens drive ----
    const dust: DustState = { lamp: 0, push: 0, fade: 1 }
    const L = { v: 0 }
    const setLamp = () => {
      el.style.setProperty("--lamp", L.v.toFixed(3))
      dust.lamp = L.v
    }
    // portrait screens get a bigger, higher folder; landscape keeps more desk in frame
    const portrait = H > W * 1.15
    const deskY = H * (portrait ? 0.045 : 0.09)
    const F = { x: 0, y: deskY, z: 0, rx: 58, rz: -10, s: portrait ? 0.7 : 0.58 }
    // once open, slide over so the open cover stays in frame (phones keep the page centred instead)
    const slideTo = W < 720 ? 0 : Math.max(0, Math.min(fw * 0.22, (W - fw) / 2))
    const setF = () => {
      fold.style.transform = `translate3d(${F.x.toFixed(2)}px,${F.y.toFixed(2)}px,${F.z.toFixed(2)}px) rotateX(${F.rx.toFixed(3)}deg) rotateZ(${F.rz.toFixed(3)}deg) scale(${F.s.toFixed(4)})`
    }
    const D = { z: 0, blur: 0, b: 1 }
    const setD = () => {
      dk.style.transform = `translate3d(0,${deskY.toFixed(2)}px,${(-D.z).toFixed(1)}px) rotateX(58deg)`
      dk.style.filter =
        D.blur > 0.05 ? `blur(${D.blur.toFixed(2)}px) brightness(${D.b.toFixed(3)})` : D.b < 0.999 ? `brightness(${D.b.toFixed(3)})` : ""
    }
    const C = { a: 0 }
    const setC = () => {
      const a = C.a
      cv.style.transform = `translateZ(1px) rotateY(${(-a).toFixed(2)}deg)`
      const k = Math.min(1, a / 90)
      if (outShade.current) outShade.current.style.opacity = (Math.pow(k, 1.5) * 0.9).toFixed(3)
      if (inShade.current) inShade.current.style.opacity = a > 90 ? (0.92 - ((a - 90) / 76) * 0.6).toFixed(3) : "0.92"
      if (sheen.current) {
        sheen.current.style.opacity = (Math.sin(Math.min(1, a / 80) * Math.PI) * 0.9).toFixed(3)
        sheen.current.style.backgroundPosition = `${(100 - a * 1.1).toFixed(1)}% 0`
      }
      if (pageShade.current) pageShade.current.style.opacity = (Math.sin((Math.min(a, 166) / 180) * Math.PI) * 0.9).toFixed(3)
    }
    setF()
    setD()
    setLamp()
    if (deskShadow.current) {
      deskShadow.current.style.transform = `translate(-50%,-50%) translate(4px,10px) rotate(-10deg) scale(${F.s})`
    }

    const stopDust = canvas.current ? startDust(canvas.current, dust) : () => {}

    // ---- ending ----
    let finished = false
    let removed = false
    let diving = false
    let clock = 0
    let detach = () => {}
    const finish = () => {
      if (finished) return
      finished = true
      try {
        sessionStorage.setItem("hs-intro", "1")
      } catch {}
      dossier.finishIntro()
    }
    const remove = () => {
      if (removed) return
      removed = true
      finish()
      detach()
      stopDust()
      window.clearInterval(clock)
      lockScroll(false)
      setGone(true)
    }

    /** The camera dives into the page (or, when skipping early, into whatever is in frame). */
    const dive = (fast: boolean) => {
      if (diving) return
      diving = true
      play("whoosh")
      const open = C.a > 110
      const target = open ? pageName.current : fold
      // aim where the page will be once the folder's slide has finished
      const dx = open ? slideTo - F.x : 0
      const r = (target ?? fold).getBoundingClientRect()
      const ox = r.left + r.width / 2 + dx
      const oy = r.top + r.height / 2
      let sCover = 2.2
      if (open && page.current) {
        const p = page.current.getBoundingClientRect()
        sCover =
          Math.max(
            ox / Math.max(1, ox - p.left - dx),
            (W - ox) / Math.max(1, p.right + dx - ox),
            oy / Math.max(1, oy - p.top),
            (H - oy) / Math.max(1, p.bottom - oy),
          ) * 1.14
      }
      // the camera has not moved yet, so its origin can be set without a jump
      gsap.set(cam, { transformOrigin: `${ox.toFixed(1)}px ${oy.toFixed(1)}px` })
      const dur = fast ? 0.62 : 0.95
      const sEnd = fast ? 2.4 : sCover * 2.1
      const fadeAt = fast ? 0.16 : dur * Math.sqrt((sCover - 1) / (sEnd - 1))
      const fadeDur = fast ? 0.46 : 0.32
      const d = gsap.timeline()
      d.to(cam, { scale: sEnd, duration: dur, ease: "power2.in" }, 0)
      const chrome = [hud.current, air.current].filter(Boolean)
      if (chrome.length) d.to(chrome, { opacity: 0, duration: 0.3, ease: "power1.out" }, 0)
      d.to(dust, { push: 1, fade: 0, duration: 0.5, ease: "power1.in" }, 0)
      if (focus) {
        d.to(
          focus,
          { filter: "blur(0px)", scale: 1, duration: 0.9, ease: "power2.out", clearProps: "filter,transform,transformOrigin" },
          Math.max(0, fadeAt - 0.2),
        )
      }
      d.to(el, { opacity: 0, duration: fadeDur, ease: "power1.out" }, fadeAt)
      d.call(finish, undefined, fadeAt + fadeDur * 0.55)
      d.call(remove, undefined, Math.max(dur, fadeAt + fadeDur) + 0.03)
    }

    // ---- the film ----
    const tl = gsap.timeline({ delay: 0.22, paused: true })

    // 1. the lamp clicks on and the bulb warms up
    tl.call(() => play("lamp"), undefined, 0)
    tl.to(
      L,
      {
        keyframes: [
          { v: 0.88, duration: 0.05, ease: "power4.out" },
          { v: 0.16, duration: 0.07, ease: "none" },
          { v: 0.94, duration: 0.06, ease: "power2.out" },
          { v: 0.52, duration: 0.08, ease: "none" },
          { v: 1, duration: 0.34, ease: "power2.out" },
        ],
        onUpdate: setLamp,
      },
      0,
    )
    // a slow settle of the folder on the desk while we look at it
    tl.to(F, { rz: -8.8, duration: 1.5, ease: "sine.inOut", onUpdate: setF }, 0)

    // 2. the status line types itself
    const head = `Incoming · File ${SUBJECT.fileNo} · `
    const text = head + stampTime(new Date())
    const ty = { n: 0 }
    let shown = 0
    tl.to(
      ty,
      {
        n: text.length,
        duration: text.length * 0.019,
        ease: "none",
        onUpdate: () => {
          const n = Math.round(ty.n)
          if (n === shown || !typed.current) return
          shown = n
          typed.current.textContent = text.slice(0, n)
          if (n % 5 === 0) play("type", { volume: 0.4 })
        },
        onComplete: () => {
          typed.current?.classList.add("is-done")
          clock = window.setInterval(() => {
            if (typed.current) typed.current.textContent = head + stampTime(new Date())
          }, 1000)
        },
      },
      T.type,
    )
    tl.call(() => clear.current?.classList.add("is-on"), undefined, T.clear)
    tl.call(
      () => {
        const v = clearVal.current
        if (!v) return
        v.textContent = "Granted"
        v.classList.remove("ci-dots")
        v.classList.add("is-granted")
        play("tick")
      },
      undefined,
      T.grant,
    )

    // 3. push-in: the folder lifts and turns to face us, the desk falls away into blur and dark
    tl.to(F, { x: 0, y: -H * 0.012, z: 40, rx: 0, rz: -1.6, s: 1, duration: 0.98, ease: "power3.inOut", onUpdate: setF }, T.push)
    // (no blur on small screens: a filter on a plane this size is too heavy for phones)
    tl.to(D, { z: 420, blur: W < 720 ? 0 : 10, b: 0.2, duration: 1.05, ease: "power2.inOut", onUpdate: setD }, T.push)
    tl.to(deskShadow.current, { opacity: 0, duration: 0.45, ease: "power1.out" }, T.push)
    tl.to(dust, { push: 1, duration: 1.15, ease: "power2.in" }, T.push)
    tl.to(air.current, { opacity: 0.4, duration: 0.9, ease: "power1.inOut" }, T.push + 0.1)

    // 4. the stamp slams down; the frame shakes, the lamp shudders, ink spatters
    const hit = T.stamp + 0.17
    tl.fromTo(
      stamp.current,
      { opacity: 0, scale: 2.4, rotate: -17 },
      { opacity: 1, scale: 1, rotate: -9, duration: 0.17, ease: "power4.in" },
      T.stamp,
    )
    tl.call(() => play("stamp"), undefined, hit)
    tl.to(rig.current, { keyframes: { x: [0, -7, 6, -4, 2, 0], y: [0, 5, -4, 3, -1, 0] }, duration: 0.16, ease: "none" }, hit)
    tl.to(L, { keyframes: [{ v: 0.82, duration: 0.04 }, { v: 1, duration: 0.2 }], onUpdate: setLamp }, hit)
    if (specks.current) {
      tl.fromTo(
        specks.current.children,
        { opacity: 0, scale: 0.2 },
        { opacity: 0.9, scale: 1, duration: 0.16, ease: "power3.out", stagger: { each: 0.007, from: "random" } },
        hit,
      )
    }

    // 5. the cover swings open on the first page; the folder slides over to keep the frame balanced
    tl.call(() => play("paper"), undefined, T.open)
    tl.to(C, { a: 166, duration: 0.86, ease: "power2.inOut", onUpdate: setC }, T.open)
    tl.to(F, { x: slideTo, rz: -0.6, duration: 0.72, ease: "power2.inOut", onUpdate: setF }, T.open)

    // 6. the dive
    tl.call(() => dive(false), undefined, T.dive)

    // timecode, 24 fps
    tl.eventCallback("onUpdate", () => {
      if (!tc.current) return
      const t = tl.time()
      tc.current.textContent = `00:00:${pad(Math.floor(t))}:${pad(Math.floor((t % 1) * 24))}`
    })

    const skip = () => {
      if (diving || removed) return
      tl.kill()
      dive(true)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      skip()
    }

    // a late hydration (slow phone) gets the short version, never a 5s film at second 6
    if (performance.now() > 5200) {
      setLamp()
      requestAnimationFrame(() => skip())
    } else tl.play()

    window.addEventListener("keydown", onKey)
    window.addEventListener("wheel", skip, { passive: true })
    window.addEventListener("touchmove", skip, { passive: true })
    el.addEventListener("pointerdown", skip)
    const failsafe = window.setTimeout(skip, Math.max(0, 7600 - performance.now()))
    detach = () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("wheel", skip)
      window.removeEventListener("touchmove", skip)
      el.removeEventListener("pointerdown", skip)
      window.clearTimeout(failsafe)
    }

    return () => {
      tl.kill()
      detach()
      window.clearInterval(clock)
      stopDust()
      if (!removed) {
        lockScroll(false)
        if (focus) gsap.set(focus, { clearProps: "filter,transform,transformOrigin" })
      }
    }
  }, [])

  if (gone) return null

  return (
    <div className="intro ci" ref={root} aria-hidden="true" data-cursor="Skip">
      <div className="ci-rig" ref={rig}>
        <div className="ci-camera" ref={camera}>
          <div className="ci-desk" ref={desk}>
            <span className="ci-blotter" />
            <span className="ci-sheet" />
            <span className="ci-pencil" />
            <div className="ci-desk-shadow" ref={deskShadow} />
            <div className="ci-pool" />
          </div>

          <div className="ci-folder" ref={folder}>
            <div className="ci-back">
              <span className="ci-tab mono">{SUBJECT.fileNo}</span>
              <span className="ci-stack" />
              <div className="ci-page" ref={page}>
                <div className="ci-page-strip mono">
                  <span>File no. {SUBJECT.fileNo}</span>
                  <span>
                    <s>Restricted</s> <b>Declassified</b>
                  </span>
                  <span>Page 01 / {pad(PAGE_COUNT)}</span>
                </div>
                <span className="mono ci-page-eyebrow">Subject /</span>
                <strong className="ci-page-name" ref={pageName}>
                  <span>Harish</span>
                  <span>Sivaram</span>
                </strong>
                <span className="ci-page-tag">
                  Threat analyst by <i>training</i>. Engineer by <i>trade</i>.
                </span>
                <span className="ci-page-fields">
                  <i style={{ ["--w" as string]: "74%" }} />
                  <i style={{ ["--w" as string]: "88%" }} />
                  <i style={{ ["--w" as string]: "68%" }} />
                  <i style={{ ["--w" as string]: "52%" }} />
                </span>
                <span className="ci-page-shade" ref={pageShade} />
              </div>
            </div>

            <div className="ci-cover" ref={cover}>
              <div className="ci-face ci-face-out">
                <span className="ci-tab mono">{SUBJECT.fileNo}</span>
                <div className="ci-label">
                  <span className="mono">File no.</span>
                  <b>{SUBJECT.fileNo}</b>
                  <span className="mono">Subject</span>
                  <b>SIVARAM, H.</b>
                  <span className="mono">Dept.</span>
                  <b>Cyber · Engineering</b>
                </div>
                <span className="ci-confidential">Confidential</span>
                <span className="ci-ring" />
                <span className="stamp stamp-red ci-stamp" ref={stamp}>
                  <span className="stamp-inner">Declassified</span>
                </span>
                <span className="ci-specks" ref={specks}>
                  {SPECKS.map((s, i) => (
                    <i
                      key={i}
                      style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: `calc(var(--fw) * ${(s.r * 2) / 600})`,
                        height: `calc(var(--fw) * ${(s.r * 1.7) / 600})`,
                      }}
                    />
                  ))}
                </span>
                <span className="ci-sheen" ref={sheen} />
                <span className="ci-shade" ref={outShade} />
              </div>
              <div className="ci-face ci-face-in">
                <span className="ci-shade" ref={inShade} style={{ opacity: 0.92 }} />
              </div>
            </div>
          </div>
        </div>

        <div className="ci-dark" />
        <div className="ci-air" ref={air}>
          <div className="ci-bulb" />
          <div className="ci-beam" />
          <canvas className="ci-dust" ref={canvas} />
        </div>
        <div className="ci-vignette" />
      </div>

      <div className="ci-hud" ref={hud}>
        <div className="ci-status">
          <span className="mono ci-typed" ref={typed} />
          <span className="mono ci-clear" ref={clear}>
            Clearance · <b className="ci-dots" ref={clearVal}>Verifying</b>
          </span>
        </div>
        <span className="mono ci-tc">
          <i>●</i> Rec <span ref={tc}>00:00:00:00</span>
        </span>
        <button className="mono ci-skip" type="button" tabIndex={-1}>
          Skip intro <kbd>any key</kbd>
        </button>
      </div>
    </div>
  )
}
