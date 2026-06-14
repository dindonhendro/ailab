import { useState, useMemo } from 'react'
import {
  BarChart3,
  ChevronDown,
  Database,
  FlaskConical,
  Send,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { Card, Badge } from '../components/ui/ui'
import Button from '../components/ui/Button'

/* ── Types ─────────────────────────────────────────────────────── */

interface ParameterData {
  name: string
  unit: string
  currentLow: number
  currentHigh: number
  /** Offsets applied per demographic key (additive to current range) */
  baseProposedLow: number
  baseProposedHigh: number
}

interface DemographicOffsets {
  lowDelta: number
  highDelta: number
}

/* ── Mock Data ─────────────────────────────────────────────────── */

const PARAMETERS: ParameterData[] = [
  { name: 'Kreatinin',        unit: 'μmol/L',  currentLow: 61,  currentHigh: 107, baseProposedLow: -3,  baseProposedHigh: 5  },
  { name: 'Glukosa Puasa',    unit: 'mg/dL',   currentLow: 70,  currentHigh: 100, baseProposedLow: -2,  baseProposedHigh: 6  },
  { name: 'SGPT',             unit: 'U/L',     currentLow: 7,   currentHigh: 56,  baseProposedLow: -1,  baseProposedHigh: 4  },
  { name: 'Kolesterol Total', unit: 'mg/dL',   currentLow: 0,   currentHigh: 200, baseProposedLow: 0,   baseProposedHigh: 12 },
  { name: 'Asam Urat',        unit: 'mg/dL',   currentLow: 2.4, currentHigh: 7.0, baseProposedLow: -0.3,baseProposedHigh: 0.5},
  { name: 'Ureum',            unit: 'mg/dL',   currentLow: 7,   currentHigh: 20,  baseProposedLow: -1,  baseProposedHigh: 3  },
  { name: 'Trigliserida',     unit: 'mg/dL',   currentLow: 0,   currentHigh: 150, baseProposedLow: 0,   baseProposedHigh: 10 },
]

const GENDER_OFFSETS: Record<string, DemographicOffsets> = {
  'Semua':     { lowDelta: 0,  highDelta: 0 },
  'Laki-laki': { lowDelta: 2,  highDelta: 3 },
  'Perempuan': { lowDelta: -4, highDelta: -5 },
}

const AGE_OFFSETS: Record<string, DemographicOffsets> = {
  'Semua': { lowDelta: 0, highDelta: 0 },
  '18-30': { lowDelta: -1, highDelta: -2 },
  '31-45': { lowDelta: 0, highDelta: 1 },
  '46-60': { lowDelta: 1, highDelta: 3 },
  '>60':   { lowDelta: 2, highDelta: 5 },
}

const REGION_OFFSETS: Record<string, DemographicOffsets> = {
  'Semua':                 { lowDelta: 0, highDelta: 0 },
  'Jawa':                  { lowDelta: -1, highDelta: 1 },
  'Sumatera':              { lowDelta: 0, highDelta: 2 },
  'Kalimantan':            { lowDelta: 1, highDelta: 3 },
  'Sulawesi':              { lowDelta: -2, highDelta: 2 },
  'Papua & Maluku':        { lowDelta: 2, highDelta: 4 },
  'Bali & Nusa Tenggara':  { lowDelta: -1, highDelta: 0 },
}

const GENDERS  = Object.keys(GENDER_OFFSETS)
const AGES     = Object.keys(AGE_OFFSETS)
const REGIONS  = Object.keys(REGION_OFFSETS)

/* ── Helpers ───────────────────────────────────────────────────── */

function computeProposed(
  p: ParameterData,
  gender: string,
  age: string,
  region: string,
) {
  const gOff = GENDER_OFFSETS[gender] ?? { lowDelta: 0, highDelta: 0 }
  const aOff = AGE_OFFSETS[age] ?? { lowDelta: 0, highDelta: 0 }
  const rOff = REGION_OFFSETS[region] ?? { lowDelta: 0, highDelta: 0 }

  const proposedLow  = +(p.currentLow  + p.baseProposedLow  + gOff.lowDelta  + aOff.lowDelta  + rOff.lowDelta).toFixed(1)
  const proposedHigh = +(p.currentHigh + p.baseProposedHigh + gOff.highDelta + aOff.highDelta + rOff.highDelta).toFixed(1)
  return { proposedLow, proposedHigh }
}

function gaussian(x: number, mean: number, sd: number) {
  return Math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI))
}

