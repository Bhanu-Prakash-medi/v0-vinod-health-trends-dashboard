"use client"

import type React from "react"
import { useDesign } from "@/lib/design-context"
import HealthRecommendationsSectionClassic from "./health-recommendations-section-classic"
import HealthRecommendationsSectionPremium from "./health-recommendations-section-premium"


type Props = React.ComponentProps<typeof HealthRecommendationsSectionPremium>

export default function HealthRecommendationsSection(props: Props) {
  const { design } = useDesign()
  if (design === "premium") return <HealthRecommendationsSectionPremium {...props} />
  return <HealthRecommendationsSectionClassic {...(props as unknown as React.ComponentProps<typeof HealthRecommendationsSectionClassic>)} />
}
