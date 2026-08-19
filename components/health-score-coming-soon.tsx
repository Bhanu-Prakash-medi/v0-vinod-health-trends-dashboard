import { Activity, Sparkles } from "lucide-react"

/**
 * Placeholder shown in place of the Health Risk Score for users who are not on
 * the feature allowlist. Mirrors the card styling of HealthScoreSection so the
 * layout stays consistent.
 */
export default function HealthScoreComingSoon() {
  return (
    <section
      aria-label="Health Risk Score coming soon"
      className="rounded-2xl border border-[#f0f3f5] bg-white p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-5 w-5 text-[#156ddc]" />
        <h2 className="text-base font-semibold text-[#2e3742]">Health Risk Score</h2>
      </div>

      <div className="flex flex-col items-center rounded-xl border border-dashed border-[#d5e6fb] bg-[#f7fbff] px-4 py-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#e3f0ff]">
          <Sparkles className="h-6 w-6 text-[#156ddc]" />
        </div>
        <p className="text-sm font-semibold text-[#2e3742]">Coming soon</p>
        <p className="mt-1 max-w-[280px] text-pretty text-xs leading-relaxed text-[#6b7a8d]">
          Your personalised Health Risk Score is being prepared and will be available here shortly. Please check back soon.
        </p>
      </div>
    </section>
  )
}
