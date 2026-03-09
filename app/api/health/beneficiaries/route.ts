import { type NextRequest, NextResponse } from "next/server"
import { generateN8nJwtAsync } from "@/lib/jwt"

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, 30000)
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error")

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
      }
    }
  }

  throw lastError || new Error("Failed to fetch after retries")
}

export async function GET(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")
  const pmEntityId = request.headers.get("pmEntityId") || "0"

  if (!accessToken) {
    return NextResponse.json({ error: "Access token required" }, { status: 401 })
  }

  try {
    const jwtToken = await generateN8nJwtAsync()

    const response = await fetchWithRetry("https://n8n-public.medibuddy.in/webhook/ht/beneficiaries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accesstoken: accessToken,
        pmEntityId: pmEntityId,
        Authorization: `Bearer ${jwtToken}`,
      },
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

    const errorMessage =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Request timeout"
          : error.message
        : "Internal server error"
    return NextResponse.json(
      { error: errorMessage },
      { status: error instanceof Error && error.name === "AbortError" ? 504 : 500 },
    )
  }
}
