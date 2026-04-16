-- Allow Portal (anon) to INSERT atencion_examenes for fusion
CREATE POLICY "Portal puede crear atencion_examenes"
ON public.atencion_examenes
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow Portal (anon/public) to UPDATE agenda_diferida for fusion
CREATE POLICY "Portal puede actualizar agenda_diferida"
ON public.agenda_diferida
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);