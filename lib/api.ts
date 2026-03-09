// Types for API responses
export interface Beneficiary {
  patientName: string
  relation: string
  visitType: string
  dmS_Doc_ID: string[]
  latestDmsDocIds?: string[]
  rVasBenefId?: string | number
  age?: number
  gender?: string
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
}

export interface LabReport {
  report_name: string[]
  report_date: string
  file_name?: string
  tag?: string
  parameters?: any[]
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
  }>
  health_summary: HealthSummaryItem[]
  trend_analysis?: TrendAnalysisItem[]
  lab_reports?: LabReport[]
  isLoading?: boolean
  isLoadingMetrics?: boolean
  latestReportDate?: string
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
 * Fetch beneficiaries from API
 */
export async function fetchBeneficiaries(accessToken: string, pmEntityId = "0"): Promise<BeneficiariesResponse> {
  const response = await fetch("/api/health/beneficiaries", {
    method: "GET",
    headers: {
      accesstoken: accessToken,
      pmEntityId: pmEntityId,
    },
  })

  if (!response.ok) {
    throw new Error(`Beneficiaries API request failed: ${response.status}`)
  }

  const data = await response.json()

  const responseObj = getValueCaseInsensitive(data, "response")
  if (responseObj) {
    const statusCode = getValueCaseInsensitive(responseObj, "statuscode")
    if (statusCode === "401" || statusCode === 401) {
      throw new Error("UNAUTHORIZED")
    }
  }

  const beneficiaries = getValueCaseInsensitive(data, "beneficiaries") || []
  const mbuserid = getValueCaseInsensitive(data, "userId") || getValueCaseInsensitive(data, "userid") || getValueCaseInsensitive(data, "mbuserid") || ""
  const employee_email = getValueCaseInsensitive(data, "email") || getValueCaseInsensitive(data, "employee_email") || ""

  return {
    beneficiaries: beneficiaries.map((b: any) => ({
      patientName: getValueCaseInsensitive(b, "patientName") || getValueCaseInsensitive(b, "patientname") || "Unknown",
      relation: getValueCaseInsensitive(b, "relation") || "Unknown",
      visitType: getValueCaseInsensitive(b, "visitType") || getValueCaseInsensitive(b, "visittype") || "",
      dmS_Doc_ID: getValueCaseInsensitive(b, "dmS_Doc_ID") || getValueCaseInsensitive(b, "dms_doc_id") || [],
      latestDmsDocIds:
        getValueCaseInsensitive(b, "latestDmsDocIds") || getValueCaseInsensitive(b, "latestdmsdocids") || [],
      rVasBenefId: getValueCaseInsensitive(b, "rVasBenefId") || getValueCaseInsensitive(b, "rvasbenefid"),
      age: Number.parseInt(getValueCaseInsensitive(b, "age") || "0", 10),
      gender: getValueCaseInsensitive(b, "gender") || "Unknown",
    })),
    mbuserid,
    employee_email,
  }
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
 * Check report analysis status from API
 * Returns: { status: "Processing" | "Completed", statusCode: 202 | 200 }
 */
export async function checkReportAnalysisStatus(
  accessToken: string,
  dmsDocId: string,
  rVasBenefId?: string | number,
): Promise<{ status: string; statusCode: number }> {
  const response = await fetch("/api/health/report-analysisv2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accesstoken: accessToken,
    },
    body: JSON.stringify({
      dms_doc_id: dmsDocId,
      rVasBenefId: rVasBenefId,
    }),
  })

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED")
  }

  const data = await response.json()
  const status = getValueCaseInsensitive(data, "status") || "Processing"

  return {
    status,
    statusCode: response.status,
  }
}

/**
 * Retry helper with incremental backoff
 * Retries up to maxRetries times with increasing delay (2s, 4s, 8s)
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
        const delay = Math.pow(2, attempt + 1) * 1000 // 2s, 4s, 8s
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

const fetchReportsThrottle = createThrottle(3)
const trendsThrottle = createThrottle(2)

/**
 * Fetch report metrics from polling API
 */
async function fetchReportMetrics(
  accessToken: string,
  dmsDocId: string,
  rVasBenefId?: string | number,
): Promise<{ status: string; report_metrics: any | null }> {
  await fetchReportsThrottle.acquire()
  try {
    return await withRetry(async () => {
      const response = await fetch("/api/health/fetchreports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accesstoken: accessToken,
        },
        body: JSON.stringify({
          dms_doc_id: dmsDocId,
          rVasBenefId: rVasBenefId,
        }),
      })

      if (response.status === 401) {
        throw new Error("UNAUTHORIZED")
      }

      if (!response.ok) {
        await response.text()
        throw new Error(`Fetch reports API request failed: ${response.status}`)
      }

      const data = await response.json()

      return {
        status: getValueCaseInsensitive(data, "status") || "Processing",
        report_metrics: getValueCaseInsensitive(data, "report_metrics"),
      }
    })
  } finally {
    fetchReportsThrottle.release()
  }
}

