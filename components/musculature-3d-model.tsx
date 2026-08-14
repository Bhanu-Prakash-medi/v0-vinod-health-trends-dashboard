"use client"

import { Card } from "@/components/ui/card"
import { useState } from "react"
import { Info, Activity, Heart, Droplets, Bone, X, Beaker } from "lucide-react"
import { trackHealthTrendsEvent } from "@/lib/snowplow"
import { paramHasRange } from "@/lib/health-utils"
import { resolveParameterStatus } from "@/lib/parameter-status"
import BiomarkerInfoButton from "@/components/biomarker-info-button"

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

const analyzeOrganStatus = (patientData: any): OrganGroup[] => {
  const organs: OrganGroup[] = []
  const gender = patientData?.patient_info?.gender

  let params: Record<string, any> = {}

  // Get parameters from health_summary - this contains merged data from latest reports only
  if (patientData?.health_summary && patientData.health_summary.length > 0) {
    for (const category of patientData.health_summary) {
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

  // Fallback: try lab_reports with Latest_report tag
  if (Object.keys(params).length === 0 && patientData?.lab_reports) {
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
}

export default function Musculature3DModel({ patientData, vasbenefId }: Musculature3DModelProps) {
  const [rotation, setRotation] = useState(0)
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null)
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false)

  const organGroups = analyzeOrganStatus(patientData)

  const handleReset = () => {
    setRotation(0)
    setSelectedOrgan(null)
    setIsBottomSheetOpen(false)
  }

  const handleOrganClick = (organId: string) => {
    setSelectedOrgan(organId)
    setIsBottomSheetOpen(true)
    trackHealthTrendsEvent("Clicked on Digital Twin Organ", vasbenefId)
  }

  const closeBottomSheet = () => {
    setIsBottomSheetOpen(false)
    setSelectedOrgan(null)
  }

  const selectedOrganData = selectedOrgan ? organGroups.find((g) => g.id === selectedOrgan) : null

  return (
    <Card className="border border-[#f0f3f5] p-4 shadow-sm py-6">
      <div className="relative mb-4 h-[500px] overflow-hidden rounded-xl bg-white">
        <div
          className="relative h-full w-full transition-transform duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <img
            src="/images/digital-twin-body.jpg"
            alt="Internal Organs Diagram"
            className="h-full w-full object-contain p-4 py-0 px-0"
          />

          {organGroups.map((organ) => (
            <button
              key={organ.id}
              onClick={() => handleOrganClick(organ.id)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transform transition-all duration-300 ${
                selectedOrgan === organ.id ? "scale-125 z-20" : "scale-100 z-10 hover:scale-110"
              }`}
              style={{ top: organ.top, left: organ.left }}
            >
              <span className="relative flex h-6 w-6">
                {organ.status === "attention" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex items-center justify-center rounded-full border-2 border-white shadow-md h-4 w-4 ${
                    organ.status === "normal" ? "bg-emerald-500" : "bg-red-500"
                  }`}
                >
                  {organ.status === "attention" && <span className="text-[10px] font-bold text-white">!</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-0">
        <Info className="h-4 w-4" />
        <span>Tap on pointer to get more details</span>
      </div>

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
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {selectedOrganData.icon && <selectedOrganData.icon className="h-6 w-6" />}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{selectedOrganData.name}</h3>
                          <p
                            className={`text-sm font-medium ${
                              selectedOrganData.status === "normal" ? "text-emerald-600" : "text-red-600"
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
                          ? "border-emerald-100 bg-emerald-50/50"
                          : "border-red-100 bg-red-50/50"
                      }`}
                    >
                      {selectedOrganData.abnormalTests.length > 0 ? (
                        <div>
                          <p className="text-sm font-semibold text-gray-900 mb-2">Abnormal Results:</p>
                          {selectedOrganData.abnormalTests.map((test, idx) => (
                            <div key={idx} className="mb-2 text-sm">
                              <div className="flex items-center gap-1">
                                <p className="font-medium text-red-700">{test.name}</p>
                                <BiomarkerInfoButton name={test.name} />
                              </div>
                              <p className="text-gray-600">
                                Value: {test.value} (Normal: {test.range})
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-emerald-700">
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
    </Card>
  )
}
