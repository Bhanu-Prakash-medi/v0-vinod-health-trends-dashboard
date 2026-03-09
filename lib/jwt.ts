function base64UrlEncode(str: string): string {
  // Use TextEncoder for universal compatibility
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  let binary = ""
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

async function createHmacSignatureAsync(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(data)

  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData)
  return base64UrlEncodeBytes(new Uint8Array(signature))
}

// Synchronous version using Node.js crypto (for server-side)
function createHmacSignatureSync(data: string, secret: string): string {
  // Use dynamic import to avoid issues in edge runtime
  const nodeCrypto = require("crypto")
  const signature = nodeCrypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
  return signature
}

export function generateN8nJwt(): string {
  const secret = process.env.N8N_JWT_SECRET

  if (!secret) {
    throw new Error("N8N_JWT_SECRET environment variable is not set")
  }

  // JWT Header
  const header = {
    alg: "HS256",
    typ: "JWT",
  }

  // JWT Payload with expiration (5 minutes from now)
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    app: "vercel",
    iat: now,
    exp: now + 5 * 60, // 5 minutes
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))

  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const signature = createHmacSignatureSync(signatureInput, secret)

  // Combine to form JWT
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

// Async version for edge runtime compatibility
export async function generateN8nJwtAsync(): Promise<string> {
  const secret = process.env.N8N_JWT_SECRET

  if (!secret) {
    throw new Error("N8N_JWT_SECRET environment variable is not set")
  }

  // JWT Header
  const header = {
    alg: "HS256",
    typ: "JWT",
  }

  // JWT Payload with expiration (5 minutes from now)
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    app: "vercel",
    iat: now,
    exp: now + 5 * 60, // 5 minutes
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))

  // Create signature using Web Crypto API
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const signature = await createHmacSignatureAsync(signatureInput, secret)

  // Combine to form JWT
  return `${encodedHeader}.${encodedPayload}.${signature}`
}
