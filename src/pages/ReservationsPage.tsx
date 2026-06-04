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

const statusClass: Record<string, string> = {
  pendiente: 'badge-pending', aceptada: 'badge-accepted',
  rechazada: 'badge-rejected', cancelada: 'badge-cancelled', reprogramada: 'badge-rescheduled',
}

export default function ReservationsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ReservacionCompleta[]>([])
  const [loading, setLoading] = useState(true)
  const [salas, setSalas]       = useState<{ id: number; nombre: string }[]>([])
  const [servicios, setServicios] = useState<{ id: number; nombre: string }[]>([])
  const [selected, setSelected] = useState<ReservacionCompleta | null>(null)
  const [action, setAction] = useState<'accept' | 'reject' | 'cancel' | 'reschedule' | null>(null)

  const [filters, setFilters] = useState({
    search: '', sala_id: '', servicio_id: '', estado: '', desde: '', hasta: '',
  })

  useEffect(() => {
    supabase.from('salas').select('id, nombre').eq('activa', true).then(({ data }) => setSalas(data ?? []))
    supabase.from('servicios').select('id, nombre').order('nombre').then(({ data }) => setServicios(data ?? []))
    load()
  }, [])

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

    if (filters.sala_id)  q = q.eq('sala_id', filters.sala_id)
    if (filters.estado)   q = q.eq('estado', filters.estado)
    if (filters.desde)    q = q.gte('fecha_evento', filters.desde)
    if (filters.hasta)    q = q.lte('fecha_evento', filters.hasta)

    const { data } = await q
    let result = (data as any[]) ?? []

    if (filters.search) {
      const s = filters.search.toLowerCase()
      result = result.filter((r: any) =>
        r.asunto?.toLowerCase().includes(s) ||
        r.solicitante?.nombres?.toLowerCase().includes(s) ||
        r.solicitante?.identificacion?.includes(s)
      )
    }
    if (filters.servicio_id) {
      result = result.filter((r: any) =>
        String(r.solicitante?.servicio_id) === filters.servicio_id
      )
    }

    setRows(result)
    setLoading(false)
  }, [filters])

  function applyFilters() { load() }

  async function executeAction(data: { observacion?: string; fecha?: string; horaInicio?: string; horaFin?: string }) {
    if (!selected || !action) return
    const updates: Record<string, string> = { observaciones: data.observacion ?? '' }
    let newStatus = ''
    if (action === 'accept')     { newStatus = 'aceptada';    updates.estado = 'aceptada' }
    if (action === 'reject')     { newStatus = 'rechazada';   updates.estado = 'rechazada' }
    if (action === 'cancel')     { newStatus = 'cancelada';   updates.estado = 'cancelada' }
    if (action === 'reschedule') {
      newStatus = 'reprogramada'; updates.estado = 'reprogramada'
      if (data.fecha)      updates.fecha_evento = data.fecha
      if (data.horaInicio) updates.hora_inicio  = data.horaInicio
      if (data.horaFin)    updates.hora_fin     = data.horaFin
    }
    await supabase.from('reservaciones').update(updates).eq('id', selected.id)
    await supabase.from('historial_estados').insert({
      reservacion_id: selected.id, estado_anterior: selected.estado,
      estado_nuevo: newStatus as ReservationStatus,
      observacion: data.observacion, usuario_id: user?.id,
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
    setAction(null); setSelected(null); load()
  }

  return (
    <div className="p-4 flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-primary-800">Reservaciones</h1>
          <p className="text-xs text-gray-500 mt-0.5">{rows.length} registro(s)</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-primary-100 shadow-card px-4 py-2.5 mb-3 flex-shrink-0">
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-primary-600 font-semibold text-xs flex-shrink-0 mb-1">
            <Filter size={13} /><span>Filtros</span>
          </div>
          <div className="h-6 w-px bg-gray-200 flex-shrink-0" />

          <div className="flex-1 min-w-[160px]">
            <label className="form-label text-xs mb-0.5">Buscar</label>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="Asunto, solicitante, ID..."
                className="form-input py-1.5 text-xs pl-7" />
            </div>
          </div>

          <div className="min-w-[120px] flex-1">
            <label className="form-label text-xs mb-0.5">Sala</label>
            <select value={filters.sala_id} onChange={e => setFilters(f => ({ ...f, sala_id: e.target.value }))}
              className="form-input py-1.5 text-xs">
              <option value="">Todas</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div className="min-w-[120px] flex-1">
            <label className="form-label text-xs mb-0.5">Servicio</label>
            <select value={filters.servicio_id} onChange={e => setFilters(f => ({ ...f, servicio_id: e.target.value }))}
              className="form-input py-1.5 text-xs">
              <option value="">Todos</option>
              {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div className="min-w-[100px]">
            <label className="form-label text-xs mb-0.5">Estado</label>
            <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
              className="form-input py-1.5 text-xs">
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
              <option value="cancelada">Cancelada</option>
              <option value="reprogramada">Reprogramada</option>
            </select>
          </div>

          <div className="min-w-[105px]">
            <label className="form-label text-xs mb-0.5">Desde</label>
            <input type="date" value={filters.desde}
              onChange={e => setFilters(f => ({ ...f, desde: e.target.value }))}
              className="form-input py-1.5 text-xs" />
          </div>

          <div className="min-w-[105px]">
            <label className="form-label text-xs mb-0.5">Hasta</label>
            <input type="date" value={filters.hasta}
              onChange={e => setFilters(f => ({ ...f, hasta: e.target.value }))}
              className="form-input py-1.5 text-xs" />
          </div>

          <button onClick={applyFilters} disabled={loading}
            className="btn-primary text-xs py-1.5 px-3 flex-shrink-0">
            {loading ? '...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16 text-primary-500 text-sm">Cargando...</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sala</th>
                  <th>Asunto</th>
                  <th>Solicitante</th>
                  <th>Fecha Evento</th>
                  <th>Horario</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium text-gray-700">{r.sala.nombre}</td>
                    <td className="text-gray-600 max-w-[200px] truncate">{r.asunto}</td>
                    <td>
                      <div className="font-medium text-gray-700">{r.solicitante.nombres}</div>
                      <div className="text-xs text-gray-400">{r.solicitante.identificacion}</div>
                    </td>
                    <td className="text-gray-600 whitespace-nowrap">
                      {format(new Date(r.fecha_evento + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="text-gray-600 whitespace-nowrap text-xs">{r.hora_inicio} – {r.hora_fin}</td>
                    <td><span className={statusClass[r.estado]}>{r.estado}</span></td>
                    <td>
                      <button onClick={() => setSelected(r)}
                        className="text-primary-600 hover:text-primary-800 text-xs font-medium whitespace-nowrap">
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && !action && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ReservationCard reservacion={selected}
            onAccept={() => setAction('accept')} onReject={() => setAction('reject')}
            onReschedule={() => setAction('reschedule')} onCancel={() => setAction('cancel')}
            onClose={() => setSelected(null)} />
        </div>
      )}
      {action === 'accept' && <ActionModal title="Aceptar" observationLabel="Observación"
        onConfirm={executeAction} onClose={() => setAction(null)} confirmLabel="Aceptar" confirmClass="btn-success" />}
      {action === 'reject' && <ActionModal title="Rechazar" requireObservation observationLabel="Motivo *"
        onConfirm={executeAction} onClose={() => setAction(null)} confirmLabel="Rechazar" confirmClass="btn-danger" />}
      {action === 'cancel' && <ActionModal title="Cancelar" requireObservation observationLabel="Motivo *"
        onConfirm={executeAction} onClose={() => setAction(null)} confirmLabel="Cancelar" confirmClass="btn-danger" />}
      {action === 'reschedule' && <ActionModal title="Reprogramar" requireReschedule requireObservation observationLabel="Motivo *"
        onConfirm={executeAction} onClose={() => setAction(null)} confirmLabel="Reprogramar" confirmClass="btn-primary" />}
    </div>
  )
}
