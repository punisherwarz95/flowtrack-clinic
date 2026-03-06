
-- Table for configuring bidirectional file sharing between exams
CREATE TABLE public.examen_trazabilidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  examen_id_a uuid NOT NULL REFERENCES public.examenes(id) ON DELETE CASCADE,
  examen_id_b uuid NOT NULL REFERENCES public.examenes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT examen_trazabilidad_unique UNIQUE (examen_id_a, examen_id_b),
  CONSTRAINT examen_trazabilidad_no_self CHECK (examen_id_a <> examen_id_b)
);

ALTER TABLE public.examen_trazabilidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar examen_trazabilidad"
  ON public.examen_trazabilidad
  FOR ALL
  TO authenticated
  USING (NOT is_empresa_user(auth.uid()))
  WITH CHECK (NOT is_empresa_user(auth.uid()));

CREATE POLICY "Portal puede ver examen_trazabilidad"
  ON public.examen_trazabilidad
  FOR SELECT
  TO authenticated
  USING (true);
