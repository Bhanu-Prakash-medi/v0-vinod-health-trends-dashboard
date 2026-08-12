"use client"

import type React from "react"
import { useState } from "react"
import { Flag, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { trackHealthTrendsEvent } from "@/lib/snowplow"

interface ReportProblemButtonProps {
  /** Human-readable name of the section the report is about (e.g. "Health Summary"). */
  section: string
  vasbenefId?: string | number
  emailId?: string
}

/**
 * Compact "Report a problem" control shown in section headers. Opens a dialog
 * where the user describes an issue with that section. On submit it tracks the
 * report via Snowplow and posts to the shared health-trends feedback webhook,
 * tagged with the originating section so reports can be triaged per feature.
 */
export default function ReportProblemButton({ section, vasbenefId, emailId }: ReportProblemButtonProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetAndClose = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      // Reset after the close animation so the form doesn't flicker while closing.
      window.setTimeout(() => {
        setMessage("")
        setSubmitted(false)
        setIsSubmitting(false)
      }, 200)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() === "" || isSubmitting) return

    setIsSubmitting(true)
    trackHealthTrendsEvent(`problem_reported | section:${section} | message:${message.trim()}`, vasbenefId)

    try {
      await fetch("https://n8n-swift.medibuddy.in/webhook/health-trends-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "problem_report",
          section,
          feedbackMessage: message.trim(),
          emailId: emailId || "",
        }),
      })
    } catch (err) {
      console.log("[v0] Problem report submit failed:", err instanceof Error ? err.message : err)
    } finally {
      // Always show the thank-you state so the experience is never blocked.
      setIsSubmitting(false)
      setSubmitted(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-[#9dabbd] transition-colors hover:bg-[#fdeceb] hover:text-[#de3d31] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#de3d31]"
          aria-label={`Report a problem with ${section}`}
        >
          <Flag className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Report a problem</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#2e3742]">
            <Flag className="h-5 w-5 text-[#de3d31]" />
            Report a problem
          </DialogTitle>
          <DialogDescription className="text-[#5a6977]">
            {submitted
              ? ""
              : `Noticed something wrong with the ${section} section? Let us know and we'll look into it.`}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#459f49]" />
            <h3 className="text-sm font-semibold text-[#2e3742]">Thanks for reporting!</h3>
            <p className="text-xs text-[#5a6977]">
              Your report about {section} has been received. We&apos;ll use it to fix the issue.
            </p>
            <Button
              type="button"
              onClick={() => resetAndClose(false)}
              className="mt-2 bg-[#156ddc] text-white hover:bg-[#1160c4]"
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor={`problem-message-${section}`} className="mb-2 block text-xs font-medium text-[#2e3742]">
                What went wrong?
              </label>
              <Textarea
                id={`problem-message-${section}`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Describe the issue you found in ${section}...`}
                className="min-h-24 resize-none border-[#e2e8ef] text-sm text-[#2e3742] placeholder:text-[#9dabbd] focus-visible:ring-[#156ddc]"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={message.trim() === "" || isSubmitting}
              className="w-full bg-[#156ddc] text-white hover:bg-[#1160c4] disabled:opacity-50 sm:w-auto sm:self-end"
            >
              {isSubmitting ? "Submitting..." : "Submit report"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
