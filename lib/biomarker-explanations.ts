// Biomarker / health-parameter explanations shown via the info (i) button.
// Descriptions are authored content (not AI generated).

export interface BiomarkerExplanation {
  title: string
  description: string
}

interface RawExplanation extends BiomarkerExplanation {
  // Optional extra names/abbreviations that map to this explanation.
  aliases?: string[]
}

const EXPLANATIONS: RawExplanation[] = [
  // --- Blood / Sugar / Lipids ---
  {
    title: "Complete Blood Count (CBC) / Haemogram (CBC+ESR)",
    description:
      "Evaluates overall blood health by measuring red blood cells, white blood cells, hemoglobin, and platelets. Helps detect anemia, infections, inflammation, and blood disorders.",
    aliases: ["CBC", "Haemogram", "Hemogram", "CBC ESR"],
  },
  {
    title: "Glucose Fasting (FBS)",
    description: "Measures blood sugar after fasting to screen for diabetes mellitus and prediabetes.",
    aliases: ["FBS", "Fasting Blood Sugar", "Fasting Glucose", "Fasting Plasma Glucose"],
  },
  {
    title: "Glucose Post Prandial (PPBS)",
    description: "Measures blood sugar two hours after a meal to assess how the body processes glucose.",
    aliases: ["PPBS", "Post Prandial Blood Sugar", "Post Prandial Glucose", "PP Glucose"],
  },
  {
    title: "Glycosylated Hemoglobin (HbA1c)",
    description:
      "Indicates the average blood sugar level over the past 3 months and is used to diagnose and monitor diabetes mellitus.",
    aliases: ["HbA1c", "HBA1C", "Glycated Hemoglobin", "Glycosylated Haemoglobin", "A1c"],
  },
  {
    title: "Cholesterol Total",
    description: "Measures the total cholesterol level to assess the risk of cardiovascular disease.",
    aliases: ["Total Cholesterol", "Cholesterol"],
  },
  {
    title: "HDL Cholesterol",
    description:
      "Known as 'good cholesterol.' Higher levels help protect against heart disease by removing excess cholesterol from the bloodstream.",
    aliases: ["HDL", "HDL - Cholesterol", "High Density Lipoprotein"],
  },
  {
    title: "LDL Cholesterol",
    description: "Known as 'bad cholesterol.' Elevated levels increase the risk of blocked arteries and heart disease.",
    aliases: ["LDL", "LDL - Cholesterol", "Low Density Lipoprotein"],
  },
  {
    title: "Triglycerides",
    description:
      "Measures the level of fats in the blood. High levels are associated with heart disease and metabolic disorders.",
    aliases: ["Triglyceride", "TG"],
  },
  {
    title: "VLDL (Very Low Density Lipoprotein)",
    description:
      "A type of cholesterol responsible for carrying triglycerides. Elevated levels may contribute to plaque buildup in arteries.",
    aliases: ["VLDL", "VLDL Cholesterol", "Very Low Density Lipoprotein"],
  },
  {
    title: "Cholesterol/HDL Ratio",
    description:
      "Indicates the balance between total cholesterol and protective HDL cholesterol. Lower ratios suggest lower cardiovascular risk.",
    aliases: ["Cholesterol HDL Ratio", "Total Cholesterol/HDL Ratio", "TC/HDL Ratio"],
  },
  {
    title: "HDL/LDL Ratio",
    description: "Assesses the balance between good and bad cholesterol to evaluate heart health.",
    aliases: ["HDL LDL Ratio"],
  },
  {
    title: "LDL/HDL Ratio",
    description: "Another indicator of cardiovascular risk based on the relationship between LDL and HDL cholesterol.",
    aliases: ["LDL HDL Ratio"],
  },
  {
    title: "Apolipoprotein A1 (Apo-A1)",
    description:
      "The primary protein in HDL cholesterol. Higher levels generally indicate better cardiovascular protection.",
    aliases: ["Apo-A1", "Apo A1", "ApoA1", "Apolipoprotein A1", "Apolipoprotein A"],
  },
  {
    title: "Apolipoprotein B (Apo-B)",
    description: "Represents the number of harmful cholesterol particles. High levels increase cardiovascular risk.",
    aliases: ["Apo-B", "Apo B", "ApoB", "Apolipoprotein B"],
  },
  {
    title: "Lipoprotein(a) [Lp(a)]",
    description:
      "An inherited risk factor for heart disease and stroke. Elevated levels increase cardiovascular risk independent of cholesterol levels.",
    aliases: ["Lp(a)", "Lpa", "Lipoprotein a", "Lipoprotein (a)"],
  },

  // --- Liver ---
  {
    title: "Alanine Aminotransferase (ALT/SGPT)",
    description: "A liver enzyme used to detect liver injury or inflammation.",
    aliases: ["ALT", "SGPT", "ALT/SGPT", "SGPT/ALT", "Alanine Aminotransferase", "SGPT (ALT)"],
  },
  {
    title: "Aspartate Aminotransferase (AST/SGOT)",
    description: "A liver and muscle enzyme used to assess liver function and muscle damage.",
    aliases: ["AST", "SGOT", "AST/SGOT", "SGOT/AST", "Aspartate Aminotransferase", "SGOT (AST)"],
  },
  {
    title: "Alkaline Phosphatase (ALP)",
    description:
      "Helps evaluate liver function and bone health. Elevated levels may indicate liver or bone disorders.",
    aliases: ["ALP", "Alkaline Phosphatase"],
  },
  {
    title: "Gamma Glutamyl Transpeptidase (GGT)",
    description:
      "A liver enzyme used to identify liver disease, bile duct problems, and excessive alcohol consumption.",
    aliases: ["GGT", "GGTP", "Gamma GT", "Gamma Glutamyl Transferase", "Gamma Glutamyl Transpeptidase"],
  },
  {
    title: "Bilirubin Total",
    description:
      "Measures the total bilirubin level to assess liver function and detect jaundice or bile duct disorders.",
    aliases: ["Total Bilirubin", "Bilirubin (Total)"],
  },
  {
    title: "Bilirubin Direct",
    description: "Measures the conjugated/bound form of bilirubin to evaluate liver and bile duct function.",
    aliases: ["Direct Bilirubin", "Bilirubin (Direct)", "Conjugated Bilirubin"],
  },
  {
    title: "Bilirubin Indirect",
    description: "Measures unconjugated/unbound bilirubin to help diagnose blood disorders and liver conditions.",
    aliases: ["Indirect Bilirubin", "Bilirubin (Indirect)", "Unconjugated Bilirubin"],
  },
  {
    title: "Total Protein",
    description:
      "Measures the combined level of albumin and globulin proteins to assess nutritional status, liver function, and kidney health.",
    aliases: ["Protein Total", "Serum Total Protein"],
  },

  // --- Kidney / Electrolytes / Inflammation ---
  {
    title: "Creatinine",
    description: "Evaluates kidney function by measuring the waste products filtered by the kidneys.",
    aliases: ["Serum Creatinine", "Creatinine Serum"],
  },
  {
    title: "Blood Urea Nitrogen (BUN)",
    description: "Assesses kidney function and protein metabolism.",
    aliases: ["BUN", "Urea", "Blood Urea", "Blood Urea Nitrogen"],
  },
  {
    title: "Uric Acid",
    description: "Measures uric acid levels to evaluate the risk of gout and certain other kidney disorders.",
    aliases: ["Serum Uric Acid"],
  },
  {
    title: "Electrolytes (Sodium, Potassium & Chloride)",
    description:
      "Maintains body fluid and blood volume required for the normal function of nerve, muscles, and kidneys.",
    aliases: ["Electrolytes", "Sodium", "Potassium", "Chloride", "Na", "K", "Cl", "Serum Electrolytes"],
  },
  {
    title: "Calcium",
    description:
      "Assesses bone health and detects disorders of the kidney, nerves, muscles, parathyroid gland and heart.",
    aliases: ["Serum Calcium", "Ca"],
  },
  {
    title: "C-Reactive Protein (CRP)",
    description:
      "Evaluates inflammation in the body to help detect infections, autoimmune diseases, and other inflammatory conditions.",
    aliases: ["CRP", "hs-CRP", "hsCRP", "High Sensitivity CRP", "C Reactive Protein"],
  },

  // --- Thyroid ---
  {
    title: "Thyroid Stimulating Hormone (TSH)",
    description:
      "Evaluates thyroid function to help detect and monitor underactive or overactive thyroid disorders.",
    aliases: ["TSH", "Thyroid Stimulating Hormone", "TSH Ultrasensitive", "S TSH"],
  },
  {
    title: "Thyroid Profile (T3, T4 & TSH)",
    description:
      "Evaluates thyroid function by measuring thyroid hormones and their regulating hormone to help detect and monitor thyroid disorders.",
    aliases: ["Thyroid Profile", "T3 T4 TSH", "Thyroid Function Test", "TFT"],
  },
  {
    title: "Thyroglobulin (Tg)",
    description: "Used primarily to monitor thyroid cancer treatment and evaluate thyroid tissue function.",
    aliases: ["Tg", "Thyroglobulin"],
  },
  {
    title: "Homocysteine",
    description:
      "Elevated levels are associated with an increased risk of cardiovascular disease and stroke.",
    aliases: ["Serum Homocysteine"],
  },

  // --- Vitamins ---
  {
    title: "Vitamin B12",
    description:
      "Evaluates vitamin B12 levels to help detect deficiency that can cause anemia, nerve damage, and neurological disorders.",
    aliases: ["B12", "Vit B12", "Cyanocobalamin", "Cobalamin", "Vitamin B-12"],
  },
  {
    title: "Vitamin D Total (25-Hydroxy)",
    description:
      "Evaluates vitamin D levels to help detect deficiency that can cause bone disorders, muscle weakness, and impaired calcium absorption.",
    aliases: ["Vitamin D", "Vit D", "Vitamin D Total", "25-Hydroxy Vitamin D", "25 OH Vitamin D", "Vitamin D3"],
  },

  // --- Tumor markers / Infections / Screening ---
  {
    title: "Hepatitis B Surface Antigen (HBsAg)",
    description: "Screens for active Hepatitis B virus infection.",
    aliases: ["HBsAg", "Hepatitis B Surface Antigen", "HBS Antigen"],
  },
  {
    title: "Prostate Specific Antigen (PSA) Total",
    description: "Screens for prostate abnormalities, including enlargement, inflammation, and prostate cancer.",
    aliases: ["PSA", "PSA Total", "Total PSA", "Prostate Specific Antigen"],
  },
  {
    title: "PSA + Free PSA + Ratio",
    description:
      "Evaluates prostate health to help distinguish prostate cancer from benign prostate conditions and guide the need for further evaluation.",
    aliases: ["Free PSA", "PSA Ratio", "Free PSA Ratio"],
  },
  {
    title: "Alpha Feto Protein (AFP)",
    description:
      "Evaluates alpha-fetoprotein levels to help detect and monitor liver, reproductive system cancers, and certain liver diseases.",
    aliases: ["AFP", "Alpha Fetoprotein", "Alpha Feto Protein"],
  },
  {
    title: "Carcinoembryonic Antigen (CEA)",
    description:
      "Evaluates carcinoembryonic antigen levels to help monitor colorectal cancer, assess treatment response, and detect cancer recurrence.",
    aliases: ["CEA", "Carcinoembryonic Antigen"],
  },
  {
    title: "CA 19-9",
    description:
      "A tumor marker primarily used to monitor pancreatic cancer, assess treatment response, and detect cancer recurrence.",
    aliases: ["CA19-9", "CA 19 9", "Carbohydrate Antigen 19-9"],
  },
  {
    title: "CA 125",
    description: "A tumor marker commonly used in the evaluation and monitoring of ovarian cancer.",
    aliases: ["CA125", "Cancer Antigen 125"],
  },
  {
    title: "CA 15-3",
    description: "A tumor marker used primarily in monitoring breast cancer.",
    aliases: ["CA15-3", "CA 15 3", "Cancer Antigen 15-3"],
  },
  {
    title: "Calcitonin",
    description: "Helps detect and monitor certain types of cancer and disorders of the thyroid gland.",
    aliases: ["Serum Calcitonin"],
  },
  {
    title: "Beta hCG Total",
    description:
      "Helpful to confirm pregnancy, monitor pregnancy-related conditions, and detect certain reproductive system cancers.",
    aliases: ["Beta hCG", "Beta HCG", "b-hCG", "hCG", "Beta Human Chorionic Gonadotropin"],
  },
  {
    title: "Urine Analysis / Complete Urine Examination (CUE)",
    description:
      "Evaluates urine composition to help detect urinary tract infections, kidney disorders, diabetes, and other metabolic conditions.",
    aliases: ["Urine Analysis", "Urine Examination", "CUE", "Urine Routine", "Urinalysis"],
  },
  {
    title: "Stool Examination",
    description:
      "Evaluates stool composition to help detect intestinal infections, digestive disorders, gastrointestinal bleeding and parasitic infestations.",
    aliases: ["Stool Analysis", "Stool Routine", "Stool Test"],
  },

  // --- Vitals / Imaging / Functional tests ---
  {
    title: "Blood Pressure",
    description:
      "Evaluates blood pressure to help detect and monitor hypertension, hypotension, and cardiovascular disease risk.",
    aliases: ["BP", "Blood Pressure (BP)"],
  },
  {
    title: "Body Mass Index (BMI)",
    description:
      "Evaluates body weight relative to height to help assess the risk of overweight, obesity, and weight-related health conditions.",
    aliases: ["BMI", "Body Mass Index"],
  },
  {
    title: "Anthropometric Data",
    description:
      "Includes measurements such as height, weight, waist circumference, and body composition to evaluate overall physical health.",
    aliases: ["Anthropometry"],
  },
  {
    title: "Electrocardiogram (ECG)",
    description:
      "Records the electrical activity of the heart at rest, to detect rhythm abnormalities and heart diseases.",
    aliases: ["ECG", "EKG", "Electrocardiogram", "ECG Resting"],
  },
  {
    title: "Treadmill Test (TMT)",
    description:
      "Evaluates heart function during exercise to help detect coronary artery disease, exercise-induced heart rhythm abnormalities, and reduced blood flow to the heart.",
    aliases: ["TMT", "Treadmill Test", "Stress Test", "Exercise Stress Test"],
  },
  {
    title: "2D Echo with Colour Doppler / ECHO",
    description: "Uses ultrasound to assess the heart's structure, pumping function, and blood flow.",
    aliases: ["2D Echo", "ECHO", "Echocardiogram", "2D Echocardiography"],
  },
  {
    title: "Pulmonary Function Test (PFT)",
    description:
      "Measures lung capacity and airflow to diagnose and monitor asthma, obstructive, restrictive and interstitial lung disorders.",
    aliases: ["PFT", "Spirometry", "Lung Function Test"],
  },
  {
    title: "X-Ray Chest",
    description:
      "Evaluates the heart, lungs, and chest structures to help detect infections, lung diseases, heart enlargement, and chest abnormalities.",
    aliases: ["Chest X-Ray", "X Ray Chest", "CXR", "Chest Xray"],
  },
  {
    title: "Ultrasound Whole Abdomen/Pelvis",
    description:
      "Evaluates the abdominal and pelvic organs to help detect stones, cysts, tumors, infections, and other abnormalities.",
    aliases: ["USG Abdomen", "Ultrasound Abdomen", "Ultrasound Abdomen Pelvis", "USG Whole Abdomen"],
  },
  {
    title: "Prostate Scan",
    description: "Evaluates the prostate gland to help detect enlargement, tumors, cysts, and other prostate abnormalities.",
    aliases: ["Prostate Ultrasound", "Prostate USG"],
  },
  {
    title: "Bone Densitometry",
    description: "Measures bone mineral density to assess osteoporosis, osteopenia, and fracture risk.",
    aliases: ["DEXA", "DXA", "Bone Density", "BMD", "Bone Mineral Density"],
  },

  // --- Women's health / Eye / ENT / Dental ---
  {
    title: "Mammogram (Mammography)",
    description:
      "X-ray imaging of the breasts used to detect abnormalities, benign/non-cancerous and malignant/cancerous conditions of the breast.",
    aliases: ["Mammogram", "Mammography"],
  },
  {
    title: "Pap Smear",
    description:
      "Evaluates cervical cells to help detect precancerous changes, cervical cancer, and certain cervical infections.",
    aliases: ["PAP Smear", "Pap Test", "Cervical Smear"],
  },
  {
    title: "Ovaries/Uterus Scan",
    description:
      "Evaluates the uterus and ovaries to help detect fibroids, ovarian cysts, tumors, and other gynecological abnormalities.",
    aliases: ["Ovaries Scan", "Uterus Scan", "Pelvic Ultrasound", "USG Pelvis"],
  },
  {
    title: "General Eye Check (Comprehensive Eye Examination)",
    description:
      "Evaluates vision and eye health to help detect refractive errors, glaucoma, cataracts, diabetic eye disease, and other eye disorders.",
    aliases: ["Eye Check", "Eye Examination", "Comprehensive Eye Examination", "Eye Test"],
  },
  {
    title: "Retinal Examination",
    description:
      "Evaluates the retina and optic nerve to help detect diabetic retinopathy, glaucoma, macular degeneration, and other retinal disorders.",
    aliases: ["Retina Examination", "Fundus Examination", "Fundoscopy"],
  },
  {
    title: "Tonometry",
    description: "Measures eye pressure to screen for glaucoma.",
    aliases: ["Eye Pressure", "Intraocular Pressure", "IOP"],
  },
  {
    title: "Refractive Error Test",
    description:
      "Evaluates the eye's focusing ability to help detect myopia, hyperopia, astigmatism, and presbyopia.",
    aliases: ["Refraction Test", "Refractive Error"],
  },
  {
    title: "Impedance Audiometry (Tympanometry)",
    description: "Evaluates middle ear function and helps diagnose related disorders.",
    aliases: ["Tympanometry", "Impedance Audiometry", "Audiometry"],
  },
  {
    title: "Dental Examination",
    description: "Assesses oral health, including teeth, gums, and signs of dental disease.",
    aliases: ["Dental Checkup", "Dental Check"],
  },
  {
    title: "Oral Cancer Checkup",
    description:
      "Screens the mouth and surrounding tissues to help detect tooth decay, gum disease, oral infections, and signs of oral cancer.",
    aliases: ["Oral Cancer Screening"],
  },
  {
    title: "Oral Hygiene Review",
    description:
      "Evaluates oral hygiene practices to help detect plaque buildup, gum disease, tooth decay risk, and other oral health concerns.",
    aliases: ["Oral Hygiene"],
  },
]

