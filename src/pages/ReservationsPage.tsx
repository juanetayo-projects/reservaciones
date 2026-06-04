import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ReservacionCompleta, ReservationStatus } from '../types/database'
import ReservationCard from '../components/Reservations/ReservationCard'
import ActionModal from '../components/Reservations/ActionModal'
import { sendReservationEmail } from '../lib/email'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { Search, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUSES: { value: string; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aceptada', label: 'Aceptadas' },
  { value: 'rechazada', label: 'Rechazadas' },
  { value: 'cancelada', label: 'Canceladas' },
  { value: 'reprogramada', label: 'Reprogramadas' },
]

const statusClass: Record<string, string> = {
  pendiente: 'badge-pending',
  aceptada: 'badge-accepted',
  rechazada: 'badge-rejected',
  cancelada: 'badge-cancelled',
  reprogramada: 'badge-rescheduled',
}

export default function ReservationsPage() {
  const { user, isAdmin } = useAuth()
  const [rows, setRows] = useState<ReservacionCompleta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<ReservacionCompleta | null>(null)
  const [action, setAction] = useState<'accept' | 'reject' | 'cancel' | 'reschedule' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('reservaciones')
      .select(`
        id, asunto, descripcion, fecha_evento, hora_inicio, hora_fin,
        estado, observaciones, fecha_solicitud,
        sala:salas(id, nombre, ubicacion, capacidad, sede:sedes(nombre)),
        solicitante:usuarios!reservaciones_solicitante_id_fkey(
          id, nombres, email, telefono, identificacion,
          servicio:servicios(nombre)
        ),
        invitados(id, email)
      `)
      .order('fecha_evento', { ascending: false })

    if (statusFilter) q = q.eq('estado', statusFilter)

    const { data } = await q
    setRows((data as any) ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const filtered = rows.filter(r =>
    !search ||
    r.asunto.toLowerCase().includes(search.toLowerCase()) ||
    r.solicitante.nombres.toLowerCase().includes(search.toLowerCase()) ||
    r.solicitante.identificacion.includes(search)
  )

  async function executeAction(data: { observacion?: string; fecha?: string; horaInicio?: string; horaFin?: string }) {
    if (!selected || !action) return
    const updates: Record<string, string> = { observaciones: data.observacion ?? '' }
    let newStatus = ''

    if (action === 'accept')     { newStatus = 'aceptada'; updates.estado = 'aceptada' }
    if (action === 'reject')     { newStatus = 'rechazada'; updates.estado = 'rechazada' }
    if (action === 'cancel')     { newStatus = 'cancelada'; updates.estado = 'cancelada' }
    if (action === 'reschedule') {
      newStatus = 'reprogramada'; updates.estado = 'reprogramada'
      if (data.fecha)      updates.fecha_evento = data.fecha
      if (data.horaInicio) updates.hora_inicio  = data.horaInicio
      if (data.horaFin)    updates.hora_fin     = data.horaFin
    }

    await supabase.from('reservaciones').update(updates).eq('id', selected.id)
    await supabase.from('historial_estados').insert({
      reservacion_id: selected.id,
      estado_anterior: selected.estado,
      estado_nuevo: newStatus as ReservationStatus,
      observacion: data.observacion,
      usuario_id: user?.id,
    })

    if (['aceptada', 'rechazada', 'reprogramada'].includes(newStatus)) {
      try {
        const emailType = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'rescheduled'
        const recipients = [selected.solicitante.email]
        if (newStatus === 'aceptada') recipients.push(...selected.invitados.map(i => i.email))
        await sendReservationEmail({ type: emailType, to: recipients, reservationData: { ...selected, ...updates } })
      } catch { /* non-blocking */ }
    }

    toast.success('Reservación actualizada')
    setAction(null)
    setSelected(null)
    load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">Reservaciones</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} registro(s)</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por asunto, solicitante o ID..."
              className="form-input pl-9 w-72"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter size={15} className="text-gray-400" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm outline-none bg-transparent">
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-primary-500">Cargando...</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-primary-50 text-primary-700">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Sala</th>
                  <th className="text-left px-4 py-3 font-semibold">Asunto</th>
                  <th className="text-left px-4 py-3 font-semibold">Solicitante</th>
                  <th className="text-left px-4 py-3 font-semibold">Fecha Evento</th>
                  <th className="text-left px-4 py-3 font-semibold">Horario</th>
                  <th className="text-left px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700">{r.sala.nombre}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.asunto}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-700">{r.solicitante.nombres}</div>
                      <div className="text-xs text-gray-400">{r.solicitante.identificacion}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {format(new Date(r.fecha_evento + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{r.hora_inicio} – {r.hora_fin}</td>
                    <td className="px-4 py-3">
                      <span className={statusClass[r.estado]}>{r.estado}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(r)}
                        className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      No se encontraron reservaciones
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && !action && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ReservationCard
            reservacion={selected}
            onAccept={() => setAction('accept')}
            onReject={() => setAction('reject')}
            onReschedule={() => setAction('reschedule')}
            onCancel={() => setAction('cancel')}
            onClose={() => setSelected(null)}
          />
        </div>
      )}

      {action === 'accept' && (
        <ActionModal title="Aceptar reservación" observationLabel="Observación (opcional)"
          onConfirm={executeAction} onClose={() => setAction(null)}
          confirmLabel="Aceptar" confirmClass="btn-success" />
      )}
      {action === 'reject' && (
        <ActionModal title="Rechazar reservación" requireObservation observationLabel="Motivo del rechazo *"
          onConfirm={executeAction} onClose={() => setAction(null)}
          confirmLabel="Rechazar" confirmClass="btn-danger" />
      )}
      {action === 'cancel' && (
        <ActionModal title="Cancelar reservación" requireObservation observationLabel="Motivo de cancelación *"
          onConfirm={executeAction} onClose={() => setAction(null)}
          confirmLabel="Cancelar reservación" confirmClass="btn-danger" />
      )}
      {action === 'reschedule' && (
        <ActionModal title="Reprogramar" requireReschedule requireObservation observationLabel="Motivo *"
          onConfirm={executeAction} onClose={() => setAction(null)}
          confirmLabel="Reprogramar" confirmClass="btn-primary" />
      )}
    </div>
  )
}
