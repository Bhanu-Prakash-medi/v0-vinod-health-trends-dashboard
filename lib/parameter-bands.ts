import { normalizeGender } from "@/lib/health-utils"

// Custom clinical band definitions for a specific set of parameters. For these
// parameters we override the default green/red status with granular, color
// coded bands (e.g. Prediabetes, Borderline High). Every OTHER parameter keeps
// the existing normal/abnormal display. The band range details are surfaced in
// each parameter's "i" info popup.

export interface ParameterBand {
  label: string
  min: number | null
  max: number | null
  color: string
  sex?: "male" | "female"
}

export interface ParameterBandDef {
  id: string
  unit: string
  direction: "higher_is_worse" | "lower_is_worse"
  notes?: string
  ranges: ParameterBand[]
}

// The 7 parameters with custom bands. Colors and ranges come straight from the
// provided specification.
const PARAMETER_BAND_DEFS: ParameterBandDef[] = [
  {
    id: "glucose_fasting",
    unit: "mg/dL",
    direction: "higher_is_worse",
    ranges: [
      { label: "Low (Hypoglycemia)", min: null, max: 69.9, color: "#EF4444" },
      { label: "Normal", min: 70, max: 99, color: "#22C55E" },
      { label: "Prediabetes (Impaired Fasting Glucose)", min: 100, max: 125, color: "#F59E0B" },
      { label: "Diabetes", min: 126, max: null, color: "#EF4444" },
    ],
  },
  {
    id: "hba1c",
    unit: "%",
    direction: "higher_is_worse",
    notes:
      "Well-controlled diabetic treatment target is commonly <7.0%, distinct from the diagnostic cutoff above.",
    ranges: [
      { label: "Normal", min: null, max: 5.6, color: "#22C55E" },
      { label: "Prediabetes", min: 5.7, max: 6.4, color: "#F59E0B" },
      { label: "Diabetes", min: 6.5, max: null, color: "#EF4444" },
    ],
  },
  {
    id: "cholesterol_total",
    unit: "mg/dL",
    direction: "higher_is_worse",
    ranges: [
      { label: "Desirable", min: null, max: 199, color: "#22C55E" },
      { label: "Borderline High", min: 200, max: 239, color: "#F59E0B" },
      { label: "High", min: 240, max: null, color: "#EF4444" },
    ],
  },
  {
    id: "triglycerides",
    unit: "mg/dL",
    direction: "higher_is_worse",
    ranges: [
      { label: "Normal", min: null, max: 149, color: "#22C55E" },
      { label: "Borderline High", min: 150, max: 199, color: "#F59E0B" },
      { label: "High", min: 200, max: 499, color: "#F97316" },
      { label: "Very High", min: 500, max: null, color: "#EF4444" },
    ],
  },
  {
    id: "cholesterol_hdl",
    unit: "mg/dL",
    direction: "lower_is_worse",
    notes:
      "HDL is inverted vs. the other lipids — LOW is the risk factor, HIGH is protective. Men and women have different low-risk cutoffs.",
    ranges: [
      { label: "Low (Risk Factor) - Men", min: null, max: 39.9, color: "#EF4444", sex: "male" },
      { label: "Low (Risk Factor) - Women", min: null, max: 49.9, color: "#EF4444", sex: "female" },
      { label: "Normal", min: 40, max: 59, color: "#22C55E" },
      { label: "High (Protective)", min: 60, max: null, color: "#16A34A" },
    ],
  },
  {
    id: "cholesterol_ldl",
    unit: "mg/dL",
    direction: "higher_is_worse",
    // Capped at 4 bands (High + Very High merged into "High").
    ranges: [
      { label: "Optimal", min: null, max: 99, color: "#22C55E" },
      { label: "Near Optimal", min: 100, max: 129, color: "#84CC16" },
      { label: "Borderline High", min: 130, max: 159, color: "#F59E0B" },
      { label: "High", min: 160, max: null, color: "#EF4444" },
    ],
  },
  {
    id: "bilirubin_total",
    unit: "mg/dL",
    direction: "higher_is_worse",
    notes:
      "Normal range varies slightly by lab (commonly 0.1-1.2, sometimes reported as 0.2-1.0 or 0.3-1.2) — confirm against your specific lab partner's reference range.",
    ranges: [
      { label: "Normal", min: 0.1, max: 1.2, color: "#22C55E" },
      { label: "Mild Elevation", min: 1.3, max: 3.0, color: "#F59E0B" },
      { label: "Moderate Elevation", min: 3.1, max: 12.0, color: "#F97316" },
      { label: "Severe (Jaundice)", min: 12.1, max: null, color: "#EF4444" },
    ],
  },
]

// Resolve a parameter name to one of the custom band definitions using tolerant
// keyword matching (the clinical names carry method/sample suffixes that vary).
function matchDef(name?: string | null): ParameterBandDef | null {
  const n = (name || "").toLowerCase()
  if (!n) return null

  const has = (...words: string[]) => words.every((w) => n.includes(w))

  // Order matters: check the most specific lipids before generic "cholesterol".
  if (n.includes("hba1c") || n.includes("glycosylated") || n.includes("glycated")) return byId("hba1c")
  if (n.includes("hdl")) return byId("cholesterol_hdl")
  if (n.includes("ldl")) return byId("cholesterol_ldl")
  if (n.includes("triglyceride")) return byId("triglycerides")
  if (n.includes("bilirubin") && n.includes("total")) return byId("bilirubin_total")
  // Total cholesterol: must be cholesterol AND total, and not an HDL/LDL/VLDL/non-HDL variant.
  if (
    n.includes("cholesterol") &&
    n.includes("total") &&
    !n.includes("hdl") &&
    !n.includes("ldl") &&
    !n.includes("vldl") &&
    !n.includes("non")
  )
    return byId("cholesterol_total")
  // Fasting glucose (FBS). Exclude post-prandial / random glucose.
  if (
    n.includes("glucose") &&
    (has("glucose", "fasting") || n.includes("fbs")) &&
    !n.includes("postprandial") &&
    !n.includes("post prandial") &&
    !n.includes("pp") &&
    !n.includes("random")
  )
    return byId("glucose_fasting")

  return null
}

