"use client"

import { Droplet, Ruler, Weight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ProfileCardProps {
  name: string
  age: number
  gender: string
  initial: string
  reportCount: number
  profileImage: string
  bloodGroup?: string
  height?: string
  weight?: string
  abhaId?: string
  relation?: string
}

function validateWeight(weight?: string): string {
  if (!weight) return "-"

  const numericValue = Number.parseFloat(weight)
  if (isNaN(numericValue)) return "-"

  // Weight range: 20-250 kg
  if (numericValue < 20 || numericValue > 250) return "-"

  return weight
}

function validateHeight(height?: string): string {
  if (!height) return "-"

  const numericValue = Number.parseFloat(height)
  if (isNaN(numericValue)) return "-"

  // Height range: 90-250 cm
  if (numericValue < 90 || numericValue > 250) return "-"

  return height
}

export default function ProfileCard({
  name,
  age,
  gender,
  initial,
  reportCount,
  profileImage,
  bloodGroup,
  height,
  weight,
  abhaId,
  relation,
}: ProfileCardProps) {
  const validatedWeight = validateWeight(weight)
  const validatedHeight = validateHeight(height)

  const hasBloodGroup = Boolean(bloodGroup && bloodGroup.trim() && bloodGroup.trim() !== "-")
  const hasHeight = validatedHeight !== "-"
  const hasWeight = validatedWeight !== "-"
  const hasAbhaId = Boolean(abhaId && abhaId.trim() && abhaId.trim() !== "-")
  const hasAnyInfo = hasBloodGroup || hasHeight || hasWeight || hasAbhaId

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-3 border border-[#f0f3f5] py-3.5">
      {/* Header Section: Avatar + Info */}
      <div className="mb-3 flex items-start justify-between">
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
              <AvatarImage 
                src={profileImage || (gender?.toLowerCase() === "female" ? "/images/profile-female.svg" : "/images/profile-male.svg")} 
                alt={name} 
              />
              <AvatarFallback className="bg-[#156ddc] text-sm font-semibold text-white">{initial}</AvatarFallback>
            </Avatar>
            <div className="absolute -right-1 -top-1 rounded-full bg-[#156ddc] px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
              70%
            </div>
          </div>

          {/* User Info */}
          <div className="my-0 pt-0">
            <h2 className="text-base font-bold text-[#2e3742] leading-tight">{name}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-[#e8f2ff] px-1.5 py-0.5 text-[10px] font-bold text-[#156ddc]">
                {relation || "Self"}
              </span>
              <span className="text-xs text-[#4d5c6f]">
                {age > 0 ? `${age}y` : ""} {gender && gender !== "Unknown" ? gender : ""}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-[#4d5c6f]">
              <span className="font-bold text-[#2e3742]">{reportCount}</span> Health{" "}
              {reportCount === 1 ? "Record" : "Records"}
            </div>
          </div>
        </div>
      </div>

      {hasAnyInfo && (
        <div className="grid grid-cols-2 gap-2">
          {/* Blood Group */}
          {hasBloodGroup && (
            <div className="flex items-center gap-2 rounded-lg border border-[#f0f3f5] bg-[#fafbfc] p-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Droplet className="h-3.5 w-3.5 text-[#000000]" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-medium text-[#4d5c6f] truncate">Blood</div>
                <div className="text-xs font-bold text-[#2e3742]">{bloodGroup}</div>
              </div>
            </div>
          )}

          {/* Height */}
          {hasHeight && (
            <div className="flex items-center gap-2 rounded-lg border border-[#f0f3f5] bg-[#fafbfc] p-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Ruler className="h-3.5 w-3.5 text-[#000000]" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-medium text-[#4d5c6f] truncate">Height</div>
                <div className="text-xs font-bold text-[#2e3742]">{validatedHeight}</div>
              </div>
            </div>
          )}

          {/* Weight */}
          {hasWeight && (
            <div className="flex items-center gap-2 rounded-lg border border-[#f0f3f5] bg-[#fafbfc] p-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Weight className="h-3.5 w-3.5 text-[#000000]" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-medium text-[#4d5c6f] truncate">Weight</div>
                <div className="text-xs font-bold text-[#2e3742]">{validatedWeight}</div>
              </div>
            </div>
          )}

          {/* ABHA ID */}
          {hasAbhaId && (
            <div className="flex items-center gap-2 rounded-lg border border-[#f0f3f5] bg-[#fafbfc] p-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#000000]">
                  <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M7 8H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 12H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="16" cy="14" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-medium text-[#4d5c6f] truncate">ABHA ID</div>
                <div className="text-xs font-bold text-[#2e3742] truncate">{abhaId}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
