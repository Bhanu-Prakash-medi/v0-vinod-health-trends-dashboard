"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import TopNavigation from "@/components/top-navigation"
import ProfileCard from "@/components/profile-card"
import UploadReportSection from "@/components/upload-report-section"
import HealthSummarySection from "@/components/health-summary-section"
import InsightsSection from "@/components/insights-section"
import WhatNextSection from "@/components/what-next-section"
import AllParametersSection from "@/components/all-parameters-section"
import AllParametersPage from "@/components/all-parameters-page"
import TrendsSection from "@/components/trends-section"
import Footer from "@/components/footer"
import TestReportsSection from "@/components/test-reports-section"
import HealthRecommendationsSection from "@/components/health-recommendations-section"
import FeedbackSection from "@/components/feedback-section"
import AllTrendsPage from "@/components/all-trends-page"
import HealthConsentModal from "@/components/health-consent-modal"
import HealthScoreSection from "@/components/health-score-section"
import FeatureComingSoon from "@/components/feature-coming-soon"
import { checkAppAccess } from "@/lib/health-trends-access-allowlist"
import EmptyState from "@/components/empty-state"
import ReportProblemButton from "@/components/report-problem-button"
import {
  TopNavigationSkeleton,
  ProfileCardSkeleton,
  HealthSummarySkeleton,
  HealthSummaryCardsSkeleton,
} from "@/components/skeletons"
import { initSnowplow, trackHealthTrendsEvent, setSnowplowUserContext, setSelfVasBenefId } from "@/lib/snowplow"
import { sendHotjarEvent } from "@/lib/analytics/analytics"
import { HOTJAR_EVENTS_NAME } from "@/lib/analytics/constants"
import { identifyUser, trackEvent, trackEventOnce } from "@/lib/analytics/posthog"
import SectionViewTracker from "@/components/section-view-tracker"
import {
  fetchBeneficiaries,
  fetchBeneficiaryReportRequests,
  fetchReportDetailsAsHealthReport,
  buildTrendsFromReports,
  fetchTrendsFromApi,
  createInitialProfileFromBeneficiary,
  mergeReportsKeepLatest,
  getAccessTokenFromCookie,
  getPmEntityIdFromCookie,
  getHealthConsent,
  submitHealthConsent,
  pickPrimaryEmail,
  type ApiHealthReport,
  type Beneficiary,
  type TrendAnalysisItem,
} from "@/lib/api"
import { genderAvatar } from "@/lib/health-utils"

interface BeneficiaryError {
  type: "TIMEOUT" | "GENERAL" | "NO_REPORTS"
  message: string
}

// The Health Risk Score API accepts at most 15 requestIds per call.
const MAX_HEALTH_SCORE_REQUEST_IDS = 15

// Only reports with this contract type feed the Health Risk Score. The summary
// and trends deliberately ignore contract type and use every available report.
const HEALTH_SCORE_CONTRACT_TYPE = "9716"

