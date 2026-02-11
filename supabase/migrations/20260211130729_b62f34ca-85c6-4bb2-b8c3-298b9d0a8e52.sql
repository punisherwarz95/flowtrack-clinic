
-- Tabla para almacenar QR codes configurados para la pantalla
CREATE TABLE public.pantalla_qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  imagen_url TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.pantalla_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar QR codes"
ON public.pantalla_qr_codes FOR ALL
USING (true) WITH CHECK (true);

-- Bucket público para imágenes QR
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true);

CREATE POLICY "Cualquiera puede ver QR images"
ON storage.objects FOR SELECT
USING (bucket_id = 'qr-codes');

CREATE POLICY "Staff puede subir QR images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'qr-codes');

CREATE POLICY "Staff puede eliminar QR images"
ON storage.objects FOR DELETE
USING (bucket_id = 'qr-codes');

CREATE POLICY "Staff puede actualizar QR images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'qr-codes');
