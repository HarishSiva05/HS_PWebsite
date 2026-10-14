// Data and timeline for the APT attribution exhibit. Pure module: no DOM, no React.
// Every number shown by the exhibit is derived here from lib/exhibits/apt-data.ts (the real
// Random Forest results); nothing is invented. The only free choice is the ORDER in which the
// replay classifies the 308 held-out samples (row by row, shuffled within a row).

import { APT_DATASET, APT_MODELS, CONFUSION_DIAGONAL, CONFUSION_MISSES, OPCODE_PAIRS } from "@/lib/exhibits/apt-data"

export { APT_DATASET, APT_MODELS }

/** Groups in the matrix (35). */
export const N = CONFUSION_DIAGONAL.length
export const CORRECT = CONFUSION_DIAGONAL.reduce((a, b) => a + b, 0)
export const MISSED = CONFUSION_MISSES.reduce((a, m) => a + m[2], 0)
export const TOTAL = CORRECT + MISSED
/** 95.13 */
export const ACCURACY_PCT = (CORRECT / TOTAL) * 100
export const ACCURACY_TEXT = `${ACCURACY_PCT.toFixed(1)}%`
export const DIAG_MAX = Math.max(...CONFUSION_DIAGONAL)
export const MISS_MAX = Math.max(...CONFUSION_MISSES.map((m) => m[2]))

/** Samples per actual group (row sums). */
export const ROW_TOTAL = CONFUSION_DIAGONAL.map(
  (d, r) => d + CONFUSION_MISSES.filter((m) => m[0] === r).reduce((a, m) => a + m[2], 0),
)

const VALUES = new Map<number, number>()
CONFUSION_DIAGONAL.forEach((n, r) => VALUES.set(r * N + r, n))
CONFUSION_MISSES.forEach(([r, c, n]) => VALUES.set(r * N + c, n))
/** Count in cell (actual r, predicted c). */
export const cellValue = (r: number, c: number) => VALUES.get(r * N + c) ?? 0

/** The predicted group that collects the most misattributions (derived, not hand-picked). */
export const MAGNET = (() => {
  const byCol = new Map<number, number>()
  for (const [, c, n] of CONFUSION_MISSES) byCol.set(c, (byCol.get(c) ?? 0) + n)
  let col = -1
  let count = 0
  byCol.forEach((n, c) => {
    if (n > count) {
      count = n
      col = c
    }
  })
  return { col, count }
})()

export const pad2 = (n: number) => String(n).padStart(2, "0")
export const pad3 = (n: number) => String(n).padStart(3, "0")

/** Opcode pairs split into [first, second] mnemonic, for the stream. */
export const OPCODES: readonly (readonly [string, string])[] = OPCODE_PAIRS.map((p) => {
  const i = p.indexOf(" ")
  return [p.slice(0, i), p.slice(i + 1)] as const
})

export const MODEL_ABBR: Record<string, string> = {
  "Random Forest": "RF",
  SVM: "SVM",
  KNN: "KNN",
  "Decision Tree": "DT",
}

/** Dot-plot axis for the leaderboard: whole percents around the four accuracies (92 to 96). */
export const AXIS = (() => {
  const pcts = APT_MODELS.map((m) => m.accuracy * 100)
  const lo = Math.floor(Math.min(...pcts)) - 1
  const hi = Math.ceil(Math.max(...pcts))
  const ticks: number[] = []
  for (let v = lo; v <= hi; v++) ticks.push(v)
  return { lo, hi, ticks }
})()
export const axisFrac = (pct: number) => (pct - AXIS.lo) / (AXIS.hi - AXIS.lo)

// ============ TIMELINE (seconds) ============

export const DUR = {
  /** first run: the grid powers on */
  introFirst: 1.15,
  /** re-runs: a beat with the cleared grid */
  intro: 0.6,
  scan: 7.4,
  resolve: 3,
  hold: 6,
  /** a fast rewind sweep clears the matrix */
  outro: 0.95,
}

export type Clock = { scan0: number; res0: number; hold0: number; out0: number; end: number }

export function clockFor(first: boolean): Clock {
  const scan0 = first ? DUR.introFirst : DUR.intro
  const res0 = scan0 + DUR.scan
  const hold0 = res0 + DUR.resolve
  const out0 = hold0 + DUR.hold
  return { scan0, res0, hold0, out0, end: out0 + DUR.outro }
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3)
export const easeOutExpo = (x: number) => (x >= 1 ? 1 : x <= 0 ? 0 : 1 - Math.pow(2, -10 * x))
export const easeInOutCubic = (x: number) => {
  const v = clamp01(x)
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2
}
export const easeOutBack = (x: number) => {
  const v = clamp01(x)
  const c1 = 1.9
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2)
}

