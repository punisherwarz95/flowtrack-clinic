import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DocumentoCampo {
  id: string;
  documento_id: string;
  etiqueta: string;
  tipo_campo: string;
  opciones: unknown;
  requerido: boolean;
  orden: number;
}

interface AtencionDocumento {
  id: string;
  atencion_id: string;
  documento_id: string;
  respuestas: Record<string, unknown>;
  estado: string;
  completado_at: string | null;
  revisado_at: string | null;
  revisado_por: string | null;
  observaciones: string | null;
  documentos_formularios: {
    id: string;
    nombre: string;
    descripcion: string | null;
    tipo: string;
  };
}

export const useAtencionDocumentos = (atencionId: string | null) => {
  const [documentos, setDocumentos] = useState<AtencionDocumento[]>([]);
  const [campos, setCampos] = useState<Record<string, DocumentoCampo[]>>({});
  const [loading, setLoading] = useState(false);

  const loadDocumentos = useCallback(async () => {
    if (!atencionId) {
      setDocumentos([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("atencion_documentos")
        .select(`
          *,
          documentos_formularios (
            id,
            nombre,
            descripcion,
            tipo
          )
        `)
        .eq("atencion_id", atencionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Cast respuestas to proper type
      const typedData = (data || []).map(doc => ({
        ...doc,
        respuestas: (doc.respuestas || {}) as Record<string, unknown>
      }));
      
      setDocumentos(typedData as AtencionDocumento[]);

      // Load campos for each documento
      const documentoIds = [...new Set(typedData.map(d => d.documento_id))];
      if (documentoIds.length > 0) {
        const { data: camposData, error: camposError } = await supabase
          .from("documento_campos")
          .select("*")
          .in("documento_id", documentoIds)
          .order("orden");

        if (!camposError && camposData) {
          const camposByDoc: Record<string, DocumentoCampo[]> = {};
          camposData.forEach((campo) => {
            if (!camposByDoc[campo.documento_id]) {
              camposByDoc[campo.documento_id] = [];
            }
            camposByDoc[campo.documento_id].push(campo);
          });
          setCampos(camposByDoc);
        }
      }
    } catch (error) {
      console.error("Error loading atencion documentos:", error);
    } finally {
      setLoading(false);
    }
  }, [atencionId]);

  useEffect(() => {
    loadDocumentos();
  }, [loadDocumentos]);

  const pendingCount = documentos.filter(d => d.estado === "pendiente").length;
  const completedCount = documentos.filter(d => d.estado === "completado" || d.estado === "revisado").length;

  return {
    documentos,
    campos,
    loading,
    reload: loadDocumentos,
    pendingCount,
    completedCount,
    totalCount: documentos.length,
  };
};

// Hook to generate documents from battery when assigning to patient
export const useGenerateDocumentosFromBateria = () => {
  const generateDocuments = async (atencionId: string, paqueteIds: string[]): Promise<{ success: boolean; count: number; error?: string }> => {
    console.log("[GenerateDocuments] Iniciando - atencionId:", atencionId, "paqueteIds:", paqueteIds);
    
    if (!atencionId || paqueteIds.length === 0) {
      console.log("[GenerateDocuments] No hay atencionId o paqueteIds vacíos, saliendo");
      return { success: true, count: 0 };
    }

    try {
      // Get all documents associated with the selected batteries
      console.log("[GenerateDocuments] Buscando documentos en bateria_documentos para paquetes:", paqueteIds);
      const { data: bateriaDocumentos, error: bdError } = await supabase
        .from("bateria_documentos")
        .select("documento_id, paquete_id")
        .in("paquete_id", paqueteIds);

      if (bdError) {
        console.error("[GenerateDocuments] Error consultando bateria_documentos:", bdError);
        throw bdError;
      }

      console.log("[GenerateDocuments] Documentos encontrados en baterías:", bateriaDocumentos);

      if (!bateriaDocumentos || bateriaDocumentos.length === 0) {
        console.log("[GenerateDocuments] No hay documentos asociados a estas baterías");
        return { success: true, count: 0 };
      }

      const uniqueDocumentoIds = [...new Set(bateriaDocumentos.map(bd => bd.documento_id))];
      console.log("[GenerateDocuments] IDs únicos de documentos:", uniqueDocumentoIds);

      // Check which documents already exist for this atencion
      const { data: existingDocs, error: existingError } = await supabase
        .from("atencion_documentos")
        .select("documento_id")
        .eq("atencion_id", atencionId);

      if (existingError) {
        console.error("[GenerateDocuments] Error consultando documentos existentes:", existingError);
        throw existingError;
      }

      const existingDocIds = new Set((existingDocs || []).map(d => d.documento_id));
      const newDocIds = uniqueDocumentoIds.filter(id => !existingDocIds.has(id));
      
      console.log("[GenerateDocuments] Documentos existentes:", existingDocs?.length || 0, "Nuevos a crear:", newDocIds.length);

      if (newDocIds.length === 0) {
        console.log("[GenerateDocuments] Todos los documentos ya existen, no se crean nuevos");
        return { success: true, count: 0 };
      }

      // Create new atencion_documentos
      const newDocs = newDocIds.map(documento_id => ({
        atencion_id: atencionId,
        documento_id,
        respuestas: {},
        estado: "pendiente",
      }));

      console.log("[GenerateDocuments] Insertando documentos:", newDocs);
      const { data: insertedData, error: insertError } = await supabase
        .from("atencion_documentos")
        .insert(newDocs)
        .select();

      if (insertError) {
        console.error("[GenerateDocuments] Error insertando documentos:", insertError);
        throw insertError;
      }

      console.log(`[GenerateDocuments] ✓ Generados ${newDocIds.length} documentos para atencion ${atencionId}`, insertedData);
      return { success: true, count: newDocIds.length };
    } catch (error: any) {
      console.error("[GenerateDocuments] Error generando documentos:", error);
      return { success: false, count: 0, error: error.message || "Error desconocido" };
    }
  };

  return { generateDocuments };
};
