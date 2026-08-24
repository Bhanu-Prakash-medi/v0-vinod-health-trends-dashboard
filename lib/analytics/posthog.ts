"use client"

import posthog, { type CaptureResult } from "posthog-js"

let initialized = false

/**
 * Event properties PostHog fills with URLs. Even with autocapture and pageview
 * capture disabled, these are attached to every explicitly captured event.
 */
const URL_PROPERTY_KEYS = [
  "$current_url",
  "$pathname",
  "$referrer",
  "$referring_domain",
  "$initial_current_url",
  "$initial_pathname",
  "$initial_referrer",
  "$initial_referring_domain",
]

/**
 * Drop the query string and fragment from a URL-ish value, keeping only
 * origin + path. This dashboard is opened from the MediBuddy app, so the
 * landing URL and referrer can carry access tokens, member ids, or other
 * identifiers that must never leave the client.
 */
function stripUrlSensitiveParts(value: string): string {
  try {
    const parsed = new URL(value)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    // Relative values such as $pathname, or sentinels like "$direct".
    return value.split(/[?#]/)[0]
  }
}

/** Remove query strings/fragments from all URL properties on an event. */
function scrubEventUrls(event: CaptureResult | null): CaptureResult | null {
  if (!event?.properties) return event
  for (const key of URL_PROPERTY_KEYS) {
    const value = event.properties[key]
    if (typeof value === "string" && value) {
      event.properties[key] = stripUrlSensitiveParts(value)
    }
  }
  return event
}

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

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
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
      // Never send the visitor IP for a health application.
      mask_personal_data_properties: true,
      // Strip query strings/fragments from URL properties before sending.
      before_send: (e: CaptureResult | null) => {
        console.log("[v0] before_send called for:", e?.event)
        const out = scrubEventUrls(e)
        console.log("[v0] before_send returning:", out?.event)
        return out
      },
    })
    initialized = true
    ;(window as any).__phDebug = posthog
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
  console.log("[v0] trackEvent called:", name, "initialized=", initialized)
  if (typeof window === "undefined" || !initialized) return
  try {
    const ph = posthog as any
    console.log(
      "[v0] guards:",
      JSON.stringify({
        loaded: !!ph.__loaded,
        persistence: !!ph.persistence,
        sessionPersistence: !!ph.sessionPersistence,
        is_capturing: typeof ph.is_capturing === "function" ? ph.is_capturing() : "n/a",
        opted_out: typeof ph.has_opted_out_capturing === "function" ? ph.has_opted_out_capturing() : "n/a",
        consent: ph.consent && typeof ph.consent.isOptedOut === "function" ? ph.consent.isOptedOut() : "n/a",
      }),
    )
    const res = posthog.capture(name, properties)
    console.log(
      "[v0] posthog.capture returned:",
      name,
      res ? "uuid=" + (res as any).uuid + " event=" + (res as any).event : String(res),
    )
  } catch (error) {
    console.log("[v0] PostHog capture failed (non-blocking):", error)
  }
}
