"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"
import {
  ApiError,
  GENERIC_ERROR_MESSAGE,
  UPLOAD_EXPIRED_MESSAGE,
  getSignedUploadUrl,
  isAbortError,
  saveReportFile,
  uploadFileToSignedUrl,
  type ApiErrorKind,
  type SaveFilePayload,
  type SaveFileResponse,
} from "@/lib/api"
import { SIGNED_URL_TTL_MS } from "@/lib/constants"
import { validatePdf } from "@/lib/validate-pdf"

export type UploadPhase = "idle" | "validating" | "uploading" | "readyToSubmit" | "saving" | "success" | "error"
export type FailedStep = "upload" | "save"

interface SignedUpload {
  signedURL: string
  fileIdentifier: string
  issuedAt: number
}

export interface UploadError {
  step: FailedStep
  kind: ApiErrorKind
  messages: string[]
}

interface State {
  phase: UploadPhase
  file: File | null
  fileError: string | null
  progress: number
  signed: SignedUpload | null
  uploaded: boolean
  error: UploadError | null
  result: SaveFileResponse | null
}

const initialState: State = {
  phase: "idle",
  file: null,
  fileError: null,
  progress: 0,
  signed: null,
  uploaded: false,
  error: null,
  result: null,
}

type Action =
  | { type: "reset"; fileError?: string | null }
  | { type: "validating"; file: File }
  | { type: "invalid"; message: string }
  | { type: "uploadStart" }
  | { type: "signed"; signed: SignedUpload }
  | { type: "progress"; progress: number }
  | { type: "uploaded" }
  | { type: "saving" }
  | { type: "saved"; result: SaveFileResponse }
  | { type: "failed"; error: UploadError }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return { ...initialState, fileError: action.fileError ?? null }
    case "validating":
      return { ...initialState, phase: "validating", file: action.file }
    case "invalid":
      return { ...initialState, fileError: action.message }
    case "uploadStart":
      return { ...state, phase: "uploading", progress: 0, error: null }
    case "signed":
      return { ...state, signed: action.signed }
    case "progress":
      return { ...state, progress: action.progress }
    case "uploaded":
      return { ...state, phase: "readyToSubmit", progress: 100, uploaded: true, error: null }
    case "saving":
      return { ...state, phase: "saving", error: null }
    case "saved":
      return { ...state, phase: "success", result: action.result }
    case "failed":
      return { ...state, phase: "error", error: action.error }
  }
}

function toUploadError(step: FailedStep, error: unknown): UploadError {
  if (error instanceof ApiError) return { step, kind: error.kind, messages: error.messages }
  return { step, kind: "server", messages: [GENERIC_ERROR_MESSAGE] }
}

export function useReportUpload() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const controllerRef = useRef<AbortController | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const abortInFlight = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  const nextController = useCallback(() => {
    abortInFlight()
    const controller = new AbortController()
    controllerRef.current = controller
    return controller
  }, [abortInFlight])

  useEffect(() => abortInFlight, [abortInFlight])

  const runUpload = useCallback(
    async (file: File, existing: SignedUpload | null) => {
      const controller = nextController()
      dispatch({ type: "uploadStart" })
      try {
        let signed = existing
        if (signed && Date.now() - signed.issuedAt > SIGNED_URL_TTL_MS) {
          dispatch({ type: "reset", fileError: UPLOAD_EXPIRED_MESSAGE })
          return
        }
        if (!signed) {
          const response = await getSignedUploadUrl(file.name, controller.signal)
          signed = { signedURL: response.signedURL, fileIdentifier: response.fileIdentifier, issuedAt: Date.now() }
          dispatch({ type: "signed", signed })
        }
        await uploadFileToSignedUrl(
          signed.signedURL,
          file,
          (progress) => dispatch({ type: "progress", progress }),
          controller.signal,
        )
        if (controller.signal.aborted) return
        dispatch({ type: "uploaded" })
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return
        if (error instanceof ApiError && error.kind === "expired") {
          dispatch({ type: "reset", fileError: UPLOAD_EXPIRED_MESSAGE })
          return
        }
        dispatch({ type: "failed", error: toUploadError("upload", error) })
      }
    },
    [nextController],
  )

  const selectFile = useCallback(
    async (file: File) => {
      const controller = nextController()
      dispatch({ type: "validating", file })
      const result = await validatePdf(file)
      if (controller.signal.aborted) return
      if (!result.ok) {
        dispatch({ type: "invalid", message: result.message })
        return
      }
      void runUpload(file, null)
    },
    [nextController, runUpload],
  )

  const lastPayloadRef = useRef<Omit<SaveFilePayload, "signedURL" | "fileIdentifier" | "fileName"> | null>(null)

  const submit = useCallback(
    async (details: Omit<SaveFilePayload, "signedURL" | "fileIdentifier" | "fileName">) => {
      const { file, signed, uploaded, phase } = stateRef.current
      if (!file || !signed || !uploaded || phase === "saving") return
      lastPayloadRef.current = details
      const controller = nextController()
      dispatch({ type: "saving" })
      try {
        const result = await saveReportFile(
          { ...details, fileName: file.name, signedURL: signed.signedURL, fileIdentifier: signed.fileIdentifier },
          controller.signal,
        )
        if (controller.signal.aborted) return
        dispatch({ type: "saved", result })
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return
        dispatch({ type: "failed", error: toUploadError("save", error) })
      }
    },
    [nextController],
  )

  const retry = useCallback(() => {
    const { file, signed, error } = stateRef.current
    if (!file || !error) return
    if (error.step === "upload") void runUpload(file, signed)
    else if (lastPayloadRef.current) void submit(lastPayloadRef.current)
  }, [runUpload, submit])

  const reset = useCallback(() => {
    abortInFlight()
    lastPayloadRef.current = null
    dispatch({ type: "reset" })
  }, [abortInFlight])

  return { state, selectFile, submit, retry, reset }
}
