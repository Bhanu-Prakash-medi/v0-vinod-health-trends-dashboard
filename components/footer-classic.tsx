import { Clock } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t border-[#f0f3f5] pb-6 pt-10 mt-8">
      <div className="flex items-center justify-center gap-2">
        <Clock className="h-4 w-4 text-[#000000]" />
        <span className="text-xs text-[#9dabbd]">Last synced: Just now</span>
      </div>
    </footer>
  )
}
