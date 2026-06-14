import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  MessageSquare,
  FlaskConical,
  Activity,
  FileText,
  Settings,
  Shield,
  Stethoscope,
  GraduationCap,
  Pill,
  BarChart3,
} from 'lucide-react'
import clsx from 'clsx'

const nav = [
  { to: '/',                icon: LayoutDashboard,  label: 'Dashboard'         },
  { to: '/chat',            icon: MessageSquare,    label: 'AI Chat'           },
  { to: '/interpreter',     icon: FlaskConical,     label: 'Interpretasi Lab'  },
  { to: '/qc',              icon: Shield,           label: 'QC Detector'       },
  { to: '/primary-care',    icon: Stethoscope,      label: 'Faskes Primer'     },
  { to: '/mentor',          icon: GraduationCap,    label: 'Virtual Mentor'    },
  { to: '/drug-checker',    icon: Pill,             label: 'Drug-Lab Checker'  },
  { to: '/reference-ranges',icon: BarChart3,        label: 'Reference Ranges'  },
]

const bottom = [
  { to: '/riwayat',    icon: FileText,  label: 'Riwayat'   },
  { to: '/settings',   icon: Settings,  label: 'Pengaturan' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-hidden">
      {/* Logo / Brand */}
      <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
          <Activity size={16} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-800 leading-none">IACCLM</p>
          <p className="text-[10px] text-gray-400 leading-tight mt-0.5">AI Lab Assistant</p>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto min-h-0">
        <p className="text-[10px] uppercase font-semibold text-gray-400 px-2 mb-2 tracking-wider">
          Modul
        </p>
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={clsx(isActive ? 'text-primary-600' : 'text-gray-400')}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom links */}
      <div className="border-t border-gray-100 py-3 px-3 space-y-0.5">
        {bottom.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={clsx(isActive ? 'text-primary-600' : 'text-gray-400')} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Footer badge */}
      <div className="px-4 pb-4 pt-2">
        <div className="rounded-lg bg-primary-50 border border-primary-100 px-3 py-2">
          <p className="text-[10px] font-semibold text-primary-700">SATUSEHAT</p>
          <p className="text-[10px] text-primary-500 mt-0.5">Kementerian Kesehatan RI</p>
        </div>
      </div>
    </aside>
  )
}

