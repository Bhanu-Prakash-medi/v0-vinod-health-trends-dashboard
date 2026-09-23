"use client"

import { useState } from "react"
import useSWR from "swr"
import { ChevronRight, Plus, X } from "lucide-react"
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

  const heightNum = Number.parseFloat(heightCm)
  const weightNum = Number.parseFloat(weightKg)
  const canSubmit = heightNum > 0 && weightNum > 0

  function handleBmiSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLocalBmi(weightNum / Math.pow(heightNum / 100, 2))
  }

  function resetBmiForm() {
    setShowBmiForm(false)
    setHeightCm("")
    setWeightKg("")
    setLocalBmi(null)
  }

  const backendBmi = typeof bmiData?.bmi === "number" ? bmiData.bmi : null
  const backendCategory = bmiData?.category ?? null

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-3 border border-[#f0f3f5] py-3.5">
      {/* Header Section: Avatar + Info */}
      <div className="flex gap-3">
        {/* Avatar with Progress Ring */}
        <div className="relative h-[50px] w-[50px] shrink-0">
          <svg className="h-full w-full -rotate-90 transform">
            <circle cx="25" cy="25" r="22" fill="none" stroke="#e8f2ff" strokeWidth="3" />
            <circle
              cx="25"
              cy="25"
              r="22"
              fill="none"
              stroke="#156ddc"
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 22 * 0.7} ${2 * Math.PI * 22}`}
              strokeLinecap="round"
            />
          </svg>
          <Avatar className="absolute left-1/2 top-1/2 h-[42px] w-[42px] -translate-x-1/2 -translate-y-1/2">
            <AvatarImage src={avatarSrc || "/placeholder.svg"} alt={name} />
            <AvatarFallback className="bg-[#156ddc] text-sm font-semibold text-white">{initial}</AvatarFallback>
          </Avatar>
          <div className="absolute -right-1 -top-1 rounded-full bg-[#156ddc] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
            70%
          </div>
        </div>

        {/* User Info */}
        <div className="my-0 min-w-0 flex-1 pt-0">
          <h2 className="text-base font-bold text-[#2e3742] leading-tight text-balance">{name}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded bg-[#e8f2ff] px-1.5 py-0.5 text-[10px] font-bold text-[#156ddc]">
              {relation || "Self"}
            </span>
            <span className="text-xs text-[#4d5c6f]">
              {age > 0 ? `${age}y` : ""} {gender && gender !== "Unknown" ? gender : ""}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#4d5c6f]">
            {countLoading ? (
              <>
                <span className="inline-block h-3 w-5 animate-pulse rounded bg-[#e8edf2]" aria-hidden="true" />
                <span>Health Records</span>
                <span className="sr-only">Loading records</span>
              </>
            ) : (
              <>
                <span className="font-bold text-[#2e3742]">{reportCount}</span> Health{" "}
                {reportCount === 1 ? "Record" : "Records"}
              </>
            )}
          </div>
        </div>
      </div>

      {/* BMI row */}
      <div className="mt-3 border-t border-[#f0f3f5] pt-2.5">
        {bmiLoading ? (
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-10 animate-pulse rounded bg-[#e8edf2]" aria-hidden="true" />
            <span className="text-[10px] text-[#4d5c6f]">Loading BMI</span>
          </div>
        ) : backendBmi !== null ? (
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#4d5c6f]">BMI</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-[#2e3742]">{backendBmi.toFixed(1)}</span>
              {backendCategory && (
                <span className="rounded bg-[#e8f2ff] px-1.5 py-0.5 text-[10px] font-bold text-[#156ddc]">
                  {backendCategory}
                </span>
              )}
            </span>
          </div>
        ) : showBmiForm ? (
          <form className="space-y-2" onSubmit={handleBmiSubmit}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#4d5c6f]">Calculate BMI</span>
              <div className="flex items-center gap-2">
                {localBmi !== null && (
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-[#2e3742]">{localBmi.toFixed(1)}</span>
                    <span className="rounded bg-[#e8f2ff] px-1.5 py-0.5 text-[10px] font-bold text-[#156ddc]">
                      {bmiCategory(localBmi)}
                    </span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetBmiForm}
                  aria-label="Close BMI calculator"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#4d5c6f] transition-colors hover:bg-[#f0f3f5] hover:text-[#2e3742] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <span className="sr-only">Height in centimetres</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={heightCm}
                  onChange={(e) => {
                    setHeightCm(e.target.value)
                    setLocalBmi(null)
                  }}
                  placeholder="Height (cm)"
                  className="w-full rounded-lg border border-[#e0e6ec] bg-white px-2.5 py-1.5 text-xs text-[#2e3742] outline-none placeholder:text-[#9aa7b5] focus:border-[#156ddc] focus:ring-2 focus:ring-[#156ddc]/20"
                />
              </label>
              <label className="flex-1">
                <span className="sr-only">Weight in kilograms</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={weightKg}
                  onChange={(e) => {
                    setWeightKg(e.target.value)
                    setLocalBmi(null)
                  }}
                  placeholder="Weight (kg)"
                  className="w-full rounded-lg border border-[#e0e6ec] bg-white px-2.5 py-1.5 text-xs text-[#2e3742] outline-none placeholder:text-[#9aa7b5] focus:border-[#156ddc] focus:ring-2 focus:ring-[#156ddc]/20"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg bg-[#156ddc] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1160c4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 disabled:cursor-not-allowed disabled:bg-[#b6cdec]"
            >
              Submit
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowBmiForm(true)}
            className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#156ddc]/40 bg-[#f4f9ff] px-3 py-2 text-xs font-medium text-[#156ddc] transition-colors hover:bg-[#e8f2ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"
          >
            <Plus className="h-3.5 w-3.5" />
            Add height &amp; weight to calculate BMI
          </button>
        )}
      </div>

      {/* View latest report — its own row so a long name never squeezes or
          clips it. Only shown once at least one report is available. */}
      {!countLoading && reportCount > 0 && (
        <div className="mt-3 flex justify-end border-t border-[#f0f3f5] pt-2.5">
          <button
            type="button"
            onClick={handleViewLatestReport}
            className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-medium text-[#156ddc] transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30 rounded"
          >
            View latest report
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
