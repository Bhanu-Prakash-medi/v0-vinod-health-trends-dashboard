"use client"

import type React from "react"
import { useEffect } from "react"
import { initPostHog } from "@/lib/analytics/posthog"
import { DesignProvider } from "@/lib/design-context"

/**
 * Initializes PostHog (client-side, no-op if unconfigured). The main-page
 * landing event is sent from the dashboard once the user's ids are known.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return <DesignProvider>{children}</DesignProvider>
}

export default AnalyticsProvider
