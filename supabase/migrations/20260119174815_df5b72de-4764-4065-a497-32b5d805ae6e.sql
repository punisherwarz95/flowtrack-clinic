-- Add cotizaciones module to the modulos table
INSERT INTO public.modulos (label, path, icon, orden, activo)
VALUES ('Cotizaciones', '/cotizaciones', 'FileText', 9, true)
ON CONFLICT (path) DO NOTHING;