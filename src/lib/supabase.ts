import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

export interface ImportResult {
  examenesCreados: number;
  examenesActualizados: number;
  prestadoresCreados: number;
  relacionesCreadas: number;
  boxRelacionesCreadas: number;
  errores: string[];
}

export interface ExcelRowData {
  codigo: string;
  nombre: string;
  costo: number | null;
  prestador: string | null;
  box: string | null;
}

export const parseExcelFile = async (file: File): Promise<ExcelRowData[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Use defval to handle empty cells
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { 
    header: 1,
    defval: ""
  });

  // Skip header row and process data
  const rows: ExcelRowData[] = [];
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || !Array.isArray(row) || row.length < 2) continue;

    const codigo = String(row[0] || "").trim();
    const nombre = String(row[1] || "").trim();

    if (!codigo || !nombre) continue;

    rows.push({
      codigo,
      nombre,
      costo: row[2] !== undefined && row[2] !== "" ? Number(row[2]) : null,
      prestador: row[3] ? String(row[3]).trim() : null,
      box: row[4] ? String(row[4]).trim() : null,
    });
  }

  return rows;
};

export const importExamenesYPrestadoresFromExcel = async (
  rows: ExcelRowData[],
  onProgress?: (progress: number) => void
): Promise<ImportResult> => {
  const result: ImportResult = {
    examenesCreados: 0,
    examenesActualizados: 0,
    prestadoresCreados: 0,
    relacionesCreadas: 0,
    boxRelacionesCreadas: 0,
    errores: [],
  };

  // Cache para prestadores existentes
  const { data: prestadoresExistentes } = await supabase
    .from("prestadores")
    .select("id, nombre");
  
  const prestadoresMap = new Map<string, string>();
  prestadoresExistentes?.forEach((p) => {
    prestadoresMap.set(p.nombre.toLowerCase().trim(), p.id);
  });

  // Cache para exámenes existentes
  const { data: examenesExistentes } = await supabase
    .from("examenes")
    .select("id, codigo");
  
  const examenesMap = new Map<string, string>();
  examenesExistentes?.forEach((e) => {
    if (e.codigo) {
      examenesMap.set(e.codigo.toLowerCase().trim(), e.id);
    }
  });

  // Cache para boxes existentes
  const { data: boxesExistentes } = await supabase
    .from("boxes")
    .select("id, nombre")
    .eq("activo", true);
  
  const boxesMap = new Map<string, string>();
  boxesExistentes?.forEach((b) => {
    boxesMap.set(b.nombre.toLowerCase().trim(), b.id);
  });

  // Cache para relaciones prestador-examen existentes
  const { data: relacionesExistentes } = await supabase
    .from("prestador_examenes")
    .select("prestador_id, examen_id");
  
  const relacionesSet = new Set<string>();
  relacionesExistentes?.forEach((r) => {
    relacionesSet.add(`${r.prestador_id}-${r.examen_id}`);
  });

  // Cache para relaciones box-examen existentes
  const { data: boxRelacionesExistentes } = await supabase
    .from("box_examenes")
    .select("box_id, examen_id");
  
  const boxRelacionesSet = new Set<string>();
  boxRelacionesExistentes?.forEach((r) => {
    boxRelacionesSet.add(`${r.box_id}-${r.examen_id}`);
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    try {
      let examenId: string;
      const codigoLower = row.codigo.toLowerCase().trim();

      // 1. Buscar o crear examen
      // Si ya existe, solo usamos el ID existente (no actualizamos costo_neto)
      if (examenesMap.has(codigoLower)) {
        examenId = examenesMap.get(codigoLower)!;
        // No actualizamos - el costo base se mantiene del primer registro
      } else {
        // Crear nuevo examen
        const { data, error } = await supabase
          .from("examenes")
          .insert({
            codigo: row.codigo,
            nombre: row.nombre,
            costo_neto: row.costo ?? 0,
          })
          .select("id")
          .single();

        if (error) throw error;
        examenId = data.id;
        examenesMap.set(codigoLower, examenId);
        result.examenesCreados++;
      }

      // 2. Si hay prestador, buscar o crear
      if (row.prestador) {
        const prestadorLower = row.prestador.toLowerCase().trim();
        let prestadorId: string;

        if (prestadoresMap.has(prestadorLower)) {
          prestadorId = prestadoresMap.get(prestadorLower)!;
        } else {
          // Crear nuevo prestador
          const { data, error } = await supabase
            .from("prestadores")
            .insert({
              nombre: row.prestador,
              activo: true,
            })
            .select("id")
            .single();

          if (error) throw error;
          prestadorId = data.id;
          prestadoresMap.set(prestadorLower, prestadorId);
          result.prestadoresCreados++;
        }

        // 3. Crear o actualizar relación prestador-examen
        const relacionKey = `${prestadorId}-${examenId}`;
        if (!relacionesSet.has(relacionKey)) {
          // Crear nueva relación con el valor del Excel
          const { error } = await supabase
            .from("prestador_examenes")
            .insert({
              prestador_id: prestadorId,
              examen_id: examenId,
              valor_prestacion: row.costo ?? 0,
            });

          if (error) throw error;
          relacionesSet.add(relacionKey);
          result.relacionesCreadas++;
        } else {
          // Actualizar valor_prestacion si la relación ya existe
          const { error } = await supabase
            .from("prestador_examenes")
            .update({ valor_prestacion: row.costo ?? 0 })
            .eq("prestador_id", prestadorId)
            .eq("examen_id", examenId);

          if (error) throw error;
        }
      }

      // 4. Si hay box, buscar y crear relación
      if (row.box) {
        const boxLower = row.box.toLowerCase().trim();
        
        if (boxesMap.has(boxLower)) {
          const boxId = boxesMap.get(boxLower)!;
          const boxRelacionKey = `${boxId}-${examenId}`;
          
          if (!boxRelacionesSet.has(boxRelacionKey)) {
            const { error } = await supabase
              .from("box_examenes")
              .insert({
                box_id: boxId,
                examen_id: examenId,
              });

            if (error) throw error;
            boxRelacionesSet.add(boxRelacionKey);
            result.boxRelacionesCreadas++;
          }
        } else {
          result.errores.push(`Fila ${i + 2}: Box "${row.box}" no encontrado`);
        }
      }
    } catch (error: any) {
      result.errores.push(`Fila ${i + 2}: ${error.message || "Error desconocido"}`);
    }

    // Reportar progreso
    if (onProgress) {
      onProgress(Math.round(((i + 1) / rows.length) * 100));
    }
  }

  return result;
};

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
    .select('*, empresas(*)')
    .order('nombre');
  
  if (error) throw error;
  return data;
};

export const getEmpresas = async () => {
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .order('nombre');
  
  if (error) throw error;
  return data;
};

export const importEmpresasFromExcel = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(row => row.split(','));
        
        const empresas = rows.slice(1).filter(row => row.length >= 1 && row[0]?.trim()).map(row => ({
          nombre: row[0]?.trim() || '',
        }));

        const { data, error } = await supabase
          .from('empresas')
          .insert(empresas)
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
    .order('numero_ingreso', { ascending: true });
  
  if (error) throw error;
  return data;
};
