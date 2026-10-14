"use client"

import { ArrowLeft } from "lucide-react"
import ReportProblemButton from "@/components/report-problem-button"

type NativeWindow = Window & {
  WebToNativeCommunicationInterface?: { openDeeplink: (url: string) => void }
  webkit?: { messageHandlers?: { backNavigation?: { postMessage: (message: string) => void } } }
}

const FALLBACK_URL = "https://www.medibuddy.in/"

function navigateBack() {
  const nativeWindow = window as NativeWindow
  const isAndroidApp = /Android/.test(navigator.userAgent)
  const isiOSApp = /iPhone|iPad|iPod/.test(navigator.userAgent)

  if (isAndroidApp && nativeWindow.WebToNativeCommunicationInterface) {
    nativeWindow.WebToNativeCommunicationInterface.openDeeplink("https://link.medibuddy.app/O2ihuzTJ4Ub")
  } else if (isiOSApp && nativeWindow.webkit?.messageHandlers?.backNavigation) {
    nativeWindow.webkit.messageHandlers.backNavigation.postMessage("backNavigation")
  } else {
    window.open(FALLBACK_URL)
  }
}

export default function AppTopBar({
  onDark = false,
  vasbenefId,
  emailId,
}: {
  onDark?: boolean
  vasbenefId?: string | number
  emailId?: string
}) {
  return (
    <nav
      aria-label="App"
      className={`sticky top-0 z-40 flex h-14 items-center gap-2 px-3 md:px-6 ${
        onDark
          ? "bg-[#156ddc] text-[#ffffff]"
          : "border-b border-[#e8edf3] bg-[#ffffff]/90 text-[#1a2433] backdrop-blur-md"
      }`}
    >
      <button
        type="button"
        onClick={navigateBack}
        aria-label="Go back"
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 ${
          onDark
            ? "bg-[#ffffff]/12 hover:bg-[#ffffff]/20 focus-visible:ring-[#ffffff]/70"
            : "bg-[#f1f5fa] hover:bg-[#e6edf6] focus-visible:ring-[#156ddc]"
        }`}
      >
        <ArrowLeft className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">Health Trends</h1>

      <ReportProblemButton variant="topbar" onDark={onDark} vasbenefId={vasbenefId} emailId={emailId} />
    </nav>
  )
}
