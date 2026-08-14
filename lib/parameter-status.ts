import { getParameterStatus } from "@/lib/health-utils"
import { getParameterBandStatus } from "@/lib/parameter-bands"

// Read a numeric value off any of the field names used across the API/mock.
function readValue(param: any): number {
  return Number.parseFloat(String(param?.result ?? param?.value ?? param?.Value ?? param?.currentValue ?? ""))
}

function readName(param: any): string {
  return param?.name || param?.metric_name || param?.metricName || param?.Name || ""
}

function readRange(param: any): string {
  return String(param?.range ?? param?.normal_range ?? param?.normalRange ?? param?.Range ?? "")
}

// SINGLE SOURCE OF TRUTH for a parameter's Normal/Abnormal status across every
// section (Health Summary, Digital Twin, Trends, Test Reports, Recommendations,
// What Next). Status is derived ONLY from hardcoded clinical values:
//   1. custom band ranges for the 7 band parameters, otherwise
//   2. the numeric reference range shown on the report.
// The API's precomputed `status`/`Status` flag is intentionally IGNORED — it has
// proven unreliable (e.g. flagging clearly in-range SGOT/SGPT as abnormal and
// inflating the "X out of range" counts).
export function resolveParameterStatus(param: any, gender?: string | null): "normal" | "abnormal" {
  if (!param) return "normal"
  const value = readValue(param)

  // 1) Hardcoded band ranges win for the custom-band parameters.
  const bandStatus = getParameterBandStatus(readName(param), value, gender)
  if (bandStatus) return bandStatus

  // 2) Fall back to numeric range comparison for everything else.
  if (Number.isNaN(value)) return "normal"
  return getParameterStatus(value, readRange(param))
}

// Convenience boolean wrapper.
export function isParamAbnormal(param: any, gender?: string | null): boolean {
  return resolveParameterStatus(param, gender) === "abnormal"
}
