import { useEffect, useRef, useState } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { supabase } from '../lib/supabase'
import { CalendarDays, CheckCircle, XCircle, Clock, Filter } from 'lucide-react'

interface Stats {
  total: number; pendiente: number; aceptada: number
  rechazada: number; cancelada: number; reprogramada: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, pendiente: 0, aceptada: 0, rechazada: 0, cancelada: 0, reprogramada: 0 })
  const [byService, setByService] = useState<{ name: string; y: number }[]>([])
  const [byRoom, setByRoom] = useState<{ name: string; y: number }[]>([])
  const [monthly, setMonthly] = useState<{ name: string; data: number[] }[]>([])
  const [monthCategories, setMonthCategories] = useState<string[]>([])
  const [services, setServices] = useState<{ id: number; nombre: string }[]>([])
  const [salas, setSalas] = useState<{ id: number; nombre: string }[]>([])
  const [filters, setFilters] = useState({
    servicio_id: '', sala_id: '', estado: '', desde: '', hasta: '',
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.from('servicios').select('id, nombre').then(({ data }) => setServices(data ?? []))
    supabase.from('salas').select('id, nombre').eq('activa', true).then(({ data }) => setSalas(data ?? []))
  }, [])

  // Auto-filtro al cambiar filtros
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadData(), 0)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters])

  async function loadData() {
    let q = supabase.from('reservaciones').select(`
      id, estado, fecha_evento,
      sala:salas(id, nombre),
      solicitante:usuarios!reservaciones_solicitante_id_fkey(servicio_id, servicio:servicios(nombre))
    `)
    if (filters.sala_id)     q = q.eq('sala_id', filters.sala_id)
    if (filters.estado)      q = q.eq('estado', filters.estado)
    if (filters.desde)       q = q.gte('fecha_evento', filters.desde)
    if (filters.hasta)       q = q.lte('fecha_evento', filters.hasta)
    if (filters.servicio_id) q = q.eq('solicitante.servicio_id', filters.servicio_id)

    const { data } = await q
    if (!data) return

    const s: Stats = { total: data.length, pendiente: 0, aceptada: 0, rechazada: 0, cancelada: 0, reprogramada: 0 }
    const svcMap: Record<string, number> = {}
    const roomMap: Record<string, number> = {}
    const monthMap: Record<string, Record<string, number>> = {}
    const statuses = ['aceptada', 'rechazada', 'pendiente']

    data.forEach((r: any) => {
      s[r.estado as keyof Stats] = (s[r.estado as keyof Stats] as number) + 1

      const svcName = r.solicitante?.servicio?.nombre ?? 'Sin servicio'
      svcMap[svcName] = (svcMap[svcName] ?? 0) + 1

      const roomName = r.sala?.nombre ?? 'Desconocida'
      roomMap[roomName] = (roomMap[roomName] ?? 0) + 1

      const month = r.fecha_evento?.substring(0, 7) ?? ''
      if (month) {
        if (!monthMap[month]) monthMap[month] = {}
        statuses.forEach(st => { monthMap[month][st] = (monthMap[month][st] ?? 0) + (r.estado === st ? 1 : 0) })
      }
    })

    setStats(s)
    setByService(Object.entries(svcMap).map(([name, y]) => ({ name, y })).sort((a, b) => b.y - a.y).slice(0, 10))
    setByRoom(Object.entries(roomMap).map(([name, y]) => ({ name, y })))

    const months = Object.keys(monthMap).sort()
    setMonthCategories(months)
    setMonthly(statuses.map(st => ({ name: st.charAt(0).toUpperCase() + st.slice(1), data: months.map(m => monthMap[m][st] ?? 0) })))
  }

  const chartHeight = 240

  const pieOptions: Highcharts.Options = {
    chart: { type: 'pie', style: { fontFamily: 'Inter, sans-serif' }, shadow: true, height: chartHeight },
    title: { text: 'Reservaciones por Estado', style: { color: '#1B4F8A', fontSize: '14px', fontWeight: '600' } },
    tooltip: { pointFormat: '<b>{point.y}</b> reservaciones ({point.percentage:.1f}%)' },
    plotOptions: {
      pie: {
        allowPointSelect: true, cursor: 'pointer', dataLabels: { enabled: true, format: '<b>{point.name}</b>: {point.y}' },
        shadow: { color: 'rgba(27,79,138,0.2)', width: 8, offsetY: 4 },
      },
    },
    series: [{
      type: 'pie',
      data: [
        { name: 'Aceptadas',    y: stats.aceptada,    color: '#10B981' },
        { name: 'Pendientes',   y: stats.pendiente,   color: '#F59E0B' },
        { name: 'Rechazadas',   y: stats.rechazada,   color: '#EF4444' },
        { name: 'Canceladas',   y: stats.cancelada,   color: '#9CA3AF' },
        { name: 'Reprogramadas',y: stats.reprogramada,color: '#3B82F6' },
      ],
    }],
    credits: { enabled: false },
  }

  const barServiceOptions: Highcharts.Options = {
    chart: { type: 'bar', style: { fontFamily: 'Inter, sans-serif' }, shadow: true, height: chartHeight },
    title: { text: 'Reservaciones por Servicio', style: { color: '#1B4F8A', fontSize: '14px', fontWeight: '600' } },
    xAxis: { categories: byService.map(s => s.name), title: { text: null } },
    yAxis: { min: 0, title: { text: 'Cantidad' } },
    plotOptions: { bar: { dataLabels: { enabled: true }, shadow: { color: 'rgba(27,79,138,0.15)', width: 6, offsetY: 3 } } },
    series: [{ type: 'bar', name: 'Reservaciones', data: byService.map(s => s.y), color: '#2B6CB0' }],
    credits: { enabled: false },
  }

  const columnRoomOptions: Highcharts.Options = {
    chart: { type: 'column', style: { fontFamily: 'Inter, sans-serif' }, shadow: true, height: chartHeight },
    title: { text: 'Uso por Sala', style: { color: '#1B4F8A', fontSize: '14px', fontWeight: '600' } },
    xAxis: { categories: byRoom.map(r => r.name) },
    yAxis: { min: 0, title: { text: 'Reservaciones' } },
    plotOptions: { column: { dataLabels: { enabled: true }, shadow: { color: 'rgba(27,79,138,0.15)', width: 6, offsetY: 3 } } },
    series: [{ type: 'column', name: 'Uso', data: byRoom.map(r => r.y), color: '#1B4F8A' }],
    credits: { enabled: false },
  }

  const trendOptions: Highcharts.Options = {
    chart: { type: 'spline', style: { fontFamily: 'Inter, sans-serif' }, shadow: true, height: chartHeight },
    title: { text: 'Tendencia Mensual', style: { color: '#1B4F8A', fontSize: '14px', fontWeight: '600' } },
    xAxis: { categories: monthCategories },
    yAxis: { title: { text: 'Reservaciones' } },
    plotOptions: { spline: { shadow: { color: 'rgba(27,79,138,0.18)', width: 8, offsetY: 4 } } },
    series: monthly.map((s, i) => ({
      type: 'spline' as const,
      name: s.name,
      data: s.data,
      color: ['#10B981', '#EF4444', '#F59E0B'][i],
    })),
    credits: { enabled: false },
  }

  const kpiCards = [
    { label: 'Total', value: stats.total, icon: CalendarDays, color: 'text-primary-600 bg-primary-50' },
    { label: 'Aceptadas', value: stats.aceptada, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Pendientes', value: stats.pendiente, icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Rechazadas', value: stats.rechazada, icon: XCircle, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary-800">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Métricas de uso de salas de reuniones</p>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-xl border border-primary-100 shadow-card px-4 py-2.5">
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-primary-600 font-semibold text-xs flex-shrink-0 mb-1">
            <Filter size={13} /><span>Filtros</span>
          </div>
          <div className="h-5 w-px bg-gray-200 flex-shrink-0" />
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
              {services.map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="min-w-[100px]">
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
          <div className="min-w-[105px]">
            <label className="form-label text-xs mb-0.5">Desde</label>
            <input type="date" value={filters.desde} onChange={e => setFilters(f => ({ ...f, desde: e.target.value }))} className="form-input py-1.5 text-xs" />
          </div>
          <div className="min-w-[105px]">
            <label className="form-label text-xs mb-0.5">Hasta</label>
            <input type="date" value={filters.hasta} onChange={e => setFilters(f => ({ ...f, hasta: e.target.value }))} className="form-input py-1.5 text-xs" />
          </div>
          <button onClick={() => setFilters({ servicio_id:'', sala_id:'', estado:'', desde:'', hasta:'' })}
            className="text-xs text-gray-500 hover:text-primary-600 flex-shrink-0 self-end pb-1.5 underline">
            Limpiar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <HighchartsReact highcharts={Highcharts} options={pieOptions} />
        </div>
        <div className="card">
          <HighchartsReact highcharts={Highcharts} options={columnRoomOptions} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <HighchartsReact highcharts={Highcharts} options={barServiceOptions} />
        </div>
        <div className="card">
          <HighchartsReact highcharts={Highcharts} options={trendOptions} />
        </div>
      </div>
    </div>
  )
}
