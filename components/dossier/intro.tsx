"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { dossier } from "./store"
import { lockScroll } from "./smooth-scroll"
import { Stamp } from "./primitives"
import { SUBJECT, PAGE_COUNT } from "@/lib/dossier"

type Phase = "closed" | "stamped" | "open" | "gone"

/** A manila folder that gets stamped and flipped open. Plays once per session. */
export function Intro() {
  const [phase, setPhase] = useState<Phase>("closed")
  const done = useRef(false)

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    setPhase("gone")
    lockScroll(false)
    try {
      sessionStorage.setItem("hs-intro", "1")
    } catch {}
    // let the overlay start lifting before the hero bars retract
    setTimeout(() => dossier.finishIntro(), 250)
  }, [])

  useEffect(() => {
    // the CSS failsafe has already faded the overlay by ~8s on slow connections
    if (document.documentElement.dataset.intro === "skip" || performance.now() > 7000) {
      done.current = true
      setPhase("gone")
      dossier.finishIntro()
      return
    }
    lockScroll(true)
    const timers = [
      setTimeout(() => setPhase("stamped"), 650),
      setTimeout(() => setPhase("open"), 1500),
      setTimeout(finish, 2350),
    ]
    const onKey = () => finish()
    window.addEventListener("keydown", onKey)
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener("keydown", onKey)
    }
  }, [finish])

  return (
    <AnimatePresence>
      {phase !== "gone" && (
        <motion.div
          className="intro"
          onClick={finish}
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          initial={{ clipPath: "inset(0% 0% 0% 0%)" }}
          transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
          aria-hidden="true"
        >
          <div className="intro-status mono">
            <span>Retrieving file {SUBJECT.fileNo}</span>
            <span className="intro-status-r">{phase === "closed" ? "Verifying clearance…" : "Access granted"}</span>
          </div>

          <div className="folder">
            <div className="folder-back">
              <span className="folder-tab mono">{SUBJECT.fileNo}</span>
              <div className="folder-paper">
                <span className="mono">Subject dossier · {PAGE_COUNT} pages</span>
                <strong>Harish Sivaram</strong>
                <span className="mono">{SUBJECT.title}</span>
                <span className="folder-paper-lines" />
              </div>
            </div>

            <motion.div
              className="folder-front"
              initial={{ rotateY: 0 }}
              animate={{ rotateY: phase === "open" ? -172 : 0 }}
              transition={{ duration: 0.95, ease: [0.65, 0, 0.25, 1] }}
            >
              <div className="folder-face folder-face-out">
                <span className="folder-tab mono">{SUBJECT.fileNo}</span>
                <div className="folder-label">
                  <span className="mono">File no.</span>
                  <b>{SUBJECT.fileNo}</b>
                  <span className="mono">Subject</span>
                  <b>SIVARAM, H.</b>
                  <span className="mono">Dept.</span>
                  <b>Cyber · Engineering</b>
                </div>
                <span className="folder-confidential">Confidential</span>
                <Stamp tone="red" rotate={-12} play={phase !== "closed"} className="folder-stamp">
                  Declassified
                </Stamp>
              </div>
              <div className="folder-face folder-face-in" />
            </motion.div>
          </div>

          <button className="intro-skip mono" onClick={finish} tabIndex={-1}>
            Skip ↵
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
