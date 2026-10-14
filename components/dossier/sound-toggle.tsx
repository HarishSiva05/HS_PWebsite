"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { isSoundOn, play, setSoundOn, subscribeSound } from "@/lib/sound"
import { surfaceLuminance } from "./fingerprints"
import "@/styles/finale.css"

// Sound on/off: a small index tab on the left edge of the file, below the page rail. It sits in
// the page gutter, so it never covers text or the nav, and it reads the surface beneath it to
// stay quiet on paper and on the dark sections alike. Off by default; the choice persists.

export default function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, isSoundOn, () => false)
  const ref = useRef<HTMLButtonElement>(null)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let timer = 0
    const sample = () => {
      timer = 0
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      const under = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((n) => !el.contains(n))
      setDark(surfaceLuminance(under ?? null) < 0.4)
    }
    const queue = () => {
      if (!timer) timer = window.setTimeout(sample, 90)
    }
    sample()
    window.addEventListener("scroll", queue, { passive: true })
    window.addEventListener("resize", queue)
    return () => {
      window.removeEventListener("scroll", queue)
      window.removeEventListener("resize", queue)
      window.clearTimeout(timer)
    }
  }, [])

  const toggle = () => {
    const next = !isSoundOn()
    setSoundOn(next)
    // the first play() after switching on creates the audio context, inside this click
    if (next) play("lamp")
  }

  return (
    <button
      ref={ref}
      type="button"
      className={`snd${on ? " is-on" : ""}${dark ? " is-dark" : ""}`}
      aria-pressed={on}
      onClick={toggle}
      data-cursor={on ? "Mute" : "Sound"}
      data-no-prints=""
    >
      <span className="snd-label">
        Sound<span aria-hidden="true"> {on ? "on" : "off"}</span>
      </span>
      <span className="snd-eq" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </button>
  )
}
