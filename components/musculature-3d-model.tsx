"use client"

import type React from "react"
import { useDesign } from "@/lib/design-context"
import Musculature3dModelClassic from "./musculature-3d-model-classic"
import Musculature3dModelPremium from "./musculature-3d-model-premium"


type Props = React.ComponentProps<typeof Musculature3dModelPremium>

export default function Musculature3dModel(props: Props) {
  const { design } = useDesign()
  if (design === "premium") return <Musculature3dModelPremium {...props} />
  return <Musculature3dModelClassic {...(props as unknown as React.ComponentProps<typeof Musculature3dModelClassic>)} />
}
