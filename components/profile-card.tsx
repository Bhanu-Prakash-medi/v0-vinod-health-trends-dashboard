"use client"

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

export default function ProfileCard({
  name,
  age,
  gender,
  initial,
  reportCount,
  profileImage,
  relation,
}: ProfileCardProps) {
  // Pick the avatar strictly from gender, tolerating "Female"/"F"/"male"/"m"
  // etc. Only a female value yields the female avatar; everything else (male,
  // unknown, empty) falls back to the male avatar. A real resolved profileImage
  // still takes precedence over this.
  const normalizedGender = (gender || "").trim().toLowerCase()
  const isFemale = normalizedGender === "female" || normalizedGender === "f"
  const genderAvatar = isFemale ? "/images/profile-female.svg" : "/images/profile-male.svg"

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
              <AvatarImage src={profileImage || genderAvatar} alt={name} />
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

    </div>
  )
}
