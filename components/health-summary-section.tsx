"use client"

import type React from "react"
import { useDesign } from "@/lib/design-context"
import HealthSummarySectionClassic from "./health-summary-section-classic"
import HealthSummarySectionPremium from "./health-summary-section-premium"


type Props = React.ComponentProps<typeof HealthSummarySectionPremium>

export default function HealthSummarySection(props: Props) {
  const { design } = useDesign()
  if (design === "premium") return <HealthSummarySectionPremium {...props} />
  return <HealthSummarySectionClassic {...(props as unknown as React.ComponentProps<typeof HealthSummarySectionClassic>)} />
}
