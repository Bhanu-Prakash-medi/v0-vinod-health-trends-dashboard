import type { RecommendationSource } from "@/lib/api"

export interface RecExplanation {
  what_it_is?: string
  your_result?: string
  why_it_happens?: string
  what_it_means?: string
}

export interface RecLifestyle {
  change: string
  why?: string
  how?: string
}

export interface RecFood {
  food: string
  why?: string
  tip?: string
}

export interface RecTest {
  name: string
  purpose?: string
  type?: string
  package_ids?: number[]
  test_id?: number | null
  mb_code?: string | null
  includes?: Array<{ name: string; test_id?: number | null; mb_code?: string | null }>
}

export interface RecParameter {
  rank?: number
  id: string
  parameter: string
  organ?: string
  value?: string
  normal_range?: string
  status?: string
  urgency?: string
  explanation?: RecExplanation
  recommendations?: {
    lifestyle?: RecLifestyle[]
    diet?: { include?: RecFood[]; limit?: RecFood[] }
    self_care_note?: string | null
  }
  next_steps?: {
    consult_doctor?: {
      advice?: string
      specialists?: string[]
      specialist_links?: { name: string; url: string }[]
    }
    tests?: RecTest[]
    other_tests?: string[]
  }
  related_parameters?: string[]
}

export interface RecOrgan {
  organ: string
  urgency?: string
  total_parameters?: number
  abnormal_parameters?: number
  summary?: string
  parameters: RecParameter[]
}

export interface RecommendationsResponse {
  overall_summary?: string
  top_recommendations?: RecParameter[]
  organs?: RecOrgan[]
  disclaimer?: string
  generated_at?: string
}

export async function fetchRecommendations(
  accessToken: string,
  source: RecommendationSource,
): Promise<RecommendationsResponse> {
  const response = await fetch("/api/health/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json", accesstoken: accessToken },
    body: JSON.stringify({ reportDetails: source }),
  })
  if (!response.ok) throw new Error(`Recommendations request failed: ${response.status}`)
  return response.json()
}
