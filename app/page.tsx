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
import AllTrendsPage from "@/components/all-trends-page"
import EmptyState from "@/components/empty-state"
import { TopNavigationSkeleton, ProfileCardSkeleton, HealthSummarySkeleton } from "@/components/skeletons"
import { initSnowplow, trackHealthTrendsEvent, setSnowplowUserContext, setSelfVasBenefId } from "@/lib/snowplow"
import { sendHotjarEvent } from "@/lib/analytics/analytics"
import { HOTJAR_EVENTS_NAME } from "@/lib/analytics/constants"
import {
  fetchBeneficiaries,
  fetchReportAnalysis,
  fetchTrends,
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
  const [showAllParameters, setShowAllParameters] = useState(false)
  const [showAllTrends, setShowAllTrends] = useState(false)
  const [isBeneficiariesLoading, setIsBeneficiariesLoading] = useState(true)
  const [globalError, setGlobalError] = useState<{ type: string; message: string } | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const hasHealthSummaryEventFiredRef = useRef(false)
  const hasTrendsEventFiredRef = useRef(false)

  const loadBeneficiaryTrends = useCallback(async (beneficiary: Beneficiary, token: string) => {
    try {
      const allDocIds = beneficiary.dmS_Doc_ID || []
      if (allDocIds.length === 0) return

      const trendsData = await fetchTrends(token, allDocIds, beneficiary.rVasBenefId)

      setBeneficiaryReports((prev) => {
        const newMap = new Map(prev)
        const existingReport = newMap.get(beneficiary.patientName)
        if (existingReport) {
          newMap.set(beneficiary.patientName, {
            ...existingReport,
            trend_analysis: trendsData.trend_analysis,
            lab_reports: trendsData.lab_reports,
          })
        }
        return newMap
      })
      if (!hasTrendsEventFiredRef.current) {
        hasTrendsEventFiredRef.current = true
        trackHealthTrendsEvent("Trends Graphs Loaded")
      }
    } catch (err) {
      // Silently handle trends loading errors - trends are non-critical
    }
  }, [])

  const loadBeneficiaryReport = useCallback(
    async (beneficiary: Beneficiary, token: string) => {
      setBeneficiaryErrors((prev) => {
        const newMap = new Map(prev)
        newMap.delete(beneficiary.patientName)
        return newMap
      })

      const hasRecords = (beneficiary.dmS_Doc_ID?.length || 0) > 0

      try {
        const allDocIds = beneficiary.dmS_Doc_ID || []
        const latestDocIds = beneficiary.latestDmsDocIds || []

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
        let hasTrendsBeenTriggered = false
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
            const mergedReport = mergeReportsKeepLatest(loadedReports, effectiveLatestDocIds, reportDocIdMap)
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

        // Launch all report fetches asynchronously
        const reportPromises = allDocIds.map(async (docId) => {
          try {
            // Show loader after the first API call is triggered (confirms user has dmS_Doc_ID)
            showLoaderOnFirstApiCall()
            const report = await fetchReportAnalysis(token, docId, beneficiary.rVasBenefId)
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
              const mergedReport = mergeReportsKeepLatest(loadedReports, effectiveLatestDocIds, reportDocIdMap)
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
        const mergedReport = mergeReportsKeepLatest(successfulReports, effectiveLatestDocIdsFinal, finalReportDocIdMap)
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

        // Fire Health Summary Loaded once (self user only) after all reports are merged
        if (!hasHealthSummaryEventFiredRef.current) {
          hasHealthSummaryEventFiredRef.current = true
          trackHealthTrendsEvent("Health Summary Loaded")
        }

        // Trigger trends API after all reports are processed (regardless of individual failures)
        // Trends uses allDocIds from beneficiary directly, not report analysis results
        await loadBeneficiaryTrends(beneficiary, token)
      } catch (err) {
        // Even if report loading fails, still try to load trends for this beneficiary
        // Trends API is independent and may still return useful data
        loadBeneficiaryTrends(beneficiary, token).catch(() => { })


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
    [loadBeneficiaryTrends],
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

  useEffect(() => {
    let isMounted = true

    async function loadBeneficiariesData() {
      try {
        setIsBeneficiariesLoading(true)
        setGlobalError(null)

        let token: string | null = null
        try {
          token = getAccessTokenFromCookie()
        } catch (cookieError) {
          token = "e83bbb3b055a474eabf9083524bf02b4"
        }

        // Use debug token if cookie token not available
        if (!token) {
          token = null
        }

        setAccessToken(token)

        const pmEntityId = getPmEntityIdFromCookie()

        const data = await fetchBeneficiaries(token, pmEntityId)

        if (!isMounted) return

        if (!data.beneficiaries || data.beneficiaries.length === 0) {
          throw new Error("No beneficiaries found")
        }

        setBeneficiaries(data.beneficiaries)
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

        // Load self beneficiary first and await completion (reports + trends)
        // before starting others, to ensure self profile gets full priority
        const selfBeneficiary = sortedBeneficiaries[0]
        if (selfBeneficiary) {
          await loadBeneficiaryReport(selfBeneficiary, token)
          if (selfBeneficiary.dmS_Doc_ID.length == 0) {
            trackHealthTrendsEvent("No Reports Available")
          }
        }

        // Then load remaining beneficiaries concurrently
        sortedBeneficiaries.slice(1).forEach((b) => {
          loadBeneficiaryReport(b, token)
        })
      } catch (err) {
        trackHealthTrendsEvent("Failed to Login")
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
    if (index !== -1) {
      setActiveBeneficiaryIndex(index)
    }
  }

  if (isBeneficiariesLoading) {
    return (
      <div className="min-h-screen bg-[#f7f9fa]">
        <div className="mx-auto max-w-[420px] bg-white sm:my-8 sm:rounded-2xl sm:shadow-lg">
          <TopNavigationSkeleton />
          <div className="space-y-6 px-4 py-6">
            <ProfileCardSkeleton />
            {/* Don't show HealthSummarySkeleton here - wait for beneficiaries API to confirm dmS_Doc_ID */}
          </div>
          <Footer />
        </div>
      </div>
    )
  }

  if (globalError) {
    const isUnauthorized = globalError.type === "UNAUTHORIZED"
    const isTimeout = globalError.type === "TIMEOUT"

    return (
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
    )
  }

  const activeBeneficiary = beneficiaries[activeBeneficiaryIndex]
  const currentProfileData = activeBeneficiary ? beneficiaryReports.get(activeBeneficiary.patientName) : null
  const isReportLoading = currentProfileData?.isLoading ?? true
  const currentBeneficiaryError = activeBeneficiary ? beneficiaryErrors.get(activeBeneficiary.patientName) : undefined
  const hasRecordsToLoad = (activeBeneficiary?.dmS_Doc_ID?.length || 0) > 0
  const isHealthSummaryLoading = activeBeneficiary
    ? (healthSummaryLoading.get(activeBeneficiary.patientName) ?? false)
    : false

  const familyMembers = beneficiaries.map((b) => {
    const report = beneficiaryReports.get(b.patientName)
    return {
      name: b.patientName,
      initial: b.patientName.charAt(0).toUpperCase(),
      age: report?.patient_info?.age || 0,
      gender: report?.patient_info?.gender || "Unknown",
      image: report?.patient_info?.profileImage || "/images/profile-indian-male.jpg",
      relation: b.relation,
    }
  })

  const activeMember = familyMembers[activeBeneficiaryIndex]
  const hasReports = (currentProfileData?.reports?.length || 0) > 0
  const hasTrends = (currentProfileData?.trend_analysis?.length || 0) > 0

  if (showAllTrends && currentProfileData) {
    return <AllTrendsPage patientData={currentProfileData} onBack={() => setShowAllTrends(false)} />
  }

  if (showAllParameters && currentProfileData) {
    return <AllParametersPage patientData={currentProfileData} onBack={() => setShowAllParameters(false)} />
  }

  return (
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
            reportCount={activeBeneficiary?.dmS_Doc_ID?.length || 0}
            profileImage={currentProfileData?.patient_info?.profileImage || "/images/profile-indian-male.jpg"}
            bloodGroup={currentProfileData?.patient_info?.blood_group}
            height={currentProfileData?.patient_info?.height}
            weight={currentProfileData?.patient_info?.weight}
            abhaId={currentProfileData?.patient_info?.abha_id}
            relation={currentProfileData?.patient_info?.relation}
          />

          {hasRecordsToLoad && isHealthSummaryLoading && <HealthSummarySkeleton />}

          {!hasRecordsToLoad && currentBeneficiaryError && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center">
              <div className="mb-3 text-4xl">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lab Reports Available</h3>
              <p className="text-gray-600 text-sm mb-4">{currentBeneficiaryError.message}</p>
            </div>
          )}

          {hasRecordsToLoad && !isHealthSummaryLoading && currentBeneficiaryError && (
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

          {!isHealthSummaryLoading && !currentBeneficiaryError && !hasReports && <EmptyState />}

          {!isHealthSummaryLoading && !currentBeneficiaryError && hasReports && currentProfileData && (
            <>
              <HealthSummarySection patientData={currentProfileData} />
              <InsightsSection patientData={currentProfileData} vasbenefId={activeBeneficiary?.rVasBenefId} />
              {/* WhatNextSection (Recommended For You) hidden per requirement */}
              {hasTrends && <TrendsSection onViewAll={() => setShowAllTrends(true)} patientData={currentProfileData} vasbenefId={activeBeneficiary?.rVasBenefId} />}
              <AllParametersSection patientData={currentProfileData} onViewAll={() => setShowAllParameters(true)} vasbenefId={activeBeneficiary?.rVasBenefId} />
              <TestReportsSection patientData={currentProfileData} />
            </>
          )}
        </div>
        <Footer />
      </div>
    </div>
  )
}
