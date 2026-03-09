"use client"

let snowplowModule: typeof import("@snowplow/browser-tracker") | null = null
let isInitialized = false
let initFailed = false

// Queue for events that fire before tracker is ready
const pendingEvents: Array<{ schema: string; data: Record<string, any> }> = []

// Global user context set once from beneficiaries API response
let _mbuserid = ""
let _employeeEmail = ""
let _selfVasBenefId = ""

export function setSnowplowUserContext(mbuserid: string, employeeEmail: string) {
  _mbuserid = mbuserid || ""
  _employeeEmail = employeeEmail || ""
}

export function setSelfVasBenefId(vasBenefId: string | number) {
  _selfVasBenefId = String(vasBenefId || "")
}

function getCookieValue(name: string): string {
  if (typeof document === "undefined") return null
  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split("=")
    if (key === name) {
      return decodeURIComponent(value || null)
    }
  }
  return ""
}

function getSnowplowConfig() {
  const platform = getCookieValue("trk-mb-platform") || "web"
  const env = process.env.NEXT_PUBLIC_SNOWPLOW_ENV === "production" ? "production" : "staging"

  const config = {
    staging: {
      collectorUrl: "https://stg-events-platform-collector-server.mbstg.in",
      appId: "health-trends-staging",
      platform,
      cookieDomain: "v0.app",
    },
    production: {
      collectorUrl: "https://mb-prod-events-platform-collector-server.medibuddy.in",
      appId: "health-trends",
      platform,
      cookieDomain: "experiments.medibuddy.in",
      contexts: {
        webPage: true,
        performanceTiming: true,
      },
    },
  }

  return config[env]
}

export async function initSnowplow() {
  if (typeof window === "undefined" || isInitialized) return

  try {
    const config = getSnowplowConfig()
    snowplowModule = await import("@snowplow/browser-tracker")
    snowplowModule.newTracker("mbTracker", config.collectorUrl, {
      appId: config.appId,
      platform: config.platform as "web" | "mob" | "app",
      cookieDomain: config.cookieDomain,
      contexts: {
        webPage: true,
        performanceTiming: true,
      },
    })
    isInitialized = true
    console.log("[v0] Snowplow tracker initialized -", config.collectorUrl, "| appId:", config.appId)

    // Flush any events that were queued before initialization
    if (pendingEvents.length > 0) {
      console.log("[v0] Flushing", pendingEvents.length, "pending Snowplow events")
      for (const pending of pendingEvents) {
        try {
          snowplowModule.trackSelfDescribingEvent({ event: pending })
        } catch {
          // non-blocking
        }
      }
      pendingEvents.length = 0
    }
  } catch (error) {
    initFailed = true
    console.log("[v0] Snowplow tracker init failed (non-blocking):", error)
  }
}

export function trackHealthTrendsEvent(statusMessage: string, vasbenefId?: string | number) {
  if (typeof window === "undefined") return

  const sessionId = getCookieValue("trk-mb-session-id") || null
  const pmEntityId = getCookieValue("pmEntityId") || null
  // Use provided vasbenefId for global events, fall back to self vasbenefId for self events
  const resolvedVasBenefId = vasbenefId !== undefined ? String(vasbenefId) : _selfVasBenefId

  const eventData = {
    "mb-s-sessionId": sessionId,
    pmentityid: pmEntityId,
    mbuserid: _mbuserid,
    employee_email: _employeeEmail,
    vasbenefId: resolvedVasBenefId,
    statusMessage,
  }

  const snowplowEvent = {
    schema: "iglu:com.medibuddy/HEALTH_TRENDS_TRACK_ACTIONs/jsonschema/1-0-1",
    data: eventData,
  }
  console.log("[v0] Snowplow Event Fired:", statusMessage, eventData)

  if (isInitialized && snowplowModule) {
    // Tracker ready - send immediately
    try {
      snowplowModule.trackSelfDescribingEvent({ event: snowplowEvent })
    } catch (error) {
      console.log("[v0] Snowplow send failed (non-blocking):", error)
    }
  } else if (!initFailed) {
    // Tracker still initializing - queue for later flush
    console.log("[v0] Snowplow tracker not ready, queuing event:", statusMessage)
    pendingEvents.push(snowplowEvent)
  }
}
