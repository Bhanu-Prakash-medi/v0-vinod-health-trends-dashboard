import { type NextRequest, NextResponse } from "next/server"

const FEEDBACK_WEBHOOK_URL = "https://n8n-swift.medibuddy.in/webhook-test/health-trends-feedback"

export async function POST(request: NextRequest) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const body = await request.json()

    const payload = {
      rating: body.rating ?? null,
      feedbackMessage: (body.feedbackMessage ?? "").toString().trim(),
      emailId: body.emailId ?? "",
    }

    const response = await fetch(FEEDBACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: "Feedback webhook rejected the request", details: text },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError"
    return NextResponse.json(
      { error: isTimeout ? "Request timeout" : error instanceof Error ? error.message : "Internal server error" },
      { status: isTimeout ? 504 : 500 },
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
