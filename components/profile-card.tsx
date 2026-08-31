"use client"

import { ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { genderAvatar } from "@/lib/health-utils"

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
}: ProfileCardProps) {
  // Pick the avatar strictly from gender via the shared helper (robust to
  // casing/whitespace/variants). Only a *real* uploaded image (not one of the
  // default gender SVGs) should override the reliable gender prop — otherwise a
  // stale/default male SVG from the report data would mask a female profile.
  const fallbackAvatar = genderAvatar(gender)
  const isDefaultAvatar =
    !profileImage || profileImage.includes("profile-male.svg") || profileImage.includes("profile-female.svg")
  const avatarSrc = isDefaultAvatar ? fallbackAvatar : profileImage

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
