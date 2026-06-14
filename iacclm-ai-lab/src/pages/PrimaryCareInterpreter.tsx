import { useState, useCallback } from 'react'
import {
  Stethoscope,
  Droplets,
  Bean,
  Pill,
  Heart,
  Syringe,
  Bug,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardList,
} from 'lucide-react'
import { Card, Badge } from '../components/ui/ui'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

/* ─── Panel definitions ─── */

interface Parameter {
  key: string
  label: string
  unit: string
  defaultValue: number
  normalRange: [number, number]
}

interface PanelDef {
  key: string
  label: string
  description: string
  icon: React.ElementType
  color: string
  bg: string
  border: string
  parameters: Parameter[]
}

const PANELS: PanelDef[] = [
  {
    key: 'diabetes',
    label: 'Panel Diabetes',
    description: 'Glukosa puasa, 2-jam PP, HbA1c',
    icon: Droplets,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    parameters: [
      { key: 'gp',    label: 'Glukosa Puasa',    unit: 'mg/dL', defaultValue: 142, normalRange: [70, 100] },
      { key: 'g2pp',  label: 'Glukosa 2 Jam PP',  unit: 'mg/dL', defaultValue: 215, normalRange: [70, 140] },
      { key: 'hba1c', label: 'HbA1c',             unit: '%',     defaultValue: 7.8, normalRange: [4.0, 5.7] },
    ],
  },
  {
    key: 'ginjal',
    label: 'Panel Ginjal',
    description: 'Kreatinin, BUN, eGFR',
    icon: Bean,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    parameters: [
      { key: 'krea',  label: 'Kreatinin',  unit: 'mg/dL', defaultValue: 2.4, normalRange: [0.6, 1.2] },
      { key: 'bun',   label: 'BUN',        unit: 'mg/dL', defaultValue: 32,  normalRange: [7, 20] },
      { key: 'egfr',  label: 'eGFR',       unit: 'mL/min', defaultValue: 45, normalRange: [90, 120] },
    ],
  },
  {
    key: 'hati',
    label: 'Panel Hati',
    description: 'SGOT, SGPT, Bilirubin',
    icon: Pill,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    parameters: [
      { key: 'sgot', label: 'SGOT', unit: 'U/L',   defaultValue: 68,   normalRange: [5, 40] },
      { key: 'sgpt', label: 'SGPT', unit: 'U/L',   defaultValue: 85,   normalRange: [7, 56] },
      { key: 'bili', label: 'Bilirubin Total', unit: 'mg/dL', defaultValue: 2.1, normalRange: [0.1, 1.2] },
    ],
  },
  {
    key: 'lipid',
    label: 'Panel Lipid',
    description: 'Kolesterol total, LDL, HDL, Trigliserida',
    icon: Heart,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    parameters: [
      { key: 'chol', label: 'Kolesterol Total', unit: 'mg/dL', defaultValue: 265, normalRange: [0, 200] },
      { key: 'ldl',  label: 'LDL',              unit: 'mg/dL', defaultValue: 175, normalRange: [0, 100] },
      { key: 'hdl',  label: 'HDL',              unit: 'mg/dL', defaultValue: 35,  normalRange: [40, 60] },
      { key: 'tg',   label: 'Trigliserida',     unit: 'mg/dL', defaultValue: 280, normalRange: [0, 150] },
    ],
  },
  {
    key: 'anemia',
    label: 'Panel Anemia',
    description: 'Hemoglobin, MCV, Ferritin',
    icon: Syringe,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    parameters: [
      { key: 'hb',   label: 'Hemoglobin',  unit: 'g/dL',  defaultValue: 9.5,  normalRange: [12.0, 16.0] },
      { key: 'mcv',  label: 'MCV',         unit: 'fL',    defaultValue: 68,   normalRange: [80, 100] },
      { key: 'fer',  label: 'Ferritin',    unit: 'ng/mL', defaultValue: 8,    normalRange: [12, 150] },
    ],
  },
  {
    key: 'dbd',
    label: 'Panel Demam Berdarah',
    description: 'Trombosit, Hematokrit, NS1 Ag',
    icon: Bug,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    parameters: [
      { key: 'plt',  label: 'Trombosit',   unit: '×10³/μL', defaultValue: 85,  normalRange: [150, 400] },
      { key: 'hct',  label: 'Hematokrit',  unit: '%',       defaultValue: 48,  normalRange: [36, 44] },
      { key: 'ns1',  label: 'NS1 Antigen', unit: 'index',   defaultValue: 1.8, normalRange: [0, 0.9] },
    ],
  },
]

