import { supabase } from "@/integrations/supabase/client";

export const importPatientsFromExcel = async (file: File) => {
  // Leer archivo Excel usando FileReader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(row => row.split(','));
        
        // Ignorar la primera fila (encabezados)
        const patients = rows.slice(1).filter(row => row.length >= 2).map(row => ({
          rut: row[0]?.trim() || '',
          nombre: row[1]?.trim() || '',
          telefono: row[2]?.trim() || null,
          email: row[3]?.trim() || null,
          fecha_nacimiento: row[4]?.trim() || null,
        }));

        // Insertar pacientes en la base de datos
        const { data, error } = await supabase
          .from('pacientes')
          .insert(patients)
          .select();

        if (error) throw error;
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export const getPatients = async () => {
  const { data, error } = await supabase
    .from('pacientes')
    .select('*')
    .order('nombre');
  
  if (error) throw error;
  return data;
};

export const getBoxes = async () => {
  const { data, error } = await supabase
    .from('boxes')
    .select('*, box_examenes(examen_id, examenes(*))')
    .eq('activo', true)
    .order('nombre');
  
  if (error) throw error;
  return data;
};

export const getExamenes = async () => {
  const { data, error } = await supabase
    .from('examenes')
    .select('*')
    .order('nombre');
  
  if (error) throw error;
  return data;
};

export const getAtenciones = async () => {
  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      *,
      pacientes(*),
      boxes(*),
      atencion_examenes(*, examenes(*))
    `)
    .order('fecha_ingreso', { ascending: false });
  
  if (error) throw error;
  return data;
};
