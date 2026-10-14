"use client"

import { useSyncExternalStore } from "react"

// Tiny shared store: intro state, redaction tally, and which case file is open.

type State = {
  introDone: boolean
  total: number
  opened: number
  openCase: string | null
}

let state: State = { introDone: false, total: 0, opened: 0, openCase: null }
const listeners = new Set<() => void>()

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

const SERVER_STATE: State = { introDone: false, total: 0, opened: 0, openCase: null }

export function useDossier<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(SERVER_STATE),
  )
}

export const dossier = {
  get: () => state,
  finishIntro: () => {
    if (!state.introDone) set({ introDone: true })
  },
  registerRedaction: () => {
    set({ total: state.total + 1 })
    let opened = false
    return {
      open: () => {
        if (opened) return
        opened = true
        set({ opened: state.opened + 1 })
      },
      unregister: () => set({ total: state.total - 1, opened: state.opened - (opened ? 1 : 0) }),
    }
  },
  openCase: (id: string) => set({ openCase: id }),
  closeCase: () => set({ openCase: null }),
}
