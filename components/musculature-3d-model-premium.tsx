"use client"

import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Info, Activity, Heart, Droplets, Bone, X, Beaker } from "lucide-react"
import { trackHealthTrendsEvent } from "@/lib/snowplow"
import { trackClick } from "@/lib/analytics/posthog"
import { paramHasRange } from "@/lib/health-utils"
import { resolveParameterStatus } from "@/lib/parameter-status"
import BiomarkerInfoButton from "@/components/biomarker-info-button"

type MarkerPoint = { x: number; y: number }

// Marker coordinates are percentages of the trimmed figure images, measured
// against each organ's position in the artwork. Blood sits on the femur
// (bone marrow); the rest sit on their organ.
const TWIN_FIGURES = {
  female: {
    src: "/images/twin-female.png",
    width: 619,
    height: 1400,
    label: "Female",
    markers: {
      heart: { x: 52, y: 25 },
      liver: { x: 42, y: 31 },
      pancreas: { x: 52, y: 36.5 },
      kidneys: { x: 62, y: 34 },
      blood: { x: 37, y: 60 },
    } as Record<string, MarkerPoint>,
  },
  male: {
    src: "/images/twin-male.png",
    width: 670,
    height: 1400,
    label: "Male",
    markers: {
      heart: { x: 52, y: 25 },
      liver: { x: 42, y: 31 },
      pancreas: { x: 50, y: 37.5 },
      kidneys: { x: 61, y: 35.5 },
      blood: { x: 40, y: 58 },
    } as Record<string, MarkerPoint>,
  },
}

// Short callout label and which side of the body its leader line runs to,
// chosen so neighbouring organs never point the same way at the same height.
const MARKER_CALLOUTS: Record<string, { label: string; side: "left" | "right" }> = {
  heart: { label: "Heart", side: "right" },
  liver: { label: "Liver", side: "left" },
  pancreas: { label: "Sugar", side: "left" },
  kidneys: { label: "Kidney", side: "right" },
  blood: { label: "Blood", side: "left" },
}

const isFemale = (gender?: string | null) => /^f/i.test((gender || "").trim())

type Status = "normal" | "attention"
type OrganGroup = {
  id: string
  name: string
  status: Status
  top: string
  left: string
  relatedTests: string[]
  abnormalTests: Array<{ name: string; value: string; range: string }>
  icon: any
}

const normalizeParamName = (name: string): string => {
  const normalized = name.toLowerCase().trim()

  // Map similar names to a canonical form
  const mappings: Record<string, string> = {
    ldl: "ldl cholesterol",
    "ldl-cholesterol": "ldl cholesterol",
    hdl: "hdl cholesterol",
    "hdl-cholesterol": "hdl cholesterol",
    vldl: "vldl cholesterol",
    "vldl-cholesterol": "vldl cholesterol",
    triglyceride: "triglycerides",
    cholesterol: "total cholesterol",
    "cholesterol total": "total cholesterol",
    hemoglobin: "haemoglobin",
    hb: "haemoglobin",
    hgb: "haemoglobin",
    rbc: "rbc count",
    "red blood cell": "rbc count",
    "erythrocyte count": "rbc count",
    wbc: "total leucocyte count",
    "white blood cell": "total leucocyte count",
    tlc: "total leucocyte count",
    platelet: "platelet count",
    plt: "platelet count",
    pcv: "packed cell volume",
    hct: "packed cell volume",
    hematocrit: "packed cell volume",
    sgot: "sgot (ast)",
    ast: "sgot (ast)",
    "aspartate aminotransferase": "sgot (ast)",
    sgpt: "sgpt (alt)",
    alt: "sgpt (alt)",
    "alanine aminotransferase": "sgpt (alt)",
    alp: "alkaline phosphatase",
    ggt: "gamma glutamyltransferase",
    ggtp: "gamma glutamyltransferase",
    bilirubin: "bilirubin total",
    "total bilirubin": "bilirubin total",
    "direct bilirubin": "bilirubin direct",
    "indirect bilirubin": "bilirubin indirect",
    "serum creatinine": "creatinine",
    "blood urea": "urea",
    bun: "urea",
    "blood urea nitrogen": "urea",
    egfr: "gfr",
    "glomerular filtration rate": "gfr",
    fbs: "fasting blood sugar",
    "fasting glucose": "fasting blood sugar",
    ppbs: "post prandial blood sugar",
    "pp blood sugar": "post prandial blood sugar",
    rbs: "random blood sugar",
    "blood glucose": "glucose",
    "glycated hemoglobin": "hba1c",
    "glycosylated hemoglobin": "hba1c",
    "serum albumin": "albumin",
    "protein total": "total protein",
    "albumin/globulin ratio": "a/g ratio",
    "cholesterol/hdl ratio": "tc/hdl ratio",
    "vitamin d (25-oh)": "vitamin d",
    "25-oh vitamin d": "vitamin d",
    b12: "vitamin b12",
    neutrophil: "neutrophils",
    lymphocyte: "lymphocytes",
    eosinophil: "eosinophils",
    monocyte: "monocytes",
    basophil: "basophils",
    "mean corpuscular volume": "mcv",
    "mean corpuscular hemoglobin": "mch",
    "mean corpuscular hemoglobin concentration": "mchc",
    "red cell distribution width": "rdw",
    "rdw-cv": "rdw",
    "rdw-sd": "rdw",
    "mean platelet volume": "mpv",
    "estimated average glucose": "average blood glucose",
  }

  return mappings[normalized] || normalized
}

