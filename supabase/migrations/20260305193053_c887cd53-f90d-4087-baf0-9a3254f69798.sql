
-- Activity Logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  module text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Agenda Diferida table
CREATE TABLE public.agenda_diferida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  rut text NOT NULL,
  email text,
  telefono text,
  fecha_nacimiento date,
  direccion text,
  tipo_servicio public.tipo_servicio,
  empresa_id uuid REFERENCES public.empresas(id),
  faena_id uuid REFERENCES public.faenas(id),
  cargo text,
  examenes_ids uuid[] DEFAULT '{}',
  paquetes_ids uuid[] DEFAULT '{}',
  estado text DEFAULT 'pendiente',
  fecha_programada date,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  vinculado_at timestamptz,
  atencion_id uuid REFERENCES public.atenciones(id)
);

ALTER TABLE public.agenda_diferida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar agenda_diferida" ON public.agenda_diferida
  FOR ALL TO authenticated
  USING (NOT public.is_empresa_user(auth.uid()))
  WITH CHECK (NOT public.is_empresa_user(auth.uid()));

CREATE POLICY "Portal puede ver agenda_diferida por RUT" ON public.agenda_diferida
  FOR SELECT
  USING (true);
