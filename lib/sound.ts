// Sound effects for the dossier, synthesised live with the Web Audio API: no audio files.
//
// Off by default. The visitor turns it on with the sound toggle and the choice persists in
// localStorage. Every call is safe to make anywhere: play() no-ops on the server, while sound
// is off, while the tab is hidden, and where Web Audio is missing. The AudioContext is created
// lazily, on the first play() after the visitor turns sound on (that first play() happens
// inside the toggle's click, which is what unlocks audio on iOS).

export type SoundName = "lamp" | "stamp" | "type" | "whoosh" | "tick" | "chime" | "paper" | "shred"

const STORE_KEY = "hs-sound"

/** Overall loudness. Kept low: these are textures, not notifications. */
const MASTER = 0.5

/** Minimum gap between two plays of the same sound (ms), so bursts never machine-gun. */
const GAP: Record<SoundName, number> = {
  lamp: 500,
  stamp: 90,
  type: 34,
  whoosh: 180,
  tick: 45,
  chime: 320,
  paper: 110,
  shred: 260,
}

/** Most voices allowed at once; extra plays are dropped rather than piled up. */
const MAX_VOICES = 10

// ============ STATE ============

let enabled: boolean | null = null
const listeners = new Set<() => void>()
let storageHooked = false

let ctx: AudioContext | null = null
let bus: GainNode | null = null
let noise: AudioBuffer | null = null
let voices = 0
let unlockArmed = false
const lastPlayed: Partial<Record<SoundName, number>> = {}

const hasWindow = () => typeof window !== "undefined"

function notify() {
  listeners.forEach((l) => l())
}

// ============ PUBLIC API ============

export function isSoundOn() {
  if (!hasWindow()) return false
  if (enabled === null) {
    try {
      enabled = window.localStorage.getItem(STORE_KEY) === "on"
    } catch {
      enabled = false
    }
  }
  return enabled
}

export function setSoundOn(on: boolean) {
  if (!hasWindow()) return
  if (isSoundOn() === on) return
  enabled = on
  try {
    window.localStorage.setItem(STORE_KEY, on ? "on" : "off")
  } catch {
    /* private mode or blocked storage: the choice lasts for this page view */
  }
  if (ctx) {
    if (on) resume()
    else ctx.suspend().catch(() => {})
  }
  notify()
}

export function subscribeSound(listener: () => void) {
  listeners.add(listener)
  if (hasWindow() && !storageHooked) {
    storageHooked = true
    // keep tabs in step: turning sound off in one tab turns it off in the others
    window.addEventListener("storage", (e) => {
      if (e.key !== STORE_KEY) return
      const on = e.newValue === "on"
      if (on === enabled) return
      enabled = on
      if (ctx && !on) ctx.suspend().catch(() => {})
      notify()
    })
  }
  return () => {
    listeners.delete(listener)
  }
}

export function play(name: SoundName, opts?: { volume?: number }) {
  if (!hasWindow() || !isSoundOn() || document.hidden) return
  const recipe = RECIPES[name]
  if (!recipe) return

  const now = performance.now()
  if (now - (lastPlayed[name] ?? -1e9) < GAP[name]) return
  if (voices >= MAX_VOICES) return

  const c = ensureContext()
  if (!c || !bus || !noise) return

  if (c.state !== "running") {
    // Only start sounds we can hear now. Outside a user gesture a suspended context stays
    // suspended, and queued sounds would all fire at once on the next click.
    if (!userActive()) {
      armUnlock()
      return
    }
    resume()
  }

  lastPlayed[name] = now
  const volume = Math.max(0, Math.min(1.5, opts?.volume ?? 1))
  if (volume === 0) return

  try {
    const out = c.createGain()
    out.gain.value = 1
    out.connect(bus)
    const t = c.currentTime + 0.012
    const tail = recipe(c, out, t, volume, noise)
    voices++
    window.setTimeout(
      () => {
        voices = Math.max(0, voices - 1)
        try {
          out.disconnect()
        } catch {
          /* already gone */
        }
      },
      (tail + 0.25) * 1000,
    )
  } catch {
    /* a sound must never break the page */
  }
}

// ============ CONTEXT ============

type AudioContextCtor = typeof AudioContext

