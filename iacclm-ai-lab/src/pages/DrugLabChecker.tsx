import { useState } from 'react'
import {
  Pill,
  FlaskConical,
  Search,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, Badge, EmptyState } from '../components/ui/ui'
import Button from '../components/ui/Button'

/* ------------------------------------------------------------------ */
/*  Interaction Database                                              */
/* ------------------------------------------------------------------ */

interface Interaction {
  drug: string
  test: string
  severity: 'Signifikan' | 'Moderat' | 'Minor'
  mechanism: string
  recommendation: string
}

const interactionDB: Interaction[] = [
  {
    drug: 'Vitamin C (Asam Askorbat)',
    test: 'Glukosa (GOD-PAP)',
    severity: 'Signifikan',
    mechanism:
      'Vitamin C bersifat reduktor kuat yang menginterferensi reaksi oksidasi pada metode GOD-PAP, menyebabkan hasil glukosa lebih rendah dari nilai sebenarnya (false low).',
    recommendation:
      'Hentikan suplementasi Vitamin C minimal 24 jam sebelum pemeriksaan, atau gunakan metode heksokinase yang lebih resisten terhadap interferensi.',
  },
  {
    drug: 'Vitamin C (Asam Askorbat)',
    test: 'Kolesterol Total',
    severity: 'Minor',
    mechanism:
      'Vitamin C dosis tinggi dapat sedikit menginterferensi metode enzimatik pemeriksaan kolesterol, menghasilkan nilai sedikit lebih rendah.',
    recommendation:
      'Pertimbangkan penghentian suplemen Vitamin C 24 jam sebelum pemeriksaan profil lipid jika curiga interferensi.',
  },
  {
    drug: 'Biotin (Vitamin B7)',
    test: 'Troponin I (Immunoassay)',
    severity: 'Signifikan',
    mechanism:
      'Biotin eksogen berkompetisi dengan biotin berlabel pada immunoassay berbasis streptavidin-biotin (sandwich assay), menghasilkan nilai Troponin I yang false low — berpotensi melewatkan diagnosis infark miokard akut.',
    recommendation:
      'Hentikan suplemen biotin minimal 48-72 jam sebelum pemeriksaan. Gunakan assay yang tidak berbasis streptavidin-biotin jika memungkinkan.',
  },
  {
    drug: 'Biotin (Vitamin B7)',
    test: 'TSH (Immunoassay)',
    severity: 'Signifikan',
    mechanism:
      'Biotin menginterferensi metode sandwich immunoassay untuk TSH, menyebabkan hasil false low TSH. Dapat menyerupai gambaran hipertiroidisme subklinis pada pasien eutiroid.',
    recommendation:
      'Hentikan biotin 48-72 jam sebelum pemeriksaan fungsi tiroid. Konfirmasi dengan metode yang tidak menggunakan teknologi streptavidin-biotin.',
  },
  {
    drug: 'Aspirin',
    test: 'Bilirubin Total',
    severity: 'Moderat',
    mechanism:
      'Aspirin (asam asetilsalisilat) dapat menyebabkan displacement bilirubin dari ikatan albumin, meningkatkan fraksi bilirubin bebas dan memengaruhi hasil pengukuran bilirubin total.',
    recommendation:
      'Catat penggunaan aspirin pada formulir permintaan lab. Interpretasikan hasil bilirubin dengan mempertimbangkan efek displacement ini.',
  },
  {
    drug: 'Ibuprofen',
    test: 'Kreatinin (Jaffe)',
    severity: 'Moderat',
    mechanism:
      'Ibuprofen dan metabolitnya dapat bereaksi dengan pikrat alkalin pada metode Jaffe, menyebabkan peningkatan palsu (false high) kreatinin serum.',
    recommendation:
      'Gunakan metode enzimatik untuk pemeriksaan kreatinin jika pasien mengonsumsi NSAID. Alternatif: hentikan obat 48 jam sebelum pemeriksaan.',
  },
  {
    drug: 'Metformin',
    test: 'Kreatinin (Jaffe)',
    severity: 'Minor',
    mechanism:
      'Metformin dapat menyebabkan sedikit peningkatan kreatinin serum pada metode Jaffe akibat interferensi kimia ringan, meskipun efeknya biasanya kecil.',
    recommendation:
      'Gunakan metode enzimatik untuk monitoring fungsi ginjal pada pasien diabetes yang mengonsumsi metformin. Pertimbangkan estimasi GFR berbasis cystatin C.',
  },
  {
    drug: 'Kortikosteroid',
    test: 'Glukosa (GOD-PAP)',
    severity: 'Moderat',
    mechanism:
      'Kortikosteroid menyebabkan hiperglikemia biologis melalui peningkatan glukoneogenesis hepatik dan resistensi insulin perifer — bukan interferensi analitik, melainkan efek fisiologis obat.',
    recommendation:
      'Interpretasikan hasil glukosa dengan mempertimbangkan terapi kortikosteroid. Lakukan pemeriksaan glukosa puasa dan pertimbangkan pemantauan HbA1c untuk evaluasi jangka panjang.',
  },
  {
    drug: 'Parasetamol',
    test: 'Bilirubin Total',
    severity: 'Minor',
    mechanism:
      'Parasetamol dosis tinggi dapat menyebabkan interferensi ringan pada beberapa metode pengukuran bilirubin, terutama metode diazo.',
    recommendation:
      'Efek biasanya minimal pada dosis terapeutik. Perhatikan jika pasien mengonsumsi dosis supraterapeutik atau memiliki gangguan fungsi hati.',
  },
]

const drugOptions = [
  'Vitamin C (Asam Askorbat)',
  'Biotin (Vitamin B7)',
  'Aspirin',
  'Ibuprofen',
  'Metformin',
  'Amoksisilin',
  'Parasetamol',
  'Kortikosteroid',
]

