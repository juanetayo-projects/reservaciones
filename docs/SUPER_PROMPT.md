# SUPER PROMPT — Agenda de Salas de Reuniones
## Clínica Santa Bárbara — Clínica de Alta Complejidad

---

## Descripción del sistema

Aplicación SaaS para la gestión integral de la agenda de salas de reuniones y capacitaciones del Piso 8 de la Clínica Santa Bárbara. Permite a los colaboradores solicitar espacios, gestionar estados y visualizar métricas de uso.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS 3 |
| Routing | React Router v7 |
| Formularios | React Hook Form + Zod |
| Autenticación | Supabase Auth |
| Base de datos | Supabase (PostgreSQL) |
| Email | Resend (vía Supabase Edge Functions) |
| Calendario | FullCalendar v6 |
| Gráficos | Highcharts |
| Exportación | SheetJS (xlsx) |
| Notificaciones | react-hot-toast |

---

## Módulos implementados

### 1. Calendario (`/`)
- Vista mensual/semanal/diaria con FullCalendar
- Colores por estado (pendiente=amarillo, aceptada=verde, rechazada=rojo, cancelada=gris, reprogramada=azul)
- Filtro por sala
- Click en día vacío → abre formulario de reservación
- Click en evento → muestra tarjeta tipo Odoo con detalle completo

### 2. Formulario de Reservación
- Lookup automático por N° de identificación (carga datos existentes)
- Upsert de solicitante en tabla `usuarios`
- Selección de sala con disponibilidad
- Gestión de invitados (add/remove emails dinámico)
- Validación completa con Zod

### 3. Reservaciones (`/reservaciones`)
- Tabla con todos los registros
- Búsqueda por asunto, solicitante, identificación
- Filtro por estado
- Acciones admin: Aceptar / Rechazar / Reprogramar / Cancelar
- Todas las acciones requieren observación (motivo)
- Notificación por email al cambiar estado

### 4. Dashboard (`/dashboard`)
- KPI cards: Total, Aceptadas, Pendientes, Rechazadas
- Gráfico de torta: distribución por estado (Highcharts con sombras)
- Gráfico de columnas: uso por sala
- Gráfico de barras: reservaciones por servicio (top 10)
- Gráfico de líneas: tendencia mensual
- Filtro por servicio

### 5. Reportes (`/reportes`)
- Filtros: sala, servicio, estado, rango de fechas, solicitante
- Tabla completa con todos los campos
- Exportación a Excel (.xlsx)

### 6. Administración (solo Administrador)
- **Usuarios** (`/admin/usuarios`): CRUD completo, búsqueda
- **Salas y Sedes** (`/admin/salas`): CRUD salas + sedes con tabs
- **Configuración** (`/admin/configuracion`): CRUD servicios/dependencias

### 7. Autenticación
- Login con email/contraseña (Supabase Auth)
- Recuperación de contraseña por email
- Protección de rutas por rol (Admin / Analista)

---

## Esquema de base de datos (Supabase)

```
perfiles         → id, nombre (Administrador | Analista)
sedes            → id, nombre, descripcion
salas            → id, sede_id, nombre, ubicacion, descripcion, capacidad, activa
servicios        → id, nombre
usuarios         → id (UUID), identificacion, nombres, email, telefono, perfil_id, servicio_id, activo
reservaciones    → id, sala_id, solicitante_id, asunto, descripcion, fecha_evento, hora_inicio, hora_fin, estado, observaciones, fecha_solicitud
invitados        → id, reservacion_id, email
historial_estados→ id, reservacion_id, estado_anterior, estado_nuevo, observacion, usuario_id
```

---

## Variables de entorno (.env)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Supabase Edge Function (`send-email`):
```
RESEND_API_KEY=re_xxxxxxxxxxxx
```

---

## Flujo de notificaciones por email

| Acción | Destinatarios | Template |
|--------|--------------|----------|
| Aceptar | Solicitante + todos los invitados | HTML verde profesional |
| Rechazar | Solo solicitante | HTML rojo con motivo |
| Reprogramar | Solo solicitante | HTML azul con nueva fecha/hora |
| Cancelar | Solo solicitante | Sin email automático (interno) |

---

## Roles y permisos

| Acción | Administrador | Analista |
|--------|:---:|:---:|
| Ver calendario | ✅ | ✅ |
| Crear reservación | ✅ | ✅ |
| Ver lista reservaciones | ✅ | ✅ |
| Aceptar/Rechazar/Reprogramar | ✅ | ❌ |
| Dashboard | ✅ | ✅ |
| Reportes + Export Excel | ✅ | ✅ |
| Gestión Usuarios | ✅ | ❌ |
| Gestión Salas/Sedes | ✅ | ❌ |
| Configuración | ✅ | ❌ |

---

## Despliegue

### Desarrollo local
```bash
cd C:\Users\Juan Carlos Etayo\reservaciones
npm install
npm run dev
# → http://localhost:5173
```

### Producción
```bash
npm run build
# Subir carpeta dist/ a servidor web (Vercel, Netlify, etc.)
```

### Supabase
1. Crear proyecto en supabase.com
2. Ejecutar `supabase/migrations/001_initial_schema.sql` en el SQL Editor
3. Copiar URL y anon key a `.env`
4. Crear Secret `RESEND_API_KEY` en Edge Functions
5. Desplegar función: `supabase functions deploy send-email`

### Resend
1. Crear cuenta en resend.com
2. Verificar dominio de la clínica
3. Copiar API key a Supabase Secrets

---

## Paleta de colores (del logo)

| Variable | Hex | Uso |
|----------|-----|-----|
| primary-600 | `#1B4F8A` | Color principal, botones |
| primary-800 | `#112F52` | Sidebar, títulos |
| primary-50 | `#EEF4FB` | Fondos de tablas |
| Éxito | `#10B981` | Aceptada |
| Peligro | `#EF4444` | Rechazada |
| Alerta | `#F59E0B` | Pendiente |
| Info | `#3B82F6` | Reprogramada |