// --- Matching helpers ---

const STOPWORDS = new Set(["the", "a", "an", "of", "and", "with", "test", "level", "levels", "serum", "s", "blood"])

// Collapse to alphanumeric-only, lowercased.
function normFull(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "")
}

// Portion before the first parenthesis/bracket.
function preParen(s: string): string {
  return s.split(/[([]/)[0]
}

// Meaningful, order-independent token set (stopwords removed).
function tokenKey(s: string): string {
  const tokens = s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t))
  return Array.from(new Set(tokens)).sort().join(" ")
}

interface IndexEntry {
  explanation: BiomarkerExplanation
  fullKeys: Set<string> // exact normalized forms (incl. abbreviations)
  tokenKeys: Set<string> // order-independent token-set forms
}

function buildIndex(): IndexEntry[] {
  return EXPLANATIONS.map((raw) => {
    const explanation: BiomarkerExplanation = { title: raw.title, description: raw.description }
    const candidates = [raw.title, preParen(raw.title), ...(raw.aliases ?? [])]

    // Also add tokens found inside parentheses/brackets as standalone keys (e.g. "HbA1c", "TSH").
    const parenMatches = raw.title.match(/[([]([^)\]]+)[)\]]/g) ?? []
    for (const m of parenMatches) {
      const inner = m.replace(/[()[\]]/g, "")
      for (const piece of inner.split(/[/,&+]/)) {
        if (piece.trim()) candidates.push(piece.trim())
      }
    }

    const fullKeys = new Set<string>()
    const tokenKeys = new Set<string>()
    for (const c of candidates) {
      const nf = normFull(c)
      if (nf) fullKeys.add(nf)
      const tk = tokenKey(preParen(c) || c)
      if (tk) tokenKeys.add(tk)
    }

    return { explanation, fullKeys, tokenKeys }
  })
}

const INDEX = buildIndex()

/**
 * Look up a biomarker/parameter explanation by name.
 * Conservative matching (exact normalized, then order-independent token-set,
 * then abbreviation) so the info button only appears when we are confident.
 */
export function getBiomarkerExplanation(name?: string | null): BiomarkerExplanation | null {
  if (!name || !name.trim()) return null

  const inFull = normFull(name)
  const inPreFull = normFull(preParen(name))
  const inTokenKey = tokenKey(preParen(name) || name)

  // Pass 1: exact normalized match (handles full names + abbreviations).
  for (const entry of INDEX) {
    if (entry.fullKeys.has(inFull) || (inPreFull && entry.fullKeys.has(inPreFull))) {
      return entry.explanation
    }
  }

  // Pass 2: order-independent token-set equality (handles "Total Cholesterol" vs "Cholesterol Total").
  if (inTokenKey) {
    for (const entry of INDEX) {
      if (entry.tokenKeys.has(inTokenKey)) {
        return entry.explanation
      }
    }
  }

  return null
}
