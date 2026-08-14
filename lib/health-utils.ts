// Normalize any gender-ish input to "male" | "female" | null, tolerating
// casing, whitespace, and common variants (m/f, man/woman, girl/boy, etc.).
// This is the single source of truth used for both avatars and benchmarks so
// a female never falls through to the male default.
export function normalizeGender(gender?: string | null): "male" | "female" | null {
  const g = (gender || "").trim().toLowerCase()
  if (!g || g === "unknown") return null
  if (g === "f" || g.startsWith("female") || g.startsWith("woman") || g === "girl" || g === "w") return "female"
  if (g === "m" || g.startsWith("male") || g.startsWith("man") || g === "boy") return "male"
  return null
}

// Pick the correct avatar strictly from gender. Female -> female avatar;
// everything else (male / unknown / empty) -> male avatar.
export function genderAvatar(gender?: string | null): string {
  return normalizeGender(gender) === "female" ? "/images/profile-female.svg" : "/images/profile-male.svg"
}

// Returns true only when a parameter has a usable normal/reference range.
// Parameters WITHOUT a range must not be shown in ANY section (Health Summary,
// Digital Twin, Trends, Test Reports), so every section funnels through this.
// Treats empty, whitespace, and common "no value" placeholders as missing.
export function hasValidRange(range?: string | null): boolean {
  const r = (range ?? "").toString().trim().toLowerCase()
  if (!r) return false
  const invalid = new Set([
    "-", "--", "n/a", "na", "null", "undefined", "nil", "none", "not available", "not applicable",
  ])
  if (invalid.has(r)) return false
  // Only NUMERIC ranges are considered. Purely textual reference ranges such as
  // "normal", "negative", "positive", "non-reactive", "absent" carry no numeric
  // boundary and must be excluded from every section. Require at least one digit.
  if (!/\d/.test(r)) return false
  return true
}

// Convenience: read the range off any of the field names used across the app
// and check validity in one call.
export function paramHasRange(param: any): boolean {
  if (!param) return false
  return hasValidRange(param.range ?? param.normal_range ?? param.normalRange)
}

// Helper function to determine if a parameter is within normal range.
// Handles the range formats seen in reports: "13.0 - 17.0", "0.3-1.0",
// "< 200", "<= 200", "≤ 1.2", "> 40", ">= 40", "≥ 40", and "upto 40".
// When the range can't be parsed to numbers, the value is treated as normal.
export function getParameterStatus(result: number, rangeStr: string): "normal" | "abnormal" {
  if (result == null || Number.isNaN(result)) return "normal"
  // Normalize unicode operators and dashes to ASCII.
  const s = (rangeStr ?? "")
    .toString()
    .trim()
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/[–—]/g, "-")
  if (!s) return "normal"

  // Between form: "a - b" (also handles no-space "a-b" and negative bounds).
  const between = s.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/)
  if (between) {
    const min = Number.parseFloat(between[1])
    const max = Number.parseFloat(between[2])
    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      return result >= min && result <= max ? "normal" : "abnormal"
    }
  }

  const firstNum = s.match(/-?\d+(?:\.\d+)?/)
  if (!firstNum) return "normal"
  const n = Number.parseFloat(firstNum[0])
  if (Number.isNaN(n)) return "normal"

  if (s.startsWith("<=")) return result <= n ? "normal" : "abnormal"
  if (s.startsWith("<")) return result < n ? "normal" : "abnormal"
  if (s.startsWith(">=")) return result >= n ? "normal" : "abnormal"
  if (s.startsWith(">")) return result > n ? "normal" : "abnormal"
  if (s.toLowerCase().includes("upto")) return result <= n ? "normal" : "abnormal"
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
