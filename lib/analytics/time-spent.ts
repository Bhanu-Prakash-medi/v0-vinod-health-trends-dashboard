"use client"

import { trackEvent } from "./posthog"

/**
 * Measures how long a user actively spends in the Health Trends dashboard and
 * reports it as a SINGLE event when they actually leave — not once per tab
 * switch and not on a recurring interval. Switching tabs only pauses the
 * clock (background time isn't counted); it never triggers its own event.
 */

let tracking = false
/** Timestamp the current visible stretch began, or null while paused. */
let segmentStartedAt: number | null = null
/** Total visible milliseconds accumulated for this session. */
let totalMs = 0
/** Guards against sending the final event twice (e.g. pagehide then unmount). */
let flushed = false

function accumulate() {
  if (segmentStartedAt == null) return
  totalMs += Date.now() - segmentStartedAt
  segmentStartedAt = null
}

/** Send the total accumulated time once, as a single final event. */
function flushOnce(useBeacon = false) {
  if (flushed) return
  const seconds = Math.floor(totalMs / 1000)
  if (seconds < 1) return
  flushed = true
  trackEvent("dashboard_time_spent", { active_seconds: seconds }, { useBeacon })
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    // Resuming: start a new visible stretch. No event fires here.
    if (segmentStartedAt == null) segmentStartedAt = Date.now()
  } else {
    // Backgrounded: just stop the clock. Don't send anything — a tab switch
    // isn't "closing" Health Trends, it's just paused.
    accumulate()
  }
}

function handlePageHide() {
  accumulate()
  flushOnce(true)
}

/**
 * Begin tracking. Safe to call more than once — subsequent calls are ignored,
 * so React Strict Mode's double-invoked effects don't double-count.
 * Returns a cleanup function that sends the single final event.
 */
export function startTimeSpentTracking(): () => void {
  if (typeof window === "undefined" || tracking) return () => {}
  tracking = true

  segmentStartedAt = document.visibilityState === "visible" ? Date.now() : null

  document.addEventListener("visibilitychange", handleVisibilityChange)
  window.addEventListener("pagehide", handlePageHide)

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    window.removeEventListener("pagehide", handlePageHide)
    accumulate()
    flushOnce(true)
    tracking = false
  }
}
