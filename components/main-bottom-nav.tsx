"use client"

import type React from "react"
import { useDesign } from "@/lib/design-context"
import MainBottomNavClassic from "./main-bottom-nav-classic"
import MainBottomNavPremium from "./main-bottom-nav-premium"
export type { BottomNavItem } from "./main-bottom-nav-premium"

type Props = React.ComponentProps<typeof MainBottomNavPremium>

export default function MainBottomNav(props: Props) {
  const { design } = useDesign()
  if (design === "premium") return <MainBottomNavPremium {...props} />
  return <MainBottomNavClassic {...(props as unknown as React.ComponentProps<typeof MainBottomNavClassic>)} />
}
