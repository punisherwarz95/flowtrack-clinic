-- Eliminar el trigger y la función existente
DROP TRIGGER IF EXISTS trigger_calcular_numero_ingreso ON public.atenciones;
DROP FUNCTION IF EXISTS public.calcular_numero_ingreso();

-- Crear nueva función con bloqueo advisory para evitar duplicados
CREATE OR REPLACE FUNCTION public.calcular_numero_ingreso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_numero integer;
  lock_id bigint;
BEGIN
  -- Crear un lock_id único basado en la fecha
  lock_id := ('x' || md5(DATE(NEW.fecha_ingreso)::text))::bit(64)::bigint;
  
  -- Adquirir bloqueo advisory para esta fecha
  PERFORM pg_advisory_xact_lock(lock_id);
  
  -- Calcular el siguiente número de ingreso
  SELECT COALESCE(MAX(numero_ingreso), 0) + 1 INTO NEW.numero_ingreso
  FROM atenciones
  WHERE DATE(fecha_ingreso) = DATE(NEW.fecha_ingreso);
  
  RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_calcular_numero_ingreso
  BEFORE INSERT ON public.atenciones
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_numero_ingreso();