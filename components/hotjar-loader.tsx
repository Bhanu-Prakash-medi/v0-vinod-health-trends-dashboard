"use client"

import Script from "next/script"

const HOTJAR_ID = process.env.NEXT_PUBLIC_HOTJAR_ID || "3765,5338202"

export default function HotjarLoader() {
  const [hjid, hjsv] = HOTJAR_ID.split(",")

  if (!hjid) return null

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
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
        `,
      }}
    />
  )
}
