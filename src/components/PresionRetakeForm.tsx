import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Activity, AlertTriangle, Save, Loader2 } from "lucide-react";
import { PresionTimerInfo } from "@/hooks/usePresionTimers";

interface Props {
  atencionId: string;
  timer: PresionTimerInfo;
  onSaved?: () => void;
}

/**
 * Allows any box to enter the 2nd/3rd pressure reading
 * for a patient whose timer has expired.
 */
const PresionRetakeForm = ({ atencionId, timer, onSaved }: Props) => {
  const [sistolica, setSistolica] = useState("");
  const [diastolica, setDiastolica] = useState("");
  const [saving, setSaving] = useState(false);
  const [antropometriaInfo, setAntropometriaInfo] = useState<{
    resultadoId: string;
    campoId: string;
    data: Record<string, any>;
  } | null>(null);

  useEffect(() => {
    loadAntropometriaData();
  }, [atencionId]);

  const loadAntropometriaData = async () => {
    try {
      // Find the antropometria result for this atencion
      const { data, error } = await supabase
        .from("examen_resultados")
        .select(`
          id, valor, campo_id,
          atencion_examenes!inner(atencion_id),
          examen_formulario_campos!inner(tipo_campo)
        `)
        .eq("examen_formulario_campos.tipo_campo", "antropometria")
        .eq("atencion_examenes.atencion_id", atencionId);

      if (error) throw error;

      const row = (data || [])[0] as any;
      if (!row) return;

      const parsed = typeof row.valor === "string"
        ? (() => { try { return JSON.parse(row.valor); } catch { return null; } })()
        : row.valor;

      if (parsed && typeof parsed === "object") {
        setAntropometriaInfo({
          resultadoId: row.id,
          campoId: row.campo_id,
          data: parsed,
        });
      }
    } catch (error) {
      console.error("Error loading antropometria:", error);
    }
  };

  const handleSave = async () => {
    if (!antropometriaInfo) return;
    if (!sistolica || !diastolica) {
      toast.error("Ingrese ambos valores de presión");
      return;
    }

    setSaving(true);
    try {
      const updated = { ...antropometriaInfo.data };
      const toma = timer.nextToma;

      updated[`pa_sistolica_${toma}`] = sistolica;
      updated[`pa_diastolica_${toma}`] = diastolica;

      // Check if this new reading is also high
      const s = parseFloat(sistolica);
      const d = parseFloat(diastolica);
      const isHigh = s > 139 || d > 89;

      if (toma === 2 && isHigh) {
        // Need 3rd reading, start new timer
        updated.pa_timer_inicio = new Date().toISOString();
        updated.pa_alerta = true;
      } else if (toma === 3) {
        // 3rd reading done, no more retakes regardless
        updated.pa_alerta = isHigh; // Keep alert if still high, but no timer
        updated.pa_timer_inicio = null;
      } else {
        // Not high, clear timer
        updated.pa_alerta = false;
        updated.pa_timer_inicio = null;
      }

      const { error } = await supabase
        .from("examen_resultados")
        .update({ valor: JSON.stringify(updated) })
        .eq("id", antropometriaInfo.resultadoId);

      if (error) throw error;

      toast.success(`Toma ${toma} de presión registrada`);
      setSistolica("");
      setDiastolica("");
      onSaved?.();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar presión");
    } finally {
      setSaving(false);
    }
  };

  if (!antropometriaInfo) return null;

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-destructive" />
          Retoma Presión Arterial - Toma {timer.nextToma}
          {timer.isDue ? (
            <Badge variant="destructive" className="animate-pulse">¡Tomar ahora!</Badge>
          ) : (
            <Badge variant="outline" className="font-mono">
              {Math.floor(timer.remainingSeconds / 60).toString().padStart(2, "0")}:
              {(timer.remainingSeconds % 60).toString().padStart(2, "0")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs">Sistólica</Label>
            <Input
              type="number"
              value={sistolica}
              onChange={(e) => setSistolica(e.target.value)}
              placeholder="Sist"
              className="text-center"
              disabled={!timer.isDue}
            />
          </div>
          <span className="text-muted-foreground font-bold pb-2">/</span>
          <div className="flex-1">
            <Label className="text-xs">Diastólica</Label>
            <Input
              type="number"
              value={diastolica}
              onChange={(e) => setDiastolica(e.target.value)}
              placeholder="Diast"
              className="text-center"
              disabled={!timer.isDue}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !timer.isDue || !sistolica || !diastolica}
            size="sm"
            className="gap-1"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
        {!timer.isDue && (
          <p className="text-xs text-muted-foreground mt-2">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Debe esperar a que termine el temporizador para registrar la toma
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PresionRetakeForm;