// Build a precise comparison key: normalize the clinical name, then strip
// everything except alphanumerics so spacing/punctuation differences match
// while distinct tests ("Hb" vs "HbA1c") never collide. This is IDENTICAL to
// the Health Summary's comparisonKey, so both sections group the exact same
// parameters into each organ/category and therefore show the same status.
const comparisonKey = (name: string): string => normalizeParamName(name).replace(/[^a-z0-9]/g, "")

// Collect the parameters that belong to an organ by iterating the ACTUAL report
// parameters and exact-matching their normalized key against the organ's
// allowed list. This replaces the old fuzzy substring lookup that could, e.g.,
// match liver's "AST" inside "fASTing blood sugar" and wrongly flag the organ.
const collectOrganTests = (
  params: Record<string, any>,
  allowedNames: string[],
  gender?: string | null,
): { tests: Array<[string, any]>; abnormal: Array<[string, any]> } => {
  const allowed = new Set(allowedNames.map(comparisonKey))
  const seen = new Set<string>()
  const tests: Array<[string, any]> = []
  const abnormal: Array<[string, any]> = []

  for (const [name, param] of Object.entries(params)) {
    if (!name || !param) continue
    // Skip parameters with no normal/reference range so the Digital Twin shows
    // the exact same set of parameters (and organ status) as every other section.
    if (!paramHasRange(param)) continue
    const key = comparisonKey(name)
    if (!key || !allowed.has(key)) continue
    if (seen.has(key)) continue
    seen.add(key)
    tests.push([name, param])
    if (resolveParameterStatus({ ...param, name }, gender) === "abnormal") abnormal.push([name, param])
  }

  return { tests, abnormal }
}

