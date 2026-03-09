"use client"

import { Folder, Star, FileText, X, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useState } from "react"

interface TestReportsSectionProps {
  patientData: any
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  return dateStr
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

export default function TestReportsSection({ patientData }: TestReportsSectionProps) {
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [selectedReportIndex, setSelectedReportIndex] = useState(0)

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
      tag: index === 0 ? "Latest_report" : "Historical Report",
      parameters: report.parameters || {},
    }))
  }

  const handleReportClick = (index: number) => {
    setSelectedReportIndex(index)
    setShowPdfViewer(true)
  }

  const isLatestReport = (tag: string) => {
    return isLatestReportTag(tag)
  }

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

      {/* Report Cards - Show all reports */}
      <div className="flex flex-col gap-4">
        {reports.map((report: any, index: number) => (
          <Card
            key={index}
            className="overflow-hidden border border-[#f0f3f5] py-0 cursor-pointer hover:border-[#156ddc] transition-colors"
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
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#9dabbd]" />
                  <p className="max-w-[200px] truncate text-xs text-[#9dabbd]">
                    {report.file_name || `Medibuddy_Report_${(report.date || "").replace(/\//g, "_")}.pdf`}
                  </p>
                </div>
                <span className="text-xs text-[#9dabbd]">{report.date}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Powered by Medibuddy */}
      <div className="mt-4">
        <span className="text-muted-foreground font-light text-xs">powered by Medibuddy AI </span>
      </div>

      {/* PDF Viewer Modal */}
      {showPdfViewer && reports[selectedReportIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowPdfViewer(false)}
        >
          <div
            className="relative w-full max-w-4xl h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#f0f3f5] p-4 bg-white">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#156ddc]" />
                <h3 className="text-sm font-semibold text-[#2e3742]">
                  Lab Report - {reports[selectedReportIndex].date}
                </h3>
              </div>
              <button
                onClick={() => setShowPdfViewer(false)}
                className="rounded-full p-2 hover:bg-[#f0f3f5] transition-colors"
              >
                <X className="h-5 w-5 text-[#4d5c6f]" />
              </button>
            </div>

            {/* PDF Content */}
            <div className="h-[calc(90vh-65px)] overflow-auto bg-[#f5f5f5] p-6">
              <div className="bg-white rounded-lg p-8 max-w-3xl mx-auto shadow-sm">
                {/* Lab Report Header */}
                <div className="border-b-2 border-[#156ddc] pb-4 mb-6">
                  <h1 className="text-2xl font-bold text-[#156ddc] mb-2">MEDIBUDDY LAB REPORT</h1>
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
                {reports[selectedReportIndex].parameters &&
                  (Array.isArray(reports[selectedReportIndex].parameters)
                    ? reports[selectedReportIndex].parameters.length > 0
                    : Object.keys(reports[selectedReportIndex].parameters).length > 0) && (
                    <div className="space-y-4">
                      <h2 className="text-lg font-bold text-[#2e3742] border-b pb-2">Test Results</h2>
                      <div className="overflow-x-auto">
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
                            {Array.isArray(reports[selectedReportIndex].parameters)
                              ? reports[selectedReportIndex].parameters.map((param: any, idx: number) => {
                                  const isAbnormal = (param.status || "").toLowerCase() !== "normal"
                                  return (
                                    <tr key={idx} className={`border-b ${isAbnormal ? "bg-[#feeceb]" : ""}`}>
                                      <td className="p-2 text-xs">{param.metric_name || param.name || ""}</td>
                                      <td
                                        className={`text-center p-2 text-xs font-semibold ${isAbnormal ? "text-red-600" : ""}`}
                                      >
                                        {param.value || param.result || ""}
                                      </td>
                                      <td className="text-center p-2 text-xs">{param.unit || param.units || ""}</td>
                                      <td className="text-center p-2 text-xs">
                                        {param.normal_range || param.range || ""}
                                      </td>
                                    </tr>
                                  )
                                })
                              : Object.entries(reports[selectedReportIndex].parameters).map(
                                  ([paramName, paramData]: [string, any]) => {
                                    const isAbnormal = (paramData.status || "").toLowerCase() !== "normal"
                                    return (
                                      <tr key={paramName} className={`border-b ${isAbnormal ? "bg-[#feeceb]" : ""}`}>
                                        <td className="p-2 text-xs">{paramName}</td>
                                        <td
                                          className={`text-center p-2 text-xs font-semibold ${isAbnormal ? "text-red-600" : ""}`}
                                        >
                                          {paramData.result}
                                        </td>
                                        <td className="text-center p-2 text-xs">{paramData.units}</td>
                                        <td className="text-center p-2 text-xs">{paramData.range}</td>
                                      </tr>
                                    )
                                  },
                                )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

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
