"use client"

import { useRef } from "react"
import { motion, useScroll, useSpring } from "framer-motion"
import { Redact, Reveal, SectionHead, Stamp } from "./primitives"
import { AWARDS, CERTIFICATIONS, EDUCATION, EXPERIENCE, TRAINING, sectionName } from "@/lib/dossier"
import { useEffect } from "react"
import { play } from "@/lib/sound"
import "@/styles/finale.css"

export function Record() {
  const line = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: line, offset: ["start 75%", "end 60%"] })
  const draw = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <section id="record" className="page record-sec" aria-label={sectionName("record")}>
      <SectionHead
        id="record"
        title={
          <>
            Experience,{" "}
            <Redact block delay={80}>
              on record.
            </Redact>
          </>
        }
        kicker="Employment, security training and education, most recent first."
      />

      <div className="record-grid">
        <div className="record-label">
          <span className="mono">A / Employment</span>
        </div>
        <ol className="timeline" ref={line}>
          <motion.span className="timeline-line" style={{ scaleY: draw }} aria-hidden="true" />
          {EXPERIENCE.map((x, i) => (
            <Reveal as="li" key={x.id} className="tl-item" delay={i * 0.05}>
              <span id={`rec-${x.id}`} className="anchor" />
              <span className="tl-dot" aria-hidden="true" />
              <div className="tl-when mono">
                <span>{x.period}</span>
                <span>{x.meta}</span>
              </div>
              <div className="tl-body">
                <h3>
                  {x.role} <span className="tl-at">at</span> <span className="tl-org">{x.org}</span>
                </h3>
                <ul>
                  {x.points.map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </ol>

        <div className="record-label">
          <span className="mono">B / Security training &amp; labs</span>
        </div>
        <div className="ops-grid">
          {TRAINING.map((t, i) => (
            <Reveal as="article" key={t.id} className="op-card" delay={i * 0.08}>
              <span id={`rec-${t.id}`} className="anchor" />
              <div className="op-top mono">
                <span className="op-live">
                  <i /> {t.meta}
                </span>
                <span>{t.period}</span>
              </div>
              <h3>{t.role}</h3>
              <span className="op-org mono">{t.org}</span>
              {t.points.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </Reveal>
          ))}
        </div>

        <div className="record-label">
          <span className="mono">C / Education</span>
        </div>
        <div className="edu-grid">
          {EDUCATION.map((e, i) => (
            <Reveal as="article" key={e.degree} className={`edu-card ${i === 0 ? "is-primary" : ""}`} delay={i * 0.08}>
              <div className="edu-top mono">
                <span>{e.period}</span>
                <span className="edu-grade">{e.grade}</span>
              </div>
              <h3>{e.degree}</h3>
              <span className="edu-school">{e.school}</span>
              <p>{e.detail}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ COMMENDATIONS ============

function Seal({ ring, issuer, year, tone, idx }: { ring: string; issuer: string; year: string; tone: string; idx: number }) {
  const id = `seal-path-${idx}`
  return (
    <svg className={`seal seal-${tone}`} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id={id} d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" />
      </defs>
      <circle cx="100" cy="100" r="96" className="seal-edge" />
      <circle cx="100" cy="100" r="90" className="seal-rim" />
      <circle cx="100" cy="100" r="58" className="seal-rim" />
      <g className="seal-ring">
        <text>
          <textPath href={`#${id}`} textLength={2 * Math.PI * 74 - 6}>
            {ring}
          </textPath>
        </text>
      </g>
      <text x="100" y="98" textAnchor="middle" className="seal-issuer">
        {issuer}
      </text>
      <text x="100" y="122" textAnchor="middle" className="seal-year">
        ★ {year} ★
      </text>
    </svg>
  )
}

const SEAL_TONES = ["ink", "red", "ink", "red"]

// Each seal is stamped onto the page as it scrolls into view, one after another: it drops in
// big and faint, slams down with a hard ease, the row jolts, the ink bleeds in sharp. The seals
// are server-rendered in place, so without JS or with reduced motion they simply sit there.
const STAMP_GAP = 240
const DROP_MS = 380
const DROP = "cubic-bezier(0.6, 0, 0.92, 0.42)" // accelerates into the paper
const SETTLE = "cubic-bezier(0.2, 0.7, 0.2, 1)"
const JOLT: Keyframe[] = [
  { translate: "0 0" },
  { translate: "-1px 3px", offset: 0.16 },
  { translate: "1.5px -1.5px", offset: 0.4 },
  { translate: "-0.5px 0.75px", offset: 0.68 },
  { translate: "0 0" },
]

function useSealStamps(list: React.RefObject<HTMLUListElement | null>) {
  useEffect(() => {
    const ul = list.current
    if (!ul || typeof IntersectionObserver === "undefined" || typeof ul.animate !== "function") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const items = Array.from(ul.querySelectorAll<HTMLElement>(".seal-item"))
    const anims: Animation[] = []
    const timers: number[] = []
    const queue: HTMLElement[] = []
    let next = 0
    const keep = (a: Animation) => {
      anims.push(a)
      return a
    }
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms))

    items.forEach((li) => li.classList.add("is-pending"))

    const stamp = (li: HTMLElement) => {
      const i = items.indexOf(li)
      const press = li.querySelector<HTMLElement>(".seal-press")
      const shadow = li.querySelector<HTMLElement>(".seal-shadow")
      const burst = li.querySelector<HTMLElement>(".seal-burst")
      const cap = li.querySelector<HTMLElement>(".seal-cap")
      if (!press) return
      const own: Animation[] = []
      const run = (el: Element | null, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
        if (!el) return null
        const a = keep(el.animate(frames, opts))
        own.push(a)
        return a
      }
      const tilt = i % 2 ? 10 : -12

      const drop = run(
        press,
        [
          { opacity: 0, transform: `translate3d(0, -16px, 0) scale(2.2) rotate(${tilt}deg)`, filter: "blur(7px)" },
          { opacity: 1, offset: 0.62 },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)", filter: "blur(2.6px)" },
        ],
        { duration: DROP_MS, easing: DROP, fill: "both" },
      )
      run(
        shadow,
        [
          { opacity: 0, transform: "scale(1.7)" },
          { opacity: 0.55, transform: "scale(1.03)" },
        ],
        { duration: DROP_MS, easing: DROP, fill: "both" },
      )

      drop?.finished
        .then(() => {
          play("stamp")
          run(
            press,
            [
              { transform: "scale(1.015)", filter: "blur(2.6px)" },
              { transform: "scale(1)", filter: "blur(0px)" },
            ],
            { duration: 460, easing: SETTLE, fill: "both" },
          )
          run(shadow, [{ opacity: 0.55 }, { opacity: 0 }], { duration: 220, easing: "ease-out", fill: "both" })
          run(
            burst,
            [
              { opacity: 0.55, transform: "scale(0.94)" },
              { opacity: 0, transform: "scale(1.32)" },
            ],
            { duration: 620, easing: SETTLE, fill: "both" },
          )
          run(
            cap,
            [
              { opacity: 0, transform: "translateY(12px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 620, delay: 80, easing: SETTLE, fill: "both" },
          )
          li.classList.remove("is-pending")
          // the whole row takes the hit (translate, so the multiply blend is never isolated)
          const top = li.offsetTop
          items
            .filter((it) => Math.abs(it.offsetTop - top) < 8)
            .forEach((it) => {
              it.querySelectorAll(".seal-press, .seal-cap").forEach((el) => {
                keep(el.animate(JOLT, { duration: 300, easing: "ease-out" }))
              })
            })
          // hand the seal back to CSS (hover spin and tilt) once the ink has settled
          later(() => own.forEach((a) => a.cancel()), 760)
        })
        .catch(() => {})
    }

    const pump = () => {
      const now = performance.now()
      if (now < next) {
        later(pump, next - now + 1)
        return
      }
      const li = queue.shift()
      if (!li) return
      stamp(li)
      next = now + STAMP_GAP
      if (queue.length) later(pump, STAMP_GAP)
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          io.unobserve(e.target)
          queue.push(e.target as HTMLElement)
        })
        queue.sort((a, b) => items.indexOf(a) - items.indexOf(b))
        if (queue.length) later(pump, Math.max(0, next - performance.now()))
      },
      { threshold: 0.55, rootMargin: "0px 0px -8% 0px" },
    )
    items.forEach((li) => io.observe(li))

    return () => {
      io.disconnect()
      timers.forEach((t) => window.clearTimeout(t))
      anims.forEach((a) => a.cancel())
      items.forEach((li) => li.classList.remove("is-pending"))
    }
  }, [list])
}

export function Honours() {
  const seals = useRef<HTMLUListElement>(null)
  useSealStamps(seals)

  return (
    <section id="honours" className="page honours-sec" aria-label={sectionName("honours")}>
      <SectionHead
        id="honours"
        title={
          <>
            Certified &amp;{" "}
            <Redact block delay={80}>
              commended.
            </Redact>
          </>
        }
      />

      <ul className="seals" ref={seals}>
        {CERTIFICATIONS.map((c, i) => (
          <li key={c.title} className={`seal-item seal-item-${SEAL_TONES[i]}`}>
            <span className="seal-stage" aria-hidden="true">
              <span className="seal-shadow" />
              <span className="seal-press">
                <Seal ring={c.ring} issuer={c.issuer} year={c.year} tone={SEAL_TONES[i]} idx={i} />
              </span>
              <span className="seal-burst" />
            </span>
            <span className="seal-cap">
              <span className="seal-title">{c.title}</span>
              <span className="mono">
                {c.issuer} · {c.year}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <ol className="awards">
        {AWARDS.map((a, i) => (
          <Reveal as="li" key={a.title} className={`award ${a.featured ? "is-featured" : ""}`} delay={i * 0.06}>
            <span className="mono award-rank">{a.rank}</span>
            <span className="award-title">{a.title}</span>
            <span className="award-detail">{a.detail}</span>
            {a.featured && (
              <Stamp tone="red" rotate={-7} className="award-stamp">
                ★ Winner
              </Stamp>
            )}
          </Reveal>
        ))}
      </ol>
    </section>
  )
}
