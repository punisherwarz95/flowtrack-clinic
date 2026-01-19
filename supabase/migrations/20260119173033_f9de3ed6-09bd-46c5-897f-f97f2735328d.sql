-- Add column to track if cotizacion is subject to IVA (afecto) or exempt (exento)
ALTER TABLE public.cotizaciones 
ADD COLUMN afecto_iva boolean NOT NULL DEFAULT true;