import type React from "react"
import type { Metadata } from "next"
import { Lexend_Deca } from "next/font/google"
import HotjarLoader from "@/components/hotjar-loader"
import "./globals.css"
import InitAnalytics from "@/lib/analytics/InitAnalytics"

const lexendDeca = Lexend_Deca({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Health Tracking Dashboard - Monitor Your Health Trends",
  description:
    "Track your health metrics, view test reports, and monitor your body with interactive 3D muscle analysis",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
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
        {children}
        <InitAnalytics hotjarJS={process.env.hotjarJS} />
        <HotjarLoader />
      </body>
    </html>
  )
}
