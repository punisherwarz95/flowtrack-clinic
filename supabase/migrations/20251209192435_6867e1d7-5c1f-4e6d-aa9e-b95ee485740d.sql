-- Agregar columnas faltantes a empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS rut character varying;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS razon_social character varying;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS contacto character varying;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS email character varying;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS telefono character varying;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS centro_costo character varying;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS activo boolean DEFAULT true;