function fmtNum(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1)
}

/* ── SVG Bell Curve Component ──────────────────────────────────── */

function BellCurve({
  currentLow,
  currentHigh,
  proposedLow,
  proposedHigh,
  unit,
}: {
  currentLow: number
  currentHigh: number
  proposedLow: number
  proposedHigh: number
  unit: string
}) {
  const W = 600
  const H = 250
  const pad = { top: 30, bottom: 50, left: 40, right: 40 }
  const plotW = W - pad.left - pad.right
  const plotH = H - pad.top - pad.bottom

  // Compute distribution range from current range
  const mean = (currentLow + currentHigh) / 2
  const sd   = (currentHigh - currentLow) / 4  // ~2 SD covers the range
  const xMin = mean - 4 * sd
  const xMax = mean + 4 * sd

  const toX = (v: number) => pad.left + ((v - xMin) / (xMax - xMin)) * plotW
  const maxY = gaussian(mean, mean, sd)
  const toY = (g: number) => pad.top + plotH - (g / maxY) * plotH

  // Build the curve path (filled)
  const steps = 120
  const dx = (xMax - xMin) / steps
  let pathD = `M ${toX(xMin)} ${toY(0)}`
  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx
    pathD += ` L ${toX(x)} ${toY(gaussian(x, mean, sd))}`
  }
  pathD += ` L ${toX(xMax)} ${toY(0)} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Curve fill */}
      <path d={pathD} fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5" />

      {/* X axis */}
      <line x1={pad.left} y1={pad.top + plotH} x2={W - pad.right} y2={pad.top + plotH} stroke="#d1d5db" strokeWidth="1" />

      {/* Current range – gray dashed */}
      {[currentLow, currentHigh].map((v, i) => (
        <g key={`cur-${i}`}>
          <line
            x1={toX(v)} y1={pad.top}
            x2={toX(v)} y2={pad.top + plotH}
            stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="5,4"
          />
          <text x={toX(v)} y={H - 8} textAnchor="middle" className="fill-gray-500" fontSize="10" fontWeight="500">
            {fmtNum(v)}
          </text>
        </g>
      ))}

      {/* Proposed range – primary solid */}
      {[proposedLow, proposedHigh].map((v, i) => (
        <g key={`prop-${i}`}>
          <line
            x1={toX(v)} y1={pad.top}
            x2={toX(v)} y2={pad.top + plotH}
            stroke="#1d4ed8" strokeWidth="2"
          />
          <text x={toX(v)} y={pad.top - 8} textAnchor="middle" className="fill-primary-700" fontSize="10" fontWeight="600">
            {fmtNum(v)}
          </text>
        </g>
      ))}

      {/* Legend */}
      <g transform={`translate(${pad.left + 8}, ${pad.top + 12})`}>
        <line x1="0" y1="0" x2="18" y2="0" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="5,4" />
        <text x="24" y="3.5" fontSize="10" className="fill-gray-500">Rujukan Nasional ({fmtNum(currentLow)}–{fmtNum(currentHigh)} {unit})</text>
      </g>
      <g transform={`translate(${pad.left + 8}, ${pad.top + 28})`}>
        <line x1="0" y1="0" x2="18" y2="0" stroke="#1d4ed8" strokeWidth="2" />
        <text x="24" y="3.5" fontSize="10" className="fill-primary-700" fontWeight="600">Usulan AI ({fmtNum(proposedLow)}–{fmtNum(proposedHigh)} {unit})</text>
      </g>

      {/* Unit label */}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" className="fill-gray-400">{unit}</text>
    </svg>
  )
}

/* ── Select Dropdown ───────────────────────────────────────────── */

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-gray-300 bg-white text-sm px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  )
}

/* ── Main Page ─────────────────────────────────────────────────── */

export default function ReferenceRanges() {
  const [gender, setGender]           = useState('Semua')
  const [age, setAge]                 = useState('Semua')
  const [region, setRegion]           = useState('Semua')
  const [activeParam, setActiveParam] = useState('Kreatinin')
  const [note, setNote]               = useState('')
  const [submitted, setSubmitted]     = useState(false)

  // Compute proposed ranges for all parameters based on filters
  const proposedData = useMemo(() => {
    return PARAMETERS.map((p) => {
      const { proposedLow, proposedHigh } = computeProposed(p, gender, age, region)
      const lowDiff  = +(proposedLow  - p.currentLow).toFixed(1)
      const highDiff = +(proposedHigh - p.currentHigh).toFixed(1)
      const changed  = lowDiff !== 0 || highDiff !== 0
      return { ...p, proposedLow, proposedHigh, lowDiff, highDiff, changed }
    })
  }, [gender, age, region])

  const activeData = proposedData.find((p) => p.name === activeParam) ?? proposedData[0]

  const handleSubmit = () => {
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Success alert ── */}
      {submitted && (
        <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 flex items-center gap-2 text-sm animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <p className="font-medium">Rekomendasi berhasil dikirim ke Komite Nasional IACCLM.</p>
        </div>
      )}

      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center">
            <BarChart3 size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Predictive Reference Range Updater</h1>
            <p className="text-sm text-gray-500">Machine Learning untuk Interval Rujukan Spesifik Populasi Indonesia</p>
          </div>
        </div>
      </div>

      {/* ── Demographic Filter Row ── */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-3">
          <Select label="Jenis Kelamin" value={gender} onChange={setGender} options={GENDERS} />
          <Select label="Kelompok Usia" value={age} onChange={setAge} options={AGES} />
          <Select label="Wilayah" value={region} onChange={setRegion} options={REGIONS} />
        </div>
      </Card>

      {/* ── Parameter Selector ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {PARAMETERS.map((p) => (
          <button
            key={p.name}
            onClick={() => setActiveParam(p.name)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeParam === p.name
                ? 'bg-primary-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* ── Distribution Visualization Card ── */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Distribusi Populasi — {activeData.name}
        </h2>
        <BellCurve
          currentLow={activeData.currentLow}
          currentHigh={activeData.currentHigh}
          proposedLow={activeData.proposedLow}
          proposedHigh={activeData.proposedHigh}
          unit={activeData.unit}
        />
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
          <Info size={12} />
          <span>Kurva Gaussian dihitung dari estimasi statistik populasi. Garis putus-putus = rujukan nasional saat ini, garis solid = usulan AI.</span>
        </div>
      </Card>

      {/* ── Comparison Table Card ── */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Perbandingan Interval Rujukan</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Filter: {gender} · {age} · {region}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Parameter</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rujukan Nasional Saat Ini</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Usulan AI (ML)</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Perubahan</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {proposedData.map((row) => {
                const changeText = row.changed
                  ? `${row.lowDiff >= 0 ? '+' : ''}${fmtNum(row.lowDiff)} / ${row.highDiff >= 0 ? '+' : ''}${fmtNum(row.highDiff)}`
                  : '—'

                let statusVariant: 'normal' | 'info' | 'high' = 'normal'
                let statusText = 'Diperbarui'
                if (!row.changed) {
                  statusVariant = 'info'
                  statusText = 'Tetap'
                } else if (Math.abs(row.highDiff) >= 5 || Math.abs(row.lowDiff) >= 4) {
                  statusVariant = 'high'
                  statusText = 'Ditinjau'
                }

                return (
                  <tr
                    key={row.name}
                    className={`hover:bg-gray-50/60 transition-colors ${
                      row.name === activeParam ? 'bg-primary-50/40' : ''
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {row.name} <span className="text-gray-400 font-normal">({row.unit})</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {fmtNum(row.currentLow)} – {fmtNum(row.currentHigh)}
                    </td>
                    <td className="px-5 py-3 text-primary-700 font-semibold whitespace-nowrap">
                      {fmtNum(row.proposedLow)} – {fmtNum(row.proposedHigh)}
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                      {changeText}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <Badge variant={statusVariant}>{statusText}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Data Sources Card ── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900">Sumber Data & Model</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Jumlah Sampel Anonim', value: '1.247.832' },
            { label: 'Lab Kontributor', value: '342 lab anggota IACCLM' },
            { label: 'Periode Data', value: 'Jan 2024 — Jun 2026' },
            { label: 'Model ML', value: 'XGBoost + Bayesian Reference Limit Estimation' },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1">{item.label}</p>
              <p className="text-sm font-semibold text-gray-800">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Submit Recommendation Card ── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={16} className="text-violet-600" />
          <h2 className="text-sm font-semibold text-gray-900">Kirim Rekomendasi</h2>
        </div>
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Catatan untuk Komite Nasional
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Tambahkan catatan, justifikasi klinis, atau rekomendasi tambahan..."
              className="w-full rounded-lg border border-gray-300 bg-white text-sm px-3 py-2 transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              leftIcon={<Send size={14} />}
            >
              Kirim Rekomendasi ke IACCLM
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
