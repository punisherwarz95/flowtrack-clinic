-- Convertir todos los nombres de exámenes existentes a mayúsculas
UPDATE examenes SET nombre = UPPER(nombre);

-- Trigger para que futuros INSERT/UPDATE también queden en mayúsculas
CREATE OR REPLACE FUNCTION public.uppercase_examen_nombre()
RETURNS trigger AS $$
BEGIN
  NEW.nombre = UPPER(NEW.nombre);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tr_uppercase_examen_nombre
BEFORE INSERT OR UPDATE ON examenes
FOR EACH ROW EXECUTE FUNCTION public.uppercase_examen_nombre();