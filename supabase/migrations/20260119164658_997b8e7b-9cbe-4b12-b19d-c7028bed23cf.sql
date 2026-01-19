-- 1. Agregar campos codigo y costo_neto a examenes
ALTER TABLE examenes 
  ADD COLUMN IF NOT EXISTS codigo varchar(50),
  ADD COLUMN IF NOT EXISTS costo_neto numeric(12,2) DEFAULT 0;

COMMENT ON COLUMN examenes.costo_neto IS 'Costo neto del examen individual sin IVA';

-- 2. Crear tabla margenes_cotizacion
CREATE TABLE margenes_cotizacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(100) NOT NULL,
  porcentaje numeric(5,2) NOT NULL DEFAULT 0,
  activo boolean DEFAULT true,
  orden integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Insertar 3 márgenes iniciales
INSERT INTO margenes_cotizacion (nombre, porcentaje, orden) VALUES 
  ('Margen Tipo 1', 0, 1),
  ('Margen Tipo 2', 0, 2),
  ('Margen Tipo 3', 0, 3);

ALTER TABLE margenes_cotizacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff puede gestionar margenes" ON margenes_cotizacion
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Crear tabla cotizaciones
CREATE TABLE cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_cotizacion serial UNIQUE NOT NULL,
  fecha_cotizacion date NOT NULL DEFAULT CURRENT_DATE,
  empresa_id uuid REFERENCES empresas(id),
  empresa_nombre varchar(255),
  empresa_rut varchar(50),
  empresa_razon_social varchar(255),
  empresa_contacto varchar(255),
  empresa_email varchar(255),
  empresa_telefono varchar(50),
  subtotal_neto numeric(12,2) DEFAULT 0,
  total_iva numeric(12,2) DEFAULT 0,
  total_con_iva numeric(12,2) DEFAULT 0,
  total_con_margen numeric(12,2) DEFAULT 0,
  estado varchar(50) DEFAULT 'borrador',
  observaciones text,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_cotizaciones_numero ON cotizaciones(numero_cotizacion);
CREATE INDEX idx_cotizaciones_empresa ON cotizaciones(empresa_id);

ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff puede gestionar cotizaciones" ON cotizaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Crear tabla cotizacion_items
CREATE TABLE cotizacion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id uuid NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  item_numero integer NOT NULL,
  tipo_item varchar(20) NOT NULL,
  paquete_id uuid REFERENCES paquetes_examenes(id),
  examen_id uuid REFERENCES examenes(id),
  nombre_prestacion varchar(255) NOT NULL,
  detalle_examenes jsonb,
  valor_unitario_neto numeric(12,2) NOT NULL DEFAULT 0,
  cantidad integer NOT NULL DEFAULT 1,
  valor_total_neto numeric(12,2) NOT NULL DEFAULT 0,
  iva_porcentaje numeric(5,2) DEFAULT 19,
  valor_iva numeric(12,2) DEFAULT 0,
  valor_con_iva numeric(12,2) DEFAULT 0,
  margen_id uuid REFERENCES margenes_cotizacion(id),
  margen_nombre varchar(100),
  margen_porcentaje numeric(5,2) DEFAULT 0,
  valor_margen numeric(12,2) DEFAULT 0,
  valor_final numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_item_type CHECK (
    (tipo_item = 'paquete' AND paquete_id IS NOT NULL) OR
    (tipo_item = 'examen' AND examen_id IS NOT NULL)
  )
);

CREATE INDEX idx_cotizacion_items_cotizacion ON cotizacion_items(cotizacion_id);

ALTER TABLE cotizacion_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff puede gestionar items" ON cotizacion_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);