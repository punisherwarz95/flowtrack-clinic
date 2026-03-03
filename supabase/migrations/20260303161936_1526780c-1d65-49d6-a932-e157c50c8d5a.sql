
-- Crear tabla para registrar cada visita a un box
CREATE TABLE public.atencion_box_visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atencion_id uuid NOT NULL REFERENCES public.atenciones(id) ON DELETE CASCADE,
  box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  fecha_entrada timestamptz NOT NULL DEFAULT now(),
  fecha_salida timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX idx_atencion_box_visitas_atencion ON public.atencion_box_visitas(atencion_id);
CREATE INDEX idx_atencion_box_visitas_box ON public.atencion_box_visitas(box_id);

-- Habilitar RLS
ALTER TABLE public.atencion_box_visitas ENABLE ROW LEVEL SECURITY;

-- Staff puede gestionar todas las visitas
CREATE POLICY "Staff puede gestionar visitas"
ON public.atencion_box_visitas
FOR ALL
TO authenticated
USING (NOT is_empresa_user(auth.uid()))
WITH CHECK (NOT is_empresa_user(auth.uid()));

-- Portal puede leer visitas
CREATE POLICY "Portal puede leer visitas"
ON public.atencion_box_visitas
FOR SELECT
TO authenticated
USING (true);
