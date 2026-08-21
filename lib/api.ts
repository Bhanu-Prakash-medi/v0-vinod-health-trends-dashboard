// Types for API responses

import { genderAvatar } from "@/lib/health-utils"
import { cachedRequest } from "@/lib/request-cache"

/**
 * A single lab-report reference from the profile / beneficiary reports API.
 * `requestId` is used with the account `mbUserId` to fetch the analyzed report
 * details from POST /health/reports.
 */
export interface ReportRequest {
  requestId: string
  date: string
  file?: string
}

export interface Beneficiary {
  patientName: string
  relation: string
  visitType: string
  dmS_Doc_ID: string[]
  latestDmsDocIds?: string[]
  rVasBenefId?: string | number
  age?: number
  gender?: string
  /**
   * Total number of lab-report records for this beneficiary, taken from the
   * profile API's `requestIds` (lab report URLs). Shown immediately in the
   * profile section without waiting for the reports/analysis pipeline.
   */
  reportCount?: number
  /**
   * The account-level user id (profile `userId`). Sent as `mbUserId` when
   * fetching analyzed report details from POST /health/reports.
   */
  userId?: string | number
  /**
   * Lab-report references ({ requestId, date, file }) for this beneficiary.
   * Health summary and trends are built from the analyzed details of these.
   */
  reportRequests?: ReportRequest[]
}

export interface BeneficiariesResponse {
  beneficiaries: Beneficiary[]
  mbuserid?: string
  employee_email?: string
}

export interface HealthSummaryItem {
  category: string
  status: string
  out_of_range_count?: number
  parameters?: Array<{
    name: string
    value: string | number
    unit: string
    status: string
    normal_range: string
  }>
}

export interface TrendDataPoint {
  date: string
  value: number
  unit?: string
}

export interface TrendAnalysisItem {
  metric_name: string
  change_percentage: string
  trend: string
  normal_range: string
  status: string
  data_points: TrendDataPoint[]
  /** Latest numeric value (consumed by the trends UI for change display). */
  current_value?: number
  /** Second-latest numeric value (consumed by the trends UI for change display). */
  previous_value?: number
  unit?: string
}

export interface LabReport {
  report_name: string[]
  report_date: string
  file_name?: string
  tag?: string
  parameters?: any[]
  /** Original report PDF URL from the beneficiary reports API (for download). */
  file?: string
}

export interface TrendsResponse {
  trend_analysis: TrendAnalysisItem[]
  lab_reports: LabReport[]
}

export interface ApiHealthReport {
  patient_info: {
    name: string
    age: number
    gender: string
    profileImage: string
    relation?: string
    blood_group?: string
    height?: string
    weight?: string
    abha_id?: string
    statuscode?: number
  }
  reports: Array<{
    name: string
    date: string
    parameters: Record<string, any>
    fullfilmentDate?: string
    /** Original report PDF URL from the beneficiary reports API (for download). */
    file?: string
    /** Contract type of this report (from /health/reports). Used to gate which
     *  reports feed the Health Risk Score (only contractType 9716). */
    contractType?: string | number | null
  }>
  health_summary: HealthSummaryItem[]
  /** Per-report-date health summaries, sorted latest date first. Powers the
   *  Health Summary date dropdown so users can view historical summaries. The
   *  first entry corresponds to the same data as `health_summary` (latest). */
  health_summary_by_date?: Array<{
    /** Raw date key (fullfilmentDate or date) used for sorting/formatting. */
    dateKey: string
    health_summary: HealthSummaryItem[]
  }>
  trend_analysis?: TrendAnalysisItem[]
  lab_reports?: LabReport[]
  isLoading?: boolean
  isLoadingMetrics?: boolean
  latestReportDate?: string
  /** Contract type for the single analyzed report returned by /health/reports.
   *  Only reports with contractType 9716 are sent to the Health Risk Score API;
   *  summary and trends ignore this field. */
  contractType?: string | number | null
}

export function getAccessTokenFromCookie(): string | null {
  if (typeof document === "undefined") {
    return null
  }

  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=")
    if (name === "redirect") {
      return decodeURIComponent(value)
    }
  }

  return null
}

export function getPmEntityIdFromCookie(): string {
  if (typeof document === "undefined") {
    return "0"
  }

  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=")
    if (name === "pmEntityId") {
      const decoded = decodeURIComponent(value)
      return decoded || "0"
    }
  }

  return "0"
}

/**
 * Read the MediBuddy platform cookie ("platform"). In the native app WebViews
 * this is set to values like "IOS_mv" / "android_mv"; on the web it is
 * typically absent. Returned verbatim (empty string when absent).
 */
export function getPlatformFromCookie(): string {
  if (typeof document === "undefined") {
    return ""
  }

  const cookies = document.cookie.split(";")
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=")
    if (name === "platform") {
      return decodeURIComponent(value || "")
    }
  }

  return ""
}

/**
 * True when the current platform is a native-app WebView (iOS/Android), where
 * the existing in-app deep links should be used for service redirects. Any
 * other platform (web, unknown, or absent) should use the web fallbacks.
 */
export function isNativeAppPlatform(platform?: string): boolean {
  const p = (platform ?? getPlatformFromCookie()).trim().toLowerCase()
  return p === "ios_mv" || p === "android_mv"
}

export type HealthConsentStatus = "agreed" | "not_agreed" | "unknown"

/**
 * Fetch the user's Health Trends data-consent status. Proxies GET
 * /health/getconsent/{mbUserId}.
 *
 * Returns a tri-state so the caller can tell a real "not agreed" apart from a
 * transient failure:
 *  - "agreed"     -> the user has agreed and consent hasn't expired (if an
 *                    agreedDate is present it must be within the last 3 months;
 *                    a missing/unparseable date honours the isAgreed flag).
 *  - "not_agreed" -> the backend responded conclusively that the user has not
 *                    agreed (or consent is older than 3 months).
 *  - "unknown"    -> the status could not be determined (network error,
 *                    timeout, non-2xx, or unparseable body). The caller MUST
 *                    NOT show the consent modal in this case, so an already
 *                    agreed user is never nagged because of a flaky request.
 */
