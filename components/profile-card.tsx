"use client"

import { useState } from "react"
import useSWR from "swr"
import { ChevronRight, Info, Plus, ShieldAlert, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { genderAvatar } from "@/lib/health-utils"
import { fetchBmi } from "@/lib/api"

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
  const { data: bmiData, isLoading: bmiLoading } = useSWR(
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

  // "BMI" label with an info button + click-to-toggle range popover. Reused by
  // both the backend and locally-calculated BMI displays.
  const bmiLabel = (
    <span className="relative flex items-center gap-1">
      <span className="text-[11px] font-medium text-[#4d5c6f]">BMI</span>
      <button
        type="button"
        onClick={() => setShowBmiInfo((v) => !v)}
        aria-label="BMI category ranges"
        aria-expanded={showBmiInfo}
        className="flex h-4 w-4 items-center justify-center rounded-full text-[#9aa7b5] transition-colors hover:text-[#156ddc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {showBmiInfo && (
        <>
          {/* Click-away layer to dismiss the popover. */}
          <button
            type="button"
            aria-label="Close BMI ranges"
            onClick={() => setShowBmiInfo(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute bottom-6 left-0 z-20 w-44 rounded-lg border border-[#e0e6ec] bg-white p-2 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#4d5c6f]">BMI Categories</span>
              <button
                type="button"
                onClick={() => setShowBmiInfo(false)}
                aria-label="Close"
                className="flex h-4 w-4 items-center justify-center rounded-full text-[#9aa7b5] hover:text-[#2e3742]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <ul className="space-y-0.5">
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
  )

  const heightNum = Number.parseFloat(heightCm)
  const weightNum = Number.parseFloat(weightKg)
  const canSubmit = heightNum > 0 && weightNum > 0

  function handleBmiSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    // Persist the computed BMI and collapse the form — once added, the profile
    // shows the BMI value instead of the "add height & weight" prompt again.
    setLocalBmi(weightNum / Math.pow(heightNum / 100, 2))
    setShowBmiForm(false)
  }

  function resetBmiForm() {
    setShowBmiForm(false)
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
  const ringRadius = 27
  const ringCircumference = 2 * Math.PI * ringRadius
  const hasReports = !countLoading && reportCount > 0

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#0e3a7e] p-4 text-white shadow-[0_18px_40px_-20px_rgba(14,58,126,0.75)] ring-1 ring-white/10">
      {/* Identity row */}
      <div className="flex items-center gap-3.5">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
            <circle
              cx="32"
              cy="32"
              r={ringRadius}
              fill="none"
              stroke="#7fd1ff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringCircumference * (1 - completeness / 100)}
            />
          </svg>
          <Avatar className="absolute inset-1.5 h-[52px] w-[52px] bg-white">
            <AvatarImage src={avatarSrc || "/placeholder.svg"} alt={name} />
            <AvatarFallback className="bg-white text-base font-semibold text-[#0e3a7e]">{initial}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#7fd1ff] px-1.5 py-px text-[9px] font-bold leading-tight text-[#0e3a7e]">
            {completeness}%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7fd1ff]">{relation || "Self"}</span>
          <h2 className="truncate text-lg font-bold leading-tight tracking-tight" title={name}>
            {name}
          </h2>
          {metaLine && <p className="mt-0.5 text-xs text-white/70">{metaLine}</p>}
        </div>

        <div className="relative z-30 self-start">
          <button
            type="button"
            onClick={() => setShowDisclaimer((v) => !v)}
            aria-label="Disclaimer"
            aria-expanded={showDisclaimer}
            title="Disclaimer"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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

      {/* Stat strip: Records | BMI | Latest report */}
      <div
        className={`mt-4 grid divide-x divide-white/10 rounded-2xl bg-white/[0.07] ring-1 ring-white/10 ${
          hasReports ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <div className="flex flex-col gap-1 px-3 py-2.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">Records</span>
          {countLoading ? (
            <>
              <span className="inline-block h-5 w-6 animate-pulse rounded bg-white/15" aria-hidden="true" />
              <span className="sr-only">Loading records</span>
            </>
          ) : (
            <span className="text-lg font-bold leading-none">{reportCount}</span>
          )}
        </div>

        <div className="flex flex-col gap-1 px-3 py-2.5">
          <span className="relative flex items-center gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">BMI</span>
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
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#4d5c6f]">BMI Categories</span>
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
              <span className="text-lg font-bold leading-none">{shownBmi.toFixed(1)}</span>
              {shownCategory && <span className="truncate text-[10px] font-semibold text-[#7fd1ff]">{shownCategory}</span>}
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
            className="group flex flex-col gap-1 rounded-r-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">Latest</span>
            <span className="flex items-center gap-0.5 text-sm font-semibold leading-none">
              Report
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
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
            className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#0e3a7e] transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7fd1ff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
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
    </div>
  )
}
