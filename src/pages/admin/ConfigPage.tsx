import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ConfigPage() {
  const [servicios, setServicios] = useState<any[]>([])
  const [newServicio, setNewServicio] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('servicios').select('*').order('nombre')
    setServicios(data ?? [])
  }

  async function addServicio() {
    if (!newServicio.trim()) return
    await supabase.from('servicios').insert({ nombre: newServicio.trim() })
    setNewServicio('')
    load()
  }

  async function updateServicio(id: number) {
    await supabase.from('servicios').update({ nombre: editValue }).eq('id', id)
    setEditingId(null)
    toast.success('Servicio actualizado')
    load()
  }

  async function deleteServicio(id: number) {
    if (!confirm('¿Eliminar servicio?')) return
    await supabase.from('servicios').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-primary-800">Configuración</h1>

      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-700">Servicios / Dependencias</h2>
        <div className="flex gap-2">
          <input
            value={newServicio}
            onChange={e => setNewServicio(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addServicio()}
            placeholder="Nombre del servicio..."
            className="form-input flex-1"
          />
          <button onClick={addServicio} className="btn-primary px-3"><Plus size={16} /></button>
        </div>

        <ul className="divide-y divide-gray-100">
          {servicios.map(s => (
            <li key={s.id} className="flex items-center gap-2 py-2.5">
              {editingId === s.id ? (
                <>
                  <input value={editValue} onChange={e => setEditValue(e.target.value)} className="form-input flex-1 py-1" />
                  <button onClick={() => updateServicio(s.id)} className="btn-primary text-xs px-3 py-1">Guardar</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1">Cancelar</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-700">{s.nombre}</span>
                  <button onClick={() => { setEditingId(s.id); setEditValue(s.nombre) }} className="text-primary-500 hover:text-primary-700"><Pencil size={14} /></button>
                  <button onClick={() => deleteServicio(s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
