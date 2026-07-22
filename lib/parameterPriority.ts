// Orders health parameters so that commonly known/understood metrics appear
// first, and lesser-known technical parameters appear later. This helps users
// without medical knowledge find familiar values quickly.

// Ordered list of keywords for commonly recognized health parameters.
// Earlier entries get higher priority (shown first). Matching is done on a
// lowercased, substring basis against the parameter name.
const COMMON_PARAMETER_KEYWORDS: string[] = [
  "blood sugar",
  "glucose",
  "hba1c",
  "cholesterol",
  "hdl",
  "ldl",
  "triglyceride",
  "hemoglobin",
  "haemoglobin",
  "blood pressure",
  "vitamin d",
  "vitamin b12",
  "vitamin b-12",
  "thyroid",
  "tsh",
  "t3",
  "t4",
  "uric acid",
  "creatinine",
  "urea",
  "calcium",
  "iron",
  "wbc",
  "white blood cell",
  "rbc",
  "red blood cell",
  "platelet",
  "bilirubin",
  "sgpt",
  "sgot",
  "alt",
  "ast",
]

// Returns a numeric priority rank for a given parameter name.
// Lower number = more commonly known = shown earlier.
// Unknown/technical parameters return a large number so they sort to the end.
export function getParameterPriority(name: string): number {
  const lower = (name || "").toLowerCase()
  for (let i = 0; i < COMMON_PARAMETER_KEYWORDS.length; i++) {
    if (lower.includes(COMMON_PARAMETER_KEYWORDS[i])) {
      return i
    }
  }
  return COMMON_PARAMETER_KEYWORDS.length + 1
}

// Sorts parameters by common-knowledge priority (stable) using each item's name.
export function sortByCommonKnowledge<T extends { name: string }>(params: T[]): T[] {
  return params
    .map((param, index) => ({ param, index }))
    .sort((a, b) => {
      const rankA = getParameterPriority(a.param.name)
      const rankB = getParameterPriority(b.param.name)
      if (rankA !== rankB) return rankA - rankB
      // Preserve original order for items with equal priority (stable sort)
      return a.index - b.index
    })
    .map(({ param }) => param)
}
