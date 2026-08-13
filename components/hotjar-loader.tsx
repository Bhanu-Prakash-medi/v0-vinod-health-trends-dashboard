"use client"

import { useEffect, useState } from "react"
import Script from "next/script"

const HOTJAR_ID = process.env.NEXT_PUBLIC_HOTJAR_ID || "3765,5338202"

// Hostnames where Hotjar's CDN (static.hotjar.com) is unreachable, so loading
// it would always fail. This includes local dev and the v0 preview sandbox.
function isNonProductionHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".vusercontent.net") ||
    hostname.endsWith(".v0.dev") ||
    hostname.endsWith(".vercel.app") // preview deployments
  )
}

export default function HotjarLoader() {
  // Only decide to load on the client, after mount, so we can inspect the real
  // hostname. This keeps the external script out of the sandboxed preview
  // (where it's blocked and surfaces as an uncaught resource-load error).
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (process.env.NODE_ENV !== "production") return
    if (isNonProductionHost(window.location.hostname)) return
    setShouldLoad(true)
  }, [])

  const [hjid, hjsv] = HOTJAR_ID.split(",")

  if (!shouldLoad || !hjid) return null

  return (
    <Script
      id="hotjar-loader"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${hjid},hjsv:${hjsv || 6}};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            r.onerror=function(){/* Hotjar blocked/unreachable - handle locally so it doesn't bubble as an uncaught error */};
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `,
      }}
    />
  )
}
