-- Allow public access to create patients from portal
CREATE POLICY "Portal puede crear pacientes"
ON public.pacientes
FOR INSERT
WITH CHECK (true);

-- Allow public access to read own patient by RUT
CREATE POLICY "Portal puede leer paciente por RUT"
ON public.pacientes
FOR SELECT
USING (true);

-- Allow public access to create atenciones from portal
CREATE POLICY "Portal puede crear atenciones"
ON public.atenciones
FOR INSERT
WITH CHECK (true);

-- Allow public access to read atenciones
CREATE POLICY "Portal puede leer atenciones"
ON public.atenciones
FOR SELECT
USING (true);

-- Allow public access to read empresas for portal
CREATE POLICY "Portal puede leer empresas"
ON public.empresas
FOR SELECT
USING (true);

-- Allow public access to read examenes for portal
CREATE POLICY "Portal puede leer examenes"
ON public.examenes
FOR SELECT
USING (true);

-- Allow public access to read atencion_examenes for portal
CREATE POLICY "Portal puede leer atencion_examenes"
ON public.atencion_examenes
FOR SELECT
USING (true);