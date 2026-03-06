import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface CampoFormulario {
  id: string;
  etiqueta: string;
  tipo_campo: string;
  opciones: any;
  requerido: boolean;
  orden: number;
  grupo: string | null;
}

interface ResultadoCampo {
  id?: string;
  campo_id: string;
  valor: string | null;
  archivo_url: string | null;
}

interface Props {
  atencionExamenId: string;
  examenId: string;
  examenNombre: string;
  onComplete?: () => void;
  readonly?: boolean;
}

const ExamenFormulario = ({ atencionExamenId, examenId, examenNombre, onComplete, readonly = false }: Props) => {
  const [campos, setCampos] = useState<CampoFormulario[]>([]);
  const [resultados, setResultados] = useState<Record<string, ResultadoCampo>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    loadCamposYResultados();
  }, [atencionExamenId, examenId]);

  const loadCamposYResultados = async () => {
    setLoading(true);
    try {
      // Load campo definitions
      const { data: camposData, error: camposError } = await supabase
        .from("examen_formulario_campos")
        .select("*")
        .eq("examen_id", examenId)
        .order("orden");

      if (camposError) throw camposError;
      setCampos(camposData || []);

      // Load existing results
      const { data: resultadosData, error: resultadosError } = await supabase
        .from("examen_resultados")
        .select("*")
        .eq("atencion_examen_id", atencionExamenId);

      if (resultadosError) throw resultadosError;

      const resultadosMap: Record<string, ResultadoCampo> = {};
      (resultadosData || []).forEach((r: any) => {
        resultadosMap[r.campo_id] = {
          id: r.id,
          campo_id: r.campo_id,
          valor: r.valor,
          archivo_url: r.archivo_url,
        };
      });
      setResultados(resultadosMap);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateResultado = (campoId: string, valor: string | null, archivo_url?: string | null) => {
    setResultados((prev) => ({
      ...prev,
      [campoId]: {
        ...prev[campoId],
        campo_id: campoId,
        valor: valor !== undefined ? valor : prev[campoId]?.valor || null,
        archivo_url: archivo_url !== undefined ? archivo_url : prev[campoId]?.archivo_url || null,
      },
    }));
  };

  const handleFileUpload = async (campoId: string, file: File) => {
    setUploading(campoId);
    try {
      const fileName = `${atencionExamenId}/${campoId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("examen-resultados")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("examen-resultados")
        .getPublicUrl(fileName);

      updateResultado(campoId, file.name, urlData.publicUrl);
      toast.success("Archivo subido correctamente");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al subir archivo");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert all results
      for (const campo of campos) {
        const resultado = resultados[campo.id];
        if (!resultado) continue;

        const { error } = await supabase
          .from("examen_resultados")
          .upsert(
            {
              atencion_examen_id: atencionExamenId,
              campo_id: campo.id,
              valor: resultado.valor,
              archivo_url: resultado.archivo_url,
            },
            { onConflict: "atencion_examen_id,campo_id" }
          );

        if (error) throw error;
      }

      // Check if all required fields are filled
      const allRequiredFilled = campos.every((campo) => {
        if (!campo.requerido) return true;
        const resultado = resultados[campo.id];
        if (!resultado) return false;
        if (campo.tipo_campo === "archivo_pdf") return !!resultado.archivo_url;
        return !!resultado.valor;
      });

      // Update atencion_examenes status
      const nuevoEstado = allRequiredFilled ? "completado" : "incompleto";
      await supabase
        .from("atencion_examenes")
        .update({
          estado: nuevoEstado,
          fecha_realizacion: allRequiredFilled ? new Date().toISOString() : null,
        })
        .eq("id", atencionExamenId);

      toast.success(
        allRequiredFilled
          ? "Examen completado y guardado"
          : "Datos guardados (parcial - faltan campos requeridos)"
      );

      onComplete?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al guardar resultados");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (campos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No hay campos configurados para este examen. Configure los campos desde el módulo de Exámenes.
      </p>
    );
  }

  // Group campos by grupo
  const groups: Record<string, CampoFormulario[]> = {};
  campos.forEach((campo) => {
    const group = campo.grupo || "__sin_grupo__";
    if (!groups[group]) groups[group] = [];
    groups[group].push(campo);
  });

  const allRequiredFilled = campos.every((campo) => {
    if (!campo.requerido) return true;
    const resultado = resultados[campo.id];
    if (!resultado) return false;
    if (campo.tipo_campo === "archivo_pdf") return !!resultado.archivo_url;
    return !!resultado.valor;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={allRequiredFilled ? "default" : "secondary"} className="gap-1">
            {allRequiredFilled ? (
              <><CheckCircle className="h-3 w-3" /> Completo</>
            ) : (
              <><AlertCircle className="h-3 w-3" /> Incompleto</>
            )}
          </Badge>
        </div>
      </div>

      {Object.entries(groups).map(([groupName, groupCampos]) => (
        <div key={groupName}>
          {groupName !== "__sin_grupo__" && (
            <h4 className="text-sm font-semibold text-muted-foreground mb-2 border-b pb-1">
              {groupName}
            </h4>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groupCampos.map((campo) => {
              const resultado = resultados[campo.id];
              return (
                <div key={campo.id} className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    {campo.etiqueta}
                    {campo.requerido && <span className="text-destructive">*</span>}
                  </Label>

                  {campo.tipo_campo === "texto" && (
                    <Input
                      value={resultado?.valor || ""}
                      onChange={(e) => updateResultado(campo.id, e.target.value)}
                      disabled={readonly}
                      placeholder={campo.etiqueta}
                    />
                  )}

                  {campo.tipo_campo === "numero" && (
                    <Input
                      type="number"
                      step="any"
                      value={resultado?.valor || ""}
                      onChange={(e) => updateResultado(campo.id, e.target.value)}
                      disabled={readonly}
                      placeholder="0"
                    />
                  )}

                  {campo.tipo_campo === "textarea" && (
                    <Textarea
                      value={resultado?.valor || ""}
                      onChange={(e) => updateResultado(campo.id, e.target.value)}
                      disabled={readonly}
                      rows={3}
                    />
                  )}

                  {campo.tipo_campo === "select" && (
                    <Select
                      value={resultado?.valor || ""}
                      onValueChange={(v) => updateResultado(campo.id, v)}
                      disabled={readonly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(campo.opciones) &&
                          campo.opciones.map((opt: string) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  {campo.tipo_campo === "checkbox" && (
                    <div className="flex items-center gap-2 pt-1">
                      <Checkbox
                        checked={resultado?.valor === "true"}
                        onCheckedChange={(v) => updateResultado(campo.id, v ? "true" : "false")}
                        disabled={readonly}
                      />
                      <span className="text-sm">{resultado?.valor === "true" ? "Sí" : "No"}</span>
                    </div>
                  )}

                  {campo.tipo_campo === "fecha" && (
                    <Input
                      type="date"
                      value={resultado?.valor || ""}
                      onChange={(e) => updateResultado(campo.id, e.target.value)}
                      disabled={readonly}
                    />
                  )}

                  {campo.tipo_campo === "archivo_pdf" && (
                    <div className="space-y-2">
                      {resultado?.archivo_url ? (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-primary" />
                          <a
                            href={resultado.archivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline truncate"
                          >
                            {resultado.valor || "Ver archivo"}
                          </a>
                        </div>
                      ) : null}
                      {!readonly && (
                        <div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            id={`file-${campo.id}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(campo.id, file);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => document.getElementById(`file-${campo.id}`)?.click()}
                            disabled={uploading === campo.id}
                          >
                            {uploading === campo.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {resultado?.archivo_url ? "Cambiar archivo" : "Subir archivo"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {campo.tipo_campo === "audiometria" && (
                    <p className="text-xs text-muted-foreground italic">
                      Componente de audiometría (próximamente)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!readonly && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar Resultados"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExamenFormulario;
