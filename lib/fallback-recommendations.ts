import type { RecParameter, RecommendationsResponse } from "@/lib/recommendations-api"

// Generic, non-personalised guidance shown when the recommendations API fails.
// Values and statuses are intentionally omitted so nothing is presented as the user's own result.
const FALLBACK_PARAMETERS: RecParameter[] = [
  {
    rank: 1,
    id: "fallback-ldl",
    parameter: "LDL Cholesterol",
    organ: "Heart",
    normal_range: "Below 100 mg/dL",
    explanation: {
      what_it_is: "LDL is often called 'bad' cholesterol because it can build up in the walls of your arteries.",
      why_it_happens: "Diets high in fried or processed foods, low activity and family history can raise LDL.",
      what_it_means: "Keeping LDL in range lowers your long-term risk of heart disease and stroke.",
    },
    recommendations: {
      lifestyle: [
        { change: "Walk briskly for 30 minutes a day", why: "Regular activity helps lower LDL and raise HDL." },
        { change: "Avoid smoking", why: "Smoking damages blood vessels and worsens cholesterol balance." },
      ],
      diet: {
        include: [
          { food: "Oats and whole grains", why: "Soluble fibre helps reduce LDL absorption." },
          { food: "Nuts and seeds", why: "Healthy fats support a better cholesterol profile.", tip: "A small handful a day is enough." },
        ],
        limit: [
          { food: "Fried and processed foods", why: "These are high in saturated and trans fats." },
          { food: "Red and processed meat", why: "They can raise LDL levels." },
        ],
      },
    },
    next_steps: {
      consult_doctor: { advice: "Discuss your lipid profile with a doctor if it is outside the normal range.", specialists: ["Cardiologist"] },
      tests: [{ name: "Lipid Profile" }],
    },
  },
  {
    rank: 2,
    id: "fallback-hba1c",
    parameter: "HbA1c",
    organ: "Sugar/Diabetes",
    normal_range: "Below 5.7%",
    explanation: {
      what_it_is: "HbA1c reflects your average blood sugar over the last 2-3 months.",
      why_it_happens: "Frequent sugary foods, refined carbs, low activity and excess weight can raise it.",
      what_it_means: "Keeping HbA1c in range reduces the risk of diabetes and its complications.",
    },
    recommendations: {
      lifestyle: [
        { change: "Take a short walk after meals", why: "It helps your body use glucose more effectively." },
        { change: "Sleep 7-8 hours", why: "Poor sleep can affect blood sugar control." },
      ],
      diet: {
        include: [
          { food: "Vegetables and pulses", why: "Fibre slows down sugar absorption." },
          { food: "Whole grains like millets and brown rice", why: "They release energy slowly." },
        ],
        limit: [
          { food: "Sweets and sugary drinks", why: "They cause quick sugar spikes." },
          { food: "White rice, maida and refined snacks", why: "Refined carbs raise blood sugar quickly." },
        ],
      },
    },
    next_steps: {
      consult_doctor: { advice: "Consult a doctor if your sugar levels are above the normal range.", specialists: ["Diabetologist"] },
      tests: [{ name: "HbA1c" }, { name: "Fasting Blood Sugar" }],
    },
  },
  {
    rank: 3,
    id: "fallback-vitd",
    parameter: "Vitamin D",
    organ: "Vitamins",
    normal_range: "30 - 100 ng/mL",
    explanation: {
      what_it_is: "Vitamin D helps your body absorb calcium and supports bones, muscles and immunity.",
      why_it_happens: "Limited sun exposure and low dietary intake are the most common causes of low levels.",
      what_it_means: "Low Vitamin D can lead to tiredness, body aches and weaker bones over time.",
    },
    recommendations: {
      lifestyle: [{ change: "Get 15-20 minutes of morning sunlight", why: "Sunlight helps your skin make Vitamin D." }],
      diet: {
        include: [
          { food: "Eggs and fatty fish", why: "Natural sources of Vitamin D." },
          { food: "Fortified milk and cereals", why: "They add Vitamin D to your daily diet." },
        ],
      },
    },
    next_steps: {
      consult_doctor: { advice: "Ask a doctor before starting supplements.", specialists: ["General Physician"] },
      tests: [{ name: "Vitamin D (25-OH)" }],
    },
  },
  {
    rank: 4,
    id: "fallback-hb",
    parameter: "Haemoglobin",
    organ: "Blood",
    normal_range: "12 - 17 g/dL",
    explanation: {
      what_it_is: "Haemoglobin is the protein in red blood cells that carries oxygen around your body.",
      why_it_happens: "Low iron, Vitamin B12 or folate intake and blood loss can lower haemoglobin.",
      what_it_means: "Low haemoglobin can cause fatigue, breathlessness and dizziness.",
    },
    recommendations: {
      lifestyle: [{ change: "Pair iron-rich foods with Vitamin C", why: "Vitamin C improves iron absorption." }],
      diet: {
        include: [
          { food: "Leafy greens, beetroot and dates", why: "Good sources of iron." },
          { food: "Citrus fruits and amla", why: "Rich in Vitamin C." },
        ],
        limit: [{ food: "Tea or coffee right after meals", why: "They can reduce iron absorption." }],
      },
    },
    next_steps: {
      consult_doctor: { advice: "See a doctor if you often feel tired or breathless.", specialists: ["General Physician"] },
      tests: [{ name: "Complete Blood Count" }, { name: "Iron Studies" }],
    },
  },
]

export const FALLBACK_RECOMMENDATIONS: RecommendationsResponse = {
  overall_summary:
    "We couldn't personalise your insights right now, so here are general tips for commonly checked health parameters.",
  top_recommendations: FALLBACK_PARAMETERS,
  organs: FALLBACK_PARAMETERS.map((p) => ({ organ: p.organ || "General", parameters: [p] })),
}
