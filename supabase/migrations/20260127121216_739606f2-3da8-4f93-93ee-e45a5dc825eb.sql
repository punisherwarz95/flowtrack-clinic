-- Actualizar política para permitir que pacientes existentes actualicen sus datos desde el portal
-- Esto permite que pacientes que regresan puedan actualizar email, teléfono, dirección, etc.

DROP POLICY IF EXISTS "Portal puede actualizar pacientes pendientes" ON public.pacientes;

CREATE POLICY "Portal puede actualizar pacientes" 
ON public.pacientes 
FOR UPDATE 
USING (true)
WITH CHECK (
  rut IS NOT NULL AND 
  (rut)::text <> ''::text AND 
  nombre IS NOT NULL AND 
  (nombre)::text <> ''::text AND 
  (nombre)::text <> 'PENDIENTE DE REGISTRO'::text
);