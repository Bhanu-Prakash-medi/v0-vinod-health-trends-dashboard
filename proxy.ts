import { NextResponse, type NextRequest } from "next/server"
import { RECOMMENDATIONS_API_URL } from "@/lib/config/api-environment"

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
