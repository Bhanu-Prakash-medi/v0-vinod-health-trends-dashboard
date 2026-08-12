import "server-only"

// Rating-based feedback follow-up prompts and selectable reasons.
// Kept server-side so the exact copy/options are never shipped in the client
// bundle; the client fetches only the band relevant to the chosen rating.

export interface FeedbackOptionSet {
  band: "detractor" | "passive" | "promoter"
  prompt: string
  options: string[]
}

const DETRACTOR: FeedbackOptionSet = {
  band: "detractor",
  prompt: "We're sorry your experience didn't meet your expectations. What could we improve?",
  options: [
    "Health reports were difficult to access",
    "Biomarker information was difficult to understand",
    "Health trends were not easy to interpret",
    "Health insights were not useful",
    "Health recommendations were not relevant",
    "Health Score was difficult to understand",
    "Overall experience could be improved",
    "Others",
  ],
}

const PASSIVE: FeedbackOptionSet = {
  band: "passive",
  prompt: "Thank you for your feedback. What could have made your Health Trends experience even better?",
  options: [
    "Health reports could be easier to access",
    "Biomarker explanations could be clearer",
    "Health trends could be more informative",
    "Health insights could be more personalized",
    "Health recommendations could be more actionable",
    "Health Score could be more meaningful",
    "Dashboard experience could be enhanced",
    "Others",
  ],
}

const PROMOTER: FeedbackOptionSet = {
  band: "promoter",
  prompt: "We're delighted that you enjoyed using Health Trends! What did you like the most?",
  options: [
    "Health reports were easy to access",
    "Biomarker explanations were easy to understand",
    "Health trends were insightful",
    "Health insights were meaningful",
    "Health recommendations were helpful",
    "Health Score was easy to understand",
    "Dashboard was intuitive and easy to navigate",
    "Overall experience was excellent",
    "Others",
  ],
}

/** Resolve the option set for a 0-10 NPS rating, or null if out of range. */
export function getFeedbackOptions(rating: number): FeedbackOptionSet | null {
  if (!Number.isFinite(rating) || rating < 0 || rating > 10) return null
  if (rating <= 6) return DETRACTOR
  if (rating <= 8) return PASSIVE
  return PROMOTER
}
