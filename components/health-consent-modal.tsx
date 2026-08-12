'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface HealthConsentModalProps {
  open: boolean
  onAgree: () => void
}

export default function HealthConsentModal({ open, onAgree }: HealthConsentModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [hasReachedEnd, setHasReachedEnd] = useState(false)
  const checkboxId = useId()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const updateScrollState = () => {
    const container = scrollContainerRef.current
    if (!container) return
    const reachedEnd = container.scrollTop + container.clientHeight >= container.scrollHeight - 8
    setHasReachedEnd(reachedEnd)
  }

  useEffect(() => {
    if (!open) return
    setIsConfirmed(false)
    setHasReachedEnd(false)
    const frame = requestAnimationFrame(updateScrollState)
    return () => cancelAnimationFrame(frame)
  }, [open])

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    if (!hasReachedEnd) return
    setIsConfirmed(checked === true)
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-hidden p-0"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle className="font-display text-xl text-foreground">Health Trends consent</DialogTitle>
            <DialogDescription className="font-body text-sm leading-relaxed text-muted-foreground">
              Please review the disclaimer and consent information before continuing.
            </DialogDescription>
          </DialogHeader>

          <div ref={scrollContainerRef} onScroll={updateScrollState} className="min-h-0 flex-1 overflow-y-auto px-6 py-5 font-body text-sm leading-relaxed text-foreground">
            <section aria-labelledby="health-disclaimer-heading" className="space-y-3">
              <h2 id="health-disclaimer-heading" className="font-display text-base font-semibold text-foreground">Disclaimer</h2>
              <p>
                This report is system-generated. The insights, trends, and recommendations are intended for informational purposes only and should not be considered medical or clinical advice. Please consult a qualified doctor for medical advice or before acting on any recommendation. If you notice any incorrect or unexpected information, please report it.
              </p>
            </section>

            <section aria-labelledby="health-consent-heading" className="mt-6 space-y-3">
              <h2 id="health-consent-heading" className="font-display text-base font-semibold text-foreground">User Consent</h2>
              <p>
                By proceeding, you consent to MediBuddy accessing and processing your health reports solely for the purpose of generating your Health Trends and Overall Health Risk Score.
              </p>
              <p>Your health reports and personal health information will:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Be accessed and processed only by authorized MediBuddy systems and personnel where required, for service delivery and quality assurance.</li>
                <li>Not be shared with or accessed by any third-party vendors for processing or analysis.</li>
                <li>Not be accessible to your employer, managers, HR teams, or any other employees.</li>
                <li>Be handled and protected in accordance with applicable data privacy and security standards to ensure the confidentiality of your personal health information.</li>
                <li>Your health data remains private and will only be used to provide you with personalized health insights within the MediBuddy platform.</li>
              </ul>
            </section>

          </div>

          <div className="shrink-0 border-t border-border bg-background px-6 py-4">
            <div className="rounded-md border border-border bg-muted p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={checkboxId}
                  checked={isConfirmed}
                  disabled={!hasReachedEnd}
                  onCheckedChange={handleCheckboxChange}
                  aria-describedby={`${checkboxId}-label`}
                />
                <label
                  id={`${checkboxId}-label`}
                  htmlFor={checkboxId}
                  className={hasReachedEnd ? 'cursor-pointer text-sm leading-relaxed text-foreground' : 'cursor-not-allowed text-sm leading-relaxed text-muted-foreground'}
                >
                  I confirm that I have the necessary consent to upload and manage my own and my family members&apos; health reports.
                </label>
              </div>
              {!hasReachedEnd && <p className="mt-2 pl-7 text-xs text-muted-foreground">Scroll to the end to enable confirmation.</p>}
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" size="lg" disabled={!isConfirmed} onClick={onAgree}>Agree and continue</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
