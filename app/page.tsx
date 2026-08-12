"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import TopNavigation from "@/components/top-navigation"
import ProfileCard from "@/components/profile-card"
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
import EmptyState from "@/components/empty-state"
import {
  TopNavigationSkeleton,
  ProfileCardSkeleton,
  HealthSummarySkeleton,
  HealthSummaryCardsSkeleton,
} from "@/components/skeletons"
import { initSnowplow, trackHealthTrendsEvent, setSnowplowUserContext, setSelfVasBenefId } from "@/lib/snowplow"
import { sendHotjarEvent } from "@/lib/analytics/analytics"
import { HOTJAR_EVENTS_NAME } from "@/lib/analytics/constants"
import {
  fetchBeneficiaries,
  fetchBeneficiaryReportRequests,
  fetchReportDetailsAsHealthReport,
  buildTrendsFromReports,
  createInitialProfileFromBeneficiary,
  mergeReportsKeepLatest,
  getAccessTokenFromCookie,
  getPmEntityIdFromCookie,
  type ApiHealthReport,
  type Beneficiary,
} from "@/lib/api"

interface BeneficiaryError {
  type: "TIMEOUT" | "GENERAL" | "NO_REPORTS"
  message: string
}

export default function HealthDashboard() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [activeBeneficiaryIndex, setActiveBeneficiaryIndex] = useState(0)
  const [beneficiaryReports, setBeneficiaryReports] = useState<Map<string, ApiHealthReport>>(new Map())
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
  // Consent form temporarily hidden. To re-enable, set the initial value back to false.
  const [hasAcceptedHealthConsent, setHasAcceptedHealthConsent] = useState(true)
  const hasHealthSummaryEventFiredRef = useRef(false)
  const hasTrendsEventFiredRef = useRef(false)
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
  const attachTrendsToReport = useCallback((report: ApiHealthReport): ApiHealthReport => {
    try {
      const { trend_analysis, lab_reports } = buildTrendsFromReports(report.reports || [])
      if (!hasTrendsEventFiredRef.current && trend_analysis.length > 0) {
        hasTrendsEventFiredRef.current = true
        trackHealthTrendsEvent("Trends Graphs Loaded")
      }
      return { ...report, trend_analysis, lab_reports }
    } catch {
      // Trends are non-critical; return the report unchanged on failure.
      return report
    }
  }, [])

  const loadBeneficiaryReport = useCallback(
    async (beneficiary: Beneficiary, token: string) => {
      setBeneficiaryErrors((prev) => {
        const newMap = new Map(prev)
        newMap.delete(beneficiary.patientName)
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
                b.rVasBenefId === beneficiary.rVasBenefId
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

      // mbUserId (account user id) is required by the report-details API.
      const mbUserId = beneficiary.userId ?? ""

      try {
        // Report identifiers are requestIds. The latest report (by date) drives
        // the health summary / digital twin; all reports feed the trends.
        const allDocIds = reportRequests.map((r) => r.requestId)
        const sortedRequests = [...reportRequests].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )
        const latestDocIds = sortedRequests.length > 0 ? [sortedRequests[0].requestId] : []
        const requestDateById = new Map(reportRequests.map((r) => [r.requestId, r.date]))
        // Original report PDF URL per requestId (from the beneficiary reports API),
        // used to offer an "download original report" action in Test Reports.
        const requestFileById = new Map(reportRequests.map((r) => [r.requestId, r.file || ""]))

        if (allDocIds.length === 0) {
          setBeneficiaryErrors((prev) => {
            const newMap = new Map(prev)
            newMap.set(beneficiary.patientName, {
              type: "NO_REPORTS",
              message: "No reports are available",
            })
            return newMap
          })

          setBeneficiaryReports((prev) => {
            const newMap = new Map(prev)
            const existingReport = newMap.get(beneficiary.patientName)
            if (existingReport) {
              newMap.set(beneficiary.patientName, {
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
              newMap.set(beneficiary.patientName, true)
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
            )
            mergedReport.patient_info.relation = beneficiary.relation

            setBeneficiaryReports((prev) => {
              const newMap = new Map(prev)
              newMap.set(beneficiary.patientName, mergedReport)
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
              newMap.set(beneficiary.patientName, false)
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
              mbUserId,
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
                newMap.set(beneficiary.patientName, false)
                return newMap
              })
            }

            // If a latest doc failed, re-merge with remaining successful reports using updated effective IDs
            if (isFailed && loadedReports.length > 0) {
              const mergedReport = attachTrendsToReport(
                mergeReportsKeepLatest(loadedReports, effectiveLatestDocIds, reportDocIdMap),
              )
              mergedReport.patient_info.relation = beneficiary.relation
              setBeneficiaryReports((prev) => {
                const newMap = new Map(prev)
                newMap.set(beneficiary.patientName, mergedReport)
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
        // Build trends from all successful reports (client-side) and attach them.
        const mergedReport = attachTrendsToReport(
          mergeReportsKeepLatest(successfulReports, effectiveLatestDocIdsFinal, finalReportDocIdMap),
        )
        mergedReport.isLoading = false
        mergedReport.patient_info.relation = beneficiary.relation

        setBeneficiaryReports((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.patientName, mergedReport)
          return newMap
        })

        // Ensure loading is stopped
        setHealthSummaryLoading((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.patientName, false)
          return newMap
        })

        // Mark this beneficiary's load as fully settled so the UI can decide
        // between showing data and showing the empty-report fallback.
        setCompletedBeneficiaries((prev) => {
          const next = new Set(prev)
          next.add(beneficiary.patientName)
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

        setBeneficiaryErrors((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.patientName, errorInfo)
          return newMap
        })

        setHealthSummaryLoading((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.patientName, false)
          return newMap
        })

        setBeneficiaryReports((prev) => {
          const newMap = new Map(prev)
          const existingReport = newMap.get(beneficiary.patientName)
          if (existingReport) {
            newMap.set(beneficiary.patientName, {
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
    (beneficiaryName: string) => {
      const beneficiary = beneficiaries.find((b) => b.patientName === beneficiaryName)
      if (beneficiary && accessToken) {
        setBeneficiaryReports((prev) => {
          const newMap = new Map(prev)
          newMap.set(beneficiary.patientName, createInitialProfileFromBeneficiary(beneficiary))
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

        const DEBUG_TOKEN = "6fe8dd1eafc845f8a6b7ed65cc11f8c8"

        let cookieToken: string | null = null
        try {
          cookieToken = getAccessTokenFromCookie()
        } catch (cookieError) {
          cookieToken = null
        }

        // Prefer the real token from the cookie; fall back to the debug token.
        let token = cookieToken || DEBUG_TOKEN

        const pmEntityId = getPmEntityIdFromCookie()

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
        setUserEmail(data.employee_email || "")
        setSnowplowUserContext(data.mbuserid || null, data.employee_email || null)

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
          initialReports.set(b.patientName, initialProfile)
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
          requestedBeneficiariesRef.current.add(selfBeneficiary.patientName)
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

  const handleBeneficiaryChange = (name: string) => {
    const index = beneficiaries.findIndex((b) => b.patientName === name)
    if (index === -1) return
    setActiveBeneficiaryIndex(index)

    // Lazily load this beneficiary's reports the first time they are selected.
    const beneficiary = beneficiaries[index]
    if (beneficiary && accessToken && !requestedBeneficiariesRef.current.has(beneficiary.patientName)) {
      requestedBeneficiariesRef.current.add(beneficiary.patientName)
      // Show the skeleton right away, then clear the pending flag once the load
      // settles (real data or an error takes over the gating from there).
      setLazyPending((prev) => new Set(prev).add(beneficiary.patientName))
      loadBeneficiaryReport(beneficiary, accessToken).finally(() => {
        setLazyPending((prev) => {
          const next = new Set(prev)
          next.delete(beneficiary.patientName)
          return next
        })
      })
    }
  }

  const consentModal = (
    <HealthConsentModal
      open={!hasAcceptedHealthConsent}
      onAgree={() => setHasAcceptedHealthConsent(true)}
    />
  )

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

  const activeBeneficiary = beneficiaries[activeBeneficiaryIndex]
  const currentProfileData = activeBeneficiary ? beneficiaryReports.get(activeBeneficiary.patientName) : null
  const isReportLoading = currentProfileData?.isLoading ?? true
  const currentBeneficiaryError = activeBeneficiary ? beneficiaryErrors.get(activeBeneficiary.patientName) : undefined
  // A beneficiary "has records" if the profile reported lab report URLs
  // (reportCount) OR we already resolved doc IDs. Driven by the profile count so
  // the loading skeleton shows immediately instead of flashing an empty state.
  const hasRecordsToLoad =
    ((activeBeneficiary?.reportCount ?? activeBeneficiary?.dmS_Doc_ID?.length) || 0) > 0
  // True while a lazily-selected beneficiary's reports are still being fetched
  // (their profile report count may be 0 until the reports API responds), so we
  // show the skeleton instead of momentarily flashing the empty state.
  const isLazyPending = activeBeneficiary ? lazyPending.has(activeBeneficiary.patientName) : false

  const familyMembers = beneficiaries.map((b) => {
    const report = beneficiaryReports.get(b.patientName)
    return {
      name: b.patientName,
      initial: b.patientName.charAt(0).toUpperCase(),
      age: report?.patient_info?.age || 0,
      gender: report?.patient_info?.gender || "Unknown",
      image: report?.patient_info?.profileImage || "/images/profile-male.svg",
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
  const isLoadComplete = activeBeneficiary ? completedBeneficiaries.has(activeBeneficiary.patientName) : false

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
      <div className="min-h-screen bg-[#f7f9fa]">
      <div className="mx-auto max-w-[420px] bg-white sm:my-8 sm:rounded-2xl sm:shadow-lg">
        <TopNavigation
          familyMembers={familyMembers}
          activeFamily={activeBeneficiary?.patientName || ""}
          setActiveFamily={handleBeneficiaryChange}
        />
        <div className="space-y-6 px-4 py-6">
          <ProfileCard
            name={activeMember?.name || "Unknown"}
            age={activeBeneficiary?.age || 0}
            gender={activeBeneficiary?.gender || "Unknown"}
            initial={activeMember?.initial || "U"}
            reportCount={activeBeneficiary?.reportCount ?? activeBeneficiary?.dmS_Doc_ID?.length ?? 0}
            profileImage={currentProfileData?.patient_info?.profileImage || "/images/profile-male.svg"}
            bloodGroup={currentProfileData?.patient_info?.blood_group}
            height={currentProfileData?.patient_info?.height}
            weight={currentProfileData?.patient_info?.weight}
            abhaId={currentProfileData?.patient_info?.abha_id}
            relation={currentProfileData?.patient_info?.relation}
          />

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
                onClick={() => retryLoadReport(activeBeneficiary?.patientName || "")}
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
              <HealthScoreSection patientData={currentProfileData} />
              <HealthSummarySection patientData={currentProfileData} />
              <InsightsSection patientData={currentProfileData} vasbenefId={activeBeneficiary?.rVasBenefId} />
              {/* WhatNextSection (Recommended For You) hidden per requirement */}
              {hasTrends && <TrendsSection onViewAll={() => setShowAllTrends(true)} patientData={currentProfileData} vasbenefId={activeBeneficiary?.rVasBenefId} />}
              <AllParametersSection patientData={currentProfileData} onViewAll={() => setShowAllParameters(true)} vasbenefId={activeBeneficiary?.rVasBenefId} />
              <HealthRecommendationsSection patientData={currentProfileData} />
              <TestReportsSection
                patientData={currentProfileData}
                scrollToDate={pendingReportDate}
                onScrollHandled={() => setPendingReportDate(null)}
              />
                <FeedbackSection vasbenefId={activeBeneficiary?.rVasBenefId} emailId={userEmail} />
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
