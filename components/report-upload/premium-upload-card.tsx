import { ArrowRight, FileText, LineChart, ScanText, ShieldCheck, Upload } from "lucide-react"

const FLOW = [
  { icon: Upload, label: "Upload PDF" },
  { icon: ScanText, label: "We digitise" },
  { icon: LineChart, label: "See trends" },
] as const

export function PremiumUploadCard({ onUpload, footer }: { onUpload: () => void; footer?: React.ReactNode }) {
  return (
    <section
      aria-labelledby="premium-upload-title"
      className="group relative isolate flex flex-col gap-5 overflow-hidden rounded-3xl bg-[#156ddc] p-5 text-[#ffffff] shadow-[0_18px_40px_-20px_rgba(21,109,220,0.7)] ring-1 ring-inset ring-[#ffffff]/10 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:repeating-linear-gradient(115deg,#fff_0_1px,transparent_1px_9px)]"
      />

      <div className="flex items-center gap-4">
        <div className="relative h-20 w-16 shrink-0" aria-hidden="true">
          <span className="absolute inset-0 translate-x-2.5 -translate-y-1.5 rotate-6 rounded-xl bg-[#ffffff]/15 ring-1 ring-inset ring-[#ffffff]/20 transition-transform duration-500 group-hover:translate-x-4 group-hover:rotate-12" />
          <span className="absolute inset-0 flex flex-col justify-end gap-1.5 overflow-hidden rounded-xl bg-[#ffffff] p-2.5 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:-translate-y-1">
            <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-[#156ddc]" />
            <span className="h-1 w-full rounded-full bg-[#156ddc]/50" />
            <span className="h-1 w-3/4 rounded-full bg-[#156ddc]/35" />
            <span className="h-1 w-1/2 rounded-full bg-[#156ddc]/25" />
            <span className="ht-scan-beam absolute inset-x-0 top-0 h-6 bg-[linear-gradient(180deg,transparent,rgba(21,109,220,0.35),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 id="premium-upload-title" className="sr-only">
            Upload a lab report
          </h3>
          <span className="flex w-fit items-center gap-1 rounded-full bg-[#ffffff]/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#ffffff] ring-1 ring-inset ring-[#ffffff]/20">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            Lab reports
          </span>
        </div>
      </div>

      <ol className="flex items-start justify-between gap-1 rounded-2xl bg-[#ffffff]/8 px-2 py-3 ring-1 ring-inset ring-[#ffffff]/10">
        {FLOW.map(({ icon: Icon, label }, i) => (
          <li key={label} className="flex flex-1 items-start">
            <span className="flex flex-1 flex-col items-center gap-1.5 text-center text-xs font-medium text-[#ffffff]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffffff]/15 ring-1 ring-inset ring-[#ffffff]/15">
                <Icon className="h-4 w-4 text-[#ffffff]" aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap">{label}</span>
            </span>
            {i < FLOW.length - 1 && <ArrowRight className="mt-2.5 h-3 w-3 shrink-0 text-[#ffffff]/70" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={onUpload}
        className="ht-sheen relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#ffffff] px-4 py-3.5 text-sm font-bold text-[#156ddc] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ffffff]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#156ddc] sm:text-base"
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        Upload report
      </button>

      {footer}
    </section>
  )
}
