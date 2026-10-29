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

const NON_PRODUCTION_HOST_PATTERNS = [
  /^localhost$/,
  /^127\.0\.0\.1$/,
  /\.vusercontent\.net$/,
  /(^|\.)v0\.app$/,
  /(^|\.)v0\.dev$/,
]

/**
 * Session recordings are only captured for real production traffic. Local
 * dev, the v0 preview, and Vercel preview deployments are excluded so
 * development sessions don't pollute (or bill) the recordings.
 */
function isProductionSession(): boolean {
  if (process.env.NODE_ENV !== "production") return false
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
  if (vercelEnv && vercelEnv !== "production") return false
  const host = window.location.hostname
  return !NON_PRODUCTION_HOST_PATTERNS.some((pattern) => pattern.test(host))
}

/**
 * Initialize PostHog once, client-side only. No-ops (safe for SSR/build and
 * for environments where the project token hasn't been configured yet) when
 * NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is missing.
 *
 * Deliberately conservative for a health application:
 *  - autocapture / pageview / pageleave capture are OFF. We only send the
 *    explicit, allow-listed events defined below.
 *  - session recording is enabled in production only, with all inputs masked. Elements marked
 *    with `data-ph-mask` have their text masked; `ph-no-capture` hides them.
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
      disable_session_recording: !isProductionSession(),
      session_recording: {
        // Typed values (feedback text, etc.) never appear in recordings.
        maskAllInputs: true,
        // Add class="ph-no-capture" / data-ph-mask to any element that must be hidden.
        maskTextSelector: "[data-ph-mask]",
      },
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

/**
 * Health Trends sends exactly two custom PostHog events. Never add new event
 * names — put the specifics in `section` / `element` and their properties.
 */
const LANDING_EVENT = "healthtrends_landing"
const CLICK_EVENT = "healthtrends_click"

export type LandingSection =
  | "main_page"
  | "healthscore_section"
  | "health_summary_section"
  | "digital_twin_section"
  | "healthtrends_lines_main_page"
  | "healthtrends_lines_all_view"
  | "all_parameters_main_page"
  | "all_parameters_overall_view"
  | "health_recommendations_main_view"
  | "health_recommendations_overall_view"
  | "report_download_page_view"

export type ClickElement =
  | "mainpage_disclaimer"
  | "upload_report_button"
  | "report_submit"
  | "health_score_style_click"
  | "healthscore_video_click"
  | "healthscore_website_click"
  | "healthsummary_card_click"
  | "digital_twin_pointer_click"
  | "healthtrend_line_pointer_click"
  | "health_recommendation_test_click"
  | "health_recommendation_consult_click"
  | "explore_more_programs_click"
  | "report_download_click"
  | "latest_report_click"
  | "feedback_click"
  | "feedback_submit_click"
  | "report_an_issue_click"
  | "faqs_click"

export interface ClickProperties {
  style?: string
  organ?: string
  pointer?: string
  parameter?: string
  test_name?: string
  consult_type?: string
}

interface AnalyticsContext {
  email_id: string
  mbuserid: string
  rvasbenifId: string
  employee_id: string
  pmentityId: string
}

const analyticsContext: AnalyticsContext = {
  email_id: "",
  mbuserid: "",
  rvasbenifId: "",
  employee_id: "",
  pmentityId: "",
}

const toId = (value: string | number | null | undefined) => (value == null ? "" : String(value).trim())

/** Set the user-level ids attached to every Health Trends event. */
export function setAnalyticsUserContext(user: {
  email?: string | null
  mbUserId?: string | number | null
  employeeId?: string | number | null
  pmEntityId?: string | number | null
}) {
  analyticsContext.email_id = toId(user.email)
  analyticsContext.mbuserid = toId(user.mbUserId)
  analyticsContext.employee_id = toId(user.employeeId)
  analyticsContext.pmentityId = toId(user.pmEntityId)
}

/** Set the beneficiary currently being viewed (changes when switching family members). */
export function setAnalyticsBeneficiary(rVasBenefId: string | number | null | undefined) {
  analyticsContext.rvasbenifId = toId(rVasBenefId)
}

function capture(name: string, properties: Record<string, string>) {
  if (typeof window === "undefined" || !initialized) return
  try {
    posthog.capture(name, { ...analyticsContext, timestamp: new Date().toISOString(), ...properties })
  } catch (error) {
    console.log("[v0] PostHog capture failed (non-blocking):", error)
  }
}

const LANDING_STORAGE_PREFIX = "healthtrends_landing:"
const landedSections = new Set<LandingSection>()

/**
 * Record that the user landed on a section — at most once per browser session
 * per section. The module-level set covers re-renders, remounts and Strict
 * Mode; sessionStorage covers full reloads within the same session.
 */
export function trackLanding(section: LandingSection) {
  if (typeof window === "undefined" || !initialized) return
  if (landedSections.has(section)) return
  const storageKey = `${LANDING_STORAGE_PREFIX}${section}`
  try {
    if (window.sessionStorage.getItem(storageKey)) {
      landedSections.add(section)
      return
    }
    window.sessionStorage.setItem(storageKey, "1")
  } catch {
    // sessionStorage can be unavailable in some WebViews; the in-memory set still dedupes.
  }
  landedSections.add(section)
  capture(LANDING_EVENT, { section })
}

/** Record a user interaction. Fires on every call. */
export function trackClick(element: ClickElement, properties?: ClickProperties) {
  const extra: Record<string, string> = {}
  for (const [key, value] of Object.entries(properties ?? {})) {
    if (value != null && value !== "") extra[key] = String(value)
  }
  capture(CLICK_EVENT, { element, ...extra })
}
