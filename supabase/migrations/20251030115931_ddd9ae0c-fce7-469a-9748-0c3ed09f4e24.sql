-- Corregir el search_path de la función para seguridad
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;