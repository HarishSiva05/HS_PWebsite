"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import * as gtag from "@/lib/gtag"

// ============ DATA ============
const PORTFOLIO = {
  name: "Harish Sivaram",
  initials: "HS",
  location: "Guelph, ON · Canada",
  basedSince: "Est. 2019",
  email: "harish.portfolio05@gmail.com",
  emailUni: "sivaramh@uoguelph.ca",
  github: "https://github.com/HarishSiva05",
  linkedin: "https://www.linkedin.com/in/harish-sivaram/",
  roles: [
    "Cybersecurity Researcher",
    "Threat Intelligence Analyst",
    "Full-Stack Engineer",
    "Blockchain Developer",
    "iOS Developer",
  ],
  intro: [
    "Cybersecurity researcher with a Master's in Cybersecurity & Threat Intelligence from the University of Guelph.",
    "Most recently a Research Associate at eSentire, driving internal AI tooling adoption and researching threat modeling for AI-augmented security architectures.",
    "Five years across enterprise content management, AI-driven security tooling, blockchain applications, and privacy-focused iOS work — focused on the intersection of AI and defensive security.",
  ],
  stats: [
    { value: 5, suffix: "+", label: "Years Building" },
    { value: 43, suffix: "", label: "APT Groups Analyzed" },
    { value: 6, suffix: "", label: "Major Projects" },
    { value: 14, suffix: "+", label: "Metadata Types Sanitized" },
  ],
  marquee: [
    "Cybersecurity",
    "Threat Intelligence",
    "AI Security",
    "Reverse Engineering",
    "Malware Analysis",
    "Blockchain",
    "Penetration Testing",
    "Digital Forensics",
    "iOS",
    "Threat Hunting",
  ],
  experience: [
    {
      role: "Research Associate",
      org: "eSentire",
      period: "Oct 2025 — Feb 2026",
      mode: "Hybrid · Waterloo, ON",
      tag: "Most recent",
      points: [
        "Spearheaded adoption of internal AI tools — an orchestration engine for coordinating AI agents and an agentic workflow automation platform — helping teams integrate them into operational pipelines for intelligent automation of security workflows at scale.",
        "Researched STRIDE threat modeling, trust boundaries, MCP (Model Context Protocol) vulnerabilities, and the OWASP Top 10 for LLMs to inform security-aware architecture decisions across AI tooling initiatives.",
      ],
    },
    {
      role: "Developer",
      org: "Doqpros",
      period: "Apr 2022 — Sep 2024",
      mode: "Remote · Omaha, NE",
      points: [
        "Built custom C# scripts for Laserfiche to automate metadata extraction and audit logging across enterprise repositories.",
        "Architected DoqFlowAI — an intelligent workflow analysis platform that uses AI to optimize and generate Laserfiche document workflows.",
        "Developed a Retrieval-Augmented Generation (RAG) model over Laserfiche's documentation to power internal knowledge search.",
      ],
    },
    {
      role: "Developer",
      org: "GreenECM Technologies",
      period: "Apr 2020 — Sep 2021",
      mode: "Hybrid · Tamil Nadu, IN",
      points: [
        "Designed and shipped responsive client-facing websites with a focus on usability and accessibility.",
        "Installed, configured, and maintained IBM FileNet P8 systems for enterprise content management workflows.",
      ],
    },
  ],
  projects: [
    {
      id: "01",
      title: "APT Malware Classification",
      kicker: "Threat Intelligence",
      year: "2024",
      description:
        "Static analysis of malware samples from 43 Advanced Persistent Threat groups in Ghidra. Extracted opcode sequences and trained ML models to attribute samples to origin groups — supporting faster threat researcher attribution.",
      stack: ["Ghidra", "Python", "Scikit-learn", "Reverse Engineering"],
      link: "https://github.com/HarishSiva05/APT-Malware-Classification",
    },
    {
      id: "02",
      title: "MetaWipe",
      kicker: "iOS · Privacy",
      year: "2025",
      description:
        "Privacy-focused iOS app that strips hidden metadata — GPS, device IDs, and 14+ other types — from photos before sharing. Zero-trust offline architecture protects against passive tracking and data leakage.",
      stack: ["Swift", "iOS", "Zero-Trust", "Image Pipeline"],
      link: "#",
    },
    {
      id: "03",
      title: "AI-Driven Security Chatbot",
      kicker: "Defensive AI",
      year: "2024",
      description:
        "Prototype AI assistant that detects anomalies in repository systems and simulates real-time incident response — flagging unauthorized access and code tampering with remediation guidance for DevOps teams.",
      stack: ["Python", "TensorFlow", "NLP", "Flask"],
      link: "https://youtu.be/zY5ZpLVGGFg",
    },
    {
      id: "04",
      title: "EthChat",
      kicker: "Decentralized Comms",
      year: "2023",
      description:
        "End-to-end encrypted messaging on Ethereum. Smart contracts hold ciphertext; private keys never leave the device — censorship-resistant and intermediary-free.",
      stack: ["Solidity", "React", "Web3.js", "IPFS"],
      link: "https://github.com/HarishSiva05/Blockchain-Chat",
    },
    {
      id: "05",
      title: "Peer-to-Peer Energy Trading",
      kicker: "Blockchain · Energy",
      year: "2022",
      description:
        "Decentralized marketplace where households trade rooftop solar surplus directly with neighbors. Automated trading logic helps residential consumers cut costs and improve sustainability.",
      stack: ["Ethereum", "Smart Contracts", "IoT", "React"],
      link: "https://github.com/Harish-Sivaram/p2p-energy",
    },
    {
      id: "06",
      title: "Agrimate",
      kicker: "FinTech for Farmers",
      year: "2020",
      description:
        "Mobile-first financial toolkit giving smallholder farmers expense tracking, payments, and microloan eligibility — winner of Yugam 2020.",
      stack: ["React Native", "Node.js", "MongoDB"],
      link: "https://github.com/HarishSiva05/Agrimate-YUGAM",
    },
  ],
  education: [
    {
      degree: "M.Sc. Cybersecurity & Threat Intelligence",
      school: "University of Guelph",
      period: "Sep 2024 — Aug 2025",
      detail:
        "GPA 85.71 · Cybersecurity & Defense · Threat Intelligence · Privacy Compliance · Penetration Testing · Digital Forensics · Threat Hunting",
    },
    {
      degree: "B.E. Computer Science & Engineering",
      school: "Sri Krishna College of Engineering & Technology",
      period: "Aug 2019 — May 2023",
      detail: "GPA 9.11 / 10 · Tamil Nadu, India",
    },
  ],
  certifications: [
    { title: "Laserfiche Platinum 10", issuer: "Laserfiche", year: "2023" },
    { title: "Laserfiche Gold 10", issuer: "Laserfiche", year: "2022" },
    { title: "Cybersecurity Essentials", issuer: "Cisco", year: "2022" },
    { title: "Rapid Incident Response with Cisco XDR", issuer: "Cisco", year: "2024" },
  ],
  awards: [
    { title: "Winner — Yugam 2020 48-Hour Hackathon", year: "2020", featured: true },
    { title: "3rd Place — Steganography Treasure Hunt, AnokaFest", year: "" },
    { title: "Participant — HackHarvard, HackAlphaX, MLH", year: "" },
  ],
  skillGroups: [
    { label: "Languages", items: ["Python", "C#", "JavaScript", "Swift", "Java", "SQL", "Rust"] },
    { label: "Frameworks", items: ["TensorFlow", "Scikit-learn", "React", "Vue", "Flask"] },
    {
      label: "Security Tools",
      items: ["Ghidra", "Wireshark", "Nmap", "Metasploit", "Burp Suite", "Suricata", "Splunk", "Kali Linux"],
    },
    { label: "Dev / Platforms", items: ["Docker", "Git", "Laserfiche", "Linux", "macOS", "iOS", "Web"] },
  ],
}

