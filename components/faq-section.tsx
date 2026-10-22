"use client"

import { useMemo, useState } from "react"
import { ArrowRight, CircleHelp, Search, X } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { trackEvent } from "@/lib/analytics/posthog"
import { ALL_FAQS, FAQ_GROUPS, type FaqItem } from "@/lib/faq-data"

const PREVIEW_COUNT = 4

function FaqAccordion({ items, onOpen }: { items: FaqItem[]; onOpen?: (id: string) => void }) {
  return (
    <Accordion
      type="single"
      collapsible
      className="flex flex-col gap-2"
      onValueChange={(value) => value && onOpen?.(value)}
    >
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          value={item.id}
          className="rounded-2xl border border-[#e6ebf3] bg-[#f7f9fc] px-4 transition-colors last:border-b data-[state=open]:border-[#c9d8f5] data-[state=open]:bg-white data-[state=open]:shadow-[0_8px_24px_-14px_rgb(42_86_198/0.35)]"
        >
          <AccordionTrigger className="gap-3 py-4 text-left text-sm font-semibold leading-snug text-[#2e3742] hover:no-underline [&>svg]:text-[#2a56c6]">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-sm leading-relaxed text-[#5b6675] text-pretty">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default function FaqSection() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FAQ_GROUPS
    return FAQ_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => i.question.toLowerCase().includes(q) || i.answer.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0)
  }, [query])

  const handleQuestionOpen = (id: string) => trackEvent("faq_question_open", { question_id: id })

  const openAll = () => {
    trackEvent("faq_view_all_click", {})
    setOpen(true)
  }

  return (
    <section aria-labelledby="faq-heading" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf0fc] text-[#2a56c6]">
          <CircleHelp className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 id="faq-heading" className="text-base font-semibold text-[#2e3742] text-balance">
            Frequently asked questions
          </h2>
          <p className="text-sm text-[#5b6675]">Understanding your health score and reports</p>
        </div>
      </div>

      <FaqAccordion items={ALL_FAQS.slice(0, PREVIEW_COUNT)} onOpen={handleQuestionOpen} />

      <button
        type="button"
        onClick={openAll}
        className="group flex items-center justify-between rounded-2xl bg-[#2a56c6] px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2249ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2a56c6] focus-visible:ring-offset-2"
      >
        <span>View all {ALL_FAQS.length} questions</span>
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[92dvh] max-w-md flex-col gap-0 rounded-t-3xl border-0 bg-[#f4f6fa] p-0 [&>button:last-child]:hidden"
        >
          <SheetHeader className="gap-3 rounded-t-3xl bg-[#2a56c6] px-5 pb-5 pt-3 text-left">
            <div className="mx-auto h-1 w-10 rounded-full bg-white/40" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <SheetTitle className="text-lg font-semibold text-white text-balance">Help & FAQs</SheetTitle>
                <SheetDescription className="text-sm text-white/75">
                  Everything you need to know about your MediBuddy Health Risk Score.
                </SheetDescription>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5">
              <Search className="size-4 shrink-0 text-[#8a94a3]" aria-hidden="true" />
              <span className="sr-only">Search questions</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions"
                className="w-full bg-transparent text-sm text-[#2e3742] placeholder:text-[#8a94a3] focus:outline-none"
              />
            </label>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
            {filteredGroups.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#5b6675]">
                No questions match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.id} className="flex flex-col gap-3">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#2a56c6]">
                    {group.title}
                    <span className="rounded-full bg-[#eaf0fc] px-2 py-0.5 text-[10px] font-semibold tracking-normal">
                      {group.items.length}
                    </span>
                  </h3>
                  <FaqAccordion items={group.items} onOpen={handleQuestionOpen} />
                </div>
              ))
            )}
            <p className="pb-2 text-center text-xs leading-relaxed text-[#8a94a3] text-pretty">
              The MHRS complements, not replaces, clinical judgement. Always consult a doctor for diagnosis and
              treatment.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}
