-- =====================================================
-- CREAR FUNCIÓN UPDATE_UPDATED_AT_COLUMN SI NO EXISTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- FASE 1: Sistema de Documentos/Formularios y Precios por Empresa
-- =====================================================

-- 1. Tabla de documentos/formularios (consentimientos, declaraciones, etc.)
CREATE TABLE public.documentos_formularios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL DEFAULT 'consentimiento', -- consentimiento, declaracion, cuestionario
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabla de campos de cada formulario
CREATE TABLE public.documento_campos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.documentos_formularios(id) ON DELETE CASCADE,
  etiqueta TEXT NOT NULL,
  tipo_campo TEXT NOT NULL DEFAULT 'texto', -- texto, texto_largo, checkbox, select, fecha, firma, radio
  opciones JSONB, -- Para select/radio: ["opcion1", "opcion2", ...]
  requerido BOOLEAN NOT NULL DEFAULT false,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Relación baterías-documentos (qué documentos requiere cada batería)
CREATE TABLE public.bateria_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paquete_id UUID NOT NULL REFERENCES public.paquetes_examenes(id) ON DELETE CASCADE,
  documento_id UUID NOT NULL REFERENCES public.documentos_formularios(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(paquete_id, documento_id)
);

-- 4. Precios de baterías por empresa
CREATE TABLE public.empresa_baterias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  paquete_id UUID NOT NULL REFERENCES public.paquetes_examenes(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, paquete_id)
);

-- 5. Respuestas de pacientes a documentos/formularios
CREATE TABLE public.atencion_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atencion_id UUID NOT NULL REFERENCES public.atenciones(id) ON DELETE CASCADE,
  documento_id UUID NOT NULL REFERENCES public.documentos_formularios(id) ON DELETE CASCADE,
  respuestas JSONB NOT NULL DEFAULT '{}', -- { "campo_id": "valor", ... }
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, completado, revisado
  completado_at TIMESTAMP WITH TIME ZONE,
  revisado_por UUID,
  revisado_at TIMESTAMP WITH TIME ZONE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(atencion_id, documento_id)
);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_documentos_formularios_updated_at
BEFORE UPDATE ON public.documentos_formularios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empresa_baterias_updated_at
BEFORE UPDATE ON public.empresa_baterias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_atencion_documentos_updated_at
BEFORE UPDATE ON public.atencion_documentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Documentos formularios
ALTER TABLE public.documentos_formularios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver documentos" 
ON public.documentos_formularios FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Staff puede crear documentos" 
ON public.documentos_formularios FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Staff puede editar documentos" 
ON public.documentos_formularios FOR UPDATE 
TO authenticated USING (true);

CREATE POLICY "Staff puede eliminar documentos" 
ON public.documentos_formularios FOR DELETE 
TO authenticated USING (true);

CREATE POLICY "Portal puede ver documentos activos" 
ON public.documentos_formularios FOR SELECT 
TO anon USING (activo = true);

-- Documento campos
ALTER TABLE public.documento_campos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver campos" 
ON public.documento_campos FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Staff puede crear campos" 
ON public.documento_campos FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Staff puede editar campos" 
ON public.documento_campos FOR UPDATE 
TO authenticated USING (true);

CREATE POLICY "Staff puede eliminar campos" 
ON public.documento_campos FOR DELETE 
TO authenticated USING (true);

CREATE POLICY "Portal puede ver campos" 
ON public.documento_campos FOR SELECT 
TO anon USING (true);

-- Batería documentos
ALTER TABLE public.bateria_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver bateria_documentos" 
ON public.bateria_documentos FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Staff puede crear bateria_documentos" 
ON public.bateria_documentos FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Staff puede editar bateria_documentos" 
ON public.bateria_documentos FOR UPDATE 
TO authenticated USING (true);

CREATE POLICY "Staff puede eliminar bateria_documentos" 
ON public.bateria_documentos FOR DELETE 
TO authenticated USING (true);

CREATE POLICY "Portal puede ver bateria_documentos" 
ON public.bateria_documentos FOR SELECT 
TO anon USING (true);

-- Empresa baterías
ALTER TABLE public.empresa_baterias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver empresa_baterias" 
ON public.empresa_baterias FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Staff puede crear empresa_baterias" 
ON public.empresa_baterias FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Staff puede editar empresa_baterias" 
ON public.empresa_baterias FOR UPDATE 
TO authenticated USING (true);

CREATE POLICY "Staff puede eliminar empresa_baterias" 
ON public.empresa_baterias FOR DELETE 
TO authenticated USING (true);

-- Atención documentos
ALTER TABLE public.atencion_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver atencion_documentos" 
ON public.atencion_documentos FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Staff puede crear atencion_documentos" 
ON public.atencion_documentos FOR INSERT 
TO authenticated WITH CHECK (true);

CREATE POLICY "Staff puede editar atencion_documentos" 
ON public.atencion_documentos FOR UPDATE 
TO authenticated USING (true);

CREATE POLICY "Staff puede eliminar atencion_documentos" 
ON public.atencion_documentos FOR DELETE 
TO authenticated USING (true);

CREATE POLICY "Portal puede ver sus documentos" 
ON public.atencion_documentos FOR SELECT 
TO anon USING (true);

CREATE POLICY "Portal puede completar documentos" 
ON public.atencion_documentos FOR UPDATE 
TO anon USING (estado = 'pendiente');

CREATE POLICY "Portal puede crear atencion_documentos" 
ON public.atencion_documentos FOR INSERT 
TO anon WITH CHECK (true);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_documento_campos_documento ON public.documento_campos(documento_id);
CREATE INDEX idx_bateria_documentos_paquete ON public.bateria_documentos(paquete_id);
CREATE INDEX idx_bateria_documentos_documento ON public.bateria_documentos(documento_id);
CREATE INDEX idx_empresa_baterias_empresa ON public.empresa_baterias(empresa_id);
CREATE INDEX idx_empresa_baterias_paquete ON public.empresa_baterias(paquete_id);
CREATE INDEX idx_atencion_documentos_atencion ON public.atencion_documentos(atencion_id);
CREATE INDEX idx_atencion_documentos_documento ON public.atencion_documentos(documento_id);
CREATE INDEX idx_atencion_documentos_estado ON public.atencion_documentos(estado);