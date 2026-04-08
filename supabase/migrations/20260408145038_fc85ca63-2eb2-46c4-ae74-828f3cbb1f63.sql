-- Drop existing insert policy and recreate to allow all authenticated users
DROP POLICY IF EXISTS "Staff puede gestionar informe_verificacion" ON public.informe_verificacion;

CREATE POLICY "Authenticated puede gestionar informe_verificacion"
ON public.informe_verificacion
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);