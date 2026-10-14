"use client"

import type React from "react"
import { useDesign } from "@/lib/design-context"
import HealthScoreSectionClassic from "./health-score-section-classic"
import HealthScoreSectionPremium from "./health-score-section-premium"


type Props = React.ComponentProps<typeof HealthScoreSectionPremium>

export default function HealthScoreSection(props: Props) {
  const { design } = useDesign()
  if (design === "premium") return <HealthScoreSectionPremium {...props} />
  return <HealthScoreSectionClassic {...(props as unknown as React.ComponentProps<typeof HealthScoreSectionClassic>)} />
}
