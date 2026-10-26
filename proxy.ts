import { NextResponse, type NextRequest } from "next/server"

const RECOMMENDATIONS_API_URL =
  process.env.RECOMMENDATIONS_API_URL || "https://healthtrends-backend.medibuddy.in/healthtrends-recommendations"

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.delete("authorization")
  const auth = process.env.RECOMMENDATIONS_API_AUTH
  if (auth) headers.set("Authorization", auth)

  return NextResponse.rewrite(RECOMMENDATIONS_API_URL, { request: { headers } })
}

export const config = {
  matcher: "/healthtrends-recommendations",
}
