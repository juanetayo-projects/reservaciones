import { useEffect, useRef, useState } from 'react'
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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.from('salas').select('id, nombre').then(({ data }) => setSalas(data ?? []))
    supabase.from('servicios').select('id, nombre').then(({ data }) => setServicios(data ?? []))
  }, [])

  // Auto-filtro al cambiar cualquier filtro
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchReport(), filters.solicitante ? 400 : 0)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters])

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
      .order('fecha_solicitud', { ascending: false })

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

    // Mantener orden descendente por fecha de registro tras filtros client-side
    result.sort((a: any, b: any) =>
      (b.fecha_solicitud ?? '').localeCompare(a.fecha_solicitud ?? '')
    )

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

      {/* Filters — una sola línea con sombra */}
      <div className="bg-white rounded-xl border border-primary-100 shadow-card px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-primary-600 font-semibold text-sm flex-shrink-0">
            <Filter size={14} />
            <span>Filtros</span>
          </div>
          <div className="h-4 w-px bg-gray-200 flex-shrink-0" />
          <div className="flex items-end gap-2 flex-1 flex-wrap">
          <div className="min-w-[120px] flex-1">
            <label className="form-label text-xs mb-0.5">Sala</label>
            <select value={filters.sala_id} onChange={e => setFilters(f => ({ ...f, sala_id: e.target.value }))} className="form-input py-1.5 text-xs">
              <option value="">Todas</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="min-w-[130px] flex-1">
            <label className="form-label text-xs mb-0.5">Servicio</label>
            <select value={filters.servicio_id} onChange={e => setFilters(f => ({ ...f, servicio_id: e.target.value }))} className="form-input py-1.5 text-xs">
              <option value="">Todos</option>
              {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="min-w-[100px] flex-1">
            <label className="form-label text-xs mb-0.5">Estado</label>
            <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))} className="form-input py-1.5 text-xs">
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
              <option value="cancelada">Cancelada</option>
              <option value="reprogramada">Reprogramada</option>
            </select>
          </div>
          <div className="min-w-[110px]">
            <label className="form-label text-xs mb-0.5">Desde</label>
            <input type="date" value={filters.desde} onChange={e => setFilters(f => ({ ...f, desde: e.target.value }))} className="form-input py-1.5 text-xs" />
          </div>
          <div className="min-w-[110px]">
            <label className="form-label text-xs mb-0.5">Hasta</label>
            <input type="date" value={filters.hasta} onChange={e => setFilters(f => ({ ...f, hasta: e.target.value }))} className="form-input py-1.5 text-xs" />
          </div>
          <div className="min-w-[130px] flex-1">
            <label className="form-label text-xs mb-0.5">Solicitante</label>
            <input type="text" value={filters.solicitante}
              onChange={e => setFilters(f => ({ ...f, solicitante: e.target.value }))}
              placeholder="Nombre o ID" className="form-input py-1.5 text-xs" />
          </div>
          </div>
          {loading && <span className="text-xs text-primary-400 flex-shrink-0 self-end pb-1.5">Buscando...</span>}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['ID','Sala','Asunto','Solicitante','Servicio','Fecha','Horario','Estado','Invitados'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="text-gray-500 text-xs">#{r.id}</td>
                  <td className="font-medium text-gray-700">{r.sala?.nombre}</td>
                  <td className="text-gray-600 max-w-xs truncate">{r.asunto}</td>
                  <td>
                    <div className="font-medium text-gray-700">{r.solicitante?.nombres}</div>
                    <div className="text-xs text-gray-400">{r.solicitante?.identificacion}</div>
                  </td>
                  <td className="text-gray-600">{r.solicitante?.servicio?.nombre ?? '—'}</td>
                  <td className="text-gray-600 whitespace-nowrap">
                    {format(new Date(r.fecha_evento + 'T00:00:00'), 'dd/MM/yyyy', { locale: es })}
                  </td>
                  <td className="text-gray-600 whitespace-nowrap">{r.hora_inicio}–{r.hora_fin}</td>
                  <td><span className={statusClass[r.estado]}>{r.estado}</span></td>
                  <td className="text-xs text-gray-500 text-center">{r.invitados?.length ?? 0}</td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
      </div>
    </div>
  )
}
