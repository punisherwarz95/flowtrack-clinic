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
  isExternoCompletado: boolean;
}

interface ArchivoCompartido {
  id: string;
  nombre_archivo: string;
  archivo_url: string;
  examenIds: string[];
}

interface Props {
  selectedDate: Date | undefined;
}

const ResultadosPendientes = ({ selectedDate }: Props) => {
  const [pendientes, setPendientes] = useState<PendienteRow[]>([]);
  const [archivosMap, setArchivosMap] = useState<Record<string, ArchivoCompartido[]>>({});
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

      // First query: muestra_tomada and incompleto exams
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
            pacientes!inner(id, nombre, rut, fecha_nacimiento, tipo_servicio, empresas(nombre))
          ),
          examenes(nombre)
        `)
        .in("estado", ["muestra_tomada", "incompleto"])
        .eq("atenciones.pacientes.tipo_servicio", "jenner")
        .order("created_at", { ascending: false });

      if (startOfDay && endOfDay) {
        query = query
          .gte("atenciones.fecha_ingreso", startOfDay)
          .lte("atenciones.fecha_ingreso", endOfDay);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      // Collect all examen_ids to fetch prestador info (including tipo)
      const allData = data || [];
      const examenIds = [...new Set(allData.map((ae: any) => ae.examen_id))];
      let prestadorMap: Record<string, { prestadorId: string; prestadorNombre: string; prestadorTipo: string }> = {};

      if (examenIds.length > 0) {
        const { data: peData } = await supabase
          .from("prestador_examenes")
          .select("examen_id, prestador_id, prestadores(id, nombre, tipo)")
          .in("examen_id", examenIds);

        if (peData) {
          for (const pe of peData as any[]) {
            prestadorMap[pe.examen_id] = {
              prestadorId: pe.prestador_id,
              prestadorNombre: pe.prestadores?.nombre || "Sin prestador",
              prestadorTipo: pe.prestadores?.tipo || "interno",
            };
          }
        }
      }

      // Also fetch "completado" exams from external providers (incorrectly completed in box)
      // Get all external examen_ids
      const externoExamenIds = Object.entries(prestadorMap)
        .filter(([, v]) => v.prestadorTipo === "externo")
        .map(([examenId]) => examenId);

      // Also search for any completado exams from external providers not yet in our list
      if (externoExamenIds.length > 0 || true) {
        // We need to find all external provider examen_ids first
        const { data: allExternosPe } = await supabase
          .from("prestador_examenes")
          .select("examen_id, prestador_id, prestadores(id, nombre, tipo)")
          .eq("prestadores.tipo", "externo");

        const externoExamenIdsAll = (allExternosPe || [])
          .filter((pe: any) => pe.prestadores?.tipo === "externo")
          .map((pe: any) => pe.examen_id);

        // Update prestadorMap with these
        (allExternosPe || []).forEach((pe: any) => {
          if (pe.prestadores?.tipo === "externo" && !prestadorMap[pe.examen_id]) {
            prestadorMap[pe.examen_id] = {
              prestadorId: pe.prestador_id,
              prestadorNombre: pe.prestadores?.nombre || "Sin prestador",
              prestadorTipo: "externo",
            };
          }
        });

        if (externoExamenIdsAll.length > 0) {
          let queryExtComp = supabase
            .from("atencion_examenes")
            .select(`
              id,
              examen_id,
              estado,
              atenciones!inner(
                id,
                fecha_ingreso,
                numero_ingreso,
                pacientes!inner(id, nombre, rut, fecha_nacimiento, tipo_servicio, empresas(nombre))
              ),
              examenes(nombre)
            `)
            .eq("estado", "completado")
            .in("examen_id", externoExamenIdsAll)
            .eq("atenciones.pacientes.tipo_servicio", "jenner")
            .order("created_at", { ascending: false });

          if (startOfDay && endOfDay) {
            queryExtComp = queryExtComp
              .gte("atenciones.fecha_ingreso", startOfDay)
              .lte("atenciones.fecha_ingreso", endOfDay);
          }

          const { data: extCompData } = await queryExtComp.limit(200);

          // Add these to allData, avoiding duplicates; track external completado IDs
          const existingIds = new Set(allData.map((ae: any) => ae.id));
          (extCompData || []).forEach((ae: any) => {
            if (!existingIds.has(ae.id)) {
              allData.push(ae);
            }
          });
        }
      }

      const rows: PendienteRow[] = allData.map((ae: any) => ({
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
        isExternoCompletado: ae.estado === "completado" && (prestadorMap[ae.examen_id]?.prestadorTipo === "externo"),
      }));

      setPendientes(rows);

      // Load archivos compartidos AND examen_resultados files for all atenciones
      const atencionIds = [...new Set(rows.map(r => r.atencionId))];
      const allAtencionExamenIds = rows.map(r => r.atencionExamenId);
      if (atencionIds.length > 0) {
        // Fetch shared files
        const { data: archivosData } = await supabase
          .from("examen_archivos_compartidos")
          .select("id, atencion_id, nombre_archivo, archivo_url")
          .in("atencion_id", atencionIds);

        const { data: vinculosData } = await supabase
          .from("examen_archivo_vinculos")
          .select("archivo_compartido_id, examen_id")
          .in("archivo_compartido_id", (archivosData || []).map(a => a.id));

        // Also fetch files from examen_resultados (uploaded during box exams)
        const { data: resultadosArchivos } = await supabase
          .from("examen_resultados")
          .select("atencion_examen_id, archivo_url, examen_formulario_campos(etiqueta)")
          .in("atencion_examen_id", allAtencionExamenIds)
          .not("archivo_url", "is", null);

        const vinculosByArchivo: Record<string, string[]> = {};
        (vinculosData || []).forEach((v: any) => {
          if (!vinculosByArchivo[v.archivo_compartido_id]) vinculosByArchivo[v.archivo_compartido_id] = [];
          vinculosByArchivo[v.archivo_compartido_id].push(v.examen_id);
        });

        const map: Record<string, ArchivoCompartido[]> = {};
        (archivosData || []).forEach((a: any) => {
          if (!map[a.atencion_id]) map[a.atencion_id] = [];
          map[a.atencion_id].push({
            id: a.id,
            nombre_archivo: a.nombre_archivo,
            archivo_url: a.archivo_url,
            examenIds: vinculosByArchivo[a.id] || [],
          });
        });

        // Add files from examen_resultados to the map
        (resultadosArchivos || []).forEach((r: any) => {
          const row = rows.find(ro => ro.atencionExamenId === r.atencion_examen_id);
          if (!row || !r.archivo_url) return;
          if (!map[row.atencionId]) map[row.atencionId] = [];
          // Avoid duplicates
          const alreadyExists = map[row.atencionId].some(a => a.archivo_url === r.archivo_url);
          if (!alreadyExists) {
            map[row.atencionId].push({
              id: `resultado-${r.atencion_examen_id}`,
              nombre_archivo: r.examen_formulario_campos?.etiqueta || `Archivo - ${row.examenNombre}`,
              archivo_url: r.archivo_url,
              examenIds: [row.examenId],
            });
          }
        });

        setArchivosMap(map);
      } else {
        setArchivosMap({});
      }
    } catch (error) {
      console.error("Error cargando pendientes:", error);
      toast.error("Error al cargar resultados pendientes");
    } finally {
      setLoading(false);
    }
  };

  // Filter out external-completado exams that already have associated PDFs
  const filteredPendientes = pendientes.filter(row => {
    if (!row.isExternoCompletado) return true;
    // Check if this exam has an associated file
    const atencionArchivos = archivosMap[row.atencionId] || [];
    const tieneArchivo = atencionArchivos.some(a => a.examenIds.includes(row.examenId));
    return !tieneArchivo;
  });

  const grouped = filteredPendientes.reduce<Record<string, PendienteRow[]>>((acc, row) => {
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
  }).sort(([, aRows], [, bRows]) => {
    return (aRows[0]?.numeroIngreso || 0) - (bRows[0]?.numeroIngreso || 0);
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

  // Save all form data WITHOUT changing exam status
  const handleSaveAllForPatient = async (atencionId: string, rows: PendienteRow[]) => {
    setSavingPatient(atencionId);
    try {
      for (const row of rows) {
        const formRef = formRefs.current[row.atencionExamenId];
        if (formRef) {
          await formRef.saveOnly();
        }
      }
      toast.success(`Datos guardados correctamente (sin cambiar estado)`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar resultados");
    } finally {
      setSavingPatient(null);
    }
  };

  // Save + validate required fields + validate prestador PDFs + mark as completado
  const handleMarcarTodosCompletados = async (rows: PendienteRow[]) => {
    const atencionId = rows[0]?.atencionId;
    setSavingPatient(atencionId || null);
    try {
      // First save all data
      for (const row of rows) {
        const formRef = formRefs.current[row.atencionExamenId];
        if (formRef) {
          await formRef.saveOnly();
        }
      }

      // Validate that each prestador group has at least one shared PDF
      const prestadorGroups = groupByPrestador(rows);
      const atencionArchivos = archivosMap[atencionId] || [];
      const prestadoresSinPdf: string[] = [];
      for (const [, prestadorRows] of prestadorGroups) {
        const prestadorExamenIds = prestadorRows.map(r => r.examenId);
        const tieneArchivo = atencionArchivos.some(a =>
          a.examenIds.some(eid => prestadorExamenIds.includes(eid))
        );
        if (!tieneArchivo) {
          prestadoresSinPdf.push(prestadorRows[0]?.prestadorNombre || "Sin prestador");
        }
      }

      if (prestadoresSinPdf.length > 0) {
        toast.error(`Falta PDF grupal en: ${prestadoresSinPdf.join(", ")}. Suba el PDF del prestador antes de completar.`);
        return;
      }

      // Then validate required fields for each exam
      const invalidExams: string[] = [];
      for (const row of rows) {
        const formRef = formRefs.current[row.atencionExamenId];
        if (formRef && !formRef.validateRequired()) {
          invalidExams.push(row.examenNombre);
        }
      }

      if (invalidExams.length > 0) {
        toast.error(`Campos obligatorios (*) sin completar en: ${invalidExams.join(", ")}`);
        return;
      }

      // All valid — mark as completado
      const ids = rows.map((r) => r.atencionExamenId);
      const { error } = await supabase
        .from("atencion_examenes")
        .update({ estado: "completado", fecha_realizacion: new Date().toISOString() })
        .in("id", ids);

      if (error) throw error;
      toast.success(`${rows.length} examen(es) completados`);
      await loadPendientes();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al completar exámenes");
    } finally {
      setSavingPatient(null);
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
              <Badge variant="secondary">{filteredPendientes.length}</Badge>
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
                  <CardHeader className="py-2 px-4 sticky top-0 z-10 bg-card border-b">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Badge variant="outline" className="font-bold text-xs">#{first.numeroIngreso}</Badge>
                        <span className="font-medium text-sm">{first.pacienteNombre}</span>
                        <span className="text-xs text-muted-foreground font-mono">{first.pacienteRut}</span>
                        <span className="text-xs text-muted-foreground">· {first.empresaNombre}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-7 text-xs"
                          disabled={isSaving}
                          onClick={() => handleSaveAllForPatient(atencionId, rows)}
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 h-7 text-xs"
                          disabled={isSaving}
                          onClick={() => handleMarcarTodosCompletados(rows)}
                        >
                          {isSaving && savingPatient === atencionId ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                          Completar
                        </Button>
                        <Badge className="bg-amber-600 text-white text-xs">
                          {rows.length} pend.
                        </Badge>
                      </div>
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

                          {/* Archivos subidos para este prestador */}
                          {(() => {
                            const atencionArchivos = archivosMap[atencionId] || [];
                            const prestadorExamenIds = prestadorRows.map(r => r.examenId);
                            const archivosDelPrestador = atencionArchivos.filter(a =>
                              a.examenIds.some(eid => prestadorExamenIds.includes(eid))
                            );
                            if (archivosDelPrestador.length === 0) return null;
                            return (
                              <div className="px-3 py-2 border-b bg-green-50 dark:bg-green-950/20">
                                <p className="text-[10px] font-medium text-muted-foreground mb-1">Archivos subidos:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {archivosDelPrestador.map(archivo => (
                                    <a
                                      key={archivo.id}
                                      href={archivo.archivo_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                    >
                                      <FileIcon className="h-3 w-3" />
                                      {archivo.nombre_archivo}
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

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
                                  atencionId={atencionId}
                                  archivosVinculados={(archivosMap[atencionId] || [])
                                    .filter((archivo) => archivo.examenIds.includes(row.examenId))
                                    .map((archivo) => ({
                                      nombre_archivo: archivo.nombre_archivo,
                                      archivo_url: archivo.archivo_url,
                                    }))}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

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
