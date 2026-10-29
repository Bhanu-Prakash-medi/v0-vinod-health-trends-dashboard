"use client"

import { useState } from "react"
import useSWR from "swr"
import { ChevronRight, Info, Plus, ShieldAlert, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { genderAvatar } from "@/lib/health-utils"
import { fetchBmi, updateBmi } from "@/lib/api"
import { trackClick } from "@/lib/analytics/posthog"

// Ask the page to scroll to (and highlight) the latest report card. The Test
// Reports section listens for this event.
function handleViewLatestReport() {
  window.dispatchEvent(new CustomEvent("scroll-to-latest-report"))
}

interface ProfileCardProps {
  name: string
  age: number
  gender: string
  initial: string
  reportCount: number
  /** True while reports are still loading/deduplicating — shows a placeholder
   *  instead of an intermediate count so the number doesn't flicker (12 -> 5 -> 3). */
  countLoading?: boolean
  profileImage: string
  bloodGroup?: string
  height?: string
  weight?: string
  abhaId?: string
  relation?: string
  /** Beneficiary vasBenefId — used to fetch BMI from GET /health/bmi/{id}. */
  vasBenefId?: string | number
  /** Access token forwarded to the BMI proxy (falls back to the debug token). */
  accessToken?: string | null
}

/** Standard WHO BMI categories used when the user calculates BMI locally. */
function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight"
  if (bmi < 25) return "Normal"
  if (bmi < 30) return "Overweight"
  return "Obese"
}

/** WHO BMI reference ranges shown in the info popover. */
const ECG_POINTS = "0,16 180,16 192,16 198,10 204,16 214,16 222,2 232,30 240,8 246,16 320,16"

// Draw-in on mount, then a bright pulse sweeps along the trace in time with a soft "breath".
const ECG_STYLES = `
.ecg-line { animation: ecg-reveal 1.4s cubic-bezier(0.65,0,0.35,1) both; }
.ecg-base { animation: ecg-breathe 2.6s ease-in-out 1.4s infinite; }
.ecg-sweep { transform: translateX(0); animation: ecg-sweep 2.6s cubic-bezier(0.45,0,0.55,1) 1.4s infinite; }
@keyframes ecg-reveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes ecg-sweep { 0% { transform: translateX(0); } 70%, 100% { transform: translateX(420px); } }
@keyframes ecg-breathe { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .ecg-line, .ecg-base, .ecg-sweep { animation: none; } }
`

const BMI_RANGES: { range: string; category: string }[] = [
  { range: "< 18.5", category: "Underweight" },
  { range: "18.5 – 24.9", category: "Normal" },
  { range: "25 – 29.9", category: "Overweight" },
  { range: "≥ 30", category: "Obese" },
]

