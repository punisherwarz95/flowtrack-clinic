-- Eliminar la columna tiene_ficha de la tabla pacientes
ALTER TABLE public.pacientes 
DROP COLUMN IF EXISTS tiene_ficha;