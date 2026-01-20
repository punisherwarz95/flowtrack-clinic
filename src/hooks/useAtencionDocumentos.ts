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
  const generateDocuments = async (atencionId: string, paqueteIds: string[]) => {
    if (!atencionId || paqueteIds.length === 0) return;

    try {
      // Get all documents associated with the selected batteries
      const { data: bateriaDocumentos, error: bdError } = await supabase
        .from("bateria_documentos")
        .select("documento_id")
        .in("paquete_id", paqueteIds);

      if (bdError) throw bdError;

      if (!bateriaDocumentos || bateriaDocumentos.length === 0) return;

      const uniqueDocumentoIds = [...new Set(bateriaDocumentos.map(bd => bd.documento_id))];

      // Check which documents already exist for this atencion
      const { data: existingDocs, error: existingError } = await supabase
        .from("atencion_documentos")
        .select("documento_id")
        .eq("atencion_id", atencionId);

      if (existingError) throw existingError;

      const existingDocIds = new Set((existingDocs || []).map(d => d.documento_id));
      const newDocIds = uniqueDocumentoIds.filter(id => !existingDocIds.has(id));

      if (newDocIds.length === 0) return;

      // Create new atencion_documentos
      const newDocs = newDocIds.map(documento_id => ({
        atencion_id: atencionId,
        documento_id,
        respuestas: {},
        estado: "pendiente",
      }));

      const { error: insertError } = await supabase
        .from("atencion_documentos")
        .insert(newDocs);

      if (insertError) throw insertError;

      console.log(`Generated ${newDocIds.length} documents for atencion ${atencionId}`);
    } catch (error) {
      console.error("Error generating documents from bateria:", error);
    }
  };

  return { generateDocuments };
};
