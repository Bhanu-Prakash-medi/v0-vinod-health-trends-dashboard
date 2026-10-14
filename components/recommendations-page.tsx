"use client"

import type React from "react"
import { useDesign } from "@/lib/design-context"
import RecommendationsPageClassic from "./recommendations-page-classic"
import RecommendationsPagePremium from "./recommendations-page-premium"


type Props = React.ComponentProps<typeof RecommendationsPagePremium>

export default function RecommendationsPage(props: Props) {
  const { design } = useDesign()
  if (design === "premium") return <RecommendationsPagePremium {...props} />
  return <RecommendationsPageClassic {...(props as unknown as React.ComponentProps<typeof RecommendationsPageClassic>)} />
}
