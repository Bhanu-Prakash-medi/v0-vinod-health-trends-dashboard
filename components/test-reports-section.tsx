"use client"

import { Folder, Star, FileText, X, Clock, ChevronDown, AlertTriangle, Download } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"
import BiomarkerInfoButton from "@/components/biomarker-info-button"

interface TestReportsSectionProps {
  patientData: any
  scrollToDate?: string | null
  onScrollHandled?: () => void
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  return dateStr
}

// Normalize various date string formats to a comparable YYYY-MM-DD key
function normalizeDateKey(dateStr: string): string | null {
  if (!dateStr) return null
  const cleaned = dateStr.trim().replace(/\//g, "-")
  const parts = cleaned.split("-")
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const [y, m, d] = parts
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
    }
    const [d, m, y] = parts
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  const dt = new Date(dateStr)
  if (!isNaN(dt.getTime())) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
  }
  return null
}

function isLatestReportTag(tag: string) {
  const normalizedTag = (tag || "").toLowerCase().replace(/[_\s]/g, "")
  return normalizedTag === "latestreport" || normalizedTag === "latest"
}

function getReportNames(reportName: any): string[] {
  if (Array.isArray(reportName)) {
    return reportName.filter((name) => name && typeof name === "string")
  }
  if (typeof reportName === "string" && reportName) {
    return [reportName]
  }
  return ["Lab Report"]
}

interface NormalizedParam {
  name: string
  value: string
  unit: string
  range: string
  isAbnormal: boolean
}

// The report `parameters` come in two shapes: an array of metric objects or a
// keyed object. Flatten both into a single list so the report view can render
// one responsive layout (stacked cards on mobile, table on desktop).
function normalizeParameters(parameters: any): NormalizedParam[] {
  if (!parameters) return []
  const toParam = (name: string, value: any, unit: any, range: any, status: any): NormalizedParam => ({
    name,
    value: value != null ? String(value) : "",
    unit: unit != null ? String(unit) : "",
    range: range != null ? String(range) : "",
    isAbnormal: (status || "").toLowerCase() !== "normal",
  })
  if (Array.isArray(parameters)) {
    return parameters.map((p: any) =>
      toParam(p.metric_name || p.name || "", p.value ?? p.result, p.unit ?? p.units, p.normal_range ?? p.range, p.status),
    )
  }
  return Object.entries(parameters).map(([name, data]: [string, any]) =>
    toParam(name, data?.result, data?.units, data?.range, data?.status),
  )
}

