"use client"

import type { LucideIcon } from "lucide-react"
import { CircleHelp, Settings2 } from "lucide-react"
import { useEffect, useState } from "react"
import { trackEvent } from "@/lib/analytics/posthog"
import DesignSettingsSheet from "@/components/design-settings-sheet"
import FaqSheet from "@/components/faq-sheet"

export type BottomNavItem = { id: string; label: string; icon: LucideIcon }

export default function MainBottomNav({ items, showDesign = true }: { items: BottomNavItem[]; showDesign?: boolean }) {
  const [active, setActive] = useState(items[0]?.id)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const idsKey = items.map((i) => i.id).join("|")

  useEffect(() => {
    const els = idsKey
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: "-35% 0px -55% 0px" },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [idsKey])

  useEffect(() => {
    if (!active) return
    document
      .querySelector<HTMLElement>(`[data-nav-id="${active}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
  }, [active])

  const go = (id: string) => {
    setActive(id)
    trackEvent("bottom_nav_click", { section: id })
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (items.length < 2) return null

  return (
    <>
    <nav
      aria-label="Dashboard sections"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[420px] border-t border-[#eef1f4] bg-[#ffffff] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex overflow-x-auto overscroll-x-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isActive = item.id === active
          return (
            <li key={item.id} data-nav-id={item.id} className="flex min-w-[68px] flex-1 shrink-0">
              <button
                type="button"
                onClick={() => go(item.id)}
                aria-current={isActive ? "location" : undefined}
                className="flex w-full flex-col items-center gap-1 pt-2 pb-2 focus:outline-none focus-visible:bg-[#f7f9fa]"
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-[#e8f2ff] text-[#156ddc]" : "text-[#9dabbd]"
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 2} aria-hidden="true" />
                </span>
                <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-[#156ddc]" : "text-[#6b7a8c]"}`}>
                  {item.label}
                </span>
              </button>
            </li>
          )
        })}
        <li className="flex min-w-[68px] flex-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              trackEvent("bottom_nav_click", { section: "faq" })
              setFaqOpen(true)
            }}
            aria-haspopup="dialog"
            className="flex w-full flex-col items-center gap-1 pt-2 pb-2 focus:outline-none focus-visible:bg-[#f7f9fa]"
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                faqOpen ? "bg-[#e8f2ff] text-[#156ddc]" : "text-[#9dabbd]"
              }`}
            >
              <CircleHelp className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className={`text-[10px] font-semibold leading-none ${faqOpen ? "text-[#156ddc]" : "text-[#6b7a8c]"}`}>
              FAQ
            </span>
          </button>
        </li>
        {showDesign && (
        <li className="flex min-w-[68px] flex-1 shrink-0">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-haspopup="dialog"
            className="flex w-full flex-col items-center gap-1 pt-2 pb-2 focus:outline-none focus-visible:bg-[#f7f9fa]"
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                settingsOpen ? "bg-[#e8f2ff] text-[#156ddc]" : "text-[#9dabbd]"
              }`}
            >
              <Settings2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className={`text-[10px] font-semibold leading-none ${settingsOpen ? "text-[#156ddc]" : "text-[#6b7a8c]"}`}>
              Design
            </span>
          </button>
        </li>
        )}
      </ul>
    </nav>
    <FaqSheet open={faqOpen} onOpenChange={setFaqOpen} />
    {showDesign && <DesignSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </>
  )
}