/** Format the BMI `measuredat` timestamp as e.g. "23 Sep 2026". */
function formatBmiDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export default function ProfileCard({
  name,
  age,
  gender,
  initial,
  reportCount,
  countLoading = false,
  profileImage,
  relation,
  vasBenefId,
  accessToken,
}: ProfileCardProps) {
  // Pick the avatar strictly from gender via the shared helper (robust to
  // casing/whitespace/variants). Only a *real* uploaded image (not one of the
  // default gender SVGs) should override the reliable gender prop — otherwise a
  // stale/default male SVG from the report data would mask a female profile.
  const fallbackAvatar = genderAvatar(gender)
  const isDefaultAvatar =
    !profileImage || profileImage.includes("profile-male.svg") || profileImage.includes("profile-female.svg")
  const avatarSrc = isDefaultAvatar ? fallbackAvatar : profileImage

  // BMI comes from the backend keyed on the beneficiary's vasBenefId. Re-keying
  // on the id + token means switching family members refetches the right BMI.
  const { data: bmiData, isLoading: bmiLoading, mutate: mutateBmi } = useSWR(
    vasBenefId ? ["bmi", vasBenefId, accessToken] : null,
    () => fetchBmi(vasBenefId as string | number, accessToken),
    { revalidateOnFocus: false },
  )

  // Local calculator shown when the backend has no height/weight (bmi === null).
  const [showBmiForm, setShowBmiForm] = useState(false)
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  // BMI is computed only on Submit, not live as the user types.
  const [localBmi, setLocalBmi] = useState<number | null>(null)
  // Toggles the WHO BMI range reference popover.
  const [showBmiInfo, setShowBmiInfo] = useState(false)
  // Toggles the AI report disclaimer popover.
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  const heightNum = Number.parseFloat(heightCm)
  const weightNum = Number.parseFloat(weightKg)
  const [bmiSaving, setBmiSaving] = useState(false)
  const [bmiError, setBmiError] = useState<string | null>(null)
  const canSubmit = heightNum > 0 && weightNum > 0 && !bmiSaving && !!vasBenefId

  async function handleBmiSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !vasBenefId) return
    setBmiSaving(true)
    setBmiError(null)
    try {
      const result = await updateBmi({ vasBenefId, height: heightNum, weight: weightNum }, accessToken)
      await mutateBmi(result, { revalidate: false })
      setLocalBmi(typeof result.bmi === "number" ? result.bmi : weightNum / Math.pow(heightNum / 100, 2))
      setShowBmiForm(false)
    } catch (err) {
      setBmiError(err instanceof Error ? err.message : "Could not update BMI. Please try again.")
    } finally {
      setBmiSaving(false)
    }
  }

  function resetBmiForm() {
    setShowBmiForm(false)
    setBmiError(null)
  }

  const backendBmi = typeof bmiData?.bmi === "number" ? bmiData.bmi : null
  const backendCategory = bmiData?.category ?? null
  const backendBmiDate = formatBmiDate(bmiData?.measuredat)
  // Locally calculated BMI is measured "now".
  const localBmiDate = formatBmiDate(new Date().toISOString())

  const metaLine = [age > 0 ? `${age} yrs` : "", gender && gender !== "Unknown" ? gender : ""]
    .filter(Boolean)
    .join(" · ")

  const shownBmi = backendBmi ?? localBmi
  const shownCategory = backendBmi !== null ? backendCategory : localBmi !== null ? bmiCategory(localBmi) : null
  const shownBmiDate = backendBmi !== null ? backendBmiDate : localBmi !== null ? localBmiDate : null

  const completeness = 70
  const ringRadius = 29
  const ringCircumference = 2 * Math.PI * ringRadius
  const hasReports = !countLoading && reportCount > 0

  return (
    <div className="relative isolate rounded-[28px] p-px shadow-[0_24px_48px_-24px_rgba(6,30,74,0.85)] [background:linear-gradient(140deg,rgba(255,255,255,0.55),rgba(127,209,255,0.15)_35%,rgba(255,255,255,0.05)_60%,rgba(127,209,255,0.45))]">
      <div className="relative rounded-[27px] bg-[#071f4d] p-4 text-white">
        {/* Decorative layers are clipped separately so popovers can overflow the card. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[27px]">
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#0d3f96_0%,#082a66_45%,#061b44_100%)]" />
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#2f8cff]/30 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(115deg,#fff_0_1px,transparent_1px_9px)]" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3.5">
            <div className="relative h-[68px] w-[68px] shrink-0">
              <svg viewBox="0 0 68 68" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                <defs>
                  <linearGradient id="pc-ring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#bfe8ff" />
                    <stop offset="100%" stopColor="#3aa0ff" />
                  </linearGradient>
                </defs>
                <circle cx="34" cy="34" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                <circle
                  cx="34"
                  cy="34"
                  r={ringRadius}
                  fill="none"
                  stroke="url(#pc-ring)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringCircumference * (1 - completeness / 100)}
                />
              </svg>
              <Avatar className="absolute inset-[7px] h-[54px] w-[54px] bg-white ring-2 ring-[#071f4d]">
                <AvatarImage src={avatarSrc || "/placeholder.svg"} alt={name} />
                <AvatarFallback className="bg-white text-base font-semibold text-[#0b3a85]">{initial}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-1.5 py-px text-[9px] font-bold leading-tight text-[#0b3a85] shadow-sm">
                {completeness}%
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {/* Inline color beats the global `.ht-card h2` rule that darkened the name. */}
              <h2 className="truncate text-[19px] font-bold leading-tight tracking-tight" style={{ color: "#ffffff" }}>
                {name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#bfe8ff]">
                  {relation || "Self"}
                </span>
                {metaLine && <span className="truncate">{metaLine}</span>}
              </p>
            </div>

            <div className="relative z-30 self-start">
              <button
                type="button"
                onClick={() => {
                  trackClick("mainpage_disclaimer")
                  setShowDisclaimer((v) => !v)
                }}
                aria-label="Disclaimer"
                aria-expanded={showDisclaimer}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              </button>
              {showDisclaimer && (
                <>
                  <button
                    type="button"
                    aria-label="Close disclaimer"
                    onClick={() => setShowDisclaimer(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-[#e0e6ec] bg-white p-3 text-left shadow-lg">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#4d5c6f]">Disclaimer</span>
                      <button
                        type="button"
                        onClick={() => setShowDisclaimer(false)}
                        aria-label="Close"
                        className="flex h-4 w-4 items-center justify-center rounded-full text-[#9aa7b5] hover:text-[#2e3742]"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#4d5c6f]">
                      This report is AI-generated and for information only — it is not medical advice. Always consult a
                      doctor before acting on it. Spot something wrong? Please report it.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <svg
            aria-hidden="true"
            viewBox="0 0 320 32"
            preserveAspectRatio="none"
            className="ecg-line mt-3 h-8 w-full overflow-visible"
          >
            <style>{ECG_STYLES}</style>
            <defs>
              <linearGradient id="pc-ecg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7fd1ff" stopOpacity="0" />
                <stop offset="55%" stopColor="#7fd1ff" stopOpacity="0.9" />
                <stop offset="72%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="100%" stopColor="#7fd1ff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="pc-ecg-sweep-fill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#000" />
                <stop offset="70%" stopColor="#fff" />
                <stop offset="100%" stopColor="#000" />
              </linearGradient>
              <mask id="pc-ecg-sweep" maskUnits="userSpaceOnUse" x="-120" y="-20" width="560" height="72">
                <rect className="ecg-sweep" x="-90" y="-20" width="90" height="72" fill="url(#pc-ecg-sweep-fill)" />
              </mask>
              <filter id="pc-glow" x="-10%" y="-50%" width="120%" height="200%">
                <feGaussianBlur stdDeviation="2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <polyline
              className="ecg-base"
              fill="none"
              stroke="url(#pc-ecg)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#pc-glow)"
              vectorEffect="non-scaling-stroke"
              points={ECG_POINTS}
            />
            <polyline
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#pc-glow)"
              mask="url(#pc-ecg-sweep)"
              vectorEffect="non-scaling-stroke"
              points={ECG_POINTS}
            />
          </svg>

          <div className="mt-2 flex items-center">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">Records</span>
              {countLoading ? (
                <>
                  <span className="inline-block h-5 w-6 animate-pulse rounded bg-white/15" aria-hidden="true" />
                  <span className="sr-only">Loading records</span>
                </>
              ) : (
                <span className="text-lg font-bold leading-none tabular-nums">{reportCount}</span>
              )}
            </div>

            <span aria-hidden="true" className="mx-4 h-8 w-px bg-white/15" />

            <div className="relative z-20 flex min-w-0 flex-col gap-1">
              <span className="relative flex items-center gap-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/55">BMI</span>
                <button
                  type="button"
                  onClick={() => setShowBmiInfo((v) => !v)}
                  aria-label="BMI category ranges"
                  aria-expanded={showBmiInfo}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-white/50 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <Info className="h-3 w-3" />
                </button>
                {showBmiInfo && (
                  <>
                    <button
                      type="button"
                      aria-label="Close BMI ranges"
                      onClick={() => setShowBmiInfo(false)}
                      className="fixed inset-0 z-10 cursor-default"
                    />
                    <div className="absolute left-0 top-5 z-20 w-44 rounded-lg border border-[#e0e6ec] bg-white p-2 shadow-lg">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#4d5c6f]">
                          BMI Categories
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowBmiInfo(false)}
                          aria-label="Close"
                          className="flex h-4 w-4 items-center justify-center rounded-full text-[#9aa7b5] hover:text-[#2e3742]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <ul className="flex flex-col gap-0.5">
                        {BMI_RANGES.map((r) => (
                          <li key={r.category} className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-[#2e3742]">{r.category}</span>
                            <span className="text-[#4d5c6f]">{r.range}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </span>
              {bmiLoading ? (
                <>
                  <span className="inline-block h-5 w-8 animate-pulse rounded bg-white/15" aria-hidden="true" />
                  <span className="sr-only">Loading BMI</span>
                </>
              ) : shownBmi !== null ? (
                <span
                  className="flex items-baseline gap-1"
                  title={[shownCategory, shownBmiDate ? `as of ${shownBmiDate}` : ""].filter(Boolean).join(" · ")}
                >
                  <span className="text-lg font-bold leading-none tabular-nums">{shownBmi.toFixed(1)}</span>
                  {shownCategory && (
                    <span className="truncate text-[10px] font-semibold text-[#7fd1ff]">{shownCategory}</span>
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBmiForm((v) => !v)}
                  aria-expanded={showBmiForm}
                  className="flex items-center gap-0.5 self-start rounded text-sm font-semibold leading-none text-[#7fd1ff] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add
                </button>
              )}
            </div>

            {hasReports && (
              <button
                type="button"
                onClick={handleViewLatestReport}
                className="group ml-auto flex shrink-0 items-center gap-1 rounded-full bg-white py-2 pl-3.5 pr-2.5 text-xs font-semibold text-[#0b3a85] shadow-[0_8px_18px_-8px_rgba(127,209,255,0.7)] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7fd1ff]"
              >
                Latest report
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {showBmiForm && shownBmi === null && (
            <form className="mt-3 flex items-center gap-2" onSubmit={handleBmiSubmit}>
              <label className="min-w-0 flex-1">
                <span className="sr-only">Height in centimetres</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="Height cm"
                  className="w-full rounded-xl bg-white/10 px-3 py-2 text-xs text-white outline-none ring-1 ring-white/15 placeholder:text-white/50 focus:ring-2 focus:ring-[#7fd1ff]"
                />
              </label>
              <label className="min-w-0 flex-1">
                <span className="sr-only">Weight in kilograms</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Weight kg"
                  className="w-full rounded-xl bg-white/10 px-3 py-2 text-xs text-white outline-none ring-1 ring-white/15 placeholder:text-white/50 focus:ring-2 focus:ring-[#7fd1ff]"
                />
              </label>
              <button
                type="submit"
                disabled={!canSubmit}
                className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#0b3a85] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7fd1ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bmiSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={resetBmiForm}
                aria-label="Close BMI calculator"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
          {showBmiForm && shownBmi === null && bmiError && (
            <p role="alert" className="mt-2 text-xs text-[#ffb4b4]">
              {bmiError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
