"use client"

/**
 * Open an external URL reliably across every environment this dashboard runs in:
 *  - a normal browser tab,
 *  - the sandboxed v0 preview iframe,
 *  - and mobile app WebViews (e.g. the MediBuddy shell).
 *
 * Why this exists: a plain `<a target="_blank">` or a bare `window.open()` is
 * silently dropped inside sandboxed iframes and mobile WebViews (there is no
 * tab concept / no native popup handler), so links and downloads never escape
 * to the real browser. For S3 report URLs that force `content-disposition=
 * attachment`, that also meant the file downloaded inside the sandbox and came
 * out broken ("can't open"). Opening a true top-level tab — and, if that is
 * blocked, navigating the top-most window — makes links open and downloads
 * behave exactly like pasting the URL directly into Chrome.
 */
/**
 * Briefly show a full-screen "Opening…" overlay so the user gets immediate
 * feedback that their tap registered. External navigation/new-tab handoff can
 * take a moment (especially inside a WebView), and without this there was no
 * visual cue at all. Built with raw DOM so it works from anywhere, regardless
 * of which component triggered the link, and auto-removes itself.
 */
function showOpeningOverlay(): void {
  if (typeof document === "undefined") return
  const existingId = "external-open-overlay"
  if (document.getElementById(existingId)) return

  const overlay = document.createElement("div")
  overlay.id = existingId
  overlay.setAttribute("role", "status")
  overlay.setAttribute("aria-live", "polite")
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.45);backdrop-filter:blur(2px);opacity:0;transition:opacity 120ms ease;"

  const card = document.createElement("div")
  card.style.cssText =
    "display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:9999px;background:#ffffff;box-shadow:0 8px 24px rgba(0,0,0,0.18);"

  const spinner = document.createElement("span")
  spinner.style.cssText =
    "width:18px;height:18px;border:2px solid #cfe0f7;border-top-color:#156ddc;border-radius:9999px;display:inline-block;animation:ext-open-spin 0.6s linear infinite;"

  const label = document.createElement("span")
  label.textContent = "Opening…"
  label.style.cssText = "font-size:14px;font-weight:600;color:#2e3742;font-family:inherit;"

  if (!document.getElementById("external-open-overlay-style")) {
    const style = document.createElement("style")
    style.id = "external-open-overlay-style"
    style.textContent = "@keyframes ext-open-spin{to{transform:rotate(360deg)}}"
    document.head.appendChild(style)
  }

  card.appendChild(spinner)
  card.appendChild(label)
  overlay.appendChild(card)
  document.body.appendChild(overlay)
  // Fade in on next frame.
  requestAnimationFrame(() => {
    overlay.style.opacity = "1"
  })

  // Auto-dismiss so it never gets stuck (e.g. if the tab opens over the app).
  window.setTimeout(() => {
    overlay.style.opacity = "0"
    window.setTimeout(() => overlay.remove(), 160)
  }, 1400)
}

/**
 * For MediBuddy deep-link targets (Book Lab Test, Online Consultation), hand
 * the URL to the native app shell via its JS bridge instead of opening a web
 * tab. Matches by host + path so it works for both http/https variants of the
 * configured URLs. Returns true when the native bridge handled the URL.
 */
function tryMediBuddyNativeBridge(url: string): boolean {
  let isDeepLinkTarget = false
  try {
    const { hostname, pathname } = new URL(url)
    isDeepLinkTarget =
      /(^|\.)medibuddy\.in$/i.test(hostname) &&
      (pathname === "/labsLandingPage" || pathname === "/ask")
  } catch {
    return false
  }
  if (!isDeepLinkTarget) return false

  const w = window as any
  // iOS bridge
  if (w.webkit?.messageHandlers?.bridgeHandler) {
    w.webkit.messageHandlers.bridgeHandler.postMessage({
      taskType: "DEEP_LINK",
      url,
    })
    return true
  }
  // Android bridge
  if (w.bridgeInterface?.performTask) {
    const callbackId = "pop_back_" + Date.now()
    w.bridgeInterface.performTask(callbackId, "DEEP_LINK", JSON.stringify({ url }))
    return true
  }
  return false
}

export function openExternalUrl(url: string): void {
  if (typeof window === "undefined" || !url) return

  // MediBuddy app WebView: hand deep-link targets to the native bridge and stop.
  if (tryMediBuddyNativeBridge(url)) return

  // Immediate visual feedback that the tap registered.
  showOpeningOverlay()

  // Open via a real anchor click with target="_blank". This is the one method
  // that works across a normal browser, the sandboxed v0 preview, and mobile
  // app WebViews: the browser/WebView opens the URL in a new tab (or hands it
  // to the system browser), and attachment URLs download correctly.
  //
  // IMPORTANT: we intentionally do NOT fall back to navigating window.top or
  // window.location. Replacing the top frame with an external URL is refused by
  // the sandbox ("This content is blocked") AND it unmounts the whole app, so
  // any follow-up UI (e.g. the "Saved to downloads" toast) would never render.
  try {
    const link = document.createElement("a")
    link.href = url
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    // Some WebViews only honor links that are actually in the DOM.
    link.style.display = "none"
    document.body.appendChild(link)
    link.click()
    // Clean up after the click has been dispatched.
    window.setTimeout(() => link.remove(), 0)
  } catch {
    // As a final, non-destructive attempt, try a plain popup. If this is also
    // blocked we do nothing further rather than replacing the current frame.
    try {
      window.open(url, "_blank", "noopener,noreferrer")
    } catch {
      /* no-op: never navigate the current/top frame */
    }
  }
}
