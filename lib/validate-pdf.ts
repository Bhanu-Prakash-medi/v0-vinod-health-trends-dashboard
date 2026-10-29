import { MAX_REPORT_BYTES } from "@/lib/constants"

export type PdfValidationResult = { ok: true } | { ok: false; message: string }

export const PDF_ERRORS = {
  notPdf: "Only PDF files are allowed.",
  tooLarge: "File size must be 10 MB or less.",
  empty: "This file is empty.",
  corrupted: "This PDF looks corrupted or cannot be read.",
  password: "Password-protected PDFs are not supported.",
} as const

const PDF_MAGIC = "%PDF-"
const PDF_WORKER_SRC = "/pdf.worker.min.mjs"

async function hasPdfSignature(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, PDF_MAGIC.length).arrayBuffer())
  return String.fromCharCode(...head) === PDF_MAGIC
}

export async function validatePdf(file: File): Promise<PdfValidationResult> {
  const isPdfName = file.name.toLowerCase().endsWith(".pdf")
  if (!isPdfName || file.type !== "application/pdf") return { ok: false, message: PDF_ERRORS.notPdf }
  if (file.size > MAX_REPORT_BYTES) return { ok: false, message: PDF_ERRORS.tooLarge }
  if (file.size === 0) return { ok: false, message: PDF_ERRORS.empty }

  try {
    if (!(await hasPdfSignature(file))) return { ok: false, message: PDF_ERRORS.corrupted }
  } catch {
    return { ok: false, message: PDF_ERRORS.corrupted }
  }

  // Legacy build ships polyfills needed by older in-app WebViews.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC

  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    isEvalSupported: false,
    enableXfa: false,
  })

  try {
    const doc = await task.promise
    if (doc.numPages < 1) return { ok: false, message: PDF_ERRORS.corrupted }
    await doc.getPage(1)
    return { ok: true }
  } catch (error) {
    const name = (error as { name?: string } | null)?.name
    if (name === "PasswordException") return { ok: false, message: PDF_ERRORS.password }
    return { ok: false, message: PDF_ERRORS.corrupted }
  } finally {
    void task.destroy()
  }
}
