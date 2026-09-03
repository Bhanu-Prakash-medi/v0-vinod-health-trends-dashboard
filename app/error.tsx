"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

/**
 * Route-level error boundary for the dashboard.
 *
 * Before this existed, ANY error thrown while rendering the (very large)
 * dashboard client component tree bubbled all the way to Next.js's root and
 * showed the opaque "Application error: a client-side exception has occurred"
 * message with no recovery path and no diagnostics. This boundary:
 *   - contains the failure and offers a recoverable "Try again" (reset) plus a
 *     hard reload fallback, and
 *   - logs the real error (message, digest, stack) to the console so the actual
 *     trigger can be identified from real production sessions.
 *
 * The `digest` is a stable, non-sensitive hash Next.js assigns to the error;
 * it's shown to the user so they can quote it when reporting the issue, which
 * lets us correlate with server logs.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Prefixed so it shows up in v0 debug logs and is easy to grep for.
    console.log("[v0] dashboard error boundary caught:", {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    })
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fa] p-4">
      <div className="mx-auto w-full max-w-[420px] rounded-2xl bg-white p-8 text-center shadow-sm sm:my-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fdeeee]">
          <AlertTriangle className="h-8 w-8 text-[#d64545]" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-balance text-[#2e3742]">Something went wrong</h1>
        <p className="mt-3 text-sm leading-relaxed text-pretty text-[#5a6977]">
          {
            "We hit an unexpected error while loading your Health Trends. Please try again — if it keeps happening, reopen the page from the MediBuddy app."
          }
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full rounded-full bg-[#156ddc] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full rounded-full border border-[#dbe3ea] bg-white px-4 py-2.5 text-sm font-medium text-[#2e3742] transition-colors hover:bg-[#f2f6f9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
          >
            Reload page
          </button>
        </div>

        {error?.digest ? (
          <p className="mt-4 text-[11px] text-[#93a1ad]">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}
