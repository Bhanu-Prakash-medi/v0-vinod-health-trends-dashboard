"use client"

import type React from "react"
import { useEffect } from "react"
import { initPostHog } from "@/lib/analytics/posthog"
import { startTimeSpentTracking } from "@/lib/analytics/time-spent"

/**
 * Initializes PostHog (client-side, no-op if unconfigured) and starts the
 * active-time timer that powers the average time-spent metric.
 *
 * The "unique people" (DAU) event is intentionally NOT fired here: it is sent
 * from the dashboard once the user's mbUserId/pmEntityId are known, so every
 * DAU event carries the identity needed to count unique people.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
    console.log("[v0] diagnostic: firing test capture")
    import("@/lib/analytics/posthog").then(({ trackEvent }) => trackEvent("dashboard_view"))
    // startTimeSpentTracking guards against duplicate starts itself, so
    // Strict Mode's double-invoked effect can't double-count time.
    return startTimeSpentTracking()
  }, [])

  return <>{children}</>
}

export default AnalyticsProvider
