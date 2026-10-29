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

const RECOMMENDATIONS_API_URL = "/healthtrends-recommendations"

// Account userId from the beneficiary profile API. Report data often omits
// mbUserId, and the recommendations backend rejects requests without it.
let profileMbUserId = ""

export function setRecommendationsMbUserId(id: string | number | null | undefined) {
  profileMbUserId = id === undefined || id === null ? "" : String(id)
}

function toIsoDate(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? raw : d.toISOString().slice(0, 10)
}

export function buildRecommendationsPayload(source: RecommendationSource) {
  return {
    requestId: String(source.id ?? ""),
    sourceType: "",
    reportDate: toIsoDate(String(source.report_data?.fullfilmentDate ?? "")),
    employee: {
      mbUserId: profileMbUserId || String(source.report_data?.mbUserId ?? ""),
      vasBenefId: String(source.report_data?.rVasBenefId ?? ""),
    },
    reportDetails: {
      parameters: (source.parameters || []).map((p) => ({
        unit: p.unit ?? "",
        value: p.value,
        status: String(p.status ?? "").trim().toLowerCase(),
        metric_name: p.metric_name,
        normal_range: p.normal_range ?? "",
      })),
    },
  }
}

export async function fetchRecommendations(
  accessToken: string,
  source: RecommendationSource,
): Promise<RecommendationsResponse> {
  if (!accessToken) {
    throw new Error("Missing access token for recommendations API")
  }
  const response = await fetch(RECOMMENDATIONS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accesstoken: accessToken,
    },
    body: JSON.stringify(buildRecommendationsPayload(source)),
  })
  if (!response.ok) throw new Error(`Recommendations request failed: ${response.status}`)
  return response.json()
}
