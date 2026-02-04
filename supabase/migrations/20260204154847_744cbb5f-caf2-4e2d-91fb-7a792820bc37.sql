-- Crear tabla atencion_baterias para registrar baterías asignadas a cada atención
CREATE TABLE public.atencion_baterias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atencion_id UUID NOT NULL REFERENCES public.atenciones(id) ON DELETE CASCADE,
  paquete_id UUID NOT NULL REFERENCES public.paquetes_examenes(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(atencion_id, paquete_id)
);

-- Habilitar RLS
ALTER TABLE public.atencion_baterias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Staff puede gestionar atencion_baterias"
ON public.atencion_baterias
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Portal puede ver atencion_baterias"
ON public.atencion_baterias
FOR SELECT
USING (true);

CREATE POLICY "Portal puede crear atencion_baterias"
ON public.atencion_baterias
FOR INSERT
WITH CHECK (true);

-- Índices para optimizar consultas
CREATE INDEX idx_atencion_baterias_atencion ON public.atencion_baterias(atencion_id);
CREATE INDEX idx_atencion_baterias_paquete ON public.atencion_baterias(paquete_id);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.atencion_baterias;