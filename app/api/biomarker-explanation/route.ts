import { NextResponse } from "next/server"
import { getBiomarkerExplanation } from "@/lib/biomarker-explanations"

// Returns a single biomarker explanation for a given parameter name, or null if
// no confident match exists. The full explanations dataset stays server-side and
// is never shipped to the client; callers can only resolve one name at a time.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get("name")

  const explanation = getBiomarkerExplanation(name)

  return NextResponse.json(
    { explanation },
    {
      headers: {
        // Safe to cache: explanations are static educational content, not
        // personal data. Keyed per name via the query string.
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  )
}
