-- Permitir que el portal público pueda actualizar pacientes PENDIENTE DE REGISTRO
CREATE POLICY "Portal puede actualizar pacientes pendientes"
  ON public.pacientes
  FOR UPDATE
  TO public
  USING (nombre = 'PENDIENTE DE REGISTRO')
  WITH CHECK (
    nombre <> 'PENDIENTE DE REGISTRO'
    AND rut IS NOT NULL AND rut <> ''
    AND email IS NOT NULL AND email <> ''
    AND telefono IS NOT NULL AND telefono <> ''
    AND fecha_nacimiento IS NOT NULL
    AND direccion IS NOT NULL AND direccion <> ''
  );