/** Beam speed profile: eases in so the eye catches the mechanism, eases out for the finish. */
const shape = (u: number) => 0.34 * u + 0.66 * ((1 - Math.cos(Math.PI * u)) / 2)
/** Rows scanned (0..N) at scan-relative time s. */
export const scanRows = (s: number) => N * shape(clamp01(s / DUR.scan))

function timeAtRows(p: number) {
  let lo = 0
  let hi = 1
  for (let i = 0; i < 36; i++) {
    const mid = (lo + hi) / 2
    if (N * shape(mid) < p) lo = mid
    else hi = mid
  }
  return ((lo + hi) / 2) * DUR.scan
}

function rng(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Sample = { r: number; c: number; ok: boolean; launch: number; land: number }
export type LitCell = { r: number; c: number; n: number; ok: boolean; lands: number[] }

/** Seconds a sample takes to travel from the actual-group axis to its predicted column. */
export const flightTime = (c: number) => 0.2 + 0.3 * ((c + 1) / N)

const samples: Sample[] = []
for (let r = 0; r < N; r++) {
  const cols: number[] = new Array(CONFUSION_DIAGONAL[r]).fill(r)
  for (const [ar, pc, n] of CONFUSION_MISSES) if (ar === r) for (let i = 0; i < n; i++) cols.push(pc)
  const rand = rng(97 + r * 131)
  for (let i = cols.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[cols[i], cols[j]] = [cols[j], cols[i]]
  }
  cols.forEach((c, k) => {
    const launch = timeAtRows(r + (k + 0.5) / cols.length)
    samples.push({ r, c, ok: c === r, launch, land: launch + flightTime(c) })
  })
}
samples.sort((a, b) => a.land - b.land)

/** All 308 samples, sorted by landing time (scan-relative seconds). */
export const SAMPLES: readonly Sample[] = samples
export const LANDS = samples.map((s) => s.land)
export const LANDS_OK = samples.filter((s) => s.ok).map((s) => s.land)
export const MISS_SAMPLES = samples.filter((s) => !s.ok)
/** When the last sample lands, relative to the scan start. */
export const LAST_LAND = LANDS[LANDS.length - 1]

const lit = new Map<number, LitCell>()
for (const s of samples) {
  const key = s.r * N + s.c
  let cell = lit.get(key)
  if (!cell) {
    cell = { r: s.r, c: s.c, n: cellValue(s.r, s.c), ok: s.ok, lands: [] }
    lit.set(key, cell)
  }
  cell.lands.push(s.land)
}
/** The 47 non-empty cells with their landing times. */
export const LIT: readonly LitCell[] = [...lit.values()]

/** Number of entries in a sorted array that are <= x. */
export function countLE(sorted: readonly number[], x: number) {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] <= x) lo = mid + 1
    else hi = mid
  }
  return lo
}

// prefix sums by row, for the rewind sweep
const prefix = (f: (r: number) => number) => {
  const out = [0]
  for (let r = 0; r < N; r++) out.push(out[r] + f(r))
  return out
}
export const PREFIX_ALL = prefix((r) => ROW_TOTAL[r])
export const PREFIX_OK = prefix((r) => CONFUSION_DIAGONAL[r])

// ============ WORDS ============

/** Tooltip text for one cell. */
export function describeCell(r: number, c: number) {
  const n = cellValue(r, c)
  if (r === c) {
    const of = ROW_TOTAL[r]
    return {
      kind: "ok" as const,
      value: `${n} correct`,
      label: of === n ? `group ${r} · all ${of} attributed` : `group ${r} · ${n} of ${of} attributed`,
    }
  }
  if (n > 0) {
    return {
      kind: "miss" as const,
      value: `${n} sample${n === 1 ? "" : "s"} misattributed`,
      label: `actual group ${r} → predicted ${c}`,
    }
  }
  return { kind: "none" as const, value: "0 samples", label: `actual ${r} → predicted ${c}` }
}

const missList = CONFUSION_MISSES.map(([r, c, n]) => `group ${r} as ${c} (${n})`).join(", ")

/** Full text equivalent of the matrix, for screen readers. */
export const MATRIX_SUMMARY =
  `Random Forest confusion matrix: ${TOTAL} held-out malware samples from ${N} APT groups, rows by actual group, columns by predicted group. ` +
  `${CORRECT} samples (${ACCURACY_TEXT}) sit on the diagonal, attributed to the right group. ` +
  `${MISSED} were misattributed: ${missList}. ` +
  `${MAGNET.count} of the ${MISSED} misattributions went to group ${MAGNET.col}.`