function ensureContext(): AudioContext | null {
  if (ctx) return ctx
  const w = window as Window & { webkitAudioContext?: AudioContextCtor }
  const AC: AudioContextCtor | undefined = window.AudioContext ?? w.webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC({ latencyHint: "interactive" })
  } catch {
    try {
      ctx = new AC()
    } catch {
      return null
    }
  }
  const c = ctx
  bus = buildBus(c, c.destination)
  noise = makeNoise(c)

  // never hum away in a background tab
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return
    if (document.hidden) ctx.suspend().catch(() => {})
    else if (isSoundOn()) resume()
  })
  if (c.state !== "running") armUnlock()
  return c
}

function resume() {
  if (!ctx || ctx.state === "running") return
  ctx.resume().catch(() => armUnlock())
}

function userActive() {
  const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation
  // Without the API (older Safari) assume a gesture: the worst case is a sound that waits.
  return ua ? ua.isActive : true
}

/** A context created outside a gesture starts suspended: wake it on the next real input. */
function armUnlock() {
  if (unlockArmed || !hasWindow()) return
  unlockArmed = true
  const events = ["pointerup", "keydown", "touchend"] as const
  const wake = () => {
    if (!ctx || !isSoundOn()) return
    ctx
      .resume()
      .then(() => {
        if (ctx?.state === "running") {
          events.forEach((e) => window.removeEventListener(e, wake, true))
          unlockArmed = false
        }
      })
      .catch(() => {})
  }
  events.forEach((e) => window.addEventListener(e, wake, true))
}

/** Master chain: level, a gentle high-shelf cut so nothing is brittle, then a soft limiter. */
function buildBus(c: BaseAudioContext, dest: AudioNode) {
  const g = c.createGain()
  g.gain.value = MASTER
  const shelf = c.createBiquadFilter()
  shelf.type = "highshelf"
  shelf.frequency.value = 7000
  shelf.gain.value = -4
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.knee.value = 10
  comp.ratio.value = 6
  comp.attack.value = 0.002
  comp.release.value = 0.12
  g.connect(shelf)
  shelf.connect(comp)
  comp.connect(dest)
  return g
}

function makeNoise(c: BaseAudioContext) {
  const len = Math.floor(c.sampleRate * 1.5)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

// ============ BUILDING BLOCKS ============

type Recipe = (c: BaseAudioContext, out: AudioNode, t: number, v: number, noise: AudioBuffer) => number

const rand = (a: number, b: number) => a + Math.random() * (b - a)

function gainNode(c: BaseAudioContext, value = 0) {
  const g = c.createGain()
  g.gain.value = value
  return g
}

function filterNode(c: BaseAudioContext, type: BiquadFilterType, freq: number, q = 0.707) {
  const f = c.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}

function oscNode(c: BaseAudioContext, type: OscillatorType, freq: number, t: number, dur: number) {
  const o = c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  o.start(t)
  o.stop(t + dur)
  return o
}

function noiseNode(c: BaseAudioContext, buf: AudioBuffer, t: number, dur: number) {
  const s = c.createBufferSource()
  s.buffer = buf
  s.loop = true
  s.start(t, Math.random() * (buf.duration - 0.2))
  s.stop(t + dur)
  return s
}

/** Percussive envelope: a quick linear rise, then an exponential fall to silence. */
function perc(p: AudioParam, t: number, peak: number, attack: number, decay: number) {
  p.setValueAtTime(0.0001, t)
  p.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack)
  p.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

function wire(...nodes: AudioNode[]) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
  return nodes[nodes.length - 1]
}

// ============ RECIPES ============
// Each schedules its voice at time t into `out` and returns how long it rings (s).

