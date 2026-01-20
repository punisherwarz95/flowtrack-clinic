-- Fix RLS policy for portal to complete documents
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Portal puede completar documentos" ON public.atencion_documentos;

-- Create new policy with proper WITH CHECK clause
CREATE POLICY "Portal puede completar documentos" 
ON public.atencion_documentos 
FOR UPDATE
USING (estado = 'pendiente')
WITH CHECK (estado IN ('pendiente', 'completado'));