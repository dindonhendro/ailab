import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Interpreter from './pages/Interpreter'
import QcDetector from './pages/QcDetector'
import PrimaryCareInterpreter from './pages/PrimaryCareInterpreter'
import VirtualMentor from './pages/VirtualMentor'
import DrugLabChecker from './pages/DrugLabChecker'
import ReferenceRanges from './pages/ReferenceRanges'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Memuat aplikasi…</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="interpreter" element={<Interpreter />} />
          <Route path="qc" element={<QcDetector />} />
          <Route path="primary-care" element={<PrimaryCareInterpreter />} />
          <Route path="mentor" element={<VirtualMentor />} />
          <Route path="drug-checker" element={<DrugLabChecker />} />
          <Route path="reference-ranges" element={<ReferenceRanges />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