/* ─── Interpretation templates ─── */

interface InterpretationResult {
  doctorSummary: string
  patientExplanation: string
  actions: string[]
  paramStatuses: Record<string, 'normal' | 'high' | 'critical'>
}

function getParamStatus(value: number, range: [number, number]): 'normal' | 'high' | 'critical' {
  if (value >= range[0] && value <= range[1]) return 'normal'
  const lowDiff = range[0] - value
  const highDiff = value - range[1]
  const maxDeviation = Math.max(lowDiff, highDiff)
  const rangeSpan = range[1] - range[0]
  if (rangeSpan > 0 && maxDeviation / rangeSpan > 0.5) return 'critical'
  return 'high'
}

const INTERPRETATIONS: Record<string, (values: Record<string, number>) => InterpretationResult> = {
  diabetes: (values) => {
    const statuses: Record<string, 'normal' | 'high' | 'critical'> = {}
    PANELS.find(p => p.key === 'diabetes')!.parameters.forEach(p => {
      statuses[p.key] = getParamStatus(values[p.key], p.normalRange)
    })
    return {
      doctorSummary: `Hasil pemeriksaan panel diabetes menunjukkan glukosa puasa ${values.gp} mg/dL (nilai rujukan: 70-100 mg/dL) dan glukosa 2 jam post-prandial ${values.g2pp} mg/dL (nilai rujukan: <140 mg/dL), yang keduanya berada di atas batas normal. Nilai HbA1c sebesar ${values.hba1c}% menunjukkan kontrol glikemik yang kurang optimal dalam 2-3 bulan terakhir.

Berdasarkan kriteria Perkeni 2021 dan ADA 2024, temuan ini konsisten dengan diagnosis diabetes mellitus tipe 2 yang belum terkontrol. Korelasi klinis antara glukosa puasa yang tinggi dan HbA1c menunjukkan hiperglikemia persisten, bukan hanya peningkatan transien.

Perlu diperhatikan kemungkinan komplikasi mikrovaskular mengingat durasi hiperglikemia. Evaluasi fungsi ginjal dan pemeriksaan mata direkomendasikan sebagai baseline.`,
      patientExplanation: `Bapak/Ibu, hasil pemeriksaan darah menunjukkan bahwa kadar gula darah saat ini masih di atas batas normal. Artinya, tubuh sedang kesulitan mengatur gula darah dengan baik.

Angka HbA1c yang kami periksa bisa menunjukkan rata-rata gula darah selama 3 bulan terakhir, dan hasilnya menunjukkan bahwa gula darah belum cukup terkontrol. Ini bukan berarti kondisinya berbahaya sekarang, tetapi perlu penanganan supaya tidak menimbulkan masalah di kemudian hari.

Dokter akan membantu Bapak/Ibu dengan pengaturan obat dan pola makan yang tepat.`,
      actions: [
        'Rujuk ke Poli Penyakit Dalam untuk manajemen DM komprehensif',
        'Mulai atau sesuaikan terapi OAD sesuai algoritma Perkeni',
        'Edukasi diet rendah gula dan karbohidrat refinasi',
        'Periksa fungsi ginjal (Ureum, Kreatinin, eGFR) dan profil lipid',
        'Kontrol ulang HbA1c dalam 3 bulan',
        'Rujuk pemeriksaan mata (funduskopi) untuk skrining retinopati',
      ],
      paramStatuses: statuses,
    }
  },
  ginjal: (values) => {
    const statuses: Record<string, 'normal' | 'high' | 'critical'> = {}
    PANELS.find(p => p.key === 'ginjal')!.parameters.forEach(p => {
      statuses[p.key] = getParamStatus(values[p.key], p.normalRange)
    })
    return {
      doctorSummary: `Hasil pemeriksaan fungsi ginjal menunjukkan kreatinin serum ${values.krea} mg/dL (nilai rujukan: 0.6-1.2 mg/dL) dan BUN ${values.bun} mg/dL (nilai rujukan: 7-20 mg/dL), keduanya meningkat. Estimasi GFR sebesar ${values.egfr} mL/min menunjukkan penurunan fungsi filtrasi glomerulus.

Berdasarkan klasifikasi KDIGO 2024, temuan ini konsisten dengan Chronic Kidney Disease (CKD) stadium 3a. Diperlukan evaluasi lebih lanjut untuk menentukan etiologi—apakah terkait nefropati diabetik, hipertensi, atau penyebab lain.

Rasio BUN/Kreatinin yang perlu diperhatikan karena dapat membantu membedakan penyebab pre-renal, renal, dan post-renal dari peningkatan kreatinin.`,
      patientExplanation: `Bapak/Ibu, hasil pemeriksaan menunjukkan bahwa fungsi ginjal saat ini sedikit menurun. Ginjal bertugas menyaring zat-zat sisa dari darah, dan saat ini kemampuan penyaringan itu belum optimal.

Ini belum berarti ginjal rusak berat, tetapi perlu perhatian khusus supaya tidak memburuk. Banyak orang dengan kondisi seperti ini bisa menjaga ginjalnya tetap sehat dengan pengobatan dan perubahan pola hidup yang tepat.

Yang penting sekarang adalah menjaga tekanan darah, mengurangi garam, dan kontrol rutin ke dokter.`,
      actions: [
        'Rujuk ke Spesialis Penyakit Dalam / Nefrologi',
        'Periksa urin lengkap dan rasio Albumin-Kreatinin Urin (UACR)',
        'Kontrol tekanan darah target <130/80 mmHg',
        'Diet rendah protein (0.6-0.8 g/kg/hari) dan rendah garam',
        'Hindari obat nefrotoksik (NSAID, aminoglikosida)',
        'Periksa elektrolit (Na, K, Ca, PO4) dan darah lengkap',
        'Kontrol ulang fungsi ginjal dalam 1 bulan',
      ],
      paramStatuses: statuses,
    }
  },
  hati: (values) => {
    const statuses: Record<string, 'normal' | 'high' | 'critical'> = {}
    PANELS.find(p => p.key === 'hati')!.parameters.forEach(p => {
      statuses[p.key] = getParamStatus(values[p.key], p.normalRange)
    })
    return {
      doctorSummary: `Profil hepatik menunjukkan peningkatan SGOT ${values.sgot} U/L dan SGPT ${values.sgpt} U/L, dengan rasio De Ritis (SGOT/SGPT) sebesar ${(values.sgot / values.sgpt).toFixed(2)}. Bilirubin total ${values.bili} mg/dL meningkat di atas batas normal.

Pola peningkatan transaminase dengan SGPT lebih dominan mengarah ke kerusakan hepatoseluler, kemungkinan terkait hepatitis, steatohepatitis (NAFLD/NASH), atau hepatotoksisitas obat. Ikterus subklinis ditunjukkan oleh hiperbilirubinemia.

Diperlukan evaluasi etiologi dengan marker hepatitis viral (HBsAg, Anti-HCV), USG abdomen, dan korelasi dengan riwayat obat dan konsumsi alkohol.`,
      patientExplanation: `Bapak/Ibu, hasil pemeriksaan menunjukkan bahwa enzim hati saat ini lebih tinggi dari biasanya. Ini artinya sel-sel hati sedang mengalami sedikit gangguan atau peradangan.

Penyebabnya bisa bermacam-macam—misalnya infeksi virus, efek samping obat, atau karena pola makan. Dokter perlu melakukan beberapa pemeriksaan tambahan untuk mencari tahu penyebab pastinya.

Sementara ini, sebaiknya hindari obat-obatan yang tidak perlu dan kurangi makanan berlemak. Jangan khawatir, dengan penanganan yang tepat kondisi ini biasanya bisa membaik.`,
      actions: [
        'Periksa HBsAg dan Anti-HCV untuk menyingkirkan hepatitis viral',
        'USG abdomen untuk evaluasi parenkim hati dan saluran empedu',
        'Review obat-obatan yang mungkin hepatotoksik',
        'Hentikan konsumsi alkohol',
        'Periksa profil lipid dan glukosa puasa (skrining NAFLD)',
        'Kontrol ulang fungsi hati dalam 2 minggu',
      ],
      paramStatuses: statuses,
    }
  },
  lipid: (values) => {
    const statuses: Record<string, 'normal' | 'high' | 'critical'> = {}
    PANELS.find(p => p.key === 'lipid')!.parameters.forEach(p => {
      statuses[p.key] = getParamStatus(values[p.key], p.normalRange)
    })
    return {
      doctorSummary: `Profil lipid menunjukkan dislipidemia campuran: kolesterol total ${values.chol} mg/dL (target <200), LDL ${values.ldl} mg/dL (target <100), HDL ${values.hdl} mg/dL (target >40), dan trigliserida ${values.tg} mg/dL (target <150).

Rasio LDL/HDL sebesar ${(values.ldl / values.hdl).toFixed(1)} menunjukkan risiko kardiovaskular yang meningkat. Berdasarkan ACC/AHA Risk Calculator, pasien ini berisiko tinggi untuk kejadian kardiovaskular aterosklerotik (ASCVD).

Terapi statin diindikasikan berdasarkan pedoman tatalaksana dislipidemia PERKI 2023. Perlu evaluasi faktor risiko kardiovaskular lainnya (hipertensi, DM, merokok) untuk stratifikasi risiko secara komprehensif.`,
      patientExplanation: `Bapak/Ibu, hasil pemeriksaan lemak darah menunjukkan bahwa kadar kolesterol dan trigliserida saat ini cukup tinggi. Kolesterol jahat (LDL) tinggi dan kolesterol baik (HDL) rendah — kondisi ini bisa meningkatkan risiko penyakit jantung jika dibiarkan.

Kabar baiknya, kondisi ini bisa diperbaiki dengan kombinasi pengobatan, diet sehat, dan olahraga teratur. Kurangi makanan yang digoreng, makanan berlemak, dan perbanyak sayur, buah, serta ikan.

Dokter akan mempertimbangkan apakah perlu obat penurun kolesterol untuk membantu menurunkan risiko.`,
      actions: [
        'Mulai terapi statin sesuai pedoman PERKI 2023',
        'Diet rendah lemak jenuh dan tinggi serat',
        'Target LDL <100 mg/dL (atau <70 jika risiko sangat tinggi)',
        'Olahraga aerobik 150 menit/minggu',
        'Periksa fungsi hati sebelum dan setelah memulai statin',
        'Evaluasi risiko ASCVD 10 tahun dengan kalkulator risiko',
        'Kontrol ulang profil lipid dalam 6-8 minggu setelah terapi',
      ],
      paramStatuses: statuses,
    }
  },
  anemia: (values) => {
    const statuses: Record<string, 'normal' | 'high' | 'critical'> = {}
    PANELS.find(p => p.key === 'anemia')!.parameters.forEach(p => {
      statuses[p.key] = getParamStatus(values[p.key], p.normalRange)
    })
    return {
      doctorSummary: `Hasil pemeriksaan menunjukkan hemoglobin ${values.hb} g/dL (anemia) dengan MCV ${values.mcv} fL (mikrositik) dan ferritin ${values.fer} ng/mL (deplesi besi). Temuan ini konsisten dengan anemia defisiensi besi.

Pola mikrositik hipokromik dengan ferritin rendah menunjukkan deplesi cadangan besi tubuh. Penyebab tersering pada populasi Indonesia meliputi: asupan zat besi tidak adekuat, malabsorpsi, perdarahan saluran cerna kronis, dan pada wanita usia subur, menorrhagia.

Perlu evaluasi sumber perdarahan terutama pada pasien laki-laki atau wanita pasca-menopause. Pemeriksaan feses untuk darah samar direkomendasikan.`,
      patientExplanation: `Bapak/Ibu, pemeriksaan menunjukkan bahwa kadar darah (hemoglobin) saat ini lebih rendah dari normal. Ini yang biasa disebut "kurang darah" atau anemia. Penyebabnya kemungkinan besar karena kurangnya zat besi di tubuh.

Zat besi penting untuk membentuk sel darah merah yang membawa oksigen ke seluruh tubuh. Itulah mengapa Bapak/Ibu mungkin merasa lebih mudah lelah, pusing, atau lemas.

Dokter akan memberikan suplemen zat besi dan mungkin perlu pemeriksaan tambahan untuk mencari tahu mengapa zat besi kurang. Makanan kaya zat besi seperti daging merah, bayam, dan kacang-kacangan bisa membantu.`,
      actions: [
        'Berikan suplemen besi oral (Sulfas Ferosus 300mg, 2-3x/hari)',
        'Minum suplemen besi dengan vitamin C untuk meningkatkan absorpsi',
        'Periksa feses untuk darah samar (occult blood)',
        'Evaluasi riwayat menstruasi pada wanita usia subur',
        'Pertimbangkan endoskopi jika pria atau pasca-menopause',
        'Diet tinggi zat besi (daging merah, hati, bayam, kacang)',
        'Kontrol ulang hemoglobin dan ferritin dalam 4 minggu',
      ],
      paramStatuses: statuses,
    }
  },
  dbd: (values) => {
    const statuses: Record<string, 'normal' | 'high' | 'critical'> = {}
    PANELS.find(p => p.key === 'dbd')!.parameters.forEach(p => {
      statuses[p.key] = getParamStatus(values[p.key], p.normalRange)
    })
    return {
      doctorSummary: `Hasil pemeriksaan menunjukkan trombositopenia dengan trombosit ${values.plt} ×10³/μL, hemokonsentrasi (hematokrit ${values.hct}%), dan NS1 antigen positif (index ${values.ns1}). Temuan ini sangat sugestif untuk infeksi dengue.

Berdasarkan kriteria WHO 2024, kombinasi trombositopenia, peningkatan hematokrit >20% dari baseline, dan NS1 positif memenuhi kriteria Dengue Hemorrhagic Fever (DHF). Perlu pemantauan ketat tanda-tanda warning signs: nyeri perut, muntah persisten, perdarahan mukosa, letargi, dan efusi pleura/asites.

Fase kritis biasanya terjadi pada hari ke-3 hingga ke-7 sakit. Monitoring serial trombosit dan hematokrit setiap 6-12 jam diperlukan.`,
      patientExplanation: `Bapak/Ibu, hasil pemeriksaan menunjukkan tanda-tanda yang mengarah ke demam berdarah dengue. Jumlah trombosit (keping darah) sedang turun, dan ada tanda-tanda bahwa cairan dalam pembuluh darah mulai merembes keluar.

Kondisi ini perlu dipantau dengan ketat karena demam berdarah memiliki fase kritis dimana kondisi bisa memburuk dengan cepat. Bapak/Ibu perlu minum air yang banyak dan istirahat total.

Dokter akan memantau hasil darah secara berkala. Jika ada tanda-tanda memburuk seperti nyeri perut hebat, muntah terus-menerus, atau perdarahan, segera ke UGD.`,
      actions: [
        'Rawat inap untuk pemantauan ketat (fase kritis)',
        'Monitoring trombosit dan hematokrit serial tiap 6-12 jam',
        'Rehidrasi cairan kristaloid (Ringer Laktat) sesuai protokol WHO',
        'Pantau warning signs: nyeri perut, muntah, perdarahan, letargi',
        'Hindari NSAID dan aspirin (risiko perdarahan)',
        'Parasetamol untuk antipiretik (max 4g/hari)',
        'Rujuk ke RS jika trombosit <50.000 atau ada tanda syok',
        'Edukasi keluarga tentang tanda-tanda bahaya',
      ],
      paramStatuses: statuses,
    }
  },
}

