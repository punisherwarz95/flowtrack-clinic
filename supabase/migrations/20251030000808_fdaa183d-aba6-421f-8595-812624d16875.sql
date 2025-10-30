-- Eliminar la constraint UNIQUE del RUT ya que no lo estamos usando
ALTER TABLE public.pacientes DROP CONSTRAINT IF EXISTS pacientes_rut_key;