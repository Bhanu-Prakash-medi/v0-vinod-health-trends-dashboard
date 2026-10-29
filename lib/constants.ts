export const DEFAULT_CONTRACT_TYPE = 10390

export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true"

export const MAX_REPORT_BYTES = 10 * 1024 * 1024

export const SIGNED_URL_TTL_MS = 2 * 60 * 60 * 1000

export const REPORT_NAME_MAX_LENGTH = 255
export const REPORT_DESCRIPTION_MAX_LENGTH = 500

export const ALLOWED_RELATIONS = [
  "self",
  "mother",
  "brother",
  "daughter",
  "father",
  "husband",
  "sister",
  "son",
  "wife",
  "daughter-in-law",
  "father-in-law",
  "mother-in-law",
  "son-in-law",
  "spouse",
  "others",
  "partner",
  "child",
  "friend",
] as const

export type AllowedRelation = (typeof ALLOWED_RELATIONS)[number]
