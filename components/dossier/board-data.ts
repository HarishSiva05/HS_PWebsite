// The evidence board's model: what is pinned, which red strings join what, and where it all sits.
// Everything is derived from lib/dossier.ts; only the positions are hand-tuned here.

import { CASES, CERTIFICATIONS, EXPERIENCE, MATRIX, TRAINING, type EvidenceRef } from "@/lib/dossier"

export type Kind = "subject" | "skill" | "case" | "job" | "training" | "cert"

export type Item = {
  id: string
  kind: Kind
  w: number
  h: number
  /** case id, record id, or MATRIX index for skill cards */
  ref: string
  /** order the item is pinned in during the entrance */
  order: number
}

export type Edge = {
  id: string
  a: string
  b: string
  /** technique indexes of the skill card that cite this evidence (empty for subject strings) */
  skills: number[]
}

// ---------- sizes (board units) ----------

export const SKILL_W = 196
export const SKILL_HEAD = 64
export const SKILL_LINE = 17
const SKILL_FOOT = 14
export const skillH = (n: number) => SKILL_HEAD + n * SKILL_LINE + SKILL_FOOT

const SIZE: Record<Exclude<Kind, "skill">, [number, number]> = {
  subject: [178, 218],
  case: [152, 140],
  job: [168, 80],
  training: [156, 70],
  cert: [158, 86],
}
const SMALL_CASE: [number, number] = [138, 128]

export const evidenceId = (e: EvidenceRef) =>
  e.kind === "case" ? `case-${e.id}` : e.id === "certs" ? "cert" : `rec-${e.id}`

export const CERT = CERTIFICATIONS.find((c) => /xdr/i.test(c.title)) ?? CERTIFICATIONS[0]

// ---------- items ----------

const ORDER = [
  "subject",
  "TA01",
  "case-apt",
  "rec-esentire",
  "TA02",
  "rec-doqpros",
  "TA04",
  "case-pico",
  "case-chatbot",
  "rec-greenecm",
  "TA05",
  "rec-homelab",
  "TA03",
  "rec-thm",
  "cert",
  "case-metawipe",
  "case-ethchat",
  "case-energy",
  "rec-antisyphon",
  "case-agrimate",
]

const items: Item[] = [
  { id: "subject", kind: "subject", w: SIZE.subject[0], h: SIZE.subject[1], ref: "subject", order: 0 },
  ...MATRIX.map((t, i) => ({
    id: t.id,
    kind: "skill" as const,
    w: SKILL_W,
    h: skillH(t.techniques.length),
    ref: String(i),
    order: 0,
  })),
  ...CASES.map((c) => {
    const [w, h] = c.featured ? SIZE.case : SMALL_CASE
    return { id: `case-${c.id}`, kind: "case" as const, w, h, ref: c.id, order: 0 }
  }),
  ...EXPERIENCE.map((x) => ({ id: `rec-${x.id}`, kind: "job" as const, w: SIZE.job[0], h: SIZE.job[1], ref: x.id, order: 0 })),
  ...TRAINING.map((x) => ({
    id: `rec-${x.id}`,
    kind: "training" as const,
    w: SIZE.training[0],
    h: SIZE.training[1],
    ref: x.id,
    order: 0,
  })),
  { id: "cert", kind: "cert", w: SIZE.cert[0], h: SIZE.cert[1], ref: "certs", order: 0 },
]
items.forEach((it) => {
  const o = ORDER.indexOf(it.id)
  it.order = o < 0 ? ORDER.length : o
})

export const ITEMS = items
export const ITEM = Object.fromEntries(items.map((i) => [i.id, i])) as Record<string, Item>

// ---------- red string ----------
// Each skill card is tied to every piece of evidence any of its skills cites (deduped);
// the subject is tied to the three employers.

export const EDGES: Edge[] = (() => {
  const out: Edge[] = []
  MATRIX.forEach((tac) => {
    const cites = new Map<string, number[]>()
    tac.techniques.forEach((tech, i) =>
      tech.evidence.forEach((e) => {
        const to = evidenceId(e)
        if (!ITEM[to]) return
        const list = cites.get(to) ?? []
        if (!list.includes(i)) list.push(i)
        cites.set(to, list)
      }),
    )
    cites.forEach((skills, to) => out.push({ id: `${tac.id}>${to}`, a: tac.id, b: to, skills }))
  })
  EXPERIENCE.forEach((x) => out.push({ id: `subject>rec-${x.id}`, a: "subject", b: `rec-${x.id}`, skills: [] }))
  return out
})()

