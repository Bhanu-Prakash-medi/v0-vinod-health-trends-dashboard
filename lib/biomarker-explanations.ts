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

// Generic qualifiers that describe a REPORT SUB-FIELD or SIDE/TIMING variant
// ("ECG (Remark)", "FVC (Post)", "Vision Glasses (LT)") rather than a real
// abbreviation of the biomarker itself ("Thyroid Stimulating Hormone (TSH)").
// These must never become standalone lookup keys: a bare "ECG"/"FVC"/"LT"
// value should resolve to the correct general entry (or nothing), never to
// an arbitrary sub-field's explanation.
const QUALIFIER_WORDS = new Set(["remark", "result", "pre", "post", "lt", "rt", "bpm"])

// Collapse to alphanumeric-only, lowercased.
function normFull(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

// Portion before the first parenthesis/bracket.
function preParen(s: string): string {
  return s.split(/[([]/)[0]
}

// The content of this entry's own bracket, if any (e.g. "Remark" from
// "ECG (Remark)"), lowercased and trimmed.
function ownParenContent(s: string): string | null {
  const match = s.match(/[([]([^)\]]+)[)\]]/)
  return match ? match[1].trim() : null
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
  const entries = EXPLANATIONS.map((raw) => {
    const explanation: BiomarkerExplanation = { title: raw.parameter, description: raw.explanation }

    // If this entry's own bracket is a generic qualifier ("ECG (Remark)",
    // "FVC (Post)", "Vision Glasses (LT)"), it is a report sub-field/variant,
    // not the canonical biomarker — don't let its bare prefix ("ECG", "FVC",
    // "Vision Glasses") register as a key. That prefix belongs to whichever
    // entry actually represents the general test by that name.
    const ownContent = ownParenContent(raw.parameter)
    const isQualifierSuffixed = ownContent ? QUALIFIER_WORDS.has(normFull(ownContent)) : false

    const candidates = [raw.parameter]
    if (!isQualifierSuffixed) candidates.push(preParen(raw.parameter))

    // Also add tokens found inside parentheses/brackets as standalone keys
    // (e.g. "TSH" from "Thyroid Stimulating Hormone (TSH)"), but never a
    // generic qualifier word ("Remark"/"Result"/"Pre"/"Post"/"LT"/"RT"/"BPM")
    // — those describe a sub-field or variant, not the biomarker, and must
    // never let a bare lookup resolve to the wrong sub-field's explanation.
    const parenMatches = raw.parameter.match(/[([]([^)\]]+)[)\]]/g) ?? []
    for (const m of parenMatches) {
      const inner = m.replace(/[()[\]]/g, "")
      for (const piece of inner.split(/[/,&+]/)) {
        const trimmed = piece.trim()
        if (trimmed && !QUALIFIER_WORDS.has(normFull(trimmed))) candidates.push(trimmed)
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

  // Defensive safety net: if a normalized key would resolve to entries for
  // genuinely different parameters (not just duplicate rows of the same
  // parameter authored with slightly different wording), matching cannot
  // pick the "right" one with confidence — drop that key from every entry
  // so the lookup returns null (no info button) instead of a plausible-
  // looking but potentially wrong biomarker explanation. Duplicate rows
  // that share the exact same parameter name are treated as one identity,
  // so their key is kept and either row's text is fine to show.
  function dropAmbiguousKeys(keyOf: (e: (typeof entries)[number]) => Set<string>) {
    const identitiesByKey = new Map<string, Set<string>>()
    entries.forEach((entry, i) => {
      const identity = normFull(EXPLANATIONS[i].parameter)
      for (const key of keyOf(entry)) {
        if (!identitiesByKey.has(key)) identitiesByKey.set(key, new Set())
        identitiesByKey.get(key)!.add(identity)
      }
    })
    const ambiguousKeys = new Set(
      Array.from(identitiesByKey.entries())
        .filter(([, ids]) => ids.size > 1)
        .map(([key]) => key),
    )
    if (ambiguousKeys.size === 0) return
    for (const entry of entries) {
      for (const key of ambiguousKeys) keyOf(entry).delete(key)
    }
  }

  dropAmbiguousKeys((e) => e.fullKeys)
  dropAmbiguousKeys((e) => e.tokenKeys)

  return entries
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
