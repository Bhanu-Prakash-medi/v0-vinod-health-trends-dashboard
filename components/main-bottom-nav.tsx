"use client"

import type { LucideIcon } from "lucide-react"
import { Settings2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { trackEvent } from "@/lib/analytics/posthog"
import { useDesign } from "@/lib/design-context"
import DesignSettingsSheet from "@/components/design-settings-sheet"

export type BottomNavItem = { id: string; label: string; icon: LucideIcon }

export default function MainBottomNav({ items }: { items: BottomNavItem[] }) {
  const { design } = useDesign()
  const premium = design === "premium"
  const [active, setActive] = useState(items[0]?.id)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
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

  // Keep the active tab visible inside the horizontally scrollable strip.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-nav-id="${active}"]`)
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
  }, [active])

  const go = (id: string) => {
    setActive(id)
    trackEvent("bottom_nav_click", { section: id })
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  if (items.length < 2) return null

  const itemClass = (isActive: boolean) =>
    premium
      ? isActive
        ? "bg-[#156ddc] text-[#ffffff]"
        : "text-[#ffffff]/60"
      : isActive
        ? "bg-[#e8f2ff] text-[#156ddc]"
        : "text-[#9dabbd]"
  const labelClass = (isActive: boolean) =>
    premium ? (isActive ? "text-[#ffffff]" : "text-[#ffffff]/60") : isActive ? "text-[#156ddc]" : "text-[#6b7a8c]"

  return (
    <>
      <nav
        aria-label="Dashboard sections"
        className={
          premium
            ? "fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[420px] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
            : "fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[420px] border-t border-[#eef1f4] bg-[#ffffff] pb-[env(safe-area-inset-bottom)]"
        }
      >
        <div
          className={`flex items-stretch ${
            premium ? "rounded-3xl bg-[#0b2a5b] shadow-[0_12px_32px_-8px_rgba(11,42,91,0.55)]" : ""
          }`}
        >
          <ul ref={listRef} className="flex min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            {items.map((item) => {
              const isActive = item.id === active
              return (
                <li key={item.id} data-nav-id={item.id} className="flex min-w-16 flex-1">
                  <button
                    type="button"
                    onClick={() => go(item.id)}
                    aria-current={isActive ? "location" : undefined}
                    className="flex w-full flex-col items-center gap-1 px-1 pt-2 pb-2 focus:outline-none focus-visible:opacity-80"
                  >
                    <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${itemClass(isActive)}`}>
                      <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 2} aria-hidden="true" />
                    </span>
                    <span className={`whitespace-nowrap text-[10px] font-medium leading-none ${labelClass(isActive)}`}>
                      {item.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className={`my-2 w-px shrink-0 ${premium ? "bg-[#ffffff]/15" : "bg-[#eef1f4]"}`} aria-hidden="true" />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-haspopup="dialog"
            className="flex min-w-16 shrink-0 flex-col items-center gap-1 px-1 pt-2 pb-2 focus:outline-none focus-visible:opacity-80"
          >
            <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${itemClass(settingsOpen)}`}>
              <Settings2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className={`text-[10px] font-medium leading-none ${labelClass(settingsOpen)}`}>Design</span>
          </button>
        </div>
      </nav>
      <DesignSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
