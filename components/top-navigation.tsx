"use client"

import { ChevronLeft } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface TopNavigationProps {
  familyMembers: Array<{
    name: string
    initial: string
    age: number
    gender: string
    image?: string
    relation?: string
  }>
  activeFamily: string
  setActiveFamily: (name: string) => void
}

export default function TopNavigation({ familyMembers, activeFamily, setActiveFamily }: TopNavigationProps) {
  return (
    <div className="bg-gradient-to-b from-[#f1f7ff] to-transparent px-4 py-6">
      {/* Family Member Chips - Dynamic from beneficiaries API */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {familyMembers.map((member) => (
          <button
            key={member.name}
            onClick={() => setActiveFamily(member.name)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all ${
              activeFamily === member.name
                ? "border-2 border-[#156ddc] bg-white text-[#156ddc] shadow-sm"
                : "border border-[#e5e7eb] bg-white text-[#6b7280] hover:bg-gray-50"
            }`}
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={member.image || "/placeholder.svg"} alt={member.name} />
              <AvatarFallback
                className={`text-[10px] ${activeFamily === member.name ? "bg-[#156ddc] text-white" : "bg-[#9ca3af] text-white"}`}
              >
                {member.initial}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[100px] truncate">{member.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
