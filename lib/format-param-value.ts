const PLATELET_NAMES = new Set(["platelet", "platelets", "plt", "platelet count", "platelet count (plt)"])

export function isPlateletCount(name: string) {
  const n = name.trim().toLowerCase()
  return PLATELET_NAMES.has(n) || n.startsWith("platelet count")
}

/** Multiplier that converts a platelet value in `unit` to million/µL. */
function plateletToMillionFactor(unit: string, value: number): number {
  const u = unit.toLowerCase().replace(/\s/g, "")
  const exp = u.match(/10[\^*]?(\d+)/)
  if (exp) {
    const n = Number(exp[1])
    const perLitre = u.endsWith("/l")
    return 10 ** (n - (perLitre ? 12 : 6))
  }
  if (u.includes("lakh")) return 0.1
  if (u.includes("million")) return 1
  if (u.includes("thousand")) return 0.001
  // Unit missing: infer scale from magnitude (raw count, thousands, or lakhs per µL).
  if (value > 1000) return 1e-6
  if (value >= 10) return 0.001
  return 0.1
}

export function formatNumber(value: number, fractionDigits?: { min?: number; max?: number }) {
  if (!Number.isFinite(value)) return "-"
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits?.min ?? 0,
    maximumFractionDigits: fractionDigits?.max ?? 2,
    useGrouping: Math.abs(value) >= 10000,
  }).format(value)
}

/**
 * Display-only formatting for a lab parameter: rounds float noise
 * (3.0100000000000002 -> 3.01) and shows platelets in million/µL.
 * Calculations (bands, markers) should keep using the raw value.
 */
export function formatParamDisplay(
  name: string,
  rawValue: unknown,
  rawUnit = "",
  rawRange = "",
): { value: string; unit: string; range: string } {
  // Source reports sometimes carry a mis-decoded micro sign (U+FFFD) in units like "µIU/mL".
  const unit = rawUnit.replace(/\uFFFD|Â?µ|Î¼/g, "µ")
  const range = rawRange
  const numeric = typeof rawValue === "number" ? rawValue : Number.parseFloat(String(rawValue ?? ""))

  if (!Number.isFinite(numeric)) {
    return { value: rawValue == null || rawValue === "" ? "-" : String(rawValue), unit, range }
  }

  if (isPlateletCount(name)) {
    const factor = plateletToMillionFactor(unit, numeric)
    const digits = { min: 2, max: 2 }
    const cleanRange = range.replace(/x?\s*10\s*[\^*]\s*\d+\s*\/\s*\S+/gi, "").trim()
    const convertedRange = cleanRange.replace(/\d+(?:\.\d+)?/g, (m) => formatNumber(Number(m) * factor, digits))
    return {
      value: formatNumber(numeric * factor, digits),
      unit: "million/µL",
      range: convertedRange,
    }
  }

  return { value: formatNumber(numeric), unit, range }
}
