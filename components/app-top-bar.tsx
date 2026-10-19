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
      className={`sticky top-0 z-40 flex min-h-16 items-center gap-4 px-5 py-3 md:px-8 ${
        onDark
          ? "border-b border-[#ffffff]/10 bg-[#0d4fa8] text-[#ffffff] shadow-[0_6px_18px_-10px_rgba(6,30,70,0.7)]"
          : "border-b border-[#e8edf3] bg-[#ffffff]/90 text-[#1a2433] backdrop-blur-md"
      }`}
    >
      <button
        type="button"
        onClick={navigateBack}
        aria-label="Go back"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-2 ${
          onDark
            ? "bg-[#ffffff]/10 ring-1 ring-inset ring-[#ffffff]/15 hover:bg-[#ffffff]/18 focus-visible:ring-[#ffffff]/70"
            : "bg-[#f1f5fa] hover:bg-[#e6edf6] focus-visible:ring-[#156ddc]"
        }`}
      >
        <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <h1 className="truncate text-[15px] font-semibold tracking-tight">Health Trends</h1>
        <span className={`truncate text-[11px] font-medium ${onDark ? "text-[#ffffff]/65" : "text-[#6b7686]"}`}>
          Your lab reports over time
        </span>
      </div>

      <ReportProblemButton variant="topbar" onDark={onDark} vasbenefId={vasbenefId} emailId={emailId} />
    </nav>
  )
}
