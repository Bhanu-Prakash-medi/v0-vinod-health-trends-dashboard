import { AlertCircle, RotateCw } from "lucide-react"
import type { UploadError } from "./use-report-upload"

export function UploadErrorAlert({ error, onRetry }: { error: UploadError; onRetry: () => void }) {
  const canRetry = error.kind === "server"
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {error.messages.length > 1 ? (
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {error.messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : (
          <p>{error.messages[0]}</p>
        )}
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex w-fit items-center gap-1.5 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
