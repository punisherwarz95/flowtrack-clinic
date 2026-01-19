-- Set the sequence for numero_cotizacion to start at 303
-- First, check if there's an existing sequence and update it
DO $$
BEGIN
  -- Update any existing cotizaciones to have lower numbers if needed
  -- Then set the next value to 303
  PERFORM setval(
    pg_get_serial_sequence('public.cotizaciones', 'numero_cotizacion'),
    302,
    true
  );
EXCEPTION
  WHEN others THEN
    -- If no sequence exists, we'll handle it differently
    NULL;
END $$;

-- Alternative: If numero_cotizacion uses a default with gen_random, update it
-- Create or replace the function to get next cotizacion number
CREATE OR REPLACE FUNCTION public.get_next_cotizacion_number()
RETURNS INTEGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_cotizacion), 302) + 1 INTO next_num FROM public.cotizaciones;
  -- Ensure minimum is 303
  IF next_num < 303 THEN
    next_num := 303;
  END IF;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Update the default for numero_cotizacion column
ALTER TABLE public.cotizaciones 
ALTER COLUMN numero_cotizacion SET DEFAULT public.get_next_cotizacion_number();