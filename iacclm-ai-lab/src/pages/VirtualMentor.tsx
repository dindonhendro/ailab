import { useState } from 'react'
import {
  GraduationCap,
  Trophy,
  BookOpen,
  Award,
  Flame,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react'
import { Card, Badge } from '../components/ui/ui'
import Button from '../components/ui/Button'

/* ------------------------------------------------------------------ */
/*  Mock data                                                         */
/* ------------------------------------------------------------------ */

interface QuizOption {
  label: string
  text: string
}

interface QuizQuestion {
  id: number
  title: string
  description: string
  options: QuizOption[]
  correctAnswer: string
  explanation: string
  reference: string
}

const quizData: QuizQuestion[] = [
  {
    id: 1,
    title: 'Studi Kasus #14: Validasi Metode Fotometri',
    description:
      'Laboratorium klinik RS X baru saja memasang fotometer baru untuk pemeriksaan glukosa (metode GOD-PAP). Saat melakukan validasi metode, diperoleh CV intra-assay 3,2% dan CV inter-assay 5,8%. Bias terhadap metode referensi adalah -2,1%. Total Allowable Error (TEa) glukosa menurut CLIA adalah ±10%.',
    options: [
      { label: 'A', text: 'Metode dinyatakan valid karena CV intra-assay < 5%' },
      { label: 'B', text: 'Metode dinyatakan valid karena Total Error (TE = bias + 1.65×CV) < TEa' },
      { label: 'C', text: 'Metode tidak valid karena CV inter-assay melebihi 5%' },
      { label: 'D', text: 'Metode tidak valid karena bias negatif menunjukkan error sistematik' },
    ],
    correctAnswer: 'B',
    explanation:
      'Total Error (TE) dihitung sebagai |bias| + 1.65 × CV = 2.1 + 1.65 × 5.8 = 11.67%. Meskipun mendekati batas TEa (10%), jika menggunakan CV intra-assay: TE = 2.1 + 1.65 × 3.2 = 7.38% yang masih di bawah TEa. Evaluasi harus mempertimbangkan keseluruhan performa metode. Dalam konteks ini, TE menggunakan CV inter-assay menunjukkan perlu perbaikan, tetapi pendekatan yang benar adalah menghitung TE terlebih dahulu.',
    reference: 'CLSI EP15-A3, Westgard QC Guideline 2019',
  },
  {
    id: 2,
    title: 'Studi Kasus #21: Kontrol Mutu Hematologi',
    description:
      'Analis laboratorium menemukan bahwa hasil kontrol harian untuk pemeriksaan hemoglobin (Hb) pada analyzer hematologi menunjukkan pola berikut selama 5 hari terakhir: semua nilai berada di satu sisi rata-rata (di atas mean). Nilai masih dalam batas ±2SD. Aturan Westgard mana yang dilanggar?',
    options: [
      { label: 'A', text: 'Aturan 1₃s — satu nilai melebihi ±3SD' },
      { label: 'B', text: 'Aturan 2₂s — dua nilai berturut-turut melebihi ±2SD' },
      { label: 'C', text: 'Aturan R₄s — range antara dua kontrol melebihi 4SD' },
      { label: 'D', text: 'Aturan 10x — sepuluh nilai berturut-turut di satu sisi mean (peringatan pada 5 nilai)' },
    ],
    correctAnswer: 'D',
    explanation:
      'Aturan 10x (atau variasinya 7x, 8x, 9x) mendeteksi systematic error (shift/trend). Ketika 5 atau lebih nilai berturut-turut berada di satu sisi rata-rata, ini merupakan peringatan awal adanya shift. Meskipun nilai masih dalam ±2SD, pola ini menunjukkan adanya pergeseran sistematik yang perlu diselidiki — misalnya kalibrasi ulang, reagen mendekati kadaluarsa, atau perubahan suhu lingkungan.',
    reference: 'Westgard JO. Basic QC Practices, 4th Edition. 2016',
  },
  {
    id: 3,
    title: 'Studi Kasus #7: Interferensi Immunoassay',
    description:
      'Pasien wanita, 35 tahun, datang dengan keluhan kelelahan. Hasil pemeriksaan TSH: 0,05 mIU/L (rendah), namun FT4 dan FT3 dalam batas normal. Pasien tidak memiliki riwayat penyakit tiroid. Diketahui pasien rutin mengonsumsi suplemen biotin 10 mg/hari untuk rambut rontok. Apa yang paling mungkin menyebabkan hasil TSH rendah palsu?',
    options: [
      { label: 'A', text: 'Antibodi heterofil yang menginterferensi' },
      { label: 'B', text: 'Efek hook pada konsentrasi tinggi' },
      { label: 'C', text: 'Biotin menginterferensi metode immunoassay berbasis streptavidin-biotin' },
      { label: 'D', text: 'Hemolisis sampel memengaruhi pembacaan' },
    ],
    correctAnswer: 'C',
    explanation:
      'Biotin (vitamin B7) pada dosis tinggi (>5 mg/hari) dapat menginterferensi immunoassay yang menggunakan teknologi streptavidin-biotin. Pada assay tipe sandwich (seperti TSH), biotin eksogen berkompetisi dengan biotin berlabel, menyebabkan hasil falsely low. Pada assay tipe kompetitif (seperti FT4, FT3), bisa menyebabkan hasil falsely high. Solusinya: tunda pemeriksaan 48-72 jam setelah penghentian suplemen biotin.',
    reference: 'FDA Safety Communication 2017; Endocrine Reviews 2018;39(5):830-850',
  },
]

const skillAreas = [
  { name: 'Kalibrasi Instrumen', value: 72, color: 'bg-blue-500' },
  { name: 'Validasi Metode', value: 45, color: 'bg-amber-500' },
  { name: 'Kontrol Mutu', value: 88, color: 'bg-emerald-500' },
  { name: 'Hematologi', value: 60, color: 'bg-violet-500' },
  { name: 'Kimia Klinik', value: 75, color: 'bg-cyan-500' },
  { name: 'Immunoassay', value: 50, color: 'bg-rose-500' },
]

const skpLog = [
  { date: '12 Jun 2026', module: 'Validasi Metode Analitik', credits: 1.0 },
  { date: '08 Jun 2026', module: 'Interpretasi Hasil Hematologi', credits: 0.5 },
  { date: '01 Jun 2026', module: 'QC Westgard Lanjutan', credits: 1.5 },
  { date: '25 Mei 2026', module: 'Immunoassay & Interferensi', credits: 1.0 },
  { date: '18 Mei 2026', module: 'Keselamatan Kerja di Lab', credits: 0.5 },
]

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function VirtualMentor() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isChecked, setIsChecked] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const currentQ = quizData[currentQuestionIndex]

  const handleCheckAnswer = () => {
    if (!selectedAnswer) return
    setIsChecked(true)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex((i) => i + 1)
      setSelectedAnswer(null)
      setIsChecked(false)
      setShowExplanation(false)
    }
  }

  const stats = [
    { label: 'Skor Hari Ini', value: '85/100', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Modul Selesai', value: '12/30', icon: BookOpen, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Kredit SKP', value: '4.5', icon: Award, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Streak', value: '7 hari', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ---- Header ---- */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center">
            <GraduationCap size={22} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Virtual Mentor — Edukasi Berkelanjutan
            </h1>
            <p className="text-sm text-gray-500">
              Kuis Harian · Studi Kasus · Kredit SKP IACCLM
            </p>
          </div>
        </div>
      </div>

      {/* ---- Progress Stats ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="!p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ---- Daily Quiz Card ---- */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">Kuis Harian</h2>
          </div>
          <Badge variant="info">
            Soal {currentQuestionIndex + 1} / {quizData.length}
          </Badge>
        </div>

        {/* Case title & description */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">{currentQ.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{currentQ.description}</p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-5">
          {currentQ.options.map((opt) => {
            const isSelected = selectedAnswer === opt.label
            const isCorrect = opt.label === currentQ.correctAnswer
            let borderColor = 'border-gray-200 hover:border-primary-300'
            let bgColor = 'bg-white'

            if (isChecked) {
              if (isCorrect) {
                borderColor = 'border-emerald-400'
                bgColor = 'bg-emerald-50'
              } else if (isSelected && !isCorrect) {
                borderColor = 'border-red-400'
                bgColor = 'bg-red-50'
              } else {
                borderColor = 'border-gray-100'
                bgColor = 'bg-gray-50 opacity-60'
              }
            } else if (isSelected) {
              borderColor = 'border-primary-500'
              bgColor = 'bg-primary-50'
            }

            return (
              <button
                key={opt.label}
                onClick={() => !isChecked && setSelectedAnswer(opt.label)}
                disabled={isChecked}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${borderColor} ${bgColor} ${
                  !isChecked ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isSelected && !isChecked
                        ? 'bg-primary-600 text-white'
                        : isChecked && isCorrect
                        ? 'bg-emerald-600 text-white'
                        : isChecked && isSelected && !isCorrect
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-sm text-gray-700 pt-0.5">{opt.text}</span>
                  {isChecked && isCorrect && (
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 ml-auto mt-0.5" />
                  )}
                  {isChecked && isSelected && !isCorrect && (
                    <XCircle size={18} className="text-red-500 shrink-0 ml-auto mt-0.5" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {!isChecked ? (
            <Button
              onClick={handleCheckAnswer}
              disabled={!selectedAnswer}
              leftIcon={<CheckCircle2 size={16} />}
            >
              Periksa Jawaban
            </Button>
          ) : (
            <>
              {currentQuestionIndex < quizData.length - 1 && (
                <Button
                  onClick={handleNextQuestion}
                  leftIcon={<ArrowRight size={16} />}
                >
                  Soal Berikutnya
                </Button>
              )}
            </>
          )}
        </div>

        {/* Explanation */}
        {isChecked && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800 transition-colors"
            >
              {showExplanation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Penjelasan
            </button>
            {showExplanation && (
              <div className="mt-3 p-4 bg-primary-50 rounded-xl border border-primary-100">
                <p className="text-sm text-gray-700 leading-relaxed mb-3">{currentQ.explanation}</p>
                <p className="text-xs text-gray-500">
                  <span className="font-semibold">Referensi:</span> {currentQ.reference}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* ---- Weakness Tracker ---- */}
        <Card padding="lg">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            Peta Kompetensi
          </h2>
          <div className="space-y-4">
            {skillAreas.map((skill) => (
              <div key={skill.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-700 font-medium">{skill.name}</span>
                  <span
                    className={`text-xs font-bold ${
                      skill.value >= 80
                        ? 'text-emerald-600'
                        : skill.value >= 60
                        ? 'text-amber-600'
                        : 'text-red-500'
                    }`}
                  >
                    {skill.value}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${skill.color}`}
                    style={{ width: `${skill.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ---- SKP Log ---- */}
        <Card padding="lg">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-violet-500" />
            Log Kredit SKP
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Modul
                  </th>
                  <th className="text-right pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    SKP
                  </th>
                </tr>
              </thead>
              <tbody>
                {skpLog.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 text-gray-500 whitespace-nowrap">{row.date}</td>
                    <td className="py-2.5 text-gray-700 font-medium">{row.module}</td>
                    <td className="py-2.5 text-right">
                      <Badge variant="normal">{row.credits.toFixed(1)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total Kredit SKP</span>
            <span className="text-sm font-bold text-primary-700">
              {skpLog.reduce((s, r) => s + r.credits, 0).toFixed(1)} SKP
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
