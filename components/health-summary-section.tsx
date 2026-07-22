"use client"

import { Activity, FileText, Heart, Droplet, Atom, TrendingUp, Candy, Beaker, Info, ChevronRight } from "lucide-react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { hasDataForCategory, getCategoryStatus, countOutOfRangeParams } from "@/lib/health-categories"

function handleViewLatestReport() {
  window.dispatchEvent(new CustomEvent("scroll-to-latest-report"))
}

interface HealthSummarySectionProps {
  patientData: any
}

const categoryIcons: Record<string, any> = {
  Heart: Heart,
  Liver: Activity,
  "Kidney & Urine": Droplet,
  Kidney: Droplet,
  Blood: Droplet,
  Thyroid: Activity,
  "Sugar/Diabetes": Candy,
  Diabetes: Candy,
  Sugar: Candy,
  "Vitamins & Minerals": Atom,
  Vitamins: Atom,
  "Gallbladder & Pancreas": FileText,
  Pancreas: FileText,
  "Body Composition": TrendingUp,
  General: Beaker,
  default: Beaker,
}

const getIconForCategory = (category: string) => {
  if (!category) return categoryIcons.default

  // Try exact match first
  if (categoryIcons[category]) {
    return categoryIcons[category]
  }
  // Try partial match
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (key !== "default" && category.toLowerCase().includes(key.toLowerCase())) {
      return icon
    }
  }
  return categoryIcons.default
}

