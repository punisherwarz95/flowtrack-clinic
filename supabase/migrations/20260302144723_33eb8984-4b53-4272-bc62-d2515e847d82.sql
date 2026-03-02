
-- Table to link individual exams to faenas with a sale price
CREATE TABLE public.faena_examenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faena_id uuid NOT NULL REFERENCES public.faenas(id) ON DELETE CASCADE,
  examen_id uuid NOT NULL REFERENCES public.examenes(id) ON DELETE CASCADE,
  valor_venta numeric NOT NULL DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(faena_id, examen_id)
);

-- Enable RLS
ALTER TABLE public.faena_examenes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Portal puede ver faena_examenes"
ON public.faena_examenes
FOR SELECT
USING (true);

CREATE POLICY "Staff puede gestionar faena_examenes"
ON public.faena_examenes
FOR ALL
USING (true)
WITH CHECK (true);
