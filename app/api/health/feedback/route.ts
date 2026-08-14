import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = "https://healthtrends-backend.medibuddy.in/health/feedback"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const accessToken = request.headers.get("accesstoken")

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { accesstoken: accessToken } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const text = await response.text()
    let data: unknown = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { message: text }
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("[v0] Feedback submission proxy failed:", error)
    return NextResponse.json({ message: "Unable to submit feedback" }, { status: 502 })
  }
}
