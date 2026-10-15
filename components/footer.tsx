"use client"

import type React from "react"
import { useDesign } from "@/lib/design-context"
import FooterPremium from "./footer-premium"


type Props = React.ComponentProps<typeof FooterPremium>

export default function Footer(props: Props) {
  const { design } = useDesign()
  if (design === "premium") return <FooterPremium {...props} />
  return null
}