/**
 * Transform report metrics to ApiHealthReport format
 */
function transformReportMetrics(data: any): ApiHealthReport {
  const reportMetrics = data.report_metrics || data

  // Check for error responses (case-insensitive)
  const responseObj = getValueCaseInsensitive(reportMetrics, "response")
  if (responseObj) {
    const statusCode = getValueCaseInsensitive(responseObj, "statuscode")
    if (statusCode === "401" || statusCode === 401) {
      throw new Error("UNAUTHORIZED")
    }
    if (statusCode === "404" || statusCode === 404) {
      throw new Error("NO_REPORTS_404")
    }
  }

  // Check patient_info statuscode for 404
  const patientInfo = getValueCaseInsensitive(reportMetrics, "patient_info") || {}
  const patientStatusCode = getValueCaseInsensitive(patientInfo, "statuscode")
  if (patientStatusCode === 404 || patientStatusCode === "404") {
    throw new Error("NO_REPORTS_404")
  }

  const resultArray = getValueCaseInsensitive(reportMetrics, "result") || []
  const parametersArray = getValueCaseInsensitive(reportMetrics, "parameters") || []
  const patientCard = getValueCaseInsensitive(reportMetrics, "patient_card") || {}
  const healthSummaryRaw = getValueCaseInsensitive(reportMetrics, "health_summary") || []

  // Get patient info from result array if available
  const resultInfo = resultArray[0] || {}
  const patientName =
    getValueCaseInsensitive(resultInfo, "patientName") ||
    getValueCaseInsensitive(patientInfo, "name") ||
    getValueCaseInsensitive(patientCard, "name") ||
    "Unknown Patient"

  // Get fullfilmentDate for latest report detection
  const fullfilmentDate = getValueCaseInsensitive(resultInfo, "fullfilmentDate") || ""

  // Get additional details from patient_card
  const additionalDetails = getValueCaseInsensitive(patientCard, "additional_details") || {}
  const bloodGroup =
    getValueCaseInsensitive(additionalDetails, "Blood Group") ||
    getValueCaseInsensitive(patientCard, "blood_group") ||
    ""
  const height =
    getValueCaseInsensitive(additionalDetails, "Height") || getValueCaseInsensitive(patientCard, "height") || ""
  const weight =
    getValueCaseInsensitive(additionalDetails, "Weight") || getValueCaseInsensitive(patientCard, "weight") || ""
  const abhaId =
    getValueCaseInsensitive(additionalDetails, "ABHA ID") || getValueCaseInsensitive(patientCard, "abha_id") || ""

  // Get patient age and gender
  const age = Number.parseInt(
    getValueCaseInsensitive(patientInfo, "age") || getValueCaseInsensitive(patientCard, "age") || "0",
    10,
  )
  const gender =
    getValueCaseInsensitive(patientInfo, "gender") || getValueCaseInsensitive(patientCard, "gender") || "Unknown"

  // Determine profile image based on gender
  const normalizedGender = gender.toLowerCase()
  let profileImage = "/images/profile-indian-male.jpg"
  if (normalizedGender === "female" || normalizedGender === "f") {
    profileImage = "/images/profile-indian-female-1.jpg"
  }

  // Transform parameters
  const transformedParameters: Record<string, any> = {}
  parametersArray.forEach((param: any) => {
    const metricName = getValueCaseInsensitive(param, "metric_name") || getValueCaseInsensitive(param, "name") || ""
    if (metricName) {
      transformedParameters[metricName] = {
        result: getValueCaseInsensitive(param, "value") || getValueCaseInsensitive(param, "result") || "",
        units: getValueCaseInsensitive(param, "unit") || getValueCaseInsensitive(param, "units") || "",
        range: getValueCaseInsensitive(param, "normal_range") || getValueCaseInsensitive(param, "range") || "",
        status: getValueCaseInsensitive(param, "status") || "normal",
      }
    }
  })

  // Transform health summary
  const healthSummary: HealthSummaryItem[] = healthSummaryRaw.map((item: any) => {
    const params = getValueCaseInsensitive(item, "parameters") || []
    let categoryName =
      getValueCaseInsensitive(item, "category") ||
      getValueCaseInsensitive(item, "name") ||
      getValueCaseInsensitive(item, "Category") ||
      getValueCaseInsensitive(item, "Name") ||
      getValueCaseInsensitive(item, "title")

    // Infer category if not provided or is "Unknown"
    if (!categoryName || categoryName === "Unknown") {
      categoryName = inferCategoryFromParameters(params)
    }

    // Count out of range parameters
    let outOfRangeCount = 0
    params.forEach((p: any) => {
      const status = (getValueCaseInsensitive(p, "status") || "").toLowerCase()
      if (status === "abnormal" || status === "high" || status === "low" || status === "out_of_range") {
        outOfRangeCount++
      }
    })

    return {
      category: categoryName,
      status: getValueCaseInsensitive(item, "status") || "normal",
      out_of_range_count: outOfRangeCount,
      parameters: params.map((p: any) => ({
        name: getValueCaseInsensitive(p, "name") || getValueCaseInsensitive(p, "metric_name") || "",
        value: getValueCaseInsensitive(p, "value") || "",
        unit: getValueCaseInsensitive(p, "unit") || "",
        status: getValueCaseInsensitive(p, "status") || "normal",
        normal_range: getValueCaseInsensitive(p, "normal_range") || "",
      })),
    }
  })

  return {
    patient_info: {
      name: patientName,
      age,
      gender,
      profileImage,
      blood_group: bloodGroup,
      height,
      weight,
      abha_id: abhaId,
    },
    reports: [
      {
        name: getValueCaseInsensitive(resultInfo, "documentname") || "Lab Report",
        date: getValueCaseInsensitive(resultInfo, "reportdate") || new Date().toLocaleDateString(),
        parameters: transformedParameters,
        fullfilmentDate,
      },
    ],
    health_summary: healthSummary,
    latestReportDate: fullfilmentDate,
  }
}

