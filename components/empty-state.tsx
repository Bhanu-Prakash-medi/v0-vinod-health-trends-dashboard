import { FileText } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function EmptyState() {
  return (
    <Card className="border border-gray-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <FileText className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">No Reports Available</h3>
      <p className="text-sm text-gray-600">
        No health records found for this profile. Upload lab reports to view health data and trends.
      </p>
    </Card>
  )
}
