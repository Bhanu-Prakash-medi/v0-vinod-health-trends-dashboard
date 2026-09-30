"use client"

/**
 * Single switch for every analytics sink (PostHog, Snowplow, Hotjar).
 *
 * Starts "pending" and only flips to "allowed" once the dashboard has confirmed
 * the user may view Health Trends. While pending or denied, every event is
 * dropped, so users who are shown the "coming soon" screen (or who never get
 * past login) are never counted in any metric.
 */
type AnalyticsAccess = "pending" | "allowed" | "denied"

let access: AnalyticsAccess = "pending"
const allowedListeners = new Set<() => void>()

export function setAnalyticsAccess(allowed: boolean) {
  const next: AnalyticsAccess = allowed ? "allowed" : "denied"
  if (access === next) return
  access = next
  if (next === "allowed") {
    for (const listener of allowedListeners) listener()
  }
}

export function isAnalyticsAllowed(): boolean {
  return access === "allowed"
}

/** Run `listener` whenever analytics becomes allowed (immediately if it already is). */
export function onAnalyticsAllowed(listener: () => void): () => void {
  allowedListeners.add(listener)
  if (access === "allowed") listener()
  return () => allowedListeners.delete(listener)
}
