import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout from './components/Layout/AppLayout'
import LoginPage from './pages/LoginPage'
import CalendarPage from './pages/CalendarPage'
import ReservationsPage from './pages/ReservationsPage'
import DashboardPage from './pages/DashboardPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/admin/UsersPage'
import RoomsPage from './pages/admin/RoomsPage'
import ConfigPage from './pages/admin/ConfigPage'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50">
      <div className="text-center">
        <img src="/images/logo_cacsb2.png" alt="" className="h-14 mx-auto mb-4 animate-pulse" />
        <p className="text-primary-600 font-medium">Cargando...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <AppLayout />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<CalendarPage />} />
          <Route path="/reservaciones" element={<ReservationsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reportes" element={<ReportsPage />} />
          <Route path="/admin/usuarios" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="/admin/salas" element={<AdminRoute><RoomsPage /></AdminRoute>} />
          <Route path="/admin/configuracion" element={<AdminRoute><ConfigPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
