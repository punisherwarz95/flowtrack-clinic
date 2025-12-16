-- Allow Portal Paciente to read boxes
CREATE POLICY "Portal puede leer boxes" 
ON public.boxes 
FOR SELECT 
USING (true);

-- Allow Portal Paciente to read box_examenes to map exams to boxes
CREATE POLICY "Portal puede leer box_examenes" 
ON public.box_examenes 
FOR SELECT 
USING (true);