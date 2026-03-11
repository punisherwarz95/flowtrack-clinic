import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save, Settings2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import CuestionarioWizard from "@/components/CuestionarioWizard";

interface CampoFormulario {
  id?: string;
  examen_id: string;
  etiqueta: string;
  tipo_campo: string;
  opciones: any;
  requerido: boolean;
  orden: number;
  grupo: string | null;
}

interface Props {
  examenId: string;
  examenNombre: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIPOS_CAMPO = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "textarea", label: "Texto largo" },
  { value: "select", label: "Selección" },
  
  { value: "checkbox", label: "Sí/No" },
  { value: "fecha", label: "Fecha" },
  { value: "archivo_pdf", label: "Archivo PDF" },
  { value: "audiometria", label: "Audiometría" },
  { value: "antropometria", label: "Antropometría" },
  { value: "cuestionario", label: "Cuestionario (con puntaje)" },
];

const UNIDADES_COMUNES = ["mg/dL", "g/dL", "mL/min", "U/L", "mmol/L", "ng/mL", "µg/dL", "mEq/L", "%", "mm/h", "pg/mL", "cel/µL"];

const ExamenFormularioCamposConfig = ({ examenId, examenNombre, open, onOpenChange }: Props) => {
  const [campos, setCampos] = useState<CampoFormulario[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cuestionarioWizardIndex, setCuestionarioWizardIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open && examenId) {
      loadCampos();
    }
  }, [open, examenId]);

  const loadCampos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("examen_formulario_campos")
        .select("*")
        .eq("examen_id", examenId)
        .order("orden");

      if (error) throw error;
      setCampos(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar campos");
    } finally {
      setLoading(false);
    }
  };

  const addCampo = () => {
    setCampos([
      ...campos,
      {
        examen_id: examenId,
        etiqueta: "",
        tipo_campo: "texto",
        opciones: null,
        requerido: false,
        orden: campos.length,
        grupo: null,
      },
    ]);
  };

  const updateCampo = (index: number, field: keyof CampoFormulario, value: any) => {
    const updated = [...campos];
    updated[index] = { ...updated[index], [field]: value };
    setCampos(updated);
  };

  const removeCampo = (index: number) => {
    setCampos(campos.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing campos
      await supabase
        .from("examen_formulario_campos")
        .delete()
        .eq("examen_id", examenId);

      // Insert new campos
      if (campos.length > 0) {
          const camposToInsert = campos.map((c, idx) => ({
          examen_id: examenId,
          etiqueta: c.etiqueta,
          tipo_campo: c.tipo_campo,
          opciones: (c.tipo_campo === "select" || c.tipo_campo === "multi_select") && c.opciones
            ? (Array.isArray(c.opciones) ? c.opciones.filter((o: string) => o.trim()) : c.opciones)
            : c.tipo_campo === "numero" && c.opciones && typeof c.opciones === "object" && !Array.isArray(c.opciones)
            ? c.opciones
            : null,
          requerido: c.requerido,
          orden: idx,
          grupo: c.grupo || null,
        }));

        const { error } = await supabase
          .from("examen_formulario_campos")
          .insert(camposToInsert);

        if (error) throw error;
      }

      toast.success("Campos guardados correctamente");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar campos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Campos de Formulario: {examenNombre}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : (
            <>
              {campos.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No hay campos configurados. Este examen se marcará como completado con un simple checkbox.
                </p>
              )}

              {campos.map((campo, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Etiqueta *</Label>
                          <Input
                            value={campo.etiqueta}
                            onChange={(e) => updateCampo(index, "etiqueta", e.target.value)}
                            placeholder="Ej: Oído Derecho 500Hz"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tipo de campo</Label>
                          <Select
                            value={campo.tipo_campo}
                            onValueChange={(v) => updateCampo(index, "tipo_campo", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS_CAMPO.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Grupo (opcional)</Label>
                          <Input
                            value={campo.grupo || ""}
                            onChange={(e) => updateCampo(index, "grupo", e.target.value || null)}
                            placeholder="Ej: Oído Derecho"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        onClick={() => removeCampo(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 ml-8">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={campo.requerido}
                          onCheckedChange={(v) => updateCampo(index, "requerido", !!v)}
                        />
                        <Label className="text-xs">Requerido</Label>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>

                    {campo.tipo_campo === "numero" && (
                      <div className="ml-8">
                        <Label className="text-xs">Unidad de medida (opcional)</Label>
                        <div className="flex gap-2">
                          <Select
                            value={campo.opciones?.unidad || ""}
                            onValueChange={(v) => updateCampo(index, "opciones", { unidad: v })}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Sin unidad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin unidad</SelectItem>
                              {UNIDADES_COMUNES.map((u) => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={campo.opciones?.unidad === "none" ? "" : (campo.opciones?.unidad || "")}
                            onChange={(e) => updateCampo(index, "opciones", { unidad: e.target.value || null })}
                            placeholder="O escribe una personalizada"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    )}

                    {(campo.tipo_campo === "select" || campo.tipo_campo === "multi_select") && (
                      <div className="ml-8">
                        <Label className="text-xs">Opciones (una por línea)</Label>
                        <Textarea
                          value={Array.isArray(campo.opciones) ? campo.opciones.join("\n") : (campo.opciones || "")}
                          onChange={(e) =>
                            updateCampo(
                              index,
                              "opciones",
                              e.target.value.split("\n")
                            )
                          }
                          placeholder={campo.tipo_campo === "multi_select" ? "COCAINA\nMARIHUANA\nANFETAMINA\nBENZODIACEPINA\nOPIACEOS" : "Normal\nAnormal\nNo realizado"}
                          rows={4}
                        />
                      </div>
                    )}

                    {campo.tipo_campo === "cuestionario" && (
                      <div className="ml-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCuestionarioWizardIndex(index)}
                          className="gap-2"
                        >
                          <Settings2 className="h-3 w-3" />
                          {campo.opciones?.preguntas
                            ? `Editar cuestionario (${campo.opciones.preguntas.length} preguntas)`
                            : "Configurar cuestionario"}
                        </Button>
                        {campo.opciones?.preguntas && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {campo.opciones.preguntas.length} preguntas · {campo.opciones.tipo_puntaje === "simple" ? "Simple" : "Ponderado"}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={addCampo} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Campo
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar Campos"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {cuestionarioWizardIndex !== null && (
      <CuestionarioWizard
        open={true}
        onOpenChange={() => setCuestionarioWizardIndex(null)}
        initialConfig={campos[cuestionarioWizardIndex]?.opciones?.preguntas ? campos[cuestionarioWizardIndex].opciones : null}
        onSave={(config) => {
          updateCampo(cuestionarioWizardIndex, "opciones", config);
          setCuestionarioWizardIndex(null);
        }}
      />
    )}
  );
};

export default ExamenFormularioCamposConfig;
