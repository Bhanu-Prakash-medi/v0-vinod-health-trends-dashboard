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

export function openExternalUrl(url: string): void {
  if (typeof window === "undefined" || !url) return

  // Immediate visual feedback that the tap registered.
  showOpeningOverlay()

  // 1) Preferred: open a brand-new top-level tab. In a real browser and in most
  //    WebViews this hands the URL to the system browser, which downloads
  //    attachment URLs correctly and renders normal pages.
  let opened: Window | null = null
  try {
    opened = window.open(url, "_blank", "noopener,noreferrer")
  } catch {
    opened = null
  }
  if (opened) return

  // 2) New tab was blocked (sandboxed iframe / WebView). Navigate the TOP-MOST
  //    window so the URL escapes the sandbox and the real browser handles it.
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url
      return
    }
  } catch {
    // Cross-origin top navigation isn't permitted here — fall through.
  }

  // 3) Last resort: navigate the current frame. For attachment URLs this simply
  //    triggers the download without leaving the page.
  window.location.href = url
}
