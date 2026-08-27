"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { trackEvent, SECTION_VIEW_EVENTS, type TrendsSection } from "@/lib/analytics/posthog"

// Fires the section's `{section}_view` event (e.g. summary_view, trends_view)
// at most once per section per page session, the first time that section
// scrolls into view. Module-level (not component-level) so remounts
// (beneficiary switch, Strict Mode) don't re-fire for a section already
// recorded as viewed.
const viewedSections = new Set<TrendsSection>()

export function SectionViewTracker({
  section,
  children,
}: {
  section: TrendsSection
  children: React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (viewedSections.has(section)) return
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !viewedSections.has(section)) {
            viewedSections.add(section)
            trackEvent(SECTION_VIEW_EVENTS[section])
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.3 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [section])

  return <div ref={containerRef}>{children}</div>
}

export default SectionViewTracker
