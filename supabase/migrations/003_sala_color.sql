-- Agregar columna color a salas
ALTER TABLE salas ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#1B4F8A';

-- Asignar colores distintos a las salas existentes
UPDATE salas SET color = '#1B4F8A' WHERE nombre ILIKE '%juntas%';
UPDATE salas SET color = '#10B981' WHERE nombre ILIKE '%capacitacion%';
UPDATE salas SET color = '#8B5CF6' WHERE nombre ILIKE '%pequeña%' OR nombre ILIKE '%pequena%';
UPDATE salas SET color = '#F59E0B' WHERE nombre ILIKE '%auditorio%';

-- Ver resultado
SELECT id, nombre, color FROM salas ORDER BY id;
