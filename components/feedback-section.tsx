"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { MessageSquarePlus, CheckCircle2, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { trackHealthTrendsEvent } from "@/lib/snowplow"
import { trackEvent } from "@/lib/analytics/posthog"
import { submitHealthFeedback } from "@/lib/api"

interface FeedbackSectionProps {
  mbUserId?: string | number
  vasbenefId?: string | number
  pmEntityId?: string | number | null
  emailId?: string
  accessToken?: string | null
}

interface FeedbackOptionSet {
  band: string
  prompt: string
  options: string[]
}

export default function FeedbackSection({
  mbUserId,
  vasbenefId,
  pmEntityId,
  emailId,
  accessToken,
}: FeedbackSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [rating, setRating] = useState(-1)
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [optionSet, setOptionSet] = useState<FeedbackOptionSet | null>(null)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const sectionRef = useRef<HTMLElement>(null)

  // Fetch the rating-band options from the server whenever a rating is picked.
  // The option catalog is server-only, so it is never exposed in the bundle.
  useEffect(() => {
    if (rating < 0) {
      setOptionSet(null)
      setSelectedReasons([])
      return
    }
    let cancelled = false
    setOptionsLoading(true)
    setSelectedReasons([])
    fetch(`/api/feedback/options?rating=${rating}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setOptionSet(data)
      })
      .catch((err) => {
        console.log("[v0] Feedback options fetch failed:", err instanceof Error ? err.message : err)
        if (!cancelled) setOptionSet(null)
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [rating])

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) => (prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]))
  }

  useEffect(() => {
    const handleOpenFeedback = () => {
      setSubmitted(false)
      setIsFormOpen(true)
      // Wait for the form to render before scrolling it into view
      window.setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    }
    window.addEventListener("open-feedback-form", handleOpenFeedback)
    return () => window.removeEventListener("open-feedback-form", handleOpenFeedback)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating < 0 && message.trim() === "" && selectedReasons.length === 0) return
    if (isSubmitting) return

    setIsSubmitting(true)

    const feedbackSaved = mbUserId
      ? await submitHealthFeedback(
          {
            mbUserId,
            vasBenefId: vasbenefId ?? null,
            pmEntityId: pmEntityId ?? null,
            email: emailId ?? "",
            rating,
            remarks: selectedReasons.join("; "),
            comment: message.trim(),
          },
          accessToken,
        )
      : false

    trackHealthTrendsEvent(
      `feedback_submitted | rating:${rating} | reasons:${selectedReasons.join("; ")} | message:${message.trim()} | saved:${feedbackSaved}`,
      vasbenefId,
    )

    // Counts feedback submissions. Only the numeric rating and whether it
    // persisted are sent — the free-text comment and selected reasons stay out
    // of PostHog because users can type anything, including health details.
    trackEvent("health_feedback_submitted", { rating, saved: feedbackSaved })

    setIsSubmitting(false)
    setSubmitted(true)
  }

  return (
    <section ref={sectionRef} className="scroll-mt-24">
      {!isFormOpen && !submitted ? (
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="gap-2 bg-[#156ddc] text-white hover:bg-[#1160c4]"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Share Feedback
          </Button>
        </div>
      ) : (
      <Card className="border border-[#f0f3f5] p-4 shadow-sm">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-6 w-6 text-[#000000]" />
            <div>
              <h2 className="text-base font-semibold text-[#2e3742]">Share Your Feedback</h2>
              <p className="text-xs text-[#9dabbd]">Help us improve this feature</p>
            </div>
          </div>
          {!submitted && (
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false)
                setRating(-1)
                setMessage("")
                setSelectedReasons([])
                setOptionSet(null)
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#9dabbd] transition-colors hover:bg-[#f0f3f5] hover:text-[#2e3742] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]"
              aria-label="Close feedback form"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#459f49]" />
            <h3 className="text-sm font-semibold text-[#2e3742]">Thank you for your feedback!</h3>
            <p className="text-xs text-[#5a6977]">Your input helps us make this experience better for everyone.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* 0-10 rating scale */}
            <div>
              <p className="mb-2 text-xs font-medium text-[#2e3742]">
                How likely are you to recommend Health Trends to a friend or colleague?
              </p>
              <div
                className="flex items-center gap-1"
                role="radiogroup"
                aria-label="Rate Health Trends from 0 to 10"
              >
                {Array.from({ length: 11 }, (_, score) => {
                  // NPS color groups: 0-6 detractors, 7-8 passives, 9-10 promoters
                  const group = score <= 6 ? "detractor" : score <= 8 ? "passive" : "promoter"
                  const base =
                    group === "detractor"
                      ? "bg-[#f3c9c9] text-[#de3d31]"
                      : group === "passive"
                        ? "bg-[#ece6b3] text-[#c07f1a]"
                        : "bg-[#d9f0c0] text-[#459f49]"
                  const selectedRing =
                    group === "detractor"
                      ? "ring-[#de3d31]"
                      : group === "passive"
                        ? "ring-[#c07f1a]"
                        : "ring-[#459f49]"
                  const isSelected = rating === score

                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setRating(score)}
                      className={`flex aspect-square min-w-0 flex-1 items-center justify-center rounded-full text-xs font-bold transition-all hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#156ddc] ${base} ${
                        isSelected ? `ring-2 ring-offset-1 ${selectedRing}` : "opacity-90 hover:opacity-100"
                      }`}
                      aria-label={`${score} out of 10`}
                      aria-checked={isSelected}
                      role="radio"
                    >
                      {score}
                    </button>
                  )
                })}
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-[#9dabbd]">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
            </div>

            {/* Rating-based multi-select reasons */}
            {rating >= 0 && (
              <div>
                {optionsLoading ? (
                  <div className="flex items-center gap-2 py-1 text-xs text-[#9dabbd]">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#e5eaf0] border-t-[#156ddc]" />
                    Loading options...
                  </div>
                ) : optionSet ? (
                  <>
                    <p className="mb-2 text-xs font-medium text-[#2e3742]">{optionSet.prompt}</p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={optionSet.prompt}>
                      {optionSet.options.map((option) => {
                        const isSelected = selectedReasons.includes(option)
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleReason(option)}
                            aria-pressed={isSelected}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#156ddc] ${
                              isSelected
                                ? "border-[#156ddc] bg-[#156ddc] text-white"
                                : "border-[#e2e8ef] bg-white text-[#4d5c6f] hover:border-[#156ddc] hover:text-[#156ddc]"
                            }`}
                          >
                            {option}
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* Message */}
            <div>
              <label htmlFor="feedback-message" className="mb-2 block text-xs font-medium text-[#2e3742]">
                Any suggestions or feedback to improve this feature?
              </label>
              <Textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you liked or what we can do better..."
                className="min-h-24 resize-none border-[#e2e8ef] text-sm text-[#2e3742] placeholder:text-[#9dabbd] focus-visible:ring-[#156ddc]"
              />
            </div>

            <Button
              type="submit"
              disabled={(rating < 0 && message.trim() === "" && selectedReasons.length === 0) || isSubmitting}
              className="w-full bg-[#156ddc] text-white hover:bg-[#1160c4] disabled:opacity-50 sm:w-auto sm:self-end"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        )}
      </Card>
      )}
    </section>
  )
}
