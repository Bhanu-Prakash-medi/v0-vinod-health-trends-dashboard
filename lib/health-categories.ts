// Maps health categories to their corresponding lab parameter keys
export const HEALTH_CATEGORY_MAPPING = {
  "Kidney & Urine": [
    "Creatinine",
    "Glomerular Filtration Rate (eGFR)",
    "Urea",
    "Blood Urea Nitrogen (BUN)",
    "Blood Urea Nitrogen (BUN)/Creatinine Ratio",
    "Urea/Creatinine Ratio",
    "Uric Acid",
    "Specific gravity",
    "Reaction (pH)",
    "PUS(WBC) Cells",
    "RBC",
    "Epithelial Cells",
    "Casts",
    "Crystals",
  ],
  "Gallbladder & Pancreas": ["Bilirubin Total", "Bilirubin Direct", "Bilirubin Indirect"],
  Heart: [
    "Cholesterol - Total",
    "Cholesterol - HDL",
    "Cholesterol - LDL",
    "Cholesterol VLDL",
    "Triglycerides",
    "Cholesterol - Non-HDL",
    "Total cholesterol/HDL",
    "LDL / HDL",
    "HDL / LDL",
    "Systolic BP (mm Hg)",
    "Diastolic BP (mm Hg)",
  ],
  Thyroid: ["Triiodothyronine Total (TT3)", "Thyroxine - Total (TT4)", "Thyroid Stimulating Hormone (TSH)"],
  Liver: [
    "Alanine Transaminase (ALT/SGPT)",
    "Aspartate Aminotransferase(AST/SGOT)",
    "Alkaline Phosphatase (ALP)",
    "Y- Glutamyl Transferase (GGT)",
    "Protein Total",
    "Albumin",
    "Globulin",
    "Albumin/Globulin",
    "AST / ALT Ratio",
  ],
  Blood: [
    "Hemoglobin (Hb)*",
    "Erythrocyte Count (RBC Count)",
    "Packed Cell Volume(Hematocrit)",
    "MCV",
    "MCH",
    "MCHC",
    "RDW-CV",
    "RDW-SD",
    "Total Leucocyte Count (WBC)",
    "Neutrophils",
    "Lymphocytes",
    "Eosinophils",
    "Monocytes",
    "Basophils",
    "Absolute Neutrophil Count",
    "Absolute Lymphocyte Count",
    "Absolute Monocyte Count",
    "Absolute Eosinophil Count",
    "Absolute Basophils Count",
    "Platelet Count",
    "Mean Platelet Volume (MPV)",
  ],
  "Vitamins & Minerals": [
    "25-Hydroxy Vitamin D Total (D2 & D3)",
    "Vitamin - B12*",
    "Sodium",
    "Potassium",
    "Chloride",
    "Calcium",
    "Phosphorus",
  ],
  "Sugar/Diabetes": ["Glucose - FBS", "HbA1c", "Estimated Average Glucose (eAG)"],
  "Body Composition": [
    "Weight",
    "BMI",
    "Protein",
    "Mineral",
    "Body Fat Mass",
    "Soft Lean Mass",
    "Bone Mineral Content",
    "Fat Free Mass",
    "Height (in cm)",
    "Weight (in kgs)",
  ],
}

/**
 * Checks if a health category has any data in the patient reports
 */
export function hasDataForCategory(category: keyof typeof HEALTH_CATEGORY_MAPPING, patientData: any): boolean {
  if (!patientData?.reports || patientData.reports.length === 0) {
    return false
  }

  const categoryParams = HEALTH_CATEGORY_MAPPING[category]
  const latestReport = patientData.reports[0]

  if (!latestReport?.parameters) {
    return false
  }

  return categoryParams.some((param) => {
    const paramData = latestReport.parameters[param]
    return (
      paramData !== undefined &&
      (paramData.result !== undefined || paramData.Value !== undefined) &&
      (paramData.result !== "" || paramData.Value !== "")
    )
  })
}

/**
 * Counts how many parameters in a category are out of range
 */
export function countOutOfRangeParams(category: keyof typeof HEALTH_CATEGORY_MAPPING, patientData: any): number {
  if (!patientData?.reports || patientData.reports.length === 0) {
    return 0
  }

  const categoryParams = HEALTH_CATEGORY_MAPPING[category]
  const latestReport = patientData.reports[0]

  if (!latestReport?.parameters) {
    return 0
  }

  let outOfRangeCount = 0

  categoryParams.forEach((param) => {
    const paramData = latestReport.parameters[param]
    if (paramData && (paramData.result !== undefined || paramData.Value !== undefined)) {
      const value = paramData.result !== undefined ? paramData.result : Number.parseFloat(paramData.Value)
      const range = paramData.range || paramData["Reference Range"] || ""

      if (range && !isNaN(value)) {
        const status = getParameterStatus(value, range)
        if (status === "abnormal") {
          outOfRangeCount++
        }
      }
    }
  })

  return outOfRangeCount
}

/**
 * Gets the status of a category (normal/warning/no-data)
 */
export function getCategoryStatus(
  category: keyof typeof HEALTH_CATEGORY_MAPPING,
  patientData: any,
): "normal" | "warning" | "disabled" {
  if (!hasDataForCategory(category, patientData)) {
    return "disabled"
  }

  const outOfRangeCount = countOutOfRangeParams(category, patientData)
  return outOfRangeCount > 0 ? "warning" : "normal"
}

// Helper function to determine if a parameter is within normal range
function getParameterStatus(result: number, rangeStr: string): "normal" | "abnormal" {
  if (!rangeStr || rangeStr === "" || rangeStr === "-") {
    return "normal"
  }

  if (rangeStr.includes("-")) {
    const [min, max] = rangeStr.split("-").map((s) => Number.parseFloat(s.trim()))
    if (!isNaN(min) && !isNaN(max)) {
      return result >= min && result <= max ? "normal" : "abnormal"
    }
  } else if (rangeStr.startsWith("<")) {
    const max = Number.parseFloat(rangeStr.replace("<", "").trim())
    if (!isNaN(max)) {
      return result < max ? "normal" : "abnormal"
    }
  } else if (rangeStr.startsWith(">")) {
    const min = Number.parseFloat(rangeStr.replace(">", "").trim())
    if (!isNaN(min)) {
      return result > min ? "normal" : "abnormal"
    }
  } else if (rangeStr.toLowerCase().includes("upto")) {
    const max = Number.parseFloat(rangeStr.toLowerCase().replace("upto", "").trim())
    if (!isNaN(max)) {
      return result <= max ? "normal" : "abnormal"
    }
  }
  return "normal"
}
