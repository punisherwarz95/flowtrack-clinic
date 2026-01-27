-- =====================================================
-- PORTAL DE EMPRESAS Y SISTEMA DE AGENDAMIENTO
-- Migración completa de todas las tablas nuevas
-- =====================================================

-- 1. SISTEMA DE FAENAS (Centros de trabajo)
-- =====================================================

-- Faenas/Centros de trabajo por empresa
CREATE TABLE public.faenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  direccion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, nombre)
);

-- Habilitar RLS
ALTER TABLE public.faenas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para faenas
CREATE POLICY "Staff puede gestionar faenas" ON public.faenas
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Portal empresa puede ver sus faenas" ON public.faenas
FOR SELECT USING (true);

-- Relación baterías-faenas (muchos a muchos)
CREATE TABLE public.bateria_faenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paquete_id UUID NOT NULL REFERENCES public.paquetes_examenes(id) ON DELETE CASCADE,
  faena_id UUID NOT NULL REFERENCES public.faenas(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(paquete_id, faena_id)
);

ALTER TABLE public.bateria_faenas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar bateria_faenas" ON public.bateria_faenas
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Portal puede ver bateria_faenas" ON public.bateria_faenas
FOR SELECT USING (true);

-- 2. USUARIOS DE EMPRESAS
-- =====================================================

-- Tabla para usuarios del portal de empresas
CREATE TABLE public.empresa_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  auth_user_id UUID UNIQUE, -- Referencia al usuario en auth.users
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cargo TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_id, email)
);

ALTER TABLE public.empresa_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar empresa_usuarios" ON public.empresa_usuarios
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Usuario empresa puede ver su perfil" ON public.empresa_usuarios
FOR SELECT USING (auth.uid() = auth_user_id);

-- Roles para usuarios de empresa
CREATE TABLE public.empresa_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_usuario_id UUID NOT NULL REFERENCES public.empresa_usuarios(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'usuario', -- admin_empresa, usuario
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(empresa_usuario_id, role)
);

ALTER TABLE public.empresa_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar roles empresa" ON public.empresa_user_roles
FOR ALL USING (true) WITH CHECK (true);

-- 3. SISTEMA DE AGENDAMIENTO POR BLOQUES
-- =====================================================

-- Configuración de bloques horarios
CREATE TABLE public.agenda_bloques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL, -- ej: "Bloque 1", "Mañana temprano"
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  cupo_maximo INTEGER NOT NULL DEFAULT 10,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agenda_bloques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar bloques" ON public.agenda_bloques
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Portal puede ver bloques" ON public.agenda_bloques
FOR SELECT USING (activo = true);

-- Insertar bloques por defecto
INSERT INTO public.agenda_bloques (nombre, hora_inicio, hora_fin, cupo_maximo, orden) VALUES
('Bloque 1', '08:00', '09:00', 10, 1),
('Bloque 2', '09:00', '10:00', 10, 2),
('Bloque 3', '10:00', '11:00', 10, 3),
('Bloque 4', '11:00', '12:00', 10, 4);

-- Cupos reservados por empresa/bloque/fecha
CREATE TABLE public.agenda_cupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloque_id UUID NOT NULL REFERENCES public.agenda_bloques(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  cupos_reservados INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bloque_id, empresa_id, fecha)
);

ALTER TABLE public.agenda_cupos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar cupos" ON public.agenda_cupos
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Empresa puede ver sus cupos" ON public.agenda_cupos
FOR SELECT USING (true);

-- 4. SISTEMA DE PRE-RESERVAS
-- =====================================================

-- Pre-reservas de pacientes por empresa
CREATE TABLE public.prereservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  bloque_id UUID NOT NULL REFERENCES public.agenda_bloques(id),
  faena_id UUID NOT NULL REFERENCES public.faenas(id),
  fecha DATE NOT NULL,
  rut TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cargo TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  estado TEXT DEFAULT 'pendiente', -- pendiente, confirmado, cancelado, atendido
  created_by UUID REFERENCES public.empresa_usuarios(id),
  atencion_id UUID REFERENCES public.atenciones(id),
  confirmado_at TIMESTAMPTZ,
  confirmado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.prereservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar prereservas" ON public.prereservas
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Empresa puede ver sus prereservas" ON public.prereservas
FOR SELECT USING (true);

