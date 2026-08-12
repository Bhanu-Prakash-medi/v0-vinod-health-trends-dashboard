// Biomarker / health-parameter explanations shown via the info (i) button.
//
// SECURITY: this module is SERVER-ONLY. The underlying dataset
// (lib/data/biomarker-explanations.json) must never be bundled into client
// JavaScript or served as a public asset. Explanations are looked up on the
// server and exposed one at a time through /api/biomarker-explanation.
import "server-only"

import rawData from "@/lib/data/biomarker-explanations.json"

export interface BiomarkerExplanation {
  title: string
  description: string
}

interface RawEntry {
  parameter: string
  explanation: string
}

const EXPLANATIONS: RawEntry[] = rawData as RawEntry[]

// --- Matching helpers ---

const STOPWORDS = new Set(["the", "a", "an", "of", "and", "with", "test", "level", "levels", "serum", "s", "blood"])

// Collapse to alphanumeric-only, lowercased.
function normFull(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

// Portion before the first parenthesis/bracket.
function preParen(s: string): string {
  return s.split(/[([]/)[0]
}

// Meaningful, order-independent token set (stopwords removed).
function tokenKey(s: string): string {
  const tokens = s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t))
  return Array.from(new Set(tokens)).sort().join(" ")
}

interface IndexEntry {
  explanation: BiomarkerExplanation
  fullKeys: Set<string> // exact normalized forms (incl. abbreviations)
  tokenKeys: Set<string> // order-independent token-set forms
}

function buildIndex(): IndexEntry[] {
  return EXPLANATIONS.map((raw) => {
    const explanation: BiomarkerExplanation = { title: raw.parameter, description: raw.explanation }
    const candidates = [raw.parameter, preParen(raw.parameter)]

    // Also add tokens found inside parentheses/brackets as standalone keys
    // (e.g. "TSH" from "Thyroid Stimulating Hormone (TSH)").
    const parenMatches = raw.parameter.match(/[([]([^)\]]+)[)\]]/g) ?? []
    for (const m of parenMatches) {
      const inner = m.replace(/[()[\]]/g, "")
      for (const piece of inner.split(/[/,&+]/)) {
        if (piece.trim()) candidates.push(piece.trim())
      }
    }

    const fullKeys = new Set<string>()
    const tokenKeys = new Set<string>()
    for (const c of candidates) {
      const nf = normFull(c)
      if (nf) fullKeys.add(nf)
      const tk = tokenKey(preParen(c) || c)
      if (tk) tokenKeys.add(tk)
    }

    return { explanation, fullKeys, tokenKeys }
  })
}

const INDEX = buildIndex()

/**
 * Look up a biomarker/parameter explanation by name.
 * Conservative matching (exact normalized, then order-independent token-set)
 * so the info button only appears when we are confident.
 */
export function getBiomarkerExplanation(name?: string | null): BiomarkerExplanation | null {
  if (!name || !name.trim()) return null

  const inFull = normFull(name)
  const inPreFull = normFull(preParen(name))
  const inTokenKey = tokenKey(preParen(name) || name)

  // Pass 1: exact normalized match (handles full names + abbreviations).
  for (const entry of INDEX) {
    if (entry.fullKeys.has(inFull) || (inPreFull && entry.fullKeys.has(inPreFull))) {
      return entry.explanation
    }
  }

  // Pass 2: order-independent token-set equality (handles "Total Cholesterol" vs "Cholesterol Total").
  if (inTokenKey) {
    for (const entry of INDEX) {
      if (entry.tokenKeys.has(inTokenKey)) {
        return entry.explanation
      }
    }
  }

  return null
}
