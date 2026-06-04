import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'Clínica Santa Bárbara <agenda@cacsantabarbara.co>'

// ─── Google Calendar link generator ─────────────────────────────────────────
function googleCalendarLink(d: any): string {
  try {
    const fecha = (d.fecha_evento ?? '').replace(/-/g, '')
    const hi = (d.hora_inicio ?? '09:00').replace(':', '')
    const hf = (d.hora_fin   ?? '10:00').replace(':', '')
    const start = `${fecha}T${hi.padEnd(6,'0')}`
    const end   = `${fecha}T${hf.padEnd(6,'0')}`
    const title = encodeURIComponent(d.asunto ?? 'Reunión')
    const loc   = encodeURIComponent(`${d.sala_nombre ?? ''} — ${d.sede_nombre ?? ''}`)
    const desc  = encodeURIComponent(`Organizado por: ${d.solicitante_nombre ?? ''} (${d.solicitante_servicio ?? ''})`)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&location=${loc}&details=${desc}`
  } catch { return '' }
}

function calendarButtonsHtml(d: any): string {
  const gcal = googleCalendarLink(d)
  if (!gcal) return ''
  return `
  <div style="margin-top:24px;text-align:center">
    <p style="font-size:12px;color:#6B7280;margin:0 0 12px">Agregue este evento a su calendario:</p>
    <a href="${gcal}" target="_blank"
       style="display:inline-block;background:#1B4F8A;color:#fff;font-weight:600;font-size:13px;
              padding:12px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.3px">
      📅 Agregar a Google Calendar
    </a>
  </div>`
}

// ─── Shared layout wrapper ──────────────────────────────────────────────────
// showCalendarBtn: true para correos de invitados
function layout(badgeHtml: string, bodyHtml: string, d: any, showCalendarBtn = false): string {
  const invitadosHtml = d.invitados_emails?.length
    ? `<tr style="background:#F9FAFB">
        <td style="padding:10px 16px;color:#1B4F8A;font-weight:600;vertical-align:top">Invitados</td>
        <td style="padding:10px 16px;color:#374151">${(d.invitados_emails as string[]).join('<br>')}</td>
       </tr>`
    : ''

  const obsHtml = d.observaciones
    ? `<div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:14px 18px;border-radius:8px;margin-top:20px;font-size:13px;color:#92400E">
         <strong>Observación / Motivo:</strong><br>${d.observaciones}
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Inter,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:32px 16px">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(27,79,138,0.14)">

      <!-- HEADER — siempre azul como el logo de la Clínica -->
      <tr>
        <td style="background:linear-gradient(135deg,#0F3460 0%,#1B4F8A 60%,#2B6CB0 100%);padding:0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:28px 32px 16px">
                <p style="margin:0 0 2px;color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:2px;text-transform:uppercase">Clínica Santa Bárbara</p>
                <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Agenda de Salas de Reuniones</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px">
                ${badgeHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:32px">
          ${bodyHtml}

          <!-- DETALLES DE LA RESERVACIÓN -->
          <h3 style="margin:24px 0 12px;color:#1B4F8A;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Detalles de la reservación</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;overflow:hidden;border:1px solid #E2E8F0;font-size:14px">
            <tr style="background:#EFF6FF">
              <td style="padding:10px 16px;color:#1B4F8A;font-weight:600;width:140px;border-bottom:1px solid #E2E8F0">Sala</td>
              <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #E2E8F0">${d.sala_nombre ?? d.sala?.nombre ?? '—'}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;color:#1B4F8A;font-weight:600;border-bottom:1px solid #E2E8F0">Sede</td>
              <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #E2E8F0">${d.sede_nombre ?? '—'}</td>
            </tr>
            <tr style="background:#EFF6FF">
              <td style="padding:10px 16px;color:#1B4F8A;font-weight:600;border-bottom:1px solid #E2E8F0">Asunto</td>
              <td style="padding:10px 16px;color:#374151;font-weight:600;border-bottom:1px solid #E2E8F0">${d.asunto ?? '—'}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;color:#1B4F8A;font-weight:600;border-bottom:1px solid #E2E8F0">Fecha</td>
              <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #E2E8F0">${d.fecha_evento ?? '—'}</td>
            </tr>
            <tr style="background:#EFF6FF">
              <td style="padding:10px 16px;color:#1B4F8A;font-weight:600;border-bottom:1px solid #E2E8F0">Horario</td>
              <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #E2E8F0">${d.hora_inicio ?? '—'} – ${d.hora_fin ?? '—'}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;color:#1B4F8A;font-weight:600;border-bottom:1px solid #E2E8F0">Solicitante</td>
              <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #E2E8F0">${d.solicitante_nombre ?? '—'}</td>
            </tr>
            <tr style="background:#EFF6FF">
              <td style="padding:10px 16px;color:#1B4F8A;font-weight:600;${invitadosHtml ? 'border-bottom:1px solid #E2E8F0' : ''}">Servicio</td>
              <td style="padding:10px 16px;color:#374151;${invitadosHtml ? 'border-bottom:1px solid #E2E8F0' : ''}">${d.solicitante_servicio ?? '—'}</td>
            </tr>
            ${invitadosHtml}
          </table>

          ${obsHtml}

          <!-- DESCRIPCIÓN -->
          ${d.descripcion ? `<div style="margin-top:20px;padding:14px 18px;background:#F8FAFC;border-radius:8px;border:1px solid #E2E8F0;font-size:13px;color:#64748B"><strong style="color:#475569">Descripción:</strong> ${d.descripcion}</div>` : ''}

          <!-- BOTÓN GOOGLE CALENDAR (solo para invitados) -->
          ${showCalendarBtn ? calendarButtonsHtml(d) : ''}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#1B4F8A;padding:20px 32px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color:#93C5FD;font-size:12px">
                <strong style="color:#fff">Clínica Santa Bárbara</strong> — Clínica de Alta Complejidad<br>
                Sistema de Agenda de Salas de Reuniones
              </td>
              <td align="right" style="color:#93C5FD;font-size:11px">
                Este es un mensaje automático.<br>No responda a este correo.
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`
}

// ─── Templates ──────────────────────────────────────────────────────────────
const templates: Record<string, (d: any) => { subject: string; html: string }> = {

  // badge color helpers
  accepted: (d) => ({
    subject: `✅ [ACEPTADA] Reservación: ${d.asunto} — ${d.fecha_evento}`,
    html: layout(
      `<div style="display:inline-block;background:#10B981;border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:17px;font-weight:700">✅ RESERVACIÓN ACEPTADA</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:15px;color:#065F46;font-weight:600">¡Su reservación ha sido confirmada!</p>
       <p style="margin:0;font-size:14px;color:#374151">Le informamos que su solicitud fue <strong>aprobada</strong>. A continuación encuentre los detalles del evento.</p>`,
      d
    ),
  }),

  rejected: (d) => ({
    subject: `❌ [RECHAZADA] Reservación: ${d.asunto} — ${d.fecha_evento}`,
    html: layout(
      `<div style="display:inline-block;background:#EF4444;border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:17px;font-weight:700">❌ RESERVACIÓN RECHAZADA</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:15px;color:#991B1B;font-weight:600">Su reservación no fue aprobada.</p>
       <p style="margin:0;font-size:14px;color:#374151">Lamentamos informarle que su solicitud ha sido <strong>rechazada</strong>. Puede consultar el motivo en la sección de observaciones y realizar una nueva solicitud.</p>`,
      d
    ),
  }),

  rescheduled: (d) => ({
    subject: `🔄 [REPROGRAMADA] Reservación: ${d.asunto} — Nueva fecha: ${d.fecha_evento}`,
    html: layout(
      `<div style="display:inline-block;background:#3B82F6;border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:17px;font-weight:700">🔄 RESERVACIÓN REPROGRAMADA</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:15px;color:#1E3A8A;font-weight:600">Su reservación ha sido reprogramada.</p>
       <p style="margin:0;font-size:14px;color:#374151">Le informamos que su reservación fue <strong>reprogramada</strong> para una nueva fecha y/o horario. A continuación encuentre los detalles actualizados.</p>`,
      d
    ),
  }),

  cancelled: (d) => ({
    subject: `🚫 [CANCELADA] Reservación: ${d.asunto} — ${d.fecha_evento}`,
    html: layout(
      `<div style="display:inline-block;background:#6B7280;border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:17px;font-weight:700">🚫 RESERVACIÓN CANCELADA</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:15px;color:#374151;font-weight:600">La reservación ha sido cancelada.</p>
       <p style="margin:0;font-size:14px;color:#374151">Le informamos que la siguiente reservación ha sido <strong>cancelada</strong>. Consulte la observación para más detalles.</p>`,
      d
    ),
  }),

  // ── Plantillas para INVITADOS ─────────────────────────────────────────────

  invited: (d) => ({
    subject: `📅 [CONVOCATORIA] Ha sido invitado(a): ${d.asunto} — ${d.fecha_evento}`,
    html: layout(
      `<div style="display:inline-block;background:#10B981;border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:17px;font-weight:700">📅 HA SIDO CONVOCADO(A)</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:15px;color:#065F46;font-weight:600">Ha sido convocado(a) a una reunión.</p>
       <p style="margin:0;font-size:14px;color:#374151">
         <strong>${d.solicitante_nombre ?? 'Un colaborador'}</strong>
         ${d.solicitante_servicio ? `— ${d.solicitante_servicio}` : ''}
         le ha convocado a asistir al siguiente evento. Por favor tenga en cuenta la fecha y el horario.
       </p>`,
      d, true  // ← showCalendarBtn
    ),
  }),

  invited_rescheduled: (d) => ({
    subject: `🔄 [CAMBIO DE FECHA] Reunión reprogramada: ${d.asunto} — Nueva fecha: ${d.fecha_evento}`,
    html: layout(
      `<div style="display:inline-block;background:#3B82F6;border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:17px;font-weight:700">🔄 CAMBIO DE FECHA Y/O HORARIO</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:15px;color:#1E3A8A;font-weight:600">La reunión a la que fue convocado(a) ha sido reprogramada.</p>
       <p style="margin:0;font-size:14px;color:#374151">
         Le informamos que la reunión organizada por <strong>${d.solicitante_nombre ?? 'su colega'}</strong>
         ha sido reprogramada. Tenga en cuenta los detalles actualizados a continuación.
       </p>`,
      d, true
    ),
  }),

  invited_cancelled: (d) => ({
    subject: `🚫 [CANCELACIÓN] Reunión cancelada: ${d.asunto} — ${d.fecha_evento}`,
    html: layout(
      `<div style="display:inline-block;background:#6B7280;border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:17px;font-weight:700">🚫 REUNIÓN CANCELADA</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:15px;color:#374151;font-weight:600">La reunión a la que fue convocado(a) ha sido cancelada.</p>
       <p style="margin:0;font-size:14px;color:#374151">
         Le informamos que la reunión organizada por
         <strong>${d.solicitante_nombre ?? 'su colega'}</strong>
         a la que usted fue convocado(a), ha sido <strong>cancelada</strong>.
         Consulte la observación para conocer el motivo.
       </p>`,
      d, false
    ),
  }),
}

// ─── Handler ─────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { type, to, reservationData } = await req.json()

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), { status: 503 })
    }

    const template = templates[type]?.(reservationData)
    if (!template) {
      return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), { status: 400 })
    }

    // Filter empty emails
    const recipients = (to as string[]).filter(e => e && e.includes('@'))
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid recipients' }), { status: 400 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipients,
        subject: template.subject,
        html: template.html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend error:', data)
      return new Response(JSON.stringify(data), { status: res.status })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('send-email error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
