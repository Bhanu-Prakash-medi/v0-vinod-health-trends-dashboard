"use client"

import { Sparkles, Info, HeartPulse, Apple, Dumbbell, Droplet, Moon, Stethoscope } from "lucide-react"
import { Card } from "@/components/ui/card"
import type { ApiHealthReport } from "@/lib/api"

interface HealthRecommendationsSectionProps {
  patientData: ApiHealthReport
}

interface Recommendation {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

function isAbnormal(status: string | undefined): boolean {
  const s = (status || "normal").toLowerCase()
  return s !== "normal" && s !== "in range" && s !== "in_range" && s !== "within normal limits"
}

function normalizeCategory(name: string): string {
  const n = (name || "").toLowerCase()
  if (n.includes("heart") || n.includes("cardio") || n.includes("lipid") || n.includes("cholesterol")) return "heart"
  if (n.includes("liver")) return "liver"
  if (n.includes("kidney") || n.includes("renal") || n.includes("urine")) return "kidney"
  if (n.includes("sugar") || n.includes("diabetes") || n.includes("glucose")) return "sugar"
  if (n.includes("thyroid")) return "thyroid"
  if (n.includes("vitamin") || n.includes("mineral")) return "vitamins"
  if (n.includes("blood") || n.includes("cbc") || n.includes("hemat") || n.includes("haemat")) return "blood"
  return "general"
}

const categoryRecommendations: Record<string, Recommendation> = {
  heart: {
    id: "heart",
    title: "Support Your Heart Health",
    description:
      "Some heart-related markers are out of range. Reduce saturated fats and fried foods, add more fiber-rich vegetables, and aim for 30 minutes of brisk walking most days.",
    icon: <HeartPulse className="h-5 w-5" />,
  },
  liver: {
    id: "liver",
    title: "Care for Your Liver",
    description:
      "Liver markers need attention. Limit alcohol, avoid processed and high-sugar foods, and stay hydrated to help your liver function better.",
    icon: <Apple className="h-5 w-5" />,
  },
  kidney: {
    id: "kidney",
    title: "Protect Your Kidneys",
    description:
      "Kidney-related values are slightly off. Stay well hydrated, moderate your salt and protein intake, and monitor your blood pressure regularly.",
    icon: <Droplet className="h-5 w-5" />,
  },
  sugar: {
    id: "sugar",
    title: "Manage Your Blood Sugar",
    description:
      "Your sugar levels are outside the normal range. Cut back on refined carbs and sugary drinks, eat balanced meals, and stay physically active.",
    icon: <Apple className="h-5 w-5" />,
  },
  thyroid: {
    id: "thyroid",
    title: "Monitor Your Thyroid",
    description:
      "Thyroid markers are out of range. Maintain a consistent routine, follow up with your physician, and ensure adequate iodine and selenium in your diet.",
    icon: <Stethoscope className="h-5 w-5" />,
  },
  vitamins: {
    id: "vitamins",
    title: "Restore Vitamin & Mineral Levels",
    description:
      "Certain vitamins or minerals are low. Consider sunlight exposure for Vitamin D, a nutrient-rich diet, and discuss supplements with your doctor.",
    icon: <Sparkles className="h-5 w-5" />,
  },
  blood: {
    id: "blood",
    title: "Improve Your Blood Health",
    description:
      "Some blood parameters are out of range. Include iron and B12-rich foods, stay hydrated, and get proper rest to support healthy blood counts.",
    icon: <Droplet className="h-5 w-5" />,
  },
  general: {
    id: "general",
    title: "Adopt Healthier Habits",
    description:
      "A few markers need attention. Focus on a balanced diet, regular exercise, and consistent sleep to improve your overall wellbeing.",
    icon: <Dumbbell className="h-5 w-5" />,
  },
}

function generateRecommendations(patientData: ApiHealthReport): Recommendation[] {
  const healthSummary = patientData?.health_summary || []
  const abnormalCategoryKeys = new Set<string>()

  for (const category of healthSummary) {
    const params = category.parameters || []
    const hasAbnormal = params.some((p: any) => isAbnormal(p.status))
    if (hasAbnormal) {
      abnormalCategoryKeys.add(normalizeCategory(category.category || category.name || ""))
    }
  }

  const recommendations: Recommendation[] = []
  for (const key of abnormalCategoryKeys) {
    if (categoryRecommendations[key]) {
      recommendations.push(categoryRecommendations[key])
    }
  }

  // If everything is in range, show a positive maintenance recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      id: "healthy",
      title: "You're On Track!",
      description:
        "All your latest parameters are within the normal range. Keep up your balanced diet, regular activity, and good sleep to stay healthy.",
      icon: <HeartPulse className="h-5 w-5" />,
    })
    recommendations.push({
      id: "sleep",
      title: "Prioritize Rest & Recovery",
      description:
        "Aim for 7-8 hours of quality sleep each night and manage stress with mindfulness or light activity to maintain your good health.",
      icon: <Moon className="h-5 w-5" />,
    })
  }

  return recommendations
}

export default function HealthRecommendationsSection({ patientData }: HealthRecommendationsSectionProps) {
  const recommendations = generateRecommendations(patientData)
  const latestDate = patientData?.latestReportDate || patientData?.lab_reports?.[0]?.report_date || ""

  if (recommendations.length === 0) return null

  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-[#000000]" />
        <div>
          <h2 className="text-base font-semibold text-[#2e3742]">Recommendations</h2>
          <p className="text-xs text-[#9dabbd]">{latestDate ? `Based on your report from ${latestDate}` : "Based on your latest report"}</p>
        </div>
      </div>

      {/* AI Disclaimer */}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#fde8c9] bg-[#fff8ee] p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#d97706]" />
        <p className="text-[11px] leading-relaxed text-[#8a6d3b]">
          These recommendations are AI-generated based on your report and may not be fully accurate. Please consult a
          qualified doctor before acting on any suggestion.
        </p>
      </div>

      {/* Recommendation Cards */}
      <div className="flex flex-col gap-3">
        {recommendations.map((rec) => (
          <Card key={rec.id} className="flex items-start gap-3 border border-[#f0f3f5] p-4 shadow-sm">
            <div className="rounded-lg bg-gray-50 p-2 text-[#156ddc]">{rec.icon}</div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-[#2e3742]">{rec.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#5a6977]">{rec.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
