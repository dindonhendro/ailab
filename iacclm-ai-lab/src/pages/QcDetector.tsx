import { useState, useMemo } from 'react'
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Plus,
  BarChart3,
  Activity,
  Award,
} from 'lucide-react'
import { Card, Badge } from '../components/ui/ui'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

/* ─── Mock data generation helpers ─── */

interface TestConfig {
  label: string
  unit: string
  mean: number
  sd: number
}

const TEST_CONFIGS: Record<string, TestConfig> = {
  glukosa:   { label: 'Glukosa',   unit: 'mg/dL', mean: 100, sd: 5 },
  kreatinin: { label: 'Kreatinin', unit: 'mg/dL', mean: 1.0, sd: 0.1 },
  sgpt:      { label: 'SGPT',      unit: 'U/L',   mean: 35,  sd: 3 },
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

function generateQcData(mean: number, sd: number, seed: number): number[] {
  const rng = seededRandom(seed)
  const data: number[] = []
  for (let i = 0; i < 30; i++) {
    // Box-Muller for normal distribution
    const u1 = rng()
    const u2 = rng()
    let z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    // Inject occasional outliers (days 5, 12, 19, 25)
    if (i === 5) z = 2.5
    if (i === 12) z = -2.8
    if (i === 19) z = 1.8
    if (i === 25) z = 3.2
    data.push(parseFloat((mean + z * sd).toFixed(2)))
  }
  return data
}

/* ─── Westgard violations ─── */

interface Violation {
  rule: string
  day: number
  severity: 'high' | 'critical'
  description: string
}

const MOCK_VIOLATIONS: Record<string, Violation[]> = {
  glukosa: [
    { rule: '1₃ₛ', day: 6,  severity: 'critical', description: 'Satu nilai kontrol melebihi ±3SD dari rata-rata.' },
    { rule: '2₂ₛ', day: 20, severity: 'high',     description: 'Dua nilai kontrol berturut-turut melebihi ±2SD.' },
    { rule: 'R₄ₛ', day: 26, severity: 'critical', description: 'Rentang antara dua kontrol dalam satu run melebihi 4SD.' },
  ],
  kreatinin: [
    { rule: '1₃ₛ', day: 13, severity: 'critical', description: 'Satu nilai kontrol melebihi ±3SD dari rata-rata.' },
    { rule: '10x̄',  day: 22, severity: 'high',     description: 'Sepuluh nilai kontrol berturut-turut berada pada sisi yang sama dari rata-rata.' },
  ],
  sgpt: [
    { rule: '2₂ₛ', day: 6,  severity: 'high',     description: 'Dua nilai kontrol berturut-turut melebihi ±2SD.' },
    { rule: '1₃ₛ', day: 26, severity: 'critical', description: 'Satu nilai kontrol melebihi ±3SD dari rata-rata.' },
  ],
}

/* ─── AI Insights ─── */

interface Insight {
  text: string
  confidence: number
}

const MOCK_INSIGHTS: Record<string, Insight[]> = {
  glukosa: [
    { text: 'Terdeteksi tren naik pada hari 18-22. Kemungkinan drift positif 78%.', confidence: 78 },
    { text: 'Variabilitas meningkat setelah hari 24. Rekomendasi: periksa lot reagen.', confidence: 85 },
    { text: 'Pola cyclical terdeteksi — kemungkinan terkait suhu penyimpanan reagen.', confidence: 62 },
  ],
  kreatinin: [
    { text: 'Terdeteksi systematic bias negatif mulai hari 10. Kemungkinan drift 82%.', confidence: 82 },
    { text: 'Nilai kontrol stabil pada minggu pertama, kalibrasi awal dalam batas.', confidence: 90 },
  ],
  sgpt: [
    { text: 'Random error tinggi pada hari 5-7. Periksa presisi alat.', confidence: 74 },
    { text: 'Performa QC membaik setelah hari 15, konsisten dalam ±1SD.', confidence: 88 },
    { text: 'Prediksi: kemungkinan pelanggaran 1₃ₛ dalam 5 hari ke depan sebesar 35%.', confidence: 65 },
  ],
}

/* ─── Levey-Jennings SVG Chart ─── */

function LeveyJenningsChart({
  data,
  mean,
  sd,
}: {
  data: number[]
  mean: number
  sd: number
}) {
  const W = 760
  const H = 340
  const PAD = { top: 20, right: 20, bottom: 40, left: 55 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const yMin = mean - 4 * sd
  const yMax = mean + 4 * sd
  const yScale = (v: number) => PAD.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH
  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * chartW

  const sdLines = [
    { label: '+3SD', y: mean + 3 * sd, color: '#ef4444', dash: '6,3' },
    { label: '+2SD', y: mean + 2 * sd, color: '#eab308', dash: '6,3' },
    { label: '+1SD', y: mean + 1 * sd, color: '#3b82f6', dash: '4,4' },
    { label: 'Mean', y: mean,          color: '#22c55e', dash: '8,4' },
    { label: '−1SD', y: mean - 1 * sd, color: '#3b82f6', dash: '4,4' },
    { label: '−2SD', y: mean - 2 * sd, color: '#eab308', dash: '6,3' },
    { label: '−3SD', y: mean - 3 * sd, color: '#ef4444', dash: '6,3' },
  ]

  const pointColor = (v: number) => {
    const dev = Math.abs(v - mean) / sd
    if (dev <= 1) return '#22c55e'
    if (dev <= 2) return '#eab308'
    return '#ef4444'
  }

  // Path for connecting data points
  const linePath = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 340 }}>
      {/* Background bands */}
      <rect x={PAD.left} y={yScale(mean + 1 * sd)} width={chartW} height={yScale(mean - 1 * sd) - yScale(mean + 1 * sd)} fill="#dcfce7" opacity={0.3} />
      <rect x={PAD.left} y={yScale(mean + 2 * sd)} width={chartW} height={yScale(mean + 1 * sd) - yScale(mean + 2 * sd)} fill="#fef9c3" opacity={0.3} />
      <rect x={PAD.left} y={yScale(mean - 1 * sd)} width={chartW} height={yScale(mean - 2 * sd) - yScale(mean - 1 * sd)} fill="#fef9c3" opacity={0.3} />
      <rect x={PAD.left} y={yScale(mean + 3 * sd)} width={chartW} height={yScale(mean + 2 * sd) - yScale(mean + 3 * sd)} fill="#fee2e2" opacity={0.3} />
      <rect x={PAD.left} y={yScale(mean - 2 * sd)} width={chartW} height={yScale(mean - 3 * sd) - yScale(mean - 2 * sd)} fill="#fee2e2" opacity={0.3} />

      {/* SD lines */}
      {sdLines.map((l) => (
        <g key={l.label}>
          <line
            x1={PAD.left} y1={yScale(l.y)} x2={PAD.left + chartW} y2={yScale(l.y)}
            stroke={l.color} strokeWidth={1} strokeDasharray={l.dash} opacity={0.7}
          />
          <text x={PAD.left - 6} y={yScale(l.y) + 4} textAnchor="end" fontSize={9} fill={l.color} fontWeight={500}>
            {l.label}
          </text>
        </g>
      ))}

      {/* Data line */}
      <path d={linePath} fill="none" stroke="#94a3b8" strokeWidth={1.5} opacity={0.5} />

      {/* Data points */}
      {data.map((v, i) => (
        <g key={i}>
          <circle
            cx={xScale(i)} cy={yScale(v)} r={4.5}
            fill={pointColor(v)} stroke="white" strokeWidth={1.5}
          />
          {/* Tooltip-style label for outliers */}
          {Math.abs(v - mean) / sd > 2 && (
            <text x={xScale(i)} y={yScale(v) - 8} textAnchor="middle" fontSize={8} fill="#ef4444" fontWeight={600}>
              {v}
            </text>
          )}
        </g>
      ))}

      {/* X-axis day labels */}
      {data.map((_, i) => (
        (i % 3 === 0 || i === data.length - 1) && (
          <text key={`x-${i}`} x={xScale(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="#9ca3af">
            {i + 1}
          </text>
        )
      ))}
      <text x={PAD.left + chartW / 2} y={H} textAnchor="middle" fontSize={10} fill="#6b7280" fontWeight={500}>
        Hari
      </text>
    </svg>
  )
}

/* ─── Main Component ─── */

export default function QcDetector() {
  const [selectedTest, setSelectedTest] = useState<'glukosa' | 'kreatinin' | 'sgpt'>('glukosa')
  const [newValue, setNewValue] = useState<string>('')
  const [extraData, setExtraData] = useState<Record<string, number[]>>({
    glukosa: [],
    kreatinin: [],
    sgpt: [],
  })

  const config = TEST_CONFIGS[selectedTest]

  const baseData = useMemo(() => ({
    glukosa:   generateQcData(100, 5,  42),
    kreatinin: generateQcData(1.0, 0.1, 77),
    sgpt:      generateQcData(35,  3,  123),
  }), [])

  const chartData = useMemo(
    () => [...baseData[selectedTest], ...extraData[selectedTest]],
    [baseData, extraData, selectedTest]
  )

  const violations = MOCK_VIOLATIONS[selectedTest]
  const insights = MOCK_INSIGHTS[selectedTest]

  const violationCount = violations.length
  const avgBias = useMemo(() => {
    const biases = chartData.map((v) => ((v - config.mean) / config.mean) * 100)
    const avg = biases.reduce((a, b) => a + b, 0) / biases.length
    return avg.toFixed(2)
  }, [chartData, config.mean])

  const handleAddData = () => {
    const val = parseFloat(newValue)
    if (isNaN(val)) return
    setExtraData((prev) => ({
      ...prev,
      [selectedTest]: [...prev[selectedTest], val],
    }))
    setNewValue('')
  }

  const tests: { key: 'glukosa' | 'kreatinin' | 'sgpt'; label: string }[] = [
    { key: 'glukosa',   label: 'Glukosa' },
    { key: 'kreatinin', label: 'Kreatinin' },
    { key: 'sgpt',      label: 'SGPT' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center">
            <Shield size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">QC Anomaly Detector & Predictor</h1>
            <p className="text-sm text-gray-500">Pemantauan Quality Control · SNI ISO 15189</p>
          </div>
        </div>
      </div>

      {/* ── Test Selector ── */}
      <div className="flex items-center gap-2">
        {tests.map((t) => (
          <button
            key={t.key}
            onClick={() => setSelectedTest(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedTest === t.key
                ? 'bg-primary-700 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">
          Satuan: {config.unit} · Mean: {config.mean} · SD: {config.sd}
        </span>
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Hari',
            value: chartData.length,
            icon: BarChart3,
            color: 'text-primary-600',
            bg: 'bg-primary-50',
          },
          {
            label: 'Pelanggaran',
            value: violationCount,
            icon: AlertTriangle,
            color: 'text-red-600',
            bg: 'bg-red-50',
          },
          {
            label: 'Rata-rata Bias',
            value: `${avgBias}%`,
            icon: TrendingUp,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'Status Akreditasi',
            value: violationCount > 2 ? 'Perlu Review' : 'Memenuhi Syarat',
            icon: Award,
            color: violationCount > 2 ? 'text-red-600' : 'text-emerald-600',
            bg: violationCount > 2 ? 'bg-red-50' : 'bg-emerald-50',
            badge: true,
          },
        ].map(({ label, value, icon: Icon, color, bg, badge }) => (
          <Card key={label} className="!p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={16} className={color} />
              </div>
              <Activity size={14} className="text-gray-300" />
            </div>
            {badge ? (
              <Badge variant={violationCount > 2 ? 'critical' : 'normal'} className="text-xs">
                {value}
              </Badge>
            ) : (
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* ── Levey-Jennings Chart ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">
            Levey-Jennings Chart — {config.label}
          </h2>
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> ±1SD</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> ±2SD</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> &gt;2SD</span>
          </div>
        </div>
        <LeveyJenningsChart data={chartData} mean={config.mean} sd={config.sd} />
      </Card>

      {/* ── Two-column: Violations + Insights ── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Westgard Violations */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-500" />
            Pelanggaran Aturan Westgard
          </h2>
          <div className="space-y-3">
            {violations.map((v, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-sm font-mono font-bold text-gray-800 bg-white border border-gray-200 rounded px-2 py-0.5 shrink-0">
                  {v.rule}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 font-medium">Hari {v.day}</span>
                    <Badge variant={v.severity === 'critical' ? 'critical' : 'high'}>
                      {v.severity === 'critical' ? 'Critical' : 'Warning'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Predictive Insights */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Activity size={15} className="text-primary-500" />
            AI Predictive Insights
          </h2>
          <div className="space-y-3">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/60 border border-amber-100">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 leading-relaxed">{ins.text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                        style={{ width: `${ins.confidence}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{ins.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Input Form ── */}
      <Card className="!p-4 bg-gradient-to-r from-primary-50 to-sky-50 border-primary-100">
        <h2 className="text-sm font-semibold text-primary-800 mb-3 flex items-center gap-2">
          <Plus size={15} className="text-primary-600" />
          Tambah Data QC Harian
        </h2>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <Input
              label={`Nilai ${config.label} (${config.unit})`}
              type="number"
              step="any"
              placeholder={`Contoh: ${config.mean}`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
          <Button onClick={handleAddData} leftIcon={<Plus size={14} />}>
            Tambah Data
          </Button>
        </div>
        {extraData[selectedTest].length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Data tambahan:</span>
            {extraData[selectedTest].map((v, i) => (
              <span key={i} className="text-xs bg-white border border-primary-200 text-primary-700 rounded-full px-2 py-0.5 font-medium">
                Hari {30 + i + 1}: {v}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* ── Footer info ── */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <CheckCircle2 size={12} className="text-emerald-400" />
        <span>Data QC disimulasikan untuk keperluan demonstrasi. Aturan Westgard sesuai standar ISO 15189.</span>
      </div>
    </div>
  )
}
