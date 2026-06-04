import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, X } from 'lucide-react'
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
  invitados: z.array(z.object({ email: z.string().email('Correo inválido') })),
}).refine(d => d.hora_fin > d.hora_inicio, {
  message: 'La hora de fin debe ser posterior a la hora de inicio',
  path: ['hora_fin'],
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
  const [existingUser, setExistingUser] = useState<boolean>(false)

  const { register, handleSubmit, control, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_evento: selectedDate ?? '',
      invitados: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'invitados' })

  useEffect(() => {
    supabase.from('salas').select('id, nombre, sede:sedes(nombre)').eq('activa', true).then(({ data }) => {
      setSalas((data as any) ?? [])
    })
    supabase.from('servicios').select('id, nombre').order('nombre').then(({ data }) => {
      setServicios(data ?? [])
    })
  }, [])

  async function lookupId(id: string) {
    if (!id || id.length < 5) return
    setLoadingId(true)
    const { data } = await supabase
      .from('usuarios')
      .select('nombres, email, telefono, servicio_id')
      .eq('identificacion', id)
      .maybeSingle()
    setLoadingId(false)
    if (data) {
      setValue('nombres', data.nombres)
      setValue('email', data.email)
      setValue('telefono', data.telefono ?? '')
      if (data.servicio_id) setValue('servicio_id', data.servicio_id)
      setExistingUser(true)
    } else {
      setExistingUser(false)
    }
  }

  async function onSubmit(data: FormData) {
    try {
      // Upsert solicitante
      let solicitanteId: string

      const { data: existing } = await supabase
        .from('usuarios')
        .select('id')
        .eq('identificacion', data.identificacion)
        .maybeSingle()

      if (existing) {
        await supabase.from('usuarios').update({
          nombres: data.nombres,
          email: data.email,
          telefono: data.telefono,
          servicio_id: data.servicio_id,
        }).eq('id', existing.id)
        solicitanteId = existing.id
      } else {
        const { data: newUser, error } = await supabase.from('usuarios').insert({
          identificacion: data.identificacion,
          nombres: data.nombres,
          email: data.email,
          telefono: data.telefono,
          servicio_id: data.servicio_id,
          perfil_id: 2,
        }).select('id').single()
        if (error || !newUser) throw error
        solicitanteId = newUser.id
      }

      // Create reservation
      const { data: res, error: resErr } = await supabase.from('reservaciones').insert({
        sala_id: data.sala_id,
        solicitante_id: solicitanteId,
        asunto: data.asunto,
        descripcion: data.descripcion,
        fecha_evento: data.fecha_evento,
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
        estado: 'pendiente',
      }).select('id').single()
      if (resErr || !res) throw resErr

      // Insert invitados
      if (data.invitados.length > 0) {
        await supabase.from('invitados').insert(
          data.invitados.map(inv => ({ reservacion_id: res.id, email: inv.email }))
        )
      }

      // Log history
      await supabase.from('historial_estados').insert({
        reservacion_id: res.id,
        estado_nuevo: 'pendiente',
        observacion: 'Reservación creada',
        usuario_id: user?.id,
      })

      toast.success('Reservación creada exitosamente')
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al crear la reservación')
    }
  }

  const salaId = watch('sala_id')
  const fechaEvento = watch('fecha_evento')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-primary-800">Nueva Reservación</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Sala */}
          <div>
            <h3 className="text-sm font-semibold text-primary-700 uppercase tracking-wide mb-3">Sala a reservar</h3>
            <div>
              <label className="form-label">Sala *</label>
              <select {...register('sala_id')} className="form-input">
                <option value="">Seleccione una sala</option>
                {salas.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre} — {s.sede.nombre}</option>
                ))}
              </select>
              {errors.sala_id && <p className="form-error">{errors.sala_id.message}</p>}
            </div>
          </div>

          {/* Datos solicitante */}
          <div>
            <h3 className="text-sm font-semibold text-primary-700 uppercase tracking-wide mb-3">Datos del solicitante</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">N° Identificación *</label>
                <input
                  {...register('identificacion')}
                  className="form-input"
                  placeholder="12345678"
                  onBlur={e => lookupId(e.target.value)}
                />
                {loadingId && <p className="text-xs text-primary-500 mt-1">Buscando...</p>}
                {existingUser && <p className="text-xs text-emerald-600 mt-1">✓ Datos cargados desde el sistema</p>}
                {errors.identificacion && <p className="form-error">{errors.identificacion.message}</p>}
              </div>
              <div>
                <label className="form-label">Nombre completo *</label>
                <input {...register('nombres')} className="form-input" placeholder="Nombre Apellido" />
                {errors.nombres && <p className="form-error">{errors.nombres.message}</p>}
              </div>
              <div>
                <label className="form-label">Servicio *</label>
                <select {...register('servicio_id')} className="form-input">
                  <option value="">Seleccione servicio</option>
                  {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                {errors.servicio_id && <p className="form-error">{errors.servicio_id.message}</p>}
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input {...register('telefono')} className="form-input" placeholder="3001234567" />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Correo electrónico *</label>
                <input {...register('email')} type="email" className="form-input" placeholder="correo@clinica.com" />
                {errors.email && <p className="form-error">{errors.email.message}</p>}
              </div>
            </div>
          </div>

          {/* Datos evento */}
          <div>
            <h3 className="text-sm font-semibold text-primary-700 uppercase tracking-wide mb-3">Datos del evento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="form-label">Asunto / Motivo *</label>
                <input {...register('asunto')} className="form-input" placeholder="Reunión de comité, capacitación..." />
                {errors.asunto && <p className="form-error">{errors.asunto.message}</p>}
              </div>
              <div>
                <label className="form-label">Fecha del evento *</label>
                <input {...register('fecha_evento')} type="date" className="form-input" min={new Date().toISOString().split('T')[0]} />
                {errors.fecha_evento && <p className="form-error">{errors.fecha_evento.message}</p>}
              </div>
              <div />
              <div>
                <label className="form-label">Hora inicio *</label>
                <input {...register('hora_inicio')} type="time" className="form-input" />
                {errors.hora_inicio && <p className="form-error">{errors.hora_inicio.message}</p>}
              </div>
              <div>
                <label className="form-label">Hora fin *</label>
                <input {...register('hora_fin')} type="time" className="form-input" />
                {errors.hora_fin && <p className="form-error">{errors.hora_fin.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">Descripción del evento</label>
                <textarea {...register('descripcion')} rows={3} className="form-input" placeholder="Descripción adicional..." />
              </div>
            </div>
          </div>

          {/* Invitados */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-primary-700 uppercase tracking-wide">Correos de invitados</h3>
              <button type="button" onClick={() => append({ email: '' })} className="btn-secondary text-xs px-3 py-1.5">
                <Plus size={14} /> Agregar
              </button>
            </div>
            {fields.length === 0 && (
              <p className="text-xs text-gray-400 italic">Sin invitados. Haga clic en "Agregar" para añadir convocados.</p>
            )}
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    {...register(`invitados.${idx}.email`)}
                    type="email"
                    className="form-input flex-1"
                    placeholder="invitado@correo.com"
                  />
                  <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            {onClose && (
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            )}
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Guardando...' : 'Solicitar Reservación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