export default function HealthDashboard() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [activeBeneficiaryIndex, setActiveBeneficiaryIndex] = useState(0)
  // Which report is selected in the Health Summary date dropdown. Owned here
  // (not inside HealthSummarySection) so the Digital Twin / body twin renders
  // the SAME report the user picked instead of always the latest one.
  const [selectedSummaryIndex, setSelectedSummaryIndex] = useState(0)
  const [beneficiaryReports, setBeneficiaryReports] = useState<Map<string, ApiHealthReport>>(new Map())
  // RequestIds (per beneficiary) whose report-details API returned a non-null
  // report. Only these are sent to the Health Risk Score API — requests that
  // returned nothing must be excluded, and the API also rejects >15 ids.
  const [scoreRequestIds, setScoreRequestIds] = useState<Map<string, string[]>>(new Map())
  const [beneficiaryErrors, setBeneficiaryErrors] = useState<Map<string, BeneficiaryError>>(new Map())
  const [healthSummaryLoading, setHealthSummaryLoading] = useState<Map<string, boolean>>(new Map())
  // Beneficiaries whose report load has fully settled. Needed because the reports
  // map is pre-seeded with an empty placeholder, so "not loaded yet" and "loaded
  // but empty" look identical by data alone. This flag flips true only once the
  // load finishes, letting us show the empty-report fallback instead of an
  // endless skeleton when the analysis comes back with no usable data.
  const [completedBeneficiaries, setCompletedBeneficiaries] = useState<Set<string>>(new Set())
  const [showAllParameters, setShowAllParameters] = useState(false)
  const [showAllTrends, setShowAllTrends] = useState(false)
  const [pendingReportDate, setPendingReportDate] = useState<string | null>(null)
  const [isBeneficiariesLoading, setIsBeneficiariesLoading] = useState(true)
  const [globalError, setGlobalError] = useState<{ type: string; message: string } | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>("")
  const [mbUserId, setMbUserId] = useState<string>("")
  const [pmEntityId, setPmEntityId] = useState<string>("0")
  // App-level access for the restricted org, resolved via the API allowlist.
  // null = not yet determined; false = denied (show "coming soon").
  const [appAccessAllowed, setAppAccessAllowed] = useState<boolean | null>(null)
  // Consent gate. Starts hidden until we know the user's consent status:
  // `null` = unknown/checking (no modal yet), `true` = agreed, `false` = must agree.
  const [hasAcceptedHealthConsent, setHasAcceptedHealthConsent] = useState<boolean | null>(null)
  // Identifiers needed to submit consent, captured from the profile response
  // (mbUserId, email) and the cookie (pmEntityId).
  const consentIdsRef = useRef<{ mbUserId: string; pmEntityId: string; email: string } | null>(null)
  const hasHealthSummaryEventFiredRef = useRef(false)
  const hasTrendsEventFiredRef = useRef(false)
  // Trends fetched from the backend /health/trends API, keyed by patientName.
  // Preferred over client-side trends when present (see attachTrendsToReport).
  const apiTrendsRef = useRef<Map<string, TrendAnalysisItem[]>>(new Map())
  // Tracks which beneficiaries have already had their reports requested, so a
  // beneficiary's reports are fetched only once (on first selection). Self is
  // loaded eagerly; everyone else is loaded lazily when the user selects them.
  const requestedBeneficiariesRef = useRef<Set<string>>(new Set())
  // Beneficiaries whose lazy load is in-flight — used to show the loading
  // skeleton immediately on selection instead of flashing an empty state.
  const [lazyPending, setLazyPending] = useState<Set<string>>(new Set())

  // Build trend analysis + lab reports client-side from the analyzed reports
  // (each report's parameters become time-series points). This replaces the old
  // n8n trends API — trends are derived from the same report-details responses.
  const attachTrendsToReport = useCallback(
    (report: ApiHealthReport, apiTrends?: TrendAnalysisItem[] | null): ApiHealthReport => {
      try {
        // lab_reports (Test Reports list) is always derived client-side from the
        // report-details responses. trend_analysis prefers the backend
        // /health/trends API when available, falling back to the client-side
        // build otherwise.
        const { trend_analysis: clientTrends, lab_reports } = buildTrendsFromReports(report.reports || [])
        const trend_analysis = apiTrends && apiTrends.length > 0 ? apiTrends : clientTrends
        if (!hasTrendsEventFiredRef.current && trend_analysis.length > 0) {
          hasTrendsEventFiredRef.current = true
          trackHealthTrendsEvent("Trends Graphs Loaded")
        }
        // Build the per-report (un-merged) list for the count + Test Reports.
        // Uses all_reports_raw so same-day reports stay separate; falls back to
        // the date-merged reports when the raw list isn't present.
        const rawSeparate = report.all_reports_raw && report.all_reports_raw.length > 0 ? report.all_reports_raw : report.reports || []
        const { lab_reports: all_reports } = buildTrendsFromReports(rawSeparate)
        return { ...report, trend_analysis, lab_reports, all_reports }
      } catch {
        // Trends are non-critical; return the report unchanged on failure.
        return report
      }
    },
    [],
  )

  const loadBeneficiaryReport = useCallback(
    async (beneficiary: Beneficiary, token: string) => {
      // Low-sensitivity categorical source for analytics — never the actual
      // beneficiary name/identity.
      const analyticsSource: "self" | "family_member" =
        beneficiary.relation?.toLowerCase() === "self" ? "self" : "family_member"
      const loadStartedAt = Date.now()

      setBeneficiaryErrors((prev) => {
        const newMap = new Map(prev)
        newMap.delete(beneficiary.uid)
        return newMap
      })

      // Fetch this beneficiary's authoritative report references
      // ({ requestId, date, file }) from the reports API using their vasBenifId.
      // The profile endpoint only populates Self, so every beneficiary's real
      // report set comes from here. Falls back to profile-provided requests.
      let reportRequests = beneficiary.reportRequests || []
      if (beneficiary.rVasBenefId !== undefined && beneficiary.rVasBenefId !== null && beneficiary.rVasBenefId !== "") {
        try {
          const fetched = await fetchBeneficiaryReportRequests(token, beneficiary.rVasBenefId)
          if (fetched.length > 0) {
            reportRequests = fetched
            const docIds = fetched.map((r) => r.requestId)
            // Keep the displayed total at least as large as the profile count so
            // the badge never shrinks; the profile count is shown immediately.
            const accurateCount = Math.max(beneficiary.reportCount || 0, fetched.length)
            beneficiary = { ...beneficiary, reportRequests: fetched, dmS_Doc_ID: docIds, reportCount: accurateCount }
            // Reflect the real report references in the beneficiary list and
            // downstream consumers (trends, health summary).
            setBeneficiaries((prev) =>
              prev.map((b) =>
                b.uid === beneficiary.uid
                  ? { ...b, reportRequests: fetched, dmS_Doc_ID: docIds, reportCount: accurateCount }
                  : b,
              ),
            )
          }
        } catch (reportErr) {
          if (reportErr instanceof Error && reportErr.message === "UNAUTHORIZED") {
            setGlobalError({ type: "UNAUTHORIZED", message: "Please login to access the health trends" })
            return
          }
          // Otherwise fall back to the profile-provided report requests (if any).
        }
      }

      // The report-details API is scoped by the beneficiary's vasBenefId
      // (the backend no longer accepts the account mbUserId). Fall back to
      // userId only if rVasBenefId is somehow missing.
      const reportVasBenefId = beneficiary.rVasBenefId ?? beneficiary.userId ?? ""

      // Fetch pre-computed trends from the backend /health/trends API. mbUserId
      // is the account-level id (captured for consent); vasBenefId scopes to
      // this beneficiary. Fired in parallel (NOT awaited here) so a slow trends
      // endpoint never delays report loading; the result is stored per-
      // beneficiary and awaited just before the final merge below. A failure
      // resolves to null and attachTrendsToReport falls back to client trends.
      const trendsMbUserId = consentIdsRef.current?.mbUserId || beneficiary.userId || reportVasBenefId
      const trendsVasBenefId = reportVasBenefId
      const trendsPromise: Promise<TrendAnalysisItem[] | null> =
        trendsMbUserId && trendsVasBenefId
          ? fetchTrendsFromApi(trendsMbUserId, trendsVasBenefId, token)
              .then((apiTrends) => {
                if (apiTrends && apiTrends.length > 0) {
                  apiTrendsRef.current.set(beneficiary.uid, apiTrends)
                }
                return apiTrends
              })
              .catch(() => null)
          : Promise.resolve(null)

      try {
        // Report identifiers are requestIds. The latest report (by date) drives
        // the health summary / digital twin; all reports feed the trends.
        const allDocIds = reportRequests.map((r) => r.requestId)
        const sortedRequests = [...reportRequests].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
        const latestDocIds = sortedRequests.length > 0 ? [sortedRequests[0].requestId] : []
        const requestDateById = new Map(reportRequests.map((r) => [r.requestId, r.date]))
        // Authoritative contractType per requestId, from the reports listing
        // endpoint. Used to gate which reports feed the Health Risk Score.
        const requestContractById = new Map(
          reportRequests.map((r) => [r.requestId, r.contractType ?? null]),
        )
        // Original report PDF URL per requestId (from the beneficiary reports API),
        // used to offer an "download original report" action in Test Reports.
        const requestFileById = new Map(reportRequests.map((r) => [r.requestId, r.file || ""]))

        if (allDocIds.length === 0) {
          setBeneficiaryErrors((prev) => {
            const newMap = new Map(prev)
            newMap.set(beneficiary.uid, {
              type: "NO_REPORTS",
              message: "No reports are available",
            })
            return newMap
          })

          setBeneficiaryReports((prev) => {
            const newMap = new Map(prev)
            const existingReport = newMap.get(beneficiary.uid)
            if (existingReport) {
              newMap.set(beneficiary.uid, {
                ...existingReport,
                isLoading: false,
              })
            }
            return newMap
          })
          return
        }

        // Track loaded reports for incremental updates
        const loadedReports: ApiHealthReport[] = []
        const reportDocIdMap = new Map<ApiHealthReport, string>()
        const loadedLatestDocIds = new Set<string>()
        const failedDocIds = new Set<string>()
        let hasDisplayedPartialData = false
        let hasLoaderBeenShown = false


        // Function to show loader after first API call is triggered
        const showLoaderOnFirstApiCall = () => {
          if (!hasLoaderBeenShown) {
            hasLoaderBeenShown = true
            setHealthSummaryLoading((prev) => {
              const newMap = new Map(prev)
              newMap.set(beneficiary.uid, true)
              return newMap
            })
          }
        }

        // Get effective latest doc IDs (excluding failed ones)
        const getEffectiveLatestDocIds = (): string[] => {
          const effective = latestDocIds.filter((id) => !failedDocIds.has(id))
          if (effective.length > 0) return effective

          // All latestDmsDocIds failed - fallback to the next latest doc by fulfilmentDate
          // The successful loaded reports are sorted by date in mergeReportsKeepLatest
          // So we return empty array to let merge logic use all successful reports
          return []
        }

        // Create a function to update UI with partial data
        const updateWithPartialData = (report: ApiHealthReport, docId: string) => {
          loadedReports.push(report)
          reportDocIdMap.set(report, docId)

          const effectiveLatestDocIds = getEffectiveLatestDocIds()

          // Check if this is a latest doc ID
          const isLatestDoc = effectiveLatestDocIds.length === 0 || effectiveLatestDocIds.includes(docId)

          if (isLatestDoc) {
            loadedLatestDocIds.add(docId)
          }

          if (isLatestDoc || !hasDisplayedPartialData) {
            hasDisplayedPartialData = true

            // Merge all loaded reports, but only use effective latest docs for health summary/digital twin
            const mergedReport = attachTrendsToReport(
              mergeReportsKeepLatest(loadedReports, effectiveLatestDocIds, reportDocIdMap),
              apiTrendsRef.current.get(beneficiary.uid),
            )
            mergedReport.patient_info.relation = beneficiary.relation

            setBeneficiaryReports((prev) => {
              const newMap = new Map(prev)
              newMap.set(beneficiary.uid, mergedReport)
              return newMap
            })
          }

          // Check if ALL effective latest doc IDs have been loaded - stop loading skeleton
          const allLatestLoaded =
            effectiveLatestDocIds.length === 0 || effectiveLatestDocIds.every((id) => loadedLatestDocIds.has(id))

          if (allLatestLoaded) {
            // Stop loading skeleton once all latest docs are loaded
            setHealthSummaryLoading((prev) => {
              const newMap = new Map(prev)
              newMap.set(beneficiary.uid, false)
              return newMap
            })

          }
        }

        // Fetch the latest report(s) first so the health summary, health score
        // and digital twin (which only need the latest report) render as early
        // as possible, before the remaining historical reports finish loading.
        const orderedDocIds = [
          ...latestDocIds.filter((id) => allDocIds.includes(id)),
          ...allDocIds.filter((id) => !latestDocIds.includes(id)),
        ]

        // Launch all report fetches asynchronously
        const reportPromises = orderedDocIds.map(async (docId) => {
          try {
            // Show loader after the first API call is triggered (confirms records exist)
            showLoaderOnFirstApiCall()
            // Fetch the fully analyzed report for this requestId from the new
            // report-details API (synchronous — no polling).
            const report = await fetchReportDetailsAsHealthReport(
              token,
              reportVasBenefId,
              docId,
              requestDateById.get(docId),
              requestFileById.get(docId),
            )
            // Update UI incrementally as each report comes in
            updateWithPartialData(report, docId)
            return { status: "fulfilled" as const, value: report, docId }
          } catch (error) {
            const isFailed = error instanceof Error && error.message === "DOCUMENT_FAILED"

            if (isFailed) {
              // Mark this doc as failed - exclude from all downstream flows
              failedDocIds.add(docId)
            }

            // Recalculate effective latest doc IDs after failure
            const effectiveLatestDocIds = getEffectiveLatestDocIds()

            if (latestDocIds.includes(docId)) {
              loadedLatestDocIds.add(docId)
            }

            // Check if all effective latest are now processed to stop loading skeleton
            const allLatestProcessed =
              effectiveLatestDocIds.length === 0 || effectiveLatestDocIds.every((id) => loadedLatestDocIds.has(id))

            if (allLatestProcessed) {
              setHealthSummaryLoading((prev) => {
                const newMap = new Map(prev)
                newMap.set(beneficiary.uid, false)
                return newMap
              })
            }

            // If a latest doc failed, re-merge with remaining successful reports using updated effective IDs
          if (isFailed && loadedReports.length > 0) {
            const mergedReport = attachTrendsToReport(
              mergeReportsKeepLatest(loadedReports, effectiveLatestDocIds, reportDocIdMap),
              apiTrendsRef.current.get(beneficiary.uid),
            )
            mergedReport.patient_info.relation = beneficiary.relation
              setBeneficiaryReports((prev) => {
                const newMap = new Map(prev)
                newMap.set(beneficiary.uid, mergedReport)
                return newMap
              })
            }

            return { status: "rejected" as const, reason: error, docId }
          }
        })

        // Wait for all reports to complete
        const results = await Promise.all(reportPromises)

        const successfulReports = results
          .filter((r): r is { status: "fulfilled"; value: ApiHealthReport; docId: string } => r.status === "fulfilled")
          .map((r) => r.value)

        if (successfulReports.length === 0) {
          throw new Error("Failed to load any reports")
        }

        // Final merge with all reports, excluding failed docs, using effective latest docs
        const finalReportDocIdMap = new Map<ApiHealthReport, string>()
        for (const result of results) {
          if (result.status === "fulfilled" && !failedDocIds.has(result.docId)) {
            finalReportDocIdMap.set(result.value, result.docId)
          }
        }
        const effectiveLatestDocIdsFinal = getEffectiveLatestDocIds()
          // Ensure the trends API call (fired in parallel earlier) has settled so
          // the final render prefers backend trends when available.
          await trendsPromise
          // Attach trends: prefer the backend /health/trends API result for this
          // beneficiary, falling back to the client-side build inside
          // attachTrendsToReport when the API returned nothing.
          const mergedReport = attachTrendsToReport(
            mergeReportsKeepLatest(successfulReports, effectiveLatestDocIdsFinal, finalReportDocIdMap),
            apiTrendsRef.current.get(beneficiary.uid),
          )
          mergedReport.isLoading = false
        mergedReport.patient_info.relation = beneficiary.relation

        setBeneficiaryReports((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.uid, mergedReport)
          return newMap
        })

        // Collect the requestIds sent to the Health Risk Score API. The backend
        // is the authority on scoreability: it returns `found: true` only for
        // reports it can score (empirically, the comprehensive AHC reports), and
        // it picks the latest scored report. So instead of hard-filtering to a
        // single contractType client-side — which silently hides a valid score
        // whenever a beneficiary's scoreable report has a different or missing
        // contractType — we send a PRIORITIZED candidate list and let the backend
        // decide:
        //   1. contractType 9716 reports first (the known AHC type — guarantees
        //      no regression for members who already get a score today), then
        //   2. every other report with data, as a fallback so the backend can
        //      still find a score for members whose scoreable report isn't tagged
        //      9716 (or whose contractType metadata is absent).
        // Each group is sorted most-recent first, then the combined list is
        // capped at MAX_HEALTH_SCORE_REQUEST_IDS (the API rejects >15 ids).
        const byDateDesc = (aDoc: string, bDoc: string) => {
          const da = new Date(requestDateById.get(aDoc) || 0).getTime()
          const db = new Date(requestDateById.get(bDoc) || 0).getTime()
          return db - da
        }
        const successfulDocIds = results
          .filter(
            (r): r is { status: "fulfilled"; value: ApiHealthReport; docId: string } =>
              r.status === "fulfilled" && !failedDocIds.has(r.docId),
          )
          .map((r) => ({
            docId: r.docId,
            // Prefer the reports-listing contractType (authoritative per
            // requestId); fall back to the report-details response value.
            contract: String(requestContractById.get(r.docId) ?? r.value.contractType ?? ""),
          }))
        const preferredDocIds = successfulDocIds
          .filter((r) => r.contract === HEALTH_SCORE_CONTRACT_TYPE)
          .map((r) => r.docId)
          .sort(byDateDesc)
        const fallbackDocIds = successfulDocIds
          .filter((r) => r.contract !== HEALTH_SCORE_CONTRACT_TYPE)
          .map((r) => r.docId)
          .sort(byDateDesc)
        const successfulRequestIds = [...preferredDocIds, ...fallbackDocIds].slice(
          0,
          MAX_HEALTH_SCORE_REQUEST_IDS,
        )
        setScoreRequestIds((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.uid, successfulRequestIds)
          return newMap
        })

        // Ensure loading is stopped
        setHealthSummaryLoading((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.uid, false)
          return newMap
        })

        // Mark this beneficiary's load as fully settled so the UI can decide
        // between showing data and showing the empty-report fallback.
        setCompletedBeneficiaries((prev) => {
          const next = new Set(prev)
          next.add(beneficiary.uid)
          return next
        })

        // Fire Health Summary Loaded once (self user only) after all reports are merged
        if (!hasHealthSummaryEventFiredRef.current) {
          hasHealthSummaryEventFiredRef.current = true
          trackHealthTrendsEvent("Health Summary Loaded")
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)

        let errorInfo: BeneficiaryError

        if (errorMessage === "UNAUTHORIZED") {
          setGlobalError({ type: "UNAUTHORIZED", message: "Please login to access the health trends" })
          return
        } else if (errorMessage === "NO_REPORTS_404") {
          errorInfo = { type: "NO_REPORTS", message: "Sorry Lab Reports are Not Available" }
        } else if (
          errorMessage.includes("504") ||
          errorMessage.includes("timeout") ||
          errorMessage.includes("Time-out") ||
          errorMessage.includes("TIMEOUT")
        ) {
          errorInfo = { type: "TIMEOUT", message: "The server is taking too long to respond. Please try again." }
        } else {
          errorInfo = { type: "GENERAL", message: "Failed to load health reports. Please try again." }
        }

        trackEvent("dashboard_load_failed", {
          source: analyticsSource,
          success: false,
          duration_ms: Date.now() - loadStartedAt,
        })

        setBeneficiaryErrors((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.uid, errorInfo)
          return newMap
        })

        setHealthSummaryLoading((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.uid, false)
          return newMap
        })

        setBeneficiaryReports((prev) => {
          const newMap = new Map(prev)
          const existingReport = newMap.get(beneficiary.uid)
          if (existingReport) {
            newMap.set(beneficiary.uid, {
              ...existingReport,
              isLoading: false,
            })
          }
          return newMap
        })
      }
    },
    [attachTrendsToReport],
  )

  const retryLoadReport = useCallback(
    (beneficiaryUid: string) => {
      const beneficiary = beneficiaries.find((b) => b.uid === beneficiaryUid)
      if (beneficiary && accessToken) {
        trackEvent("dashboard_retry_click", {
          source: beneficiary.relation?.toLowerCase() === "self" ? "self" : "family_member",
        })
        setBeneficiaryReports((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.uid, createInitialProfileFromBeneficiary(beneficiary))
          return newMap
        })
        loadBeneficiaryReport(beneficiary, accessToken)
      }
    },
    [beneficiaries, loadBeneficiaryReport, accessToken],
  )

  // Initialize Snowplow on mount
  useEffect(() => {
    initSnowplow()
    sendHotjarEvent(HOTJAR_EVENTS_NAME.HEALTH_TRENDS_HOTJAR, {})
  }, [])

  const hasLoadedRef = useRef(false)

  useEffect(() => {
    let isMounted = true

    async function loadBeneficiariesData() {
      // Guard against duplicate/concurrent initial loads (e.g. Strict Mode
      // double-invoke or effect re-runs), which would otherwise fire multiple
      // simultaneous beneficiaries requests and overwhelm the backend.
      if (hasLoadedRef.current) return
      hasLoadedRef.current = true

      try {
        setIsBeneficiariesLoading(true)
        setGlobalError(null)

        const DEBUG_TOKEN = "4a4da9d5e1684e8492f0792f4a6eb099"

        let cookieToken: string | null = null
        try {
          cookieToken = getAccessTokenFromCookie()
        } catch (cookieError) {
          cookieToken = null
        }

        // Prefer the real token from the cookie; fall back to the debug token.
        let token = cookieToken || DEBUG_TOKEN

  const pmEntityId = getPmEntityIdFromCookie()
  setPmEntityId(pmEntityId)

  let data
        try {
          data = await fetchBeneficiaries(token, pmEntityId)
        } catch (fetchErr) {
          // A stale/expired cookie token (e.g. "session expired") should not
          // block access when a debug token is available: retry once with it.
          if (
            fetchErr instanceof Error &&
            fetchErr.message === "UNAUTHORIZED" &&
            cookieToken &&
            cookieToken !== DEBUG_TOKEN
          ) {
            token = DEBUG_TOKEN
            data = await fetchBeneficiaries(token, pmEntityId)
          } else {
            throw fetchErr
          }
        }

        // Persist whichever token actually succeeded for subsequent report loads.
        setAccessToken(token)

        if (!isMounted) return

        if (!data.beneficiaries || data.beneficiaries.length === 0) {
          throw new Error("No beneficiaries found")
        }

        setBeneficiaries(data.beneficiaries)
        setMbUserId(data.mbuserid ? String(data.mbuserid) : "")
        setUserEmail(data.employee_email || "")
        setSnowplowUserContext(data.mbuserid || null, data.employee_email || null)

        // Identify in PostHog with the same ids Snowplow uses, then record the
        // "used Health Trends" event. Firing it here (rather than on mount)
        // means every DAU event carries mb_user_id / pm_entity_id, so unique
        // people can be counted and broken down.
        const selfProfileForAnalytics = data.beneficiaries.find((b) => b.relation?.toLowerCase() === "self")
        identifyUser({
          mbUserId: data.mbuserid || null,
          pmEntityId,
          email: data.employee_email || null,
          name: selfProfileForAnalytics?.patientName || null,
        })
        // trackEventOnce is module-scoped, so a remount can't double-count
        // this user in the DAU metric.
        trackEventOnce("dashboard_view")

        // Consent gate: mbUserId comes from the profile response, pmEntityId
        // from the cookie, email from the profile. Check existing consent; if
        // the user hasn't agreed yet, the modal is shown.
        const consentMbUserId = data.mbuserid ? String(data.mbuserid) : ""
        consentIdsRef.current = {
          mbUserId: consentMbUserId,
          pmEntityId,
          email: data.employee_email || "",
        }
        if (consentMbUserId) {
          const consentStatus = await getHealthConsent(consentMbUserId, token)
          // Only show the modal on a conclusive "not_agreed". For "agreed" and
          // "unknown" (transient errors/timeouts) keep the dashboard unblocked
          // so an already-agreed user is never nagged by a flaky request.
          if (isMounted) setHasAcceptedHealthConsent(consentStatus !== "not_agreed")
        } else if (isMounted) {
          // No user id -> can't record consent; don't block the dashboard.
          setHasAcceptedHealthConsent(true)
        }

        // Set self user's vasbenefId for self-only events
        const selfBenef = data.beneficiaries.find((b) => b.relation.toLowerCase() === "self")
        if (selfBenef?.rVasBenefId) {
          setSelfVasBenefId(selfBenef.rVasBenefId)
        }

        const initialReports = new Map<string, ApiHealthReport>()
        data.beneficiaries.forEach((b) => {
          const initialProfile = createInitialProfileFromBeneficiary(b)
          initialProfile.isLoading = false
          initialProfile.patient_info.age = b.age || 0
          initialProfile.patient_info.gender = b.gender || "Unknown"
          initialReports.set(b.uid, initialProfile)
        })
        setBeneficiaryReports(initialReports)
        trackHealthTrendsEvent("Profile Section Loaded")

        const sortedBeneficiaries = [...data.beneficiaries].sort((a, b) => {
          if (a.relation.toLowerCase() === "self") return -1
          if (b.relation.toLowerCase() === "self") return 1
          return 0
        })

        const selfIndex = data.beneficiaries.findIndex((b) => b.relation.toLowerCase() === "self")
        if (selfIndex !== -1) {
          setActiveBeneficiaryIndex(selfIndex)
        }

        // Resolve app-level access before revealing the app. For the restricted
        // org this fetches the API allowlist and fails closed on any error;
        // other orgs resolve to `true` immediately. Awaiting here keeps the
        // loading skeleton up (instead of flashing the app or "coming soon")
        // until the decision is known.
        const allowed = await checkAppAccess(pmEntityId, data.employee_email || "")
        if (!isMounted) return
        setAppAccessAllowed(allowed)

        setIsBeneficiariesLoading(false)

        // Load ONLY the Self beneficiary eagerly on initial load. Other family
        // members are loaded lazily the first time the user selects them (see
        // handleBeneficiaryChange). This keeps the initial load lean — fewer
        // concurrent report requests competing for connections means the profile
        // and Self's data appear noticeably faster.
        const selfBeneficiary = sortedBeneficiaries[0]
        if (selfBeneficiary) {
          if (selfBeneficiary.dmS_Doc_ID.length == 0) {
            trackHealthTrendsEvent("No Reports Available")
          }
          requestedBeneficiariesRef.current.add(selfBeneficiary.uid)
          loadBeneficiaryReport(selfBeneficiary, token)
        }
      } catch (err) {
        trackHealthTrendsEvent("Failed to Login")
        // Allow a subsequent retry to re-run the initial load.
        hasLoadedRef.current = false
        if (isMounted) {
          if (err instanceof Error && err.message === "UNAUTHORIZED") {
            setGlobalError({ type: "UNAUTHORIZED", message: "Please login to access the health trends" })
          } else if (err instanceof Error && (err.message.includes("504") || err.message.includes("timeout"))) {
            setGlobalError({
              type: "TIMEOUT",
              message: "The server is taking too long to respond. Please try again later.",
            })
          } else {
            setGlobalError({
              type: "GENERAL",
              message: err instanceof Error ? err.message : "Failed to fetch beneficiaries",
            })
          }
          setIsBeneficiariesLoading(false)
        }
      }
    }

    loadBeneficiariesData()

    return () => {
      isMounted = false
    }
  }, [loadBeneficiaryReport])

  const handleBeneficiaryChange = (uid: string) => {
    // Selection is by the beneficiary's stable unique uid — NOT patientName,
    // which can be shared by two beneficiaries and would select the wrong one.
    const index = beneficiaries.findIndex((b) => b.uid === uid)
    if (index === -1) return
    setActiveBeneficiaryIndex(index)
    // Reset the Health Summary/twin selection back to the latest report.
    setSelectedSummaryIndex(0)

    // Lazily load this beneficiary's reports the first time they are selected.
    const beneficiary = beneficiaries[index]
    if (beneficiary && accessToken && !requestedBeneficiariesRef.current.has(beneficiary.uid)) {
      requestedBeneficiariesRef.current.add(beneficiary.uid)
      // Show the skeleton right away, then clear the pending flag once the load
      // settles (real data or an error takes over the gating from there).
      setLazyPending((prev) => new Set(prev).add(beneficiary.uid))
      loadBeneficiaryReport(beneficiary, accessToken).finally(() => {
        setLazyPending((prev) => {
          const next = new Set(prev)
          next.delete(beneficiary.uid)
          return next
        })
      })
    }
  }

  const handleConsentAgree = async () => {
    const ids = consentIdsRef.current
    // Optimistically unblock the dashboard; record the agreement in the
    // background. mbUserId + email come from the profile, pmEntityId from cookie.
    setHasAcceptedHealthConsent(true)
    if (!ids?.mbUserId) return
    await submitHealthConsent(
      { mbUserId: ids.mbUserId, pmEntityId: ids.pmEntityId, email: ids.email },
      accessToken,
    )
  }

  const consentModal = (
    <HealthConsentModal open={hasAcceptedHealthConsent === false} onAgree={handleConsentAgree} />
  )

  // Full-page trends/all-parameters views are dedicated screens, so their
  // "viewed" moment is simply the state flip that renders them (unlike the
  // in-page sections below, which use scroll-into-view via SectionViewTracker).
  useEffect(() => {
    if (showAllTrends) trackEvent("trends_view")
  }, [showAllTrends])

  useEffect(() => {
    if (showAllParameters) trackEvent("all_parameters_view")
  }, [showAllParameters])

  if (isBeneficiariesLoading) {
    return (
      <>
        {consentModal}
        <div className="min-h-screen bg-[#f7f9fa]">
        <div className="mx-auto max-w-[420px] bg-white sm:my-8 sm:rounded-2xl sm:shadow-lg">
          <TopNavigationSkeleton />
          <div className="space-y-6 px-4 py-6">
            <ProfileCardSkeleton />
            {/* Card grid shimmer fills the remaining height while beneficiaries load */}
            <HealthSummaryCardsSkeleton />
          </div>
          <Footer />
        </div>
      </div>
      </>
    )
  }

  if (globalError) {
    const isUnauthorized = globalError.type === "UNAUTHORIZED"
    const isTimeout = globalError.type === "TIMEOUT"

    return (
      <>
        {consentModal}
        <div className="flex min-h-screen items-center justify-center bg-[#f7f9fa] p-4">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">{isUnauthorized ? "🔒" : isTimeout ? "⏱️" : "⚠️"}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isUnauthorized ? "Authentication Required" : isTimeout ? "Request Timeout" : "Unable to Load Health Data"}
          </h2>
          <p className="text-gray-600 mb-6">{globalError.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-500 px-6 py-3 text-white font-medium hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
      </>
    )
  }

  // App-level access gate. For the restricted org (pmEntityId 1006639) only
  // emails on the API allowlist may use the app; everyone else from that org
  // sees a "feature coming soon" screen. Any other org is unrestricted. The
  // decision is resolved in the load effect (fail closed on API errors), so by
  // the time beneficiaries have loaded, `appAccessAllowed` is populated.
  if (appAccessAllowed === false) {
    return <FeatureComingSoon />
  }

  const activeBeneficiary = beneficiaries[activeBeneficiaryIndex]
  const rawProfileData = activeBeneficiary ? beneficiaryReports.get(activeBeneficiary.uid) : null
  // Ensure patient_info.gender/age is populated from the active beneficiary
  // (reliable + available early). The report's own patient_info.gender is often
  // "Unknown"/empty, which would make sex-specific bands (e.g. female HDL)
  // silently fall back to the male cutoffs. This is the single source of truth
  // consumed by every section (health summary, digital twin, parameters, etc.).
  const currentProfileData =
    rawProfileData && activeBeneficiary
      ? {
          ...rawProfileData,
          patient_info: {
            ...rawProfileData.patient_info,
            gender:
              activeBeneficiary.gender && activeBeneficiary.gender !== "Unknown"
                ? activeBeneficiary.gender
                : rawProfileData.patient_info?.gender,
            age: activeBeneficiary.age || rawProfileData.patient_info?.age,
          },
        }
      : rawProfileData
  const isReportLoading = currentProfileData?.isLoading ?? true
  const currentBeneficiaryError = activeBeneficiary ? beneficiaryErrors.get(activeBeneficiary.uid) : undefined
  // A beneficiary "has records" if the profile reported lab report URLs
  // (reportCount) OR we already resolved doc IDs. Driven by the profile count so
  // the loading skeleton shows immediately instead of flashing an empty state.
  const hasRecordsToLoad =
    ((activeBeneficiary?.reportCount ?? activeBeneficiary?.dmS_Doc_ID?.length) || 0) > 0
  // True while a lazily-selected beneficiary's reports are still being fetched
  // (their profile report count may be 0 until the reports API responds), so we
  // show the skeleton instead of momentarily flashing the empty state.
  const isLazyPending = activeBeneficiary ? lazyPending.has(activeBeneficiary.uid) : false

  // Per-report summaries (newest first) backing the Health Summary dropdown.
  const summariesByDate: Array<{ dateKey: string; reportName?: string; health_summary: any[] }> =
    currentProfileData?.health_summary_by_date && currentProfileData.health_summary_by_date.length > 0
      ? currentProfileData.health_summary_by_date
      : []
  // Clamp so a stale index can never point past a shorter list after switching.
  const safeSummaryIndex = Math.min(selectedSummaryIndex, Math.max(0, summariesByDate.length - 1))
  // The summary the twin should render. Undefined when there's no by-date list,
  // which makes the twin fall back to its default latest-merged behaviour.
  const selectedHealthSummary =
    summariesByDate.length > 0 ? summariesByDate[safeSummaryIndex]?.health_summary || [] : undefined

  const familyMembers = beneficiaries.map((b) => {
    const report = beneficiaryReports.get(b.uid)
    // Prefer the beneficiary's own gender/age (reliable + available early) and
    // fall back to the loaded report. Derive the avatar from that gender so a
    // female never defaults to the male image.
    const memberGender = b.gender || report?.patient_info?.gender || "Unknown"
    // The report's profileImage is itself just a default gender SVG, so only let
    // a *real* uploaded photo override the reliable gender-based avatar —
    // otherwise a stale/default male SVG would mask a female (and vice versa).
    const reportImage = report?.patient_info?.profileImage
    const isDefaultReportImage =
      !reportImage || reportImage.includes("profile-male.svg") || reportImage.includes("profile-female.svg")
    return {
      uid: b.uid,
      name: b.patientName,
      initial: b.patientName.charAt(0).toUpperCase(),
      age: b.age || report?.patient_info?.age || 0,
      gender: memberGender,
      image: isDefaultReportImage ? genderAvatar(memberGender) : reportImage,
      relation: b.relation,
    }
  })

  const activeMember = familyMembers[activeBeneficiaryIndex]
  const hasReports = (currentProfileData?.reports?.length || 0) > 0
  const hasTrends = (currentProfileData?.trend_analysis?.length || 0) > 0
  // A report-details response can come back "Completed" but empty (report_data
  // null, parameters [], health_summary []). In that case hasReports is still
  // true, so guard on whether there is any actually usable data before rendering
  // the data sections — otherwise show a fallback instead of blank sections.
  const hasUsableData =
    (currentProfileData?.health_summary?.length || 0) > 0 ||
    (currentProfileData?.reports?.some((r) => Object.keys(r.parameters || {}).length > 0) ?? false)
  // Whether this beneficiary's report load has fully settled (see the
  // completedBeneficiaries state comment). Used to distinguish "still loading"
  // from "loaded but the analysis returned no usable data".
  const isLoadComplete = activeBeneficiary ? completedBeneficiaries.has(activeBeneficiary.uid) : false

  if (showAllTrends && currentProfileData) {
    return (
      <AllTrendsPage
        patientData={currentProfileData}
        onBack={() => setShowAllTrends(false)}
        onViewReport={(date) => {
          setPendingReportDate(date)
          setShowAllTrends(false)
        }}
      />
    )
  }

  if (showAllParameters && currentProfileData) {
    return <AllParametersPage patientData={currentProfileData} onBack={() => setShowAllParameters(false)} />
  }

  return (
    <>
      {consentModal}
      {/* Floating "Report a problem" button pinned to the bottom of the app column. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[420px] justify-end px-4 pb-5">
        <div className="pointer-events-auto">
              <ReportProblemButton
                floating
                vasbenefId={activeBeneficiary?.rVasBenefId}
                emailId={pickPrimaryEmail(userEmail)}
              />
        </div>
      </div>
      <div className="min-h-screen bg-[#f7f9fa]">
      <div className="mx-auto max-w-[420px] bg-white sm:my-8 sm:rounded-2xl sm:shadow-lg">
        <TopNavigation
          familyMembers={familyMembers}
          activeFamily={activeBeneficiary?.uid || ""}
          setActiveFamily={handleBeneficiaryChange}
        />
        <div className="space-y-6 px-4 py-6">
          <ProfileCard
            name={activeMember?.name || "Unknown"}
            age={activeBeneficiary?.age || 0}
            gender={activeBeneficiary?.gender || "Unknown"}
            initial={activeMember?.initial || "U"}
            reportCount={
              // Show the per-report count (all_reports) so every report with
              // data is counted separately, even multiple on the same day. This
              // matches the Test Reports list and the Health Summary dropdown.
              // While reports are still resolving the count is hidden (see
              // countLoading) so the user never sees intermediate values.
              //
              // Once the reports HAVE resolved, the resolved count is authoritative
              // even when it is 0. A `||` fallback chain was wrong here: a
              // legitimate 0 is falsy, so it fell through to the RAW profile
              // record count and a member whose reports all came back
              // unanalyzable (status Not_Found) showed e.g. "2 Health Records"
              // directly above a "Report Details Unavailable" empty state.
              currentProfileData
                ? (currentProfileData.all_reports?.length ?? currentProfileData.lab_reports?.length ?? 0)
                : activeBeneficiary?.reportCount || activeBeneficiary?.dmS_Doc_ID?.length || 0
            }
            countLoading={(hasRecordsToLoad || isLazyPending) && !isLoadComplete}
            profileImage={currentProfileData?.patient_info?.profileImage || ""}
            bloodGroup={currentProfileData?.patient_info?.blood_group}
            height={currentProfileData?.patient_info?.height}
            weight={currentProfileData?.patient_info?.weight}
            abhaId={currentProfileData?.patient_info?.abha_id}
            relation={currentProfileData?.patient_info?.relation}
          />

          {/* Temporarily hidden — will be re-enabled later.
              Keep the import and component so this can be restored by simply
              uncommenting this line. */}
          {/* <UploadReportSection /> */}

          {/* Records exist but the load hasn't settled yet — show skeleton
              immediately (no "no records" flash) until data, a fallback, or an
              error arrives. */}
          {!currentBeneficiaryError && !hasUsableData && !isLoadComplete && (hasRecordsToLoad || isLazyPending) && (
            <HealthSummarySkeleton />
          )}

          {/* Genuinely no records for this beneficiary. */}
          {!hasRecordsToLoad && currentBeneficiaryError && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center">
              <div className="mb-3 text-4xl">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lab Reports Available</h3>
              <p className="text-gray-600 text-sm mb-4">{currentBeneficiaryError.message}</p>
            </div>
          )}

          {/* Records exist but loading failed — offer a retry. */}
          {hasRecordsToLoad && !hasReports && currentBeneficiaryError && currentBeneficiaryError.type !== "NO_REPORTS" && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center">
              <div className="mb-3 text-4xl">{currentBeneficiaryError.type === "TIMEOUT" ? "⏱️" : "⚠️"}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {currentBeneficiaryError.type === "TIMEOUT" ? "Request Timeout" : "Unable to Load Reports"}
              </h3>
              <p className="text-gray-600 text-sm mb-4">{currentBeneficiaryError.message}</p>
              <button
                onClick={() => retryLoadReport(activeBeneficiary?.uid || "")}
                className="rounded-lg bg-[#156ddc] px-5 py-2 text-white text-sm font-medium hover:bg-[#1259b8] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Confirmed empty (no records and no records to load). */}
          {!hasRecordsToLoad && !isLazyPending && !currentBeneficiaryError && <EmptyState />}

          {/* Report(s) resolved but the analysis came back empty (report_data
              null, no parameters, no health summary) — show a fallback instead
              of blank sections or an endless skeleton. */}
          {!currentBeneficiaryError && hasRecordsToLoad && isLoadComplete && !hasUsableData && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center">
              <div className="mb-3 text-4xl">📄</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Details Unavailable</h3>
              <p className="text-gray-600 text-sm">
                {"We couldn't extract health insights from this report yet. It may still be processing or in a format we can't read. Please check back later."}
              </p>
            </div>
          )}

          {!currentBeneficiaryError && hasReports && hasUsableData && currentProfileData && (
            <>
                {/* Health Risk Score is shown only for the Self profile, not for
                    other family beneficiaries. App-wide access (including this
                    section) is gated earlier for restricted orgs. */}
                {activeBeneficiary?.relation?.toLowerCase() === "self" && (
                  <HealthScoreSection
                    patientData={currentProfileData}
                    vasbenefId={activeBeneficiary?.rVasBenefId}
                    requestIds={activeBeneficiary ? scoreRequestIds.get(activeBeneficiary.uid) : undefined}
                    accessToken={accessToken}
                    gender={activeBeneficiary?.gender || currentProfileData?.patient_info?.gender}
                    age={activeBeneficiary?.age || currentProfileData?.patient_info?.age}
                    reportsLoading={!isLoadComplete}
                  />
                )}
              <SectionViewTracker section="summary">
                      <HealthSummarySection
                        patientData={currentProfileData}
                        vasbenefId={activeBeneficiary?.rVasBenefId}
                        selectedDateIndex={safeSummaryIndex}
                        onSelectedDateIndexChange={setSelectedSummaryIndex}
                      />
                    </SectionViewTracker>
                    <SectionViewTracker section="digital_twin">
                      <InsightsSection
                        patientData={currentProfileData}
                        vasbenefId={activeBeneficiary?.rVasBenefId}
                        healthSummaryOverride={selectedHealthSummary}
                      />
              </SectionViewTracker>
              {/* WhatNextSection (Recommended For You) hidden per requirement */}
              {hasTrends && (
                <SectionViewTracker section="trends">
                  <TrendsSection
                    onViewAll={() => {
                      trackEvent("trends_view_all_click")
                      setShowAllTrends(true)
                    }}
                    patientData={currentProfileData}
                    vasbenefId={activeBeneficiary?.rVasBenefId}
                  />
                </SectionViewTracker>
              )}
              <AllParametersSection
                patientData={currentProfileData}
                onViewAll={() => {
                  trackEvent("all_parameters_view_all_click")
                  setShowAllParameters(true)
                }}
                vasbenefId={activeBeneficiary?.rVasBenefId}
              />
              <HealthRecommendationsSection patientData={currentProfileData} />
              <SectionViewTracker section="reports">
                <TestReportsSection
                  patientData={currentProfileData}
                  scrollToDate={pendingReportDate}
                  onScrollHandled={() => setPendingReportDate(null)}
                />
              </SectionViewTracker>
                <FeedbackSection
                  mbUserId={mbUserId}
                  vasbenefId={activeBeneficiary?.rVasBenefId}
                  pmEntityId={pmEntityId}
                  emailId={pickPrimaryEmail(userEmail)}
                  accessToken={accessToken}
                />
              <div className="mt-4 text-center">
                <span className="text-muted-foreground text-xs font-light">powered by Medibuddy AI</span>
              </div>
            </>
          )}
        </div>
        <Footer />
      </div>
      </div>
    </>
  )
}
