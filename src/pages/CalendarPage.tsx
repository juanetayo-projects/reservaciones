import { useCallback, useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type { EventClickArg, DateSelectArg, EventHoveringArg } from '@fullcalendar/core'
import { supabase } from '../lib/supabase'
import ReservationForm from '../components/Reservations/ReservationForm'
import ReservationCard from '../components/Reservations/ReservationCard'
import ActionModal from '../components/Reservations/ActionModal'
import type { ReservacionCompleta } from '../types/database'
import { sendReservationEmail } from '../lib/email'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { Filter, CalendarDays, Clock, MapPin, User } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_COLORS: Record<string, string> = {
  pendiente:    '#F59E0B',
  aceptada:     '#10B981',
  rechazada:    '#EF4444',
  cancelada:    '#9CA3AF',
  reprogramada: '#3B82F6',
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', aceptada: 'Aceptada',
  rechazada: 'Rechazada', cancelada: 'Cancelada', reprogramada: 'Reprogramada',
}

interface TooltipData {
  x: number; y: number
  title: string; sala: string; fecha: string
  inicio: string; fin: string; solicitante: string; estado: string
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
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const loadEvents = useCallback(async () => {
    let q = supabase
      .from('reservaciones')
      .select(`
        id, asunto, fecha_evento, hora_inicio, hora_fin, estado,
        sala:salas(id, nombre),
        solicitante:usuarios!reservaciones_solicitante_id_fkey(nombres)
      `)
    if (salaFilter) q = q.eq('sala_id', salaFilter)

    const { data } = await q
    setEvents(
      (data ?? []).map((r: any) => ({
        id: String(r.id),
        title: `${r.asunto}`,
        start: `${r.fecha_evento}T${r.hora_inicio}`,
        end:   `${r.fecha_evento}T${r.hora_fin}`,
        backgroundColor: STATUS_COLORS[r.estado],
        borderColor: STATUS_COLORS[r.estado],
        extendedProps: {
          reservacion_id: r.id,
          sala: r.sala?.nombre ?? '',
          solicitante: r.solicitante?.nombres ?? '',
          fecha: r.fecha_evento,
          inicio: r.hora_inicio?.slice(0,5),
          fin: r.hora_fin?.slice(0,5),
          estado: r.estado,
        },
      }))
    )
  }, [salaFilter])

  useEffect(() => {
    loadEvents()
    supabase.from('salas').select('id, nombre').eq('activa', true).then(({ data }) => setSalas(data ?? []))
  }, [loadEvents])

  function handleEventMouseEnter(arg: EventHoveringArg) {
    const rect = (arg.el as HTMLElement).getBoundingClientRect()
    const p = arg.event.extendedProps
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      title: arg.event.title,
      sala: p.sala,
      fecha: p.fecha ? format(new Date(p.fecha + 'T00:00:00'), 'dd MMM yyyy', { locale: es }) : '',
      inicio: p.inicio,
      fin: p.fin,
      solicitante: p.solicitante,
      estado: p.estado,
    })
  }

  function handleEventMouseLeave() { setTooltip(null) }

  async function handleEventClick(arg: EventClickArg) {
    setTooltip(null)
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
      newStatus = 'reprogramada'; updates.estado = 'reprogramada'
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

    if (['aceptada', 'rechazada', 'reprogramada'].includes(newStatus)) {
      try {
        const emailType = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'rescheduled'
        const recipients = [selectedRes.solicitante.email]
        if (newStatus === 'aceptada') recipients.push(...selectedRes.invitados.map(i => i.email))
        await sendReservationEmail({ type: emailType, to: recipients, reservationData: { ...selectedRes, ...updates } })
      } catch { /* non-blocking */ }
    }

    toast.success('Reservación actualizada')
    setAction(null)
    setSelectedRes(null)
    loadEvents()
  }

  const statusColor: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-800',
    aceptada: 'bg-emerald-100 text-emerald-800',
    rechazada: 'bg-red-100 text-red-800',
    cancelada: 'bg-gray-100 text-gray-700',
    reprogramada: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-primary-800">Calendario de Salas</h1>
          <p className="text-xs text-gray-500 mt-0.5">Haga clic en un día para solicitar una reservación</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
          <Filter size={14} className="text-gray-400" />
          <select value={salaFilter} onChange={e => setSalaFilter(Number(e.target.value))} className="text-sm outline-none bg-transparent">
            <option value={0}>Todas las salas</option>
            {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            <span className="capitalize">{STATUS_LABELS[status]}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="card p-3">
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
          eventMouseEnter={handleEventMouseEnter}
          eventMouseLeave={handleEventMouseLeave}
          contentHeight={420}
          eventDisplay="block"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          dayMaxEvents={3}
        />
      </div>

      {/* Hover Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-primary-100 p-3 w-64 text-sm">
            <p className="font-bold text-primary-800 text-sm leading-tight mb-2">{tooltip.title}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <MapPin size={12} className="text-primary-400 flex-shrink-0" />
                <span>{tooltip.sala}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <CalendarDays size={12} className="text-primary-400 flex-shrink-0" />
                <span>{tooltip.fecha}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Clock size={12} className="text-primary-400 flex-shrink-0" />
                <span>{tooltip.inicio} – {tooltip.fin}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <User size={12} className="text-primary-400 flex-shrink-0" />
                <span>{tooltip.solicitante}</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[tooltip.estado] ?? ''}`}>
                {STATUS_LABELS[tooltip.estado]}
              </span>
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid white' }} />
          </div>
        </div>
      )}

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
