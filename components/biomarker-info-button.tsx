"use client"

import { useState } from "react"
import useSWR from "swr"
import { Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getParameterBandInfo, formatBandRange } from "@/lib/parameter-bands"

interface BiomarkerExplanation {
  title: string
  description: string
}

interface BiomarkerInfoButtonProps {
  name?: string | null
  gender?: string | null
  className?: string
}

// Resolves a biomarker explanation from the server-only lookup API. The full
// dataset never reaches the client; we request one name at a time and SWR
// dedupes/caches identical names across every info button on the page.
const fetcher = async (url: string): Promise<BiomarkerExplanation | null> => {
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  return data.explanation ?? null
}

/**
 * Small "i" button rendered next to a biomarker name. It only appears when a
 * matching explanation exists, and opens a dialog describing the biomarker.
 */
export default function BiomarkerInfoButton({ name, gender, className }: BiomarkerInfoButtonProps) {
  const [open, setOpen] = useState(false)

  const key = name && name.trim() ? `/api/biomarker-explanation?name=${encodeURIComponent(name)}` : null
  const { data: explanation } = useSWR<BiomarkerExplanation | null>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 24 * 60 * 60 * 1000,
  })

  // Custom color-coded band breakdown for the listed parameters (static data).
  const bandInfo = getParameterBandInfo(name, gender)

  // Show the button when we have either a server explanation OR band details.
  if (!explanation && !bandInfo) return null

  const title = explanation?.title || name || "Details"

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // Prevent triggering any parent click handlers (e.g. chart/card).
          e.stopPropagation()
          setOpen(true)
        }}
        aria-label={`What is ${title}?`}
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
                {title}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-4 p-4">
            {explanation?.description && (
              <p className="text-sm leading-relaxed text-[#4d5c6f]">{explanation.description}</p>
            )}

            {bandInfo && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9dabbd]">
                  Ranges ({bandInfo.unit})
                </p>
                <ul className="flex flex-col gap-1.5">
                  {bandInfo.ranges.map((band) => (
                    <li
                      key={band.label}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[#f0f3f5] bg-[#fafbfc] px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: band.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate text-sm font-medium text-[#2e3742]">{band.label}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold" style={{ color: band.color }}>
                        {formatBandRange(band)}
                      </span>
                    </li>
                  ))}
                </ul>
                {bandInfo.notes && (
                  <p className="mt-2 text-[11px] leading-relaxed text-[#9dabbd]">{bandInfo.notes}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
