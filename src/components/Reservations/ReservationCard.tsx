import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CalendarDays, Clock, MapPin, User, Mail, Phone,
  Users, CheckCircle, XCircle, RotateCcw, Ban, Pencil,
} from 'lucide-react'
import type { ReservacionCompleta } from '../../types/database'
import { useAuth } from '../../contexts/AuthContext'

interface Props {
  reservacion: ReservacionCompleta
  onAccept?: () => void
  onReject?: () => void
  onReschedule?: () => void
  onCancel?: () => void
  onEdit?: () => void
  onClose?: () => void
}

const statusLabel: Record<string, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada',
}

const statusClass: Record<string, string> = {
  pendiente: 'badge-pending',
  aceptada: 'badge-accepted',
  rechazada: 'badge-rejected',
  cancelada: 'badge-cancelled',
  reprogramada: 'badge-rescheduled',
}

export default function ReservationCard({ reservacion, onAccept, onReject, onReschedule, onCancel, onEdit, onClose }: Props) {
  const { isAdmin } = useAuth()

  return (
    <div className="card max-w-lg w-full shadow-card-hover">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-primary-800">{reservacion.asunto}</h2>
          <span className={statusClass[reservacion.estado]}>{statusLabel[reservacion.estado]}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
        )}
      </div>

      <div className="space-y-3 text-sm">
        {/* Sala */}
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin size={15} className="text-primary-500 flex-shrink-0" />
          <span className="font-medium">{reservacion.sala.nombre}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{reservacion.sala.sede.nombre}</span>
          <span className="text-gray-400">·</span>
          <Users size={13} className="text-gray-400" />
          <span className="text-gray-500">{reservacion.sala.capacidad} sillas</span>
        </div>

        {/* Fecha y hora */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <CalendarDays size={15} className="text-primary-500" />
            <span>{format(new Date(reservacion.fecha_evento + 'T00:00:00'), 'PPPP', { locale: es })}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Clock size={15} className="text-primary-500" />
            <span>{reservacion.hora_inicio} – {reservacion.hora_fin}</span>
          </div>
        </div>

        {reservacion.descripcion && (
          <p className="text-gray-600 italic border-l-2 border-primary-200 pl-3">{reservacion.descripcion}</p>
        )}

        {/* Solicitante */}
        <div className="bg-primary-50 rounded-lg p-3 space-y-1.5 border border-primary-100">
          <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Solicitante</p>
          <div className="flex items-center gap-2">
            <User size={14} className="text-primary-500" />
            <span className="font-medium">{reservacion.solicitante.nombres}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{reservacion.solicitante.identificacion}</span>
          </div>
          {reservacion.solicitante.servicio && (
            <p className="text-gray-600 text-xs pl-5">{reservacion.solicitante.servicio.nombre}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Mail size={12} className="text-primary-400" />
            {reservacion.solicitante.email}
            {reservacion.solicitante.telefono && (
              <>
                <span className="text-gray-300">|</span>
                <Phone size={12} className="text-primary-400" />
                {reservacion.solicitante.telefono}
              </>
            )}
          </div>
        </div>

        {/* Invitados */}
        {reservacion.invitados.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Invitados ({reservacion.invitados.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {reservacion.invitados.map(inv => (
                <span key={inv.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{inv.email}</span>
              ))}
            </div>
          </div>
        )}

        {/* Observaciones */}
        {reservacion.observaciones && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <strong>Observación:</strong> {reservacion.observaciones}
          </div>
        )}

        <p className="text-xs text-gray-400">
          Solicitud: {format(new Date(reservacion.fecha_solicitud), 'Pp', { locale: es })}
        </p>
      </div>

      {/* Actions — admin only */}
      {isAdmin && (
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
          {reservacion.estado === 'pendiente' && (
            <>
              <button onClick={onAccept} className="btn-success text-xs px-3 py-1.5">
                <CheckCircle size={14} /> Aceptar
              </button>
              <button onClick={onReject} className="btn-danger text-xs px-3 py-1.5">
                <XCircle size={14} /> Rechazar
              </button>
              <button onClick={onReschedule} className="btn-secondary text-xs px-3 py-1.5">
                <RotateCcw size={14} /> Reprogramar
              </button>
            </>
          )}
          {['pendiente', 'aceptada', 'reprogramada'].includes(reservacion.estado) && (
            <>
              <button onClick={onEdit} className="btn-secondary text-xs px-3 py-1.5">
                <Pencil size={14} /> Editar
              </button>
              <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
                <Ban size={14} /> Cancelar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
