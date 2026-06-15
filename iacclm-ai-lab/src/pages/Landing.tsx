import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Dna,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  Heart,
  Menu,
  Pill,
  Shield,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react'
import Button from '../components/ui/Button'
import { Card, Badge } from '../components/ui/ui'

export default function Landing() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'qc' | 'primary' | 'drug'>('qc')

  const features = [
    {
      icon: Bot,
      title: 'AI Chat & FHIR LOINC Guidance',
      desc: 'Konsultasi klinis interaktif, penjelasan kode LOINC/FHIR, dan pembuatan draft DiagnosticReport otomatis.',
      color: 'blue',
    },
    {
      icon: Shield,
      title: 'QC Anomaly Detector',
      desc: 'Menganalisis data QC harian secara real-time untuk mendeteksi drift, bias, dan memprediksi kegagalan kontrol mutu (ISO 15189).',
      color: 'emerald',
    },
    {
      icon: Stethoscope,
      title: 'Interpreter Faskes Primer',
      desc: 'Penerjemah hasil panel laboratorium otomatis menjadi narasi yang mudah dipahami oleh dokter umum maupun pasien.',
      color: 'sky',
    },
    {
      icon: GraduationCap,
      title: 'Virtual Mentor & SKP',
      desc: 'Modul belajar adaptif bagi teknisi laboratorium berupa kuis harian, studi kasus, dan integrasi akumulasi kredit SKP IACCLM.',
      color: 'amber',
    },
    {
      icon: Pill,
      title: 'Drug-Lab Interaction Checker',
      desc: 'Deteksi interferensi kimia/biologis obat-obatan (seperti Vitamin C atau Biotin) terhadap hasil pemeriksaan analitik lab.',
      color: 'rose',
    },
    {
      icon: BarChart3,
      title: 'Predictive Reference Range',
      desc: 'Machine learning untuk menganalisis data populasi anonim dan mengusulkan batas rujukan nasional spesifik populasi Indonesia.',
      color: 'indigo',
    },
  ]

  const steps = [
    { num: '01', title: 'Verifikasi IHS Pasien', desc: 'Sistem mencocokkan IHS Number dengan basis data Master Patient Index (MPI) SATUSEHAT.' },
    { num: '02', title: 'Input Hasil Pemeriksaan', desc: 'Dokter memasukkan nilai analitik lab yang dipetakan otomatis ke kode LOINC standar nasional.' },
    { num: '03', title: 'Analisis AI & Pemetaan FHIR', desc: 'AI mendeteksi anomali, melakukan interpretasi klinis, dan menyusun data ke format FHIR R4.' },
    { num: '04', title: 'Kirim ke SATUSEHAT', desc: 'Setelah ditinjau dokter, dokumen DiagnosticReport dikirim langsung ke server SATUSEHAT Kemenkes.' },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-primary-100 selection:text-primary-800">
      
      {/* ─── NAVBAR ─── */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shadow-md shadow-primary-500/10">
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900 tracking-tight text-base leading-none block">IACCLM AI Lab</span>
              <span className="text-[10px] text-gray-400 font-medium leading-none block mt-0.5">SATUSEHAT Integrated</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#fitur" className="hover:text-primary-600 transition-colors">Fitur Utama</a>
            <a href="#demo" className="hover:text-primary-600 transition-colors">Simulasi</a>
            <a href="#satusehat" className="hover:text-primary-600 transition-colors">Integrasi FHIR</a>
            <a href="#skp" className="hover:text-primary-600 transition-colors">Edukasi & SKP</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Masuk
            </Button>
            <Button size="sm" onClick={() => navigate('/login')} className="shadow-lg shadow-primary-600/10">
              Mulai Sekarang
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-gray-100 bg-white px-4 py-4 space-y-3 shadow-lg">
            <a href="#fitur" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-600">Fitur Utama</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-600">Simulasi</a>
            <a href="#satusehat" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-600">Integrasi FHIR</a>
            <a href="#skp" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm font-medium text-gray-700 hover:text-primary-600">Edukasi & SKP</a>
            <hr className="border-gray-100 my-2" />
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/login')}>
                Masuk
              </Button>
              <Button className="flex-1" onClick={() => navigate('/login')}>
                Daftar
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pb-24 lg:pt-16 bg-gradient-to-br from-white via-sky-50/25 to-primary-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <Badge variant="info" className="px-3 py-1 text-xs gap-1.5 font-semibold bg-primary-50 border-primary-200 text-primary-700 mx-auto lg:mx-0">
                <Sparkles size={12} className="animate-pulse" />
                Kolaborasi IACCLM × SATUSEHAT KEMENKES RI
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight leading-none">
                Platform AI Pintar untuk <span className="text-primary-600">Laboratorium Klinik</span> Indonesia
              </h1>
              <p className="text-base sm:text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Optimalkan mutu kontrol kualitas (QC), sederhanakan interpretasi hasil lab untuk faskes primer, dan kelola pertukaran data medis berbasis standar nasional FHIR R4 & LOINC secara presisi.
              </p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 pt-2">
                <Button size="lg" onClick={() => navigate('/login')} className="shadow-xl shadow-primary-600/25 flex items-center gap-2">
                  Mulai Gunakan AI Lab
                  <ArrowRight size={16} />
                </Button>
              </div>
              <div className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3 text-xs text-gray-400 font-medium pt-4 border-t border-gray-100/80">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> SNI ISO 15189 (Aturan Westgard)</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> Standar FHIR & LOINC Kemenkes</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> Terintegrasi Akreditasi SKP</span>
              </div>
            </div>

            {/* Right Dashboard Mockup Visual */}
            <div className="lg:col-span-5 relative mt-6 lg:mt-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-sky-400 to-indigo-400 rounded-3xl blur-3xl opacity-20 -z-10" />
              <Card padding="none" className="border-gray-200/80 shadow-2xl relative bg-white overflow-hidden select-none">
                
                {/* Mock Window Top bar */}
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 bg-white border border-gray-100 rounded px-2 py-0.5">
                    app.iacclm-ailab.id
                  </span>
                  <Badge variant="normal" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-100">
                    Online
                  </Badge>
                </div>

                {/* Mock UI Contents */}
                <div className="p-4 space-y-4">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Total Verifikasi MPI</p>
                      <p className="text-lg font-bold text-gray-800">12.482</p>
                    </div>
                    <div className="bg-primary-50/50 border border-primary-100 rounded-xl p-3">
                      <p className="text-[10px] text-primary-500 font-semibold uppercase tracking-wider mb-0.5">Usulan Rujukan ML</p>
                      <p className="text-lg font-bold text-primary-700">7 Parameter</p>
                    </div>
                  </div>

                  {/* Levey-Jennings preview widget */}
                  <div className="border border-gray-150 rounded-xl p-3 space-y-2 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                        <Shield size={12} className="text-emerald-500" />
                        Westgard Monitor — Glukosa
                      </span>
                      <span className="text-[10px] text-amber-600 font-semibold px-2 py-0.5 bg-amber-50 rounded border border-amber-100">
                        Warning: 2₂s Trend
                      </span>
                    </div>
                    
                    {/* Simulated SVG Graph */}
                    <div className="h-20 bg-gray-50 rounded-lg flex items-center justify-center relative border border-dashed border-gray-200">
                      <svg viewBox="0 0 200 60" className="w-full h-full opacity-80">
                        {/* Mean and SD lines */}
                        <line x1="10" y1="30" x2="190" y2="30" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="2,2" />
                        <line x1="10" y1="15" x2="190" y2="15" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1,1" />
                        <line x1="10" y1="45" x2="190" y2="45" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="1,1" />
                        {/* Data path */}
                        <path d="M 10 32 L 35 28 L 60 25 L 85 41 L 110 44 L 135 12 L 160 14 L 185 27" fill="none" stroke="#64748b" strokeWidth="1" />
                        {/* Dots */}
                        <circle cx="10" cy="32" r="2" fill="#22c55e" />
                        <circle cx="35" cy="28" r="2" fill="#22c55e" />
                        <circle cx="60" cy="25" r="2" fill="#22c55e" />
                        <circle cx="85" cy="41" r="2" fill="#eab308" />
                        <circle cx="110" cy="44" r="2" fill="#eab308" />
                        <circle cx="135" cy="12" r="2" fill="#ef4444" />
                        <circle cx="160" cy="14" r="2" fill="#ef4444" />
                        <circle cx="185" cy="27" r="2" fill="#22c55e" />
                      </svg>
                      <span className="absolute left-2 top-1 text-[8px] text-gray-400 font-mono">+2SD</span>
                      <span className="absolute left-2 bottom-1 text-[8px] text-gray-400 font-mono">-2SD</span>
                    </div>
                  </div>

                  {/* AI Diagnosis preview widget */}
                  <div className="border border-gray-150 rounded-xl p-3 space-y-2 bg-gradient-to-br from-primary-50/30 to-sky-50/30">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-700">
                      <Stethoscope size={13} />
                      Interpretasi AI Faskes Primer
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed italic">
                      "Hasil HbA1c (7.8%) dan Glukosa Puasa (142 mg/dL) mengindikasikan hiperglikemia persisten yang konsisten dengan Diabetes Mellitus Tipe 2..."
                    </p>
                  </div>
                </div>

              </Card>
            </div>
            
          </div>
        </div>
      </section>

      {/* ─── LOGO CLOUD ─── */}
      <section className="bg-white py-8 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">
            Dirancang Sesuai Standar dan Regulasi Kesehatan
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16 mt-6 opacity-60 grayscale hover:grayscale-0 transition duration-300">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-gray-600">IACCLM</span>
            <span className="font-semibold text-sm sm:text-base tracking-tight text-gray-600 flex items-center gap-1">
              <Dna size={16} className="text-primary-600" />
              SATUSEHAT
            </span>
            <span className="font-bold text-sm sm:text-base text-gray-600">KEMENKES RI</span>
            <span className="font-semibold text-sm sm:text-base text-gray-600">LOINC STANDARDS</span>
            <span className="font-medium text-sm sm:text-base text-gray-600">SNI ISO 15189</span>
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section id="fitur" className="py-20 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <Badge variant="normal" className="bg-primary-50 text-primary-700 border-primary-100 font-semibold">
              Fitur Lengkap
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              6 Modul Laboratorium Utama Berbasis Kecerdasan Buatan
            </h2>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Mulai dari kepatuhan akreditasi laboratorium hingga deteksi potensi interferensi biokimia obat secara otomatis dalam satu dashboard terintegrasi.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => {
              const Icon = feat.icon
              return (
                <Card key={idx} className="group hover:shadow-xl hover:border-primary-100 transition-all duration-300 bg-white">
                  <div className="space-y-4">
                    <div className={`w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:scale-105 transition-transform`}>
                      <Icon size={20} className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base mb-1">{feat.title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{feat.desc}</p>
                    </div>
                    <div className="pt-2 flex items-center text-xs font-semibold text-primary-600 group-hover:text-primary-700 transition-colors cursor-pointer" onClick={() => navigate('/login')}>
                      Coba Modul
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

        </div>
      </section>

      {/* ─── INTERACTIVE SIMULATION PREVIEW ─── */}
      <section id="demo" className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column Description */}
            <div className="lg:col-span-5 space-y-6">
              <Badge variant="normal" className="bg-primary-50 text-primary-700 border-primary-100 font-semibold">
                Simulasi UI Interaktif
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Coba Antarmuka Pintar Modul Kami Langsung
              </h2>
              <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                Platform didesain minimalis, modern, dan sangat responsif untuk menunjang aktivitas dokter spesialis patologi klinik, analis lab, dan apoteker.
              </p>

              {/* Tabs list */}
              <div className="space-y-3 pt-2">
                {[
                  { key: 'qc', title: 'Westgard Rule Anomaly Detector', desc: 'Uji visualisasi chart Levey-Jennings dan peringatan anomali.' },
                  { key: 'primary', title: 'Automated Primary Care Interpreter', desc: 'Draf interpretasi otomatis bahasa sederhana bagi faskes primer.' },
                  { key: 'drug', title: 'Drug-Lab Interaction Checker', desc: 'Cek interferensi bahan aktif obat terhadap pembacaan reagen.' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                      activeTab === tab.key
                        ? 'border-primary-200 bg-primary-50/45 shadow-xs'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${activeTab === tab.key ? 'bg-primary-600' : 'bg-gray-300'}`} />
                    <div>
                      <p className={`text-xs font-semibold ${activeTab === tab.key ? 'text-primary-800' : 'text-gray-700'}`}>{tab.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{tab.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column Interactive Card */}
            <div className="lg:col-span-7">
              <Card padding="none" className="border-gray-200 shadow-xl overflow-hidden bg-gray-50/50">
                <div className="bg-white border-b border-gray-150 p-4">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                    {activeTab === 'qc' && 'Mutu Kontrol Kualitas (QC Anomaly)'}
                    {activeTab === 'primary' && 'Hasil Interpretasi Faskes Primer'}
                    {activeTab === 'drug' && 'Pemeriksaan Interferensi Obat-Lab'}
                  </span>
                </div>
                
                {/* Content Panel */}
                <div className="p-5">
                  {activeTab === 'qc' && (
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <span className="font-semibold text-gray-700">Jenis Pemeriksaan: Glukosa (mg/dL)</span>
                        <Badge variant="critical">Outlier Detected (Hari 25)</Badge>
                      </div>
                      
                      <div className="p-3 bg-red-50/45 border border-red-100 rounded-lg text-xs leading-relaxed text-red-800 space-y-1">
                        <p className="font-bold flex items-center gap-1"><Shield size={12} /> Pelanggaran Aturan 1₃s</p>
                        <p className="text-red-700">Hari ke-25 menunjukkan nilai kontrol melebihi batas ±3SD (116.0 mg/dL). Kemungkinan error acak tinggi.</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                          <span>Mean: 100 mg/dL</span>
                          <span>SD: 5 mg/dL</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                          <span className="w-[10%] bg-blue-400/70" />
                          <span className="w-[15%] bg-yellow-400/70" />
                          <span className="w-[50%] bg-green-500/70" />
                          <span className="w-[15%] bg-yellow-400/70" />
                          <span className="w-[10%] bg-red-500" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'primary' && (
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs border-b border-gray-100 pb-2">
                        <span className="font-semibold text-gray-700">Kategori: Panel Diabetes (HbA1c & Glukosa)</span>
                        <Badge variant="high">Waspada / Tinggi</Badge>
                      </div>

                      <div className="space-y-3 text-xs leading-relaxed">
                        <div>
                          <p className="font-bold text-gray-800 mb-0.5">Ringkasan Medis (Bagi Dokter Puskesmas):</p>
                          <p className="text-gray-600">Terjadi peningkatan glikemia persisten. HbA1c 7.8% mengindikasikan regulasi metabolik sub-optimal dalam 90 hari terakhir. Diperlukan penyesuaian OAD (Obat Anti-Diabetes).</p>
                        </div>
                        <div className="p-3 bg-gradient-to-r from-sky-50 to-blue-50/50 rounded-lg border border-blue-100">
                          <p className="font-bold text-blue-900 mb-0.5">Penjelasan Sederhana (Bagi Pasien):</p>
                          <p className="text-blue-800 italic">"Bapak/Ibu, pemeriksaan menunjukkan bahwa kadar gula rata-rata dalam 3 bulan terakhir masih cukup tinggi. Dokter akan meresepkan kombinasi obat yang disesuaikan serta menyarankan pengurangan porsi nasi dan makanan manis."</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'drug' && (
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-gray-200">
                      <div className="grid grid-cols-2 gap-2 text-xs border-b border-gray-100 pb-2.5">
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Obat / Suplemen</p>
                          <p className="font-bold text-rose-600 flex items-center gap-1 mt-0.5"><Pill size={12} /> Vitamin C (Dosis Tinggi)</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Pemeriksaan Lab</p>
                          <p className="font-bold text-gray-800 flex items-center gap-1 mt-0.5"><FlaskConical size={12} /> Glukosa (GOD-PAP)</p>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs leading-relaxed">
                        <div className="p-3 bg-red-50 border border-red-150 rounded-lg text-red-800">
                          <p className="font-bold flex items-center gap-1"><X size={14} /> Interferensi Kimia: Signifikan (False Low)</p>
                          <p className="text-red-700 mt-1">Asam askorbat bertindak sebagai reduktor kuat yang berkompetisi dengan hidrogen peroksida pada reaksi enzimatik metode GOD-PAP. Hal ini memicu pembacaan gula darah lebih rendah secara palsu.</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 mb-0.5">Rekomendasi Tindakan:</p>
                          <p className="text-gray-600">Tunda pengambilan sampel darah minimal 24 jam setelah konsumsi Vitamin C dosis tinggi, atau gunakan metode pembacaan alternatif seperti Heksokinase.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white border-t border-gray-150 p-4 flex justify-end">
                  <Button size="sm" onClick={() => navigate('/login')} className="text-xs">
                    Masuk Ke Dashboard Aplikasi
                  </Button>
                </div>

              </Card>
            </div>

          </div>
        </div>
      </section>

      {/* ─── SATUSEHAT INTEGRATION WORKFLOW ─── */}
      <section id="satusehat" className="py-20 bg-gray-50/50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <Badge variant="normal" className="bg-primary-50 text-primary-700 border-primary-100 font-semibold">
              Konektivitas Platform
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Aliran Data Integrasi Ekosistem SATUSEHAT Kemenkes
            </h2>
            <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
              Bagaimana data dialirkan dengan aman dari komputer laboratorium Anda, dianalisis AI, dipetakan ke format FHIR R4, hingga terkirim secara langsung ke sistem data nasional.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {steps.map((step, idx) => (
              <Card key={idx} className="bg-white border-gray-200/70 relative shadow-sm group">
                <span className="absolute right-4 top-2 text-3xl font-extrabold text-gray-100 group-hover:text-primary-100 transition-colors">
                  {step.num}
                </span>
                <div className="space-y-2 pt-4">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{step.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* ─── EDUCATION & ACCREDITATION (SKP) ─── */}
      <section id="skp" className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Image Mockup (Skills tracker & SKP logs) */}
            <div className="lg:col-span-5 relative order-last lg:order-first">
              <Card padding="none" className="border-gray-200/80 shadow-2xl relative bg-white overflow-hidden select-none">
                <div className="bg-gray-50 border-b border-gray-100 p-4">
                  <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-violet-500" />
                    Buku Kredit Kompetensi (SKP)
                  </h3>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Competency indicators */}
                  <div className="space-y-3">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Topik Keahlian Analis</p>
                    <div className="space-y-2">
                      {[
                        { name: 'Kontrol Mutu & Kalibrasi', val: '88%', color: 'bg-emerald-500' },
                        { name: 'Validasi Metode Fotometri', val: '72%', color: 'bg-primary-500' },
                        { name: 'Interferensi Immunoassay', val: '50%', color: 'bg-rose-500' },
                      ].map((item, i) => (
                        <div key={i} className="text-xs">
                          <div className="flex justify-between font-medium mb-1">
                            <span className="text-gray-700">{item.name}</span>
                            <span className="text-gray-900 font-bold">{item.val}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: item.val }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Log SKP table */}
                  <div className="border border-gray-150 rounded-xl p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Riwayat Kredit Terakhir</span>
                      <span className="text-xs font-bold text-primary-700">Total: 4.5 SKP</span>
                    </div>
                    <div className="space-y-2 text-[11px] leading-relaxed">
                      <div className="flex justify-between border-b border-gray-50 pb-1.5">
                        <span className="text-gray-700 font-medium">Validasi Metode Fotometri</span>
                        <span className="text-primary-700 font-bold">1.0 SKP</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-50 pb-1.5">
                        <span className="text-gray-700 font-medium">QC Westgard Lanjutan</span>
                        <span className="text-primary-700 font-bold">1.5 SKP</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700 font-medium">Immunoassay & Interferensi</span>
                        <span className="text-primary-700 font-bold">1.0 SKP</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Text Description */}
            <div className="lg:col-span-7 space-y-6">
              <Badge variant="normal" className="bg-primary-50 text-primary-700 border-primary-100 font-semibold">
                Edukasi Berkelanjutan
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Tingkatkan Kompetensi Laboratorium dengan Virtual Mentor
              </h2>
              <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
                Studi kasus adaptif dan kuis harian dirancang khusus untuk analis, asisten analis, dan teknisi laboratorium guna memperdalam pemahaman metode klinis baru serta pemecahan masalah (*troubleshooting*) analitik.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">Kuis Studi Kasus Adaptif</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Soal dinamis yang menyesuaikan tingkat pemahaman materi biokimia dan instrumen lab Anda.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">Sertifikasi & SKP IACCLM</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Setiap modul edukasi yang diselesaikan berhak mendapatkan poin SKP langsung untuk perpanjangan izin profesi.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── CALL TO ACTION BANNER ─── */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6 relative z-10">
          <Badge variant="normal" className="bg-white/10 text-white border-white/20 font-semibold mx-auto">
            Mulai Secara Gratis
          </Badge>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
            Hubungkan Laboratorium Anda dengan AI Asisten Terakreditasi
          </h2>
          <p className="text-sm sm:text-base text-primary-200 leading-relaxed max-w-2xl mx-auto">
            Daftarkan akun faskes Anda sekarang, isi skenario simulasi, dan nikmati kemudahan tatalaksana data analitik laboratorium terintegrasi.
          </p>
          <div className="pt-4 flex justify-center">
            <Button size="lg" onClick={() => navigate('/login')} className="bg-white text-primary-900 hover:bg-gray-100 shadow-xl shadow-black/20 font-semibold flex items-center gap-2">
              Daftar / Masuk Akun Anda
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Col 1 */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                  <Activity size={16} className="text-white" />
                </div>
                <span className="font-bold text-white tracking-tight">IACCLM AI Lab</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-500">
                Teknologi kecerdasan buatan patologi klinik terintegrasi dengan ekosistem data kesehatan nasional SATUSEHAT Kementerian Kesehatan RI.
              </p>
            </div>

            {/* Col 2 */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Modul Pendukung</h4>
              <ul className="text-xs space-y-2">
                <li><a href="#fitur" className="hover:text-white transition-colors">QC Detector</a></li>
                <li><a href="#fitur" className="hover:text-white transition-colors">Faskes Primer Interpreter</a></li>
                <li><a href="#fitur" className="hover:text-white transition-colors">Virtual Mentor</a></li>
                <li><a href="#fitur" className="hover:text-white transition-colors">Drug-Lab Interaction</a></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Dokumentasi Medis</h4>
              <ul className="text-xs space-y-2">
                <li><a href="#satusehat" className="hover:text-white transition-colors">Integrasi FHIR R4</a></li>
                <li><a href="#satusehat" className="hover:text-white transition-colors">Standar Koding LOINC</a></li>
                <li><a href="#satusehat" className="hover:text-white transition-colors">Master Patient Index (MPI)</a></li>
                <li><a href="https://github.com/dindonhendro/ailab" target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">Repositori GitHub <ExternalLink size={10} /></a></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Hubungi Kami</h4>
              <p className="text-xs leading-relaxed text-gray-500">
                Komite Evaluasi & Akreditasi Pengurus Pusat IACCLM (Perhimpunan Dokter Spesialis Patologi Klinik dan Kedokteran Laboratorium Indonesia).
              </p>
              <p className="text-xs text-gray-400">Email: info@iacclm.or.id</p>
            </div>

          </div>

          <hr className="border-gray-800 my-8" />

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
            <p>© 2026 IACCLM (Indonesian Association for Clinical Chemistry and Laboratory Medicine). Seluruh Hak Cipta Dilindungi.</p>
            <p>Terintegrasi dengan Platform SATUSEHAT Kemenkes RI v1.0.0</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
