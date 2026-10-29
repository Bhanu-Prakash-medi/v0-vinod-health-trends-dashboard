import { type NextRequest, NextResponse } from "next/server"
import { HEALTHTRENDS_BACKEND_URL } from "@/lib/config/api-environment"

const PROXY_TIMEOUT_MS = 30000

/**
 * Forwards a request to the Health Trends backend with the caller's
 * `accesstoken` header (and JSON body for POST), returning the upstream status
 * and body unchanged. Exists only to avoid browser CORS restrictions.
 */
export async function forwardToBackend(request: NextRequest, path: string, method: "GET" | "POST") {
  const accessToken = request.headers.get("accesstoken")
  if (!accessToken) {
    return NextResponse.json(
      { statusCode: 401, error: "Unauthorized", message: "accesstoken header is required" },
      { status: 401 },
    )
  }

  const headers: Record<string, string> = { accesstoken: accessToken }
  const pmEntityId = request.headers.get("pmentityid")
  if (pmEntityId) headers.pmentityid = pmEntityId
  let body: string | undefined
  if (method === "POST") {
    headers["Content-Type"] = "application/json"
    body = await request.text()
  }

  try {
    const upstream = await fetch(`${HEALTHTRENDS_BACKEND_URL}${path}`, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
    })
    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    })
  } catch (error) {
    const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")
    return NextResponse.json(
      {
        statusCode: isTimeout ? 504 : 502,
        error: isTimeout ? "Gateway Timeout" : "Bad Gateway",
        message: isTimeout ? "Upstream request timed out" : "Upstream request failed",
      },
      { status: isTimeout ? 504 : 502 },
    )
  }
}
