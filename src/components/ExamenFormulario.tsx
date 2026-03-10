import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
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
import AudiometriaForm from "@/components/AudiometriaForm";
import AntropometriaForm from "@/components/AntropometriaForm";

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

export interface ExamenFormularioRef {
  save: () => Promise<void>;
  hasPendingChanges: () => boolean;
}

interface Props {
  atencionExamenId: string;
  examenId: string;
  examenNombre: string;
  onComplete?: () => void;
  readonly?: boolean;
  fechaNacimiento?: string | null;
  esExterno?: boolean;
  hideSaveButton?: boolean;
}

const ExamenFormulario = forwardRef<ExamenFormularioRef, Props>(({ atencionExamenId, examenId, examenNombre, onComplete, readonly = false, fechaNacimiento, esExterno = false, hideSaveButton = false }, ref) => {
  const [campos, setCampos] = useState<CampoFormulario[]>([]);
  const [resultados, setResultados] = useState<Record<string, ResultadoCampo>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dragOverCampo, setDragOverCampo] = useState<string | null>(null);

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

  useImperativeHandle(ref, () => ({
    save: handleSave,
    hasPendingChanges: () => Object.keys(resultados).length > 0,
  }));

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

  const compressImage = async (file: File, maxSizeMB = 1): Promise<File> => {
    if (!file.type.startsWith("image/") || file.size <= maxSizeMB * 1024 * 1024) return file;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.7
        );
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (campoId: string, file: File) => {
    setUploading(campoId);
    try {
      // Compress images before upload
      const processedFile = await compressImage(file);
      
      const fileSizeMB = (processedFile.size / (1024 * 1024)).toFixed(1);
      console.log(`Subiendo archivo: ${processedFile.name} (${fileSizeMB} MB)`);

      const safeName = processedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${atencionExamenId}/${campoId}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("examen-resultados")
        .upload(fileName, processedFile);

      if (uploadError) {
        console.error("Error de upload:", uploadError);
        if (uploadError.message?.includes("Payload too large") || uploadError.message?.includes("413")) {
          toast.error(`Archivo muy grande (${fileSizeMB} MB). Máximo permitido: 50MB`);
        } else if (uploadError.message?.includes("security") || uploadError.message?.includes("policy")) {
          toast.error("Error de permisos en el almacenamiento. Contacte al administrador.");
        } else {
          toast.error(`Error al subir: ${uploadError.message}`);
        }
        return;
      }

      const { data: urlData } = await supabase.storage
        .from("examen-resultados")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);

      if (!urlData?.signedUrl) throw new Error("No se pudo generar URL del archivo");
      updateResultado(campoId, processedFile.name, urlData.signedUrl);
      toast.success("Archivo subido correctamente");
    } catch (error: any) {
      console.error("Error completo:", error);
      toast.error(`Error al subir archivo: ${error?.message || "desconocido"}`);
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
      // If prestador is external, mark as muestra_tomada instead of completado
      const nuevoEstado = allRequiredFilled
        ? (esExterno ? "muestra_tomada" : "completado")
        : "incompleto";
      await supabase
        .from("atencion_examenes")
        .update({
          estado: nuevoEstado as any,
          fecha_realizacion: allRequiredFilled ? new Date().toISOString() : null,
        })
        .eq("id", atencionExamenId);

      toast.success(
        allRequiredFilled
          ? (esExterno ? "Muestra tomada registrada y datos guardados" : "Examen completado y guardado")
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

      {Object.entries(groups).map(([groupName, groupCampos]) => {
        // Find common options across all select fields in this group for bulk-fill
        const selectCamposInGroup = groupCampos.filter(c => c.tipo_campo === "select" && Array.isArray(c.opciones));
        const commonOptions: string[] = selectCamposInGroup.length >= 2
          ? selectCamposInGroup[0].opciones.filter((opt: string) =>
              selectCamposInGroup.every(c => c.opciones.includes(opt))
            )
          : [];

        return (
        <div key={groupName}>
          {groupName !== "__sin_grupo__" && (
            <div className="flex items-center justify-between mb-2 border-b pb-1">
              <h4 className="text-sm font-semibold text-muted-foreground">
                {groupName}
              </h4>
              {!readonly && commonOptions.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {commonOptions.map((opt: string) => (
                    <Button
                      key={opt}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => {
                        selectCamposInGroup.forEach(c => updateResultado(c.id, opt));
                      }}
                    >
                      Todo "{opt}"
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groupCampos.map((campo) => {
              const resultado = resultados[campo.id];
              return (
                <div key={campo.id} className={`space-y-1 ${(campo.tipo_campo === "audiometria" || campo.tipo_campo === "texto_largo" || campo.tipo_campo === "antropometria") ? "col-span-full" : ""}`}>
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
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="any"
                        value={resultado?.valor || ""}
                        onChange={(e) => updateResultado(campo.id, e.target.value)}
                        disabled={readonly}
                        placeholder="0"
                        className="flex-1"
                      />
                      {campo.opciones?.unidad && campo.opciones.unidad !== "none" && (
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap min-w-fit">
                          {campo.opciones.unidad}
                        </span>
                      )}
                    </div>
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

                  {campo.tipo_campo === "multi_select" && (
                    <div className="space-y-1">
                      {(() => {
                        const selected: string[] = resultado?.valor ? JSON.parse(resultado.valor) : [];
                        const opciones = Array.isArray(campo.opciones) ? campo.opciones : [];
                        const allSelected = opciones.length > 0 && opciones.every((opt: string) => selected.includes(opt));
                        const noneSelected = selected.length === 0;
                        return (
                          <>
                            <div className="flex gap-2 mb-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                disabled={readonly}
                                onClick={() => updateResultado(campo.id, JSON.stringify(opciones))}
                              >
                                Marcar todos
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                disabled={readonly}
                                onClick={() => updateResultado(campo.id, JSON.stringify([]))}
                              >
                                Limpiar
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {opciones.map((opt: string) => (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm p-1 rounded hover:bg-muted">
                                  <Checkbox
                                    checked={selected.includes(opt)}
                                    disabled={readonly}
                                    onCheckedChange={(checked) => {
                                      const newSelected = checked
                                        ? [...selected, opt]
                                        : selected.filter((s: string) => s !== opt);
                                      updateResultado(campo.id, JSON.stringify(newSelected));
                                    }}
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          </>
                        );
                      })()}
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
                    <div
                      className={`space-y-2 rounded-lg p-2 transition-colors ${dragOverCampo === campo.id ? "border-2 border-dashed border-primary bg-primary/5" : ""}`}
                      onDragOver={(e) => { if (!readonly) { e.preventDefault(); setDragOverCampo(campo.id); } }}
                      onDragLeave={() => setDragOverCampo(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverCampo(null);
                        if (readonly) return;
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          handleFileUpload(campo.id, file);
                        }
                      }}
                    >
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
                          {dragOverCampo === campo.id && (
                            <span className="text-xs text-primary font-medium ml-2 animate-pulse">Soltar archivo aquí</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {campo.tipo_campo === "audiometria" && (
                    <div className="col-span-full">
                      <AudiometriaForm
                        value={resultado?.valor || null}
                        onChange={(v) => updateResultado(campo.id, v)}
                        readonly={readonly}
                        fechaNacimiento={fechaNacimiento}
                      />
                    </div>
                  )}

                  {campo.tipo_campo === "antropometria" && (
                    <div className="col-span-full">
                      <AntropometriaForm
                        value={resultado?.valor || null}
                        onChange={(v) => updateResultado(campo.id, v)}
                        readonly={readonly}
                        fechaNacimiento={fechaNacimiento}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}

      {!readonly && !hideSaveButton && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar Resultados"}
          </Button>
        </div>
      )}
    </div>
  );
});

ExamenFormulario.displayName = "ExamenFormulario";

export default ExamenFormulario;
