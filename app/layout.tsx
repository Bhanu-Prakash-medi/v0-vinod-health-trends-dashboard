import type React from "react"
import type { Metadata } from "next"
import { Lexend_Deca } from "next/font/google"
import HotjarLoader from "@/components/hotjar-loader"
import "./globals.css"
import InitAnalytics from "@/lib/analytics/InitAnalytics"
import { AnalyticsProvider } from "./providers"

const lexendDeca = Lexend_Deca({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Health Tracking Dashboard - Monitor Your Health Trends",
  description:
    "Track your health metrics, view test reports, and monitor your body with interactive 3D muscle analysis",
  generator: "v0.app",
  icons: {
    icon: "/medibuddy-icon.png",
    apple: "/medibuddy-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${lexendDeca.className} antialiased`}>
        <AnalyticsProvider>{children}</AnalyticsProvider>
        <InitAnalytics hotjarJS={process.env.hotjarJS} />
        <HotjarLoader />
      </body>
    </html>
  )
}
