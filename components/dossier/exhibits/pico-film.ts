/**
 * Pico's product film: two real cuts Harish made from the app recorded in the iOS Simulator.
 * Chapter starts are the films' own cuts, found frame by frame (the largest frame-to-frame change
 * near each beat; Ask → Plan is a crossfade, timed at its midpoint).
 * Both files are 30 fps, silent (no audio track), with a keyframe every ~2 s.
 */

export type ChapterId = "caught" | "confirm" | "say" | "type" | "ask" | "plan" | "trips"

export type Chapter = {
  id: ChapterId
  /** One word for the rail. */
  label: string
  /** The feature this beat of the film shows, in plain words. */
  feature: string
  /** Seconds into the cut. */
  start: number
}

export type CutId = "wide" | "tall"

export type Cut = {
  id: CutId
  src: string
  poster: string
  /** Intrinsic video size. */
  w: number
  h: number
  duration: number
  /** Where in the film the poster frame was taken. */
  posterAt: number
  chapters: Chapter[]
  /** The film's on-screen text, in order, for screen readers. */
  transcript: string
}

const BEAT: Record<ChapterId, { label: string; feature: string }> = {
  caught: { label: "Caught", feature: "Apple Pay capture" },
  confirm: { label: "Confirm", feature: "One swipe to confirm" },
  say: { label: "Say", feature: "Logged by voice with Siri" },
  type: { label: "Type", feature: "Typed in seconds" },
  ask: { label: "Ask", feature: "Ask Pico: can I afford it?" },
  plan: { label: "Plan", feature: "Left to spend, updated live" },
  trips: { label: "Trips", feature: "Every trip, every currency" },
}

const chapters = (starts: [ChapterId, number][]): Chapter[] =>
  starts.map(([id, start]) => ({ id, start, ...BEAT[id] }))

/** 1280×536 (2.39:1), 25.5 s. */
export const WIDE: Cut = {
  id: "wide",
  src: "/pico-film.mp4",
  poster: "/pico-poster.jpg",
  w: 1280,
  h: 536,
  duration: 25.5,
  posterAt: 5.03,
  chapters: chapters([
    ["caught", 0],
    ["confirm", 4.8],
    ["say", 9.6],
    ["type", 12.6],
    ["ask", 17.0],
    ["plan", 20.5],
    ["trips", 22.8],
  ]),
  transcript:
    "Pico's product film: 25 seconds, no sound, cut from the real app. On screen: “You just paid.” An Apple Pay notice for $6.40 at Corner Café. “Pico already caught it.” “One swipe, and it's counted.” “Say it.” Siri hears “I spent 18 dollars on lunch at Maple Diner” and logs $18.00. “Or type it.” “Logged in seconds.” Someone asks “Can I afford $80 on food & drink?” and Ask Pico answers “Yes, within your Food & Drink budget.” “$946.55 remaining this month. Updated the moment you spend.” “Every trip. Every currency.”",
}

/** 540×960 (9:16), 13.4 s. This cut has no "Say it." beat and ends on a "Pico. Money, measured." card. */
export const TALL: Cut = {
  id: "tall",
  src: "/pico-film-vertical.mp4",
  poster: "/pico-poster-vertical.jpg",
  w: 540,
  h: 960,
  duration: 13.4,
  posterAt: 6.2,
  chapters: chapters([
    ["caught", 0],
    ["confirm", 3.0],
    ["type", 4.8],
    ["ask", 6.6],
    ["plan", 7.53],
    ["trips", 9.6],
  ]),
  transcript:
    "Pico's product film, vertical cut: 13 seconds, no sound, cut from the real app. On screen: “You just paid.” An Apple Pay notice for $6.40 at Corner Café. “Pico already caught it.” “One swipe, and it's counted.” “Or type it.” Someone asks “Can I afford $80 on food & drink?” and Ask Pico answers “Yes, within your Food & Drink budget.” “Every trip. Every currency.” End card: “Pico. Money, measured.”",
}

export const CUTS: Record<CutId, Cut> = { wide: WIDE, tall: TALL }

export const FPS = 30

export function chapterAt(cut: Cut, t: number): number {
  const cs = cut.chapters
  let i = 0
  while (i + 1 < cs.length && t >= cs[i + 1].start) i++
  return i
}

export const chapterEnd = (cut: Cut, i: number) =>
  i + 1 < cut.chapters.length ? cut.chapters[i + 1].start : cut.duration

/** Position in "chapter space": 2.25 is a quarter of the way through the third chapter. */
export function posAt(cut: Cut, t: number): number {
  const i = chapterAt(cut, t)
  const a = cut.chapters[i].start
  const b = chapterEnd(cut, i)
  return i + Math.min(0.9999, Math.max(0, (t - a) / (b - a)))
}

/** Inverse of posAt. */
export function timeAtPos(cut: Cut, pos: number): number {
  const n = cut.chapters.length
  const p = Math.min(n - 0.0001, Math.max(0, pos))
  const i = Math.floor(p)
  const a = cut.chapters[i].start
  return a + (p - i) * (chapterEnd(cut, i) - a)
}

/** The same moment in the other cut, matched by chapter (a beat the cut lacks maps to the next one it has). */
export function mapTime(from: Cut, to: Cut, t: number): number {
  const p = posAt(from, t)
  const i = Math.floor(p)
  const j = to.chapters.findIndex((c) => c.id === from.chapters[i].id)
  if (j >= 0) return timeAtPos(to, j + (p - i))
  for (let k = i + 1; k < from.chapters.length; k++) {
    const n = to.chapters.findIndex((c) => c.id === from.chapters[k].id)
    if (n >= 0) return to.chapters[n].start
  }
  return 0
}

const two = (n: number) => String(n).padStart(2, "0")

/** "MM:SS:FF" at 30 fps, like a camera's timecode. */
export function timecode(t: number): string {
  const f = Math.max(0, Math.floor(t * FPS + 1e-4))
  const s = Math.floor(f / FPS)
  return `${two(Math.floor(s / 60))}:${two(s % 60)}:${two(f % FPS)}`
}

/** "0:25" */
export const clock = (t: number) => `${Math.floor(t / 60)}:${two(Math.floor(t % 60))}`
