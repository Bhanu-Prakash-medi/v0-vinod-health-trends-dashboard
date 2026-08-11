"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getBiomarkerExplanation } from "@/lib/biomarker-explanations"

interface BiomarkerInfoButtonProps {
  name?: string | null
  className?: string
}

/**
 * Small "i" button rendered next to a biomarker name. It only appears when a
 * matching explanation exists, and opens a dialog describing the biomarker.
 */
export default function BiomarkerInfoButton({ name, className }: BiomarkerInfoButtonProps) {
  const [open, setOpen] = useState(false)

  const explanation = getBiomarkerExplanation(name)
  if (!explanation) return null

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // Prevent triggering any parent click handlers (e.g. chart/card).
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label={`What is ${explanation.title}?`}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#9dabbd] transition-colors hover:bg-[#eaf2fe] hover:text-[#156ddc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 ${className ?? ""}`}
      >
        <Info className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[360px] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-[#f0f3f5] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf2fe] text-[#156ddc]">
                <Info className="h-4 w-4" />
              </div>
              <DialogTitle className="text-left text-base font-semibold text-[#2e3742]">
                {explanation.title}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-4">
            <p className="text-sm leading-relaxed text-[#4d5c6f]">{explanation.description}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
