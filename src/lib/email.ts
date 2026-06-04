// Email via Resend — called through a Supabase Edge Function to keep API key server-side

export type EmailType =
  | 'accepted'          // solicitante: reservación aceptada
  | 'rejected'          // solicitante: reservación rechazada
  | 'rescheduled'       // solicitante: reservación reprogramada
  | 'cancelled'         // solicitante: reservación cancelada
  | 'invited'           // invitado: fue convocado a una reunión aceptada
  | 'invited_rescheduled' // invitado: la reunión a la que fue convocado fue reprogramada
  | 'invited_cancelled'   // invitado: la reunión a la que fue convocado fue cancelada

export async function sendReservationEmail(payload: {
  type: EmailType
  to: string[]
  reservationData: Record<string, unknown>
}) {
  const { supabase } = await import('./supabase')
  const { error } = await supabase.functions.invoke('send-email', { body: payload })
  if (error) throw error
}

/**
 * Envía emails diferenciados:
 *  - Al solicitante: con el tipo principal (accepted / rejected / rescheduled / cancelled)
 *  - A los invitados: con el tipo de invitado correspondiente (solo en accepted / rescheduled / cancelled)
 */
export async function sendNotifications(
  action: 'accept' | 'reject' | 'reschedule' | 'cancel',
  solicitanteEmail: string,
  invitadosEmails: string[],
  reservationData: Record<string, unknown>
) {
  const typeMap: Record<string, EmailType> = {
    accept:    'accepted',
    reject:    'rejected',
    reschedule:'rescheduled',
    cancel:    'cancelled',
  }
  const invitadoTypeMap: Record<string, EmailType | null> = {
    accept:    'invited',
    reject:    null,           // invitados no se notifican en rechazo
    reschedule:'invited_rescheduled',
    cancel:    'invited_cancelled',
  }

  const promises: Promise<void>[] = []

  // Email al solicitante
  promises.push(
    sendReservationEmail({ type: typeMap[action], to: [solicitanteEmail], reservationData })
  )

  // Email a invitados (si hay y corresponde)
  const invType = invitadoTypeMap[action]
  if (invType && invitadosEmails.length > 0) {
    promises.push(
      sendReservationEmail({ type: invType, to: invitadosEmails, reservationData })
    )
  }

  await Promise.allSettled(promises) // no-throw: errores de email son no-bloqueantes
}
