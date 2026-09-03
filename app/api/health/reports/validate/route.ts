import { type NextRequest, NextResponse } from "next/server"
import { MAX_PDF_BYTES, validatePdfBytes } from "@/lib/pdf-validation"

// POST /api/health/reports/validate
// Accepts a single file (multipart/form-data, field name "file") and runs the
// authoritative PDF + malicious-content check on the raw bytes server-side.
// This exists because the equivalent client-side check in
// lib/pdf-validation.ts can be bypassed by anyone with devtools — a request
// hitting this route is the real gate.
//
// This endpoint only validates; it does not persist the file anywhere.
export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ valid: false, reason: "Malformed upload request." }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ valid: false, reason: "No file provided." }, { status: 400 })
  }

  // Reject oversized uploads before buffering the whole file into memory.
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ valid: false, reason: "File exceeds the 20MB size limit." }, { status: 413 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  const result = validatePdfBytes(bytes)

  return NextResponse.json(result, {
    status: result.valid ? 200 : 422,
    headers: { "Cache-Control": "no-store" },
  })
}
