-- Actualizar función para usar zona horaria de Chile
CREATE OR REPLACE FUNCTION public.calcular_numero_ingreso()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  max_numero integer;
  lock_id bigint;
  fecha_chile date;
BEGIN
  -- Convertir fecha_ingreso a zona horaria de Chile
  fecha_chile := (NEW.fecha_ingreso AT TIME ZONE 'America/Santiago')::date;
  
  -- Crear un lock_id único basado en la fecha chilena
  lock_id := ('x' || md5(fecha_chile::text))::bit(64)::bigint;
  
  -- Adquirir bloqueo advisory para esta fecha
  PERFORM pg_advisory_xact_lock(lock_id);
  
  -- Calcular el siguiente número de ingreso usando fecha chilena
  SELECT COALESCE(MAX(numero_ingreso), 0) + 1 INTO NEW.numero_ingreso
  FROM atenciones
  WHERE (fecha_ingreso AT TIME ZONE 'America/Santiago')::date = fecha_chile;
  
  RETURN NEW;
END;
$function$;