import { paramHasRange } from "@/lib/health-utils"
import { calculateDynamicPosition } from "@/lib/calculateDynamicPosition"
import { resolveParameterStatus } from "@/lib/parameter-status"

export interface CollectedParameter {
  name: string
  value: number
  unit: string
  range: string
  status: "normal" | "abnormal"
}

const NAME_ALIASES: Record<string, string> = {
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

// Alias-aware key so "LDL" and "LDL Cholesterol" count as one test, while
// distinct tests ("Hb" vs "HbA1c") never collide.
export function parameterKey(name: string): string {
  const normalized = name.toLowerCase().trim()
  return (NAME_ALIASES[normalized] || normalized).replace(/[^a-z0-9]/g, "")
}

/**
 * Single list of unique, rangeable parameters for a report. Every count shown
 * to the user (All Parameters, "Parameters in range") is derived from this, so
 * the numbers always agree.
 */
export function collectParameters(
  labParams: any[] | undefined,
  healthSummary: any[] | undefined,
  gender?: string | null,
): CollectedParameter[] {
  const seen = new Set<string>()
  const out: CollectedParameter[] = []

  const add = (raw: any) => {
    const name: string = raw?.metric_name || raw?.name || ""
    if (!name) return
    const key = parameterKey(name)
    if (!key || seen.has(key)) return

    const range = String(raw?.normal_range ?? raw?.range ?? "")
    if (!paramHasRange({ range })) return
    const value = Number.parseFloat(String(raw?.value ?? raw?.result ?? ""))
    if (!Number.isFinite(value)) return
    if (calculateDynamicPosition(value, range) === null) return

    seen.add(key)
    out.push({
      name,
      value,
      unit: raw?.unit || raw?.units || "",
      range,
      status: resolveParameterStatus({ name, value, range }, gender),
    })
  }

  for (const p of labParams || []) add(p)
  for (const category of healthSummary || []) {
    for (const p of category?.parameters || []) add(p)
  }
  return out
}
