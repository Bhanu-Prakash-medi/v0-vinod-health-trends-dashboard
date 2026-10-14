"use client"

import type { ComponentProps } from "react"
import { useDesign } from "@/lib/design-context"
import TrendsSectionClassic from "@/components/trends-section-classic"
import TrendsSectionPremium from "@/components/trends-section-premium"

export default function TrendsSection(props: ComponentProps<typeof TrendsSectionClassic>) {
  const { design } = useDesign()
  return design === "premium" ? <TrendsSectionPremium {...props} /> : <TrendsSectionClassic {...props} />
}