const analyzeOrganStatus = (patientData: any, healthSummaryOverride?: any[]): OrganGroup[] => {
  const organs: OrganGroup[] = []
  const gender = patientData?.patient_info?.gender

  let params: Record<string, any> = {}

  // When the user picks a specific report in the Health Summary date dropdown,
  // that summary is passed in here so the body twin reflects the SELECTED report
  // instead of always the latest merged one.
  const summary =
    healthSummaryOverride !== undefined ? healthSummaryOverride : patientData?.health_summary
  const hasOverride = healthSummaryOverride !== undefined

  // Get parameters from the active summary (selected report, or latest merged).
  if (summary && summary.length > 0) {
    for (const category of summary) {
      const categoryParams = category.parameters || []
      for (const p of categoryParams) {
        const name = p.name || p.metric_name || ""
        if (name && !params[name]) {
          params[name] = {
            result: p.value || p.result,
            value: p.value || p.result,
            units: p.unit || p.units,
            unit: p.unit || p.units,
            range: p.normal_range || p.range,
            normal_range: p.normal_range || p.range,
            status: p.status || "normal",
          }
        }
      }
    }
  }

  // Fallback: try lab_reports with Latest_report tag. Skipped when a specific
  // report is selected — otherwise picking a report that carries no measured
  // parameters would silently fall back to the LATEST report's values, which is
  // exactly the "twin still shows the previous one" bug.
  if (!hasOverride && Object.keys(params).length === 0 && patientData?.lab_reports) {
    const labReports = Array.isArray(patientData.lab_reports) ? patientData.lab_reports : []
    const latestLabReport =
      labReports.find((lr: any) => {
        const tag = lr.tag || lr.Tag || ""
        return tag.toLowerCase().includes("latest")
      }) || labReports[0]

    if (latestLabReport?.parameters) {
      const labParams = Array.isArray(latestLabReport.parameters) ? latestLabReport.parameters : []
      labParams.forEach((p: any) => {
        const name = p.metric_name || p.name || p.parameter_name || ""
        if (name) {
          params[name] = {
            result: p.value || p.result,
            value: p.value || p.result,
            units: p.unit || p.units,
            unit: p.unit || p.units,
            range: p.normal_range || p.range,
            normal_range: p.normal_range || p.range,
            status: p.status || "normal",
          }
        }
      })
    }
  }

  // If still no parameters, return empty organs
  if (Object.keys(params).length === 0) {
    return organs
  }

  // Cardiovascular - Check Lipid Profile parameters
  const lipidParamNames = [
    "Total Cholesterol",
    "Cholesterol",
    "Cholesterol Total",
    "HDL Cholesterol",
    "HDL",
    "HDL-Cholesterol",
    "LDL Cholesterol",
    "LDL",
    "LDL-Cholesterol",
    "Triglycerides",
    "Triglyceride",
    "VLDL Cholesterol",
    "VLDL",
    "Non-HDL Cholesterol",
    "TC/HDL Ratio",
    "Cholesterol/HDL Ratio",
    "LDL/HDL Ratio",
  ]

  const { tests: lipidTests, abnormal: abnormalLipid } = collectOrganTests(params, lipidParamNames, gender)

  if (lipidTests.length > 0) {
    organs.push({
      id: "heart",
      name: "Cardiovascular",
      status: abnormalLipid.length > 0 ? "attention" : "normal",
      top: "28%",
      left: "54%",
      relatedTests: lipidTests.map(([name]) => name),
      abnormalTests: abnormalLipid.map(([name, data]) => ({
        name,
        value: `${data.result || data.value || "-"} ${data.units || data.unit || ""}`.trim(),
        range: data.range || data.normal_range || "-",
      })),
      icon: Heart,
    })
  }

  // Liver Function
  const lftParamNames = [
    "Bilirubin Total",
    "Total Bilirubin",
    "Bilirubin",
    "Bilirubin Direct",
    "Direct Bilirubin",
    "Bilirubin Indirect",
    "Indirect Bilirubin",
    "SGOT",
    "AST",
    "SGOT (AST)",
    "Aspartate Aminotransferase",
    "SGPT",
    "ALT",
    "SGPT (ALT)",
    "Alanine Aminotransferase",
    "Alkaline Phosphatase",
    "ALP",
    "Total Protein",
    "Protein Total",
    "Albumin",
    "Serum Albumin",
    "Globulin",
    "A/G Ratio",
    "Albumin/Globulin Ratio",
    "Gamma Glutamyltransferase",
    "GGT",
    "GGTP",
  ]

  const { tests: lftTests, abnormal: abnormalLFT } = collectOrganTests(params, lftParamNames, gender)

  if (lftTests.length > 0) {
    organs.push({
      id: "liver",
      name: "Liver Function",
      status: abnormalLFT.length > 0 ? "attention" : "normal",
      top: "36%",
      left: "42%",
      relatedTests: lftTests.map(([name]) => name),
      abnormalTests: abnormalLFT.map(([name, data]) => ({
        name,
        value: `${data.result || data.value || "-"} ${data.units || data.unit || ""}`.trim(),
        range: data.range || data.normal_range || "-",
      })),
      icon: Activity,
    })
  }

  // Kidney Function
  const kidneyParamNames = [
    "Urea",
    "Blood Urea",
    "BUN",
    "Blood Urea Nitrogen",
    "Creatinine",
    "Serum Creatinine",
    "BUN/Creatinine Ratio",
    "Urea/Creatinine Ratio",
    "Uric Acid",
    "eGFR",
    "GFR",
    "Glomerular Filtration Rate",
  ]

  const { tests: kidneyTests, abnormal: abnormalKidney } = collectOrganTests(params, kidneyParamNames, gender)

  if (kidneyTests.length > 0) {
    organs.push({
      id: "kidneys",
      name: "Kidney Function",
      status: abnormalKidney.length > 0 ? "attention" : "normal",
      top: "48%",
      left: "56%",
      relatedTests: kidneyTests.map(([name]) => name),
      abnormalTests: abnormalKidney.map(([name, data]) => ({
        name,
        value: `${data.result || data.value || "-"} ${data.units || data.unit || ""}`.trim(),
        range: data.range || data.normal_range || "-",
      })),
      icon: Droplets,
    })
  }

  // Blood & Bone Marrow - CBC + Vitamins
  const bloodParamNames = [
    "Hemoglobin",
    "Haemoglobin",
    "Hb",
    "HGB",
    "RBC",
    "Red Blood Cell",
    "Erythrocyte Count",
    "RBC Count",
    "Packed Cell Volume",
    "Hematocrit",
    "PCV",
    "HCT",
    "MCV",
    "Mean Corpuscular Volume",
    "MCH",
    "Mean Corpuscular Hemoglobin",
    "MCHC",
    "Mean Corpuscular Hemoglobin Concentration",
    "RDW",
    "RDW-CV",
    "RDW-SD",
    "Red Cell Distribution Width",
    "WBC",
    "White Blood Cell",
    "Total Leucocyte Count",
    "TLC",
    "Neutrophils",
    "Neutrophil",
    "Lymphocytes",
    "Lymphocyte",
    "Eosinophils",
    "Eosinophil",
    "Monocytes",
    "Monocyte",
    "Basophils",
    "Basophil",
    "Platelet",
    "Platelet Count",
    "PLT",
    "MPV",
    "Mean Platelet Volume",
    "Vitamin D",
    "Vitamin D (25-OH)",
    "25-OH Vitamin D",
    "Vitamin B12",
    "B12",
  ]

  const { tests: bloodTests, abnormal: abnormalBlood } = collectOrganTests(params, bloodParamNames, gender)

  if (bloodTests.length > 0) {
    organs.push({
      id: "blood",
      name: "Blood & Bone Marrow",
      status: abnormalBlood.length > 0 ? "attention" : "normal",
      top: "52%",
      left: "30%",
      relatedTests: bloodTests.map(([name]) => name),
      abnormalTests: abnormalBlood.map(([name, data]) => ({
        name,
        value: `${data.result || data.value || "-"} ${data.units || data.unit || ""}`.trim(),
        range: data.range || data.normal_range || "-",
      })),
      icon: Bone,
    })
  }

  // Sugar/Diabetes
  const sugarParamNames = [
    "Glucose",
    "Blood Glucose",
    "Fasting Glucose",
    "FBS",
    "Fasting Blood Sugar",
    "PPBS",
    "Post Prandial Blood Sugar",
    "PP Blood Sugar",
    "Random Blood Sugar",
    "RBS",
    "HbA1c",
    "Glycated Hemoglobin",
    "Glycosylated Hemoglobin",
    "Average Blood Glucose",
    "Estimated Average Glucose",
  ]

  const { tests: sugarTests, abnormal: abnormalSugar } = collectOrganTests(params, sugarParamNames, gender)

  if (sugarTests.length > 0) {
    organs.push({
      id: "pancreas",
      name: "Sugar/Diabetes",
      status: abnormalSugar.length > 0 ? "attention" : "normal",
      top: "40%",
      left: "50%",
      relatedTests: sugarTests.map(([name]) => name),
      abnormalTests: abnormalSugar.map(([name, data]) => ({
        name,
        value: `${data.result || data.value || "-"} ${data.units || data.unit || ""}`.trim(),
        range: data.range || data.normal_range || "-",
      })),
      icon: Beaker,
    })
  }

  return organs
}

