import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

type Mode = 'login' | 'register'

export default function Login() {
  const { signIn, signUp, user, loading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  useEffect(() => {
    clearError()
    setLocalError('')
  }, [mode, clearError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')
    setSubmitting(true)

    if (mode === 'login') {
      const { error: err } = await signIn(email, password)
      if (err) setLocalError(err)
      else navigate('/', { replace: true })
    } else {
      if (!fullName.trim()) { setLocalError('Nama lengkap wajib diisi.'); setSubmitting(false); return }
      const { error: err } = await signUp(email, password, fullName)
      if (err) setLocalError(err)
      else navigate('/', { replace: true })
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-800 to-primary-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">IACCLM AI Lab</h1>
          <p className="text-primary-200 text-sm mt-1 text-center max-w-xs">
            Asisten AI Laboratorium Klinik Terintegrasi SATUSEHAT
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === m
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Nama Lengkap"
                placeholder="dr. Budi Santoso"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}

            <Input
              label="Email"
              type="email"
              placeholder="dokter@rumahsakit.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={15} />}
              required
              autoComplete="email"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Kata Sandi</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                  <Lock size={15} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full rounded-lg border border-gray-300 text-sm px-3 py-2 pl-9 pr-10
                             focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {(localError || error) && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-xs text-red-600">{localError || error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              loading={submitting}
            >
              {mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </Button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-5">
            Platform ini dikelola oleh{' '}
            <span className="font-semibold text-primary-600">IACCLM</span> dan terintegrasi
            dengan sistem SATUSEHAT Kemenkes RI.
          </p>
        </div>
      </div>
    </div>
  )
}
