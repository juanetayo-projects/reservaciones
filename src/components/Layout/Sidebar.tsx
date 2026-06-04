import { NavLink } from 'react-router-dom'
import {
  CalendarDays, ClipboardList, LayoutDashboard,
  FileBarChart2, Users, Building2, LogOut, Settings,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { to: '/', icon: CalendarDays, label: 'Calendario' },
  { to: '/reservaciones', icon: ClipboardList, label: 'Reservaciones' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reportes', icon: FileBarChart2, label: 'Reportes' },
]

const adminItems = [
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { to: '/admin/salas', icon: Building2, label: 'Salas / Sedes' },
  { to: '/admin/configuracion', icon: Settings, label: 'Configuración' },
]

export default function Sidebar() {
  const { signOut, isAdmin, profile } = useAuth()

  return (
    <aside className="w-64 min-h-screen bg-primary-800 text-white flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-primary-700 flex flex-col items-center gap-2">
        <img src="/images/logo_cacsb_blanc.png" alt="Clínica Santa Bárbara" className="h-12 object-contain" />
        <span className="text-xs text-primary-200 font-medium tracking-wide">AGENDA DE SALAS</span>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-primary-700 bg-primary-900/30">
        <p className="text-sm font-semibold truncate">{profile?.nombres ?? 'Usuario'}</p>
        <p className="text-xs text-primary-300">{isAdmin ? 'Administrador' : 'Analista'}</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">Administración</span>
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-primary-200 hover:bg-primary-700 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-primary-700">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-200 hover:bg-primary-700 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