/**
 * Fetch report analysis with polling logic
 * Step 1: Check status via /ht/report-analysis
 * Step 2: Poll /ht/fetchreports based on status
 */
export async function fetchReportAnalysis(
  accessToken: string,
  dmsDocId: string,
  rVasBenefId?: string | number,
  onPartialData?: (data: ApiHealthReport) => void,
): Promise<ApiHealthReport> {
  const MAX_POLLING_TIME = 5 * 60 * 1000 // 5 minutes
  const POLLING_INTERVAL = 15 * 1000 // 15 seconds
  const startTime = Date.now()

  // Step 1: Check initial status
  const statusResult = await checkReportAnalysisStatus(accessToken, dmsDocId, rVasBenefId)

  // If initial status is Failed, stop immediately
  if (statusResult.status === "Failed") {
    throw new Error("DOCUMENT_FAILED")
  }

  // Step 2: Poll fetchreports based on status
  const statusCheckSucceeded = statusResult.statusCode === 200
  let pollImmediately = statusCheckSucceeded && statusResult.status === "Completed"
  let isFirstPoll = true
  // If the initial status check itself failed (e.g. 502), skip the delay on the first poll
  // so we immediately try fetchReportMetrics to get the actual status
  const skipFirstDelay = !statusCheckSucceeded

  while (Date.now() - startTime < MAX_POLLING_TIME) {
    // Wait before polling (unless it's the first poll and status is Completed, or status check failed)
    if (!isFirstPoll || (!pollImmediately && !skipFirstDelay)) {
      await new Promise((resolve) => setTimeout(resolve, isFirstPoll && (pollImmediately || skipFirstDelay) ? 0 : POLLING_INTERVAL))
    }
    isFirstPoll = false

    try {
      const pollResult = await fetchReportMetrics(accessToken, dmsDocId, rVasBenefId)
      // If status is Completed and report_metrics is available, transform and return
      if (pollResult.status === "Completed" && pollResult.report_metrics) {
        const report = transformReportMetrics(pollResult)
        return report
      }

      // If still processing, continue polling
      if (pollResult.status === "Processing") {
        // If we got Processing status, wait 15 seconds before next poll
        pollImmediately = false
        continue
      }

      // If status is Failed, stop polling immediately
      if (pollResult.status === "Failed") {
        throw new Error("DOCUMENT_FAILED")
      }
    } catch (error) {
      // If UNAUTHORIZED, NO_REPORTS_404, or DOCUMENT_FAILED throw immediately
      if (
        error instanceof Error &&
        (error.message === "UNAUTHORIZED" || error.message === "NO_REPORTS_404" || error.message === "DOCUMENT_FAILED")
      ) {
        throw error
      }
      // For other errors, continue polling
    }
  }

  // Polling timeout
  throw new Error("TIMEOUT")
}

/**
 * Fetch trends from API
 */
