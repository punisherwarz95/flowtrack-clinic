-- Crear tabla para configuración del código diario
CREATE TABLE public.codigo_diario_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hora_reset time NOT NULL DEFAULT '00:00:00',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insertar configuración por defecto (medianoche)
INSERT INTO public.codigo_diario_config (hora_reset) VALUES ('00:00:00');

-- Habilitar RLS
ALTER TABLE public.codigo_diario_config ENABLE ROW LEVEL SECURITY;

-- Políticas: Staff puede leer y modificar
CREATE POLICY "Staff puede ver configuracion" 
  ON public.codigo_diario_config 
  FOR SELECT 
  USING (true);

CREATE POLICY "Staff puede actualizar configuracion" 
  ON public.codigo_diario_config 
  FOR UPDATE 
  USING (true);

-- También permitir al portal leer la configuración para saber cuándo resetear
CREATE POLICY "Portal puede ver configuracion" 
  ON public.codigo_diario_config 
  FOR SELECT 
  USING (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_codigo_diario_config_updated_at
  BEFORE UPDATE ON public.codigo_diario_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();