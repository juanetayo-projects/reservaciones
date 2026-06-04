import { useCallback, useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core'
import { supabase } from '../lib/supabase'
import ReservationForm from '../components/Reservations/ReservationForm'
import ReservationCard from '../components/Reservations/ReservationCard'
import ActionModal from '../components/Reservations/ActionModal'
import type { ReservacionCompleta } from '../types/database'
import { sendReservationEmail } from '../lib/email'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { Filter } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pendiente:    '#F59E0B',
  aceptada:     '#10B981',
  rechazada:    '#EF4444',
  cancelada:    '#9CA3AF',
  reprogramada: '#3B82F6',
}

export default function CalendarPage() {
  const { user, isAdmin } = useAuth()
  const calRef = useRef<FullCalendar>(null)
  const [events, setEvents] = useState<any[]>([])
  const [salas, setSalas] = useState<{ id: number; nombre: string }[]>([])
  const [salaFilter, setSalaFilter] = useState<number>(0)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [selectedRes, setSelectedRes] = useState<ReservacionCompleta | null>(null)
  const [action, setAction] = useState<'accept' | 'reject' | 'cancel' | 'reschedule' | null>(null)

  const loadEvents = useCallback(async () => {
    let q = supabase
      .from('reservaciones')
      .select(`
        id, asunto, fecha_evento, hora_inicio, hora_fin, estado,
        sala:salas(id, nombre)
      `)
    if (salaFilter) q = q.eq('sala_id', salaFilter)

    const { data } = await q
    setEvents(
      (data ?? []).map((r: any) => ({
        id: String(r.id),
        title: `${r.sala.nombre} — ${r.asunto}`,
        start: `${r.fecha_evento}T${r.hora_inicio}`,
        end:   `${r.fecha_evento}T${r.hora_fin}`,
        backgroundColor: STATUS_COLORS[r.estado],
        borderColor: STATUS_COLORS[r.estado],
        extendedProps: { reservacion_id: r.id },
      }))
    )
  }, [salaFilter])

  useEffect(() => {
    loadEvents()
    supabase.from('salas').select('id, nombre').eq('activa', true).then(({ data }) => setSalas(data ?? []))
  }, [loadEvents])

  async function handleEventClick(arg: EventClickArg) {
    const id = arg.event.extendedProps.reservacion_id
    const { data } = await supabase
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
      .eq('id', id)
      .single()
    setSelectedRes(data as any)
  }

  async function handleDateSelect(arg: DateSelectArg) {
    const today = new Date().toISOString().split('T')[0]
    if (arg.startStr < today) return
    setSelectedDate(arg.startStr)
    setShowForm(true)
  }

  async function executeAction(data: { observacion?: string; fecha?: string; horaInicio?: string; horaFin?: string }) {
    if (!selectedRes || !action) return
    const updates: Record<string, string> = { observaciones: data.observacion ?? '' }
    let newStatus = ''

    if (action === 'accept')     { newStatus = 'aceptada'; updates.estado = 'aceptada' }
    if (action === 'reject')     { newStatus = 'rechazada'; updates.estado = 'rechazada' }
    if (action === 'cancel')     { newStatus = 'cancelada'; updates.estado = 'cancelada' }
    if (action === 'reschedule') {
      newStatus = 'reprogramada'
      updates.estado = 'reprogramada'
      if (data.fecha)      updates.fecha_evento = data.fecha
      if (data.horaInicio) updates.hora_inicio  = data.horaInicio
      if (data.horaFin)    updates.hora_fin     = data.horaFin
    }

    const { error } = await supabase.from('reservaciones').update(updates).eq('id', selectedRes.id)
    if (error) { toast.error('Error al actualizar'); return }

    await supabase.from('historial_estados').insert({
      reservacion_id: selectedRes.id,
      estado_anterior: selectedRes.estado,
      estado_nuevo: newStatus as any,
      observacion: data.observacion,
      usuario_id: user?.id,
    })

    // Send email for accept / reject / reschedule
    if (['aceptada', 'rechazada', 'reprogramada'].includes(newStatus)) {
      try {
        const emailType = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'rescheduled'
        const recipients = [selectedRes.solicitante.email]
        if (newStatus === 'aceptada') recipients.push(...selectedRes.invitados.map(i => i.email))
        await sendReservationEmail({ type: emailType, to: recipients, reservationData: { ...selectedRes, ...updates } })
      } catch { /* email errors are non-blocking */ }
    }

    toast.success('Reservación actualizada')
    setAction(null)
    setSelectedRes(null)
    loadEvents()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">Calendario de Salas</h1>
          <p className="text-sm text-gray-500 mt-1">Haga clic en un día para solicitar una reservación</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Filter size={15} className="text-gray-400" />
            <select value={salaFilter} onChange={e => setSalaFilter(Number(e.target.value))} className="text-sm outline-none bg-transparent">
              <option value={0}>Todas las salas</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
            <span className="capitalize">{status}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
          events={events}
          selectable
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
        />
      </div>

      {showForm && (
        <ReservationForm
          selectedDate={selectedDate}
          onSuccess={() => { setShowForm(false); loadEvents() }}
          onClose={() => setShowForm(false)}
        />
      )}

      {selectedRes && !action && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ReservationCard
            reservacion={selectedRes}
            onAccept={() => setAction('accept')}
            onReject={() => setAction('reject')}
            onReschedule={() => setAction('reschedule')}
            onCancel={() => setAction('cancel')}
            onClose={() => setSelectedRes(null)}
          />
        </div>
      )}

      {action === 'accept' && (
        <ActionModal
          title="Aceptar reservación"
          description="¿Confirma que acepta esta reservación? Se notificará al solicitante y a los invitados."
          observationLabel="Observación (opcional)"
          onConfirm={executeAction}
          onClose={() => setAction(null)}
          confirmLabel="Aceptar"
          confirmClass="btn-success"
        />
      )}
      {action === 'reject' && (
        <ActionModal
          title="Rechazar reservación"
          requireObservation
          observationLabel="Motivo del rechazo *"
          onConfirm={executeAction}
          onClose={() => setAction(null)}
          confirmLabel="Rechazar"
          confirmClass="btn-danger"
        />
      )}
      {action === 'cancel' && (
        <ActionModal
          title="Cancelar reservación"
          requireObservation
          observationLabel="Motivo de cancelación *"
          onConfirm={executeAction}
          onClose={() => setAction(null)}
          confirmLabel="Cancelar reservación"
          confirmClass="btn-danger"
        />
      )}
      {action === 'reschedule' && (
        <ActionModal
          title="Reprogramar reservación"
          requireReschedule
          requireObservation
          observationLabel="Motivo de reprogramación *"
          onConfirm={executeAction}
          onClose={() => setAction(null)}
          confirmLabel="Reprogramar"
          confirmClass="btn-primary"
        />
      )}
    </div>
  )
}
