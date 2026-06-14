// ─────────────────────────────────────────────────────────
//  Shared TypeScript Types — IACCLM AI Lab
// ─────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  role?: 'dokter' | 'analis' | 'admin'
  organization_id?: string
  created_at?: string
}

// ── Chat / Conversation ────────────────────────────────────
export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  messages?: Message[]
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

// ── Patient / SATUSEHAT ────────────────────────────────────
export interface PatientData {
  ihs_number: string
  name?: string
  birth_date?: string
  gender?: 'male' | 'female' | 'unknown'
  address?: string
  phone?: string
  fhir_resource?: Record<string, unknown>
}

// ── Lab Results ────────────────────────────────────────────
export type ResultStatus = 'normal' | 'high' | 'low' | 'critical' | 'unknown'

export interface LabResult {
  loinc_code: string
  parameter_name: string
  value: number
  unit: string
  reference_range_low?: number
  reference_range_high?: number
  reference_range_note?: string
  status?: ResultStatus
}

export interface LabSession {
  id?: string
  user_id?: string
  patient_ihs_number: string
  patient_name?: string
  patient_gender?: 'male' | 'female'
  patient_data?: PatientData
  lab_results: LabResult[]
  created_at?: string
}

// ── Diagnostic Report ──────────────────────────────────────
export interface DiagnosticReport {
  id?: string
  session_id?: string
  interpretation_text?: string
  conclusion?: string
  satusehat_report_id?: string
  status: 'draft' | 'submitted' | 'final'
  submitted_at?: string
  created_at?: string
}

// ── API Response Types ─────────────────────────────────────
export interface InterpretResponse {
  diagnostic_report: DiagnosticReport
  observations: FHIRObservation[]
  interpretation: string
  submission_result?: unknown
}

export interface ChatResponse {
  reply: string
  conversation_id?: string
}

// ── FHIR Resources ─────────────────────────────────────────
export interface FHIRObservation {
  resourceType: 'Observation'
  id: string
  status: 'final' | 'preliminary' | 'amended' | 'cancelled'
  category: Array<{
    coding: Array<{ system: string; code: string; display?: string }>
  }>
  code: {
    coding: Array<{ system: string; code: string; display?: string }>
    text?: string
  }
  subject: { reference: string }
  effectiveDateTime: string
  valueQuantity: { value: number; unit: string; system: string; code?: string }
  referenceRange?: Array<{
    low?: { value: number; unit: string }
    high?: { value: number; unit: string }
    text?: string
  }>
  interpretation?: Array<{
    coding: Array<{ system: string; code: string; display?: string }>
  }>
}

export interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport'
  id: string
  status: string
  code: { coding: Array<{ system: string; code: string; display?: string }> }
  subject: { reference: string }
  effectiveDateTime: string
  issued: string
  performer: Array<{ reference: string }>
  result: Array<{ reference: string }>
  conclusion?: string
}
