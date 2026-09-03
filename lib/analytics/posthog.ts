"use client"

import posthog, { type CaptureResult } from "posthog-js"
import { getPlatformFromCookie } from "@/lib/api"

let initialized = false

/**
 * Normalize the raw "platform" cookie value into the three buckets every
 * PostHog event should be broken down by. The cookie is set by the native
 * app WebViews to "android_mv" / "iOS_mv"; anything else (absent, unknown,
 * or a plain web session) is reported as "web".
 */
function resolvePlatform(): "android_mv" | "iOS_mv" | "web" {
  const raw = getPlatformFromCookie().trim().toLowerCase()
  if (raw === "android_mv") return "android_mv"
  if (raw === "ios_mv") return "iOS_mv"
  return "web"
}

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
      before_send: scrubEventUrls,
    })
    initialized = true
    // Super property: attach the platform to every event captured from here
    // on (including identify() calls), so every metric can be broken down
    // by android_mv / iOS_mv / web without each call site passing it.
    posthog.register({ platform: resolvePlatform() })
  } catch (error) {
    console.log("[v0] PostHog init failed (non-blocking):", error)
  }
}

export function isPostHogReady(): boolean {
  return initialized
}

/**
 * Identify the current user so unique-person metrics (DAU) and per-user
 * breakdowns work, and register the ids as super properties so every
 * subsequent event carries them.
 *
 * `email` and `name` are sent as-is (not hashed) at the caller's request.
 * `mbUserId` and `pmEntityId` are the same ids Snowplow sends, so the two
 * datasets can be reconciled.
 */
export function identifyUser(user: {
  mbUserId?: string | number | null
  pmEntityId?: string | number | null
  email?: string | null
  name?: string | null
}) {
  if (typeof window === "undefined" || !initialized) return

  const mbUserId = user.mbUserId != null && user.mbUserId !== "" ? String(user.mbUserId) : ""
  const pmEntityId = user.pmEntityId != null && user.pmEntityId !== "" ? String(user.pmEntityId) : ""
  const email = (user.email || "").trim()
  const name = (user.name || "").trim()

  // Without a user id there is no stable person to attach to; stay anonymous
  // rather than inventing an identity.
  if (!mbUserId) return

  const identity: Record<string, string> = { mb_user_id: mbUserId }
  if (pmEntityId) identity.pm_entity_id = pmEntityId
  if (email) identity.email = email
  if (name) identity.name = name

  try {
    posthog.identify(mbUserId, identity)
    // Super properties: attach the ids to every event from here on, so each
    // metric can be broken down by user / entity without extra plumbing.
    posthog.register(identity)
  } catch (error) {
    console.log("[v0] PostHog identify failed (non-blocking):", error)
  }
}

/** Controlled set of dashboard "section" values, used to pick a section_view event name. */
export type TrendsSection = "summary" | "trends" | "all_parameters" | "reports" | "digital_twin"

/**
 * Allow-listed event names — the metrics this dashboard reports on, plus two
 * failure diagnostics. Naming convention: `{section}_{view|click}` — the
 * event name itself tells you what section it belongs to and whether it's an
 * impression or an interaction. Keep this list in sync with what's
 * instrumented.
 *
 *  health_trends_view                -> unique people using Health Trends (DAU)
 *  summary_view                      -> Summary section impression
 *  digital_twin_view                 -> Digital Twin section impression
 *  trends_view                       -> Trends section impression
 *  reports_view                      -> Reports section impression
 *  all_parameters_view               -> All Parameters section impression
 *  trends_view_all_click             -> "See all" clicked on Trends
 *  all_parameters_view_all_click     -> "See all" clicked on All Parameters
 *  trend_point_click                 -> a data point on a trend chart clicked
 *  reports_download_click            -> report downloaded
 *  no_reports                        -> a beneficiary has no lab reports available
 *  recommendations_click             -> recommendation CTA clicked
 *  feedback_submit_click             -> feedback submitted
 *  digital_twin_click                -> digital twin organ clicked
 *  youtube_video_click               -> "How it's calculated" YouTube link clicked
 *  website_click                     -> "Learn more" external website link clicked
 *  health_trends_time_spent          -> total active time in Health Trends for
 *                                        the whole session (covers every
 *                                        in-page view — summary, See All
 *                                        Trends/Parameters, reports, etc. —
 *                                        not just the initial dashboard view)
 *  health_trends_load_failed         -> diagnostics: Health Trends broken for a user
 *  health_trends_retry_click         -> diagnostics: user retried after a failure
 */
export type AnalyticsEventName =
  | "health_trends_view"
  | "summary_view"
  | "digital_twin_view"
  | "trends_view"
  | "reports_view"
  | "all_parameters_view"
  | "trends_view_all_click"
  | "all_parameters_view_all_click"
  | "trend_point_click"
  | "reports_download_click"
  | "no_reports"
  | "recommendations_click"
  | "feedback_submit_click"
  | "digital_twin_click"
  | "youtube_video_click"
  | "website_click"
  | "health_trends_time_spent"
  | "health_trends_load_failed"
  | "health_trends_retry_click"

/** Maps a TrendsSection to its `{section}_view` event name. */
export const SECTION_VIEW_EVENTS: Record<TrendsSection, AnalyticsEventName> = {
  summary: "summary_view",
  digital_twin: "digital_twin_view",
  trends: "trends_view",
  reports: "reports_view",
  all_parameters: "all_parameters_view",
}

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
  success?: boolean
  duration_ms?: number
  /** Which recommendation CTA was clicked (e.g. "Book Lab Test"). */
  service?: string
  /** Feedback rating, and whether it persisted server-side. */
  rating?: number
  saved?: boolean
  /** Digital twin organ identifier (anatomical, not patient data). */
  organ?: string
  /** Active seconds spent in Health Trends, for health_trends_time_spent. */
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
