
-- Tabla de configuración del centro médico
CREATE TABLE public.configuracion_centro (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url text,
  nombre_centro text NOT NULL DEFAULT 'Centro Médico',
  direccion text,
  telefono text,
  web text,
  email_contacto text,
  parrafo_legal text DEFAULT 'Esta información no podrá ser entregada a terceras personas, sin el consentimiento expreso y escrito del trabajador, en cumplimiento de la ley 19.628 (Instrucción MI G.O N° 187/99). La adulteración o falsificación de este certificado y uso de un certificado falso, es un "DELITO" penado por la ley, descrito en los artículos 193, 197, 198 del Código Penal.',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracion_centro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar configuracion_centro"
  ON public.configuracion_centro FOR ALL
  TO authenticated
  USING (NOT is_empresa_user(auth.uid()))
  WITH CHECK (NOT is_empresa_user(auth.uid()));

CREATE POLICY "Lectura publica configuracion_centro"
  ON public.configuracion_centro FOR SELECT
  TO public
  USING (true);

-- Insertar registro por defecto
INSERT INTO public.configuracion_centro (nombre_centro, direccion, telefono, web, email_contacto)
VALUES ('Centro Médico Jenner', 'Av. Salvador Allende 3432, Edif. Nuevo Prado, piso 2. Iquique - Chile.', '57 226 2775', 'www.centrojenner.cl', 'contacto@centrojenner.cl');

-- Agregar firma_url a profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS firma_url text;

-- Tabla de verificación de informes
CREATE TABLE public.informe_verificacion (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluacion_id uuid NOT NULL REFERENCES public.evaluaciones_clinicas(id) ON DELETE CASCADE,
  token_verificacion text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.informe_verificacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura publica informe_verificacion"
  ON public.informe_verificacion FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Staff puede gestionar informe_verificacion"
  ON public.informe_verificacion FOR ALL
  TO authenticated
  USING (NOT is_empresa_user(auth.uid()))
  WITH CHECK (NOT is_empresa_user(auth.uid()));

-- Bucket para assets del centro (logos, firmas)
INSERT INTO storage.buckets (id, name, public) VALUES ('centro-assets', 'centro-assets', true);

CREATE POLICY "Lectura publica centro-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'centro-assets');

CREATE POLICY "Staff puede subir a centro-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'centro-assets');

CREATE POLICY "Staff puede actualizar centro-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'centro-assets');

CREATE POLICY "Staff puede eliminar de centro-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'centro-assets');

-- Trigger para updated_at en configuracion_centro
CREATE TRIGGER update_configuracion_centro_updated_at
  BEFORE UPDATE ON public.configuracion_centro
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
