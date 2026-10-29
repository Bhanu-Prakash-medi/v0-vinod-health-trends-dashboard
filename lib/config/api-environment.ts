const API_DOMAINS = {
  production: "https://healthtrends-backend.medibuddy.in",
  staging: "https://healthtrends-backend.mbstg.in",
} as const

export type ApiEnvironment = keyof typeof API_DOMAINS

export function resolveApiEnvironment(value: string | undefined = process.env.API_ENV): ApiEnvironment {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return "production"
  if (Object.hasOwn(API_DOMAINS, normalized)) return normalized as ApiEnvironment
  throw new Error(`Invalid API_ENV "${value}". Expected "production" or "staging".`)
}

export const API_ENV: ApiEnvironment = resolveApiEnvironment()

export const HEALTHTRENDS_BACKEND_URL: string = API_DOMAINS[API_ENV]

export const RECOMMENDATIONS_API_URL = `${HEALTHTRENDS_BACKEND_URL}/healthtrends-recommendations`

// Environment-independent: the TCS allowlist webhook is the same for production and staging.
export const TCS_ALLOWLIST_WEBHOOK_URL = "https://n8n-public.medibuddy.in/webhook/health/fetchtcsallowlist"
