import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

const schema = z.object({
  identificacion: z.string().min(3, 'Requerido'),
  nombres: z.string().min(3, 'Requerido'),
  email: z.string().email('Correo inválido'),
  telefono: z.string().optional(),
  perfil_id: z.coerce.number().min(1),
  servicio_id: z.coerce.number().optional(),
})
type FormData = z.infer<typeof schema>

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { perfil_id: 2 },
  })

  useEffect(() => { loadUsers(); supabase.from('servicios').select('*').then(({ data }) => setServicios(data ?? [])) }, [])

  async function loadUsers() {
    const { data } = await supabase.from('usuarios').select('*, perfil:perfiles(nombre), servicio:servicios(nombre)').order('nombres')
    setUsers(data ?? [])
  }

  function openNew() { setEditing(null); reset({ perfil_id: 2 }); setShowForm(true) }
  function openEdit(u: any) {
    setEditing(u)
    reset({ identificacion: u.identificacion, nombres: u.nombres, email: u.email, telefono: u.telefono ?? '', perfil_id: u.perfil_id, servicio_id: u.servicio_id ?? undefined })
    setShowForm(true)
  }

  async function onSubmit(data: FormData) {
    if (editing) {
      const { error } = await supabase.from('usuarios').update(data).eq('id', editing.id)
      if (error) { toast.error(error.message); return }
      toast.success('Usuario actualizado')
    } else {
      const { error } = await supabase.from('usuarios').insert({ ...data, activo: true })
      if (error) { toast.error(error.message); return }
      toast.success('Usuario creado')
    }
    setShowForm(false)
    loadUsers()
  }

  async function deleteUser(id: string) {
    if (!confirm('¿Eliminar este usuario?')) return
    const { error } = await supabase.from('usuarios').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Usuario eliminado'); loadUsers() }
  }

  const filtered = users.filter(u => !search || u.nombres.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.identificacion.includes(search))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-800">Usuarios</h1>
        <button onClick={openNew} className="btn-primary"><Plus size={16} /> Nuevo usuario</button>
      </div>

      <div className="relative w-72">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="form-input pl-9" />
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-primary-50 text-primary-700">
            <tr>
              {['ID','Nombres','Email','Teléfono','Perfil','Servicio',''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 text-xs">{u.identificacion}</td>
                <td className="px-4 py-3 font-medium text-gray-700">{u.nombres}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3 text-gray-600">{u.telefono ?? '—'}</td>
                <td className="px-4 py-3"><span className={`badge ${u.perfil_id === 1 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>{u.perfil?.nombre}</span></td>
                <td className="px-4 py-3 text-gray-600">{u.servicio?.nombre ?? '—'}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEdit(u)} className="text-primary-600 hover:text-primary-800"><Pencil size={15} /></button>
                  <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-primary-800 mb-5">{editing ? 'Editar usuario' : 'Nuevo usuario'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Identificación *</label>
                  <input {...register('identificacion')} className="form-input" />
                  {errors.identificacion && <p className="form-error">{errors.identificacion.message}</p>}
                </div>
                <div>
                  <label className="form-label">Nombres *</label>
                  <input {...register('nombres')} className="form-input" />
                  {errors.nombres && <p className="form-error">{errors.nombres.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className="form-label">Email *</label>
                  <input {...register('email')} type="email" className="form-input" />
                  {errors.email && <p className="form-error">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="form-label">Teléfono</label>
                  <input {...register('telefono')} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Perfil</label>
                  <select {...register('perfil_id')} className="form-input">
                    <option value={1}>Administrador</option>
                    <option value={2}>Analista</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="form-label">Servicio</label>
                  <select {...register('servicio_id')} className="form-input">
                    <option value="">Sin servicio</option>
                    {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
