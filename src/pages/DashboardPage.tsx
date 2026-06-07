import { useEffect, useRef, useState } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { supabase } from '../lib/supabase'
import { CalendarDays, CheckCircle, XCircle, Clock, Filter, X } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    servicio_id: '', sala_id: '', estado: '', desde: '', hasta: '',
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasFilters = Object.values(filters).some(v => v !== '')

  useEffect(() => {
    supabase.from('servicios').select('id, nombre').order('nombre').then(({ data }) => setServices(data ?? []))
    supabase.from('salas').select('id, nombre').eq('activa', true).order('nombre').then(({ data }) => setSalas(data ?? []))
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadData(), 50)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters])

  async function loadData() {
    setLoading(true)

    // Query simplificada sin FK hint — evita errores por nombre incorrecto de FK
    let q = supabase.from('reservaciones').select(`
      id, estado, fecha_evento, sala_id,
      sala:salas(id, nombre),
      solicitante:usuarios(servicio_id, servicio:servicios(nombre))
    `)

    if (filters.sala_id)  q = q.eq('sala_id', filters.sala_id)
    if (filters.estado)   q = q.eq('estado', filters.estado)
    if (filters.desde)    q = q.gte('fecha_evento', filters.desde)
    if (filters.hasta)    q = q.lte('fecha_evento', filters.hasta)

    const { data, error } = await q
    setLoading(false)

    if (error) { console.error('Dashboard query error:', error); return }
    if (!data) return

    // Filtro de servicio en cliente (join anidado no soporta .eq en client)
    const rows = filters.servicio_id
      ? data.filter((r: any) => String(r.solicitante?.servicio_id) === filters.servicio_id)
      : data

    const s: Stats = { total: rows.length, pendiente: 0, aceptada: 0, rechazada: 0, cancelada: 0, reprogramada: 0 }
    const svcMap: Record<string, number> = {}
    const roomMap: Record<string, number> = {}
    const monthMap: Record<string, Record<string, number>> = {}
    const statuses = ['aceptada', 'rechazada', 'pendiente']

    rows.forEach((r: any) => {
      if (r.estado in s) s[r.estado as keyof Stats] = (s[r.estado as keyof Stats] as number) + 1

      const svcName = r.solicitante?.servicio?.nombre ?? 'Sin servicio'
      svcMap[svcName] = (svcMap[svcName] ?? 0) + 1

      const roomName = r.sala?.nombre ?? 'Desconocida'
      roomMap[roomName] = (roomMap[roomName] ?? 0) + 1

      const month = r.fecha_evento?.substring(0, 7) ?? ''
      if (month) {
        if (!monthMap[month]) monthMap[month] = {}
        statuses.forEach(st => {
          monthMap[month][st] = (monthMap[month][st] ?? 0) + (r.estado === st ? 1 : 0)
        })
      }
    })

    setStats(s)
    setByService(Object.entries(svcMap).map(([name, y]) => ({ name, y })).sort((a, b) => b.y - a.y).slice(0, 10))
    setByRoom(Object.entries(roomMap).map(([name, y]) => ({ name, y })))
    const months = Object.keys(monthMap).sort()
    setMonthCategories(months)
    setMonthly(statuses.map(st => ({
      name: st.charAt(0).toUpperCase() + st.slice(1),
      data: months.map(m => monthMap[m][st] ?? 0),
    })))
  }

  const clearFilters = () => setFilters({ servicio_id: '', sala_id: '', estado: '', desde: '', hasta: '' })

  const chartHeight = 260

  const odooTooltip: Highcharts.TooltipOptions = {
    useHTML: true, borderWidth: 0, borderRadius: 12,
    shadow: { color: 'rgba(27,79,138,0.20)', width: 20, offsetY: 8 },
    padding: 0, backgroundColor: 'transparent',
    formatter(this: any) {
      return `<div style="background:#fff;border-radius:12px;padding:14px 18px;min-width:180px;
        font-family:Inter,Arial,sans-serif;box-shadow:0 8px 32px rgba(27,79,138,0.16);border:1px solid #EFF6FF">
        <div style="color:#1B4F8A;font-weight:700;font-size:13px;margin-bottom:10px;
          padding-bottom:8px;border-bottom:2px solid #EFF6FF">${this.x ?? this.point?.name ?? ''}</div>
        ${this.points
          ? this.points.map((p: any) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="width:10px;height:10px;border-radius:50%;background:${p.color};flex-shrink:0;
                box-shadow:0 2px 4px ${p.color}66"></span>
              <span style="color:#64748B;font-size:12px;flex:1">${p.series.name}</span>
              <span style="color:#1B4F8A;font-weight:700;font-size:15px">${p.y}</span>
            </div>`).join('')
          : `<div style="display:flex;align-items:center;gap:8px">
              <span style="width:10px;height:10px;border-radius:50%;background:${this.color};flex-shrink:0"></span>
              <span style="color:#64748B;font-size:12px;flex:1">${this.series?.name ?? ''}</span>
              <span style="color:#1B4F8A;font-weight:700;font-size:15px">${this.y}</span>
             </div>`}
      </div>`
    },
    shared: true,
  }

  const pieOptions: Highcharts.Options = {
    chart: { type: 'pie', style: { fontFamily: 'Inter, sans-serif' }, height: chartHeight, backgroundColor: 'transparent' },
    title: { text: 'Reservaciones por Estado', style: { color: '#1B4F8A', fontSize: '14px', fontWeight: '600' } },
    tooltip: { pointFormat: '<b>{point.y}</b> ({point.percentage:.1f}%)' },
    plotOptions: { pie: { allowPointSelect: true, cursor: 'pointer', innerSize: '40%',
      dataLabels: { enabled: true, format: '<b>{point.name}</b>: {point.y}', style: { fontSize: '11px' } } } },
    series: [{ type: 'pie', data: [
      { name: 'Aceptadas',     y: stats.aceptada,     color: '#10B981' },
      { name: 'Pendientes',    y: stats.pendiente,    color: '#F59E0B' },
      { name: 'Rechazadas',    y: stats.rechazada,    color: '#EF4444' },
      { name: 'Canceladas',    y: stats.cancelada,    color: '#9CA3AF' },
      { name: 'Reprogramadas', y: stats.reprogramada, color: '#3B82F6' },
    ] }],
    credits: { enabled: false },
  }

  const barServiceOptions: Highcharts.Options = {
    chart: { type: 'bar', style: { fontFamily: 'Inter, sans-serif' }, height: chartHeight, backgroundColor: 'transparent' },
    title: { text: 'Reservaciones por Servicio', style: { color: '#1B4F8A', fontSize: '14px', fontWeight: '600' } },
    xAxis: { categories: byService.map(s => s.name), title: { text: null }, labels: { style: { fontSize: '11px', color: '#64748B' } } },
    yAxis: { min: 0, title: { text: null }, gridLineColor: '#EFF6FF' },
    plotOptions: { bar: { dataLabels: { enabled: true, style: { fontWeight: '600', color: '#1B4F8A' } }, borderRadius: 4 } },
    tooltip: odooTooltip,
    series: [{ type: 'bar', name: 'Reservaciones', data: byService.map(s => s.y),
      color: { linearGradient: { x1: 0, x2: 1, y1: 0, y2: 0 }, stops: [[0, '#2B6CB0'], [1, '#63B3ED']] } as any }],
    credits: { enabled: false },
  }

  const columnRoomOptions: Highcharts.Options = {
    chart: { type: 'column', style: { fontFamily: 'Inter, sans-serif' }, height: chartHeight, backgroundColor: 'transparent' },
    title: { text: 'Uso por Sala', style: { color: '#1B4F8A', fontSize: '14px', fontWeight: '600' } },
    xAxis: { categories: byRoom.map(r => r.name), labels: { style: { fontSize: '11px', color: '#64748B' } } },
    yAxis: { min: 0, title: { text: null }, gridLineColor: '#EFF6FF' },
    plotOptions: { column: { dataLabels: { enabled: true, style: { fontWeight: '600', color: '#1B4F8A' } }, borderRadius: 4 } },
    tooltip: odooTooltip,
    series: [{ type: 'column', name: 'Reservaciones', data: byRoom.map(r => r.y),
      color: { linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 }, stops: [[0, '#1B4F8A'], [1, '#63B3ED']] } as any }],
    credits: { enabled: false },
  }

  const trendOptions: Highcharts.Options = {
    chart: { type: 'areaspline', style: { fontFamily: 'Inter, sans-serif' }, height: chartHeight, backgroundColor: 'transparent' },
    title: { text: 'Tendencia Mensual', style: { color: '#1B4F8A', fontSize: '14px', fontWeight: '600' } },
    xAxis: { categories: monthCategories, labels: { style: { fontSize: '11px', color: '#64748B' } } },
    yAxis: { title: { text: null }, gridLineColor: '#EFF6FF' },
    plotOptions: { areaspline: { fillOpacity: 0.12, lineWidth: 2.5, marker: { enabled: true, radius: 4 } } },
    tooltip: { ...odooTooltip, shared: true },
    series: monthly.map((s, i) => ({
      type: 'areaspline' as const, name: s.name, data: s.data,
      color: ['#10B981', '#EF4444', '#F59E0B'][i],
    })),
    credits: { enabled: false },
  }

  const kpiCards = [
    { label: 'Total Reservaciones', value: stats.total,      icon: CalendarDays, color: 'text-primary-600 bg-primary-50',  border: '#1B4F8A' },
    { label: 'Aceptadas',           value: stats.aceptada,   icon: CheckCircle,  color: 'text-emerald-600 bg-emerald-50', border: '#10B981' },
    { label: 'Pendientes',          value: stats.pendiente,  icon: Clock,        color: 'text-yellow-600 bg-yellow-50',   border: '#F59E0B' },
    { label: 'Rechazadas',          value: stats.rechazada,  icon: XCircle,      color: 'text-red-600 bg-red-50',         border: '#EF4444' },
  ]

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary-800">Dashboard</h1>
        <p className="text-xs text-gray-500 mt-0.5">Métricas de uso de salas de reuniones</p>
      </div>

      {/* ── Barra de filtros ── */}
      <div className="bg-white rounded-2xl border border-primary-100 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-primary-700 font-semibold text-sm">
            <Filter size={15} /><span>Filtros</span>
            {hasFilters && (
              <span className="ml-1 bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                {Object.values(filters).filter(v => v !== '').length}
              </span>
            )}
          </div>
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
              <X size={13} /> Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="form-label text-xs">Sala</label>
            <select value={filters.sala_id} onChange={e => setFilters(f => ({ ...f, sala_id: e.target.value }))} className="form-input py-1.5 text-xs">
              <option value="">Todas</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label text-xs">Servicio</label>
            <select value={filters.servicio_id} onChange={e => setFilters(f => ({ ...f, servicio_id: e.target.value }))} className="form-input py-1.5 text-xs">
              <option value="">Todos</option>
              {services.map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label text-xs">Estado</label>
            <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))} className="form-input py-1.5 text-xs">
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
              <option value="cancelada">Cancelada</option>
              <option value="reprogramada">Reprogramada</option>
            </select>
          </div>
          <div>
            <label className="form-label text-xs">Desde</label>
            <input type="date" value={filters.desde} onChange={e => setFilters(f => ({ ...f, desde: e.target.value }))} className="form-input py-1.5 text-xs" />
          </div>
          <div>
            <label className="form-label text-xs">Hasta</label>
            <input type="date" value={filters.hasta} onChange={e => setFilters(f => ({ ...f, hasta: e.target.value }))} className="form-input py-1.5 text-xs" />
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color, border }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4"
            style={{ borderLeft: `4px solid ${border}` }}>
            <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>
              <Icon size={22} />
            </div>
            <div>
              {loading
                ? <div className="h-8 w-12 bg-gray-100 rounded animate-pulse mb-1" />
                : <p className="text-3xl font-bold text-gray-800">{value}</p>}
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-72 flex items-center justify-center">
              <div className="text-gray-300 text-sm">Cargando datos...</div>
            </div>
          ))}
        </div>
      ) : stats.total === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <CalendarDays size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">No hay reservaciones que coincidan con los filtros</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <HighchartsReact highcharts={Highcharts} options={pieOptions} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <HighchartsReact highcharts={Highcharts} options={columnRoomOptions} />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <HighchartsReact highcharts={Highcharts} options={barServiceOptions} />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <HighchartsReact highcharts={Highcharts} options={trendOptions} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
