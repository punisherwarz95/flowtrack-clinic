-- Crear tipo enum para estado de ficha
CREATE TYPE estado_ficha AS ENUM ('pendiente', 'en_mano_paciente', 'completada');

-- Agregar columna estado_ficha a la tabla atenciones
ALTER TABLE atenciones
ADD COLUMN estado_ficha estado_ficha DEFAULT 'pendiente';

-- Crear índice para mejorar consultas
CREATE INDEX idx_atenciones_estado_ficha ON atenciones(estado_ficha);