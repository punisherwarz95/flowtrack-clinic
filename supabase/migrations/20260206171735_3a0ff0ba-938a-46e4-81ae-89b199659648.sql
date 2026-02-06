-- Agregar columna para índice de secuencia en codigos_diarios
ALTER TABLE public.codigos_diarios ADD COLUMN IF NOT EXISTS indice_secuencia INTEGER;

-- Crear índice único para asegurar códigos únicos
CREATE UNIQUE INDEX IF NOT EXISTS idx_codigos_diarios_codigo ON public.codigos_diarios(codigo);

-- Actualizar índices existentes basados en el orden de creación
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as seq
  FROM public.codigos_diarios
)
UPDATE public.codigos_diarios cd
SET indice_secuencia = n.seq
FROM numbered n
WHERE cd.id = n.id;