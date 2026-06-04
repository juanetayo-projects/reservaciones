-- =====================================================
-- AGENDA SALAS DE REUNIONES — CLÍNICA SANTA BÁRBARA
-- Migración inicial: esquema completo
-- =====================================================

-- PERFILES
CREATE TABLE IF NOT EXISTS perfiles (
  id   SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);
INSERT INTO perfiles (nombre) VALUES ('Administrador'), ('Analista') ON CONFLICT DO NOTHING;

-- SEDES
CREATE TABLE IF NOT EXISTS sedes (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- SALAS
CREATE TABLE IF NOT EXISTS salas (
  id          SERIAL PRIMARY KEY,
  sede_id     INT NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  ubicacion   TEXT,
  descripcion TEXT,
  capacidad   INT NOT NULL DEFAULT 10,
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- SERVICIOS (dependencias clínicas)
CREATE TABLE IF NOT EXISTS servicios (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

-- USUARIOS (vinculados a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS usuarios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identificacion TEXT NOT NULL UNIQUE,
  nombres        TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  telefono       TEXT,
  perfil_id      INT NOT NULL DEFAULT 2 REFERENCES perfiles(id),
  servicio_id    INT REFERENCES servicios(id),
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RESERVACIONES
CREATE TABLE IF NOT EXISTS reservaciones (
  id              SERIAL PRIMARY KEY,
  sala_id         INT NOT NULL REFERENCES salas(id),
  solicitante_id  UUID NOT NULL REFERENCES usuarios(id),
  asunto          TEXT NOT NULL,
  descripcion     TEXT,
  fecha_evento    DATE NOT NULL,
  hora_inicio     TIME NOT NULL,
  hora_fin        TIME NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente','aceptada','rechazada','cancelada','reprogramada')),
  observaciones   TEXT,
  fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT hora_valida CHECK (hora_fin > hora_inicio)
);

-- INVITADOS
CREATE TABLE IF NOT EXISTS invitados (
  id              SERIAL PRIMARY KEY,
  reservacion_id  INT NOT NULL REFERENCES reservaciones(id) ON DELETE CASCADE,
  email           TEXT NOT NULL
);

-- HISTORIAL DE ESTADOS
CREATE TABLE IF NOT EXISTS historial_estados (
  id              SERIAL PRIMARY KEY,
  reservacion_id  INT NOT NULL REFERENCES reservaciones(id) ON DELETE CASCADE,
  estado_anterior TEXT CHECK (estado_anterior IN ('pendiente','aceptada','rechazada','cancelada','reprogramada')),
  estado_nuevo    TEXT NOT NULL CHECK (estado_nuevo IN ('pendiente','aceptada','rechazada','cancelada','reprogramada')),
  observacion     TEXT,
  usuario_id      UUID REFERENCES usuarios(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_reservaciones_fecha    ON reservaciones(fecha_evento);
CREATE INDEX IF NOT EXISTS idx_reservaciones_sala     ON reservaciones(sala_id);
CREATE INDEX IF NOT EXISTS idx_reservaciones_estado   ON reservaciones(estado);
CREATE INDEX IF NOT EXISTS idx_reservaciones_solicit  ON reservaciones(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_invitados_reservacion  ON invitados(reservacion_id);

-- TRIGGER: updated_at en reservaciones
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reservaciones_updated_at
  BEFORE UPDATE ON reservaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE perfiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE salas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservaciones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitados        ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_estados ENABLE ROW LEVEL SECURITY;

-- Lectura pública para catálogos
CREATE POLICY "read_perfiles"   ON perfiles   FOR SELECT USING (true);
CREATE POLICY "read_sedes"      ON sedes      FOR SELECT USING (true);
CREATE POLICY "read_salas"      ON salas      FOR SELECT USING (true);
CREATE POLICY "read_servicios"  ON servicios  FOR SELECT USING (true);

-- Usuarios autenticados leen todo
CREATE POLICY "auth_read_users"   ON usuarios        FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_res"     ON reservaciones   FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_inv"     ON invitados       FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_hist"    ON historial_estados FOR SELECT USING (auth.role() = 'authenticated');

-- Cualquier autenticado puede insertar reservaciones e invitados
CREATE POLICY "auth_insert_res"   ON reservaciones   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_inv"   ON invitados       FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_hist"  ON historial_estados FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_insert_users" ON usuarios        FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Solo administradores (perfil_id=1) pueden actualizar y eliminar
CREATE POLICY "admin_update_res"  ON reservaciones   FOR UPDATE USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil_id = 1)
);
CREATE POLICY "admin_update_users" ON usuarios       FOR UPDATE USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil_id = 1)
  OR id = auth.uid()
);
CREATE POLICY "admin_delete_users" ON usuarios       FOR DELETE USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil_id = 1)
);
CREATE POLICY "admin_manage_salas" ON salas          FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil_id = 1)
);
CREATE POLICY "admin_manage_sedes" ON sedes          FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil_id = 1)
);
CREATE POLICY "admin_manage_servicios" ON servicios  FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil_id = 1)
);

-- =====================================================
-- DATOS DE EJEMPLO
-- =====================================================
INSERT INTO sedes (nombre, descripcion) VALUES
  ('Sede Principal', 'Edificio central Clínica Santa Bárbara'),
  ('Torre Norte', 'Ampliación norte — Piso 8')
ON CONFLICT DO NOTHING;

INSERT INTO salas (sede_id, nombre, ubicacion, descripcion, capacidad) VALUES
  (1, 'Sala de Juntas Piso 8',   'Piso 8, Bloque A', 'Sala principal para reuniones directivas', 20),
  (1, 'Sala de Capacitaciones',  'Piso 8, Bloque B', 'Sala equipada con videobeam y pantalla', 40),
  (1, 'Sala Pequeña A',          'Piso 8, Bloque A', 'Sala para reuniones pequeñas', 8),
  (2, 'Auditorio Torre Norte',   'Piso 8, Torre N',  'Auditorio principal', 80)
ON CONFLICT DO NOTHING;

INSERT INTO servicios (nombre) VALUES
  ('Gerencia General'), ('Dirección Médica'), ('Enfermería'),
  ('Urgencias'), ('Cirugía'), ('UCI'), ('Laboratorio'), ('Imagenología'),
  ('Farmacia'), ('Recursos Humanos'), ('Contabilidad'), ('Sistemas'),
  ('Calidad'), ('Cartera'), ('Facturación')
ON CONFLICT DO NOTHING;
