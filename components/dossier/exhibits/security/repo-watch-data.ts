// Script for the "repo watch" simulation (case 03, AI-Driven Security Chatbot).
// A reconstruction, labelled "Simulation": every name, address and hash is an example.
// Addresses come from the documentation ranges (RFC 5737) and ASNs from the documentation
// block (RFC 5398), so nothing here points at a real network or person.

import { easeOut } from "./use-loop"

export type Level = "info" | "warn" | "crit"

export type RepoEvent = {
  id: string
  /** Clock time shown in the log. */
  time: string
  /** Event type badge. */
  kind: string
  actor: string
  /** Wide layout detail. */
  detail: string
  /** Compact layout line (includes the actor when it matters). */
  short: string
  level: Level
  /** A commit hash inside `detail` that the force-push later knocks off main. */
  hash?: string
  /** Annotation line under an anomalous row (wide). */
  note?: string
  /** Annotation line under an anomalous row (compact). */
  noteShort?: string
  /** When the row arrives, in ms of the loop. 0 or less means it is already on screen. */
  at: number
}

export const REPO = "acme/payments-api"

// ---- timeline (ms) ----
export const T = {
  ci: 900,
  login: 2300,
  force: 3900,
  token: 4700,
  typing1: 5200,
  alert: 6400,
  step1: 7300,
  step2: 7800,
  step3: 8300,
  compose: 9300,
  send: 10600,
  typing2: 11000,
  reply: 12200,
  fade: 17600,
} as const

export const DURATION = 18200
/** The still frame: everything has happened, nothing is fading. */
export const STILL_AT = 16000

export const MARKS = [
  T.ci,
  T.login,
  T.force,
  T.token,
  T.typing1,
  T.alert,
  T.step1,
  T.step2,
  T.step3,
  T.compose,
  T.send,
  T.typing2,
  T.reply,
  T.fade,
] as const

/** Step index reached once the mark at `t` has passed. */
export const S = Object.fromEntries(MARKS.map((m, i) => [m, i + 1])) as Record<number, number>

export const EVENTS: RepoEvent[] = [
  {
    id: "p0",
    time: "13:57:02",
    kind: "CI",
    actor: "actions",
    detail: "build #1184 passed · 2m 39s",
    short: "build #1184 passed",
    level: "info",
    at: -11,
  },
  {
    id: "p0b",
    time: "13:57:48",
    kind: "LOGIN",
    actor: "alice",
    detail: "203.0.113.17 · AS64500",
    short: "alice · 203.0.113.17",
    level: "info",
    at: -10,
  },
  {
    id: "p1",
    time: "13:58:40",
    kind: "PUSH",
    actor: "alice",
    detail: "feature/ledger · 1 commit",
    short: "alice → feature/ledger",
    level: "info",
    at: -9,
  },
  {
    id: "p2",
    time: "13:59:15",
    kind: "CI",
    actor: "actions",
    detail: "build #1185 passed · 2m 44s",
    short: "build #1185 passed",
    level: "info",
    at: -8,
  },
  {
    id: "p3",
    time: "13:59:52",
    kind: "LOGIN",
    actor: "carol",
    detail: "203.0.113.61 · AS64500",
    short: "carol · 203.0.113.61",
    level: "info",
    at: -7,
  },
  {
    id: "p4",
    time: "14:00:33",
    kind: "PR",
    actor: "alice",
    detail: "opened #482 · ledger rounding",
    short: "alice opened #482",
    level: "info",
    at: -6,
  },
  {
    id: "e1",
    time: "14:01:12",
    kind: "CI",
    actor: "actions",
    detail: "build #1186 passed · 2m 41s",
    short: "build #1186 passed",
    level: "info",
    at: -5,
  },
  {
    id: "e2",
    time: "14:01:48",
    kind: "PUSH",
    actor: "alice",
    detail: "feature/ledger · 2 commits",
    short: "alice → feature/ledger",
    level: "info",
    at: -4,
  },
  {
    id: "e3",
    time: "14:02:19",
    kind: "REVIEW",
    actor: "carol",
    detail: "approved #482",
    short: "carol approved #482",
    level: "info",
    at: -3,
  },
  {
    id: "e4",
    time: "14:02:31",
    kind: "LOGIN",
    actor: "bob",
    detail: "203.0.113.24 · AS64500",
    short: "bob · 203.0.113.24",
    level: "info",
    at: -2,
  },
  {
    id: "e5",
    time: "14:02:57",
    kind: "MERGE",
    actor: "carol",
    detail: "#482 → main · 9f3c2e1 · signed",
    short: "#482 → main · signed",
    hash: "9f3c2e1",
    level: "info",
    at: -1,
  },
  {
    id: "e6",
    time: "14:03:26",
    kind: "CI",
    actor: "actions",
    detail: "build #1187 passed · 2m 38s",
    short: "build #1187 passed",
    level: "info",
    at: T.ci,
  },
  {
    id: "e7",
    time: "14:03:40",
    kind: "LOGIN",
    actor: "bob",
    detail: "198.51.100.23 · AS64511",
    short: "bob · 198.51.100.23",
    level: "warn",
    note: "new ASN for this account · last seen AS64500",
    noteShort: "new ASN · AS64511",
    at: T.login,
  },
  {
    id: "e8",
    time: "14:04:02",
    kind: "PUSH -F",
    actor: "bob",
    detail: "main · 6 commits rewritten",
    short: "bob → main (forced)",
    level: "crit",
    note: "+ 9f3c2e1...7d0b5f1 main (forced update)",
    noteShort: "history rewritten",
    at: T.force,
  },
  {
    id: "e9",
    time: "14:04:09",
    kind: "TOKEN",
    actor: "bob",
    detail: "ghp_…a41f scope +admin:org",
    short: "token +admin:org",
    level: "crit",
    note: "scope escalated 7 s after the push",
    noteShort: "scope escalated",
    at: T.token,
  },
]

