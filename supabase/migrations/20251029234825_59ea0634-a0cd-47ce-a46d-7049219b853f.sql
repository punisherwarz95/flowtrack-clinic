-- Crear enum para tipo de servicio
CREATE TYPE tipo_servicio AS ENUM ('workmed', 'jenner');

-- Crear tabla de empresas
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agregar columnas a la tabla pacientes
ALTER TABLE public.pacientes 
ADD COLUMN tipo_servicio tipo_servicio,
ADD COLUMN empresa_id UUID REFERENCES public.empresas(id),
ADD COLUMN tiene_ficha BOOLEAN DEFAULT true;

-- Crear índice para empresa_id
CREATE INDEX idx_pacientes_empresa_id ON public.pacientes(empresa_id);

-- Habilitar RLS en empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Política para empresas (acceso público para lectura)
CREATE POLICY "Permitir todo en empresas" ON public.empresas
FOR ALL USING (true) WITH CHECK (true);