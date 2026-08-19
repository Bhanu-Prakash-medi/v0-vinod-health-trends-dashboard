"use client"

import posthog from "posthog-js"

let initialized = false

/**
 * Initialize PostHog once, client-side only. No-ops (safe for SSR/build and
 * for environments where the project token hasn't been configured yet) when
 * NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is missing.
 *
 * Deliberately conservative for a health application:
 *  - autocapture / pageview / pageleave capture are OFF. We only send the
 *    explicit, allow-listed events defined below.
 *  - session recording is disabled — recordings could visually expose report
 *    contents, test names/results, or other PII.
 *  - person_profiles is "identified_only" so we don't create/merge person
 *    profiles from anonymous traffic.
 */
export function initPostHog() {
  if (typeof window === "undefined" || initialized) return

  // PostHog project tokens are public (exposed client-side by design), so the
  // configured project token is used as the default with an env-var override.
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN || "e1e515f41d084209ae3b17f97f537942"
  if (!token) {
    // Analytics is a no-op when unconfigured; the app must still work.
    return
  }

  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

  try {
    posthog.init(token, {
      api_host: apiHost,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      person_profiles: "identified_only",
    })
    initialized = true
  } catch (error) {
    console.log("[v0] PostHog init failed (non-blocking):", error)
  }
}

export function isPostHogReady(): boolean {
  return initialized
}

/** Controlled set of dashboard "section" values used by health_trends_section_viewed. */
export type TrendsSection = "summary" | "trends" | "all_parameters" | "reports" | "insights"

/** Allow-listed event names. Keep this list in sync with what's instrumented. */
export type AnalyticsEventName =
  | "health_trends_app_loaded"
  | "health_report_load_started"
  | "health_report_load_succeeded"
  | "health_report_load_failed"
  | "health_report_retry_clicked"
  | "health_trends_section_viewed"
  | "health_trends_action_clicked"

/**
 * Only low-sensitivity, categorical properties are allowed on events. Never
 * add raw API responses, report contents, test names/results, or any
 * patient/beneficiary-identifying fields (names, emails, phone numbers,
 * access tokens, JWTs, cookies, or URLs containing identifiers) here.
 */
export interface AnalyticsEventProperties {
  source?: "self" | "family_member"
  section?: TrendsSection
  action?: string
  success?: boolean
  duration_ms?: number
}

/**
 * Fire a single allow-listed analytics event with safe properties. No-ops
 * on the server and whenever PostHog hasn't been initialized (e.g. the
 * project token isn't configured), so instrumentation never breaks SSR/build
 * or blocks the UI.
 */
export function trackEvent(name: AnalyticsEventName, properties?: AnalyticsEventProperties) {
  if (typeof window === "undefined" || !initialized) return
  try {
    posthog.capture(name, properties)
  } catch (error) {
    console.log("[v0] PostHog capture failed (non-blocking):", error)
  }
}
