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

  return (
    <div className="relative rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(21,109,220,0.28)] ring-1 ring-[#eef2f6]">
      {/* Disclaimer: compact icon button in the top-right corner */}
      <div className="absolute right-4 top-4 z-30">
        <button
          type="button"
          onClick={() => setShowDisclaimer((v) => !v)}
          aria-label="Disclaimer"
          aria-expanded={showDisclaimer}
          title="Disclaimer"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#9aa7b5] ring-1 ring-[#e6ecf2] transition-colors hover:text-[#156ddc] hover:ring-[#156ddc]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
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
            <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-[#e0e6ec] bg-white p-3 shadow-lg">
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

      {/* Identity */}
      <div className="flex items-center gap-4 pr-10">
        <Avatar className="h-14 w-14 shrink-0 ring-4 ring-[#e8f2ff]">
          <AvatarImage src={avatarSrc || "/placeholder.svg"} alt={name} />
          <AvatarFallback className="bg-[#156ddc] text-base font-semibold text-white">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#156ddc]">{relation || "Self"}</span>
          <h2
            className="line-clamp-2 break-words text-lg font-bold leading-tight tracking-tight text-[#2e3742]"
            title={name}
          >
            {name}
          </h2>
          {metaLine && <p className="mt-0.5 text-xs text-[#4d5c6f]">{metaLine}</p>}
        </div>
      </div>

      {/* Profile completeness */}
      <div className="mt-4 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eef2f6]"
          role="progressbar"
          aria-valuenow={70}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        >
          <div className="h-full w-[70%] rounded-full bg-[#156ddc]" />
        </div>
        <span className="text-[11px] font-medium text-[#4d5c6f]">
          <span className="font-bold text-[#2e3742]">70%</span> complete
        </span>
      </div>

      {/* Stats: Records + BMI */}
      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-[#f6f9fc]">
        <div className="flex flex-col gap-1.5 p-3.5">
          <span className="text-[11px] font-medium text-[#4d5c6f]">Health Records</span>
          {countLoading ? (
            <>
              <span className="inline-block h-5 w-8 animate-pulse rounded bg-[#e8edf2]" aria-hidden="true" />
              <span className="sr-only">Loading records</span>
            </>
          ) : (
            <span className="text-xl font-bold leading-none text-[#2e3742]">{reportCount}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5 border-l border-[#e6ecf2] p-3.5">
          {bmiLabel}
          {bmiLoading ? (
            <>
              <span className="inline-block h-5 w-10 animate-pulse rounded bg-[#e8edf2]" aria-hidden="true" />
              <span className="sr-only">Loading BMI</span>
            </>
          ) : shownBmi !== null ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="text-xl font-bold leading-none text-[#2e3742]">{shownBmi.toFixed(1)}</span>
                {shownCategory && (
                  <span className="rounded-full bg-[#e8f2ff] px-1.5 py-0.5 text-[10px] font-bold text-[#156ddc]">
                    {shownCategory}
                  </span>
                )}
              </span>
              {shownBmiDate && <span className="text-[10px] text-[#9aa7b5]">as of {shownBmiDate}</span>}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowBmiForm((v) => !v)}
              aria-expanded={showBmiForm}
              className="flex items-center gap-1 self-start rounded text-sm font-semibold text-[#156ddc] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add
            </button>
          )}
        </div>
      </div>

      {showBmiForm && shownBmi === null && (
        <form className="mt-3 flex flex-col gap-2" onSubmit={handleBmiSubmit}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#4d5c6f]">Enter height &amp; weight</span>
            <button
              type="button"
              onClick={resetBmiForm}
              aria-label="Close BMI calculator"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#4d5c6f] transition-colors hover:bg-[#f0f3f5] hover:text-[#2e3742] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">Height in centimetres</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="Height (cm)"
                className="w-full rounded-xl border border-[#e0e6ec] bg-white px-3 py-2 text-xs text-[#2e3742] outline-none placeholder:text-[#9aa7b5] focus:border-[#156ddc] focus:ring-2 focus:ring-[#156ddc]/20"
              />
            </label>
            <label className="flex-1">
              <span className="sr-only">Weight in kilograms</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Weight (kg)"
                className="w-full rounded-xl border border-[#e0e6ec] bg-white px-3 py-2 text-xs text-[#2e3742] outline-none placeholder:text-[#9aa7b5] focus:border-[#156ddc] focus:ring-2 focus:ring-[#156ddc]/20"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-[#156ddc] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1160c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 disabled:cursor-not-allowed disabled:bg-[#b6cdec]"
          >
            Calculate BMI
          </button>
        </form>
      )}

      {!countLoading && reportCount > 0 && (
        <button
          type="button"
          onClick={handleViewLatestReport}
          className="group mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#156ddc] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1160c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 focus-visible:ring-offset-2"
        >
          View latest report
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