export async function getHealthConsent(
  mbUserId: string | number,
  accessToken?: string | null,
): Promise<HealthConsentStatus> {
  if (mbUserId === undefined || mbUserId === null || mbUserId === "") return "unknown"
  try {
    const response = await fetch(`/api/health/consent?mbUserId=${encodeURIComponent(String(mbUserId))}`, {
      method: "GET",
      headers: {
        ...(accessToken ? { accesstoken: accessToken } : {}),
      },
    })
    // Any non-success response is inconclusive: do not force the modal.
    if (!response.ok) return "unknown"

    let data: any
    try {
      data = await response.json()
    } catch {
      return "unknown"
    }

    // The consent record may be returned directly or nested under data/response.
    const record = getValueCaseInsensitive(data, "data") ?? getValueCaseInsensitive(data, "response") ?? data
    const agreed =
      getValueCaseInsensitive(record, "isAgreed") ??
      getValueCaseInsensitive(record, "isagreed") ??
      getValueCaseInsensitive(record, "agreed")
    const hasAgreed = agreed === true || agreed === "true" || agreed === 1
    if (!hasAgreed) return "not_agreed"

    // Consent expires after 3 months. The backend may or may not return an
    // agreedDate. When a valid date is present and it is older than 3 months,
    // treat consent as expired. When the date is missing or unparseable,
    // honour the isAgreed flag and treat consent as valid.
    const agreedDateRaw =
      getValueCaseInsensitive(record, "agreedDate") ?? getValueCaseInsensitive(record, "agreeddate")
    if (!agreedDateRaw) return "agreed"
    const agreedTime = new Date(agreedDateRaw).getTime()
    if (Number.isNaN(agreedTime)) return "agreed"

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    return agreedTime >= threeMonthsAgo.getTime() ? "agreed" : "not_agreed"
  } catch {
    // Network error / timeout -> inconclusive, don't show the modal.
    return "unknown"
  }
}

/**
 * The profile email field can contain MULTIPLE addresses separated by comma,
 * semicolon or whitespace (e.g. "work@tcs.com,personal@gmail.com"). Backend
 * endpoints such as /health/consent and feedback validate a SINGLE email and
 * reject the multi-value string ("email must be an email"). This returns the
 * first valid-looking address, or "" when none is present.
 */
export function pickPrimaryEmail(email: string | null | undefined): string {
  if (!email) return ""
  const cleaned = String(email).replace(/[\u200B-\u200D\uFEFF]/g, "")
  for (const part of cleaned.split(/[,;\s]+/)) {
    const candidate = part.trim()
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
      return candidate
    }
  }
  return ""
}

/**
 * Submit the user's Health Trends data-consent agreement.
 * Proxies POST /health/consent. Returns `true` on success.
 */
