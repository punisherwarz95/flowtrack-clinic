-- Crear tabla de pacientes
CREATE TABLE public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut VARCHAR(12) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(255),
  fecha_nacimiento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla de boxes
CREATE TABLE public.boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear tabla de exámenes
CREATE TABLE public.examenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  duracion_estimada INTEGER, -- en minutos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Relación muchos a muchos: boxes y exámenes
CREATE TABLE public.box_examenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE NOT NULL,
  examen_id UUID REFERENCES public.examenes(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(box_id, examen_id)
);

-- Enum para estados de atención
CREATE TYPE estado_atencion AS ENUM ('en_espera', 'en_atencion', 'completado', 'incompleto');

-- Tabla de atenciones (flujo de pacientes)
CREATE TABLE public.atenciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE NOT NULL,
  box_id UUID REFERENCES public.boxes(id) ON DELETE SET NULL,
  estado estado_atencion DEFAULT 'en_espera',
  fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fecha_inicio_atencion TIMESTAMP WITH TIME ZONE,
  fecha_fin_atencion TIMESTAMP WITH TIME ZONE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enum para estado de examen individual
CREATE TYPE estado_examen AS ENUM ('pendiente', 'completado', 'incompleto');

-- Relación atención-exámenes (qué exámenes se hicieron en cada atención)
CREATE TABLE public.atencion_examenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atencion_id UUID REFERENCES public.atenciones(id) ON DELETE CASCADE NOT NULL,
  examen_id UUID REFERENCES public.examenes(id) ON DELETE CASCADE NOT NULL,
  estado estado_examen DEFAULT 'pendiente',
  observaciones TEXT,
  fecha_realizacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_atenciones_paciente ON public.atenciones(paciente_id);
CREATE INDEX idx_atenciones_box ON public.atenciones(box_id);
CREATE INDEX idx_atenciones_estado ON public.atenciones(estado);
CREATE INDEX idx_atencion_examenes_atencion ON public.atencion_examenes(atencion_id);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_examenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atencion_examenes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permisivas para sistema interno (sin autenticación de usuarios)
-- Permitir todas las operaciones a todos (anon role)
CREATE POLICY "Permitir todo en pacientes" ON public.pacientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en boxes" ON public.boxes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en examenes" ON public.examenes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en box_examenes" ON public.box_examenes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en atenciones" ON public.atenciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en atencion_examenes" ON public.atencion_examenes FOR ALL USING (true) WITH CHECK (true);

-- Habilitar realtime para seguimiento en tiempo real del flujo
ALTER PUBLICATION supabase_realtime ADD TABLE public.atenciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.atencion_examenes;