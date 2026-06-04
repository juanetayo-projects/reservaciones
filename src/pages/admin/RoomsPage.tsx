import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

const salaSchema = z.object({
  sede_id: z.coerce.number().min(1, 'Seleccione sede'),
  nombre: z.string().min(2, 'Requerido'),
  ubicacion: z.string().optional(),
  descripcion: z.string().optional(),
  capacidad: z.coerce.number().min(1).default(10),
  activa: z.boolean().default(true),
})
const sedeSchema = z.object({
  nombre: z.string().min(2, 'Requerido'),
  descripcion: z.string().optional(),
})
type SalaForm = z.infer<typeof salaSchema>
type SedeForm = z.infer<typeof sedeSchema>

export default function RoomsPage() {
  const [salas, setSalas] = useState<any[]>([])
  const [sedes, setSedes] = useState<any[]>([])
  const [tab, setTab] = useState<'salas' | 'sedes'>('salas')
  const [showSalaForm, setShowSalaForm] = useState(false)
  const [showSedeForm, setShowSedeForm] = useState(false)
  const [editingSala, setEditingSala] = useState<any>(null)
  const [editingSede, setEditingSede] = useState<any>(null)

  const salaForm = useForm<SalaForm>({ resolver: zodResolver(salaSchema) })
  const sedeForm = useForm<SedeForm>({ resolver: zodResolver(sedeSchema) })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: s }, { data: sd }] = await Promise.all([
      supabase.from('salas').select('*, sede:sedes(nombre)').order('nombre'),
      supabase.from('sedes').select('*').order('nombre'),
    ])
    setSalas(s ?? [])
    setSedes(sd ?? [])
  }

  function openNewSala() { setEditingSala(null); salaForm.reset({ capacidad: 10, activa: true }); setShowSalaForm(true) }
  function openEditSala(s: any) {
    setEditingSala(s)
    salaForm.reset({ sede_id: s.sede_id, nombre: s.nombre, ubicacion: s.ubicacion ?? '', descripcion: s.descripcion ?? '', capacidad: s.capacidad, activa: s.activa })
    setShowSalaForm(true)
  }

  async function onSalaSubmit(data: SalaForm) {
    if (editingSala) {
      const { error } = await supabase.from('salas').update(data).eq('id', editingSala.id)
      if (error) { toast.error(error.message); return }
    } else {
      const { error } = await supabase.from('salas').insert(data)
      if (error) { toast.error(error.message); return }
    }
    toast.success('Sala guardada'); setShowSalaForm(false); loadAll()
  }

  async function deleteSala(id: number) {
    if (!confirm('¿Eliminar sala?')) return
    await supabase.from('salas').delete().eq('id', id)
    loadAll()
  }

  async function onSedeSubmit(data: SedeForm) {
    if (editingSede) {
      await supabase.from('sedes').update(data).eq('id', editingSede.id)
    } else {
      await supabase.from('sedes').insert(data)
    }
    toast.success('Sede guardada'); setShowSedeForm(false); loadAll()
  }

  async function deleteSede(id: number) {
    if (!confirm('¿Eliminar sede?')) return
    await supabase.from('sedes').delete().eq('id', id)
    loadAll()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-800">Salas y Sedes</h1>
        <button onClick={tab === 'salas' ? openNewSala : () => { setEditingSede(null); sedeForm.reset(); setShowSedeForm(true) }} className="btn-primary">
          <Plus size={16} /> {tab === 'salas' ? 'Nueva sala' : 'Nueva sede'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['salas', 'sedes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'border-b-2 border-primary-600 text-primary-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'salas' && (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-primary-50 text-primary-700">
              <tr>{['Nombre','Sede','Ubicación','Capacidad','Estado',''].map(h => <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {salas.map(s => (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{s.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{s.sede?.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{s.ubicacion ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.capacidad} sillas</td>
                  <td className="px-4 py-3"><span className={`badge ${s.activa ? 'badge-accepted' : 'badge-cancelled'}`}>{s.activa ? 'Activa' : 'Inactiva'}</span></td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => openEditSala(s)} className="text-primary-600 hover:text-primary-800"><Pencil size={15} /></button>
                    <button onClick={() => deleteSala(s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sedes' && (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-primary-50 text-primary-700">
              <tr>{['Nombre','Descripción',''].map(h => <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {sedes.map(s => (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">{s.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{s.descripcion ?? '—'}</td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => { setEditingSede(s); sedeForm.reset({ nombre: s.nombre, descripcion: s.descripcion ?? '' }); setShowSedeForm(true) }} className="text-primary-600 hover:text-primary-800"><Pencil size={15} /></button>
                    <button onClick={() => deleteSede(s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sala Form Modal */}
      {showSalaForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-primary-800 mb-5">{editingSala ? 'Editar sala' : 'Nueva sala'}</h2>
            <form onSubmit={salaForm.handleSubmit(onSalaSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Sede *</label>
                  <select {...salaForm.register('sede_id')} className="form-input">
                    <option value="">Seleccione</option>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Nombre *</label>
                  <input {...salaForm.register('nombre')} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Ubicación</label>
                  <input {...salaForm.register('ubicacion')} className="form-input" placeholder="Piso 8" />
                </div>
                <div>
                  <label className="form-label">Capacidad (sillas)</label>
                  <input {...salaForm.register('capacidad')} type="number" className="form-input" />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Descripción</label>
                  <textarea {...salaForm.register('descripcion')} rows={2} className="form-input" />
                </div>
                <div className="flex items-center gap-2">
                  <input {...salaForm.register('activa')} type="checkbox" id="activa" className="w-4 h-4 rounded" />
                  <label htmlFor="activa" className="text-sm font-medium text-gray-700">Sala activa</label>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowSalaForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sede Form Modal */}
      {showSedeForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-primary-800 mb-5">{editingSede ? 'Editar sede' : 'Nueva sede'}</h2>
            <form onSubmit={sedeForm.handleSubmit(onSedeSubmit)} className="space-y-4">
              <div>
                <label className="form-label">Nombre *</label>
                <input {...sedeForm.register('nombre')} className="form-input" />
              </div>
              <div>
                <label className="form-label">Descripción</label>
                <textarea {...sedeForm.register('descripcion')} rows={3} className="form-input" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowSedeForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
