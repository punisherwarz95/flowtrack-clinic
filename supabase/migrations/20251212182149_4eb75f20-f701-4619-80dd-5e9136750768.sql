-- Add direccion (address) column to pacientes table
ALTER TABLE public.pacientes
ADD COLUMN direccion text;