export async function fetchTrends(
  accessToken: string,
  docIds: string[],
  rVasBenefId?: string | number,
): Promise<TrendsResponse> {
  await trendsThrottle.acquire()
  try {
    const data = await withRetry(async () => {
      const response = await fetch("/api/health/trends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accesstoken: accessToken,
        },
        body: JSON.stringify({
          doc_id: docIds,
          rVasBenefId: rVasBenefId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Trends API request failed: ${response.status}`)
      }

      return await response.json()
    })

    // Check for error responses (case-insensitive)
    const responseObj = getValueCaseInsensitive(data, "response")
    if (responseObj) {
      const statusCode = getValueCaseInsensitive(responseObj, "statuscode")
      if (statusCode === "401" || statusCode === 401) {
        throw new Error("UNAUTHORIZED")
      }
    }

    let trendsData = data
    if (Array.isArray(data) && data.length > 0) {
      trendsData = data[0]
    }

    // Parse trend_analysis from the correct location
    const trendAnalysisRaw = getValueCaseInsensitive(trendsData, "trend_analysis") || []

    const trendAnalysis: TrendAnalysisItem[] = trendAnalysisRaw.map((item: any) => {
      // Get the trends array which contains historical data points
      const trendsArray = getValueCaseInsensitive(item, "trends") || []
      const dataPoints: TrendDataPoint[] = trendsArray.map((t: any) => ({
        date: getValueCaseInsensitive(t, "test_date") || getValueCaseInsensitive(t, "date") || "",
        value: Number.parseFloat(getValueCaseInsensitive(t, "value") || "0"),
        unit: getValueCaseInsensitive(t, "unit") || "",
      }))

      return {
        metric_name: getValueCaseInsensitive(item, "metric_name") || "",
        change_percentage: getValueCaseInsensitive(item, "change_percentage") || "0%",
        trend: getValueCaseInsensitive(item, "trend") || "stable",
        normal_range: getValueCaseInsensitive(item, "normal_range") || "",
        status: getValueCaseInsensitive(item, "status") || "normal",
        data_points: dataPoints,
      }
    })

    // Parse lab_reports
    const labReportsRaw = getValueCaseInsensitive(trendsData, "lab_reports") || []
    const labReports: LabReport[] = labReportsRaw.map((report: any) => {
      // Handle report_name as array from API
      const rawReportName = getValueCaseInsensitive(report, "report_name") || getValueCaseInsensitive(report, "name")
      let reportNameArray: string[] = []

      if (Array.isArray(rawReportName)) {
        // Filter out null values and keep only valid strings
        reportNameArray = rawReportName.filter((name: any) => name && typeof name === "string")
      } else if (typeof rawReportName === "string" && rawReportName) {
        reportNameArray = [rawReportName]
      }

      // Default to "Lab Report" if no valid names found
      if (reportNameArray.length === 0) {
        reportNameArray = ["Lab Report"]
      }

      return {
        report_name: reportNameArray,
        report_date: getValueCaseInsensitive(report, "report_date") || getValueCaseInsensitive(report, "date") || "",
        file_name: getValueCaseInsensitive(report, "file_name") || "",
        tag: getValueCaseInsensitive(report, "tag") || "",
        parameters: getValueCaseInsensitive(report, "parameters") || [],
      }
    })

    return {
      trend_analysis: trendAnalysis,
      lab_reports: labReports,
    }
  } finally {
    trendsThrottle.release()
  }
}

/**
 * Create initial profile from beneficiary data
 */
export function createInitialProfileFromBeneficiary(beneficiary: Beneficiary): ApiHealthReport {
  const gender = beneficiary.gender || "Unknown"
  const normalizedGender = gender.toLowerCase()
  let profileImage = "/images/profile-indian-male.jpg"
  if (normalizedGender === "female" || normalizedGender === "f") {
    profileImage = "/images/profile-indian-female-1.jpg"
  }

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
      patient_info: { name: "Unknown", age: 0, gender: "Unknown", profileImage: "/images/profile-indian-male.jpg" },
      reports: [],
      health_summary: [],
    }
  }

  if (reports.length === 1) {
    return reports[0]
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
  const reportsByDate = new Map<string, { name: string; date: string; parameters: Record<string, any>; fullfilmentDate?: string }>()
  
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
      })
    } else {
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

  return {
    patient_info: latestReport.patient_info,
    reports: latestReportData ? [latestReportData, ...otherReports] : otherReports,
    health_summary: mergedHealthSummary,
    trend_analysis: latestReport.trend_analysis,
    lab_reports: latestReport.lab_reports,
    isLoading: latestReport.isLoading,
    isLoadingMetrics: latestReport.isLoadingMetrics,
    latestReportDate: latestReport.latestReportDate || latestReportData?.fullfilmentDate,
  }
}
