# Estructura del Proyecto — Agenda de Salas

```
reservaciones/
├── .claude/
│   └── launch.json                   # Configuración del servidor de preview
├── docs/
│   ├── SUPER_PROMPT.md               # Descripción completa del sistema
│   └── ESTRUCTURA_PROYECTO.md        # Este archivo
├── images/
│   ├── logo_cacsb2.png               # Logo color (para login)
│   └── logo_cacsb_blanc.png          # Logo blanco (para sidebar)
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── AppLayout.tsx         # Layout principal (sidebar + outlet)
│   │   │   └── Sidebar.tsx           # Navegación lateral con roles
│   │   └── Reservations/
│   │       ├── ActionModal.tsx       # Modal para aceptar/rechazar/cancelar/reprogramar
│   │       ├── ReservationCard.tsx   # Tarjeta detalle tipo Odoo
│   │       └── ReservationForm.tsx   # Formulario completo de reservación
│   ├── contexts/
│   │   └── AuthContext.tsx           # Contexto global de autenticación
│   ├── lib/
│   │   ├── email.ts                  # Cliente para Edge Function de email
│   │   └── supabase.ts               # Cliente Supabase tipado
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── ConfigPage.tsx        # CRUD servicios/dependencias
│   │   │   ├── RoomsPage.tsx         # CRUD salas y sedes
│   │   │   └── UsersPage.tsx         # CRUD usuarios
│   │   ├── CalendarPage.tsx          # Calendario principal (FullCalendar)
│   │   ├── DashboardPage.tsx         # Métricas con Highcharts
│   │   ├── LoginPage.tsx             # Login + recuperación de contraseña
│   │   ├── ReportsPage.tsx           # Reportes con exportación a Excel
│   │   └── ReservationsPage.tsx      # Lista de reservaciones con acciones
│   ├── types/
│   │   └── database.ts               # Tipos TypeScript del esquema Supabase
│   ├── App.tsx                       # Router principal + rutas protegidas
│   ├── index.css                     # Estilos globales Tailwind + componentes
│   └── main.tsx                      # Entry point React
├── supabase/
│   ├── functions/
│   │   └── send-email/
│   │       └── index.ts              # Edge Function Resend (3 templates HTML)
│   └── migrations/
│       └── 001_initial_schema.sql    # Esquema completo + RLS + datos ejemplo
├── .env                              # Variables de entorno (NO subir a git)
├── .env.example                      # Plantilla de variables de entorno
├── .gitignore                        # Ignorar node_modules, .env, dist
├── index.html                        # HTML raíz con fuente Inter
├── package.json                      # Dependencias npm
├── postcss.config.js                 # PostCSS para Tailwind
├── tailwind.config.js                # Config Tailwind con colores Clínica
├── tsconfig.json                     # TypeScript config
├── tsconfig.node.json                # TypeScript config para Vite
└── vite.config.ts                    # Vite config con aliases y puerto

Total: ~25 archivos fuente, ~3,500 líneas de código
```

## Dependencias principales

| Paquete | Versión | Uso |
|---------|---------|-----|
| react | 18.3 | UI framework |
| react-router-dom | 7.0 | Routing SPA |
| @supabase/supabase-js | 2.46 | Auth + DB |
| @fullcalendar/react | 6.1 | Calendario interactivo |
| highcharts | 12.0 | Gráficos con sombras |
| highcharts-react-official | 3.2 | Wrapper React para Highcharts |
| react-hook-form | 7.54 | Formularios performantes |
| @hookform/resolvers | 3.9 | Integración con Zod |
| zod | 3.23 | Validación de esquemas |
| date-fns | 4.1 | Manejo de fechas (español) |
| xlsx | 0.18 | Exportación a Excel |
| lucide-react | 0.468 | Iconos SVG |
| react-hot-toast | 2.4 | Notificaciones toast |
| tailwindcss | 3.4 | CSS utility-first |
| vite | 6.0 | Build tool |
| typescript | 5.6 | Tipado estático |