CREATE POLICY "Empresa puede crear prereservas" ON public.prereservas
FOR INSERT WITH CHECK (true);

CREATE POLICY "Portal paciente puede ver prereservas por RUT" ON public.prereservas
FOR SELECT USING (true);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_prereservas_fecha ON public.prereservas(fecha);
CREATE INDEX idx_prereservas_rut ON public.prereservas(rut);
CREATE INDEX idx_prereservas_empresa_fecha ON public.prereservas(empresa_id, fecha);

-- Baterías asociadas a cada pre-reserva
CREATE TABLE public.prereserva_baterias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prereserva_id UUID NOT NULL REFERENCES public.prereservas(id) ON DELETE CASCADE,
  paquete_id UUID NOT NULL REFERENCES public.paquetes_examenes(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prereserva_id, paquete_id)
);

ALTER TABLE public.prereserva_baterias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar prereserva_baterias" ON public.prereserva_baterias
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Portal puede ver prereserva_baterias" ON public.prereserva_baterias
FOR SELECT USING (true);

CREATE POLICY "Empresa puede crear prereserva_baterias" ON public.prereserva_baterias
FOR INSERT WITH CHECK (true);

-- 5. SISTEMA DE COTIZACIONES EXTENDIDO
-- =====================================================

-- Solicitudes de cotización desde empresas
CREATE TABLE public.cotizacion_solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  empresa_usuario_id UUID REFERENCES public.empresa_usuarios(id),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  faena_id UUID REFERENCES public.faenas(id),
  estado TEXT DEFAULT 'pendiente', -- pendiente, en_revision, respondida, aceptada, rechazada
  cotizacion_id UUID REFERENCES public.cotizaciones(id),
  respondido_at TIMESTAMPTZ,
  respondido_por UUID,
  aceptado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cotizacion_solicitudes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar solicitudes" ON public.cotizacion_solicitudes
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Empresa puede ver sus solicitudes" ON public.cotizacion_solicitudes
FOR SELECT USING (true);

CREATE POLICY "Empresa puede crear solicitudes" ON public.cotizacion_solicitudes
FOR INSERT WITH CHECK (true);

CREATE POLICY "Empresa puede actualizar sus solicitudes" ON public.cotizacion_solicitudes
FOR UPDATE USING (true);

-- Agregar columna de solicitud a cotizaciones existentes
ALTER TABLE public.cotizaciones ADD COLUMN IF NOT EXISTS solicitud_id UUID REFERENCES public.cotizacion_solicitudes(id);

-- Ítems solicitados en una solicitud de cotización
CREATE TABLE public.cotizacion_solicitud_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES public.cotizacion_solicitudes(id) ON DELETE CASCADE,
  paquete_id UUID REFERENCES public.paquetes_examenes(id),
  examen_id UUID REFERENCES public.examenes(id),
  descripcion TEXT,
  cantidad_estimada INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cotizacion_solicitud_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar solicitud_items" ON public.cotizacion_solicitud_items
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Empresa puede ver sus solicitud_items" ON public.cotizacion_solicitud_items
FOR SELECT USING (true);

CREATE POLICY "Empresa puede crear solicitud_items" ON public.cotizacion_solicitud_items
FOR INSERT WITH CHECK (true);

-- 6. ESTADOS DE PAGO
-- =====================================================

-- Estados de cuenta por empresa
CREATE TABLE public.estados_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE NOT NULL,
  total_neto NUMERIC DEFAULT 0,
  total_iva NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'pendiente', -- pendiente, enviado, pagado
  observaciones TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.estados_pago ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar estados_pago" ON public.estados_pago
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Empresa puede ver sus estados_pago" ON public.estados_pago
FOR SELECT USING (true);

-- Función para obtener siguiente número de estado de pago
CREATE OR REPLACE FUNCTION public.get_next_estado_pago_number(p_empresa_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero), 0) + 1 INTO next_num 
  FROM public.estados_pago 
  WHERE empresa_id = p_empresa_id;
  RETURN next_num;
END;
$$;

