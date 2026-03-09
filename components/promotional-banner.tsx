import { ChevronRight } from "lucide-react"

export default function PromotionalBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#fef0fa] to-[#fce4f2] p-4 shadow-sm">
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#2e3742]">Track your health trends</h3>
          <p className="mt-1 text-xs text-[#4d5c6f]">with a full body checkup</p>
          <button className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#8c176d]">
            BOOK NOW
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Decorative circles */}
        <div className="relative h-20 w-20">
          <div className="absolute right-0 top-0 h-12 w-12 rounded-full bg-[#E15CA7] opacity-20" />
          <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-[#86BCFF] opacity-20" />
          <div className="absolute right-2 top-8 h-8 w-8 rounded-full bg-[#FF8E93] opacity-20" />
        </div>
      </div>
    </div>
  )
}
