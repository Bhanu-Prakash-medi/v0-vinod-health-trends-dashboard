import { ArrowRight, FileText, LineChart, ScanText, Upload } from "lucide-react"

const FLOW = [
  { icon: Upload, label: "Upload PDF" },
  { icon: ScanText, label: "We digitise" },
  { icon: LineChart, label: "See trends" },
] as const

export function PremiumUploadCard({ onUpload }: { onUpload: () => void }) {
  return (
    <section
      aria-labelledby="premium-upload-title"
      className="group relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-[#e3ecfa] bg-white p-5 shadow-[0_10px_30px_-18px_rgb(11_42_91/0.35)] sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-14 shrink-0" aria-hidden="true">
          <span className="absolute inset-0 translate-x-2 -translate-y-1 rotate-6 rounded-xl border border-[#d5e3f8] bg-[#e8f1fd] transition-transform duration-300 group-hover:translate-x-3 group-hover:rotate-12" />
          <span className="ht-doc-tile absolute inset-0 flex flex-col justify-end gap-1 overflow-hidden rounded-xl bg-[#0b2a5b] p-2.5 shadow-lg transition-transform duration-300 group-hover:-translate-y-1">
            <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8fb8f0]" />
            <span className="h-1 w-full rounded-full bg-[#8fb8f0]/60" />
            <span className="h-1 w-3/4 rounded-full bg-[#8fb8f0]/40" />
            <span className="h-1 w-1/2 rounded-full bg-[#8fb8f0]/30" />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="w-fit rounded-full bg-[#e8f1fd] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#156ddc]">
            Lab reports
          </span>
          <h3 id="premium-upload-title" className="text-balance text-base font-bold text-[#0b2a5b]">
            Turn your lab report into live health trends
          </h3>
          <p className="text-pretty text-sm leading-relaxed text-[#4d5c6f]">
            Upload a PDF and we&apos;ll add every value to your health records.
          </p>
        </div>
      </div>

      <ol className="flex items-center justify-between gap-1 rounded-2xl bg-[#f5f8fe] px-3 py-2.5">
        {FLOW.map(({ icon: Icon, label }, i) => (
          <li key={label} className="flex min-w-0 items-center gap-1">
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-[#0b2a5b]">
              <Icon className="h-3.5 w-3.5 shrink-0 text-[#156ddc]" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </span>
            {i < FLOW.length - 1 && <ArrowRight className="ml-1 h-3 w-3 shrink-0 text-[#8fb8f0]" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={onUpload}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#156ddc] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgb(21_109_220/0.8)] transition-all hover:-translate-y-0.5 hover:bg-[#1262c6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40 focus-visible:ring-offset-2"
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        Upload report
      </button>
    </section>
  )
}