// ---------- layouts ----------
// x, y = top-left corner, r = rotation (deg). Pins are offsets from the card's top-left corner
// (before rotation). Every card has a pin at the top; a second pin in a corner is used only when a
// string ties onto it. A string ties onto the closest pin pair in the home layout, with a small
// penalty on secondary pins so the top pins carry most of the string.

export type Place = { x: number; y: number; r: number; pins?: [number, number][] }
export type Layout = {
  name: "wide" | "compact"
  W: number
  H: number
  at: Record<string, Place>
  /** force a string onto specific pins: edge id -> [pin index on a, pin index on b] */
  ties?: Record<string, [number, number]>
  /** how loosely a string hangs, 1 = default; under 1 pulls it tauter */
  slack?: Record<string, number>
}

const p = (x: number, y: number, r: number, pins?: [number, number][]): Place => ({ x, y, r, pins })

export const WIDE: Layout = {
  name: "wide",
  W: 1200,
  H: 712,
  at: {
    TA01: p(40, 20, -1.6),
    "case-apt": p(268, 18, -3),
    "rec-greenecm": p(452, 58, 2.2),
    subject: p(530, 150, 1),
    TA04: p(718, 26, 1.6, [[58, 10], [178, 190]]),
    "case-pico": p(946, 20, 3.2),

    "rec-thm": p(16, 212, 2.4),
    "rec-esentire": p(272, 256, -2.4),
    "rec-homelab": p(254, 362, 1.8),
    "rec-doqpros": p(614, 392, 2, [[84, 10], [98, 73]]),
    "case-energy": p(882, 330, -3),
    "case-ethchat": p(1040, 196, 3.4),
    "case-metawipe": p(1034, 358, -2.2),

    TA03: p(40, 296, -1.2),
    cert: p(124, 522, -2.8),
    "rec-antisyphon": p(58, 624, -1.8),
    TA05: p(290, 482, 1.2),
    TA02: p(496, 502, -1.4),
    "case-chatbot": p(720, 490, 2.6),
    "case-agrimate": p(1042, 556, 2.8),
  },
  ties: {
    "TA03>rec-homelab": [1, 1],
    "TA02>rec-homelab": [0, 1],
    "TA05>rec-doqpros": [0, 1],
    "TA02>rec-doqpros": [0, 1],
    "TA03>case-apt": [0, 1],
    "TA04>case-apt": [0, 0],
    "TA04>case-pico": [1, 1],
  },
  slack: {
    "TA04>case-apt": 0.5,
  },
}

export const COMPACT: Layout = {
  name: "compact",
  W: 1000,
  H: 860,
  at: {
    TA01: p(16, 20, -1.6),
    "rec-greenecm": p(326, 32, 2.2),
    TA04: p(605, 41, 1.6),
    "case-energy": p(840, 33, -3),

    "case-apt": p(233, 136, -3),
    subject: p(412, 145, 1),
    "case-ethchat": p(847, 193, 3.4),
    "rec-thm": p(31, 258, 2.4),

    "case-metawipe": p(830, 350, -2.2),
    "rec-doqpros": p(502, 378, 2),
    "case-chatbot": p(676, 394, 2.6),
    "rec-esentire": p(257, 422, -2.4),
    TA03: p(25, 430, -1.2),
    "case-agrimate": p(847, 502, 2.8),
    "rec-homelab": p(232, 519, 1.8),

    TA05: p(315, 631, 1.2),
    "case-pico": p(767, 640, 3.2),
    cert: p(146, 654, -2.8),
    TA02: p(540, 662, -1.4),
    "rec-antisyphon": p(79, 776, -1.8),
  },
  ties: {
    "TA05>rec-doqpros": [0, 1],
  },
}

/** Candidate pins for an item in a layout: the layout's own, or the defaults for its kind. */
export function pinsOf(id: string, layout: Layout): [number, number][] {
  const own = layout.at[id]?.pins
  if (own) return own
  const { w, h, kind } = ITEM[id]
  switch (kind) {
    case "subject":
      return [[w / 2, 11], [17, h - 15], [w - 17, h - 15]]
    case "skill":
      return [[w / 2, 11], [w - 18, h - 7]]
    case "case":
      return [[w / 2, 10], [w - 17, h - 13]]
    case "training":
      // the stub's top row carries the dates: pin the ticket past them
      return [[w - 24, 10], [w - 17, h - 10]]
    case "cert":
      return [[27, 9], [w - 17, h - 10]]
    default:
      return [[w / 2, 10], [w - 17, h - 10]]
  }
}

/** Extra "distance" a string pays to tie onto a secondary pin (the subject's pins are all equal). */
export const pinPenalty = (id: string, i: number) => (i === 0 || ITEM[id].kind === "subject" ? 0 : 30)
