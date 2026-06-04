export type ReservationStatus = 'pendiente' | 'aceptada' | 'rechazada' | 'cancelada' | 'reprogramada'

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: { id: number; nombre: string }
        Insert: { nombre: string }
        Update: { nombre?: string }
      }
      sedes: {
        Row: { id: number; nombre: string; descripcion: string | null; created_at: string }
        Insert: { nombre: string; descripcion?: string }
        Update: { nombre?: string; descripcion?: string }
      }
      salas: {
        Row: { id: number; sede_id: number; nombre: string; ubicacion: string | null; descripcion: string | null; capacidad: number; activa: boolean; created_at: string }
        Insert: { sede_id: number; nombre: string; ubicacion?: string; descripcion?: string; capacidad?: number; activa?: boolean }
        Update: { sede_id?: number; nombre?: string; ubicacion?: string; descripcion?: string; capacidad?: number; activa?: boolean }
      }
      servicios: {
        Row: { id: number; nombre: string }
        Insert: { nombre: string }
        Update: { nombre?: string }
      }
      usuarios: {
        Row: { id: string; nombres: string; email: string; telefono: string | null; perfil_id: number; servicio_id: number | null; identificacion: string; activo: boolean; created_at: string }
        Insert: { id?: string; nombres: string; email: string; telefono?: string; perfil_id?: number; servicio_id?: number; identificacion: string }
        Update: { nombres?: string; email?: string; telefono?: string; perfil_id?: number; servicio_id?: number; activo?: boolean }
      }
      reservaciones: {
        Row: {
          id: number; sala_id: number; solicitante_id: string
          asunto: string; descripcion: string | null
          fecha_evento: string; hora_inicio: string; hora_fin: string
          estado: ReservationStatus; observaciones: string | null
          fecha_solicitud: string; updated_at: string
        }
        Insert: {
          sala_id: number; solicitante_id: string
          asunto: string; descripcion?: string
          fecha_evento: string; hora_inicio: string; hora_fin: string
          estado?: ReservationStatus; observaciones?: string
        }
        Update: {
          sala_id?: number; asunto?: string; descripcion?: string
          fecha_evento?: string; hora_inicio?: string; hora_fin?: string
          estado?: ReservationStatus; observaciones?: string
        }
      }
      invitados: {
        Row: { id: number; reservacion_id: number; email: string }
        Insert: { reservacion_id: number; email: string }
        Update: { email?: string }
      }
      historial_estados: {
        Row: { id: number; reservacion_id: number; estado_anterior: ReservationStatus | null; estado_nuevo: ReservationStatus; observacion: string | null; usuario_id: string | null; created_at: string }
        Insert: { reservacion_id: number; estado_anterior?: ReservationStatus; estado_nuevo: ReservationStatus; observacion?: string; usuario_id?: string }
        Update: never
      }
    }
  }
}

// Convenience joined types
export interface ReservacionCompleta {
  id: number
  asunto: string
  descripcion: string | null
  fecha_evento: string
  hora_inicio: string
  hora_fin: string
  estado: ReservationStatus
  observaciones: string | null
  fecha_solicitud: string
  sala: { id: number; nombre: string; ubicacion: string | null; capacidad: number; sede: { nombre: string } }
  solicitante: { id: string; nombres: string; email: string; telefono: string | null; identificacion: string; servicio: { nombre: string } | null }
  invitados: { id: number; email: string }[]
}
