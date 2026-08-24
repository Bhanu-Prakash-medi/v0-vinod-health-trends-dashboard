"use client"

// Health Summary section: per-category health cards plus a date dropdown for
// reviewing historical summaries.
import {
  Activity,
  HeartPulse,
  Droplet,
  Droplets,
  Gauge,
  Candy,
  Pill,
  FlaskConical,
  Bean,
  Scale,
  Brain,
  Bone,
  Wind,
  Dna,
  Stethoscope,
  Info,
  Calendar,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { hasDataForCategory, getCategoryStatus, countOutOfRangeParams } from "@/lib/health-categories"
import { paramHasRange } from "@/lib/health-utils"
import { getParameterBand, getParameterNormalRange } from "@/lib/parameter-bands"
import { resolveParameterStatus } from "@/lib/parameter-status"
import BiomarkerInfoButton from "@/components/biomarker-info-button"

// Format the latest report date into a readable "12 Dec 2025" label.
// Handles ISO strings, dd/mm/yyyy, and already-formatted values gracefully.
function formatSummaryDate(raw: string): string {
  if (!raw) return ""
  let date = new Date(raw)
  if (isNaN(date.getTime())) {
    const parts = raw.split(/[/-]/).map((p) => p.trim())
    if (parts.length === 3) {
      const [a, b, c] = parts
      // Assume dd/mm/yyyy when the first segment isn't a 4-digit year
      date = a.length === 4 ? new Date(`${a}-${b}-${c}`) : new Date(`${c}-${b}-${a}`)
    }
  }
  if (isNaN(date.getTime())) return raw
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

interface HealthSummarySectionProps {
  patientData: any
  vasbenefId?: string | number
  /**
   * Index of the selected summary entry. When provided together with
   * `onSelectedDateIndexChange`, the selection is CONTROLLED by the parent so
   * other sections (notably the Digital Twin / body twin) can react to the same
   * report the user picked here. Falls back to internal state when omitted.
   */
  selectedDateIndex?: number
  onSelectedDateIndexChange?: (index: number) => void
}

const categoryIcons: Record<string, any> = {
  // Cardiovascular / lipid profile
  Heart: HeartPulse,
  Lipid: HeartPulse,
  Cholesterol: HeartPulse,
  // Liver function tests (enzyme panel)
  Liver: FlaskConical,
  // Kidney filters and produces urine
  "Kidney & Urine": Droplets,
  Kidney: Droplets,
  Urine: Droplets,
  Renal: Droplets,
  // Blood / haematology (single blood drop)
  Blood: Droplet,
  "Complete Blood Count": Droplet,
  CBC: Droplet,
  Haematology: Droplet,
  // Thyroid regulates metabolism (dial/gauge)
  Thyroid: Gauge,
  // Sugar / diabetes
  "Sugar/Diabetes": Candy,
  Diabetes: Candy,
  Sugar: Candy,
  // Vitamins & minerals (supplement pill)
  "Vitamins & Minerals": Pill,
  Vitamins: Pill,
  Minerals: Pill,
  // Gallbladder & pancreas (organ-shaped bean)
  "Gallbladder & Pancreas": Bean,
  Pancreas: Bean,
  Gallbladder: Bean,
  // Body composition (weighing scale)
  "Body Composition": Scale,
  // Other common organ systems
  "Bone & Joint": Bone,
  Bone: Bone,
  Brain: Brain,
  Neuro: Brain,
  Lung: Wind,
  Respiratory: Wind,
  Genetic: Dna,
  General: Stethoscope,
  default: Stethoscope,
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

export default function HealthSummarySection({
  patientData,
  vasbenefId,
  selectedDateIndex: controlledDateIndex,
  onSelectedDateIndexChange,
}: HealthSummarySectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<{ name: string; parameters: any[] } | null>(null)
  const latestDate = patientData?.latestReportDate || patientData?.reports?.[0]?.date || ""

  // Per-report-date summaries (latest first). Powers the date dropdown so users
  // can review historical health summaries. Falls back to the single latest
  // summary when the by-date list isn't available.
  // One entry per individual report, newest first. Reports that fall on the SAME
  // date are intentionally kept SEPARATE (never collapsed/merged) so each one is
  // selectable on its own — same-date entries are told apart by their report name.
  const summariesByDate: Array<{ dateKey: string; reportName?: string; health_summary: any[] }> =
    patientData?.health_summary_by_date && patientData.health_summary_by_date.length > 0
      ? patientData.health_summary_by_date
      : []

  const [internalDateIndex, setInternalDateIndex] = useState(0)

  // Controlled when the parent supplies both the value and the change handler,
  // so the Digital Twin can follow the same selection; uncontrolled otherwise.
  const isControlled = controlledDateIndex !== undefined && onSelectedDateIndexChange !== undefined
  const selectedDateIndex = isControlled ? (controlledDateIndex as number) : internalDateIndex
  const setSelectedDateIndex = (index: number) => {
    if (isControlled) onSelectedDateIndexChange?.(index)
    else setInternalDateIndex(index)
  }

  // Reset to the latest date whenever the beneficiary or the set of dates
  // changes, so a stale index never points past the new list. When controlled,
  // the parent owns this reset.
  useEffect(() => {
    if (!isControlled) setInternalDateIndex(0)
  }, [vasbenefId, summariesByDate.length, isControlled])

  const safeDateIndex = Math.min(selectedDateIndex, Math.max(0, summariesByDate.length - 1))
  const activeDateKey = summariesByDate[safeDateIndex]?.dateKey || latestDate

  // The summary content for the selected date; when no by-date list exists we
  // use the default latest summary from the API.
  const healthSummaryFromApi =
    summariesByDate.length > 0 ? summariesByDate[safeDateIndex]?.health_summary || [] : patientData?.health_summary || []

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

  // Parameter status comes from the shared resolver: hardcoded band ranges for
  // the 7 band parameters, else the numeric reference range. The API status
  // flag is intentionally ignored (it wrongly flagged in-range values).
  const getParamStatus = (param: any): "normal" | "abnormal" =>
    resolveParameterStatus(param, patientData?.patient_info?.gender)

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

  // Build a precise comparison key: normalize the clinical name, then strip
  // everything except alphanumerics so spacing/punctuation differences
  // ("Non-HDL" vs "Non HDL") match, while distinct tests ("Hb" vs "HbA1c")
  // never collide.
  const comparisonKey = (name: string): string => normalizeParamName(name).replace(/[^a-z0-9]/g, "")

  // Build the canonical, deduplicated parameter list for a category.
  // This SAME list is used both for the out-of-range count on the card and
  // for the detail dialog, so the numbers always match.
  const getDisplayParams = (categoryName: string, params: any[]): any[] => {
    const categoryKey = getCategoryKey(categoryName)
    const seenKeys = new Set<string>()
    const result: any[] = []

    // For overlapping categories, restrict to Digital Twin's allowed list
    // using exact normalized-key matching (no loose substring matching).
    const allowedKeys =
      categoryKey && digitalTwinParamLists[categoryKey]
        ? new Set(digitalTwinParamLists[categoryKey].map((a) => comparisonKey(a)))
        : null

    for (const param of params) {
      const paramName = param.name || param.metric_name || ""
      if (!paramName) continue

      // Skip parameters that have no normal/reference range - they must not
      // appear anywhere (this keeps counts and the detail dialog consistent).
      if (!paramHasRange(param)) continue

      const key = comparisonKey(paramName)
      if (!key) continue

      if (allowedKeys && !allowedKeys.has(key)) continue

      // Deduplicate identical tests
      if (seenKeys.has(key)) continue
      seenKeys.add(key)

      result.push(param)
    }

    return result
  }

  // Count abnormal parameters from the canonical display list.
  const countAbnormalParams = (categoryName: string, params: any[]): number => {
    return getDisplayParams(categoryName, params).filter((p: any) => getParamStatus(p) === "abnormal").length
  }

  // If we have health_summary from API, use it directly
  if (healthSummaryFromApi.length > 0) {
    return (
      <section>
        {/* Header — date selector sits top-right (where "View latest report"
            used to be); the button itself now lives in the profile card. */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Activity className="h-6 w-6 shrink-0 text-[#000000]" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#2e3742]">Health Summary</h2>
              <p className="flex items-start gap-1 text-xs text-[#9dabbd]">
                <Info className="mt-0.5 h-3 w-3 shrink-0 text-[#9dabbd]" />
                <span className="text-pretty">
                  {safeDateIndex === 0
                    ? `Based on your latest health report${formatSummaryDate(activeDateKey) ? ` (${formatSummaryDate(activeDateKey)})` : ""}`
                    : `Showing health report from ${formatSummaryDate(activeDateKey)}`}
                </span>
              </p>
            </div>
          </div>

          {/* Date selector - lets users review historical health summaries */}
          {summariesByDate.length > 1 && (
            <div className="flex shrink-0 items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0 text-[#9dabbd]" aria-hidden="true" />
              <label htmlFor="health-summary-date" className="sr-only">
                Select report date
              </label>
              <Select value={String(safeDateIndex)} onValueChange={(v) => setSelectedDateIndex(Number(v))}>
                <SelectTrigger
                  id="health-summary-date"
                  className="h-9 min-w-0 flex-1 border-[#e3e8ee] text-sm text-[#2e3742] [&>span]:truncate sm:w-[210px] sm:flex-none"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  {summariesByDate.map((entry, index) => {
                    const label = formatSummaryDate(entry.dateKey) || entry.dateKey
                    // Several reports can share one date (kept separate), so append
                    // the report name to those entries to tell them apart.
                    const sharesDate =
                      summariesByDate.filter((e) => (formatSummaryDate(e.dateKey) || e.dateKey) === label).length > 1
                    return (
                      <SelectItem
                        key={`${entry.dateKey}-${index}`}
                        value={String(index)}
                        className="whitespace-nowrap"
                      >
                        {label}
                        {sharesDate && entry.reportName ? ` · ${entry.reportName}` : ""}
                        {index === 0 ? " (Latest)" : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Cards Grid - from API health_summary */}
        <div className="grid grid-cols-2 py-0 gap-4">
          {healthSummaryFromApi.map((item: any, index: number) => {
            const categoryName = item.category || item.name || `Category ${index + 1}`
            const Icon = getIconForCategory(categoryName)
            
            // Use the SAME canonical list for the count and the detail dialog
            const params = item.parameters || []
            const displayParams = getDisplayParams(categoryName, params)
            const outOfRangeCount = displayParams.filter((p: any) => getParamStatus(p) === "abnormal").length

            // Category has warning if ANY parameter is abnormal
            const isWarning = outOfRangeCount > 0

            return (
              <Card
                key={`${categoryName}-${index}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCategory({ name: categoryName, parameters: displayParams })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSelectedCategory({ name: categoryName, parameters: displayParams })
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
          <DialogContent className="w-[calc(100%-2rem)] max-w-[380px] gap-0 overflow-hidden p-0">
            <DialogHeader className="border-b border-[#f0f3f5] px-4 py-3">
              <DialogTitle className="text-base font-semibold text-[#2e3742]">{selectedCategory?.name}</DialogTitle>
              {selectedCategory &&
                (() => {
                  const abnormal = selectedCategory.parameters.filter((p: any) => getParamStatus(p) === "abnormal").length
                  return (
                    <p className={`text-xs ${abnormal > 0 ? "text-[#de3d31]" : "text-[#459f49]"}`}>
                      {abnormal > 0 ? `${abnormal} out of range` : "All in range"}
                    </p>
                  )
                })()}
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {selectedCategory && selectedCategory.parameters.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedCategory.parameters.map((param: any, i: number) => {
                    const paramStatus = getParamStatus(param)
                    const paramValue = param.value ?? param.result ?? "-"
                    const paramUnit = param.unit || ""
                    // For the 7 band parameters, show the sex-aware clinical
                    // normal range (e.g. female HDL 50–59) instead of the raw
                    // report range; fall back to the report range otherwise.
                    const paramRange =
                      getParameterNormalRange(param.name, patientData?.patient_info?.gender) ??
                      param.normal_range ??
                      param.range ??
                      ""
                    // Custom band (color + granular label) for the 7 listed
                    // parameters; other parameters keep the normal/abnormal look.
                    const band = getParameterBand(
                      param.name,
                      Number.parseFloat(String(paramValue)),
                      patientData?.patient_info?.gender,
                    )
                    return (
                      <div
                        key={`${param.name}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#f0f3f5] bg-[#fafbfc] p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="break-words text-sm font-medium text-[#2e3742]">{param.name}</p>
                            <BiomarkerInfoButton name={param.name} gender={patientData?.patient_info?.gender} />
                          </div>
                          {paramRange && (
                            <p className="mt-0.5 break-words text-[10px] text-[#9dabbd]">Normal: {paramRange}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end text-right">
                          <span
                            className={`break-words text-sm font-bold ${
                              band ? "" : paramStatus === "abnormal" ? "text-[#de3d31]" : "text-[#459f49]"
                            }`}
                            style={band ? { color: band.color } : undefined}
                          >
                            {paramValue} {paramUnit}
                          </span>
                          {band ? (
                            <span
                              className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{ color: band.color, backgroundColor: `${band.color}1A` }}
                            >
                              {band.shortLabel}
                            </span>
                          ) : (
                            <span
                              className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                paramStatus === "abnormal" ? "bg-[#fef0f0] text-[#de3d31]" : "bg-[#edf7ee] text-[#459f49]"
                              }`}
                            >
                              {paramStatus === "abnormal" ? "Abnormal" : "Normal"}
                            </span>
                          )}
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

  // Fallback card list. Icons are resolved from the shared categoryIcons map
  // (via getIconForCategory) so both render paths use the same meaningful icons.
  const healthCards = [
    { title: "Heart" as const },
    { title: "Liver" as const },
    { title: "Kidney & Urine" as const },
    { title: "Blood" as const },
    { title: "Thyroid" as const },
    { title: "Sugar/Diabetes" as const },
    { title: "Vitamins & Minerals" as const },
    { title: "Gallbladder & Pancreas" as const },
    { title: "Body Composition" as const },
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
          const Icon = getIconForCategory(card.title)
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
