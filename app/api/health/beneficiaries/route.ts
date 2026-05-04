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
  // Debug: log all headers
  const allHeaders: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    allHeaders[key] = key.toLowerCase().includes("token") ? value.substring(0, 10) + "..." : value
  })
  console.log("[v0] All request headers:", JSON.stringify(allHeaders))
  
  const accessToken = request.headers.get("accesstoken")
  const pmEntityId = request.headers.get("pmEntityId") || "0"
  
  console.log("[v0] Parsed accessToken:", accessToken ? accessToken.substring(0, 10) + "..." : "NULL")

  if (!accessToken) {
    console.log("[v0] accessToken is missing, returning 401")
    return NextResponse.json({ error: "Access token required" }, { status: 401 })
  }

  try {
    const jwtSecret = process.env.N8N_JWT_SECRET
    console.log("[v0] N8N_JWT_SECRET present:",jwtSecret, "length:", jwtSecret?.length || 0)
    
    const jwtToken = await generateN8nJwtAsync()
    console.log("[v0] Generated JWT token (first 50 chars):", jwtToken?.substring(0, 50) + "...")

    console.log("[v0] Beneficiaries API request - accessToken:", accessToken?.substring(0, 10) + "...", "pmEntityId:", pmEntityId)
    
    const response = await fetchWithRetry("https://n8n-public.medibuddy.in/webhook/ht/beneficiaries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accesstoken: accessToken,
        pmEntityId: pmEntityId,
        Authorization: `Bearer ${jwtToken}`,
      },
    })

    console.log("[v0] Beneficiaries API response status:", response.status)
    
    const text = await response.text()
    console.log("[v0] Beneficiaries API response text (first 500 chars):", text.substring(0, 500))

    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.log("[v0] Beneficiaries API JSON parse error, full response:", text)
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
