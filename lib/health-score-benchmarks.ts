import "server-only"

// Health-score benchmark + risk-band data. Kept server-only (never shipped to
// the client) so the full population benchmark table is not publicly exposed.
// The API route returns only the single matched band + the generic risk-band
// thresholds needed to render the scale.

export interface RiskBand {
  riskLevel: string
  minScore: number
  maxScore: number
}

// Risk-level thresholds on the 0-10 scale (higher score = higher risk).
export const RISK_BANDS: RiskBand[] = [
  { riskLevel: "No Risk", minScore: 0, maxScore: 0 },
  { riskLevel: "Low Risk", minScore: 0, maxScore: 3.33 },
  { riskLevel: "Moderate Risk", minScore: 3.33, maxScore: 6.66 },
  { riskLevel: "High Risk", minScore: 6.66, maxScore: 10 },
]

interface Benchmark {
  age_gender_band: string
  avg_overall_risk_score: number
}

// Population average risk scores by age + gender band (already on the 0-10
// scale). Private — only the matched band is ever returned to the client.
const BENCHMARKS: Benchmark[] = [
  { age_gender_band: "Female 18-30", avg_overall_risk_score: 2.306451976545179 },
  { age_gender_band: "Female 31-40", avg_overall_risk_score: 2.349937064817066 },
  { age_gender_band: "Female 41-50", avg_overall_risk_score: 2.4508741308855435 },
  { age_gender_band: "Female 51-60", avg_overall_risk_score: 2.5975466854677256 },
  { age_gender_band: "Female 61-70", avg_overall_risk_score: 2.6158767991254326 },
  { age_gender_band: "Male 18-30", avg_overall_risk_score: 2.171372684084705 },
  { age_gender_band: "Male 31-40", avg_overall_risk_score: 2.4729929436399662 },
  { age_gender_band: "Male 41-50", avg_overall_risk_score: 2.5771306630695157 },
  { age_gender_band: "Male 51-60", avg_overall_risk_score: 2.6938268263053713 },
  { age_gender_band: "Male 61-70", avg_overall_risk_score: 2.603588909368677 },
]

const AGE_BANDS = [
  { min: 18, max: 30, label: "18-30" },
  { min: 31, max: 40, label: "31-40" },
  { min: 41, max: 50, label: "41-50" },
  { min: 51, max: 60, label: "51-60" },
  { min: 61, max: 70, label: "61-70" },
]

// Map a numeric age to a benchmark band label, clamping out-of-range ages to
// the nearest available band (the dataset only covers 18-70).
function ageToBand(age: number): string | null {
  if (!Number.isFinite(age) || age <= 0) return null
  if (age < 18) return "18-30"
  if (age > 70) return "61-70"
  return AGE_BANDS.find((b) => age >= b.min && age <= b.max)?.label ?? null
}

function normalizeGender(gender?: string): "Male" | "Female" | null {
  const g = (gender || "").trim().toLowerCase()
  if (g === "male" || g === "m") return "Male"
  if (g === "female" || g === "f") return "Female"
  return null
}

// Determine the risk level for a 0-10 score. "No Risk" is reserved for an exact
// zero; everything above falls into Low/Moderate/High by the band thresholds.
export function getRiskLevel(score10: number): string {
  if (score10 <= 0) return "No Risk"
  if (score10 <= 3.33) return "Low Risk"
  if (score10 <= 6.66) return "Moderate Risk"
  return "High Risk"
}

// Return the matched benchmark band + its average (0-10, 2dp) for the given
// gender/age, or null when either is missing/unmatched.
export function getBenchmarkForBand(gender?: string, age?: number): { band: string; avgScore: number } | null {
  const g = normalizeGender(gender)
  const ageLabel = age != null ? ageToBand(age) : null
  if (!g || !ageLabel) return null
  const band = `${g} ${ageLabel}`
  const match = BENCHMARKS.find((b) => b.age_gender_band === band)
  if (!match) return null
  return { band, avgScore: Math.round(match.avg_overall_risk_score * 100) / 100 }
}
