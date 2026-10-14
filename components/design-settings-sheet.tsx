"use client"

import { Check } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { type DesignVariant, useDesign } from "@/lib/design-context"
import { trackEvent } from "@/lib/analytics/posthog"

const OPTIONS: { id: DesignVariant; name: string; description: string }[] = [
  { id: "classic", name: "Classic", description: "Clean and light, the original layout" },
  { id: "premium", name: "Premium", description: "MediBuddy navy hero with elevated cards" },
]

function ClassicPreview() {
  return (
    <div className="flex h-full flex-col gap-1.5 bg-[#f7f9fa] p-2.5" aria-hidden="true">
      <div className="h-2 w-10 rounded-full bg-[#156ddc]/30" />
      <div className="flex h-7 items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-[#ffffff] px-1.5">
        <div className="h-3.5 w-3.5 rounded-full bg-[#e8f2ff]" />
        <div className="h-1.5 w-10 rounded-full bg-[#d6dde6]" />
      </div>
      <div className="grid flex-1 grid-cols-2 gap-1.5">
        <div className="rounded-md border border-[#e5e7eb] bg-[#ffffff]" />
        <div className="rounded-md border border-[#e5e7eb] bg-[#ffffff]" />
      </div>
    </div>
  )
}

function PremiumPreview() {
  return (
    <div className="relative flex h-full flex-col bg-[#eef3fa]" aria-hidden="true">
      <div className="flex h-12 flex-col gap-1 rounded-b-xl bg-[#156ddc] p-2.5">
        <div className="h-1.5 w-8 rounded-full bg-[#ffffff]/40" />
        <div className="h-2 w-14 rounded-full bg-[#ffffff]/80" />
      </div>
      <div className="-mt-3 flex flex-1 flex-col gap-1.5 px-2.5 pb-2.5">
        <div className="flex h-7 items-center gap-1.5 rounded-lg bg-[#ffffff] px-1.5 shadow-sm">
          <div className="h-3.5 w-3.5 rounded-full bg-[#156ddc]" />
          <div className="h-1.5 w-10 rounded-full bg-[#d6dde6]" />
        </div>
        <div className="flex-1 rounded-lg bg-[#ffffff] shadow-sm" />
      </div>
    </div>
  )
}

export default function DesignSettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { design, setDesign } = useDesign()

  const choose = (id: DesignVariant) => {
    if (id !== design) trackEvent("design_variant_change", { variant: id })
    setDesign(id)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-[420px] rounded-t-3xl border-0 bg-[#ffffff] px-5 pb-8">
        <SheetHeader className="px-0 pb-2 text-left">
          <SheetTitle className="text-lg font-semibold text-[#2e3742]">Appearance</SheetTitle>
          <SheetDescription className="text-sm text-[#6b7a8c]">Choose how your health dashboard looks.</SheetDescription>
        </SheetHeader>

        <div role="radiogroup" aria-label="Dashboard design" className="grid grid-cols-2 gap-3">
          {OPTIONS.map((opt) => {
            const selected = design === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(opt.id)}
                className={`flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc] focus-visible:ring-offset-2 ${
                  selected ? "border-[#156ddc]" : "border-[#e5eaf0] hover:border-[#c5d3e3]"
                }`}
              >
                <div className="h-28 w-full sm:h-36">{opt.id === "classic" ? <ClassicPreview /> : <PremiumPreview />}</div>
                <div className="flex items-start justify-between gap-2 border-t border-[#eef1f4] p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2e3742]">{opt.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[#6b7a8c] text-pretty">{opt.description}</p>
                  </div>
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      selected ? "bg-[#156ddc] text-[#ffffff]" : "border border-[#c5d3e3]"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
