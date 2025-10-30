-- Agregar columna numero_ingreso a la tabla atenciones
ALTER TABLE atenciones ADD COLUMN numero_ingreso INTEGER;

-- Función para calcular el número de ingreso del día
CREATE OR REPLACE FUNCTION calcular_numero_ingreso()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular el número de ingreso basándose en las atenciones del mismo día
  SELECT COUNT(*) + 1 INTO NEW.numero_ingreso
  FROM atenciones
  WHERE DATE(fecha_ingreso) = DATE(NEW.fecha_ingreso)
  AND fecha_ingreso < NEW.fecha_ingreso;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que calcula automáticamente el número de ingreso
CREATE TRIGGER trigger_calcular_numero_ingreso
BEFORE INSERT ON atenciones
FOR EACH ROW
EXECUTE FUNCTION calcular_numero_ingreso();

-- Actualizar registros existentes con su número de ingreso
WITH numbered AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY DATE(fecha_ingreso) ORDER BY fecha_ingreso) as num
  FROM atenciones
)
UPDATE atenciones a
SET numero_ingreso = n.num
FROM numbered n
WHERE a.id = n.id;