import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

const schema = z.object({
  identificacion: z.string().min(3, 'Requerido'),
  nombres: z.string().min(3, 'Requerido'),
  servicio_id: z.coerce.number().min(1, 'Seleccione servicio'),
  telefono: z.string().optional(),
  email: z.string().email('Correo inválido'),
  sala_id: z.coerce.number().min(1, 'Seleccione sala'),
  asunto: z.string().min(3, 'Requerido'),
  fecha_evento: z.string().min(1, 'Requerido'),
  hora_inicio: z.string().min(1, 'Requerido'),
  hora_fin: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  invitados: z.array(z.object({ email: z.string().email('Inválido') })),
}).refine(d => d.hora_fin > d.hora_inicio, {
  message: 'Hora fin debe ser mayor', path: ['hora_fin'],
})

type FormData = z.infer<typeof schema>

interface Props {
  selectedDate?: string
  onSuccess?: () => void
  onClose?: () => void
}

export default function ReservationForm({ selectedDate, onSuccess, onClose }: Props) {
  const { user } = useAuth()
  const [salas, setSalas] = useState<{ id: number; nombre: string; sede: { nombre: string } }[]>([])
  const [servicios, setServicios] = useState<{ id: number; nombre: string }[]>([])
  const [loadingId, setLoadingId] = useState(false)
  const [existingUser, setExistingUser] = useState(false)
  const [conflict, setConflict] = useState<{ asunto: string; inicio: string; fin: string } | null>(null)
  const [checkingAvail, setCheckingAvail] = useState(false)

  const { register, handleSubmit, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fecha_evento: selectedDate ?? '', invitados: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'invitados' })
  const salaId   = watch('sala_id')
  const fechaEvt = watch('fecha_evento')
  const horaIni  = watch('hora_inicio')
  const horaFin  = watch('hora_fin')

  useEffect(() => {
    supabase.from('salas').select('id, nombre, sede:sedes(nombre)').eq('activa', true)
      .then(({ data }) => setSalas((data as any) ?? []))
    supabase.from('servicios').select('id, nombre').order('nombre')
      .then(({ data }) => setServicios(data ?? []))
  }, [])

  useEffect(() => {
    if (!salaId || !fechaEvt || !horaIni || !horaFin || horaFin <= horaIni) {
      setConflict(null); return
    }
    setCheckingAvail(true)
    supabase.from('reservaciones')
      .select('id, asunto, hora_inicio, hora_fin')
      .eq('sala_id', salaId).eq('fecha_evento', fechaEvt)
      .not('estado', 'in', '("cancelada","rechazada")')
      .lt('hora_inicio', horaFin).gt('hora_fin', horaIni)
      .then(({ data }) => {
        setCheckingAvail(false)
        if (data && data.length > 0) {
          const r = data[0] as any
          setConflict({ asunto: r.asunto, inicio: r.hora_inicio?.slice(0,5), fin: r.hora_fin?.slice(0,5) })
        } else setConflict(null)
      })
  }, [salaId, fechaEvt, horaIni, horaFin])

  async function lookupId(id: string) {
    if (!id || id.length < 5) return
    setLoadingId(true)
    const { data } = await supabase.from('usuarios').select('nombres, email, telefono, servicio_id')
      .eq('identificacion', id).maybeSingle()
    setLoadingId(false)
    if (data) {
      setValue('nombres', data.nombres); setValue('email', data.email)
      setValue('telefono', data.telefono ?? '')
      if (data.servicio_id) setValue('servicio_id', data.servicio_id)
      setExistingUser(true)
    } else setExistingUser(false)
  }

  async function onSubmit(data: FormData) {
    if (conflict) { toast.error('La sala ya está reservada en ese horario'); return }
    try {
      let solicitanteId: string
      const { data: existing } = await supabase.from('usuarios').select('id')
        .eq('identificacion', data.identificacion).maybeSingle()
      if (existing) {
        await supabase.from('usuarios').update({ nombres: data.nombres, email: data.email, telefono: data.telefono, servicio_id: data.servicio_id }).eq('id', existing.id)
        solicitanteId = existing.id
      } else {
        const { data: newUser, error } = await supabase.from('usuarios').insert({
          identificacion: data.identificacion, nombres: data.nombres, email: data.email,
          telefono: data.telefono, servicio_id: data.servicio_id, perfil_id: 2,
        }).select('id').single()
        if (error || !newUser) throw error
        solicitanteId = newUser.id
      }
      const { data: res, error: resErr } = await supabase.from('reservaciones').insert({
        sala_id: data.sala_id, solicitante_id: solicitanteId, asunto: data.asunto,
        descripcion: data.descripcion, fecha_evento: data.fecha_evento,
        hora_inicio: data.hora_inicio, hora_fin: data.hora_fin, estado: 'pendiente',
      }).select('id').single()
      if (resErr || !res) throw resErr
      if (data.invitados.length > 0)
        await supabase.from('invitados').insert(data.invitados.map(inv => ({ reservacion_id: res.id, email: inv.email })))
      await supabase.from('historial_estados').insert({
        reservacion_id: res.id, estado_nuevo: 'pendiente',
        observacion: 'Reservación creada', usuario_id: user?.id,
      })
      toast.success('Reservación creada exitosamente')
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al crear la reservación')
    }
  }

  const showAvailOk = !conflict && !checkingAvail && salaId && fechaEvt && horaIni && horaFin && horaFin > horaIni

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: 'calc(100vh - 24px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-primary-800">Nueva Reservación</h2>
          {onClose && <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
        </div>

        <div className="px-5 py-3 space-y-3 overflow-y-auto flex-1">

          {/* SALA + FECHA/HORAS en una fila */}
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <label className="form-label text-xs">Sala *</label>
              <select {...register('sala_id')} className="form-input py-1.5 text-xs">
                <option value="">Seleccione</option>
                {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              {errors.sala_id && <p className="form-error">{errors.sala_id.message}</p>}
            </div>
            <div>
              <label className="form-label text-xs">Fecha *</label>
              <input {...register('fecha_evento')} type="date" className="form-input py-1.5 text-xs"
                min={new Date().toISOString().split('T')[0]} />
              {errors.fecha_evento && <p className="form-error">{errors.fecha_evento.message}</p>}
            </div>
            <div>
              <label className="form-label text-xs">Hora inicio *</label>
              <input {...register('hora_inicio')} type="time" className="form-input py-1.5 text-xs" />
              {errors.hora_inicio && <p className="form-error">{errors.hora_inicio.message}</p>}
            </div>
            <div>
              <label className="form-label text-xs">Hora fin *</label>
              <input {...register('hora_fin')} type="time" className="form-input py-1.5 text-xs" />
              {errors.hora_fin && <p className="form-error">{errors.hora_fin.message}</p>}
            </div>
          </div>

          {/* Disponibilidad */}
          {checkingAvail && (
            <p className="text-xs text-primary-500 flex items-center gap-1 -mt-1">
              <span className="animate-spin inline-block w-3 h-3 border border-primary-400 border-t-transparent rounded-full" />
              Verificando disponibilidad...
            </p>
          )}
          {conflict && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span><strong>Sala no disponible.</strong> Reserva "<strong>{conflict.asunto}</strong>" de {conflict.inicio} a {conflict.fin} ya ocupa ese horario.</span>
            </div>
          )}
          {showAvailOk && (
            <p className="text-xs text-emerald-600 flex items-center gap-1 -mt-1">
              <CheckCircle2 size={12} /> Sala disponible
            </p>
          )}

          {/* ASUNTO */}
          <div>
            <label className="form-label text-xs">Asunto / Motivo *</label>
            <input {...register('asunto')} className="form-input py-1.5 text-xs" placeholder="Reunión de comité, capacitación..." />
            {errors.asunto && <p className="form-error">{errors.asunto.message}</p>}
          </div>

          {/* SOLICITANTE — 5 campos en grid 2+2+1 */}
          <div>
            <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-1.5">Datos del solicitante</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label text-xs">N° Identificación *</label>
                <input {...register('identificacion')} className="form-input py-1.5 text-xs" placeholder="12345678"
                  onBlur={e => lookupId(e.target.value)} />
                {loadingId && <p className="text-xs text-primary-500">Buscando...</p>}
                {existingUser && <p className="text-xs text-emerald-600">✓ Datos cargados</p>}
                {errors.identificacion && <p className="form-error">{errors.identificacion.message}</p>}
              </div>
              <div>
                <label className="form-label text-xs">Nombre completo *</label>
                <input {...register('nombres')} className="form-input py-1.5 text-xs" placeholder="Nombre Apellido" />
                {errors.nombres && <p className="form-error">{errors.nombres.message}</p>}
              </div>
              <div>
                <label className="form-label text-xs">Servicio *</label>
                <select {...register('servicio_id')} className="form-input py-1.5 text-xs">
                  <option value="">Seleccione</option>
                  {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                {errors.servicio_id && <p className="form-error">{errors.servicio_id.message}</p>}
              </div>
              <div>
                <label className="form-label text-xs">Teléfono</label>
                <input {...register('telefono')} className="form-input py-1.5 text-xs" placeholder="3001234567" />
              </div>
              <div className="col-span-2">
                <label className="form-label text-xs">Correo electrónico *</label>
                <input {...register('email')} type="email" className="form-input py-1.5 text-xs" placeholder="correo@clinica.com" />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
            </div>
          </div>

          {/* DESCRIPCIÓN + INVITADOS en dos columnas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label text-xs">Descripción</label>
              <textarea {...register('descripcion')} rows={2} className="form-input text-xs resize-none py-1.5"
                placeholder="Descripción adicional (opcional)" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label text-xs mb-0">Invitados</label>
                <button type="button" onClick={() => append({ email: '' })}
                  className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium">
                  <Plus size={11} /> Agregar
                </button>
              </div>
              {fields.length === 0
                ? <p className="text-xs text-gray-400 italic">Sin invitados.</p>
                : <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                    {fields.map((field, idx) => (
                      <div key={field.id} className="flex gap-1.5">
                        <input {...register(`invitados.${idx}.email`)} type="email"
                          className="form-input flex-1 py-1 text-xs" placeholder="email@correo.com" />
                        <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-gray-100 flex-shrink-0">
          {onClose && <button type="button" onClick={onClose} className="btn-secondary text-xs py-1.5 px-3">Cancelar</button>}
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || !!conflict}
            className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Guardando...' : 'Solicitar Reservación'}
          </button>
        </div>
      </div>
    </div>
  )
}
