import { useState } from 'react'
import {
  FlaskConical,
  Search,
  User,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  FileText,
  ClipboardList,
} from 'lucide-react'
import { LOINC_MAP, LAB_PANELS, getResultStatus } from '../lib/constants'
import { getPatientByIhs, interpretLabResults, saveLabSession, saveDiagnosticReport } from '../services/api'
import { Card, Badge, Spinner } from '../components/ui/ui'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import type { PatientData, LabResult, LabSession, InterpretResponse } from '../types'

type Step = 'patient' | 'lab' | 'result'

const statusLabel: Record<string, string> = {
  normal: 'Normal', high: 'Tinggi', low: 'Rendah', critical: 'Kritis', unknown: '—',
}
const statusVariant: Record<string, 'normal' | 'high' | 'low' | 'critical' | 'info'> = {
  normal: 'normal', high: 'high', low: 'low', critical: 'critical', unknown: 'info',
}

export default function Interpreter() {
  // ── State ──────────────────────────────────────────────
  const [step, setStep] = useState<Step>('patient')
  const [ihsInput, setIhsInput] = useState('')
  const [patient, setPatient] = useState<PatientData | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)
  const [patientError, setPatientError] = useState('')

  const [results, setResults] = useState<LabResult[]>([])
  const [newLoinc, setNewLoinc] = useState('')
  const [newValue, setNewValue] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)

  const [interpreting, setInterpreting] = useState(false)
  const [response, setResponse] = useState<InterpretResponse | null>(null)
  const [interpError, setInterpError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // ── Step 1: patient lookup ──────────────────────────────
  const handlePatientSearch = async () => {
    if (!ihsInput.trim()) return
    setPatientLoading(true)
    setPatientError('')
    const { data, error } = await getPatientByIhs(ihsInput.trim())
    if (error || !data) {
      setPatientError(error ?? 'Pasien tidak ditemukan. Periksa kembali IHS Number.')
    } else {
      setPatient(data)
      setStep('lab')
    }
    setPatientLoading(false)
  }

  // ── Step 2: add lab result ──────────────────────────────
  const addResult = () => {
    const entry = LOINC_MAP[newLoinc]
    if (!entry || !newValue) return
    const val = parseFloat(newValue)
    if (isNaN(val)) return
    const gender = patient?.gender === 'female' ? 'female' : 'male'
    const range = gender === 'female' ? entry.female : entry.male
    const status = getResultStatus(newLoinc, val, gender)
    const lr: LabResult = {
      loinc_code: entry.code,
      parameter_name: entry.parameter,
      value: val,
      unit: entry.unit,
      reference_range_low: range.low,
      reference_range_high: range.high,
      reference_range_note: range.note,
      status,
    }
    setResults((prev) => [...prev.filter((r) => r.loinc_code !== newLoinc), lr])
    setNewLoinc('')
    setNewValue('')
  }

  const addPanel = (codes: string[]) => {
    codes.forEach((code) => {
      if (!results.find((r) => r.loinc_code === code)) {
        const entry = LOINC_MAP[code]
        if (entry)
          setResults((prev) => [
            ...prev,
            {
              loinc_code: entry.code,
              parameter_name: entry.parameter,
              value: 0,
              unit: entry.unit,
              reference_range_low: entry.male.low,
              reference_range_high: entry.male.high,
              reference_range_note: entry.male.note,
              status: 'unknown',
            },
          ])
      }
    })
    setPanelOpen(false)
  }

  const updateValue = (code: string, val: string) => {
    const num = parseFloat(val)
    setResults((prev) =>
      prev.map((r) => {
        if (r.loinc_code !== code) return r
        const gender = patient?.gender === 'female' ? 'female' : 'male'
        const status = isNaN(num) ? 'unknown' : getResultStatus(code, num, gender)
        return { ...r, value: isNaN(num) ? 0 : num, status }
      })
    )
  }

  // ── Step 3: interpret ───────────────────────────────────
  const handleInterpret = async () => {
    if (!patient || results.length === 0) return
    setInterpreting(true)
    setInterpError('')

    const session: LabSession = {
      patient_ihs_number: patient.ihs_number,
      patient_name: patient.name,
      patient_gender: patient.gender === 'female' ? 'female' : 'male',
      patient_data: patient,
      lab_results: results.filter((r) => r.value > 0),
    }

    const { data, error } = await interpretLabResults(session)
    if (error || !data) {
      setInterpError(error ?? 'Gagal menghasilkan interpretasi.')
    } else {
      setResponse(data)
      setStep('result')
    }
    setInterpreting(false)
  }

  // ── Submit to SATUSEHAT ─────────────────────────────────
  const handleSubmit = async () => {
    if (!patient || !response) return
    setSubmitting(true)
    const session: LabSession = {
      patient_ihs_number: patient.ihs_number,
      patient_name: patient.name,
      patient_gender: patient.gender === 'female' ? 'female' : 'male',
      patient_data: patient,
      lab_results: results,
    }
    const sessionRes = await saveLabSession(session)
    if (!sessionRes.error && sessionRes.data) {
      await saveDiagnosticReport(
        (sessionRes.data as { id: string }).id,
        response.interpretation,
        response.diagnostic_report.conclusion ?? '',
        response.diagnostic_report.satusehat_report_id
      )
    }
    const { error } = await interpretLabResults(session, true)
    if (!error) setSubmitted(true)
    setSubmitting(false)
  }

  // ── Reset ───────────────────────────────────────────────
  const reset = () => {
    setStep('patient')
    setPatient(null)
    setIhsInput('')
    setResults([])
    setResponse(null)
    setSubmitted(false)
    setInterpError('')
    setPatientError('')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FlaskConical size={20} className="text-violet-600" />
          Interpretasi Hasil Laboratorium
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Integrasi SATUSEHAT FHIR R4 · IACCLM Reference Intervals
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {[
          { key: 'patient', label: 'Data Pasien', icon: User },
          { key: 'lab', label: 'Input Hasil', icon: FlaskConical },
          { key: 'result', label: 'Interpretasi', icon: FileText },
        ].map(({ key, label, icon: Icon }, idx) => {
          const done = ['patient', 'lab', 'result'].indexOf(step) > idx
          const current = step === key
          return (
            <div key={key} className="flex items-center">
              {idx > 0 && (
                <div className={`h-0.5 w-8 sm:w-12 mx-1 ${done || current ? 'bg-primary-400' : 'bg-gray-200'}`} />
              )}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${current ? 'bg-primary-700 text-white' :
                  done ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-500'
                  }`}
              >
                {done ? <CheckCircle2 size={13} /> : <Icon size={13} />}
                <span className="hidden sm:inline">{label}</span>
              </div>
            </div>
          )
        })}
        {step !== 'patient' && (
          <button
            onClick={reset}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Mulai ulang
          </button>
        )}
      </div>

      {/* ── STEP 1: Patient ─────────────────────────────── */}
      {step === 'patient' && (
        <Card>
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User size={16} className="text-primary-600" />
            Pencarian Pasien via SATUSEHAT MPI
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end max-w-md">
            <div className="flex-1">
              <Input
                label="IHS Number"
                placeholder="Contoh: P00020194883"
                value={ihsInput}
                onChange={(e) => setIhsInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePatientSearch()}
                hint="Nomor identitas pasien dari SATUSEHAT Master Patient Index"
                leftIcon={<Search size={14} />}
              />
            </div>
            <Button
              onClick={handlePatientSearch}
              loading={patientLoading}
              size="md"
              leftIcon={<Search size={14} />}
              className="w-full sm:w-auto"
            >
              Cari
            </Button>
          </div>
          {patientError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {patientError}
            </div>
          )}

          {/* Demo shortcut */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
              <AlertTriangle size={13} />
              Mode Demo — Belum terhubung ke SATUSEHAT
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Gunakan IHS Number fiktif untuk testing. Data riil memerlukan konfigurasi{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">SATUSEHAT_CLIENT_ID</code> di InsForge Functions.
            </p>
            <button
              onClick={() => setIhsInput('P00020194883')}
              className="mt-2 text-xs text-amber-700 underline hover:text-amber-900"
            >
              Gunakan IHS demo: P00020194883
            </button>
          </div>
        </Card>
      )}

      {/* ── STEP 2: Lab Input ────────────────────────────── */}
      {step === 'lab' && patient && (
        <div className="space-y-4">
          {/* Patient info */}
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center">
                <User size={16} className="text-primary-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{patient.name ?? 'Pasien'}</p>
                <p className="text-xs text-gray-400">
                  IHS: {patient.ihs_number} ·{' '}
                  {patient.gender === 'female' ? 'Perempuan' : 'Laki-laki'} ·{' '}
                  {patient.birth_date ?? '—'}
                </p>
              </div>
              <Badge variant="info" className="ml-auto">Terverifikasi</Badge>
            </div>
          </Card>

          {/* Panel shortcut */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">Panel Laboratorium</h3>
              <button
                onClick={() => setPanelOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
              >
                Pilih Panel
                {panelOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {panelOpen && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-100">
                {Object.values(LAB_PANELS).map((panel) => (
                  <button
                    key={panel.name}
                    onClick={() => addPanel(panel.codes)}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-gray-200
                               hover:border-primary-300 hover:bg-primary-50 transition-colors"
                  >
                    <p className="font-medium text-gray-700">{panel.name}</p>
                    <p className="text-gray-400 mt-0.5">{panel.codes.length} parameter</p>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:items-end mb-4">
              <div className="flex-1 min-w-0">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Parameter (LOINC)</label>
                <select
                  value={newLoinc}
                  onChange={(e) => setNewLoinc(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 text-sm px-3 py-2
                             focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Pilih parameter…</option>
                  {Object.values(LOINC_MAP).map((e) => (
                    <option key={e.code} value={e.code}>
                      {e.parameter} ({e.code}) — {e.unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-32">
                <Input
                  label="Nilai"
                  type="number"
                  placeholder="0.0"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addResult()}
                />
              </div>
              <Button size="md" onClick={addResult} leftIcon={<Plus size={14} />} className="w-full sm:w-auto shrink-0">
                Tambah
              </Button>
            </div>

            {/* Results table */}
            {results.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">Parameter</th>
                      <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">LOINC</th>
                      <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">Nilai</th>
                      <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">Rujukan</th>
                      <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2">Status</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.loinc_code} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2 font-medium text-gray-800">{r.parameter_name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.loinc_code}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={r.value || ''}
                              onChange={(e) => updateValue(r.loinc_code, e.target.value)}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm
                                         focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <span className="text-xs text-gray-400">{r.unit}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {r.reference_range_note ?? (
                            r.reference_range_low !== undefined && r.reference_range_high !== undefined
                              ? `${r.reference_range_low}–${r.reference_range_high}`
                              : '—'
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={statusVariant[r.status ?? 'unknown']}>
                            {statusLabel[r.status ?? 'unknown']}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setResults((prev) => prev.filter((x) => x.loinc_code !== r.loinc_code))}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                Belum ada parameter. Tambahkan dari panel atau manual di atas.
              </p>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('patient')}>
              ← Kembali
            </Button>
            <Button
              onClick={handleInterpret}
              loading={interpreting}
              disabled={results.filter((r) => r.value > 0).length === 0}
              leftIcon={<ClipboardList size={15} />}
            >
              Generate Interpretasi AI
            </Button>
          </div>

          {interpError && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              {interpError}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Result ──────────────────────────────── */}
      {step === 'result' && response && (
        <div className="space-y-4">
          {/* Interpretation text */}
          <Card>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText size={16} className="text-primary-600" />
                Interpretasi Klinis (AI)
              </h3>
              <Badge variant={submitted ? 'submitted' : 'draft'}>
                {submitted ? 'Terkirim ke SATUSEHAT' : 'Draft'}
              </Badge>
            </div>
            <div className="prose-medical bg-gray-50 rounded-xl p-4 text-sm">
              <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {response.interpretation}
              </p>
            </div>
          </Card>

          {/* DiagnosticReport preview */}
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <ClipboardList size={16} className="text-violet-600" />
              DiagnosticReport FHIR Preview
            </h3>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {JSON.stringify(
                  {
                    resourceType: 'DiagnosticReport',
                    status: 'final',
                    code: {
                      coding: [{ system: 'http://loinc.org', code: '11502-2', display: 'Laboratory report' }],
                    },
                    subject: { reference: `Patient/${patient?.ihs_number}` },
                    effectiveDateTime: new Date().toISOString(),
                    conclusion: response.diagnostic_report.conclusion,
                    result: response.observations.map((o) => ({ reference: `Observation/${o.id}` })),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </Card>

          {/* Abnormal summary */}
          {results.filter((r) => r.status !== 'normal' && r.status !== 'unknown').length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                Ringkasan Nilai Abnormal
              </h3>
              <div className="space-y-2">
                {results
                  .filter((r) => r.status !== 'normal' && r.status !== 'unknown')
                  .map((r) => (
                    <div
                      key={r.loinc_code}
                      className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-800">{r.parameter_name}</span>
                        <span className="text-xs text-gray-500 ml-2">LOINC {r.loinc_code}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-700">
                          {r.value} {r.unit}
                        </span>
                        <Badge variant={statusVariant[r.status ?? 'unknown']}>
                          {statusLabel[r.status ?? 'unknown']}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-between flex-wrap">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('lab')}>
                ← Edit Hasil
              </Button>
              <Button variant="ghost" onClick={reset}>
                Sesi Baru
              </Button>
            </div>
            {!submitted ? (
              <Button
                onClick={handleSubmit}
                loading={submitting}
                leftIcon={<Send size={15} />}
              >
                Kirim ke SATUSEHAT
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                <CheckCircle2 size={16} />
                Berhasil dikirim ke SATUSEHAT
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
            <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 leading-relaxed">
              <strong>Catatan:</strong> Interpretasi ini dihasilkan oleh AI dan hanya sebagai panduan klinis.
              Dokter atau tenaga medis berwenang wajib memverifikasi sebelum pengambilan keputusan klinis.
              Tidak menggantikan diagnosis profesional. (Pedoman IACCLM 2023)
            </p>
          </div>
        </div>
      )}

      {interpreting && (
        <div className="flex items-center justify-center py-10 gap-3">
          <Spinner />
          <p className="text-sm text-gray-500">Menghasilkan interpretasi AI berbasis FHIR…</p>
        </div>
      )}
    </div>
  )
}