export default function HealthSummarySection({ patientData }: HealthSummarySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<{ name: string; parameters: any[] } | null>(null)
  const latestDate = patientData?.latestReportDate || patientData?.reports?.[0]?.date || ""

  const healthSummaryFromApi = patientData?.health_summary || []

  // Parameter name normalization (same as Digital Twin)
  const normalizeParamName = (name: string): string => {
    const normalized = name.toLowerCase().trim()
    const mappings: Record<string, string> = {
      ldl: "ldl cholesterol", "ldl-cholesterol": "ldl cholesterol",
      hdl: "hdl cholesterol", "hdl-cholesterol": "hdl cholesterol",
      vldl: "vldl cholesterol", "vldl-cholesterol": "vldl cholesterol",
      triglyceride: "triglycerides", cholesterol: "total cholesterol",
      "cholesterol total": "total cholesterol", hemoglobin: "haemoglobin",
      hb: "haemoglobin", hgb: "haemoglobin", rbc: "rbc count",
      "red blood cell": "rbc count", "erythrocyte count": "rbc count",
      wbc: "total leucocyte count", "white blood cell": "total leucocyte count",
      tlc: "total leucocyte count", platelet: "platelet count", plt: "platelet count",
      pcv: "packed cell volume", hct: "packed cell volume", hematocrit: "packed cell volume",
      sgot: "sgot (ast)", ast: "sgot (ast)", "aspartate aminotransferase": "sgot (ast)",
      sgpt: "sgpt (alt)", alt: "sgpt (alt)", "alanine aminotransferase": "sgpt (alt)",
      alp: "alkaline phosphatase", ggt: "gamma glutamyltransferase", ggtp: "gamma glutamyltransferase",
      bilirubin: "bilirubin total", "total bilirubin": "bilirubin total",
      "direct bilirubin": "bilirubin direct", "indirect bilirubin": "bilirubin indirect",
      "serum creatinine": "creatinine", "blood urea": "urea", bun: "urea",
      "blood urea nitrogen": "urea", egfr: "gfr", "glomerular filtration rate": "gfr",
      fbs: "fasting blood sugar", "fasting glucose": "fasting blood sugar",
      ppbs: "post prandial blood sugar", "pp blood sugar": "post prandial blood sugar",
      rbs: "random blood sugar", "blood glucose": "glucose",
      "glycated hemoglobin": "hba1c", "glycosylated hemoglobin": "hba1c",
      "serum albumin": "albumin", "protein total": "total protein",
      "albumin/globulin ratio": "a/g ratio", "cholesterol/hdl ratio": "tc/hdl ratio",
      "vitamin d (25-oh)": "vitamin d", "25-oh vitamin d": "vitamin d",
      b12: "vitamin b12", neutrophil: "neutrophils", lymphocyte: "lymphocytes",
      eosinophil: "eosinophils", monocyte: "monocytes", basophil: "basophils",
      "mean corpuscular volume": "mcv", "mean corpuscular hemoglobin": "mch",
      "mean corpuscular hemoglobin concentration": "mchc", "red cell distribution width": "rdw",
      "rdw-cv": "rdw", "rdw-sd": "rdw", "mean platelet volume": "mpv",
      "estimated average glucose": "average blood glucose",
    }
    return mappings[normalized] || normalized
  }

  // Helper function to check parameter status (same logic as Digital Twin)
  const getParamStatus = (param: any): "normal" | "abnormal" => {
    if (!param) return "normal"

    // Check status field directly
    const status = param.status || param.Status
    if (status) {
      const statusLower = status.toString().toLowerCase()
      if (statusLower === "normal" || statusLower === "within normal limits") {
        return "normal"
      }
      return "abnormal"
    }

    // Fallback to range comparison
    const value = Number.parseFloat(param.result || param.value || param.Value || "0")
    const range = param.range || param.normal_range || param.normalRange || ""

    if (!range || isNaN(value)) return "normal"

    const rangeStr = range.toString()
    if (rangeStr.includes("-")) {
      const [min, max] = rangeStr.split("-").map((s: string) => Number.parseFloat(s.trim()))
      if (!isNaN(min) && !isNaN(max)) {
        if (value < min || value > max) return "abnormal"
      }
    }

    return "normal"
  }

  // Digital Twin parameter lists for overlapping categories
  const digitalTwinParamLists: Record<string, string[]> = {
    heart: ["Total Cholesterol", "Cholesterol", "Cholesterol Total", "HDL Cholesterol", "HDL", "HDL-Cholesterol", "LDL Cholesterol", "LDL", "LDL-Cholesterol", "Triglycerides", "Triglyceride", "VLDL Cholesterol", "VLDL", "Non-HDL Cholesterol", "TC/HDL Ratio", "Cholesterol/HDL Ratio", "LDL/HDL Ratio"],
    liver: ["Bilirubin Total", "Total Bilirubin", "Bilirubin", "Bilirubin Direct", "Direct Bilirubin", "Bilirubin Indirect", "Indirect Bilirubin", "SGOT", "AST", "SGOT (AST)", "Aspartate Aminotransferase", "SGPT", "ALT", "SGPT (ALT)", "Alanine Aminotransferase", "Alkaline Phosphatase", "ALP", "Total Protein", "Protein Total", "Albumin", "Serum Albumin", "Globulin", "A/G Ratio", "Albumin/Globulin Ratio", "Gamma Glutamyltransferase", "GGT", "GGTP"],
    kidney: ["Urea", "Blood Urea", "BUN", "Blood Urea Nitrogen", "Creatinine", "Serum Creatinine", "BUN/Creatinine Ratio", "Urea/Creatinine Ratio", "Uric Acid", "eGFR", "GFR", "Glomerular Filtration Rate"],
    blood: ["Hemoglobin", "Haemoglobin", "Hb", "HGB", "RBC", "Red Blood Cell", "Erythrocyte Count", "RBC Count", "Packed Cell Volume", "Hematocrit", "PCV", "HCT", "MCV", "Mean Corpuscular Volume", "MCH", "Mean Corpuscular Hemoglobin", "MCHC", "Mean Corpuscular Hemoglobin Concentration", "RDW", "RDW-CV", "RDW-SD", "Red Cell Distribution Width", "WBC", "White Blood Cell", "Total Leucocyte Count", "TLC", "Neutrophils", "Neutrophil", "Lymphocytes", "Lymphocyte", "Eosinophils", "Eosinophil", "Monocytes", "Monocyte", "Basophils", "Basophil", "Platelet", "Platelet Count", "PLT", "MPV", "Mean Platelet Volume", "Vitamin D", "Vitamin D (25-OH)", "25-OH Vitamin D", "Vitamin B12", "B12"],
    sugar: ["Glucose", "Blood Glucose", "Fasting Glucose", "FBS", "Fasting Blood Sugar", "PPBS", "Post Prandial Blood Sugar", "PP Blood Sugar", "Random Blood Sugar", "RBS", "HbA1c", "Glycated Hemoglobin", "Glycosylated Hemoglobin", "Average Blood Glucose", "Estimated Average Glucose"],
  }

  // Map category names to Digital Twin keys
  const getCategoryKey = (categoryName: string): string | null => {
    const name = categoryName.toLowerCase()
    if (name.includes("heart") || name.includes("cardiovascular") || name.includes("lipid")) return "heart"
    if (name.includes("liver")) return "liver"
    if (name.includes("kidney") || name.includes("renal")) return "kidney"
    if (name.includes("blood") || name.includes("cbc") || name.includes("haematology") || name.includes("hematology")) return "blood"
    if (name.includes("sugar") || name.includes("diabetes") || name.includes("glucose")) return "sugar"
    return null
  }

  // Count abnormal parameters using Digital Twin logic
  const countAbnormalParams = (categoryName: string, params: any[]): number => {
    const categoryKey = getCategoryKey(categoryName)
    
    // For non-overlapping categories, count all abnormal params
    if (!categoryKey || !digitalTwinParamLists[categoryKey]) {
      return params.filter((p: any) => getParamStatus(p) === "abnormal").length
    }

    // For overlapping categories, use Digital Twin's exact parameter list and deduplication
    const allowedParams = digitalTwinParamLists[categoryKey]
    const seenNames = new Set<string>()
    let abnormalCount = 0

    for (const param of params) {
      const paramName = param.name || param.metric_name || ""
      if (!paramName) continue

      // Check if this parameter is in Digital Twin's list
      const isAllowed = allowedParams.some(allowed => 
        allowed.toLowerCase() === paramName.toLowerCase() ||
        paramName.toLowerCase().includes(allowed.toLowerCase()) ||
        allowed.toLowerCase().includes(paramName.toLowerCase())
      )
      
      if (!isAllowed) continue

      // Deduplicate using normalized names (same as Digital Twin)
      const normalizedName = normalizeParamName(paramName)
      if (seenNames.has(normalizedName)) continue
      seenNames.add(normalizedName)

      if (getParamStatus(param) === "abnormal") {
        abnormalCount++
      }
    }

    return abnormalCount
  }

  // If we have health_summary from API, use it directly
  if (healthSummaryFromApi.length > 0) {
    return (
      <section>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-[#000000]" />
            <div>
              <h2 className="text-base font-semibold text-[#2e3742]">Health Summary</h2>
              <p className="flex items-center gap-1 text-xs text-[#9dabbd]">
                <Info className="h-3 w-3 shrink-0 text-[#9dabbd]" />
                Based on your latest health report
              </p>
            </div>
          </div>
          <button
            onClick={handleViewLatestReport}
            className="flex items-center gap-0.5 whitespace-nowrap text-xs font-medium text-[#156ddc] transition-opacity hover:opacity-80"
          >
            View latest report
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Cards Grid - from API health_summary */}
        <div className="grid grid-cols-2 py-0 gap-4">
          {healthSummaryFromApi.map((item: any, index: number) => {
            const categoryName = item.category || item.name || `Category ${index + 1}`
            const Icon = getIconForCategory(categoryName)
            
            // Recalculate status by checking all parameters (consistent with Digital Twin)
            const params = item.parameters || []
            const outOfRangeCount = countAbnormalParams(categoryName, params)
            
            // Category has warning if ANY parameter is abnormal
            const isWarning = outOfRangeCount > 0

            return (
              <Card
                key={`${categoryName}-${index}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCategory({ name: categoryName, parameters: params })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSelectedCategory({ name: categoryName, parameters: params })
                  }
                }}
                className="flex cursor-pointer items-start gap-3 border border-[#f0f3f5] p-4 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]"
              >
                <div className="rounded-lg bg-gray-50 p-2 text-[#000000]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-[#2e3742]">{categoryName}</h3>
                  {isWarning && outOfRangeCount > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                        {outOfRangeCount}
                      </span>
                      <span className="text-xs text-red-600">out of range</span>
                    </div>
                  )}
                  {!isWarning && (
                    <div className="mt-1 flex items-center gap-1">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600">
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-xs text-green-600">all in range</span>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
          <DialogContent className="max-w-[380px] gap-0 p-0">
            <DialogHeader className="border-b border-[#f0f3f5] px-4 py-3">
              <DialogTitle className="text-base font-semibold text-[#2e3742]">{selectedCategory?.name}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {selectedCategory && selectedCategory.parameters.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedCategory.parameters.map((param: any, i: number) => {
                    const paramStatus = getParamStatus(param)
                    const paramValue = param.value ?? param.result ?? "-"
                    const paramUnit = param.unit || ""
                    const paramRange = param.normal_range || param.range || ""
                    return (
                      <div
                        key={`${param.name}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#f0f3f5] bg-[#fafbfc] p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#2e3742]">{param.name}</p>
                          {paramRange && <p className="mt-0.5 text-[10px] text-[#9dabbd]">Normal: {paramRange}</p>}
                        </div>
                        <div className="flex flex-col items-end">
                          <span
                            className={`text-sm font-bold ${paramStatus === "abnormal" ? "text-[#de3d31]" : "text-[#459f49]"}`}
                          >
                            {paramValue} {paramUnit}
                          </span>
                          <span
                            className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              paramStatus === "abnormal" ? "bg-[#fef0f0] text-[#de3d31]" : "bg-[#edf7ee] text-[#459f49]"
                            }`}
                          >
                            {paramStatus === "abnormal" ? "Abnormal" : "Normal"}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-[#9dabbd]">No parameter details available.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </section>
    )
  }

  // ... existing code for fallback ...
  const healthCards = [
    { title: "Heart" as const, icon: Heart },
    { title: "Liver" as const, icon: Activity },
    { title: "Kidney & Urine" as const, icon: Droplet },
    { title: "Blood" as const, icon: Droplet },
    { title: "Thyroid" as const, icon: Activity },
    { title: "Sugar/Diabetes" as const, icon: Candy },
    { title: "Vitamins & Minerals" as const, icon: Atom },
    { title: "Gallbladder & Pancreas" as const, icon: FileText },
    { title: "Body Composition" as const, icon: TrendingUp },
  ]

  const visibleCards = healthCards.filter((card) => hasDataForCategory(card.title, patientData))

  if (visibleCards.length === 0) {
    return null
  }

  return (
    <section>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-[#000000]" />
          <div>
            <h2 className="text-base font-semibold text-[#2e3742]">Health Summary</h2>
            <p className="text-xs text-[#9dabbd]">Updated {latestDate}</p>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 py-0 gap-4">
        {visibleCards.map((card) => {
          const Icon = card.icon
          const status = getCategoryStatus(card.title, patientData)
          const outOfRangeCount = countOutOfRangeParams(card.title, patientData)

          return (
            <Card
              key={card.title}
              className="flex items-start gap-3 border border-[#f0f3f5] p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={`rounded-lg bg-gray-50 p-2 ${status === "disabled" ? "text-gray-400" : "text-[#000000]"}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-medium ${status === "disabled" ? "text-[#bcc6d1]" : "text-[#2e3742]"}`}>
                  {card.title}
                </h3>
                {status === "warning" && outOfRangeCount > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                      {outOfRangeCount}
                    </span>
                    <span className="text-xs text-red-600">out of range</span>
                  </div>
                )}
                {status === "normal" && (
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-600">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs text-green-600">all in range</span>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
