"use client"

import type React from "react"

import { useState } from "react"
import { MessageSquarePlus, Star, CheckCircle2, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { trackHealthTrendsEvent } from "@/lib/snowplow"

interface FeedbackSectionProps {
  vasbenefId?: string | number
}

export default function FeedbackSection({ vasbenefId }: FeedbackSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0 && message.trim() === "") return

    trackHealthTrendsEvent(`feedback_submitted | rating:${rating} | message:${message.trim()}`, vasbenefId)
    setSubmitted(true)
  }

  return (
    <section>
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
                setRating(0)
                setHoverRating(0)
                setMessage("")
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
            {/* Star rating */}
            <div>
              <p className="mb-2 text-xs font-medium text-[#2e3742]">How would you rate this feature?</p>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Rate this feature">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]"
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    aria-checked={rating === star}
                    role="radio"
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-[#f5a623] text-[#f5a623]"
                          : "fill-transparent text-[#c9d2dc]"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

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
              disabled={rating === 0 && message.trim() === ""}
              className="w-full bg-[#156ddc] text-white hover:bg-[#1160c4] disabled:opacity-50 sm:w-auto sm:self-end"
            >
              Submit Feedback
            </Button>
          </form>
        )}
      </Card>
      )}
    </section>
  )
}
