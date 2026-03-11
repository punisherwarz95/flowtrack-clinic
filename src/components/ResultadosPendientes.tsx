import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FlaskConical, Upload, Search, CheckCircle, Save, Loader2, FileText as FileIcon, ExternalLink } from "lucide-react";
import ExamenFormulario, { ExamenFormularioRef } from "@/components/ExamenFormulario";

interface PendienteRow {
  atencionId: string;
  atencionExamenId: string;
  examenId: string;
  examenNombre: string;
  pacienteNombre: string;
  pacienteRut: string;
  empresaNombre: string;
  fechaIngreso: string;
  numeroIngreso: number;
  fechaNacimiento: string | null;
  prestadorId: string | null;
  prestadorNombre: string | null;
}

interface Props {
  selectedDate: Date | undefined;
}

const ResultadosPendientes = ({ selectedDate }: Props) => {
  const [pendientes, setPendientes] = useState<PendienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [savingPatient, setSavingPatient] = useState<string | null>(null);

  // Refs for all ExamenFormulario instances, keyed by atencionExamenId
  const formRefs = useRef<Record<string, ExamenFormularioRef | null>>({});

  const setFormRef = useCallback((atencionExamenId: string) => (el: ExamenFormularioRef | null) => {
    formRefs.current[atencionExamenId] = el;
  }, []);

  useEffect(() => {
    loadPendientes();
  }, [selectedDate]);

  const loadPendientes = async () => {
    setLoading(true);
    try {
      const startOfDay = selectedDate
        ? new Date(new Date(selectedDate).setHours(0, 0, 0, 0)).toISOString()
        : null;
      const endOfDay = selectedDate
        ? new Date(new Date(selectedDate).setHours(23, 59, 59, 999)).toISOString()
        : null;

      let query = supabase
        .from("atencion_examenes")
        .select(`
          id,
          examen_id,
          estado,
          atenciones!inner(
            id,
            fecha_ingreso,
            numero_ingreso,
            pacientes(id, nombre, rut, fecha_nacimiento, empresas(nombre))
          ),
          examenes(nombre)
        `)
        .eq("estado", "muestra_tomada")
        .order("created_at", { ascending: false });

      if (startOfDay && endOfDay) {
        query = query
          .gte("atenciones.fecha_ingreso", startOfDay)
          .lte("atenciones.fecha_ingreso", endOfDay);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      const examenIds = [...new Set((data || []).map((ae: any) => ae.examen_id))];
      let prestadorMap: Record<string, { prestadorId: string; prestadorNombre: string }> = {};

      if (examenIds.length > 0) {
        const { data: peData } = await supabase
          .from("prestador_examenes")
          .select("examen_id, prestador_id, prestadores(id, nombre)")
          .in("examen_id", examenIds);

        if (peData) {
          for (const pe of peData as any[]) {
            prestadorMap[pe.examen_id] = {
              prestadorId: pe.prestador_id,
              prestadorNombre: pe.prestadores?.nombre || "Sin prestador",
            };
          }
        }
      }

      const rows: PendienteRow[] = (data || []).map((ae: any) => ({
        atencionId: ae.atenciones.id,
        atencionExamenId: ae.id,
        examenId: ae.examen_id,
        examenNombre: ae.examenes?.nombre || "Examen",
        pacienteNombre: ae.atenciones.pacientes?.nombre || "",
        pacienteRut: ae.atenciones.pacientes?.rut || "-",
        empresaNombre: ae.atenciones.pacientes?.empresas?.nombre || "Sin empresa",
        fechaIngreso: ae.atenciones.fecha_ingreso,
        numeroIngreso: ae.atenciones.numero_ingreso,
        fechaNacimiento: ae.atenciones.pacientes?.fecha_nacimiento || null,
        prestadorId: prestadorMap[ae.examen_id]?.prestadorId || null,
        prestadorNombre: prestadorMap[ae.examen_id]?.prestadorNombre || "Sin prestador",
      }));

      setPendientes(rows);
    } catch (error) {
      console.error("Error cargando pendientes:", error);
      toast.error("Error al cargar resultados pendientes");
    } finally {
      setLoading(false);
    }
  };

  const grouped = pendientes.reduce<Record<string, PendienteRow[]>>((acc, row) => {
    if (!acc[row.atencionId]) acc[row.atencionId] = [];
    acc[row.atencionId].push(row);
    return acc;
  }, {});

  const filteredGroups = Object.entries(grouped).filter(([, rows]) => {
    if (!searchFilter) return true;
    const s = searchFilter.toLowerCase().trim();
    const first = rows[0];
    const matchNumero = String(first.numeroIngreso) === s || String(first.numeroIngreso).includes(s);
    return (
      matchNumero ||
      first.pacienteNombre.toLowerCase().includes(s) ||
      first.pacienteRut.toLowerCase().includes(s) ||
      first.empresaNombre.toLowerCase().includes(s)
    );
  });

  const groupByPrestador = (rows: PendienteRow[]) => {
    const map: Record<string, PendienteRow[]> = {};
    for (const row of rows) {
      const key = row.prestadorId || "sin-prestador";
      if (!map[key]) map[key] = [];
      map[key].push(row);
    }
    return Object.entries(map);
  };

  const handleUploadPdfPrestador = async (atencionId: string, prestadorRows: PendienteRow[], file: File) => {
    const key = `${atencionId}-${prestadorRows[0]?.prestadorId || "sp"}`;
    setUploadingPdf(key);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `lab-externo/${atencionId}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("examen-resultados")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from("examen-resultados")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);

      if (!urlData?.signedUrl) throw new Error("No se pudo generar URL");

      const { data: archivoData, error: archivoError } = await supabase
        .from("examen_archivos_compartidos")
        .insert({
          atencion_id: atencionId,
          archivo_url: urlData.signedUrl,
          nombre_archivo: file.name,
        })
        .select("id")
        .single();

      if (archivoError) throw archivoError;

      const vinculos = prestadorRows.map((row) => ({
        archivo_compartido_id: archivoData.id,
        examen_id: row.examenId,
      }));

      const { error: vinculoError } = await supabase
        .from("examen_archivo_vinculos")
        .insert(vinculos);

      if (vinculoError) throw vinculoError;

      toast.success(`PDF "${file.name}" vinculado a ${prestadorRows.length} examen(es) de ${prestadorRows[0]?.prestadorNombre}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al subir PDF");
    } finally {
      setUploadingPdf(null);
    }
  };

  // Global save per patient: saves all exam forms + marks all as completado
  const handleSaveAllForPatient = async (atencionId: string, rows: PendienteRow[]) => {
    setSavingPatient(atencionId);
    try {
      // Save all form data
      for (const row of rows) {
        const formRef = formRefs.current[row.atencionExamenId];
        if (formRef) {
          await formRef.save();
        }
      }
      toast.success(`Todos los resultados del paciente guardados`);
      await loadPendientes();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar resultados");
    } finally {
      setSavingPatient(null);
    }
  };

  const handleMarcarTodosCompletados = async (rows: PendienteRow[]) => {
    try {
      const ids = rows.map((r) => r.atencionExamenId);
      const { error } = await supabase
        .from("atencion_examenes")
        .update({ estado: "completado", fecha_realizacion: new Date().toISOString() })
        .in("id", ids);

      if (error) throw error;
      toast.success(`${rows.length} examen(es) marcados como completados`);
      await loadPendientes();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al completar exámenes");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-5 w-5 text-amber-600" />
              Resultados Pendientes
              <Badge variant="secondary">{pendientes.length}</Badge>
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente o N° atención..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay resultados pendientes para esta fecha
            </div>
          ) : (
            filteredGroups.map(([atencionId, rows]) => {
              const first = rows[0];
              const prestadorGroups = groupByPrestador(rows);
              const isSaving = savingPatient === atencionId;

              return (
                <Card key={atencionId} className="border-amber-200 dark:border-amber-800">
                  <CardHeader className="py-2 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-bold text-xs">#{first.numeroIngreso}</Badge>
                        <span className="font-medium text-sm">{first.pacienteNombre}</span>
                        <span className="text-xs text-muted-foreground font-mono">{first.pacienteRut}</span>
                        <span className="text-xs text-muted-foreground">· {first.empresaNombre}</span>
                      </div>
                      <Badge className="bg-amber-600 text-white text-xs">
                        {rows.length} pend.
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 space-y-2">
                    {prestadorGroups.map(([prestadorKey, prestadorRows]) => {
                      const uploadKey = `${atencionId}-${prestadorKey}`;
                      const prestadorNombre = prestadorRows[0]?.prestadorNombre || "Sin prestador";

                      return (
                        <div
                          key={prestadorKey}
                          className={`border rounded-lg overflow-hidden transition-colors ${dragOverKey === uploadKey ? "border-primary bg-primary/5" : ""}`}
                          onDragOver={(e) => { e.preventDefault(); setDragOverKey(uploadKey); }}
                          onDragLeave={() => setDragOverKey(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverKey(null);
                            const file = e.dataTransfer.files?.[0];
                            if (file && (file.type === "application/pdf" || file.name.endsWith(".pdf"))) {
                              handleUploadPdfPrestador(atencionId, prestadorRows, file);
                            } else {
                              toast.error("Solo se permiten archivos PDF");
                            }
                          }}
                        >
                          {/* Prestador header */}
                          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 border-b">
                            <div className="flex items-center gap-2">
                              <FlaskConical className="h-3.5 w-3.5 text-primary" />
                              <span className="font-medium text-xs">{prestadorNombre}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {prestadorRows.length}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              {dragOverKey === uploadKey && (
                                <span className="text-[10px] text-primary font-medium animate-pulse">Soltar PDF</span>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 h-7 text-xs"
                                disabled={uploadingPdf === uploadKey}
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = ".pdf";
                                  input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) handleUploadPdfPrestador(atencionId, prestadorRows, file);
                                  };
                                  input.click();
                                }}
                              >
                                {uploadingPdf === uploadKey ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Upload className="h-3 w-3" />
                                )}
                                PDF
                              </Button>
                            </div>
                          </div>

                          {/* Compact exam forms */}
                          <div className="p-2 space-y-2">
                            {prestadorRows.map((row) => (
                              <div key={row.atencionExamenId} className="border rounded p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-xs">{row.examenNombre}</span>
                                </div>
                                <ExamenFormulario
                                  ref={setFormRef(row.atencionExamenId)}
                                  atencionExamenId={row.atencionExamenId}
                                  examenId={row.examenId}
                                  examenNombre={row.examenNombre}
                                  onComplete={() => {}}
                                  fechaNacimiento={row.fechaNacimiento}
                                  hideSaveButton
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Single action row per patient */}
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={isSaving}
                        onClick={() => handleSaveAllForPatient(atencionId, rows)}
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Guardar Todo
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleMarcarTodosCompletados(rows)}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Completar Todos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultadosPendientes;
