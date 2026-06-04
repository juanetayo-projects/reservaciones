import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = 'agenda@clinicasantabarbara.com'

const templates: Record<string, (data: any) => { subject: string; html: string }> = {
  accepted: (d) => ({
    subject: `✅ Reservación Aceptada — ${d.asunto}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(27,79,138,0.12)">
        <div style="background:#1B4F8A;padding:24px 32px;text-align:center">
          <h2 style="color:#fff;margin:0;font-size:20px">Clínica Santa Bárbara</h2>
          <p style="color:#93C5FD;margin:4px 0 0;font-size:13px">Agenda de Salas de Reuniones</p>
        </div>
        <div style="padding:32px">
          <div style="background:#ECFDF5;border-left:4px solid #10B981;padding:16px;border-radius:8px;margin-bottom:24px">
            <h3 style="color:#065F46;margin:0 0 4px;font-size:16px">✅ Su reservación ha sido ACEPTADA</h3>
            <p style="color:#047857;margin:0;font-size:14px">Le informamos que su solicitud fue aprobada.</p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr style="background:#EFF6FF"><td style="padding:10px 16px;color:#1B4F8A;font-weight:600;width:140px">Sala</td><td style="padding:10px 16px;color:#374151">${d.sala?.nombre ?? ''}</td></tr>
            <tr><td style="padding:10px 16px;color:#1B4F8A;font-weight:600">Asunto</td><td style="padding:10px 16px;color:#374151">${d.asunto}</td></tr>
            <tr style="background:#EFF6FF"><td style="padding:10px 16px;color:#1B4F8A;font-weight:600">Fecha</td><td style="padding:10px 16px;color:#374151">${d.fecha_evento}</td></tr>
            <tr><td style="padding:10px 16px;color:#1B4F8A;font-weight:600">Horario</td><td style="padding:10px 16px;color:#374151">${d.hora_inicio} – ${d.hora_fin}</td></tr>
          </table>
          ${d.observaciones ? `<div style="background:#FEF3C7;padding:12px 16px;border-radius:8px;margin-top:20px;font-size:14px;color:#92400E"><strong>Observación:</strong> ${d.observaciones}</div>` : ''}
        </div>
        <div style="background:#F9FAFB;padding:16px 32px;text-align:center;font-size:12px;color:#9CA3AF">
          Clínica Santa Bárbara — Sistema de Agenda de Salas
        </div>
      </div>`,
  }),
  rejected: (d) => ({
    subject: `❌ Reservación Rechazada — ${d.asunto}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(27,79,138,0.12)">
        <div style="background:#1B4F8A;padding:24px 32px;text-align:center">
          <h2 style="color:#fff;margin:0;font-size:20px">Clínica Santa Bárbara</h2>
          <p style="color:#93C5FD;margin:4px 0 0;font-size:13px">Agenda de Salas de Reuniones</p>
        </div>
        <div style="padding:32px">
          <div style="background:#FEF2F2;border-left:4px solid #EF4444;padding:16px;border-radius:8px;margin-bottom:24px">
            <h3 style="color:#991B1B;margin:0 0 4px;font-size:16px">❌ Su reservación ha sido RECHAZADA</h3>
            <p style="color:#B91C1C;margin:0;font-size:14px">Lamentamos informarle que su solicitud no pudo ser aprobada.</p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr style="background:#EFF6FF"><td style="padding:10px 16px;color:#1B4F8A;font-weight:600;width:140px">Sala</td><td style="padding:10px 16px;color:#374151">${d.sala?.nombre ?? ''}</td></tr>
            <tr><td style="padding:10px 16px;color:#1B4F8A;font-weight:600">Asunto</td><td style="padding:10px 16px;color:#374151">${d.asunto}</td></tr>
            <tr style="background:#EFF6FF"><td style="padding:10px 16px;color:#1B4F8A;font-weight:600">Fecha</td><td style="padding:10px 16px;color:#374151">${d.fecha_evento}</td></tr>
          </table>
          ${d.observaciones ? `<div style="background:#FEF3C7;padding:12px 16px;border-radius:8px;margin-top:20px;font-size:14px;color:#92400E"><strong>Motivo:</strong> ${d.observaciones}</div>` : ''}
          <p style="font-size:14px;color:#6B7280;margin-top:20px">Para más información, comuníquese con el área de gestión de salas.</p>
        </div>
        <div style="background:#F9FAFB;padding:16px 32px;text-align:center;font-size:12px;color:#9CA3AF">
          Clínica Santa Bárbara — Sistema de Agenda de Salas
        </div>
      </div>`,
  }),
  rescheduled: (d) => ({
    subject: `🔄 Reservación Reprogramada — ${d.asunto}`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(27,79,138,0.12)">
        <div style="background:#1B4F8A;padding:24px 32px;text-align:center">
          <h2 style="color:#fff;margin:0;font-size:20px">Clínica Santa Bárbara</h2>
        </div>
        <div style="padding:32px">
          <div style="background:#EFF6FF;border-left:4px solid #3B82F6;padding:16px;border-radius:8px;margin-bottom:24px">
            <h3 style="color:#1E3A8A;margin:0 0 4px;font-size:16px">🔄 Su reservación ha sido REPROGRAMADA</h3>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr style="background:#EFF6FF"><td style="padding:10px 16px;color:#1B4F8A;font-weight:600;width:140px">Sala</td><td style="padding:10px 16px;color:#374151">${d.sala?.nombre ?? ''}</td></tr>
            <tr><td style="padding:10px 16px;color:#1B4F8A;font-weight:600">Asunto</td><td style="padding:10px 16px;color:#374151">${d.asunto}</td></tr>
            <tr style="background:#EFF6FF"><td style="padding:10px 16px;color:#1B4F8A;font-weight:600">Nueva fecha</td><td style="padding:10px 16px;color:#374151">${d.fecha_evento}</td></tr>
            <tr><td style="padding:10px 16px;color:#1B4F8A;font-weight:600">Nuevo horario</td><td style="padding:10px 16px;color:#374151">${d.hora_inicio} – ${d.hora_fin}</td></tr>
          </table>
          ${d.observaciones ? `<div style="background:#FEF3C7;padding:12px 16px;border-radius:8px;margin-top:20px;font-size:14px;color:#92400E"><strong>Motivo:</strong> ${d.observaciones}</div>` : ''}
        </div>
        <div style="background:#F9FAFB;padding:16px 32px;text-align:center;font-size:12px;color:#9CA3AF">
          Clínica Santa Bárbara — Sistema de Agenda de Salas
        </div>
      </div>`,
  }),
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })

  const { type, to, reservationData } = await req.json()
  const template = templates[type]?.(reservationData)
  if (!template) return new Response('Unknown email type', { status: 400 })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject: template.subject, html: template.html }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { status: res.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } })
})
