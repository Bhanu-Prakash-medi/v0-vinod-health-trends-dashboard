"use client"

import { trackEvent } from "./posthog"

/**
 * Measures how long a user actively spends in the Health Trends dashboard.
 *
 * Only time where the tab is actually visible is counted: the timer pauses on
 * visibilitychange and resumes when the user comes back, so a dashboard left
 * open in a background tab (or a phone in a pocket) doesn't inflate the
 * average. Elapsed time is emitted as incremental `active_seconds` deltas, so
 * total time per user is SUM(active_seconds) and the average is that sum
 * averaged across users.
 */

let tracking = false
/** Timestamp the current visible stretch began, or null while paused. */
let segmentStartedAt: number | null = null
/** Visible milliseconds accumulated but not yet sent. */
let pendingMs = 0

/** Emit at most one event per 30s of activity so long sessions stay bounded. */
const FLUSH_INTERVAL_MS = 30_000
let flushTimer: ReturnType<typeof setInterval> | null = null

function accumulate() {
  if (segmentStartedAt == null) return
  pendingMs += Date.now() - segmentStartedAt
  segmentStartedAt = null
}

/** Send whatever whole seconds have accrued, keeping the remainder. */
function flush(useBeacon = false) {
  const seconds = Math.floor(pendingMs / 1000)
  if (seconds < 1) return
  pendingMs -= seconds * 1000
  trackEvent("health_trends_time_spent", { active_seconds: seconds }, { useBeacon })
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    // Resuming: start a new visible stretch.
    if (segmentStartedAt == null) segmentStartedAt = Date.now()
  } else {
    // Backgrounded: bank the time and report it now, because a mobile browser
    // may never run another event for this page.
    accumulate()
    flush(true)
  }
}

function handlePageHide() {
  accumulate()
  flush(true)
}

/**
 * Begin tracking. Safe to call more than once — subsequent calls are ignored,
 * so React Strict Mode's double-invoked effects don't double-count.
 * Returns a cleanup function that flushes any remaining time.
 */
export function startTimeSpentTracking(): () => void {
  if (typeof window === "undefined" || tracking) return () => {}
  tracking = true

  segmentStartedAt = document.visibilityState === "visible" ? Date.now() : null

  document.addEventListener("visibilitychange", handleVisibilityChange)
  window.addEventListener("pagehide", handlePageHide)

  flushTimer = setInterval(() => {
    // Bank the in-progress stretch, report it, then keep timing.
    accumulate()
    flush()
    if (document.visibilityState === "visible") segmentStartedAt = Date.now()
  }, FLUSH_INTERVAL_MS)

  return () => {
    if (flushTimer) {
      clearInterval(flushTimer)
      flushTimer = null
    }
    document.removeEventListener("visibilitychange", handleVisibilityChange)
    window.removeEventListener("pagehide", handlePageHide)
    accumulate()
    flush(true)
    tracking = false
  }
}
