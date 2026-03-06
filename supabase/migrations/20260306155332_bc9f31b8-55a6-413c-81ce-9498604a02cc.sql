
-- 1. Tabla examen_formulario_campos
CREATE TABLE public.examen_formulario_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id uuid NOT NULL REFERENCES public.examenes(id) ON DELETE CASCADE,
  etiqueta text NOT NULL,
  tipo_campo text NOT NULL DEFAULT 'texto',
  opciones jsonb,
  requerido boolean NOT NULL DEFAULT false,
  orden integer NOT NULL DEFAULT 0,
  grupo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.examen_formulario_campos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar examen_formulario_campos" ON public.examen_formulario_campos
  FOR ALL TO authenticated USING (NOT is_empresa_user(auth.uid())) WITH CHECK (NOT is_empresa_user(auth.uid()));

CREATE POLICY "Portal puede ver examen_formulario_campos" ON public.examen_formulario_campos
  FOR SELECT TO anon USING (true);

-- 2. Tabla examen_resultados
CREATE TABLE public.examen_resultados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atencion_examen_id uuid NOT NULL REFERENCES public.atencion_examenes(id) ON DELETE CASCADE,
  campo_id uuid NOT NULL REFERENCES public.examen_formulario_campos(id) ON DELETE CASCADE,
  valor text,
  archivo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.examen_resultados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar examen_resultados" ON public.examen_resultados
  FOR ALL TO authenticated USING (NOT is_empresa_user(auth.uid())) WITH CHECK (NOT is_empresa_user(auth.uid()));

CREATE POLICY "Portal puede ver examen_resultados" ON public.examen_resultados
  FOR SELECT TO anon USING (true);

-- 3. Tabla examen_archivos_compartidos
CREATE TABLE public.examen_archivos_compartidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atencion_id uuid NOT NULL REFERENCES public.atenciones(id) ON DELETE CASCADE,
  archivo_url text NOT NULL,
  nombre_archivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.examen_archivos_compartidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar examen_archivos_compartidos" ON public.examen_archivos_compartidos
  FOR ALL TO authenticated USING (NOT is_empresa_user(auth.uid())) WITH CHECK (NOT is_empresa_user(auth.uid()));

-- 4. Tabla examen_archivo_vinculos
CREATE TABLE public.examen_archivo_vinculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archivo_compartido_id uuid NOT NULL REFERENCES public.examen_archivos_compartidos(id) ON DELETE CASCADE,
  examen_id uuid NOT NULL REFERENCES public.examenes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.examen_archivo_vinculos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar examen_archivo_vinculos" ON public.examen_archivo_vinculos
  FOR ALL TO authenticated USING (NOT is_empresa_user(auth.uid())) WITH CHECK (NOT is_empresa_user(auth.uid()));

-- 5. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('examen-resultados', 'examen-resultados', false);

-- Storage policies
CREATE POLICY "Staff puede subir archivos examen" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'examen-resultados' AND NOT is_empresa_user(auth.uid()));

CREATE POLICY "Staff puede ver archivos examen" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'examen-resultados');

CREATE POLICY "Staff puede eliminar archivos examen" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'examen-resultados' AND NOT is_empresa_user(auth.uid()));

-- Unique constraint for resultados
CREATE UNIQUE INDEX idx_examen_resultados_unique ON public.examen_resultados(atencion_examen_id, campo_id);

-- Trigger for updated_at on examen_resultados
CREATE TRIGGER update_examen_resultados_updated_at
  BEFORE UPDATE ON public.examen_resultados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
