import { NextResponse } from "next/server"
import { mergeReportsKeepLatest, type ApiHealthReport } from "@/lib/api"

// TEMPORARY verification route - deleted after checking same-date separation.
export async function GET() {
  const SAME_DATE = "2026-03-08"

  const mk = (name: string, category: string, param: string): ApiHealthReport => ({
    patient_info: { name: "T", age: 30, gender: "Male", profileImage: "" },
    reports: [
      {
        name,
        date: SAME_DATE,
        fullfilmentDate: SAME_DATE,
        parameters: { [param]: { value: 1, unit: "x", status: "normal" } },
      } as any,
    ],
    health_summary: [
      { category, out_of_range_count: 0, parameters: [{ name: param, value: 1, status: "normal" }] } as any,
    ],
  })

  const reports = [
    mk("Lipid Profile", "Heart", "Cholesterol"),
    mk("CBC", "Blood", "Haemoglobin"),
    { ...mk("Thyroid", "Thyroid", "TSH"), reports: [{ name: "Thyroid", date: "2025-01-10", fullfilmentDate: "2025-01-10", parameters: { TSH: { value: 2 } } } as any] },
  ]

  const merged = mergeReportsKeepLatest(reports)

  return NextResponse.json({
    byDateEntries: (merged.health_summary_by_date || []).map((e) => ({
      dateKey: e.dateKey,
      reportName: e.reportName,
      categories: e.health_summary.map((h: any) => h.category),
    })),
    sameDateEntryCount: (merged.health_summary_by_date || []).filter((e) => e.dateKey === SAME_DATE).length,
    allReportsCount: (merged.all_reports_raw || []).length,
  })
}
