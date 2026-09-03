/**
 * Shared PDF validation logic, used both as a fast client-side pre-check (for
 * instant feedback) and, authoritatively, on the server (client checks are
 * trivially bypassable via devtools, so the server re-validates the raw bytes
 * before anything is treated as "safe").
 *
 * This is deliberately conservative and heuristic. It is NOT a full antivirus
 * engine — it cannot decompress and inspect FlateDecode object streams, so a
 * sufficiently obfuscated payload could evade the content scan below. It
 * catches the common, easy cases: wrong file type, corrupted/fake PDFs, and
 * PDFs carrying the classic malicious primitives (embedded JavaScript,
 * auto-run actions, embedded files, remote launches, script/URI-scheme XSS
 * payloads).
 */

// Kept under typical serverless request-body limits (e.g. Vercel's default
// ~4.5MB on Node.js functions) with headroom, since this whole request is
// buffered in memory for scanning rather than streamed to storage.
export const MAX_PDF_BYTES = 4 * 1024 * 1024 // 4MB
export const MIN_PDF_BYTES = 100

/** A valid PDF must start with this signature. */
const PDF_MAGIC = "%PDF-"

/**
 * Byte sequences associated with active-content / auto-execution primitives
 * in the PDF spec, plus a couple of raw HTML/script XSS-style tokens as a
 * defensive extra. Matched case-insensitively against the raw file bytes
 * (decoded as latin1 so every byte value round-trips 1:1, avoiding UTF-8
 * decode errors on binary content).
 */
const MALICIOUS_MARKERS: { pattern: RegExp; label: string }[] = [
  { pattern: /\/JavaScript\b/i, label: "embedded JavaScript" },
  { pattern: /\/JS\b/i, label: "embedded JavaScript action" },
  { pattern: /\/OpenAction\b/i, label: "auto-run action on open" },
  { pattern: /\/AA\b/i, label: "auto-run additional action" },
  { pattern: /\/Launch\b/i, label: "launch external program action" },
  { pattern: /\/EmbeddedFile\b/i, label: "embedded file" },
  { pattern: /\/RichMedia\b/i, label: "embedded rich media (Flash/video)" },
  { pattern: /\/SubmitForm\b/i, label: "form data submission action" },
  { pattern: /\/ImportData\b/i, label: "external data import action" },
  { pattern: /\/GoToR\b/i, label: "remote go-to reference" },
  { pattern: /<script[\s>]/i, label: "raw <script> tag" },
  { pattern: /javascript:/i, label: "javascript: URI" },
  { pattern: /vbscript:/i, label: "vbscript: URI" },
]

export interface PdfValidationResult {
  valid: boolean
  /** Human-readable reason for rejection. Unset when valid. */
  reason?: string
}

/**
 * Validates raw file bytes against: minimum/maximum size, the PDF magic
 * signature, and the malicious-content marker list above.
 */
export function validatePdfBytes(bytes: Uint8Array): PdfValidationResult {
  if (bytes.byteLength < MIN_PDF_BYTES) {
    return { valid: false, reason: "File is empty or too small to be a valid report." }
  }
  if (bytes.byteLength > MAX_PDF_BYTES) {
    return { valid: false, reason: "File exceeds the 20MB size limit." }
  }

  // Decode as latin1 (1 byte -> 1 char) so binary content never throws and
  // every byte is preserved for exact substring matching below.
  let text = ""
  const CHUNK = 8192
  for (let i = 0; i < bytes.length; i += CHUNK) {
    text += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)))
  }

  if (!text.startsWith(PDF_MAGIC)) {
    return { valid: false, reason: "This is not a valid PDF file (missing PDF signature)." }
  }

  for (const { pattern, label } of MALICIOUS_MARKERS) {
    if (pattern.test(text)) {
      return { valid: false, reason: `File rejected: contains ${label}, which is not allowed in uploaded reports.` }
    }
  }

  return { valid: true }
}

/** Fast client-side pre-check on filename/type before reading any bytes. */
export function validatePdfFileMeta(file: { name: string; type: string; size: number }): PdfValidationResult {
  const looksLikePdfName = file.name.toLowerCase().endsWith(".pdf")
  if (!looksLikePdfName) {
    return { valid: false, reason: "Only .pdf files are accepted." }
  }
  // Some browsers/OSes leave `type` blank for valid PDFs, so an empty type is
  // allowed here — the magic-byte + server check below still gate hard.
  if (file.type && file.type !== "application/pdf") {
    return { valid: false, reason: "Only PDF files are accepted." }
  }
  if (file.size < MIN_PDF_BYTES) {
    return { valid: false, reason: "File is empty or too small to be a valid report." }
  }
  if (file.size > MAX_PDF_BYTES) {
    return { valid: false, reason: "File exceeds the 20MB size limit." }
  }
  return { valid: true }
}
