import type { NextRequest } from "next/server"
import { forwardToBackend } from "@/lib/backend-proxy"

export async function POST(request: NextRequest) {
  return forwardToBackend(request, "/health/savefile", "POST")
}