interface Musculature3DModelProps {
  patientData: any
  vasbenefId?: string | number
  /** Summary of the report selected in the Health Summary dropdown. */
  healthSummaryOverride?: any[]
}

export default function Musculature3DModel({
  patientData,
  vasbenefId,
  healthSummaryOverride,
}: Musculature3DModelProps) {
  const [rotation, setRotation] = useState(0)
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  const organGroups = analyzeOrganStatus(patientData, healthSummaryOverride)

  // Close the organ detail sheet when the selected report changes, so it never
  // keeps showing organ values from the previously selected report.
  useEffect(() => {
    setSelectedOrgan(null)
    setIsBottomSheetOpen(false)
  }, [healthSummaryOverride])

  const handleReset = () => {
    setRotation(0)
    setSelectedOrgan(null)
    setIsBottomSheetOpen(false)
  }

  const handleOrganClick = (organId: string) => {
    setSelectedOrgan(organId)
    setIsBottomSheetOpen(true)
    trackHealthTrendsEvent("Clicked on Digital Twin Organ", vasbenefId)
    // organId is an anatomical group ("heart", "liver"), not patient data.
    trackClick("digital_twin_pointer_click", { pointer: organId })
  }

  const closeBottomSheet = () => {
    setIsBottomSheetOpen(false)
    setSelectedOrgan(null)
  }

  const selectedOrganData = selectedOrgan ? organGroups.find((g) => g.id === selectedOrgan) : null

  const figure = isFemale(patientData?.patient_info?.gender) ? TWIN_FIGURES.female : TWIN_FIGURES.male
  const attentionCount = organGroups.filter((o) => o.status === "attention").length

  return (
    <div className="twin-root">
      <div className="twin-stage relative flex justify-center">
        <div className="twin-figure relative h-[440px] w-fit">
          <img
            src={figure.src}
            width={figure.width}
            height={figure.height}
            alt={`${figure.label} digital twin showing organ health markers`}
            className="h-full w-auto select-none"
            draggable={false}
          />

          {organGroups.map((organ) => {
            const pos = figure.markers[organ.id]
            if (!pos) return null
            const attention = organ.status === "attention"
            const isSelected = selectedOrgan === organ.id
            const callout = MARKER_CALLOUTS[organ.id] ?? { label: organ.name, side: "right" as const }
            const toLeft = callout.side === "left"
            return (
              <button
                key={organ.id}
                type="button"
                onClick={() => handleOrganClick(organ.id)}
                aria-label={`${organ.name}: ${attention ? "needs attention" : "normal"}`}
                className="group absolute z-10 h-0 w-0 focus:outline-none"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <span className="absolute left-0 top-0 flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
                  {attention && (
                    <span
                      className="absolute h-3.5 w-3.5 animate-ping rounded-full bg-[#e5484d]/40"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ffffff] shadow-[0_0_0_3px_rgba(255,255,255,0.25),0_2px_8px_rgba(21,109,220,0.45)] transition-transform duration-200 group-hover:scale-125 group-focus-visible:scale-125 ${
                      isSelected ? "scale-125" : ""
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${attention ? "bg-[#e5484d]" : "bg-[#156ddc]"}`}
                      aria-hidden="true"
                    />
                  </span>
                </span>

                <span
                  className={`pointer-events-none absolute top-0 flex -translate-y-1/2 items-center ${
                    toLeft ? "right-2 flex-row-reverse" : "left-2"
                  }`}
                  aria-hidden="true"
                >
                  <span className="h-px w-5 bg-[#ffffff]/70" />
                  <span
                    className={`flex items-center gap-1 whitespace-nowrap rounded-full border border-[#ffffff]/25 bg-[#156ddc]/80 px-2 py-0.5 text-[10px] font-medium leading-4 text-[#ffffff] shadow-[0_4px_12px_rgba(21,109,220,0.35)] backdrop-blur-sm transition-colors group-hover:bg-[#156ddc] group-focus-visible:bg-[#156ddc] ${
                      isSelected ? "bg-[#156ddc]" : ""
                    }`}
                  >
                    {callout.label}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {organGroups.length > 0 && (
          <div className="mt-1 flex items-center justify-between px-0.5">
            <p className="text-xs text-[#6b84a8]">
              {attentionCount > 0
                ? `${attentionCount} of ${organGroups.length} areas need attention`
                : `All ${organGroups.length} areas look normal`}
            </p>
            <div className="flex items-center gap-3 text-[11px] text-[#6b84a8]">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#e5484d]" aria-hidden="true" />
                Attention
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#156ddc]" aria-hidden="true" />
                Normal
              </span>
            </div>
          </div>
      )}

      {isBottomSheetOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200" onClick={closeBottomSheet} />

          <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="mx-auto max-w-2xl rounded-t-2xl bg-white shadow-2xl">
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-12 rounded-full bg-gray-300" />
              </div>

              <div className="px-6 pb-8 pt-2">
                {selectedOrganData && (
                  <>
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-lg p-2 ${
                            selectedOrganData.status === "normal"
                              ? "bg-[#e8f1fd] text-[#156ddc]"
                              : "bg-[#e5484d]/10 text-[#e5484d]"
                          }`}
                        >
                          {selectedOrganData.icon && <selectedOrganData.icon className="h-6 w-6" />}
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-[#2e3742]">{selectedOrganData.name}</h3>
                          <p
                            className={`text-sm font-medium ${
                              selectedOrganData.status === "normal" ? "text-[#156ddc]" : "text-[#e5484d]"
                            }`}
                          >
                            Status: {selectedOrganData.status === "normal" ? "Normal" : "Needs Attention"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={closeBottomSheet}
                        className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div
                      className={`rounded-xl border p-4 mb-4 ${
                        selectedOrganData.status === "normal"
                          ? "border-[#e3ecfa] bg-[#f5f8fe]"
                          : "border-[#e5484d]/20 bg-[#e5484d]/5"
                      }`}
                    >
                      {selectedOrganData.abnormalTests.length > 0 ? (
                        <div>
                          <p className="text-sm font-semibold text-gray-900 mb-2">Abnormal Results:</p>
                          {selectedOrganData.abnormalTests.map((test, idx) => (
                            <div key={idx} className="mb-2 text-sm">
                              <div className="flex items-center gap-1">
                                <p className="font-medium text-[#e5484d]">{test.name}</p>
                                <BiomarkerInfoButton name={test.name} />
                              </div>
                              <p className="text-gray-600">
                                Value: {test.value} (Normal: {test.range})
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#2e3742]">
                          All {selectedOrganData.relatedTests.length} parameters are within normal range.
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-gray-500">
                      <p className="font-medium mb-2">Related Tests ({selectedOrganData.relatedTests.length}):</p>
                      <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                        {selectedOrganData.relatedTests.map((testName, idx) => (
                          <span key={idx} className="inline-flex items-center gap-0.5 text-gray-600">
                            {testName}
                            {idx < selectedOrganData.relatedTests.length - 1 ? "," : ""}
                            <BiomarkerInfoButton name={testName} />
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
