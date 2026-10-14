"use client"

import type React from "react"
import { useDesign } from "@/lib/design-context"
import AllParametersSectionClassic from "./all-parameters-section-classic"
import AllParametersSectionPremium from "./all-parameters-section-premium"


type Props = React.ComponentProps<typeof AllParametersSectionPremium>

export default function AllParametersSection(props: Props) {
  const { design } = useDesign()
  if (design === "premium") return <AllParametersSectionPremium {...props} />
  return <AllParametersSectionClassic {...(props as unknown as React.ComponentProps<typeof AllParametersSectionClassic>)} />
}
