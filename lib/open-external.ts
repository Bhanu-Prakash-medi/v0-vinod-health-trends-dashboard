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
export function openExternalUrl(url: string): void {
  if (typeof window === "undefined" || !url) return

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
