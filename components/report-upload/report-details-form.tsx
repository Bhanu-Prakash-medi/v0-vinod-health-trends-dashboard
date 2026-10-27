"use client"

import { useEffect, useId, useState } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError, fetchFamilyMembers, type FamilyMember, type SaveFilePayload } from "@/lib/api"
import {
  ALLOWED_RELATIONS,
  DEFAULT_CONTRACT_TYPE,
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_NAME_MAX_LENGTH,
} from "@/lib/constants"
import { cn } from "@/lib/utils"

export type ReportDetails = Omit<SaveFilePayload, "signedURL" | "fileIdentifier" | "fileName">

interface ReportDetailsFormProps {
  fileName: string
  canSubmit: boolean
  isUploading: boolean
  isSaving: boolean
  onSubmit: (details: ReportDetails) => void
}

const inputClass =
  "w-full rounded-lg border border-[#dbe4ec] bg-white px-3 py-2 text-sm text-[#2e3742] placeholder:text-[#8a97a6] focus:border-[#156ddc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/30"

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function buildDetails(member: FamilyMember, date: Date, name: string, description: string): ReportDetails {
  const details: ReportDetails = {
    contractType: DEFAULT_CONTRACT_TYPE,
    dms_doc_name: name.trim(),
    dms_doc_date: format(date, "yyyy-MM-dd"),
    retail_vasbenefid: Number(member.vasBenifId),
    user_name: member.name,
    patientname: member.name,
  }
  const trimmedDescription = description.trim()
  if (trimmedDescription) details.description = trimmedDescription
  const relation = member.relation.trim().toLowerCase()
  if ((ALLOWED_RELATIONS as readonly string[]).includes(relation)) details.relation = relation
  return details
}

export function ReportDetailsForm({ fileName, canSubmit, isUploading, isSaving, onSubmit }: ReportDetailsFormProps) {
  const ids = { date: useId(), name: useId(), description: useId(), member: useId(), hint: useId() }
  const [date, setDate] = useState<Date | undefined>()
  const [dateOpen, setDateOpen] = useState(false)
  const [name, setName] = useState(() => fileName.replace(/\.pdf$/i, "").slice(0, REPORT_NAME_MAX_LENGTH))
  const [description, setDescription] = useState("")
  const [memberId, setMemberId] = useState<string>("")
  const [touched, setTouched] = useState(false)

  const {
    data: members,
    error: membersError,
    isLoading: membersLoading,
    mutate: reloadMembers,
  } = useSWR("report-upload:family-members", fetchFamilyMembers, { revalidateOnFocus: false })

  useEffect(() => {
    if (memberId || !members?.length) return
    const self = members.find((m) => m.relation.trim().toLowerCase() === "self") ?? members[0]
    setMemberId(String(self.vasBenifId))
  }, [members, memberId])

  const member = members?.find((m) => String(m.vasBenifId) === memberId)
  const isFuture = !!date && date > endOfToday()
  const errors = {
    date: !date ? "Please select the report date." : isFuture ? "Report date cannot be in the future." : null,
    name: !name.trim() ? "Please enter a report name." : null,
    member: !member ? "Please choose a family member." : null,
  }
  const isValid = !errors.date && !errors.name && !errors.member
  const submitDisabled = !canSubmit || !isValid || isSaving

  const hint = isSaving
    ? null
    : isUploading
      ? "Waiting for upload to finish..."
      : !isValid && touched
        ? "Please fill in the required fields."
        : null

  return (
    <form
      noValidate
      className="flex min-w-0 flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        setTouched(true)
        if (submitDisabled || !member || !date) return
        onSubmit(buildDetails(member, date, name, description))
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.date} className="text-sm font-medium text-[#2e3742]">
          When was this report taken? <span className="text-red-600">*</span>
        </label>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <button
              id={ids.date}
              type="button"
              aria-invalid={touched && !!errors.date}
              className={cn(inputClass, "flex items-center justify-between text-left", !date && "text-[#8a97a6]")}
            >
              {date ? format(date, "d MMM yyyy") : "Select a date"}
              <CalendarIcon className="h-4 w-4 text-[#4d5c6f]" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto bg-white p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date}
              captionLayout="dropdown"
              disabled={{ after: new Date() }}
              endMonth={new Date()}
              onSelect={(d) => {
                setDate(d)
                setDateOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
        {touched && errors.date && <p className="text-xs text-red-700">{errors.date}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.name} className="text-sm font-medium text-[#2e3742]">
          Report name <span className="text-red-600">*</span>
        </label>
        <input
          id={ids.name}
          value={name}
          maxLength={REPORT_NAME_MAX_LENGTH}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={touched && !!errors.name}
          className={inputClass}
        />
        {touched && errors.name && <p className="text-xs text-red-700">{errors.name}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor={ids.description} className="text-sm font-medium text-[#2e3742]">
            Description <span className="font-normal text-[#4d5c6f]">(optional)</span>
          </label>
          <span className="text-xs tabular-nums text-[#4d5c6f]">
            {description.length}/{REPORT_DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id={ids.description}
          value={description}
          rows={3}
          maxLength={REPORT_DESCRIPTION_MAX_LENGTH}
          onChange={(e) => setDescription(e.target.value)}
          className={cn(inputClass, "resize-none leading-relaxed")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.member} className="text-sm font-medium text-[#2e3742]">
          For which family member? <span className="text-red-600">*</span>
        </label>
        {membersLoading ? (
          <Skeleton className="h-10 w-full rounded-lg bg-[#eef2f5]" aria-label="Loading family members" />
        ) : membersError ? (
          <div role="alert" className="flex items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            <span>
              {membersError instanceof ApiError ? membersError.messages[0] : "Could not load family members."}
            </span>
            {!(membersError instanceof ApiError && membersError.kind === "unauthorized") && (
              <button type="button" onClick={() => reloadMembers()} className="text-xs font-semibold underline">
                Retry
              </button>
            )}
          </div>
        ) : (
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger id={ids.member} className="w-full min-w-0 bg-white text-[#2e3742] [&>span]:truncate" aria-invalid={touched && !!errors.member}>
              <SelectValue placeholder="Choose a family member" />
            </SelectTrigger>
            <SelectContent className="max-w-[calc(100vw-2rem)] bg-white">
              {members?.map((m) => (
                <SelectItem key={m.vasBenifId} value={String(m.vasBenifId)}>
                  {m.name} ({m.relation})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {touched && errors.member && !membersLoading && !membersError && (
          <p className="text-xs text-red-700">{errors.member}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="submit"
          disabled={submitDisabled}
          aria-describedby={hint ? ids.hint : undefined}
          onClick={() => setTouched(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#156ddc] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156ddc]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isSaving ? "Submitting..." : "Submit"}
        </button>
        {hint && (
          <p id={ids.hint} className="text-center text-xs text-[#4d5c6f]">
            {hint}
          </p>
        )}
      </div>
    </form>
  )
}
