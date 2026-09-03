"use client"

import { useEffect } from "react"

/**
 * Root/global error boundary. Catches errors thrown in the root layout itself
 * (e.g. analytics providers) that the route-level app/error.tsx cannot, since
 * this replaces the whole document. It must therefore render its own <html>
 * and <body>. Kept dependency-free (no shared components/fonts) so it can't
 * fail for the same reason the layout did.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.log("[v0] global error boundary caught:", {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f7f9fa",
          padding: "16px",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            borderRadius: "16px",
            backgroundColor: "#ffffff",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 600, color: "#2e3742", margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "12px", fontSize: "14px", lineHeight: 1.6, color: "#5a6977" }}>
            {
              "We hit an unexpected error while loading your Health Trends. Please try again — if it keeps happening, reopen the page from the MediBuddy app."
            }
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "24px",
              width: "100%",
              borderRadius: "9999px",
              backgroundColor: "#156ddc",
              color: "#ffffff",
              border: "none",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error?.digest ? (
            <p style={{ marginTop: "16px", fontSize: "11px", color: "#93a1ad" }}>
              Reference: <span style={{ fontFamily: "monospace" }}>{error.digest}</span>
            </p>
          ) : null}
        </div>
      </body>
    </html>
  )
}
