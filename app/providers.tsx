"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { initPostHog, trackEvent } from "@/lib/analytics/posthog"

/**
 * Initializes PostHog (client-side, no-op if unconfigured) and fires the
 * app-loaded lifecycle event exactly once per mounted app instance. The ref
 * guard prevents a duplicate "health_trends_app_loaded" event from React
 * Strict Mode's dev-only double-invoke of effects.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const hasFiredAppLoadedRef = useRef(false)

  useEffect(() => {
    initPostHog()
    if (!hasFiredAppLoadedRef.current) {
      hasFiredAppLoadedRef.current = true
      trackEvent("health_trends_app_loaded")
    }
  }, [])

  return <>{children}</>
}

export default AnalyticsProvider
