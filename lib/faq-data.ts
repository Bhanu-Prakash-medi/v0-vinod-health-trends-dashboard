export interface FaqItem {
  id: string
  question: string
  answer: string
}

export interface FaqGroup {
  id: string
  title: string
  items: FaqItem[]
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "score",
    title: "About your score",
    items: [
      {
        id: "what-is-mhrs",
        question: "What is the MediBuddy Health Risk Score (MHRS)?",
        answer:
          "It's a single, easy-to-read number built from your routine preventive health check-up results. Instead of you having to interpret dozens of individual lab values on your own, the MHRS combines them into one composite indicator of your overall health status.",
      },
      {
        id: "how-calculated",
        question: "How is my MHRS calculated?",
        answer:
          "Each lab result is first compared to the standard clinical reference range and marked as \"within range\" or \"outside range.\" Outside-range results are then weighted by clinical importance, added up within each organ-system profile (like Cardiac or Renal), and the profile scores are combined into your overall score.",
      },
      {
        id: "is-diagnosis",
        question: "Is the MHRS a diagnosis?",
        answer:
          "No. It's a wellness-oriented risk stratification tool, not a diagnostic test or disease prediction model. It flags where your results deviate from the expected range so you know where to focus — a doctor is still needed to interpret findings, diagnose, and decide on treatment.",
      },
      {
        id: "why-score",
        question: "Why do I see a score instead of just my lab values?",
        answer:
          "Your check-up can include dozens of results across several organ systems at once. A single score makes it much easier to see your overall picture at a glance, without losing the detail — your full lab report is always available alongside it.",
      },
      {
        id: "test-weights",
        question: "Why do some tests matter more than others in my score?",
        answer:
          "Not every lab test carries equal clinical weight. For example, LDL cholesterol is weighted more heavily than total cholesterol in your Cardiac profile because it's a primary target in reducing cardiovascular risk, and TSH is weighted heavily in Thyroid because it's the preferred first test for thyroid function.",
      },
      {
        id: "within-outside",
        question: "What does it mean if a test is \"within range\" or \"outside range\"?",
        answer:
          "\"Within range\" (scored 0) means your result falls in the expected range for a healthy population. \"Outside range\" (scored 10) means it deviates from that range and contributes to your profile's risk score — it doesn't automatically mean disease, but it is worth a closer look.",
      },
    ],
  },
  {
    id: "trends",
    title: "Trends & changes",
    items: [
      {
        id: "what-trend",
        question: "What does \"trend\" mean on my report?",
        answer:
          "A trend compares your latest result to your previous report for the same parameter, showing whether it's increasing, decreasing, or consistently high (or low) over time — a single reading is a snapshot, but a trend shows direction.",
      },
      {
        id: "why-changed",
        question: "Why did my score or reading change since my last report?",
        answer:
          "Many things can shift a result: diet, hydration, sleep, stress, medication, exercise before the test, or an underlying condition developing or improving. A single change is often not concerning on its own — the trend across several reports tells you more than any one report alone.",
      },
      {
        id: "increasing-trend",
        question: "What should I do if my trend shows \"increasing\" or \"consistently high\"?",
        answer:
          "A sustained or worsening trend is more meaningful than a one-off abnormal reading, so it's worth flagging to a doctor sooner rather than waiting for your next annual check-up, even if the current value isn't in an urgent range.",
      },
      {
        id: "one-abnormal",
        question: "Can one abnormal reading raise my whole risk score?",
        answer:
          "Yes, but the effect depends on that parameter's clinical weight and which profile it sits in. A markedly abnormal, heavily-weighted parameter (like LDL cholesterol or creatinine) will move your score more than a mildly abnormal, lower-weighted one.",
      },
      {
        id: "profile-high",
        question: "Why does one profile show high risk while my overall score looks fine?",
        answer:
          "Your overall score blends six profiles (Cardiac, Diabetes, Renal, Hepatic, Haematology, Thyroid). It's possible for one profile to be significantly elevated while the others are normal, keeping your overall average moderate — that's exactly why the profile-level breakdown is shown alongside the composite score, so you can see which system needs attention.",
      },
    ],
  },
  {
    id: "doctor",
    title: "Alerts & doctor consultations",
    items: [
      {
        id: "alert",
        question: "What should I do if I get an alert about an abnormal finding?",
        answer:
          "Read the note attached to that finding — it explains what the abnormality can indicate and what's usually checked alongside it (\"cross-checks\"). For anything flagged as needing prompt attention, don't wait for your next scheduled check-up; book a consultation.",
      },
      {
        id: "see-doctor-immediately",
        question: "Do I need to see a doctor immediately for every flagged parameter?",
        answer:
          "No. Most flagged results call for routine follow-up rather than urgent care — the urgency level shown with each finding tells you how soon it should be looked at. A small number of specific findings (for example, markedly abnormal electrolytes or an abnormal ECG) are flagged for prompt evaluation because they're recognised as more clinically urgent.",
      },
      {
        id: "book-consultation",
        question: "How do I book a doctor consultation through MediBuddy?",
        answer:
          "Use the \"Book a doctor consultation\" link on your nudge message or report screen — it takes you straight to booking with the right specialist for that finding.",
      },
      {
        id: "which-specialist",
        question: "Which specialist should I consult for a specific finding?",
        answer:
          "Each flagged parameter comes with a recommended specialist — for example, a Cardiologist for lipid or ECG findings, a Nephrologist for kidney markers, an Endocrinologist for thyroid or sugar findings, or a General Physician for a first opinion when you're not sure where to start.",
      },
      {
        id: "discuss-report",
        question: "Can I discuss my MHRS report directly with a doctor?",
        answer:
          "Yes — bring or share your report (including the profile breakdown and trend) at your consultation. It gives the doctor useful context on what changed and when, alongside the standard lab report.",
      },
      {
        id: "disagree",
        question: "What if I disagree with or don't understand my report?",
        answer:
          "The MHRS is designed to complement, not replace, clinical judgement. If something doesn't make sense or seems off, the right next step is always a conversation with a doctor, who can interpret your results in the context of your full medical history.",
      },
    ],
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    items: [
      {
        id: "improve-score",
        question: "Can diet and lifestyle changes improve my score?",
        answer:
          "Yes, for many flagged parameters. Things like elevated cholesterol, borderline blood sugar, or raised BMI often respond to sustained changes in diet, physical activity, and sleep — though some findings (like a thyroid or kidney marker) may need medical management rather than lifestyle change alone.",
      },
    ],
  },
]

export const ALL_FAQS: FaqItem[] = FAQ_GROUPS.flatMap((g) => g.items)
