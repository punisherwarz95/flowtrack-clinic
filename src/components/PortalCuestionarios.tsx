import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CuestionarioRenderer from "@/components/CuestionarioRenderer";

interface CuestionarioExamen {
  atencionExamenId: string;
  examenId: string;
  examenNombre: string;
  campoId: string;
  config: any;
  completado: boolean;
  valorGuardado: string | null;
}

interface Props {
  atencionId: string;
}

export default function PortalCuestionarios({ atencionId }: Props) {
  const [cuestionarios, setCuestionarios] = useState<CuestionarioExamen[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  const cargarCuestionarios = useCallback(async () => {
    // 1. Get atencion_examenes for this atencion
    const { data: atencionExamenes } = await supabase
      .from("atencion_examenes")
      .select("id, examen_id, estado, examenes(id, nombre)")
      .eq("atencion_id", atencionId);

    if (!atencionExamenes || atencionExamenes.length === 0) {
      setCuestionarios([]);
      return;
    }

    const examenIds = atencionExamenes.map((ae: any) => ae.examen_id);

    // 2. Get cuestionario-type fields for these exams
    const { data: campos } = await supabase
      .from("examen_formulario_campos")
      .select("id, examen_id, etiqueta, opciones")
      .in("examen_id", examenIds)
      .eq("tipo_campo", "cuestionario");

    if (!campos || campos.length === 0) {
      setCuestionarios([]);
      return;
    }

    // 3. Get existing results for these campos
    const atencionExamenIds = atencionExamenes.map((ae: any) => ae.id);
    const campoIds = campos.map((c: any) => c.id);

    const { data: resultados } = await supabase
      .from("examen_resultados")
      .select("atencion_examen_id, campo_id, valor")
      .in("atencion_examen_id", atencionExamenIds)
      .in("campo_id", campoIds);

    // Build cuestionario list
    const lista: CuestionarioExamen[] = [];

    for (const campo of campos) {
      const ae = atencionExamenes.find((a: any) => a.examen_id === campo.examen_id);
      if (!ae) continue;

      const resultado = resultados?.find(
        (r: any) => r.atencion_examen_id === ae.id && r.campo_id === campo.id
      );

      const isCompleted = ae.estado === "completado";

      lista.push({
        atencionExamenId: ae.id,
        examenId: campo.examen_id,
        examenNombre: (ae as any).examenes?.nombre || "Cuestionario",
        campoId: campo.id,
        config: campo.opciones,
        completado: isCompleted,
        valorGuardado: resultado?.valor || null,
      });
    }

    setCuestionarios(lista);

    // Init respuestas from saved values
    const nuevasRespuestas: Record<string, string> = {};
    lista.forEach((c) => {
      if (c.valorGuardado) {
        nuevasRespuestas[c.campoId] = c.valorGuardado;
      }
    });
    setRespuestas((prev) => ({ ...prev, ...nuevasRespuestas }));
  }, [atencionId]);

  useEffect(() => {
    if (atencionId) cargarCuestionarios();
  }, [atencionId, cargarCuestionarios]);

  // Polling every 5s
  useEffect(() => {
    if (!atencionId) return;
    const interval = setInterval(cargarCuestionarios, 5000);
    return () => clearInterval(interval);
  }, [atencionId, cargarCuestionarios]);

  const handleSubmit = async (cuestionario: CuestionarioExamen) => {
    const valor = respuestas[cuestionario.campoId];
    if (!valor) {
      toast({ title: "Error", description: "Debe responder todas las preguntas", variant: "destructive" });
      return;
    }

    // Validate all non-text questions answered
    try {
      const parsed = JSON.parse(valor);
      const config = cuestionario.config as any;
      if (config?.preguntas) {
        const sinResponder = config.preguntas.filter((p: any) => {
          if (p.tipo === "texto") return false;
          const resp = parsed.respuestas?.[String(p.numero)];
          return !resp || resp === "";
        });
        if (sinResponder.length > 0) {
          toast({
            title: "Preguntas sin responder",
            description: `Faltan ${sinResponder.length} pregunta(s) por responder`,
            variant: "destructive",
          });
          return;
        }
      }
    } catch {
      // continue
    }

    setSaving(cuestionario.campoId);
    try {
      // Upsert result
      const { data: existing } = await supabase
        .from("examen_resultados")
        .select("id")
        .eq("atencion_examen_id", cuestionario.atencionExamenId)
        .eq("campo_id", cuestionario.campoId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("examen_resultados")
          .update({ valor, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("examen_resultados").insert({
          atencion_examen_id: cuestionario.atencionExamenId,
          campo_id: cuestionario.campoId,
          valor,
        });
      }

      // Mark exam as completed
      await supabase
        .from("atencion_examenes")
        .update({
          estado: "completado" as any,
          fecha_realizacion: new Date().toISOString(),
        })
        .eq("id", cuestionario.atencionExamenId);

      toast({ title: "Cuestionario enviado", description: "Sus respuestas fueron guardadas correctamente" });
      setExpandedIndex(null);
      await cargarCuestionarios();
    } catch (error) {
      console.error("Error guardando cuestionario:", error);
      toast({ title: "Error", description: "No se pudo guardar el cuestionario", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  if (cuestionarios.length === 0) return null;

  const pendientes = cuestionarios.filter((c) => !c.completado).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Cuestionarios a Completar
          {pendientes > 0 && (
            <Badge variant="outline" className="ml-2">
              {pendientes} pendiente{pendientes > 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Toque un cuestionario para expandirlo y completarlo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {cuestionarios.map((cuestionario, index) => (
          <Collapsible
            key={cuestionario.campoId}
            open={expandedIndex === index}
            onOpenChange={(open) => setExpandedIndex(open ? index : null)}
          >
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left">
                <div className="flex items-center gap-2">
                  {cuestionario.completado ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  ) : (
                    <ClipboardList className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span className={`font-medium text-sm ${cuestionario.completado ? "text-muted-foreground" : ""}`}>
                    {cuestionario.examenNombre}
                  </span>
                </div>
                {cuestionario.completado ? (
                  <Badge variant="default" className="bg-green-600 text-xs">Completado</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Pendiente</Badge>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 mb-3 border rounded-lg p-3 bg-background">
              {cuestionario.config && (
                <CuestionarioRenderer
                  config={cuestionario.config}
                  value={respuestas[cuestionario.campoId] || null}
                  onChange={(val) => setRespuestas((prev) => ({ ...prev, [cuestionario.campoId]: val }))}
                  readonly={cuestionario.completado}
                />
              )}
              {!cuestionario.completado && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => handleSubmit(cuestionario)}
                    disabled={saving === cuestionario.campoId}
                  >
                    {saving === cuestionario.campoId ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Respuestas"
                    )}
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
