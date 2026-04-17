CREATE TABLE public.empresa_modulos_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_key text NOT NULL UNIQUE,
  label text NOT NULL,
  path text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_modulos_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica empresa_modulos_config"
  ON public.empresa_modulos_config FOR SELECT
  USING (true);

CREATE POLICY "Admins pueden gestionar empresa_modulos_config"
  ON public.empresa_modulos_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_empresa_modulos_config_updated_at
  BEFORE UPDATE ON public.empresa_modulos_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.empresa_modulos_config (modulo_key, label, path, activo, orden) VALUES
  ('dashboard', 'Dashboard', '/empresa', true, 1),
  ('agendamiento', 'Agendamiento', '/empresa/agendamiento', true, 2),
  ('pacientes', 'Pacientes Atendidos', '/empresa/pacientes', true, 3),
  ('cotizaciones', 'Cotizaciones', '/empresa/cotizaciones', true, 4),
  ('estados-pago', 'Estados de Pago', '/empresa/estados-pago', true, 5),
  ('baterias', 'Baterías', '/empresa/baterias', true, 6),
  ('resultados', 'Resultados', '/empresa/resultados', true, 7);