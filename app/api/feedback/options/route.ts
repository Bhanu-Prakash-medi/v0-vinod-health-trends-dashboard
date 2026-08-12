import { type NextRequest, NextResponse } from "next/server"
import { getFeedbackOptions } from "@/lib/feedback-options"

// Returns the rating-band prompt + selectable reasons for the given NPS rating.
// The full option catalog lives server-side (lib/feedback-options.ts) and is
// never bundled into the client; only the relevant band is returned here.
export async function GET(request: NextRequest) {
  const ratingParam = request.nextUrl.searchParams.get("rating")
  const rating = Number(ratingParam)

  const set = getFeedbackOptions(rating)
  if (!set) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 })
  }

  return NextResponse.json(
    { band: set.band, prompt: set.prompt, options: set.options },
    { headers: { "Cache-Control": "no-store" } },
  )
}
