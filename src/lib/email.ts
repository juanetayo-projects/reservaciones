// Email via Resend — called through a Supabase Edge Function to keep API key server-side
export async function sendReservationEmail(payload: {
  type: 'accepted' | 'rejected' | 'rescheduled' | 'cancelled'
  to: string[]
  reservationData: Record<string, unknown>
}) {
  const { supabase } = await import('./supabase')
  const { error } = await supabase.functions.invoke('send-email', { body: payload })
  if (error) throw error
}
