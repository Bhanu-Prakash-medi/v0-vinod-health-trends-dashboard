"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { trackLanding, type LandingSection } from "@/lib/analytics/posthog"

// Fires `healthtrends_landing` for the section the first time it scrolls into
// view. trackLanding itself dedupes per session, so remounts and Strict Mode
// can't record a section twice.
export function SectionViewTracker({
  section,
  children,
}: {
  section: LandingSection
  children: React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === "undefined") return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          trackLanding(section)
          observer.disconnect()
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
