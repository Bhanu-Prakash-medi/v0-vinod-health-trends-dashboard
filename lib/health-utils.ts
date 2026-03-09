// Helper function to determine if a parameter is within normal range
export function getParameterStatus(result: number, rangeStr: string): "normal" | "abnormal" {
  // Parse range string like "13.0 - 17.0" or "< 200" or "> 40"
  if (rangeStr.includes("-")) {
    const [min, max] = rangeStr.split("-").map((s) => Number.parseFloat(s.trim()))
    return result >= min && result <= max ? "normal" : "abnormal"
  } else if (rangeStr.startsWith("<")) {
    const max = Number.parseFloat(rangeStr.replace("<", "").trim())
    return result < max ? "normal" : "abnormal"
  } else if (rangeStr.startsWith(">")) {
    const min = Number.parseFloat(rangeStr.replace(">", "").trim())
    return result > min ? "normal" : "abnormal"
  } else if (rangeStr.toLowerCase().includes("upto")) {
    const max = Number.parseFloat(rangeStr.toLowerCase().replace("upto", "").trim())
    return result <= max ? "normal" : "abnormal"
  }
  return "normal"
}

// Helper to calculate position on scale
export function calculatePosition(result: number, rangeStr: string): number {
  if (rangeStr.includes("-")) {
    const [min, max] = rangeStr.split("-").map((s) => Number.parseFloat(s.trim()))
    const position = ((result - min) / (max - min)) * 100
    return Math.max(0, Math.min(100, position))
  }
  return 50 // Default middle position
}

export function getTrendData(patientProfile: any) {
  const latestReport = patientProfile.reports[0]
  const previousReport = patientProfile.reports[1]

  if (!latestReport || !previousReport) {
    return []
  }

  const trendParameters: Array<{
    name: string
    unit: string
    range: string
    data: Array<{ date: string; value: number }>
    current: number
    previous: number
    change: number
    changePercent: number
    status: "normal" | "abnormal"
  }> = []

  // Get common parameters between both reports
  Object.keys(latestReport.parameters).forEach((paramName) => {
    if (previousReport.parameters[paramName as keyof typeof previousReport.parameters]) {
      const latest = latestReport.parameters[paramName as keyof typeof latestReport.parameters]
      const previous = previousReport.parameters[paramName as keyof typeof previousReport.parameters]

      if (latest && previous) {
        const change = latest.result - previous.result
        const changePercent = ((change / previous.result) * 100).toFixed(1)

        trendParameters.push({
          name: paramName,
          unit: latest.units,
          range: latest.range,
          data: [
            { date: previousReport.date, value: previous.result },
            { date: latestReport.date, value: latest.result },
          ],
          current: latest.result,
          previous: previous.result,
          change: Number.parseFloat(change.toFixed(2)),
          changePercent: Number.parseFloat(changePercent),
          status: getParameterStatus(latest.result, latest.range),
        })
      }
    }
  })

  return trendParameters
}
