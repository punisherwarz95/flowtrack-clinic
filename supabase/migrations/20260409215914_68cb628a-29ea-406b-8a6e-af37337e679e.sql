-- Add empresa_id to atenciones
ALTER TABLE public.atenciones ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);

-- Backfill from current patient data
UPDATE public.atenciones 
SET empresa_id = p.empresa_id 
FROM public.pacientes p 
WHERE atenciones.paciente_id = p.id 
  AND atenciones.empresa_id IS NULL;