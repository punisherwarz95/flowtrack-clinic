-- Create prestadores table
CREATE TABLE public.prestadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  rut VARCHAR(20),
  especialidad VARCHAR(100),
  telefono VARCHAR(50),
  email VARCHAR(255),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prestador_examenes table (pricing per exam)
CREATE TABLE public.prestador_examenes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prestador_id UUID NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  examen_id UUID NOT NULL REFERENCES public.examenes(id) ON DELETE CASCADE,
  valor_prestacion NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(prestador_id, examen_id)
);

-- Create prestador_reemplazos table
CREATE TABLE public.prestador_reemplazos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prestador_original_id UUID NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  prestador_reemplazo_id UUID NOT NULL REFERENCES public.prestadores(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add realizado_por column to atencion_examenes
ALTER TABLE public.atencion_examenes 
ADD COLUMN IF NOT EXISTS realizado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestador_examenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestador_reemplazos ENABLE ROW LEVEL SECURITY;

-- RLS policies for prestadores (staff access)
CREATE POLICY "Staff can view prestadores" ON public.prestadores
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert prestadores" ON public.prestadores
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update prestadores" ON public.prestadores
  FOR UPDATE USING (true);

CREATE POLICY "Staff can delete prestadores" ON public.prestadores
  FOR DELETE USING (true);

-- RLS policies for prestador_examenes
CREATE POLICY "Staff can view prestador_examenes" ON public.prestador_examenes
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert prestador_examenes" ON public.prestador_examenes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update prestador_examenes" ON public.prestador_examenes
  FOR UPDATE USING (true);

CREATE POLICY "Staff can delete prestador_examenes" ON public.prestador_examenes
  FOR DELETE USING (true);

-- RLS policies for prestador_reemplazos
CREATE POLICY "Staff can view prestador_reemplazos" ON public.prestador_reemplazos
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert prestador_reemplazos" ON public.prestador_reemplazos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update prestador_reemplazos" ON public.prestador_reemplazos
  FOR UPDATE USING (true);

CREATE POLICY "Staff can delete prestador_reemplazos" ON public.prestador_reemplazos
  FOR DELETE USING (true);

-- Add prestadores module to modulos table
INSERT INTO public.modulos (label, path, icon, orden, activo)
VALUES ('Prestadores', '/prestadores', 'UserCheck', 10, true)
ON CONFLICT (path) DO NOTHING;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.prestadores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prestador_reemplazos;