const RECIPES: Record<SoundName, Recipe> = {
  // A tiny pin click: a bright ping with a breath of noise on the attack.
  tick(c, out, t, v, n) {
    const ping = oscNode(c, "sine", rand(2700, 3300), t, 0.07)
    const pg = gainNode(c)
    perc(pg.gain, t, 0.1 * v, 0.0012, 0.04)
    wire(ping, pg, out)
    const air = noiseNode(c, n, t, 0.03)
    const ag = gainNode(c)
    perc(ag.gain, t, 0.08 * v, 0.0008, 0.01)
    wire(air, filterNode(c, "bandpass", 5200, 1.6), ag, out)
    return 0.08
  },

  // A short mechanical tick: the strike of a key, a little resonant body, a faint thock.
  type(c, out, t, v, n) {
    const k = rand(0.9, 1.1)
    const strike = noiseNode(c, n, t, 0.04)
    const sg = gainNode(c)
    perc(sg.gain, t, 0.5 * v, 0.0006, 0.012)
    wire(strike, filterNode(c, "bandpass", 3200 * k, 2), sg, out)
    const body = noiseNode(c, n, t, 0.06)
    const bg = gainNode(c)
    perc(bg.gain, t, 0.32 * v, 0.001, 0.03)
    wire(body, filterNode(c, "bandpass", 1400 * k, 4), bg, out)
    const thock = c.createOscillator()
    thock.type = "triangle"
    thock.frequency.setValueAtTime(170 * k, t)
    thock.frequency.exponentialRampToValueAtTime(90, t + 0.03)
    thock.start(t)
    thock.stop(t + 0.06)
    const tg = gainNode(c)
    perc(tg.gain, t, 0.06 * v, 0.001, 0.03)
    wire(thock, tg, out)
    return 0.08
  },

  // A dull rubber thunk: a falling low body and a soft slap of paper, all under 2.4 kHz.
  stamp(c, out, t, v, n) {
    const lp = filterNode(c, "lowpass", 2400, 0.5)
    lp.connect(out)
    const body = c.createOscillator()
    body.type = "sine"
    body.frequency.setValueAtTime(150, t)
    body.frequency.exponentialRampToValueAtTime(46, t + 0.12)
    body.start(t)
    body.stop(t + 0.32)
    const bg = gainNode(c)
    perc(bg.gain, t, 0.34 * v, 0.003, 0.2)
    wire(body, bg, lp)
    const slap = noiseNode(c, n, t, 0.12)
    const sg = gainNode(c)
    perc(sg.gain, t, 0.5 * v, 0.0012, 0.07)
    wire(slap, filterNode(c, "lowpass", 950, 0.8), sg, lp)
    const contact = noiseNode(c, n, t, 0.05)
    const cg = gainNode(c)
    perc(cg.gain, t, 0.12 * v, 0.0008, 0.025)
    wire(contact, filterNode(c, "bandpass", 1800, 1.2), cg, lp)
    const knock = oscNode(c, "triangle", rand(290, 340), t, 0.09)
    const kg = gainNode(c)
    perc(kg.gain, t, 0.12 * v, 0.001, 0.05)
    wire(knock, kg, lp)
    return 0.34
  },

  // A wall switch, then the soft hum of a lamp swelling up and settling.
  lamp(c, out, t, v, n) {
    const click = noiseNode(c, n, t, 0.03)
    const cg = gainNode(c)
    perc(cg.gain, t, 0.3 * v, 0.0005, 0.012)
    wire(click, filterNode(c, "bandpass", 3000, 1.5), cg, out)
    const snap = c.createOscillator()
    snap.type = "sine"
    snap.frequency.setValueAtTime(1500, t)
    snap.frequency.exponentialRampToValueAtTime(650, t + 0.025)
    snap.start(t)
    snap.stop(t + 0.05)
    const sg = gainNode(c)
    perc(sg.gain, t, 0.06 * v, 0.0005, 0.028)
    wire(snap, sg, out)

    // mains hum (60 Hz grid: 120 Hz and up), low-passed so it's warm, with a faint flicker
    const lp = filterNode(c, "lowpass", 950, 0.6)
    const trem = gainNode(c, 1)
    const env = gainNode(c)
    env.gain.setValueAtTime(0.0001, t + 0.03)
    env.gain.linearRampToValueAtTime(0.085 * v, t + 0.45)
    env.gain.setTargetAtTime(0.0001, t + 0.65, 0.34)
    const partials: [number, number, OscillatorType][] = [
      [120, 1, "sine"],
      [240, 0.55, "sine"],
      [360, 0.3, "triangle"],
    ]
    for (const [f, a, type] of partials) wire(oscNode(c, type, f, t, 2.3), gainNode(c, a), lp)
    wire(oscNode(c, "sine", 6.5, t, 2.3), gainNode(c, 0.14)).connect(trem.gain)
    wire(lp, trem, env, out)
    return 2.3
  },

  // A filtered noise sweep that rises, breaks and passes left to right.
  whoosh(c, out, t, v, n) {
    const d = 0.62
    const src = noiseNode(c, n, t, d + 0.05)
    const bp = filterNode(c, "bandpass", 320, 0.9)
    bp.frequency.setValueAtTime(320, t)
    bp.frequency.exponentialRampToValueAtTime(2300, t + d * 0.45)
    bp.frequency.exponentialRampToValueAtTime(760, t + d)
    const g = gainNode(c)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.26 * v, t + d * 0.42)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    let tail: AudioNode = wire(src, bp, g)
    if (typeof c.createStereoPanner === "function") {
      const p = c.createStereoPanner()
      p.pan.setValueAtTime(-0.45, t)
      p.pan.linearRampToValueAtTime(0.45, t + d)
      tail = wire(tail, p)
    }
    tail.connect(out)
    return d + 0.05
  },

  // Two soft bell notes, a major third apart.
  chime(c, out, t, v) {
    const lp = filterNode(c, "lowpass", 5200, 0.5)
    lp.connect(out)
    const note = (f: number, at: number, peak: number) => {
      const partials: [number, number][] = [
        [1, 1],
        [2, 0.2],
        [3.01, 0.05],
      ]
      for (const [mult, amp] of partials) {
        const g = gainNode(c)
        perc(g.gain, at, peak * amp, 0.006, 1.25 / mult)
        wire(oscNode(c, "sine", f * mult, at, 1.4), g, lp)
      }
    }
    note(1046.5, t, 0.05 * v) // C6
    note(1318.5, t + 0.13, 0.042 * v) // E6
    return 1.55
  },

  // A brief rustle: band-passed noise in a few uneven crinkles.
  paper(c, out, t, v, n) {
    const d = 0.3
    const src = noiseNode(c, n, t, d + 0.1)
    const bp = filterNode(c, "bandpass", 2600, 0.8)
    const g = gainNode(c)
    g.gain.setValueAtTime(0.0001, t)
    let at = t
    let end = t
    for (let i = 0; i < 8; i++) {
      at = Math.max(at + rand(0.02, 0.042), end + 0.002)
      if (at > t + d) break
      g.gain.setValueAtTime(0.003, at)
      g.gain.linearRampToValueAtTime(rand(0.08, 0.2) * v, at + 0.004)
      end = at + rand(0.016, 0.03)
      g.gain.exponentialRampToValueAtTime(0.003, end)
      bp.frequency.setValueAtTime(rand(1500, 3400), at)
    }
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.04)
    wire(src, filterNode(c, "highpass", 900, 0.7), bp, filterNode(c, "lowpass", 6000, 0.6), g, out)
    return end - t + 0.08
  },

  // A quick zip: a rising band of noise chopped by the blades, over a small motor.
  shred(c, out, t, v, n) {
    const d = 0.34
    const src = noiseNode(c, n, t, d + 0.05)
    const bp = filterNode(c, "bandpass", 500, 3)
    bp.frequency.setValueAtTime(500, t)
    bp.frequency.exponentialRampToValueAtTime(3500, t + d * 0.85)
    const chop = gainNode(c, 0.5)
    wire(oscNode(c, "sawtooth", 58, t, d + 0.05), gainNode(c, 0.5)).connect(chop.gain)
    const g = gainNode(c)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.3 * v, t + 0.03)
    g.gain.setValueAtTime(0.3 * v, t + d - 0.09)
    g.gain.exponentialRampToValueAtTime(0.0001, t + d)
    wire(src, bp, chop, g, out)
    const motor = oscNode(c, "sawtooth", 72, t, d + 0.06)
    const mg = gainNode(c)
    mg.gain.setValueAtTime(0.0001, t)
    mg.gain.linearRampToValueAtTime(0.07 * v, t + 0.04)
    mg.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.05)
    wire(motor, filterNode(c, "lowpass", 260, 0.7), mg, out)
    return d + 0.08
  },
}
