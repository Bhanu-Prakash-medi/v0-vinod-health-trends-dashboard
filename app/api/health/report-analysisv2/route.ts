import { type NextRequest, NextResponse } from "next/server"
import { generateN8nJwtAsync } from "@/lib/jwt"

export async function POST(request: NextRequest) {
  const accessToken = request.headers.get("accesstoken")

  if (!accessToken) {
    return NextResponse.json({ error: "Access token required" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const jwtToken = await generateN8nJwtAsync()

    const response = await fetch("https://n8n-public.medibuddy.in/webhook/ht/report-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accesstoken: accessToken,
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body),
    })

    const text = await response.text()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: "Invalid response from API", details: text }, { status: 502 })
    }

    // Return the response with status code preserved (202 for Processing, 200 for Completed)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
