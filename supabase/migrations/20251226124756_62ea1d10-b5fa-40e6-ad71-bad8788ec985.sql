-- Crear tabla de módulos disponibles del sistema
CREATE TABLE public.modulos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text,
  orden integer DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

-- Políticas: todos los autenticados pueden leer, solo admins pueden modificar
CREATE POLICY "Usuarios autenticados pueden leer modulos"
ON public.modulos
FOR SELECT
USING (true);

CREATE POLICY "Admins pueden gestionar modulos"
ON public.modulos
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insertar los módulos existentes
INSERT INTO public.modulos (path, label, orden) VALUES
  ('/', 'Dashboard', 1),
  ('/flujo', 'Flujo', 2),
  ('/mi-box', 'Mi Box', 3),
  ('/pacientes', 'Pacientes', 4),
  ('/completados', 'Completados', 5),
  ('/incompletos', 'Incompletos', 6),
  ('/empresas', 'Empresas', 7),
  ('/boxes', 'Boxes', 8),
  ('/examenes', 'Exámenes', 9),
  ('/usuarios', 'Usuarios', 10);