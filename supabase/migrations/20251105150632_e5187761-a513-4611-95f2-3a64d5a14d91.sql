-- Eliminar el trigger y la función existente para recalcular
DROP TRIGGER IF EXISTS trigger_calcular_numero_ingreso ON public.atenciones;
DROP FUNCTION IF EXISTS public.calcular_numero_ingreso();

-- Crear nueva función mejorada con bloqueo para evitar race conditions
CREATE OR REPLACE FUNCTION public.calcular_numero_ingreso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_numero integer;
BEGIN
  -- Usar FOR UPDATE para bloquear la fila y evitar race conditions
  SELECT COALESCE(MAX(numero_ingreso), 0) INTO max_numero
  FROM atenciones
  WHERE DATE(fecha_ingreso) = DATE(NEW.fecha_ingreso)
  FOR UPDATE;
  
  NEW.numero_ingreso := max_numero + 1;
  
  RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_calcular_numero_ingreso
  BEFORE INSERT ON public.atenciones
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_numero_ingreso();