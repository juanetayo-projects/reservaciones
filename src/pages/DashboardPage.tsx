import { useEffect, useState } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { supabase } from '../lib/supabase'
import { CalendarDays, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Stats {
  total: number
  pendiente: number
  aceptada: number
  rechazada: number
  cancelada: number
  reprogramada: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, pendiente: 0, aceptada: 0, rechazada: 0, cancelada: 0, reprogramada: 0 })
  const [byService, setByService] = useState<{ name: string; y: number }[]>([])
  const [byRoom, setByRoom] = useState<{ name: string; y: number }[]>([])
  const [monthly, setMonthly] = useState<{ name: string; data: number[] }[]>([])
  const [monthCategories, setMonthCategories] = useState<string[]>([])
  const [filterService, setFilterService] = useState('')
  const [services, setServices] = useState<{ id: number; nombre: string }[]>([])

  useEffect(() => {
    supabase.from('servicios').select('id, nombre').then(({ data }) => setServices(data ?? []))
    loadData()
  }, [])

  useEffect(() => { loadData() }, [filterService])

  async function loadData() {
    let q = supabase.from('reservaciones').select(`
      estado,
      sala:salas(nombre),
      solicitante:usuarios!reservaciones_solicitante_id_fkey(servicio:servicios(nombre)),
      fecha_evento
    `)
    if (filterService) q = q.eq('solicitante.servicio_id', filterService)

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

  const pieOptions: Highcharts.Options = {
    chart: { type: 'pie', style: { fontFamily: 'Inter, sans-serif' }, shadow: true },
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
    chart: { type: 'bar', style: { fontFamily: 'Inter, sans-serif' }, shadow: true },
    title: { text: 'Reservaciones por Servicio', style: { color: '#1B4F8A', fontSize: '14px', fontWeight: '600' } },
    xAxis: { categories: byService.map(s => s.name), title: { text: null } },
    yAxis: { min: 0, title: { text: 'Cantidad' } },
    plotOptions: { bar: { dataLabels: { enabled: true }, shadow: { color: 'rgba(27,79,138,0.15)', width: 6, offsetY: 3 } } },
    series: [{ type: 'bar', name: 'Reservaciones', data: byService.map(s => s.y), color: '#2B6CB0' }],
    credits: { enabled: false },
  }

  const columnRoomOptions: Highcharts.Options = {
    chart: { type: 'column', style: { fontFamily: 'Inter, sans-serif' }, shadow: true },
    title: { text: 'Uso por Sala', style: { color: '#1B4F8A', fontSize: '14px', fontWeight: '600' } },
    xAxis: { categories: byRoom.map(r => r.name) },
    yAxis: { min: 0, title: { text: 'Reservaciones' } },
    plotOptions: { column: { dataLabels: { enabled: true }, shadow: { color: 'rgba(27,79,138,0.15)', width: 6, offsetY: 3 } } },
    series: [{ type: 'column', name: 'Uso', data: byRoom.map(r => r.y), color: '#1B4F8A' }],
    credits: { enabled: false },
  }

  const trendOptions: Highcharts.Options = {
    chart: { type: 'spline', style: { fontFamily: 'Inter, sans-serif' }, shadow: true },
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas de uso de salas de reuniones</p>
        </div>
        <div>
          <select value={filterService} onChange={e => setFilterService(e.target.value)} className="form-input w-56">
            <option value="">Todos los servicios</option>
            {services.map(s => <option key={s.id} value={String(s.id)}>{s.nombre}</option>)}
          </select>
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