export async function submitHealthConsent(
  payload: { mbUserId: string | number; pmEntityId?: string | number | null; email?: string },
  accessToken?: string | null,
): Promise<boolean> {
  try {
    const response = await fetch("/api/health/consent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { accesstoken: accessToken } : {}),
      },
      body: JSON.stringify({
        mbUserId: payload.mbUserId,
        pmEntityId: payload.pmEntityId ?? null,
        // Send only a single valid email; the profile may carry several.
        email: pickPrimaryEmail(payload.email),
        isAgreed: true,
        // Current date/time as ISO 8601 in IST, e.g. "2026-08-14T15:26:30.098+05:30".
        agreedDate: formatIstTimestamp(),
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Formats the current instant as a valid ISO 8601 timestamp in IST:
 * "YYYY-MM-DDTHH:mm:ss.SSS+05:30". IST is computed explicitly (UTC + 5:30) so
 * the "+05:30" offset is always correct regardless of the runtime timezone.
 */
function formatIstTimestamp(date: Date = new Date()): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  const pad = (n: number, len = 2) => String(n).padStart(len, "0")
  const year = ist.getUTCFullYear()
  const month = pad(ist.getUTCMonth() + 1)
  const day = pad(ist.getUTCDate())
  const hours = pad(ist.getUTCHours())
  const minutes = pad(ist.getUTCMinutes())
  const seconds = pad(ist.getUTCSeconds())
  const millis = pad(ist.getUTCMilliseconds(), 3)
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}+05:30`
}

/**
 * Persists Health Trends feedback through the backend feedback endpoint.
 */
export async function submitHealthFeedback(
  payload: {
    mbUserId: string | number
    vasBenefId: string | number | null
    pmEntityId: string | number | null
    email: string
    rating: number
    remarks: string
    comment: string
  },
  accessToken?: string | null,
): Promise<boolean> {
  try {
    const response = await fetch("/api/health/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { accesstoken: accessToken } : {}),
      },
      body: JSON.stringify(payload),
    })
    return response.ok
  } catch (error) {
    console.error("[v0] Feedback submission failed:", error)
    return false
  }
}

/**
 * Helper function to get value from object with case-insensitive key matching
 */
function getValueCaseInsensitive(obj: any, key: string): any {
  if (!obj || typeof obj !== "object") return undefined

  const lowerKey = key.toLowerCase()
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lowerKey) {
      return obj[k]
    }
  }
  return undefined
}

/**
 * The report `file` URLs returned by the backend are pre-signed S3 links whose
 * path contains the report's dms_doc_id as a UUID path segment, e.g.
 * `.../072026/cb424e70-85d3-11f1-9547-633da02d1de8/PHLB123.pdf`. The analysis
 * pipeline is keyed on this dms_doc_id, so we extract it from the URL.
 */
const DMS_DOC_ID_REGEX = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/

export function extractDmsDocIdFromFileUrl(fileUrl?: string): string | null {
  if (!fileUrl || typeof fileUrl !== "string") return null
  const match = fileUrl.match(DMS_DOC_ID_REGEX)
  return match ? match[0] : null
}

/**
 * Fetch the family/beneficiary profile from the new backend and map it to the
 * shape the app expects. The profile only reliably includes report links for
 * the Self beneficiary; each beneficiary's authoritative report list is fetched
 * on demand via `fetchBeneficiaryReportDocIds`.
 *
 * NOTE: `pmEntityId` is retained for call-site compatibility but is unused by
 * the new profile endpoint.
 */
export async function fetchBeneficiaries(accessToken: string, _pmEntityId = "0"): Promise<BeneficiariesResponse> {
  // Cached + de-duplicated so returning to the dashboard doesn't re-hit the
  // profile API, and concurrent mounts share one request.
  return cachedRequest(`beneficiaries:${accessToken}:${_pmEntityId}`, () =>
    fetchBeneficiariesUncached(accessToken, _pmEntityId),
  )
}

async function fetchBeneficiariesUncached(accessToken: string, _pmEntityId = "0"): Promise<BeneficiariesResponse> {
  const response = await fetch("/api/health/profile", {
    method: "GET",
    headers: {
      accesstoken: accessToken,
    },
  })

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED")
  }
  if (!response.ok) {
    throw new Error(`Beneficiaries API request failed: ${response.status}`)
  }

  const data = await response.json()

  // The profile endpoint returns an array: [{ userId, email, beneficiaries: [...] }]
  const root = Array.isArray(data) ? data[0] : data

  const responseObj = getValueCaseInsensitive(root, "response")
  if (responseObj) {
    const statusCode = getValueCaseInsensitive(responseObj, "statuscode")
    if (statusCode === "401" || statusCode === 401) {
      throw new Error("UNAUTHORIZED")
    }
  }

  const beneficiaries = getValueCaseInsensitive(root, "beneficiaries") || []
  const mbuserid =
    getValueCaseInsensitive(root, "userId") ||
    getValueCaseInsensitive(root, "userid") ||
    getValueCaseInsensitive(root, "mbuserid") ||
    ""
  const employee_email =
    getValueCaseInsensitive(root, "email") || getValueCaseInsensitive(root, "employee_email") || ""

  return {
    beneficiaries: beneficiaries.map((b: any) => {
      const requestIds = getValueCaseInsensitive(b, "requestIds") || getValueCaseInsensitive(b, "requestids") || []
      const reportRequests = parseReportRequests(requestIds)
      // The report identifier is now the requestId (used with mbUserId to fetch
      // analyzed details); dmS_Doc_ID carries these ids for legacy count/length checks.
      const docIds = reportRequests.map((r) => r.requestId)

      return {
        patientName: getValueCaseInsensitive(b, "name") || getValueCaseInsensitive(b, "patientName") || "Unknown",
        relation: getValueCaseInsensitive(b, "relation") || "Unknown",
        visitType: "",
        dmS_Doc_ID: docIds,
        latestDmsDocIds: [],
        rVasBenefId:
          getValueCaseInsensitive(b, "vasBenifId") ??
          getValueCaseInsensitive(b, "vasbenifid") ??
          getValueCaseInsensitive(b, "rVasBenefId"),
        age: Number.parseInt(String(getValueCaseInsensitive(b, "age") ?? "0"), 10),
        gender: getValueCaseInsensitive(b, "gender") || "Unknown",
        // Total health records come from the profile's lab report URLs.
        reportCount: reportRequests.length,
        // Account user id -> mbUserId for the report-details API.
        userId:
          getValueCaseInsensitive(b, "userId") ??
          getValueCaseInsensitive(b, "userid") ??
          mbuserid,
        reportRequests,
      }
    }),
    mbuserid,
    employee_email,
  }
}

/**
 * Normalize a raw `requestIds` array (from profile or the reports endpoint)
 * into ReportRequest[] with string ids. Skips entries without a requestId.
 */
function parseReportRequests(raw: any): ReportRequest[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: ReportRequest[] = []
  for (const r of raw) {
    const idRaw = getValueCaseInsensitive(r, "requestId") ?? getValueCaseInsensitive(r, "requestid")
    if (idRaw === undefined || idRaw === null || idRaw === "") continue
    const requestId = String(idRaw)
    if (seen.has(requestId)) continue
    seen.add(requestId)
    out.push({
      requestId,
      date: getValueCaseInsensitive(r, "date") || "",
      file: getValueCaseInsensitive(r, "file") || "",
    })
  }
  return out
}

/**
 * Fetch a single beneficiary's report references ({ requestId, date, file })
 * from the reports endpoint. This is the authoritative per-beneficiary report
 * source; the profile endpoint only populates Self.
 */
export async function fetchBeneficiaryReportRequests(
  accessToken: string,
  vasBenifId: string | number,
): Promise<ReportRequest[]> {
  // Cached per beneficiary so re-selecting them (or remounting) reuses the
  // already-resolved report references instead of re-hitting the reports API.
  return cachedRequest(`reportRequests:${vasBenifId}`, () =>
    fetchBeneficiaryReportRequestsUncached(accessToken, vasBenifId),
  )
}

async function fetchBeneficiaryReportRequestsUncached(
  accessToken: string,
  vasBenifId: string | number,
): Promise<ReportRequest[]> {
  const response = await fetch(`/api/health/reports/${vasBenifId}`, {
    method: "GET",
    headers: {
      accesstoken: accessToken,
    },
  })

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED")
  }
  if (!response.ok) {
    // 403 (vasBenifId not owned) or other errors: treat as no reports available.
    return []
  }

  const data = await response.json()
  const rawList = Array.isArray(data)
    ? data
    : getValueCaseInsensitive(data, "requestIds") ||
      getValueCaseInsensitive(data, "reports") ||
      getValueCaseInsensitive(data, "data") ||
      []

  return parseReportRequests(rawList)
}

/**
 * Fetch a single beneficiary's report list (by vasBenifId) from the new backend
 * and return the extracted dms_doc_ids. This is the authoritative per-beneficiary
 * report source; the profile endpoint only populates Self.
 *
 * @deprecated Superseded by fetchBeneficiaryReportRequests + the /health/reports
 * details API. Retained for reference.
 */
export async function fetchBeneficiaryReportDocIds(
  accessToken: string,
  vasBenifId: string | number,
): Promise<string[]> {
  const response = await fetch(`/api/health/reports/${vasBenifId}`, {
    method: "GET",
    headers: {
      accesstoken: accessToken,
    },
  })

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED")
  }
  if (!response.ok) {
    // 403 (vasBenifId not owned) or other errors: treat as no reports available.
    return []
  }

  const data = await response.json()
  const reports = Array.isArray(data)
    ? data
    : getValueCaseInsensitive(data, "requestIds") ||
      getValueCaseInsensitive(data, "reports") ||
      getValueCaseInsensitive(data, "data") ||
      []

  if (!Array.isArray(reports)) return []

  const docIds = reports
    .map((r: any) => extractDmsDocIdFromFileUrl(getValueCaseInsensitive(r, "file")))
    .filter((id: string | null): id is string => Boolean(id))

  // De-duplicate while preserving order.
  return Array.from(new Set(docIds))
}

/**
 * Infer category from parameter names
 */
function inferCategoryFromParameters(parameters: any[]): string {
  if (!parameters || parameters.length === 0) return "General"

  const paramNames = parameters
    .map((p) => (getValueCaseInsensitive(p, "name") || getValueCaseInsensitive(p, "metric_name") || "").toLowerCase())
    .join(" ")

  if (paramNames.includes("hba1c") || paramNames.includes("glucose") || paramNames.includes("sugar")) {
    return "Sugar/Diabetes"
  }
  if (
    paramNames.includes("cholesterol") ||
    paramNames.includes("hdl") ||
    paramNames.includes("ldl") ||
    paramNames.includes("triglyceride")
  ) {
    return "Heart"
  }
  if (
    paramNames.includes("haemoglobin") ||
    paramNames.includes("rbc") ||
    paramNames.includes("wbc") ||
    paramNames.includes("platelet")
  ) {
    return "Blood"
  }
  if (
    paramNames.includes("creatinine") ||
    paramNames.includes("urea") ||
    paramNames.includes("kidney") ||
    paramNames.includes("egfr")
  ) {
    return "Kidney"
  }
  if (
    paramNames.includes("bilirubin") ||
    paramNames.includes("sgpt") ||
    paramNames.includes("sgot") ||
    paramNames.includes("liver") ||
    paramNames.includes("alt") ||
    paramNames.includes("ast")
  ) {
    return "Liver"
  }
  if (
    paramNames.includes("tsh") ||
    paramNames.includes("t3") ||
    paramNames.includes("t4") ||
    paramNames.includes("thyroid")
  ) {
    return "Thyroid"
  }
  if (
    paramNames.includes("vitamin") ||
    paramNames.includes("calcium") ||
    paramNames.includes("iron") ||
    paramNames.includes("b12")
  ) {
    return "Vitamins"
  }
  if (paramNames.includes("uric") || paramNames.includes("bone") || paramNames.includes("phosphorus")) {
    return "Bones & Joints"
  }

  return "General"
}

/**
 * Retry helper with incremental backoff.
 * A retrying call keeps holding its throttle slot, so long backoffs stall the
 * whole batch. Uses short delays (0.4s, 0.8s, 1.6s) since the backend normally
 * responds in <1.5s — a real outage still surfaces quickly.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      // Do not retry on UNAUTHORIZED or DOCUMENT_FAILED
      if (lastError.message === "UNAUTHORIZED" || lastError.message === "DOCUMENT_FAILED" || lastError.message === "NO_REPORTS_404") {
        throw lastError
      }
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 400 // 0.4s, 0.8s, 1.6s
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError!
}

/**
 * Semaphore factory for throttling concurrent API calls
 */
function createThrottle(maxConcurrent: number) {
  let activeCount = 0
  const queue: Array<() => void> = []

  function acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (activeCount < maxConcurrent) {
        activeCount++
        resolve()
      } else {
        queue.push(() => {
          activeCount++
          resolve()
        })
      }
    })
  }

  function release() {
    activeCount--
    const next = queue.shift()
    if (next) next()
  }

  return { acquire, release }
}

// Report-details is fetched once per report; the Self user can have 30+ reports.
// A concurrency of 3 forced ~10+ sequential rounds (~15s to finish trends / all
// parameters). 8 keeps the backend comfortable while cutting rounds by ~2.5x.
const fetchReportsThrottle = createThrottle(8)

/**
 * Transform the new report-details response (POST /health/reports) into the
 * ApiHealthReport shape consumed by the UI. The response is fully analyzed and
 * synchronous — no polling required.
 */
export function transformReportDetails(data: any, fallbackDate?: string, fileUrl?: string): ApiHealthReport {
  const status = (getValueCaseInsensitive(data, "status") || "").toString()
  if (status.toLowerCase() === "failed") {
    throw new Error("DOCUMENT_FAILED")
  }

  const patientCard = getValueCaseInsensitive(data, "patient_card") || {}
  const reportData = getValueCaseInsensitive(data, "report_data") || {}
  const parametersArray = getValueCaseInsensitive(data, "parameters") || []
  const healthSummaryRaw = getValueCaseInsensitive(data, "health_summary") || []

  // Contract type of this report. Looked up across the top-level response and
  // report_data with a few key aliases (the backend shape isn't strictly typed
  // here). Used downstream to gate which reports feed the Health Risk Score.
  const contractTypeRaw =
    getValueCaseInsensitive(data, "contractType") ??
    getValueCaseInsensitive(data, "contract_type") ??
    getValueCaseInsensitive(data, "contractId") ??
    getValueCaseInsensitive(reportData, "contractType") ??
    getValueCaseInsensitive(reportData, "contract_type") ??
    getValueCaseInsensitive(reportData, "contractId") ??
    null
  const contractType =
    contractTypeRaw === null || contractTypeRaw === undefined || contractTypeRaw === ""
      ? null
      : String(contractTypeRaw)

  const patientName =
    getValueCaseInsensitive(reportData, "patientName") ||
    getValueCaseInsensitive(patientCard, "name") ||
    "Unknown Patient"

  const fullfilmentDate =
    getValueCaseInsensitive(reportData, "fullfilmentDate") ||
    getValueCaseInsensitive(reportData, "fulfilmentDate") ||
    fallbackDate ||
    ""

  const age = Number.parseInt(String(getValueCaseInsensitive(patientCard, "age") ?? "0"), 10)
  const gender =
    getValueCaseInsensitive(patientCard, "gender") || getValueCaseInsensitive(reportData, "gender") || "Unknown"

  const profileImage = genderAvatar(gender)

  // Transform flat parameters into the map keyed by metric name.
  const transformedParameters: Record<string, any> = {}
  parametersArray.forEach((param: any) => {
    const metricName = getValueCaseInsensitive(param, "metric_name") || getValueCaseInsensitive(param, "name") || ""
    if (metricName) {
      transformedParameters[metricName] = {
        result: getValueCaseInsensitive(param, "value") ?? getValueCaseInsensitive(param, "result") ?? "",
        units: getValueCaseInsensitive(param, "unit") || getValueCaseInsensitive(param, "units") || "",
        range: getValueCaseInsensitive(param, "normal_range") || getValueCaseInsensitive(param, "range") || "",
        status: getValueCaseInsensitive(param, "status") || "normal",
      }
    }
  })

  // Also fold in every biomarker that appears in the grouped health_summary.
  // Some report-details responses return a sparse (or empty) top-level
  // `parameters` array while carrying the actual biomarkers inside
  // health_summary[].parameters. Trends are built from reports[].parameters, so
  // without this the trends engine sees almost no metrics (and single-point
  // metrics get filtered out, hiding the whole Health Trends section) even
  // though the health summary looks complete. Only add names not already
  // present so the flat array remains authoritative when both exist.
  healthSummaryRaw.forEach((item: any) => {
    const params = getValueCaseInsensitive(item, "parameters") || []
    params.forEach((param: any) => {
      const metricName = getValueCaseInsensitive(param, "metric_name") || getValueCaseInsensitive(param, "name") || ""
      if (!metricName || transformedParameters[metricName]) return
      transformedParameters[metricName] = {
        result: getValueCaseInsensitive(param, "value") ?? getValueCaseInsensitive(param, "result") ?? "",
        units: getValueCaseInsensitive(param, "unit") || getValueCaseInsensitive(param, "units") || "",
        range: getValueCaseInsensitive(param, "normal_range") || getValueCaseInsensitive(param, "range") || "",
        status: getValueCaseInsensitive(param, "status") || "normal",
      }
    })
  })

  // Transform organ-grouped health summary.
  const healthSummary: HealthSummaryItem[] = healthSummaryRaw.map((item: any) => {
    const params = getValueCaseInsensitive(item, "parameters") || []
    let categoryName =
      getValueCaseInsensitive(item, "organ") ||
      getValueCaseInsensitive(item, "category") ||
      getValueCaseInsensitive(item, "name") ||
      getValueCaseInsensitive(item, "title")

    if (!categoryName || categoryName === "Unknown") {
      categoryName = inferCategoryFromParameters(params)
    }

    let outOfRangeCount = 0
    params.forEach((p: any) => {
      const s = (getValueCaseInsensitive(p, "status") || "").toLowerCase()
      if (s === "abnormal" || s === "high" || s === "low" || s === "out_of_range") {
        outOfRangeCount++
      }
    })

    return {
      category: categoryName,
      status: getValueCaseInsensitive(item, "status") || "normal",
      out_of_range_count: outOfRangeCount,
      parameters: params.map((p: any) => ({
        name: getValueCaseInsensitive(p, "metric_name") || getValueCaseInsensitive(p, "name") || "",
        value: getValueCaseInsensitive(p, "value") ?? "",
        unit: getValueCaseInsensitive(p, "unit") || "",
        status: getValueCaseInsensitive(p, "status") || "normal",
        normal_range: getValueCaseInsensitive(p, "normal_range") || "",
      })),
    }
  })

  return {
    patient_info: {
      name: patientName,
      age: Number.isNaN(age) ? 0 : age,
      gender,
      profileImage,
      blood_group: getValueCaseInsensitive(patientCard, "blood_group") || "",
      height: getValueCaseInsensitive(patientCard, "height") || "",
      weight: getValueCaseInsensitive(patientCard, "weight") || "",
      abha_id: getValueCaseInsensitive(patientCard, "abha_id") || "",
    },
    reports: [
      {
        name: getValueCaseInsensitive(reportData, "productName") || "Lab Report",
        date: fullfilmentDate || new Date().toLocaleDateString(),
        parameters: transformedParameters,
        fullfilmentDate,
        file: fileUrl || "",
        contractType,
      },
    ],
    health_summary: healthSummary,
    latestReportDate: fullfilmentDate,
    contractType,
  }
}

/**
 * Fetch and transform a single analyzed report from POST /health/reports.
 * `vasBenefId` is the beneficiary id (the report-details endpoint is scoped by
 * vasBenefId, not the account mbUserId); `requestId` identifies the report.
 */
export async function fetchReportDetailsAsHealthReport(
  accessToken: string,
  vasBenefId: string | number,
  requestId: string | number,
  reportDate?: string,
  fileUrl?: string,
): Promise<ApiHealthReport> {
  // A report's analyzed details are immutable within a session, so cache them
  // per (beneficiary, report). This is the highest-volume call — one per report
  // per beneficiary — so caching it is what stops the burst of repeat requests
  // when the user returns to the dashboard.
  return cachedRequest(`reportDetails:${vasBenefId}:${requestId}`, () =>
    fetchReportDetailsAsHealthReportUncached(accessToken, vasBenefId, requestId, reportDate, fileUrl),
  )
}

async function fetchReportDetailsAsHealthReportUncached(
  accessToken: string,
  vasBenefId: string | number,
  requestId: string | number,
  reportDate?: string,
  fileUrl?: string,
): Promise<ApiHealthReport> {
  await fetchReportsThrottle.acquire()
  try {
    return await withRetry(async () => {
      const response = await fetch("/api/health/report-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { accesstoken: accessToken } : {}),
        },
        body: JSON.stringify({ vasBenefId, requestId }),
      })

      if (response.status === 401) {
        throw new Error("UNAUTHORIZED")
      }
      if (response.status === 404) {
        throw new Error("NO_REPORTS_404")
      }
      if (!response.ok) {
        await response.text()
        throw new Error(`Report details request failed: ${response.status}`)
      }

      const data = await response.json()
      return transformReportDetails(data, reportDate, fileUrl)
    })
  } finally {
    fetchReportsThrottle.release()
  }
}

/**
 * Parse a numeric value from a report parameter result. Returns null for
 * non-numeric values (e.g. "Positive", "Nil") so they are excluded from trends.
 */
function parseNumericValue(value: any): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").trim()
    if (cleaned === "") return null
    const n = Number.parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Build trend analysis and lab report metadata client-side from a set of
 * analyzed reports. This replaces the old n8n trends API: each report's
 * parameters become time-series data points grouped by metric name.
 */
export function buildTrendsFromReports(
  reportEntries: Array<{ name?: string; date?: string; fullfilmentDate?: string; parameters?: Record<string, any>; file?: string }>,
): TrendsResponse {
  const entries = (reportEntries || [])
    .map((e) => ({
      name: e.name || "Lab Report",
      date: e.fullfilmentDate || e.date || "",
      parameters: e.parameters || {},
      file: e.file || "",
    }))
    .filter((e) => e.date)
    // Ascending by date so data_points read oldest -> newest.
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())

  const metricMap = new Map<
    string,
    { unit: string; range: string; status: string; points: TrendDataPoint[] }
  >()

  for (const entry of entries) {
    for (const [metricName, raw] of Object.entries(entry.parameters)) {
      const p = raw as any
      const value = parseNumericValue(p?.result)
      if (value === null) continue // skip qualitative params

      const unit = p?.units || p?.unit || ""
      const range = p?.range || p?.normal_range || ""
      const status = (p?.status || "normal").toString()

      let m = metricMap.get(metricName)
      if (!m) {
        m = { unit, range, status, points: [] }
        metricMap.set(metricName, m)
      }
      // Latest entry wins for unit/range/status (entries are ascending).
      m.unit = unit || m.unit
      m.range = range || m.range
      m.status = status || m.status
      m.points.push({ date: entry.date, value, unit })
    }
  }

  const trend_analysis: TrendAnalysisItem[] = []
  for (const [metricName, m] of metricMap.entries()) {
    const points = m.points
    const last = points[points.length - 1]
    const prev = points.length > 1 ? points[points.length - 2] : undefined
    const currentValue = last?.value ?? 0
    const previousValue = prev?.value

    let changePct = 0
    if (previousValue !== undefined && previousValue !== 0) {
      changePct = ((currentValue - previousValue) / previousValue) * 100
    }
    const trend =
      previousValue === undefined || currentValue === previousValue
        ? "stable"
        : currentValue > previousValue
          ? "increasing"
          : "decreasing"

    trend_analysis.push({
      metric_name: metricName,
      change_percentage: `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`,
      trend,
      normal_range: m.range,
      status: m.status,
      unit: m.unit,
      current_value: currentValue,
      previous_value: previousValue,
      data_points: points,
    })
  }

  // One lab report entry per analyzed report (used to label trend data points by date).
  // Newest first for display; the first entry is the latest report, tagged so the
  // Test Reports section can mark it and "View latest report" can scroll to it.
  const lab_reports: LabReport[] = entries
    .slice()
    .reverse() // newest first for display
    .map((e, index) => ({
      report_name: [e.name || "Lab Report"],
      report_date: e.date,
      file: e.file || "",
      tag: index === 0 ? "Latest_report" : "Historical Report",
      parameters: Object.entries(e.parameters).map(([name, raw]) => {
        const p = raw as any
        return {
          name,
          value: p?.result ?? "",
          unit: p?.units || p?.unit || "",
          status: p?.status || "normal",
          normal_range: p?.range || p?.normal_range || "",
        }
      }),
    }))

  return { trend_analysis, lab_reports }
}

/**
 * Normalize a single trend metric object from the /health/trends API into the
 * UI's TrendAnalysisItem shape. Defensive about field names because the backend
 * shape isn't strictly typed here — falls back across common aliases.
 */
function normalizeTrendItem(raw: any): TrendAnalysisItem | null {
  if (!raw || typeof raw !== "object") return null

  const metricName =
    getValueCaseInsensitive(raw, "metric_name") ||
    getValueCaseInsensitive(raw, "metricName") ||
    getValueCaseInsensitive(raw, "name") ||
    getValueCaseInsensitive(raw, "parameter") ||
    getValueCaseInsensitive(raw, "test_name") ||
    ""
  if (!metricName) return null

  // Locate the time-series points array under any of the common keys. The
  // /health/trends API nests each metric's readings under a `trends` key.
  const rawPoints =
    getValueCaseInsensitive(raw, "trends") ||
    getValueCaseInsensitive(raw, "data_points") ||
    getValueCaseInsensitive(raw, "dataPoints") ||
    getValueCaseInsensitive(raw, "points") ||
    getValueCaseInsensitive(raw, "values") ||
    getValueCaseInsensitive(raw, "history") ||
    getValueCaseInsensitive(raw, "readings") ||
    []

  const unit =
    getValueCaseInsensitive(raw, "unit") || getValueCaseInsensitive(raw, "units") || ""
  const normalRange =
    getValueCaseInsensitive(raw, "normal_range") ||
    getValueCaseInsensitive(raw, "range") ||
    getValueCaseInsensitive(raw, "reference_range") ||
    getValueCaseInsensitive(raw, "referenceRange") ||
    ""

  const data_points: TrendDataPoint[] = (Array.isArray(rawPoints) ? rawPoints : [])
    .map((pt: any) => {
      const date =
        getValueCaseInsensitive(pt, "date") ||
        getValueCaseInsensitive(pt, "report_date") ||
        getValueCaseInsensitive(pt, "fullfilmentDate") ||
        getValueCaseInsensitive(pt, "test_date") ||
        getValueCaseInsensitive(pt, "appointmentDate") ||
        ""
      const value = parseNumericValue(
        getValueCaseInsensitive(pt, "value") ??
          getValueCaseInsensitive(pt, "result") ??
          getValueCaseInsensitive(pt, "val"),
      )
      const ptUnit = getValueCaseInsensitive(pt, "unit") || getValueCaseInsensitive(pt, "units") || unit
      return date && value !== null ? { date, value, unit: ptUnit } : null
    })
    .filter((p): p is TrendDataPoint => p !== null)
    // Ascending by date so data_points read oldest -> newest.
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())

  const last = data_points[data_points.length - 1]
  const prev = data_points.length > 1 ? data_points[data_points.length - 2] : undefined
  const currentValue = last?.value ?? 0
  const previousValue = prev?.value

  let changePct = 0
  if (previousValue !== undefined && previousValue !== 0) {
    changePct = ((currentValue - previousValue) / previousValue) * 100
  }
  const trend =
    previousValue === undefined || currentValue === previousValue
      ? "stable"
      : currentValue > previousValue
        ? "increasing"
        : "decreasing"

  // Prefer the API-provided change percentage; fall back to the computed one.
  const apiChangePct = getValueCaseInsensitive(raw, "change_percentage") || getValueCaseInsensitive(raw, "changePercentage")

  return {
    metric_name: metricName,
    change_percentage: apiChangePct || `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`,
    trend: getValueCaseInsensitive(raw, "trend") || trend,
    normal_range: normalRange,
    status: (getValueCaseInsensitive(raw, "status") || "normal").toString(),
    unit,
    current_value: currentValue,
    previous_value: previousValue,
    data_points,
  }
}

/**
 * Normalize the raw /health/trends API response into a TrendAnalysisItem[].
 * Handles both a wrapped `{ trend_analysis: [...] }` shape and a raw metrics
 * array under common keys.
 */
export function normalizeTrendsApiResponse(data: any): TrendAnalysisItem[] {
  if (!data) return []
  const list =
    getValueCaseInsensitive(data, "trend_analysis") ||
    getValueCaseInsensitive(data, "trends") ||
    getValueCaseInsensitive(data, "data") ||
    getValueCaseInsensitive(data, "result") ||
    (Array.isArray(data) ? data : [])
  if (!Array.isArray(list)) return []
  return list.map(normalizeTrendItem).filter((t): t is TrendAnalysisItem => t !== null)
}

/**
 * Fetch pre-computed trends for a beneficiary from the backend /health/trends
 * endpoint (via the local proxy). Returns a normalized TrendAnalysisItem[], or
 * null when the request fails so the caller can fall back to client-side trends.
 */
export async function fetchTrendsFromApi(
  mbUserId: string | number,
  vasBenefId: string | number,
  accessToken?: string | null,
): Promise<TrendAnalysisItem[] | null> {
  if (mbUserId === undefined || mbUserId === null || mbUserId === "") return null
  if (vasBenefId === undefined || vasBenefId === null || vasBenefId === "") return null
  try {
    const response = await fetch("/api/health/trends", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { accesstoken: accessToken } : {}),
      },
      body: JSON.stringify({ mbUserId, vasBenefId }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return normalizeTrendsApiResponse(data)
  } catch (error) {
    console.error("[v0] fetchTrendsFromApi failed:", error)
    return null
  }
}

/**
 * Create initial profile from beneficiary data
 */
export function createInitialProfileFromBeneficiary(beneficiary: Beneficiary): ApiHealthReport {
  const gender = beneficiary.gender || "Unknown"
  const profileImage = genderAvatar(gender)

  return {
    patient_info: {
      name: beneficiary.patientName,
      age: beneficiary.age || 0,
      gender,
      profileImage,
      relation: beneficiary.relation,
    },
    reports: [],
    health_summary: [],
    isLoading: true,
  }
}

/**
 * Parse date string to comparable format
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0)

  // Handle DD-MM-YYYY format
  const parts = dateStr.split("-")
  if (parts.length === 3) {
    const [day, month, year] = parts
    if (day.length <= 2 && month.length <= 2 && year.length === 4) {
      return new Date(`${year}-${month}-${day}`)
    }
  }

  return new Date(dateStr)
}

/**
 * Merge multiple reports keeping only the latest report's data for display
 */
export function mergeReportsKeepLatest(
  reports: ApiHealthReport[],
  latestDocIds?: string[],
  reportDocIdMap?: Map<ApiHealthReport, string>,
): ApiHealthReport {
  if (reports.length === 0) {
    return {
      patient_info: { name: "Unknown", age: 0, gender: "Unknown", profileImage: "/images/profile-male.svg" },
      reports: [],
      health_summary: [],
    }
  }

  if (reports.length === 1) {
    const only = reports[0]
    // Attach a single-entry by-date list so the Health Summary dropdown has a
    // consistent shape even when there is only one report.
    if (only.health_summary && only.health_summary.length > 0) {
      const dateKey =
        only.reports?.[0]?.fullfilmentDate || only.reports?.[0]?.date || only.latestReportDate || "unknown"
      return {
        ...only,
        health_summary_by_date: [{ dateKey, health_summary: only.health_summary }],
      }
    }
    return only
  }

  // Find the latest report by comparing fullfilmentDate
  let latestReport = reports[0]
  let latestDate = parseDate(reports[0].reports[0]?.fullfilmentDate || "")

  for (let i = 1; i < reports.length; i++) {
    const reportDate = parseDate(reports[i].reports[0]?.fullfilmentDate || "")
    if (reportDate > latestDate) {
      latestDate = reportDate
      latestReport = reports[i]
    }
  }

  // Collect all reports and merge by fullfilmentDate
  const allReportsRaw = reports
    .flatMap((r) => r.reports)
    .filter((r) => r && r.parameters && Object.keys(r.parameters).length > 0)

  // Group reports by fullfilmentDate and merge their parameters
  const reportsByDate = new Map<string, { name: string; date: string; parameters: Record<string, any>; fullfilmentDate?: string; file?: string }>()
  
  for (const report of allReportsRaw) {
    const dateKey = report.fullfilmentDate || report.date || "unknown"
    const existing = reportsByDate.get(dateKey)
    
    if (!existing) {
      // First report for this date - clone it
      reportsByDate.set(dateKey, {
        name: report.name,
        date: report.date,
        parameters: { ...report.parameters },
        fullfilmentDate: report.fullfilmentDate,
        file: report.file || "",
      })
    } else {
      // Keep the first non-empty file URL for this date
      if (!existing.file && report.file) existing.file = report.file
      // Merge parameters from this report into existing
      // Add new parameters that don't exist yet
      for (const [paramName, paramValue] of Object.entries(report.parameters)) {
        if (!existing.parameters[paramName]) {
          existing.parameters[paramName] = paramValue
        }
      }
      // Merge report names if different
      if (report.name && !existing.name.includes(report.name)) {
        existing.name = `${existing.name}, ${report.name}`
      }
    }
  }

  // Also merge health_summary parameters by fullfilmentDate
  // Group ApiHealthReport objects by their report's fullfilmentDate
  const healthSummaryByDate = new Map<string, HealthSummaryItem[]>()
  
  for (const apiReport of reports) {
    if (!apiReport.health_summary || apiReport.health_summary.length === 0) continue
    
    const reportDate = apiReport.reports[0]?.fullfilmentDate || apiReport.reports[0]?.date || "unknown"
    const existingHealthSummary = healthSummaryByDate.get(reportDate)
    
    if (!existingHealthSummary) {
      // Deep clone health_summary for this date
      healthSummaryByDate.set(reportDate, apiReport.health_summary.map(item => ({
        ...item,
        parameters: item.parameters ? [...item.parameters] : [],
      })))
    } else {
      // Merge health_summary categories and parameters
      for (const newItem of apiReport.health_summary) {
        const categoryName = newItem.category || "Unknown"
        const existingCategory = existingHealthSummary.find(
          (e) => (e.category || "Unknown") === categoryName
        )
        
        if (!existingCategory) {
          // Add new category
          existingHealthSummary.push({
            ...newItem,
            parameters: newItem.parameters ? [...newItem.parameters] : [],
          })
        } else {
          // Merge parameters into existing category
          const existingParams = existingCategory.parameters || []
          const newParams = newItem.parameters || []
          
          for (const newParam of newParams) {
            const paramName = newParam.name || (newParam as any).metric_name || ""
            if (!paramName) continue
            
            // Check if parameter already exists by name
            const exists = existingParams.some((p) => {
              const existingName = p.name || (p as any).metric_name || ""
              return existingName.toLowerCase() === paramName.toLowerCase()
            })
            
            if (!exists) {
              existingParams.push(newParam)
            }
          }
          existingCategory.parameters = existingParams
          
          // Recalculate out_of_range_count
          const outOfRangeCount = existingParams.filter((p) => {
            const status = (p.status || "normal").toLowerCase()
            return status !== "normal" && status !== "in range" && status !== "in_range"
          }).length
          existingCategory.out_of_range_count = outOfRangeCount
        }
      }
    }
  }

  // Convert back to array and sort by date (latest first)
  const allReports = Array.from(reportsByDate.values())
    .sort((a, b) => parseDate(b.fullfilmentDate || "").getTime() - parseDate(a.fullfilmentDate || "").getTime())

  // Get the latest report (first in sorted array)
  const latestReportData = allReports[0]
  const otherReports = allReports.slice(1)
  
  // Get merged health_summary for the latest date
  const latestDateKey = latestReportData?.fullfilmentDate || latestReportData?.date || "unknown"
  const mergedHealthSummaryForLatest = healthSummaryByDate.get(latestDateKey) || []

  // Filter reports to only include latest docs for health summary and digital twin
  const latestReports =
    latestDocIds && latestDocIds.length > 0 && reportDocIdMap
      ? reports.filter((r) => {
          const docId = reportDocIdMap.get(r)
          return docId && latestDocIds.includes(docId)
        })
      : reports

  // Merge health summaries from:
  // 1. Pre-merged health_summary by fullfilmentDate (mergedHealthSummaryForLatest)
  // 2. Additional merging across latestReports to ensure all data is captured
  const mergedHealthSummaryMap = new Map<string, any>()
  
  // First, add all items from date-merged health_summary
  for (const item of mergedHealthSummaryForLatest) {
    const categoryName = item.category || (item as any).name || "Unknown"
    mergedHealthSummaryMap.set(categoryName, { 
      ...item,
      parameters: item.parameters ? [...item.parameters] : [],
    })
  }
  
  // Then merge additional health_summary from latestReports (handles cases where latestDocIds filter is used)
  for (const report of latestReports) {
    if (report.health_summary && report.health_summary.length > 0) {
      for (const item of report.health_summary) {
        const categoryName = item.category || (item as any).name || "Unknown"
        const existing = mergedHealthSummaryMap.get(categoryName)
        if (!existing) {
          mergedHealthSummaryMap.set(categoryName, { 
            ...item,
            parameters: item.parameters ? [...item.parameters] : [],
          })
        } else {
          // Merge parameters from same category
          const existingParams = existing.parameters || []
          const newParams = item.parameters || []

          for (const newParam of newParams) {
            const paramName = newParam.name || (newParam as any).metric_name || ""
            if (!paramName) continue
            
            // Check if parameter already exists (case-insensitive)
            const exists = existingParams.some((p: any) => {
              const existingName = p.name || p.metric_name || ""
              return existingName.toLowerCase() === paramName.toLowerCase()
            })
            
            if (!exists) {
              existingParams.push(newParam)
            }
          }
          existing.parameters = existingParams

          // Update out_of_range_count
          const outOfRangeCount = existingParams.filter((p: any) => {
            const status = (p.status || "normal").toLowerCase()
            return status !== "normal" && status !== "in range" && status !== "in_range"
          }).length
          existing.out_of_range_count = outOfRangeCount

          // Update status if any is abnormal
          if (
            item.status === "warning" ||
            item.status === "abnormal" ||
            item.status === "high" ||
            item.status === "low"
          ) {
            existing.status = item.status
          }
        }
      }
    }
  }

  const mergedHealthSummary = Array.from(mergedHealthSummaryMap.values())

  // Build the per-date summary list for the Health Summary date dropdown.
  // The latest date uses the fully merged summary (matching the default view);
  // all other dates come straight from healthSummaryByDate. Sorted latest first.
  const healthSummaryByDateList: Array<{ dateKey: string; health_summary: HealthSummaryItem[] }> = []
  if (mergedHealthSummary.length > 0) {
    healthSummaryByDateList.push({ dateKey: latestDateKey, health_summary: mergedHealthSummary })
  }
  Array.from(healthSummaryByDate.entries())
    .filter(([dateKey, summary]) => dateKey !== latestDateKey && summary && summary.length > 0)
    .sort((a, b) => parseDate(b[0]).getTime() - parseDate(a[0]).getTime())
    .forEach(([dateKey, summary]) => {
      healthSummaryByDateList.push({ dateKey, health_summary: summary })
    })

  return {
    patient_info: latestReport.patient_info,
    reports: latestReportData ? [latestReportData, ...otherReports] : otherReports,
    health_summary: mergedHealthSummary,
    health_summary_by_date: healthSummaryByDateList,
    trend_analysis: latestReport.trend_analysis,
    lab_reports: latestReport.lab_reports,
    isLoading: latestReport.isLoading,
    isLoadingMetrics: latestReport.isLoadingMetrics,
    // The Health Summary content is keyed off latestReportData (the globally
    // latest report by fullfilmentDate — see latestDateKey above). Source the
    // displayed date from that SAME report so the header date always matches
    // the data shown. latestReport (picked by comparing only each report's
    // first entry) can resolve to a different date and caused a mismatch.
    latestReportDate: latestReportData?.fullfilmentDate || latestReportData?.date || latestReport.latestReportDate,
  }
}
