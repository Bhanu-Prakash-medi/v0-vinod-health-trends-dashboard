"use client"

import { Clock } from "lucide-react"

/**
 * Full-screen placeholder shown to restricted-org users who are not on the
 * access allowlist. Mirrors the app's centered, max-width mobile column layout.
 */
export default function FeatureComingSoon() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fa] p-4">
      <div className="mx-auto w-full max-w-[420px] rounded-2xl bg-white p-8 text-center shadow-sm sm:my-8">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4fd]">
          <Clock className="h-8 w-8 text-[#156ddc]" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-balance text-[#2e3742]">Feature coming soon</h1>
        <p className="mt-3 text-sm leading-relaxed text-pretty text-[#5a6977]">
          {"We're putting the finishing touches on your Health Trends experience. It'll be available for you shortly — please check back soon."}
        </p>
      </div>
    </div>
  )
}
