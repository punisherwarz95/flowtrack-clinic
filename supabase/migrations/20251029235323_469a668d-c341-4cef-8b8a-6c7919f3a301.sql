-- Make rut nullable since it's no longer required in the registration flow
ALTER TABLE public.pacientes 
ALTER COLUMN rut DROP NOT NULL;