export const STEPS = [
  { title: "Revoke the token used", sub: "ghp_…a41f" },
  { title: "Restore main from the last trusted commit", sub: "9f3c2e1 · signed · 14:02:57" },
  { title: "Require signed commits on main", sub: "branch protection" },
]

/** Earlier in the day: the assistant answers questions about events, not just raises alerts. */
export const HISTORY = {
  q: "Anything unusual overnight?",
  a: "Nothing. 212 events, all from known networks, and every merge to main was signed.",
}

export const QUESTION = "Did Bob do this?"
export const REPLY =
  "Unlikely. Bob signs in from AS64500. This session came from AS64511 and escalated the token to admin:org 7 s after the push."
/** How long the reply takes to stream in. */
export const REPLY_STREAM = 1500

// ---- anomaly score ----

export const SCORE_FROM = -9000
export const SCORE_TO = 6800
export const SCORE_STEP = 200
export const THRESHOLD = 0.8

const BUMPS = [
  { at: T.login, to: 0.46, len: 700 },
  { at: T.force, to: 0.83, len: 520 },
  { at: T.token, to: 0.94, len: 520 },
]

/** Deterministic anomaly score at loop time t: a noisy baseline, then three steps up. */
export function score(t: number) {
  let level = 0.13 + 0.035 * Math.sin(t / 1300) + 0.02 * Math.sin(t / 3100 + 2)
  for (const b of BUMPS) if (t > b.at) level += (b.to - level) * easeOut((t - b.at) / b.len)
  const jitter = 0.024 * Math.sin(t / 233) + 0.017 * Math.sin(t / 97 + 1.7) + 0.011 * Math.sin(t / 51 + 0.4)
  return Math.min(0.985, Math.max(0.03, level + jitter * (1 - level * 0.75)))
}

/** The score the alert reports: where the line settles. */
export const RISK = score(SCORE_TO).toFixed(2)

/** Anomalies as points on the chart: [time, level]. */
export const MARKERS = [
  { at: T.login, level: "warn" as Level },
  { at: T.force, level: "crit" as Level },
  { at: T.token, level: "crit" as Level },
]
