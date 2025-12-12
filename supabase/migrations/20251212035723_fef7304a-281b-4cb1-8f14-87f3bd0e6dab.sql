-- Fix RLS policies for all data tables to require authentication

-- 1. pacientes - Contains sensitive patient PII
DROP POLICY IF EXISTS "Permitir todo en pacientes" ON pacientes;
CREATE POLICY "Staff autenticado puede acceder pacientes"
ON pacientes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. atenciones - Contains medical visit history
DROP POLICY IF EXISTS "Permitir todo en atenciones" ON atenciones;
CREATE POLICY "Staff autenticado puede acceder atenciones"
ON atenciones FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. atencion_examenes - Contains exam results
DROP POLICY IF EXISTS "Permitir todo en atencion_examenes" ON atencion_examenes;
CREATE POLICY "Staff autenticado puede acceder atencion_examenes"
ON atencion_examenes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. empresas - Contains client company data
DROP POLICY IF EXISTS "Permitir todo en empresas" ON empresas;
CREATE POLICY "Staff autenticado puede acceder empresas"
ON empresas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. boxes - Operational data
DROP POLICY IF EXISTS "Permitir todo en boxes" ON boxes;
CREATE POLICY "Staff autenticado puede acceder boxes"
ON boxes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. examenes - Exam types
DROP POLICY IF EXISTS "Permitir todo en examenes" ON examenes;
CREATE POLICY "Staff autenticado puede acceder examenes"
ON examenes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. box_examenes - Box-exam relationships
DROP POLICY IF EXISTS "Permitir todo en box_examenes" ON box_examenes;
CREATE POLICY "Staff autenticado puede acceder box_examenes"
ON box_examenes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 8. paquetes_examenes - Exam packages
DROP POLICY IF EXISTS "Permitir todo en paquetes_examenes" ON paquetes_examenes;
CREATE POLICY "Staff autenticado puede acceder paquetes_examenes"
ON paquetes_examenes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. paquete_examen_items - Package items
DROP POLICY IF EXISTS "Permitir todo en paquete_examen_items" ON paquete_examen_items;
CREATE POLICY "Staff autenticado puede acceder paquete_examen_items"
ON paquete_examen_items FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);