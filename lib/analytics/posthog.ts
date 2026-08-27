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
      opt_out_useragent_filter: true,
      // Strip query strings/fragments from URL properties before sending.
      before_send: (e: CaptureResult | null) => {
        const out = scrubEventUrls(e)
        console.log(
          "[v0] ph_send",
          out?.event,
          JSON.stringify({
            mb_user_id: out?.properties?.mb_user_id,
            pm_entity_id: out?.properties?.pm_entity_id,
            email_sha256: out?.properties?.email_sha256 ? "present" : "absent",
            distinct_id: out?.properties?.distinct_id,
          }),
        )
        return out
      },
    })
    initialized = true
  } catch (error) {
    console.log("[v0] PostHog init failed (non-blocking):", error)
  }
}

export function isPostHogReady(): boolean {
  return initialized
}

/**
 * SHA-256 hex digest, used to send a stable but non-reversible reference to
 * the user's email address. Returns "" when WebCrypto isn't available (e.g. a
 * non-secure context) so a missing digest never blocks identification.
 */
async function sha256Hex(value: string): Promise<string> {
  try {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) return ""
    const bytes = new TextEncoder().encode(value)
    const digest = await subtle.digest("SHA-256", bytes)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  } catch {
    return ""
  }
}

/**
 * Identify the current user so unique-person metrics (DAU) and per-user
 * breakdowns work, and register the ids as super properties so every
 * subsequent event carries them.
 *
 * The raw email address is deliberately NOT sent. This is a health
 * application, so the email is reduced to a SHA-256 digest: it still joins
 * 1:1 with a known address (hash the address you're looking for and match),
 * but PostHog never stores a readable inbox for a health dashboard user.
 * `mbUserId` and `pmEntityId` are the same ids Snowplow sends, so the two
 * datasets can be reconciled.
 */
export async function identifyUser(user: {
  mbUserId?: string | number | null
  pmEntityId?: string | number | null
  email?: string | null
}) {
  if (typeof window === "undefined" || !initialized) return

  const mbUserId = user.mbUserId != null && user.mbUserId !== "" ? String(user.mbUserId) : ""
  const pmEntityId = user.pmEntityId != null && user.pmEntityId !== "" ? String(user.pmEntityId) : ""
  const normalizedEmail = (user.email || "").trim().toLowerCase()
  const emailHash = normalizedEmail ? await sha256Hex(normalizedEmail) : ""

  // Without a user id there is no stable person to attach to; stay anonymous
  // rather than inventing an identity.
  if (!mbUserId) return

  const identity: Record<string, string> = { mb_user_id: mbUserId }
  if (pmEntityId) identity.pm_entity_id = pmEntityId
  if (emailHash) identity.email_sha256 = emailHash

  try {
    posthog.identify(mbUserId, identity)
    // Super properties: attach the ids to every event from here on, so each
    // metric can be broken down by user / entity without extra plumbing.
    posthog.register(identity)
  } catch (error) {
    console.log("[v0] PostHog identify failed (non-blocking):", error)
  }
}

/** Controlled set of dashboard "section" values used by health_trends_section_viewed. */
export type TrendsSection = "summary" | "trends" | "all_parameters" | "reports" | "insights"

/**
 * Allow-listed event names — the metrics this dashboard reports on, plus two
 * failure diagnostics. Keep this list in sync with what's instrumented.
 *
 *  health_trends_viewed             -> unique people using Health Trends (DAU)
 *  health_trends_section_viewed     -> impressions (summary / trends / reports / ...)
 *  health_trends_action_clicked     -> "see all" style navigation
 *  health_report_downloaded         -> report downloads
 *  health_recommendation_cta_clicked-> recommendation CTA clicks
 *  health_feedback_submitted        -> feedback submissions
 *  health_digital_twin_clicked      -> digital twin organ clicks
 *  health_trends_time_spent         -> active time in the dashboard
 *  health_report_load_failed        -> diagnostics: dashboard broken for a user
 *  health_report_retry_clicked      -> diagnostics: user retried after a failure
 */
export type AnalyticsEventName =
  | "health_trends_viewed"
  | "health_trends_section_viewed"
  | "health_trends_action_clicked"
  | "health_report_downloaded"
  | "health_recommendation_cta_clicked"
  | "health_feedback_submitted"
  | "health_digital_twin_clicked"
  | "health_trends_time_spent"
  | "health_report_load_failed"
  | "health_report_retry_clicked"

/**
 * Only low-sensitivity, categorical properties are allowed on events. Never
 * add raw API responses, report contents, test names/results, or any
 * patient/beneficiary-identifying fields (names, emails, phone numbers,
 * access tokens, JWTs, cookies, or URLs containing identifiers) here.
 *
 * The user/entity ids are attached automatically as super properties by
 * identifyUser(), so individual call sites don't pass them.
 */
export interface AnalyticsEventProperties {
  source?: "self" | "family_member"
  section?: TrendsSection
  action?: string
  success?: boolean
  duration_ms?: number
  /** Which recommendation CTA was clicked (e.g. "Book Lab Test"). */
  service?: string
  /** Feedback rating, and whether it persisted server-side. */
  rating?: number
  saved?: boolean
  /** Digital twin organ identifier (anatomical, not patient data). */
  organ?: string
  /** Active seconds spent in the dashboard, for health_trends_time_spent. */
  active_seconds?: number
}

/**
 * Fire a single allow-listed analytics event with safe properties. No-ops
 * on the server and whenever PostHog hasn't been initialized (e.g. the
 * project token isn't configured), so instrumentation never breaks SSR/build
 * or blocks the UI.
 *
 * `useBeacon` switches to sendBeacon for events fired while the page is being
 * unloaded, which a normal XHR would lose.
 */
export function trackEvent(
  name: AnalyticsEventName,
  properties?: AnalyticsEventProperties,
  options?: { useBeacon?: boolean },
) {
  if (typeof window === "undefined" || !initialized) return
  try {
    posthog.capture(name, properties, options?.useBeacon ? { transport: "sendBeacon" } : undefined)
  } catch (error) {
    console.log("[v0] PostHog capture failed (non-blocking):", error)
  }
}

/**
 * Module-scoped guard for events that must fire at most once per page session.
 * A component ref is not enough: a remount (beneficiary switch, Strict Mode's
 * double-invoke, or a re-render of the dashboard root) creates fresh refs and
 * would double-count — which would inflate the DAU event volume.
 */
const firedOnceEvents = new Set<AnalyticsEventName>()

/**
 * Fire an event at most once per page session. Returns true when the event was
 * actually sent, false when it had already been recorded.
 */
export function trackEventOnce(name: AnalyticsEventName, properties?: AnalyticsEventProperties): boolean {
  if (typeof window === "undefined") return false
  if (firedOnceEvents.has(name)) return false
  firedOnceEvents.add(name)
  trackEvent(name, properties)
  return true
}