export default function TestReportsSection({ patientData, scrollToDate, onScrollHandled }: TestReportsSectionProps) {
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [selectedReportIndex, setSelectedReportIndex] = useState(0)
  const [highlightLatest, setHighlightLatest] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [highlightReportIndex, setHighlightReportIndex] = useState<number | null>(null)

  useEffect(() => {
    const handleScrollToLatest = () => {
      const el = document.getElementById("latest-report-card")
      if (!el) return
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      setHighlightLatest(true)
      window.setTimeout(() => setHighlightLatest(false), 2600)
    }
    window.addEventListener("scroll-to-latest-report", handleScrollToLatest)
    return () => window.removeEventListener("scroll-to-latest-report", handleScrollToLatest)
  }, [])

  const labReportsFromApi = patientData?.lab_reports || []
  const healthSummaryFromApi = patientData?.health_summary || []

  // Helper function to get all parameters from health_summary
  const getAllHealthSummaryParams = (): any[] => {
    const params: any[] = []
    const seenNames = new Set<string>()
    
    for (const category of healthSummaryFromApi) {
      const categoryParams = category.parameters || []
      for (const param of categoryParams) {
        const paramName = (param.name || param.metric_name || "").toLowerCase()
        if (paramName && !seenNames.has(paramName)) {
          seenNames.add(paramName)
          params.push({
            metric_name: param.name || param.metric_name,
            value: param.result || param.value,
            unit: param.units || param.unit || "",
            normal_range: param.range || param.normal_range || "",
            status: param.status || "normal",
          })
        }
      }
    }
    return params
  }

  // Merge parameters from trends API with health_summary parameters
  const mergeParameters = (trendsParams: any[]): any[] => {
    const healthParams = getAllHealthSummaryParams()
    const merged: any[] = [...trendsParams]
    const seenNames = new Set<string>()
    
    // Track existing parameter names from trends
    for (const param of trendsParams) {
      const paramName = (param.metric_name || param.name || "").toLowerCase()
      if (paramName) seenNames.add(paramName)
    }
    
    // Add health_summary parameters that don't exist in trends
    for (const param of healthParams) {
      const paramName = (param.metric_name || param.name || "").toLowerCase()
      if (paramName && !seenNames.has(paramName)) {
        seenNames.add(paramName)
        merged.push(param)
      }
    }
    
    return merged
  }

  let reports: any[] = []

  if (labReportsFromApi.length > 0) {
    reports = labReportsFromApi.map((lr: any) => {
      const isLatest = isLatestReportTag(lr.tag || "")
      const baseParams = lr.parameters || []
      
      // For latest report, merge with health_summary parameters to ensure all params are shown
      const parameters = isLatest ? mergeParameters(baseParams) : baseParams
      
      return {
        date: formatDate(lr.report_date || lr.date || ""),
        // report_name is already an array from the API, use getReportNames to validate/filter
        report_names: getReportNames(lr.report_name),
        lab_name: lr.lab_name || "",
        file_name: lr.file_name || "",
        file: lr.file || "",
        tag: lr.tag || "",
        parameters,
      }
    })

    reports.sort((a, b) => {
      const aIsLatest = isLatestReportTag(a.tag)
      const bIsLatest = isLatestReportTag(b.tag)
      if (aIsLatest && !bIsLatest) return -1
      if (!aIsLatest && bIsLatest) return 1
      return 0
    })
  } else {
    const reportsFromData = patientData?.reports || []
    reports = reportsFromData.map((report: any, index: number) => ({
      date: formatDate(report.fullfilmentDate || report.date || ""),
      report_names: getReportNames(report.name),
      lab_name: report.lab_name || "",
      file_name: report.file_name || "",
      file: report.file || "",
      tag: index === 0 ? "Latest_report" : "Historical Report",
      parameters: report.parameters || {},
    }))
  }

  const handleReportClick = (index: number) => {
    setSelectedReportIndex(index)
    setShowPdfViewer(true)
  }

  // Open the original report PDF using the pre-signed URL from the beneficiary
  // reports API. We use a real anchor click (NOT window.open and NOT the
  // `download` attribute):
  //  - The `download` attribute is silently ignored/blocked for cross-origin
  //    S3 URLs on mobile browsers, so the tap did nothing.
  //  - `window.open(..., "noopener")` returns null even on success, and is
  //    commonly blocked inside mobile app WebViews (e.g. the MediBuddy shell),
  //    so the previous fallback navigated the whole app away.
  // A plain <a target="_blank"> link is handled natively by both desktop
  // browsers and mobile WebViews, which reliably opens the PDF externally.
  const handleDownloadReport = (e: React.MouseEvent, fileUrl: string, _fileName: string) => {
    e.stopPropagation()
    if (!fileUrl) return
    const link = document.createElement("a")
    link.href = fileUrl
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const isLatestReport = (tag: string) => {
    return isLatestReportTag(tag)
  }

  useEffect(() => {
    if (!scrollToDate) return
    const key = normalizeDateKey(scrollToDate)
    const targetIndex = reports.findIndex((r: any) => normalizeDateKey(r.date) === key)

    if (targetIndex === -1) {
      onScrollHandled?.()
      return
    }

    // Expand if the target is hidden behind the "View more" collapse
    if (targetIndex >= 3) setIsExpanded(true)

    const targetId = isLatestReportTag(reports[targetIndex].tag)
      ? "latest-report-card"
      : `report-card-${targetIndex}`

    // Retry a few animation frames because the dashboard (and any expansion)
    // may still be rendering right after navigating back from the trends page.
    let attempts = 0
    let rafId = 0
    let highlightTimer = 0

    const tryScroll = () => {
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        setHighlightReportIndex(targetIndex)
        highlightTimer = window.setTimeout(() => setHighlightReportIndex(null), 2600)
        onScrollHandled?.()
        return
      }
      attempts += 1
      if (attempts < 30) {
        rafId = window.requestAnimationFrame(tryScroll)
      } else {
        onScrollHandled?.()
      }
    }

    rafId = window.requestAnimationFrame(tryScroll)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(highlightTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToDate])

  if (reports.length === 0) {
    return null
  }

  return (
    <section>
      {/* Disclaimer */}
      <p className="mb-4 text-muted-foreground text-center italic tracking-wider text-[10px] font-light">
        This is an AI-generated report and may not be fully accurate. Please consult a qualified doctor for medical or clinical advice.
      </p>

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="h-6 w-6 text-[#000000]" />
          <h2 className="text-base font-semibold text-[#2e3742]">Test Reports</h2>
        </div>
      </div>

      {/* Report Cards - Show 3 by default, expand to show all */}
      <div className="flex flex-col gap-4">
        {(isExpanded ? reports : reports.slice(0, 3)).map((report: any, index: number) => (
          <Card
            key={index}
            id={isLatestReport(report.tag) ? "latest-report-card" : `report-card-${index}`}
            className={`overflow-hidden py-0 cursor-pointer scroll-mt-24 border transition-all duration-500 ${
              (isLatestReport(report.tag) && highlightLatest) || highlightReportIndex === index
                ? "border-[#581daf] shadow-lg ring-2 ring-[#581daf] ring-offset-2"
                : "border-[#f0f3f5] hover:border-[#156ddc]"
            }`}
            onClick={() => handleReportClick(index)}
          >
            {/* Thumbnail with gradient */}
            <div className="relative h-16 bg-gradient-to-br from-[#156ddc] to-[#4d96ff]">
              <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />

              {/* Status Badge */}
              <div
                className={`absolute left-3 top-3 flex items-center gap-1 rounded-xl border-[0.5px] px-3 py-1 ${
                  isLatestReport(report.tag) ? "border-[#581daf] bg-[#f6f0fe]" : "border-[#4d5c6f] bg-[#f0f3f5]"
                }`}
              >
                {isLatestReport(report.tag) ? (
                  <Star className="h-3 w-3 text-[#581daf]" />
                ) : (
                  <Clock className="h-3 w-3 text-[#4d5c6f]" />
                )}
                <span
                  className={`text-[10px] font-medium ${
                    isLatestReport(report.tag) ? "text-[#581daf]" : "text-[#4d5c6f]"
                  }`}
                >
                  {isLatestReport(report.tag) ? "Latest Report" : "Historical Report"}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="space-y-1">
                {report.report_names.map((name: string, nameIndex: number) => (
                  <h3 key={nameIndex} className="text-sm font-medium text-[#2e3742]">
                    {name}
                  </h3>
                ))}
              </div>
              <p className="mt-1 text-xs text-[#4d5c6f]">{report.lab_name || "Comprehensive Health Analysis"}</p>

              <div className="my-3 border-t border-[#f0f3f5]" />

              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-[#9dabbd]" />
                  <p className="max-w-[200px] truncate text-xs text-[#9dabbd]">
                    {report.file_name || `Medibuddy_Report_${(report.date || "").replace(/\//g, "_")}.pdf`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-[#9dabbd]">{report.date}</span>
                  {report.file && (
                    <button
                      type="button"
                      onClick={(e) =>
                        handleDownloadReport(
                          e,
                          report.file,
                          report.file_name || `Medibuddy_Report_${(report.date || "").replace(/\//g, "_")}.pdf`,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full text-[#156ddc] transition-colors hover:bg-[#eef4fd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]"
                      aria-label="Download original report"
                      title="Download original report"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* View More / View Less toggle */}
      {reports.length > 3 && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex items-center gap-1 text-sm font-medium text-[#156ddc] transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc] rounded"
            aria-expanded={isExpanded}
          >
            {isExpanded ? "View less" : `View more (${reports.length - 3})`}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfViewer && reports[selectedReportIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={() => setShowPdfViewer(false)}
        >
          <div
            className="relative flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl sm:h-[90vh] sm:rounded-lg sm:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-[#f0f3f5] p-3 bg-white sm:p-4">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-[#156ddc]" />
                <h3 className="truncate text-sm font-semibold text-[#2e3742]">
                  Lab Report - {reports[selectedReportIndex].date}
                </h3>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {reports[selectedReportIndex].file && (
                  <button
                    onClick={(e) =>
                      handleDownloadReport(
                        e,
                        reports[selectedReportIndex].file,
                        reports[selectedReportIndex].file_name ||
                          `Medibuddy_Report_${(reports[selectedReportIndex].date || "").replace(/\//g, "_")}.pdf`,
                      )
                    }
                    className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-[#156ddc] transition-colors hover:bg-[#eef4fd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]"
                    aria-label="Download original report"
                    title="Download original report"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                )}
                <button
                  onClick={() => setShowPdfViewer(false)}
                  className="rounded-full p-2 hover:bg-[#f0f3f5] transition-colors"
                  aria-label="Close report"
                >
                  <X className="h-5 w-5 text-[#4d5c6f]" />
                </button>
              </div>
            </div>

            {/* System-generated disclaimer */}
            <div className="flex flex-col gap-2 border-b border-[#fde9c8] bg-[#fff8ec] px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#c07f1a]" />
                <p className="text-xs leading-relaxed text-[#8a6415]">
                  This report is system generated. If you notice any issues or incorrect values, please report it.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPdfViewer(false)
                  window.dispatchEvent(new CustomEvent("open-feedback-form"))
                }}
                className="shrink-0 self-start whitespace-nowrap rounded-md border border-[#c07f1a] px-3 py-1 text-xs font-medium text-[#8a6415] transition-colors hover:bg-[#fdefd4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c07f1a] sm:self-auto"
              >
                Report a problem
              </button>
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-[#f5f5f5] p-3 sm:p-6">
              <div className="bg-white rounded-lg p-4 sm:p-8 max-w-3xl mx-auto shadow-sm">
                {/* Lab Report Header */}
                <div className="border-b-2 border-[#156ddc] pb-4 mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-[#156ddc] mb-2">MEDIBUDDY LAB REPORT</h1>
                  <div className="space-y-1">
                    {reports[selectedReportIndex].report_names.map((name: string, nameIndex: number) => (
                      <p key={nameIndex} className="text-sm text-[#4d5c6f]">
                        {name}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Patient Information */}
                <div className="grid grid-cols-2 gap-4 mb-6 bg-[#f9fafb] p-4 rounded-lg">
                  <div>
                    <p className="text-xs text-[#9dabbd] mb-1">Patient Name</p>
                    <p className="text-sm font-semibold text-[#2e3742]">{patientData.patient_info?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9dabbd] mb-1">Age / Gender</p>
                    <p className="text-sm font-semibold text-[#2e3742]">
                      {patientData.patient_info?.age || "N/A"} Years / {patientData.patient_info?.gender || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9dabbd] mb-1">Report Type</p>
                    <p className="text-sm font-semibold text-[#2e3742]">
                      {isLatestReport(reports[selectedReportIndex].tag) ? "Latest Report" : "Historical Report"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9dabbd] mb-1">Report Date</p>
                    <p className="text-sm font-semibold text-[#2e3742]">{reports[selectedReportIndex].date}</p>
                  </div>
                </div>

                {/* Test Results Summary */}
                {(() => {
                  const params = normalizeParameters(reports[selectedReportIndex].parameters)
                  if (params.length === 0) return null
                  return (
                    <div className="space-y-4">
                      <h2 className="text-base sm:text-lg font-bold text-[#2e3742] border-b pb-2">Test Results</h2>

                      {/* Mobile: stacked cards (avoids horizontal table overflow) */}
                      <div className="space-y-2 sm:hidden">
                        {params.map((p, idx) => (
                          <div
                            key={idx}
                            className={`rounded-lg border p-3 ${p.isAbnormal ? "border-[#f5c6c2] bg-[#feeceb]" : "border-[#f0f3f5] bg-[#f9fafb]"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="inline-flex min-w-0 items-center gap-1 text-xs font-medium text-[#2e3742]">
                                <span className="break-words">{p.name}</span>
                                <BiomarkerInfoButton name={p.name} />
                              </span>
                              <span
                                className={`shrink-0 whitespace-nowrap text-sm font-semibold ${p.isAbnormal ? "text-red-600" : "text-[#2e3742]"}`}
                              >
                                {p.value}
                                {p.unit ? ` ${p.unit}` : ""}
                              </span>
                            </div>
                            {p.range ? (
                              <p className="mt-1 text-[11px] text-[#9dabbd]">Normal range: {p.range}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {/* Desktop: full table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#f9fafb]">
                            <tr>
                              <th className="text-left p-2 text-xs font-semibold text-[#4d5c6f]">Parameter</th>
                              <th className="text-center p-2 text-xs font-semibold text-[#4d5c6f]">Result</th>
                              <th className="text-center p-2 text-xs font-semibold text-[#4d5c6f]">Unit</th>
                              <th className="text-center p-2 text-xs font-semibold text-[#4d5c6f]">Reference Range</th>
                            </tr>
                          </thead>
                          <tbody>
                            {params.map((p, idx) => (
                              <tr key={idx} className={`border-b ${p.isAbnormal ? "bg-[#feeceb]" : ""}`}>
                                <td className="p-2 text-xs">
                                  <span className="inline-flex items-center gap-1">
                                    {p.name}
                                    <BiomarkerInfoButton name={p.name} />
                                  </span>
                                </td>
                                <td
                                  className={`text-center p-2 text-xs font-semibold ${p.isAbnormal ? "text-red-600" : ""}`}
                                >
                                  {p.value}
                                </td>
                                <td className="text-center p-2 text-xs">{p.unit}</td>
                                <td className="text-center p-2 text-xs">{p.range}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })()}

                {/* Footer Note */}
                <div className="mt-8 pt-4 border-t border-[#f0f3f5]">
                  <p className="text-xs text-[#9dabbd] text-center">
                    This is an electronically generated report and does not require a signature.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
