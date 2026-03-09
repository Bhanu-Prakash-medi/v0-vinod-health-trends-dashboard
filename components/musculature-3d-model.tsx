"use client"

import { Card } from "@/components/ui/card"
import { useState } from "react"
import { Info, Activity, Heart, Droplets, Bone, X, Beaker } from "lucide-react"
import { trackHealthTrendsEvent } from "@/lib/snowplow"

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

const getParamValue = (params: Record<string, any>, key: string): any => {
  if (!params) return null

  // Direct match
  if (params[key]) return params[key]

  // Case-insensitive search
  const lowerKey = key.toLowerCase()
  for (const k of Object.keys(params)) {
    if (k.toLowerCase() === lowerKey) {
      return params[k]
    }
    // Also check if key contains the search term
    if (k.toLowerCase().includes(lowerKey) || lowerKey.includes(k.toLowerCase())) {
      return params[k]
    }
  }
  return null
}

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

  const rangeParts = range
    .toString()
    .split("-")
    .map((s: string) => Number.parseFloat(s.trim()))
  if (rangeParts.length === 2 && !isNaN(rangeParts[0]) && !isNaN(rangeParts[1])) {
    if (value < rangeParts[0] || value > rangeParts[1]) {
      return "abnormal"
    }
  }

  return "normal"
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

const addUniqueParam = (
  tests: Array<[string, any]>,
  abnormalTests: Array<[string, any]>,
  seenNames: Set<string>,
  name: string,
  param: any,
) => {
  const normalizedName = normalizeParamName(name)
  if (seenNames.has(normalizedName)) return

  seenNames.add(normalizedName)
  tests.push([name, param])
  if (getParamStatus(param) === "abnormal") {
    abnormalTests.push([name, param])
  }
}

const analyzeOrganStatus = (patientData: any): OrganGroup[] => {
  const organs: OrganGroup[] = []

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

  const lipidTests: Array<[string, any]> = []
  const abnormalLipid: Array<[string, any]> = []
  const seenLipid = new Set<string>()

  for (const name of lipidParamNames) {
    const param = getParamValue(params, name)
    if (param) {
      addUniqueParam(lipidTests, abnormalLipid, seenLipid, name, param)
    }
  }

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

  const lftTests: Array<[string, any]> = []
  const abnormalLFT: Array<[string, any]> = []
  const seenLFT = new Set<string>()

  for (const name of lftParamNames) {
    const param = getParamValue(params, name)
    if (param) {
      addUniqueParam(lftTests, abnormalLFT, seenLFT, name, param)
    }
  }

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

  const kidneyTests: Array<[string, any]> = []
  const abnormalKidney: Array<[string, any]> = []
  const seenKidney = new Set<string>()

  for (const name of kidneyParamNames) {
    const param = getParamValue(params, name)
    if (param) {
      addUniqueParam(kidneyTests, abnormalKidney, seenKidney, name, param)
    }
  }

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

  const bloodTests: Array<[string, any]> = []
  const abnormalBlood: Array<[string, any]> = []
  const seenBlood = new Set<string>()

  for (const name of bloodParamNames) {
    const param = getParamValue(params, name)
    if (param) {
      addUniqueParam(bloodTests, abnormalBlood, seenBlood, name, param)
    }
  }

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

  const sugarTests: Array<[string, any]> = []
  const abnormalSugar: Array<[string, any]> = []
  const seenSugar = new Set<string>()

  for (const name of sugarParamNames) {
    const param = getParamValue(params, name)
    if (param) {
      addUniqueParam(sugarTests, abnormalSugar, seenSugar, name, param)
    }
  }

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
                              <p className="font-medium text-red-700">{test.name}</p>
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
                      <p className="font-medium mb-1">Related Tests ({selectedOrganData.relatedTests.length}):</p>
                      <p className="line-clamp-2">{selectedOrganData.relatedTests.join(", ")}</p>
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
