import { type NextRequest, NextResponse } from "next/server"
import { generateN8nJwtAsync } from "@/lib/jwt"

export async function POST(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")

  if (!accessToken) {
    return NextResponse.json({ error: "Access token required" }, { status: 401 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000)

  try {
    const body = await request.json()
    const jwtToken = await generateN8nJwtAsync()

    const response = await fetch("https://n8n-public.medibuddy.in/webhook/ht/fetchreports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accesstoken: accessToken,
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const text = await response.text()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: "Invalid response from API", details: text }, { status: 502 })
    }

    return NextResponse.json(data, { status: response.status })
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
