import { useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  description?: string
  requireObservation?: boolean
  observationLabel?: string
  requireReschedule?: boolean
  onConfirm: (data: { observacion?: string; fecha?: string; horaInicio?: string; horaFin?: string }) => void
  onClose: () => void
  confirmLabel?: string
  confirmClass?: string
}

export default function ActionModal({
  title, description, requireObservation = false, observationLabel = 'Observación',
  requireReschedule = false, onConfirm, onClose,
  confirmLabel = 'Confirmar', confirmClass = 'btn-primary',
}: Props) {
  const [observacion, setObservacion] = useState('')
  const [fecha, setFecha] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')

  function handleConfirm() {
    if (requireObservation && !observacion.trim()) return
    onConfirm({ observacion, fecha, horaInicio, horaFin })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}

        {requireReschedule && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="form-label">Nueva fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="form-input" min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Hora inicio</label>
                <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Hora fin</label>
                <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className="form-input" />
              </div>
            </div>
          </div>
        )}

        <div className="mb-5">
          <label className="form-label">{observationLabel}{requireObservation && ' *'}</label>
          <textarea
            value={observacion}
            onChange={e => setObservacion(e.target.value)}
            rows={3}
            className="form-input"
            placeholder="Escriba su observación..."
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleConfirm} className={confirmClass}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
