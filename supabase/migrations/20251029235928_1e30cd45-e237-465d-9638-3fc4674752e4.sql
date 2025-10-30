-- Crear tabla para paquetes de exámenes
CREATE TABLE public.paquetes_examenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla para la relación entre paquetes y exámenes
CREATE TABLE public.paquete_examen_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paquete_id UUID NOT NULL REFERENCES public.paquetes_examenes(id) ON DELETE CASCADE,
  examen_id UUID NOT NULL REFERENCES public.examenes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(paquete_id, examen_id)
);

-- Habilitar RLS
ALTER TABLE public.paquetes_examenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paquete_examen_items ENABLE ROW LEVEL SECURITY;

-- Crear políticas
CREATE POLICY "Permitir todo en paquetes_examenes" 
ON public.paquetes_examenes 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Permitir todo en paquete_examen_items" 
ON public.paquete_examen_items 
FOR ALL 
USING (true) 
WITH CHECK (true);