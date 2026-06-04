import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, Filter } from 'lucide-react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'

export default function ReportsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [salas, setSalas] = useState<{ id: number; nombre: string }[]>([])
  const [servicios, setServicios] = useState<{ id: number; nombre: string }[]>([])
  const [filters, setFilters] = useState({
    sala_id: '',
    servicio_id: '',
    estado: '',
    desde: '',
    hasta: '',
    solicitante: '',
  })

  useEffect(() => {
    supabase.from('salas').select('id, nombre').then(({ data }) => setSalas(data ?? []))
    supabase.from('servicios').select('id, nombre').then(({ data }) => setServicios(data ?? []))
    fetchReport()
  }, [])

  async function fetchReport() {
    setLoading(true)
    let q = supabase
      .from('reservaciones')
      .select(`
        id, asunto, descripcion, fecha_evento, hora_inicio, hora_fin,
        estado, observaciones, fecha_solicitud,
        sala:salas(nombre, sede:sedes(nombre)),
        solicitante:usuarios!reservaciones_solicitante_id_fkey(
          nombres, identificacion, email, telefono,
          servicio:servicios(nombre)
        ),
        invitados(email)
      `)
      .order('fecha_evento', { ascending: false })

    if (filters.sala_id)    q = q.eq('sala_id', filters.sala_id)
    if (filters.estado)     q = q.eq('estado', filters.estado)
    if (filters.desde)      q = q.gte('fecha_evento', filters.desde)
    if (filters.hasta)      q = q.lte('fecha_evento', filters.hasta)

    const { data } = await q
    let result = (data as any[]) ?? []

    if (filters.servicio_id) {
      result = result.filter((r: any) => String(r.solicitante?.servicio_id) === filters.servicio_id)
    }
    if (filters.solicitante) {
      const s = filters.solicitante.toLowerCase()
      result = result.filter((r: any) =>
        r.solicitante?.nombres?.toLowerCase().includes(s) ||
        r.solicitante?.identificacion?.includes(s)
      )
    }

    setRows(result)
    setLoading(false)
  }

  function exportExcel() {
    const data = rows.map(r => ({
      'ID': r.id,
      'Sala': r.sala?.nombre ?? '',
      'Sede': r.sala?.sede?.nombre ?? '',
      'Asunto': r.asunto,
      'Descripción': r.descripcion ?? '',
      'Fecha Evento': r.fecha_evento,
      'Hora Inicio': r.hora_inicio,
      'Hora Fin': r.hora_fin,
      'Estado': r.estado,
      'Solicitante': r.solicitante?.nombres ?? '',
      'Identificación': r.solicitante?.identificacion ?? '',
      'Email': r.solicitante?.email ?? '',
      'Teléfono': r.solicitante?.telefono ?? '',
      'Servicio': r.solicitante?.servicio?.nombre ?? '',
      'Invitados': r.invitados?.map((i: any) => i.email).join(', ') ?? '',
      'Observaciones': r.observaciones ?? '',
      'Fecha Solicitud': r.fecha_solicitud ? format(new Date(r.fecha_solicitud), 'dd/MM/yyyy HH:mm') : '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = Object.keys(data[0] ?? {}).map(() => ({ wch: 20 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reservaciones')
    XLSX.writeFile(wb, `Reservaciones_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
    toast.success('Reporte exportado exitosamente')
  }

  const statusClass: Record<string, string> = {
    pendiente: 'badge-pending', aceptada: 'badge-accepted',
    rechazada: 'badge-rejected', cancelada: 'badge-cancelled', reprogramada: 'badge-rescheduled',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">{rows.length} registro(s)</p>
        </div>
        <button onClick={exportExcel} disabled={rows.length === 0} className="btn-success">
          <Download size={16} /> Exportar Excel
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-primary-500" />
          <h2 className="font-semibold text-gray-700">Filtros</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="form-label">Sala</label>
            <select value={filters.sala_id} onChange={e => setFilters(f => ({ ...f, sala_id: e.target.value }))} className="form-input">
              <option value="">Todas</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Servicio</label>
            <select value={filters.servicio_id} onChange={e => setFilters(f => ({ ...f, servicio_id: e.target.value }))} className="form-input">
              <option value="">Todos</option>
              {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Estado</label>
            <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))} className="form-input">
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
              <option value="cancelada">Cancelada</option>
              <option value="reprogramada">Reprogramada</option>
            </select>
          </div>
          <div>
            <label className="form-label">Desde</label>
            <input type="date" value={filters.desde} onChange={e => setFilters(f => ({ ...f, desde: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label className="form-label">Hasta</label>
            <input type="date" value={filters.hasta} onChange={e => setFilters(f => ({ ...f, hasta: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label className="form-label">Solicitante</label>
            <input
              type="text"
              value={filters.solicitante}
              onChange={e => setFilters(f => ({ ...f, solicitante: e.target.value }))}
              placeholder="Nombre o ID"
              className="form-input"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={fetchReport} disabled={loading} className="btn-primary">
            {loading ? 'Buscando...' : 'Aplicar filtros'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary-50 text-primary-700">
              <tr>
                {['ID','Sala','Asunto','Solicitante','Servicio','Fecha','Horario','Estado','Invitados'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">#{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{r.sala?.nombre}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.asunto}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-700">{r.solicitante?.nombres}</div>
                    <div className="text-xs text-gray-400">{r.solicitante?.identificacion}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.solicitante?.servicio?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {format(new Date(r.fecha_evento + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.hora_inicio}–{r.hora_fin}</td>
                  <td className="px-4 py-3"><span className={statusClass[r.estado]}>{r.estado}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.invitados?.length ?? 0}</td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
