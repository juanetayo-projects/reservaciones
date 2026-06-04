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

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', aceptada: 'Aceptada',
  rechazada: 'Rechazada', cancelada: 'Cancelada', reprogramada: 'Reprogramada',
}
const STATUS_BADGE: Record<string, string> = {
  pendiente:    'bg-yellow-100 text-yellow-800',
  aceptada:     'bg-emerald-100 text-emerald-800',
  rechazada:    'bg-red-100 text-red-800',
  cancelada:    'bg-gray-100 text-gray-600',
  reprogramada: 'bg-blue-100 text-blue-800',
}

interface TooltipData {
  x: number; y: number; color: string
  title: string; sala: string; fecha: string
  inicio: string; fin: string; solicitante: string; estado: string
}

export default function CalendarPage() {
  const { user } = useAuth()
  const calRef = useRef<FullCalendar>(null)
  const [events, setEvents] = useState<any[]>([])
  const [salas, setSalas] = useState<{ id: number; nombre: string; color: string }[]>([])
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
        sala:salas(id, nombre, color),
        solicitante:usuarios!reservaciones_solicitante_id_fkey(nombres)
      `)
    if (salaFilter) q = q.eq('sala_id', salaFilter)

    const { data } = await q
    setEvents(
      (data ?? []).map((r: any) => {
        const color = r.sala?.color ?? '#1B4F8A'
        return {
          id: String(r.id),
          title: r.asunto,
          start: `${r.fecha_evento}T${r.hora_inicio}`,
          end:   `${r.fecha_evento}T${r.hora_fin}`,
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            reservacion_id: r.id,
            sala: r.sala?.nombre ?? '',
            salaColor: color,
            solicitante: r.solicitante?.nombres ?? '',
            fecha: r.fecha_evento,
            inicio: r.hora_inicio?.slice(0, 5),
            fin: r.hora_fin?.slice(0, 5),
            estado: r.estado,
          },
        }
      })
    )
  }, [salaFilter])

  useEffect(() => {
    loadEvents()
    supabase.from('salas').select('id, nombre, color').eq('activa', true)
      .then(({ data }) => setSalas((data as any) ?? []))
  }, [loadEvents])

  function handleEventMouseEnter(arg: EventHoveringArg) {
    const rect = (arg.el as HTMLElement).getBoundingClientRect()
    const p = arg.event.extendedProps
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      color: p.salaColor,
      title: arg.event.title,
      sala: p.sala,
      fecha: p.fecha ? format(new Date(p.fecha + 'T00:00:00'), "dd 'de' MMM yyyy", { locale: es }) : '',
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
        sala:salas(id, nombre, ubicacion, capacidad, color, sede:sedes(nombre)),
        solicitante:usuarios!reservaciones_solicitante_id_fkey(
          id, nombres, email, telefono, identificacion,
          servicio:servicios(nombre)
        ),
        invitados(id, email)
      `)
      .eq('id', id).single()
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
    if (action === 'accept')     { newStatus = 'aceptada';    updates.estado = 'aceptada' }
    if (action === 'reject')     { newStatus = 'rechazada';   updates.estado = 'rechazada' }
    if (action === 'cancel')     { newStatus = 'cancelada';   updates.estado = 'cancelada' }
    if (action === 'reschedule') {
      newStatus = 'reprogramada'; updates.estado = 'reprogramada'
      if (data.fecha)      updates.fecha_evento = data.fecha
      if (data.horaInicio) updates.hora_inicio  = data.horaInicio
      if (data.horaFin)    updates.hora_fin     = data.horaFin
    }
    const { error } = await supabase.from('reservaciones').update(updates).eq('id', selectedRes.id)
    if (error) { toast.error('Error al actualizar'); return }
    await supabase.from('historial_estados').insert({
      reservacion_id: selectedRes.id, estado_anterior: selectedRes.estado,
      estado_nuevo: newStatus as any, observacion: data.observacion, usuario_id: user?.id,
    })
    // Notificaciones por correo
    // Aceptada / Reprogramada / Cancelada → solicitante + invitados
    // Rechazada → solo solicitante
    if (['aceptada', 'rechazada', 'reprogramada', 'cancelada'].includes(newStatus)) {
      try {
        const emailType = { accept:'accepted', reject:'rejected', reschedule:'rescheduled', cancel:'cancelled' }[action!] ?? 'accepted'
        const recipients = [selectedRes.solicitante.email]
        if (newStatus !== 'rechazada') recipients.push(...selectedRes.invitados.map(i => i.email))
        const resData = {
          ...selectedRes,
          ...updates,
          sala_nombre:      selectedRes.sala.nombre,
          sala_ubicacion:   selectedRes.sala.ubicacion,
          sede_nombre:      (selectedRes.sala as any).sede?.nombre ?? '',
          solicitante_nombre: selectedRes.solicitante.nombres,
          solicitante_email:  selectedRes.solicitante.email,
          solicitante_servicio: (selectedRes.solicitante as any).servicio?.nombre ?? '',
          invitados_emails: selectedRes.invitados.map(i => i.email),
        }
        await sendReservationEmail({ type: emailType, to: recipients, reservationData: resData })
      } catch { /* non-blocking */ }
    }
    toast.success('Reservación actualizada')
    setAction(null); setSelectedRes(null); loadEvents()
  }

  // Legend: one dot per sala with its color
  const leyendaSalas = salas.filter(s => s.color)

  return (
    <div className="p-4 flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-primary-800">Calendario de Salas</h1>
          <p className="text-xs text-gray-500">Haga clic en un día para solicitar una reservación</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
          <Filter size={13} className="text-gray-400" />
          <select value={salaFilter} onChange={e => setSalaFilter(Number(e.target.value))} className="text-xs outline-none bg-transparent">
            <option value={0}>Todas las salas</option>
            {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Leyenda por sala */}
      <div className="flex flex-wrap gap-3 mb-2 flex-shrink-0">
        {leyendaSalas.map(s => (
          <div key={s.id} className="flex items-center gap-1 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span>{s.nombre}</span>
          </div>
        ))}
      </div>

      {/* Calendar — fills remaining height */}
      <div className="bg-white rounded-xl shadow-card border border-gray-100 p-2 flex-1 min-h-0">
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
          height="100%"
          eventDisplay="block"
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          dayMaxEvents={3}
        />
      </div>

      {/* Hover Tooltip */}
      {tooltip && (
        <div className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden w-60">
            {/* Colored header */}
            <div className="px-3 py-2" style={{ backgroundColor: tooltip.color }}>
              <p className="font-bold text-white text-sm leading-tight">{tooltip.title}</p>
            </div>
            <div className="p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <MapPin size={11} className="flex-shrink-0" style={{ color: tooltip.color }} />
                <span>{tooltip.sala}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <CalendarDays size={11} className="flex-shrink-0" style={{ color: tooltip.color }} />
                <span>{tooltip.fecha}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Clock size={11} className="flex-shrink-0" style={{ color: tooltip.color }} />
                <span>{tooltip.inicio} – {tooltip.fin}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <User size={11} className="flex-shrink-0" style={{ color: tooltip.color }} />
                <span>{tooltip.solicitante}</span>
              </div>
              <div className="pt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[tooltip.estado] ?? ''}`}>
                  {STATUS_LABELS[tooltip.estado]}
                </span>
              </div>
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0"
              style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid white' }} />
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

      {action === 'accept' && <ActionModal title="Aceptar reservación" observationLabel="Observación (opcional)"
        onConfirm={executeAction} onClose={() => setAction(null)} confirmLabel="Aceptar" confirmClass="btn-success" />}
      {action === 'reject' && <ActionModal title="Rechazar reservación" requireObservation observationLabel="Motivo *"
        onConfirm={executeAction} onClose={() => setAction(null)} confirmLabel="Rechazar" confirmClass="btn-danger" />}
      {action === 'cancel' && <ActionModal title="Cancelar reservación" requireObservation observationLabel="Motivo *"
        onConfirm={executeAction} onClose={() => setAction(null)} confirmLabel="Cancelar" confirmClass="btn-danger" />}
      {action === 'reschedule' && <ActionModal title="Reprogramar" requireReschedule requireObservation observationLabel="Motivo *"
        onConfirm={executeAction} onClose={() => setAction(null)} confirmLabel="Reprogramar" confirmClass="btn-primary" />}
    </div>
  )
}
