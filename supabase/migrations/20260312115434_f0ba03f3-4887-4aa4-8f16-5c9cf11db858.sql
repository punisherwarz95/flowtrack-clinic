
-- Portal puede insertar examen_resultados (para cuestionarios)
CREATE POLICY "Portal puede insertar examen_resultados"
ON public.examen_resultados FOR INSERT TO anon
WITH CHECK (true);

-- Portal puede actualizar examen_resultados (para cuestionarios)
CREATE POLICY "Portal puede actualizar examen_resultados"
ON public.examen_resultados FOR UPDATE TO anon
USING (true);

-- Portal puede actualizar estado de atencion_examenes (para marcar cuestionarios completados)
CREATE POLICY "Portal puede actualizar atencion_examenes"
ON public.atencion_examenes FOR UPDATE TO anon
USING (true);
