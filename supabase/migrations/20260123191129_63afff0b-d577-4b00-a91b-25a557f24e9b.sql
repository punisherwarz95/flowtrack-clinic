-- Tabla para almacenar códigos diarios de acceso al portal
CREATE TABLE public.codigos_diarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(5) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(fecha)
);

-- Habilitar RLS
ALTER TABLE public.codigos_diarios ENABLE ROW LEVEL SECURITY;

-- Staff puede gestionar códigos
CREATE POLICY "Staff puede gestionar codigos" ON public.codigos_diarios
  FOR ALL USING (true) WITH CHECK (true);

-- Portal puede leer código del día actual
CREATE POLICY "Portal puede leer codigo del dia" ON public.codigos_diarios
  FOR SELECT USING (fecha = CURRENT_DATE);