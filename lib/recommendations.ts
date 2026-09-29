import type { ApiHealthReport } from "@/lib/api"
import { resolveParameterStatus } from "@/lib/parameter-status"

export type ServiceKey = "meds" | "labs" | "online" | "clinic"
export type RecommendationType = "Diet" | "Lifestyle" | "Checkup"

export interface LinkedParameter {
  name: string
  value: string
  unit: string
}

export interface DetailedRecommendation {
  id: string
  type: RecommendationType
  title: string
  description: string
  parameters: LinkedParameter[]
  addMore?: string[]
  cutOut?: string[]
  frequency?: string
  duration?: string
  activities?: string[]
  services?: ServiceKey[]
}

type CategoryKey = "heart" | "liver" | "kidney" | "sugar" | "thyroid" | "vitamins" | "blood" | "general"

function normalizeCategory(name: string): CategoryKey {
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

type Template = Omit<DetailedRecommendation, "id" | "parameters">

const templates: Record<CategoryKey, Template[]> = {
  heart: [
    {
      type: "Diet",
      title: "Eat heart-friendly foods to balance cholesterol",
      description:
        "Some of your heart markers are out of range. Choose more fibre-rich foods like oats, whole grains, nuts and vegetables, and reduce fried and processed foods. Soluble fibre helps lower LDL, while healthy fats support HDL.",
      addMore: ["Oats", "Almonds", "Flax seeds", "Leafy greens", "Olive oil"],
      cutOut: ["Fried foods", "Red meat", "Packaged snacks", "Butter & ghee"],
      services: ["labs", "online"],
    },
    {
      type: "Lifestyle",
      title: "Walk after meals to support LDL and HDL",
      description:
        "Build a 20–30 minute brisk walk on most days. Regular movement helps the body use fats better and can improve cholesterol levels over a few months.",
      frequency: "5 days/week",
      duration: "25 min",
      activities: ["Brisk walk after dinner", "Easy cycling", "Morning sunlight walk"],
      services: ["clinic"],
    },
  ],
  liver: [
    {
      type: "Diet",
      title: "Lighten the load on your liver",
      description:
        "Your liver markers need attention. Limit alcohol, sugary drinks and deep-fried food, and include antioxidant-rich vegetables and fruits that support liver repair.",
      addMore: ["Beetroot", "Green tea", "Garlic", "Citrus fruits"],
      cutOut: ["Alcohol", "Sugary drinks", "Deep-fried food"],
      services: ["labs", "online"],
    },
    {
      type: "Lifestyle",
      title: "Stay active and hydrated for liver health",
      description:
        "Moderate daily activity and good hydration help reduce fat build-up in the liver and support normal enzyme levels.",
      frequency: "5 days/week",
      duration: "30 min",
      activities: ["Brisk walking", "Yoga", "8 glasses of water"],
    },
  ],
  kidney: [
    {
      type: "Diet",
      title: "Moderate salt and protein for your kidneys",
      description:
        "Kidney-related values are slightly off. Reduce added salt and very high-protein foods, and drink enough water through the day.",
      addMore: ["Water", "Cucumber", "Apples", "Cauliflower"],
      cutOut: ["Pickles", "Processed meat", "Excess salt"],
      services: ["labs", "online", "clinic"],
    },
    {
      type: "Lifestyle",
      title: "Keep your blood pressure in check",
      description:
        "Healthy blood pressure protects your kidneys. Monitor it regularly and stay active with light, consistent exercise.",
      frequency: "Daily",
      duration: "20 min",
      activities: ["Light walking", "Breathing exercises", "BP check"],
    },
  ],
  sugar: [
    {
      type: "Diet",
      title: "Swap refined carbs to steady your sugar",
      description:
        "Your sugar levels are outside the normal range. Replace refined carbs and sweets with whole grains, lentils and vegetables to avoid sugar spikes.",
      addMore: ["Millets", "Lentils", "Brown rice", "Green vegetables"],
      cutOut: ["Refined carbs", "Sugary sweets", "Packaged snacks"],
      services: ["labs", "meds", "online"],
    },
    {
      type: "Lifestyle",
      title: "Move after meals to lower sugar spikes",
      description:
        "A short walk after meals helps your muscles use glucose and keeps blood sugar more stable through the day.",
      frequency: "Daily",
      duration: "15 min",
      activities: ["Walk after meals", "Stair climbing", "Light stretching"],
    },
  ],
  thyroid: [
    {
      type: "Diet",
      title: "Support your thyroid with the right nutrients",
      description:
        "Thyroid markers are out of range. Ensure adequate iodine and selenium in your diet, and follow up with your physician.",
      addMore: ["Iodised salt", "Eggs", "Brazil nuts", "Yogurt"],
      cutOut: ["Highly processed food", "Excess soy"],
      services: ["labs", "meds", "online"],
    },
    {
      type: "Lifestyle",
      title: "Keep a steady daily routine",
      description:
        "Consistent sleep, meals and medication timing help your thyroid levels stay stable.",
      frequency: "Daily",
      duration: "7–8 hr sleep",
      activities: ["Fixed sleep time", "Morning walk", "Stress relief"],
    },
  ],
  vitamins: [
    {
      type: "Diet",
      title: "Restore your vitamin and mineral levels",
      description:
        "Certain vitamins or minerals are low. Eat a nutrient-rich diet and discuss supplements with your doctor.",
      addMore: ["Eggs", "Mushrooms", "Fortified milk", "Nuts & seeds"],
      cutOut: ["Junk food", "Excess caffeine"],
      services: ["meds", "labs", "online"],
    },
    {
      type: "Lifestyle",
      title: "Get daily sunlight for Vitamin D",
      description:
        "Morning sunlight helps your body make Vitamin D naturally. Combine it with a short walk for extra benefit.",
      frequency: "5 days/week",
      duration: "15 min",
      activities: ["Morning sunlight", "Outdoor walk"],
    },
  ],
  blood: [
    {
      type: "Diet",
      title: "Add iron-rich foods to improve hemoglobin",
      description:
        "Choose more iron-rich foods like spinach, chana, rajma, lentils and sesame seeds. Iron helps your body make healthier red blood cells, which carry oxygen and reduce tiredness. Pair them with vitamin C for better absorption.",
      addMore: ["Lentils", "Chickpeas", "Spinach", "Rajma", "Sesame seeds"],
      cutOut: ["Tea with meals", "Coffee with meals", "Junk food"],
      services: ["labs", "online"],
    },
    {
      type: "Lifestyle",
      title: "Rest well to support healthy blood counts",
      description:
        "Good sleep and hydration help your body recover and produce healthy blood cells.",
      frequency: "Daily",
      duration: "7–8 hr sleep",
      activities: ["Consistent sleep", "Hydration", "Light exercise"],
    },
  ],
  general: [
    {
      type: "Diet",
      title: "Build a balanced plate",
      description:
        "A few markers need attention. Fill half your plate with vegetables, a quarter with protein and a quarter with whole grains.",
      addMore: ["Vegetables", "Whole grains", "Dals", "Fruits"],
      cutOut: ["Refined carbs", "Sugary drinks", "Fried snacks"],
      services: ["labs", "online"],
    },
    {
      type: "Lifestyle",
      title: "Stay active most days",
      description: "Regular exercise and good sleep improve your overall wellbeing and many health markers.",
      frequency: "5 days/week",
      duration: "30 min",
      activities: ["Brisk walk", "Yoga", "Cycling"],
    },
  ],
}

const categoryOrder: CategoryKey[] = ["blood", "sugar", "heart", "liver", "kidney", "thyroid", "vitamins", "general"]

export function buildRecommendations(patientData: ApiHealthReport): DetailedRecommendation[] {
  const gender = (patientData as any)?.patient_info?.gender
  const abnormalByCategory = new Map<CategoryKey, LinkedParameter[]>()

  for (const category of patientData?.health_summary || []) {
    const key = normalizeCategory((category as any).category || (category as any).name || "")
    for (const p of (category as any).parameters || []) {
      if (resolveParameterStatus(p, gender) !== "abnormal") continue
      const list = abnormalByCategory.get(key) || []
      list.push({ name: String(p.name ?? ""), value: String(p.value ?? ""), unit: String(p.unit ?? "") })
      abnormalByCategory.set(key, list)
    }
  }

  const recommendations: DetailedRecommendation[] = []
  for (const key of categoryOrder) {
    const params = abnormalByCategory.get(key)
    if (!params) continue
    templates[key].forEach((t, i) => {
      recommendations.push({ ...t, id: `${key}-${i}`, parameters: params.slice(0, 3) })
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "healthy",
      type: "Lifestyle",
      title: "You're on track, keep it up",
      description:
        "All your latest parameters are within the normal range. Keep up your balanced diet, regular activity and good sleep to stay healthy.",
      parameters: [],
      frequency: "5 days/week",
      duration: "30 min",
      activities: ["Brisk walk", "Yoga", "7–8 hr sleep"],
    })
    recommendations.push({
      id: "checkup",
      type: "Checkup",
      title: "Stay ahead with a yearly checkup",
      description: "A full-body checkup once a year helps catch changes early, even when you feel well.",
      parameters: [],
      services: ["labs"],
    })
  }

  return recommendations
}

/** Top focus = one recommendation per affected area (the diet/first item), in priority order. */
export function topFocus(recs: DetailedRecommendation[]): DetailedRecommendation[] {
  const seen = new Set<string>()
  return recs.filter((r) => {
    const area = r.id.split("-")[0]
    if (seen.has(area)) return false
    seen.add(area)
    return true
  })
}
