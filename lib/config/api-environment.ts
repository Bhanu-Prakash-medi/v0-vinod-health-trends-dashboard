// Pinned to staging on purpose; the API_ENV environment variable is intentionally ignored.
export const HEALTHTRENDS_BACKEND_URL = "https://healthtrends-backend.mbstg.in"

export const RECOMMENDATIONS_API_URL = `${HEALTHTRENDS_BACKEND_URL}/healthtrends-recommendations`

// Environment-independent: the TCS allowlist webhook is the same for production and staging.
export const TCS_ALLOWLIST_WEBHOOK_URL = "https://n8n-public.medibuddy.in/webhook/health/fetchtcsallowlist"
