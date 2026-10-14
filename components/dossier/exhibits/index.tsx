"use client"

import dynamic from "next/dynamic"
import type { ComponentType } from "react"
import type { ExhibitProps } from "./types"

export type { ExhibitProps } from "./types"

// Each exhibit is its own chunk, loaded only when something renders it.
const load = (f: () => Promise<{ default: ComponentType<ExhibitProps> }>) =>
  dynamic(f, { ssr: false, loading: () => <div className="exhibit-loading" aria-hidden="true" /> })

const REGISTRY: Record<string, ComponentType<ExhibitProps>> = {
  apt: load(() => import("./apt")),
  pico: load(() => import("./pico")),
  chatbot: load(() => import("./chatbot")),
  metawipe: load(() => import("./metawipe")),
  ethchat: load(() => import("./ethchat")),
  energy: load(() => import("./energy")),
  agrimate: load(() => import("./agrimate")),
}

export const hasExhibit = (id: string) => id in REGISTRY

/** Renders the exhibit for a case id. It fills its parent box; the parent sets size and aspect. */
export function Exhibit({ id, ...props }: ExhibitProps & { id: string }) {
  const C = REGISTRY[id]
  return C ? <C {...props} /> : null
}
