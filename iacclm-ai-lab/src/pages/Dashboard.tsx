import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  FlaskConical,
  TrendingUp,
  Users,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Stethoscope,
  GraduationCap,
  Pill,
  BarChart3,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { getDashboardStats, seedDummyData } from '../services/api'
import { Card } from '../components/ui/ui'
import Button from '../components/ui/Button'

interface Stats {
  totalConversations: number
  totalLabSessions: number
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({ totalConversations: 0, totalLabSessions: 0 })
  const [seeding, setSeeding] = useState(false)
  const [seedStatus, setSeedStatus] = useState<string | null>(null)

  useEffect(() => {
    getDashboardStats().then(setStats)
  }, [])

  const handleSeed = async () => {
    if (!user?.id) {
      setSeedStatus('Anda harus masuk (login) terlebih dahulu untuk mengisi data dummy.')
      return
    }
    setSeeding(true)
    setSeedStatus(null)
    try {
      const res = await seedDummyData(user.id)
      if (res.success) {
        setSeedStatus('Berhasil memasukkan 10 data dummy ke database!')
        getDashboardStats().then(setStats)
      } else {
        setSeedStatus(res.error ?? 'Gagal mengisi data dummy.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setSeedStatus(`Gagal mengisi data dummy: ${msg}`)
    } finally {
      setSeeding(false)
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 11) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Seeding status alert */}
      {seedStatus && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
          seedStatus.includes('Berhasil') 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <p className="font-medium">{seedStatus}</p>
          </div>
          <button 
            onClick={() => setSeedStatus(null)}
            className="text-gray-400 hover:text-gray-600 font-medium"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Welcome */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {greeting()},{' '}
            <span className="text-primary-700">
              {(user?.full_name ?? user?.email)?.split(' ')[0] ?? 'Dokter'}
            </span>{' '}
            👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            IACCLM AI Lab · Terintegrasi SATUSEHAT FHIR R4
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSeed}
            loading={seeding}
            size="sm"
            variant="outline"
            className="text-xs border-dashed flex items-center gap-1.5"
          >
            ⚙️ Isi 10 Skenario Dummy
          </Button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-gray-500 font-medium">Sistem online</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Chat',        value: stats.totalConversations, icon: MessageSquare, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Sesi Lab',           value: stats.totalLabSessions,   icon: FlaskConical,   color: 'text-violet-600',  bg: 'bg-violet-50'  },
          { label: 'Parameter LOINC',   value: 11,                         icon: Activity,       color: 'text-teal-600',    bg: 'bg-teal-50'    },
          { label: 'Pengguna Aktif',    value: 1,                          icon: Users,          color: 'text-orange-600',  bg: 'bg-orange-50'  },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="!p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={16} className={color} />
              </div>
              <TrendingUp size={14} className="text-gray-300" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      {/* Quick actions — Existing modules */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Chat module */}
        <Card className="group hover:border-primary-200 transition-colors cursor-pointer"
              onClick={() => navigate('/chat')}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
              <MessageSquare size={22} className="text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">AI Chat — Konsultasi Lab</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Tanyakan interpretasi parameter laboratorium, nilai rujukan populasi Indonesia, dan panduan LOINC kepada asisten AI IACCLM.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['FHIR-aware', 'LOINC', 'Bahasa Indonesia'].map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full border border-primary-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-primary-500 transition-colors mt-1 shrink-0" />
          </div>
        </Card>

        {/* Interpreter module */}
        <Card className="group hover:border-violet-200 transition-colors cursor-pointer"
              onClick={() => navigate('/interpreter')}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
              <FlaskConical size={22} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">Interpretasi Lab — SATUSEHAT</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Input IHS Number pasien, masukkan hasil laboratorium, dan dapatkan interpretasi AI lengkap dengan resource FHIR siap dikirim ke SATUSEHAT.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['SATUSEHAT', 'DiagnosticReport', 'Observation'].map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full border border-violet-100">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-violet-500 transition-colors mt-1 shrink-0" />
          </div>
        </Card>
      </div>

      {/* Quick actions — New modules */}
      <div>
        <p className="text-[10px] uppercase font-semibold text-gray-400 mb-3 tracking-wider">
          Modul Lanjutan
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              to: '/qc',
              icon: Shield,
              title: 'QC Anomaly Detector',
              desc: 'Deteksi drift, bias, dan prediksi kegagalan QC secara real-time sesuai SNI ISO 15189.',
              color: 'emerald',
              tags: ['Westgard', 'Levey-Jennings', 'Prediktif'],
            },
            {
              to: '/primary-care',
              icon: Stethoscope,
              title: 'Faskes Primer',
              desc: 'Interpretasi hasil lab otomatis dalam bahasa sederhana untuk dokter puskesmas dan klinik.',
              color: 'sky',
              tags: ['Puskesmas', 'Panel Lab', 'Bahasa Pasien'],
            },
            {
              to: '/mentor',
              icon: GraduationCap,
              title: 'Virtual Mentor',
              desc: 'Kuis harian, studi kasus, dan tracking kredit SKP untuk teknisi & analis laboratorium.',
              color: 'amber',
              tags: ['SKP IACCLM', 'Kuis', 'Adaptif'],
            },
            {
              to: '/drug-checker',
              icon: Pill,
              title: 'Drug-Lab Checker',
              desc: 'Periksa interaksi obat terhadap hasil pemeriksaan lab untuk mencegah false result.',
              color: 'rose',
              tags: ['Interferensi', 'GOD-PAP', 'Immunoassay'],
            },
            {
              to: '/reference-ranges',
              icon: BarChart3,
              title: 'Reference Ranges',
              desc: 'Usulan interval rujukan spesifik populasi Indonesia berbasis machine learning.',
              color: 'indigo',
              tags: ['ML', 'Populasi Indonesia', 'Demografis'],
            },
          ].map(({ to, icon: Icon, title, desc, color, tags }) => (
            <Card
              key={to}
              className={`group hover:border-${color}-200 transition-colors cursor-pointer`}
              onClick={() => navigate(to)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${color}-50 border border-${color}-100 flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={`text-${color}-600`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((tag) => (
                      <span key={tag} className={`text-[10px] px-1.5 py-0.5 bg-${color}-50 text-${color}-600 rounded-full border border-${color}-100`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight size={14} className={`text-gray-300 group-hover:text-${color}-500 transition-colors mt-0.5 shrink-0`} />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <Card className="!p-4 bg-gradient-to-r from-primary-50 to-sky-50 border-primary-100">
        <div className="flex items-start gap-3">
          <Activity size={20} className="text-primary-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary-800 mb-1">
              Panduan Penggunaan Platform
            </p>
            <ul className="text-xs text-primary-700 space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                Gunakan <strong>AI Chat</strong> untuk pertanyaan umum seputar interpretasi laboratorium klinis
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                Gunakan <strong>Interpretasi Lab</strong> untuk memproses hasil pasien real dengan integrasi SATUSEHAT FHIR
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                Platform ini hanya memberikan interpretasi — tidak menggantikan diagnosis klinis dokter
              </li>
            </ul>
          </div>
          <Button size="sm" onClick={() => navigate('/chat')} className="shrink-0">
            Mulai Chat
          </Button>
        </div>
      </Card>
    </div>
  )
}

