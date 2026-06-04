import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL     = Deno.env.get('FROM_EMAIL') ?? 'Clínica Santa Bárbara <agenda@cacsantabarbara.co>'

// ─── Shared layout wrapper ──────────────────────────────────────────────────
function layout(headerBg: string, headerText: string, badgeHtml: string, bodyHtml: string, d: any): string {
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

      <!-- HEADER -->
      <tr>
        <td style="background:${headerBg};padding:0">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:28px 32px 20px">
                <p style="margin:0 0 4px;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:2px;text-transform:uppercase">Clínica Santa Bárbara</p>
                <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">Agenda de Salas de Reuniones</h1>
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

  accepted: (d) => ({
    subject: `✅ [ACEPTADA] Reservación: ${d.asunto} — ${d.fecha_evento}`,
    html: layout(
      'linear-gradient(135deg,#065F46 0%,#10B981 100%)',
      'Reservación Aceptada',
      `<div style="display:inline-block;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.6);border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:18px;font-weight:700">✅ RESERVACIÓN ACEPTADA</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:16px;color:#065F46;font-weight:600">¡Su reservación ha sido confirmada!</p>
       <p style="margin:0;font-size:14px;color:#374151">Le informamos que su solicitud fue <strong>aprobada</strong>. A continuación encuentre los detalles del evento.</p>`,
      d
    ),
  }),

  rejected: (d) => ({
    subject: `❌ [RECHAZADA] Reservación: ${d.asunto} — ${d.fecha_evento}`,
    html: layout(
      'linear-gradient(135deg,#991B1B 0%,#EF4444 100%)',
      'Reservación Rechazada',
      `<div style="display:inline-block;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.6);border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:18px;font-weight:700">❌ RESERVACIÓN RECHAZADA</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:16px;color:#991B1B;font-weight:600">Su reservación no fue aprobada.</p>
       <p style="margin:0;font-size:14px;color:#374151">Lamentamos informarle que su solicitud ha sido <strong>rechazada</strong>. Puede consultar el motivo en la sección de observaciones y realizar una nueva solicitud.</p>`,
      d
    ),
  }),

  rescheduled: (d) => ({
    subject: `🔄 [REPROGRAMADA] Reservación: ${d.asunto} — Nueva fecha: ${d.fecha_evento}`,
    html: layout(
      'linear-gradient(135deg,#1E3A8A 0%,#3B82F6 100%)',
      'Reservación Reprogramada',
      `<div style="display:inline-block;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.6);border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:18px;font-weight:700">🔄 RESERVACIÓN REPROGRAMADA</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:16px;color:#1E3A8A;font-weight:600">Su reservación ha sido reprogramada.</p>
       <p style="margin:0;font-size:14px;color:#374151">Le informamos que su reservación fue <strong>reprogramada</strong> para una nueva fecha y/o horario. A continuación encuentre los detalles actualizados.</p>`,
      d
    ),
  }),

  cancelled: (d) => ({
    subject: `🚫 [CANCELADA] Reservación: ${d.asunto} — ${d.fecha_evento}`,
    html: layout(
      'linear-gradient(135deg,#374151 0%,#6B7280 100%)',
      'Reservación Cancelada',
      `<div style="display:inline-block;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.6);border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:18px;font-weight:700">🚫 RESERVACIÓN CANCELADA</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:16px;color:#374151;font-weight:600">La reservación ha sido cancelada.</p>
       <p style="margin:0;font-size:14px;color:#374151">Le informamos que la siguiente reservación ha sido <strong>cancelada</strong>. Consulte la observación para más detalles.</p>`,
      d
    ),
  }),

  // ── Plantillas para INVITADOS (mensaje diferente al del solicitante) ──────

  invited: (d) => ({
    subject: `📅 [CONVOCATORIA] Ha sido invitado(a): ${d.asunto} — ${d.fecha_evento}`,
    html: layout(
      'linear-gradient(135deg,#065F46 0%,#10B981 100%)',
      'Convocatoria a Reunión',
      `<div style="display:inline-block;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.6);border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:18px;font-weight:700">📅 HA SIDO CONVOCADO(A)</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:16px;color:#065F46;font-weight:600">Ha sido convocado(a) a una reunión.</p>
       <p style="margin:0;font-size:14px;color:#374151">
         <strong>${d.solicitante_nombre ?? 'Un colaborador'}</strong>
         ${d.solicitante_servicio ? `— ${d.solicitante_servicio}` : ''}
         le ha convocado a asistir al siguiente evento. Por favor, tenga en cuenta la fecha y el horario indicados.
       </p>`,
      d
    ),
  }),

  invited_rescheduled: (d) => ({
    subject: `🔄 [CAMBIO DE FECHA] Reunión reprogramada: ${d.asunto} — Nueva fecha: ${d.fecha_evento}`,
    html: layout(
      'linear-gradient(135deg,#1E3A8A 0%,#3B82F6 100%)',
      'Reunión Reprogramada',
      `<div style="display:inline-block;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.6);border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:18px;font-weight:700">🔄 CAMBIO DE FECHA Y/O HORARIO</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:16px;color:#1E3A8A;font-weight:600">La reunión a la que fue convocado(a) ha sido reprogramada.</p>
       <p style="margin:0;font-size:14px;color:#374151">
         Le informamos que la reunión organizada por
         <strong>${d.solicitante_nombre ?? 'su colega'}</strong>
         ha sido reprogramada para una nueva fecha y/o horario.
         Tenga en cuenta los detalles actualizados a continuación.
       </p>`,
      d
    ),
  }),

  invited_cancelled: (d) => ({
    subject: `🚫 [CANCELACIÓN] Reunión cancelada: ${d.asunto} — ${d.fecha_evento}`,
    html: layout(
      'linear-gradient(135deg,#374151 0%,#6B7280 100%)',
      'Reunión Cancelada',
      `<div style="display:inline-block;background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.6);border-radius:30px;padding:8px 20px">
        <span style="color:#fff;font-size:18px;font-weight:700">🚫 REUNIÓN CANCELADA</span>
      </div>`,
      `<p style="margin:0 0 8px;font-size:16px;color:#374151;font-weight:600">La reunión a la que fue convocado(a) ha sido cancelada.</p>
       <p style="margin:0;font-size:14px;color:#374151">
         Le informamos que la reunión organizada por
         <strong>${d.solicitante_nombre ?? 'su colega'}</strong>
         a la que usted fue convocado(a), ha sido <strong>cancelada</strong>.
         Consulte la observación para conocer el motivo.
       </p>`,
      d
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
