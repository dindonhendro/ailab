import { Bell, ChevronDown, LogOut, User, Menu } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface NavbarProps {
  onMenuClick: () => void
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, signOut } = useAuthStore()
  const [open, setOpen] = useState(false)

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-5 shrink-0 z-10">
      {/* Left: Hamburger menu + breadcrumb / brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors md:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={20} className="text-gray-600" />
        </button>

        <span className="text-sm font-semibold text-primary-700">
          IACCLM AI Lab
        </span>
        <span className="text-gray-300 hidden sm:block">|</span>
        <span className="text-xs text-gray-400 hidden sm:block">
          Terintegrasi SATUSEHAT Kemenkes RI
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={18} className="text-gray-500" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
              <User size={14} className="text-primary-700" />
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block max-w-[140px] truncate">
              {user?.full_name ?? user?.email ?? 'Pengguna'}
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {user?.full_name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
