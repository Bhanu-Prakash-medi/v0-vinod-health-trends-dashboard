import { type NextRequest, NextResponse } from "next/server"
import { generateN8nJwt } from "@/lib/jwt"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const webhookUrl = body.webhookUrl

    if (!webhookUrl) {
      return NextResponse.json({ error: "webhookUrl is required in request body" }, { status: 400 })
    }

    // Generate JWT dynamically using N8N_JWT_SECRET
    const jwtToken = generateN8nJwt()

    // Forward the request to n8n webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(body.data || {}),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Error in send-to-n8n API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
