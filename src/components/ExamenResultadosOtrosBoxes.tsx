import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Eye, FileText } from "lucide-react";

interface Props {
  atencionId: string;
  currentBoxId: string;
}

interface OtroBoxResultado {
  boxNombre: string;
  examenes: Array<{
    examenNombre: string;
    estado: string;
    resultados: Array<{
      etiqueta: string;
      valor: string | null;
      archivo_url: string | null;
    }>;
  }>;
}

const ExamenResultadosOtrosBoxes = ({ atencionId, currentBoxId }: Props) => {
  const [data, setData] = useState<OtroBoxResultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) loadData();
  }, [atencionId, isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get all atencion_examenes for this atencion that are NOT in the current box
      const { data: atencionExamenes, error } = await supabase
        .from("atencion_examenes")
        .select("id, examen_id, estado, examenes(nombre)")
        .eq("atencion_id", atencionId);

      if (error) throw error;

      // Get box assignments for these examenes
      const examenIds = (atencionExamenes || []).map((ae: any) => ae.examen_id);
      const { data: boxExamenes } = await supabase
        .from("box_examenes")
        .select("examen_id, box_id, boxes(nombre)")
        .in("examen_id", examenIds);

      // Get current box exam ids to exclude
      const { data: currentBoxExamenes } = await supabase
        .from("box_examenes")
        .select("examen_id")
        .eq("box_id", currentBoxId);

      const currentBoxExamIds = new Set((currentBoxExamenes || []).map((be: any) => be.examen_id));

      // Get resultados for all atencion_examenes
      const atencionExamenIds = (atencionExamenes || []).map((ae: any) => ae.id);
      const { data: resultados } = await supabase
        .from("examen_resultados")
        .select("atencion_examen_id, campo_id, valor, archivo_url, examen_formulario_campos(etiqueta)")
        .in("atencion_examen_id", atencionExamenIds);

      // Build grouped data by box
      const boxMap: Record<string, OtroBoxResultado> = {};

      for (const ae of atencionExamenes || []) {
        if (currentBoxExamIds.has(ae.examen_id)) continue;

        const boxExam = (boxExamenes || []).find((be: any) => be.examen_id === ae.examen_id);
        const boxNombre = (boxExam as any)?.boxes?.nombre || "Sin box";
        const boxId = boxExam?.box_id || "none";

        if (!boxMap[boxId]) {
          boxMap[boxId] = { boxNombre, examenes: [] };
        }

        const examenResultados = (resultados || [])
          .filter((r: any) => r.atencion_examen_id === ae.id)
          .map((r: any) => ({
            etiqueta: (r as any).examen_formulario_campos?.etiqueta || "Campo",
            valor: r.valor,
            archivo_url: r.archivo_url,
          }));

        boxMap[boxId].examenes.push({
          examenNombre: (ae as any).examenes?.nombre || "Examen",
          estado: ae.estado || "pendiente",
          resultados: examenResultados,
        });
      }

      setData(Object.values(boxMap));
    } catch (error) {
      console.error("Error loading otros boxes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (data.length === 0 && !loading && isOpen) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
        <Eye className="h-4 w-4" />
        <span>Datos de otros boxes</span>
        <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay datos de otros boxes</p>
        ) : (
          data.map((box, idx) => (
            <div key={idx} className="border rounded-md p-3 space-y-2 bg-muted/30">
              <h5 className="text-sm font-semibold">{box.boxNombre}</h5>
              {box.examenes.map((examen, eidx) => (
                <div key={eidx} className="ml-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{examen.examenNombre}</span>
                    <Badge
                      variant={examen.estado === "completado" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {examen.estado}
                    </Badge>
                  </div>
                  {examen.resultados.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 ml-2">
                      {examen.resultados.map((r, ridx) => (
                        <div key={ridx} className="text-xs">
                          <span className="text-muted-foreground">{r.etiqueta}:</span>{" "}
                          {r.archivo_url ? (
                            <a href={r.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Ver
                            </a>
                          ) : (
                            <span className="font-medium">{r.valor || "-"}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ExamenResultadosOtrosBoxes;