const testOptions = [
  'Glukosa (GOD-PAP)',
  'Kolesterol Total',
  'Trigliserida',
  'HbA1c',
  'Troponin I (Immunoassay)',
  'TSH (Immunoassay)',
  'Kreatinin (Jaffe)',
  'Bilirubin Total',
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function severityBadgeVariant(severity: Interaction['severity']): 'critical' | 'high' | 'info' {
  switch (severity) {
    case 'Signifikan':
      return 'critical'
    case 'Moderat':
      return 'high'
    case 'Minor':
      return 'info'
  }
}

function severityIcon(severity: Interaction['severity']) {
  switch (severity) {
    case 'Signifikan':
      return <ShieldAlert size={16} className="text-red-500" />
    case 'Moderat':
      return <AlertTriangle size={16} className="text-amber-500" />
    case 'Minor':
      return <Info size={16} className="text-sky-500" />
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function DrugLabChecker() {
  const [selectedDrugs, setSelectedDrugs] = useState<Set<string>>(new Set())
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<Interaction[] | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const toggleDrug = (d: string) => {
    setSelectedDrugs((prev) => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })
  }

  const toggleTest = (t: string) => {
    setSelectedTests((prev) => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
  }

  const handleCheck = () => {
    const found = interactionDB.filter(
      (ix) => selectedDrugs.has(ix.drug) && selectedTests.has(ix.test)
    )
    setResults(found)
    setExpandedIdx(null)
  }

  const canCheck = selectedDrugs.size > 0 && selectedTests.size > 0

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ---- Header ---- */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Pill size={22} className="text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Drug-Laboratory Interaction Checker
            </h1>
            <p className="text-sm text-gray-500">
              Deteksi Interferensi Obat terhadap Hasil Pemeriksaan Lab
            </p>
          </div>
        </div>
      </div>

      {/* ---- Dual Selection ---- */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Drugs column */}
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Pill size={16} className="text-rose-500" />
            Obat / Suplemen
          </h2>
          <p className="text-xs text-gray-400 mb-3">Pilih obat yang sedang dikonsumsi pasien</p>
          <div className="space-y-2">
            {drugOptions.map((drug) => {
              const checked = selectedDrugs.has(drug)
              return (
                <label
                  key={drug}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? 'border-rose-300 bg-rose-50'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDrug(drug)}
                    className="w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <Pill size={14} className={checked ? 'text-rose-500' : 'text-gray-400'} />
                  <span className="text-sm text-gray-700">{drug}</span>
                </label>
              )
            })}
          </div>
        </Card>

        {/* Tests column */}
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FlaskConical size={16} className="text-violet-500" />
            Pemeriksaan Lab
          </h2>
          <p className="text-xs text-gray-400 mb-3">Pilih pemeriksaan yang akan dilakukan</p>
          <div className="space-y-2">
            {testOptions.map((test) => {
              const checked = selectedTests.has(test)
              return (
                <label
                  key={test}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? 'border-violet-300 bg-violet-50'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTest(test)}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <FlaskConical size={14} className={checked ? 'text-violet-500' : 'text-gray-400'} />
                  <span className="text-sm text-gray-700">{test}</span>
                </label>
              )
            })}
          </div>
        </Card>
      </div>

      {/* ---- Check Button ---- */}
      <div className="flex justify-center">
        <Button
          onClick={handleCheck}
          disabled={!canCheck}
          size="lg"
          leftIcon={<Search size={18} />}
          className="px-8"
        >
          Periksa Interaksi
        </Button>
      </div>

      {/* ---- Results ---- */}
      {results !== null && (
        <Card padding="lg">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Hasil Pemeriksaan Interaksi
          </h2>

          {results.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={40} />}
              title="Tidak ditemukan interaksi yang diketahui."
              description="Kombinasi obat dan pemeriksaan lab yang dipilih tidak memiliki interaksi yang tercatat dalam database kami."
            />
          ) : (
            <div className="space-y-3">
              {results.map((ix, i) => {
                const isExpanded = expandedIdx === i
                return (
                  <div
                    key={`${ix.drug}-${ix.test}`}
                    className={`rounded-xl border transition-all ${
                      ix.severity === 'Signifikan'
                        ? 'border-red-200 bg-red-50/30'
                        : ix.severity === 'Moderat'
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-sky-200 bg-sky-50/30'
                    }`}
                  >
                    {/* Header row */}
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                      className="w-full text-left p-4 flex items-start gap-3"
                    >
                      <div className="mt-0.5 shrink-0">{severityIcon(ix.severity)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-gray-900">{ix.drug}</span>
                          <span className="text-gray-400">×</span>
                          <span className="text-sm font-semibold text-gray-900">{ix.test}</span>
                        </div>
                        <Badge variant={severityBadgeVariant(ix.severity)}>{ix.severity}</Badge>
                      </div>
                      <div className="shrink-0 mt-1 text-gray-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {/* Detail panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 ml-9 space-y-3 border-t border-gray-100 mt-0">
                        <div className="pt-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Mekanisme
                          </p>
                          <p className="text-sm text-gray-700 leading-relaxed">{ix.mechanism}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Rekomendasi
                          </p>
                          <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-gray-100">
                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-700 leading-relaxed">{ix.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Summary */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                <span>
                  Ditemukan <strong className="text-gray-700">{results.length}</strong> interaksi
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  {results.filter((r) => r.severity === 'Signifikan').length} Signifikan
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {results.filter((r) => r.severity === 'Moderat').length} Moderat
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  {results.filter((r) => r.severity === 'Minor').length} Minor
                </span>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
