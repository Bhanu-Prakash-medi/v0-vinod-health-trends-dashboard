"use client"

import { Flag } from "lucide-react"
import { trackHealthTrendsEvent } from "@/lib/snowplow"

interface ReportProblemButtonProps {
  /** Human-readable name of the section the report is about (e.g. "Health Summary"). */
  section?: string
  vasbenefId?: string | number
  emailId?: string
  /** Render as a floating action button pinned to the bottom of the screen. */
  floating?: boolean
  /** Compact pill for the sticky top app bar. */
  variant?: "inline" | "topbar"
  /** Top bar sits on the blue hero (premium design). */
  onDark?: boolean
}

/**
 * "Report a problem" control. Instead of opening its own form, it reuses the
 * existing Share Feedback form by dispatching the `open-feedback-form` event
 * that FeedbackSection listens for — keeping a single feedback surface.
 * Renders either inline (default) or as a floating action button (`floating`).
 */
export default function ReportProblemButton({
  section = "Health Dashboard",
  vasbenefId,
  floating = false,
  variant = "inline",
  onDark = false,
}: ReportProblemButtonProps) {
  const openFeedback = () => {
    trackHealthTrendsEvent(`report_problem_clicked | section:${section}`, vasbenefId)
    window.dispatchEvent(new CustomEvent("open-feedback-form"))
  }

  if (variant === "topbar") {
    return (
      <button
        type="button"
        onClick={openFeedback}
        aria-label="Report a problem"
        className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 ${
          onDark
            ? "bg-[#ffffff]/10 text-[#ffffff] ring-1 ring-inset ring-[#ffffff]/20 hover:bg-[#ffffff]/18 focus-visible:ring-[#ffffff]/70"
            : "bg-[#fdeceb] text-[#c9352a] hover:bg-[#fbdcd9] focus-visible:ring-[#de3d31]"
        }`}
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Report</span>
      </button>
    )
  }

  if (floating) {
    return (
      <button
        type="button"
        onClick={openFeedback}
        className="flex items-center gap-1 rounded-full bg-[#de3d31] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-[#de3d31]/25 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#de3d31] focus-visible:ring-offset-2"
        aria-label="Report a problem"
      >
        <Flag className="h-3 w-3" aria-hidden="true" />
        <span>Report</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={openFeedback}
      className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-[#9dabbd] transition-colors hover:bg-[#fdeceb] hover:text-[#de3d31] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#de3d31]"
      aria-label={`Report a problem with ${section}`}
    >
      <Flag className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Report a problem</span>
    </button>
  )
}