/* ─── Status badge helper ─── */

function StatusBadge({ status }: { status: 'normal' | 'high' | 'critical' }) {
  const config = {
    normal:   { label: 'Normal',  variant: 'normal' as const,   icon: CheckCircle2 },
    high:     { label: 'Waspada', variant: 'high' as const,     icon: AlertTriangle },
    critical: { label: 'Bahaya',  variant: 'critical' as const, icon: XCircle },
  }
  const c = config[status]
  const Icon = c.icon
  return (
    <Badge variant={c.variant} className="gap-1">
      <Icon size={10} />
      {c.label}
    </Badge>
  )
}

/* ─── Main Component ─── */

export default function PrimaryCareInterpreter() {
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {}
    PANELS.forEach((panel) => {
      init[panel.key] = {}
      panel.parameters.forEach((p) => {
        init[panel.key][p.key] = p.defaultValue
      })
    })
    return init
  })
  const [result, setResult] = useState<InterpretationResult | null>(null)
  const [generating, setGenerating] = useState(false)

  const activePanel = PANELS.find((p) => p.key === selectedPanel)

  const handleValueChange = useCallback((panelKey: string, paramKey: string, val: string) => {
    const num = parseFloat(val)
    if (isNaN(num)) return
    setValues((prev) => ({
      ...prev,
      [panelKey]: { ...prev[panelKey], [paramKey]: num },
    }))
  }, [])

  const handleGenerate = useCallback(() => {
    if (!selectedPanel) return
    setGenerating(true)
    setResult(null)
    // Simulate AI processing delay
    setTimeout(() => {
      const fn = INTERPRETATIONS[selectedPanel]
      if (fn) {
        setResult(fn(values[selectedPanel]))
      }
      setGenerating(false)
    }, 800)
  }, [selectedPanel, values])

  const handlePanelSelect = useCallback((key: string) => {
    setSelectedPanel(key)
    setResult(null)
  }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Stethoscope size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Interpretasi Lab untuk Faskes Primer</h1>
            <p className="text-sm text-gray-500">Panduan Hasil Lab untuk Dokter Puskesmas & Klinik</p>
          </div>
        </div>
      </div>

      {/* ── Panel Selector Grid ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Pilih Panel Pemeriksaan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {PANELS.map((panel) => {
            const Icon = panel.icon
            const isActive = selectedPanel === panel.key
            return (
              <button
                key={panel.key}
                onClick={() => handlePanelSelect(panel.key)}
                className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-sm ${
                  isActive
                    ? `${panel.border} ${panel.bg} shadow-sm`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg ${panel.bg} flex items-center justify-center mb-3`}>
                  <Icon size={18} className={panel.color} />
                </div>
                <h3 className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                  {panel.label}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{panel.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Value Input Section ── */}
      {activePanel && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardList size={15} className={activePanel.color} />
            Input Nilai — {activePanel.label}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {activePanel.parameters.map((param) => (
              <Input
                key={param.key}
                label={`${param.label} (${param.unit})`}
                type="number"
                step="any"
                value={values[activePanel.key][param.key]}
                hint={`Rujukan: ${param.normalRange[0]}–${param.normalRange[1]} ${param.unit}`}
                onChange={(e) => handleValueChange(activePanel.key, param.key, e.target.value)}
              />
            ))}
          </div>
          <div className="mt-5">
            <Button
              onClick={handleGenerate}
              loading={generating}
              leftIcon={<Sparkles size={14} />}
              size="lg"
            >
              Buat Interpretasi Sederhana
            </Button>
          </div>
        </Card>
      )}

      {/* ── Interpretation Result ── */}
      {result && activePanel && (
        <div className="space-y-4">
          {/* Parameter Status Overview */}
          <Card className="!p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Status Parameter
            </h3>
            <div className="flex flex-wrap gap-3">
              {activePanel.parameters.map((param) => (
                <div
                  key={param.key}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100"
                >
                  <span className="text-sm font-medium text-gray-700">{param.label}</span>
                  <span className="text-sm text-gray-500">
                    {values[activePanel.key][param.key]} {param.unit}
                  </span>
                  <StatusBadge status={result.paramStatuses[param.key]} />
                </div>
              ))}
            </div>
          </Card>

          {/* Doctor Summary */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center">
                <Stethoscope size={14} className="text-primary-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Ringkasan untuk Dokter</h3>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed space-y-3">
              {result.doctorSummary.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </Card>

          {/* Patient Explanation */}
          <Card className="bg-gradient-to-br from-blue-50/50 to-sky-50/50 border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <Heart size={14} className="text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Penjelasan untuk Pasien</h3>
              <Badge variant="info">Bahasa Sederhana</Badge>
            </div>
            <div className="text-sm text-gray-700 leading-relaxed space-y-3 italic">
              {result.patientExplanation.split('\n\n').map((para, i) => (
                <p key={i}>"{para}"</p>
              ))}
            </div>
          </Card>

          {/* Recommended Actions */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={14} className="text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Tindakan yang Disarankan</h3>
            </div>
            <ul className="space-y-2">
              {result.actions.map((action, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* ── Placeholder when no panel selected ── */}
      {!selectedPanel && (
        <Card className="!py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
              <ClipboardList size={24} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Pilih panel pemeriksaan di atas</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Pilih salah satu panel pemeriksaan untuk memasukkan nilai hasil lab dan mendapatkan interpretasi otomatis.
            </p>
          </div>
        </Card>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <AlertTriangle size={12} className="text-amber-400" />
        <span>Interpretasi ini bersifat panduan dan tidak menggantikan penilaian klinis dokter. Selalu korelasikan dengan kondisi klinis pasien.</span>
      </div>
    </div>
  )
}
