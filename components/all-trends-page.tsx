"use client"

import type { ComponentProps } from "react"
import { useDesign } from "@/lib/design-context"
import AllTrendsPageClassic from "@/components/all-trends-page-classic"
import AllTrendsPagePremium from "@/components/all-trends-page-premium"

export default function AllTrendsPage(props: ComponentProps<typeof AllTrendsPageClassic>) {
  const { design } = useDesign()
  return design === "premium" ? <AllTrendsPagePremium {...props} /> : <AllTrendsPageClassic {...props} />
}