-- Ítems de cada estado de pago
CREATE TABLE public.estado_pago_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estado_pago_id UUID NOT NULL REFERENCES public.estados_pago(id) ON DELETE CASCADE,
  atencion_id UUID NOT NULL REFERENCES public.atenciones(id),
  paciente_nombre TEXT NOT NULL,
  paciente_rut TEXT,
  cargo TEXT,
  faena TEXT,
  fecha_atencion DATE NOT NULL,
  baterias JSONB DEFAULT '[]', -- [{nombre, valor}]
  subtotal NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.estado_pago_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar estado_pago_items" ON public.estado_pago_items
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Empresa puede ver sus estado_pago_items" ON public.estado_pago_items
FOR SELECT USING (true);

-- 7. EVALUACIONES CLÍNICAS
-- =====================================================

-- Evaluaciones por paciente y batería
CREATE TABLE public.evaluaciones_clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atencion_id UUID NOT NULL REFERENCES public.atenciones(id) ON DELETE CASCADE,
  paquete_id UUID NOT NULL REFERENCES public.paquetes_examenes(id),
  resultado TEXT DEFAULT 'pendiente', -- pendiente, aprobado, rechazado, observado
  observaciones TEXT,
  restricciones TEXT,
  datos_clinicos JSONB DEFAULT '{}',
  evaluado_por UUID,
  evaluado_at TIMESTAMPTZ,
  revisado_por UUID,
  revisado_at TIMESTAMPTZ,
  numero_informe INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(atencion_id, paquete_id)
);

ALTER TABLE public.evaluaciones_clinicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede gestionar evaluaciones" ON public.evaluaciones_clinicas
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Empresa puede ver evaluaciones de sus pacientes" ON public.evaluaciones_clinicas
FOR SELECT USING (true);

-- Índices para evaluaciones
CREATE INDEX idx_evaluaciones_atencion ON public.evaluaciones_clinicas(atencion_id);
CREATE INDEX idx_evaluaciones_resultado ON public.evaluaciones_clinicas(resultado);

-- Función para obtener siguiente número de informe
CREATE OR REPLACE FUNCTION public.get_next_informe_number()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_informe), 0) + 1 INTO next_num FROM public.evaluaciones_clinicas;
  RETURN next_num;
END;
$$;

-- 8. CAMPOS ADICIONALES EN PACIENTES
-- =====================================================

-- Agregar campo cargo a pacientes si no existe
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS cargo TEXT;

-- Agregar faena_id a pacientes
ALTER TABLE public.pacientes ADD COLUMN IF NOT EXISTS faena_id UUID REFERENCES public.faenas(id);

-- 9. CAMPO ADICIONAL EN ATENCIONES
-- =====================================================

-- Agregar referencia a prereserva en atenciones
ALTER TABLE public.atenciones ADD COLUMN IF NOT EXISTS prereserva_id UUID REFERENCES public.prereservas(id);

-- 10. CREAR FAENA GLOBAL "HOMOLOGACIÓN INTERFAENA 2025"
-- =====================================================

-- Primero necesitamos una empresa "global" o crear la faena sin empresa
-- Creamos una función para asignar baterías existentes a esta faena
-- La faena global se creará cuando se cree la primera empresa

-- 11. FUNCIÓN HELPER PARA VERIFICAR SI USUARIO ES DE EMPRESA
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_empresa_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empresa_usuarios
    WHERE auth_user_id = p_user_id
      AND activo = true
  )
$$;

-- Función para obtener empresa_id del usuario
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.empresa_usuarios
  WHERE auth_user_id = p_user_id
    AND activo = true
  LIMIT 1
$$;

-- 12. TRIGGER PARA ACTUALIZAR updated_at
-- =====================================================

-- Aplicar trigger a nuevas tablas
CREATE TRIGGER update_empresa_usuarios_updated_at
  BEFORE UPDATE ON public.empresa_usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prereservas_updated_at
  BEFORE UPDATE ON public.prereservas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cotizacion_solicitudes_updated_at
  BEFORE UPDATE ON public.cotizacion_solicitudes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estados_pago_updated_at
  BEFORE UPDATE ON public.estados_pago
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluaciones_clinicas_updated_at
  BEFORE UPDATE ON public.evaluaciones_clinicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agenda_cupos_updated_at
  BEFORE UPDATE ON public.agenda_cupos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();