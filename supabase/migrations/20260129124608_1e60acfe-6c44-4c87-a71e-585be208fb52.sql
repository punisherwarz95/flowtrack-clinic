-- 1. Crear tabla intermedia empresa_faenas para relación muchos-a-muchos
CREATE TABLE public.empresa_faenas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  faena_id uuid NOT NULL REFERENCES public.faenas(id) ON DELETE CASCADE,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(empresa_id, faena_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.empresa_faenas ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
CREATE POLICY "Portal puede ver empresa_faenas" ON public.empresa_faenas
FOR SELECT USING (true);

CREATE POLICY "Staff puede gestionar empresa_faenas" ON public.empresa_faenas
FOR ALL USING (true) WITH CHECK (true);

-- 4. Migrar datos existentes: cada faena se asigna a su empresa actual
INSERT INTO public.empresa_faenas (empresa_id, faena_id, activo)
SELECT empresa_id, id, activo FROM public.faenas;

-- 5. Hacer empresa_id nullable en faenas (ya no es requerido, faenas son globales)
ALTER TABLE public.faenas ALTER COLUMN empresa_id DROP NOT NULL;