"use client"

import type React from "react"
import { useDesign } from "@/lib/design-context"
import AllParametersPageClassic from "./all-parameters-page-classic"
import AllParametersPagePremium from "./all-parameters-page-premium"


type Props = React.ComponentProps<typeof AllParametersPagePremium>

export default function AllParametersPage(props: Props) {
  const { design } = useDesign()
  if (design === "premium") return <AllParametersPagePremium {...props} />
  return <AllParametersPageClassic {...(props as unknown as React.ComponentProps<typeof AllParametersPageClassic>)} />
}