const ACCENT = "#c8ff3d"

const NAV_ITEMS = [
  { id: "intro", label: "01 Intro" },
  { id: "about", label: "02 About" },
  { id: "work", label: "03 Work" },
  { id: "career", label: "04 Career" },
  { id: "credentials", label: "05 Credentials" },
  { id: "contact", label: "06 Contact" },
]

// ============ ATOMS ============

function Mono({
  children,
  style,
  className = "",
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <span className={`mono ${className}`} style={style}>
      {children}
    </span>
  )
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.75, delay: delay / 1000, ease: [0.2, 0.6, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ============ SCRAMBLE TITLE ============

const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^<>/|\\█▓▒░∂∆≈"

function rndChar() {
  return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
}

function ScrambleWord({
  word,
  startDelay = 0,
  outline = false,
}: {
  word: string
  startDelay?: number
  outline?: boolean
}) {
  const len = word.length
  const [display, setDisplay] = useState<string[]>(() => Array(len).fill("█"))
  const [flashSet, setFlashSet] = useState<Set<number>>(new Set())
  const [glitchSet, setGlitchSet] = useState<Set<number>>(new Set())
  const resolvedRef = useRef<boolean[]>(Array(len).fill(false))
  const allResolvedRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Phase 1: scramble → resolve on mount
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(word.split(""))
      resolvedRef.current = Array(len).fill(true)
      allResolvedRef.current = true
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []

    const scrambleId = setInterval(() => {
      if (!mountedRef.current) { clearInterval(scrambleId); return }
      if (allResolvedRef.current) { clearInterval(scrambleId); return }
      setDisplay(resolvedRef.current.map((r, i) => (r ? word[i] : rndChar())))
    }, 45)

    word.split("").forEach((char, i) => {
      const t = setTimeout(() => {
        if (!mountedRef.current) return
        resolvedRef.current[i] = true
        if (resolvedRef.current.every(Boolean)) allResolvedRef.current = true
        setDisplay(prev => { const n = [...prev]; n[i] = char; return n })
        setFlashSet(prev => new Set([...prev, i]))
        const unflash = setTimeout(() => {
          if (!mountedRef.current) return
          setFlashSet(prev => { const s = new Set(prev); s.delete(i); return s })
        }, 280)
        timers.push(unflash)
      }, startDelay + i * 90 + 250)
      timers.push(t)
    })

    return () => {
      clearInterval(scrambleId)
      timers.forEach(clearTimeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2: periodic idle glitch after all resolved
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    const schedule = (): ReturnType<typeof setTimeout> => {
      const delay = 4500 + Math.random() * 5500
      return setTimeout(() => {
        if (!mountedRef.current) return
        if (!allResolvedRef.current) { timers.push(schedule()); return }

        const count = Math.random() > 0.65 ? 2 : 1
        const indices = Array.from({ length: count }, () => Math.floor(Math.random() * len))

        setGlitchSet(new Set(indices))

        let flicks = 0
        const flickId = setInterval(() => {
          if (!mountedRef.current) { clearInterval(flickId); return }
          flicks++
          setDisplay(prev => {
            const n = [...prev]
            indices.forEach(idx => { n[idx] = rndChar() })
            return n
          })
          if (flicks >= 5) {
            clearInterval(flickId)
            if (!mountedRef.current) return
            setGlitchSet(new Set())
            setDisplay(prev => {
              const n = [...prev]
              indices.forEach(idx => { n[idx] = word[idx] })
              return n
            })
          }
        }, 40)

        timers.push(schedule())
      }, delay)
    }

    timers.push(schedule())
    return () => timers.forEach(clearTimeout)
  }, [len, word])

  return (
    <>
      {display.map((char, i) => {
        const lit = flashSet.has(i) || glitchSet.has(i)
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: lit ? ACCENT : outline ? "transparent" : undefined,
              WebkitTextStroke: outline ? `1.5px ${lit ? ACCENT : "var(--fg)"}` : undefined,
              transition: lit ? "none" : "color 160ms ease, -webkit-text-stroke-color 160ms ease",
            }}
          >
            {char}
          </span>
        )
      })}
    </>
  )
}

