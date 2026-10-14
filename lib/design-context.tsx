"use client"

import type React from "react"
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react"

export type DesignVariant = "classic" | "premium"

const STORAGE_KEY = "ht-design-variant"
const listeners = new Set<() => void>()

function readVariant(): DesignVariant {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "premium" ? "premium" : "classic"
  } catch {
    return "classic"
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

type DesignContextValue = { design: DesignVariant; setDesign: (d: DesignVariant) => void }

const DesignContext = createContext<DesignContextValue>({ design: "classic", setDesign: () => {} })

export function DesignProvider({ children }: { children: React.ReactNode }) {
  const design = useSyncExternalStore(subscribe, readVariant, () => "classic" as DesignVariant)

  const setDesign = useCallback((d: DesignVariant) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, d)
    } catch {
      // Storage can be unavailable (private mode / embedded webview); the
      // preference simply won't persist in that case.
    }
    listeners.forEach((l) => l())
  }, [])

  const value = useMemo(() => ({ design, setDesign }), [design, setDesign])
  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>
}

export function useDesign() {
  return useContext(DesignContext)
}