function byId(id: string): ParameterBandDef | null {
  return PARAMETER_BAND_DEFS.find((d) => d.id === id) ?? null
}

// Resolve the sex-specific bands to a single applicable set. Bands with no
// `sex` always apply; sex-specific bands only apply to the matching patient
// sex. When the patient's sex is unknown we default to "male" (consistent with
// the rest of the app's avatar/benchmark defaults) so we never show BOTH the
// male and female variants — that would exceed the intended 4 bands.
function filterBandsBySex(ranges: ParameterBand[], sex: "male" | "female" | null): ParameterBand[] {
  const effectiveSex: "male" | "female" = sex ?? "male"
  return ranges.filter((b) => !b.sex || b.sex === effectiveSex)
}

// A concise pill label: drop the parenthetical/qualifier so pills stay compact
// ("Prediabetes (Impaired Fasting Glucose)" -> "Prediabetes"). The full label
// and range are shown in the info popup.
export function shortBandLabel(label: string): string {
  return label.split(" (")[0].split(" - ")[0].trim()
}

// Format a band's numeric range for display, e.g. "100 – 125", "≤ 69.9", "≥ 126".
export function formatBandRange(band: ParameterBand): string {
  const { min, max } = band
  if (min != null && max != null) return `${min} – ${max}`
  if (min == null && max != null) return `≤ ${max}`
  if (min != null && max == null) return `≥ ${min}`
  return ""
}

export interface MatchedBand {
  label: string
  shortLabel: string
  color: string
}

// Returns the matched band for a parameter's value, or null if this parameter
// isn't one of the custom-band parameters (caller should fall back to default
// green/red display).
export function getParameterBand(
  name: string | null | undefined,
  value: number | null | undefined,
  gender?: string | null,
): MatchedBand | null {
  const def = matchDef(name)
  if (!def || value == null || Number.isNaN(value)) return null

  const sex = normalizeGender(gender)
  const bands = filterBandsBySex(def.ranges, sex)
  for (const band of bands) {
    const min = band.min ?? Number.NEGATIVE_INFINITY
    const max = band.max ?? Number.POSITIVE_INFINITY
    if (value >= min && value <= max) {
      return { label: band.label, shortLabel: shortBandLabel(band.label), color: band.color }
    }
  }
  return null
}

export interface BandScaleSegment {
  color: string
  label: string
  widthPct: number
}

export interface BandScale {
  segments: BandScaleSegment[]
  markerPct: number
}

// Builds a band-colored scale bar (equal-width segments + marker position) for
// the custom-band parameters, so the range indicator reflects the clinical
// bands instead of a generic red/green/red bar. Every band gets the SAME width
// regardless of its numeric span, and the marker is placed proportionally
// inside whichever band the value falls in. Returns null for non-band
// parameters (caller keeps the default bar).
export function getParameterBandScale(
  name: string | null | undefined,
  value: number | null | undefined,
  gender?: string | null,
): BandScale | null {
  const def = matchDef(name)
  if (!def) return null

  const sex = normalizeGender(gender)
  const bands = filterBandsBySex(def.ranges, sex)
  if (bands.length === 0) return null

  const n = bands.length
  const segWidth = 100 / n

  // Equal-width segments so no color takes more or less space than another.
  const segments: BandScaleSegment[] = bands.map((b) => ({
    color: b.color,
    label: shortBandLabel(b.label),
    widthPct: segWidth,
  }))

  // Place the marker inside its band's equal-width slot, proportional to where
  // the value sits between that band's bounds. Open-ended bounds fall back to
  // the slot edges so the marker stays within the bar.
  let markerPct: number | null = null
  if (value != null && !Number.isNaN(value)) {
    let idx = bands.findIndex((b) => {
      const min = b.min ?? Number.NEGATIVE_INFINITY
      const max = b.max ?? Number.POSITIVE_INFINITY
      return value >= min && value <= max
    })
    if (idx === -1) idx = value < (bands[0].min ?? Number.NEGATIVE_INFINITY) ? 0 : n - 1

    const b = bands[idx]
    const lo = b.min ?? b.max ?? value
    const hi = b.max ?? b.min ?? value
    const denom = hi - lo
    const frac = denom > 0 ? Math.min(Math.max((value - lo) / denom, 0), 1) : 0.5
    markerPct = (idx + frac) * segWidth
  }

  return { segments, markerPct: markerPct ?? 50 }
}

// Returns the full band definition (for the info popup), filtered to the bands
// relevant to the patient's sex, or null if this isn't a custom-band parameter.
export function getParameterBandInfo(
  name: string | null | undefined,
  gender?: string | null,
): { unit: string; notes?: string; ranges: ParameterBand[] } | null {
  const def = matchDef(name)
  if (!def) return null
  const sex = normalizeGender(gender)
  // Show only the applicable sex's bands (defaults unknown -> male) so the
  // popup never lists more than the intended bands.
  const ranges = filterBandsBySex(def.ranges, sex)
  return { unit: def.unit, notes: def.notes, ranges }
}