function MarqueeStrip({ items }: { items: string[] }) {
  const list = [...items, ...items]
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track" style={{ animationDuration: "40s" }}>
        {list.map((it, i) => (
          <span className="marquee-item" key={i}>
            <span className="marquee-dot" style={{ background: ACCENT }} />
            <span>{it}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf: number
    let started = false
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            started = true
            const start = performance.now()
            const dur = 1400
            const tick = (t: number) => {
              const p = Math.min(1, (t - start) / dur)
              const eased = 1 - Math.pow(1 - p, 3)
              setV(Math.round(to * eased))
              if (p < 1) raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.4 },
    )
    if (ref.current) obs.observe(ref.current)
    return () => {
      obs.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to])

  return (
    <span ref={ref}>
      {v}
      {suffix}
    </span>
  )
}

// ============ NAV ============

function Nav({ active, onJump }: { active: string; onJump: (id: string) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="nav">
      <div className="nav-left">
        <div className="nav-mark">
          <span className="nav-mark-glyph" style={{ background: ACCENT }}>
            HS
          </span>
          <span className="nav-mark-text">
            <strong>Harish Sivaram</strong>
            <em>Cybersecurity / Engineering</em>
          </span>
        </div>
      </div>

      <nav className="nav-links" aria-label="Site navigation">
        {NAV_ITEMS.map((it) => (
          <button
            key={it.id}
            onClick={() => onJump(it.id)}
            className={`nav-link ${active === it.id ? "is-active" : ""}`}
            aria-label={`Go to ${it.label}`}
            aria-current={active === it.id ? "true" : undefined}
          >
            {it.label}
            <span className="nav-link-bar" style={{ background: ACCENT }} />
          </button>
        ))}
      </nav>

      <div className="nav-right">
        <Mono>GUELPH · ON</Mono>
        <span className="nav-status">
          <span className="nav-pulse" style={{ background: ACCENT }} />
          <Mono>OPEN TO WORK</Mono>
        </span>
      </div>

      {/* Mobile hamburger */}
      <button
        className="nav-mobile-toggle"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((o) => !o)}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          {mobileOpen ? (
            <>
              <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" />
              <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="17" y2="6" stroke="currentColor" strokeWidth="1.5" />
              <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" />
              <line x1="3" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="1.5" />
            </>
          )}
        </svg>
      </button>

      {/* Mobile dropdown */}
      <div className={`nav-mobile-menu ${mobileOpen ? "is-open" : ""}`} aria-label="Mobile navigation">
        {NAV_ITEMS.map((it) => (
          <button
            key={it.id}
            onClick={() => {
              onJump(it.id)
              setMobileOpen(false)
            }}
            className={`nav-mobile-item ${active === it.id ? "is-active" : ""}`}
            aria-label={`Go to ${it.label}`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </header>
  )
}

// ============ HERO ============

function Hero({ onJump }: { onJump: (id: string) => void }) {
  const [roleIdx, setRoleIdx] = useState(0)
  const { scrollY } = useScroll()
  const portraitY = useTransform(scrollY, [0, 700], [0, 130])

  useEffect(() => {
    const id = setInterval(() => setRoleIdx((i) => (i + 1) % PORTFOLIO.roles.length), 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <section id="intro" className="hero">
      {/* Full-bleed portrait with scroll parallax */}
      <motion.img
        src="/portrait.png"
        alt=""
        aria-hidden="true"
        className="hero-bg-portrait"
        style={{ y: portraitY }}
      />
      <div className="hero-bg-overlay" />

      <div className="hero-grid">
        <div className="hero-meta">
          <Mono className="hero-tag">
            <span className="dot-blink" style={{ background: ACCENT }} />
            PORTFOLIO / 2026
          </Mono>
          <Mono>
            {PORTFOLIO.basedSince} · {PORTFOLIO.location}
          </Mono>
        </div>

        <h1 className="hero-title">
          <span className="hero-line">
            <span className="hero-word">
              <ScrambleWord word="HARISH" startDelay={300} />
            </span>
          </span>
          <span className="hero-line">
            <span className="hero-word">
              <ScrambleWord word="SIVARAM" startDelay={700} outline />
            </span>
            <span className="hero-slash" style={{ color: ACCENT }}>
              /
            </span>
          </span>
          <span className="hero-line hero-sub">
            <span className="hero-rolewrap" aria-live="polite" aria-atomic="true">
              {PORTFOLIO.roles.map((r, i) => (
                <span
                  key={r}
                  className={`hero-role ${i === roleIdx ? "is-on" : ""}`}
                  style={{ color: i === roleIdx ? ACCENT : undefined }}
                  aria-hidden={i !== roleIdx}
                >
                  {r}
                </span>
              ))}
            </span>
          </span>
        </h1>

        <div className="hero-foot">
          <p className="hero-blurb">
            {PORTFOLIO.intro[0]} {PORTFOLIO.intro[1]}
          </p>
          <div className="hero-cta">
            <button
              className="btn btn-primary"
              style={{ background: ACCENT }}
              onClick={() => onJump("work")}
            >
              <span>Selected Work</span>
              <span className="btn-arrow">→</span>
            </button>
            <button className="btn btn-ghost" onClick={() => onJump("contact")}>
              <span>Get in Touch</span>
            </button>
          </div>
        </div>
      </div>

      <button className="hero-scroll" onClick={() => onJump("about")} aria-label="Scroll to About section">
        <Mono>SCROLL</Mono>
        <span className="hero-scroll-line" />
      </button>
    </section>
  )
}

// ============ STATS ============

function Stats() {
  return (
    <section className="stats" aria-label="Key statistics">
      {PORTFOLIO.stats.map((s, i) => (
        <Reveal key={s.label} delay={i * 80} className="stat">
          <div className="stat-value">
            <Counter to={s.value} suffix={s.suffix} />
          </div>
          <div className="stat-label">
            <Mono>{s.label}</Mono>
          </div>
        </Reveal>
      ))}
    </section>
  )
}

// ============ ABOUT ============

function About() {
  return (
    <section id="about" aria-label="About" className="about">
      <div className="section-head">
        <Mono className="section-num" style={{ color: ACCENT }}>
          02 / ABOUT
        </Mono>
        <h2 className="section-title">
          Building defensive systems
          <br />
          <span className="section-title-em">at the edge of AI &amp; security.</span>
        </h2>
      </div>

      <div className="about-grid">
        <div className="about-copy">
          {PORTFOLIO.intro.map((p, i) => (
            <Reveal key={i} delay={i * 120} className={i === 0 ? "about-copy-first" : ""}>
              <p>{p}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="about-edu">
          <Mono className="about-edu-head">EDUCATION</Mono>
          {PORTFOLIO.education.map((e, i) => (
            <div key={i} className="edu-item">
              <div className="edu-bar" style={{ background: i === 0 ? ACCENT : undefined }} />
              <div>
                <h4>{e.degree}</h4>
                <div className="edu-school">{e.school}</div>
                <Mono className="edu-period">{e.period}</Mono>
                <p className="edu-detail">{e.detail}</p>
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal className="about-skills" delay={200}>
          <Mono className="about-edu-head">STACK</Mono>
          <div className="skills-grid">
            {PORTFOLIO.skillGroups.map((g) => (
              <div key={g.label} className="skill-col">
                <Mono className="skill-col-head">{g.label}</Mono>
                <ul>
                  {g.items.map((it) => (
                    <li key={it}>
                      <span className="skill-tick" style={{ background: ACCENT }} />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ============ WORK ============

function Work() {
  const [hover, setHover] = useState<number | null>(null)

  return (
    <section id="work" aria-label="Selected work" className="work physics-stage">
      <div className="section-head">
        <Mono className="section-num" style={{ color: ACCENT }}>
          03 / SELECTED WORK
        </Mono>
        <h2 className="section-title">
          Six projects.
          <br />
          <span className="section-title-em">From APT attribution to privacy-first iOS.</span>
        </h2>
      </div>

      <div className="work-list">
        {PORTFOLIO.projects.map((p, i) => (
          <a
            key={p.id}
            href={p.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${p.title} — ${p.kicker}`}
            className={`work-row physics-tile ${hover === i ? "is-hover" : ""} ${hover !== null && hover !== i ? "is-dim" : ""}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() =>
              gtag.event({ action: "project_view", category: "engagement", label: p.title })
            }
          >
            <div className="work-row-id">
              <Mono>{p.id}</Mono>
              <span className="work-row-year-mini">
                <Mono>{p.year}</Mono>
              </span>
            </div>
            <div className="work-row-main">
              <Mono className="work-row-kicker" style={{ color: ACCENT }}>
                {p.kicker}
              </Mono>
              <h3>{p.title}</h3>
              <p className="work-row-summary">{p.description}</p>
              <div className="work-row-stack">
                {p.stack.map((s) => (
                  <Mono key={s} className="chip">
                    {s}
                  </Mono>
                ))}
              </div>
            </div>
            <div className="work-row-arrow" style={{ color: ACCENT }} aria-hidden="true">
              ↗
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

// ============ CAREER ============

function Career() {
  return (
    <section id="career" aria-label="Career" className="career">
      <div className="section-head">
        <Mono className="section-num" style={{ color: ACCENT }}>
          04 / CAREER
        </Mono>
        <h2 className="section-title">
          Four years shipping
          <br />
          <span className="section-title-em">enterprise software for content systems.</span>
        </h2>
      </div>

      <div className="career-list">
        {PORTFOLIO.experience.map((x, i) => (
          <Reveal key={i} className="career-item" delay={i * 120}>
            <div className="career-meta">
              <Mono>{x.period}</Mono>
              <Mono>{x.mode}</Mono>
              {x.tag && (
                <span className="career-tag" style={{ borderColor: ACCENT, color: ACCENT }}>
                  {x.tag}
                </span>
              )}
            </div>
            <div className="career-main">
              <h3>
                {x.role}
                <span className="career-at"> at </span>
                <span style={{ color: ACCENT }}>{x.org}</span>
              </h3>
              <ul>
                {x.points.map((pt, j) => (
                  <li key={j}>{pt}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ============ CREDENTIALS ============

function Credentials() {
  return (
    <section id="credentials" aria-label="Credentials" className="credentials">
      <div className="section-head">
        <Mono className="section-num" style={{ color: ACCENT }}>
          05 / CREDENTIALS
        </Mono>
        <h2 className="section-title">
          Certifications
          <br />
          <span className="section-title-em">&amp; recognition.</span>
        </h2>
      </div>

      <div className="cred-grid">
        <div className="cred-col">
          <Mono className="cred-col-head">CERTIFICATIONS</Mono>
          <ul className="cred-list">
            {PORTFOLIO.certifications.map((c, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.2, 0.6, 0.2, 1] }}
                className="cred-row"
              >
                <div className="cred-row-title">
                  <span className="cred-row-num" style={{ color: ACCENT }}>
                    0{i + 1}
                  </span>
                  <span>{c.title}</span>
                </div>
                <div className="cred-row-meta">
                  <Mono>{c.issuer}</Mono>
                  <Mono>{c.year}</Mono>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="cred-col">
          <Mono className="cred-col-head">AWARDS</Mono>
          <ul className="cred-list">
            {PORTFOLIO.awards.map((a, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.2, 0.6, 0.2, 1] }}
                className={`cred-row ${a.featured ? "is-featured" : ""}`}
              >
                <div className="cred-row-title">
                  <span className="cred-row-num" style={{ color: a.featured ? ACCENT : undefined }}>
                    {a.featured ? "★" : `0${i + 1}`}
                  </span>
                  <span>{a.title}</span>
                </div>
                {a.year && (
                  <div className="cred-row-meta">
                    <Mono>{a.year}</Mono>
                  </div>
                )}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

// ============ CONTACT ============

function Contact() {
  return (
    <section id="contact" aria-label="Contact" className="contact">
      <Mono style={{ color: ACCENT }}>06 / CONTACT</Mono>
      <h2 className="contact-headline">
        Have a problem
        <br />
        worth solving?
        <br />
        <span className="contact-headline-em" style={{ color: ACCENT }}>
          Let&apos;s talk.
        </span>
      </h2>

      <a
        className="contact-email"
        href={`mailto:${PORTFOLIO.email}`}
        style={{ borderColor: ACCENT }}
        onClick={() =>
          gtag.event({ action: "contact_interaction", category: "engagement", label: "Email CTA" })
        }
      >
        <span className="contact-email-text">{PORTFOLIO.email}</span>
        <span className="contact-email-arrow" style={{ color: ACCENT }} aria-hidden="true">
          →
        </span>
      </a>

      <div className="contact-grid">
        <div className="contact-col">
          <Mono className="contact-col-head">DIRECT</Mono>
          <a
            href={`mailto:${PORTFOLIO.email}`}
            onClick={() =>
              gtag.event({ action: "contact_interaction", category: "engagement", label: "Email Personal" })
            }
          >
            {PORTFOLIO.email}
          </a>
          <a
            href={`mailto:${PORTFOLIO.emailUni}`}
            onClick={() =>
              gtag.event({ action: "contact_interaction", category: "engagement", label: "Email Uni" })
            }
          >
            {PORTFOLIO.emailUni}
          </a>
        </div>
        <div className="contact-col">
          <Mono className="contact-col-head">SOCIAL</Mono>
          <a
            href={PORTFOLIO.github}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              gtag.event({ action: "external_link_click", category: "engagement", label: "GitHub" })
            }
          >
            GitHub ↗
          </a>
          <a
            href={PORTFOLIO.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              gtag.event({ action: "external_link_click", category: "engagement", label: "LinkedIn" })
            }
          >
            LinkedIn ↗
          </a>
        </div>
        <div className="contact-col">
          <Mono className="contact-col-head">LOCATION</Mono>
          <span>{PORTFOLIO.location}</span>
          <Mono>N 43°31&apos;48&quot; · W 80°13&apos;40&quot;</Mono>
        </div>
        <div className="contact-col">
          <Mono className="contact-col-head">AVAILABILITY</Mono>
          <span>Open to full-time roles in security engineering &amp; threat intelligence.</span>
        </div>
      </div>

      <footer className="contact-foot">
        <Mono>© {new Date().getFullYear()} Harish Sivaram</Mono>
      </footer>
    </section>
  )
}

// ============ APP ============

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState("intro")
  const [cursor, setCursor] = useState({ x: -999, y: -999 })
  const velocityRef = useRef({ y: 0, target: 0, lastY: 0 })

  useEffect(() => {
    setMounted(true)
  }, [])

  // 3D physics scroll — spring-tracked velocity applied to .physics-tile elements
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let raf: number

    const onScroll = () => {
      try {
        const y = window.scrollY
        const dy = y - velocityRef.current.lastY
        velocityRef.current.lastY = y
        velocityRef.current.target = Math.max(-60, Math.min(60, dy * 0.9))
      } catch (_) {}
    }

    const tick = () => {
      try {
        const v = velocityRef.current
        v.y += (v.target - v.y) * 0.12
        v.target *= 0.85
        const tiles = document.querySelectorAll<HTMLElement>(".physics-tile")
        tiles.forEach((el) => {
          const rect = el.getBoundingClientRect()
          const dist = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight
          const tilt = -dist * 6 + v.y * 0.25
          const tz = Math.abs(dist) * -40
          el.style.transform = `translate3d(0,${(v.y * 0.4).toFixed(2)}px,${tz.toFixed(2)}px) rotateX(${tilt.toFixed(2)}deg)`
        })
      } catch (_) {}
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      document.querySelectorAll<HTMLElement>(".physics-tile").forEach((el) => {
        el.style.transform = ""
      })
    }
  }, [])

  // Cursor halo
  useEffect(() => {
    const isTouchDevice = window.matchMedia("(hover: none)").matches
    if (isTouchDevice) return
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY })
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    const ids = ["intro", "about", "work", "career", "credentials", "contact"]
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActive(e.target.id)
            gtag.event({ action: "section_view", category: "engagement", label: e.target.id })
          }
        })
      },
      { threshold: 0.35 },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  const onJump = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    gtag.event({ action: "navigation_click", category: "engagement", label: id })
  }, [])

  if (!mounted) return null

  return (
    <div>
      {/* Cursor halo */}
      <div
        className="cursor-halo"
        aria-hidden="true"
        style={{
          left: cursor.x,
          top: cursor.y,
          background: `radial-gradient(circle, ${ACCENT}20, transparent 70%)`,
          opacity: cursor.x === -999 ? 0 : 1,
        }}
      />

      <Nav active={active} onJump={onJump} />
      <Hero onJump={onJump} />
      <MarqueeStrip items={PORTFOLIO.marquee} />
      <Stats />
      <About />
      <Work />
      <Career />
      <Credentials />
      <Contact />
    </div>
  )
}
