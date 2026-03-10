import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Upload, FileText, Loader2, Building2, Stethoscope, FlaskConical, CheckSquare, Save } from "lucide-react";
import ExamenFormulario from "@/components/ExamenFormulario";

interface AtencionExamen {
  id: string;
  examen_id: string;
  estado: string;
  examenes: { nombre: string };
}

interface PrestadorGroup {
  prestadorId: string | null;
  prestadorNombre: string;
  prestadorTipo: string;
  examenes: AtencionExamen[];
  archivosCompartidos: ArchivoCompartido[];
}

interface ArchivoCompartido {
  id: string;
  nombre_archivo: string;
  archivo_url: string;
  created_at: string;
}

interface Props {
  atencionId: string;
  atencionExamenes: AtencionExamen[];
  onComplete?: () => void;
  fechaNacimiento?: string | null;
}

const ExamenPrestadorGroup = ({ atencionId, atencionExamenes, onComplete, fechaNacimiento }: Props) => {
  const [prestadorExamenes, setPrestadorExamenes] = useState<Record<string, string>>({});
  const [prestadores, setPrestadores] = useState<Record<string, string>>({});
  const [prestadorTipos, setPrestadorTipos] = useState<Record<string, string>>({});
  const [archivosCompartidos, setArchivosCompartidos] = useState<ArchivoCompartido[]>([]);
  const [archivoVinculos, setArchivoVinculos] = useState<Record<string, string[]>>({});
  const [expandedExamen, setExpandedExamen] = useState<string | null>(null);
  const [trazabilidadMap, setTrazabilidadMap] = useState<Record<string, string[]>>({});
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const prevAtencionIdRef = useRef<string | null>(null);
  const prevExamenIdsRef = useRef<string>("");

  // Bulk muestra tomada state: groupKey -> Set of selected atencion_examen IDs
  const [bulkSelections, setBulkSelections] = useState<Record<string, Set<string>>>({});
  const [savingBulk, setSavingBulk] = useState<string | null>(null);

  // Only reload prestador data when atencionId changes or examen IDs actually change
  useEffect(() => {
    const examenIdsKey = atencionExamenes.map(ae => ae.id).sort().join(",");
    const isNewAtencion = atencionId !== prevAtencionIdRef.current;
    const examenesChanged = examenIdsKey !== prevExamenIdsRef.current;

    if (isNewAtencion || examenesChanged) {
      prevAtencionIdRef.current = atencionId;
      prevExamenIdsRef.current = examenIdsKey;
      loadPrestadorData(isNewAtencion);
    }
  }, [atencionId, atencionExamenes]);

  const loadPrestadorData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const examenIds = atencionExamenes.map(ae => ae.examen_id);
      if (examenIds.length === 0) { setLoading(false); return; }

      // Fetch prestador_examenes + shared files + vinculos + trazabilidad in parallel
      const [peRes, archRes, vincRes, trazRes] = await Promise.all([
        supabase.from("prestador_examenes")
          .select("examen_id, prestador_id, prestadores(nombre, tipo)")
          .in("examen_id", examenIds),
        supabase.from("examen_archivos_compartidos")
          .select("*")
          .eq("atencion_id", atencionId)
          .order("created_at", { ascending: false }),
        supabase.from("examen_archivo_vinculos")
          .select("archivo_compartido_id, examen_id")
          .in("examen_id", examenIds),
        // Load trazabilidad links for all exams in this atencion
        supabase.from("examen_trazabilidad")
          .select("*")
          .or(examenIds.map(id => `examen_id_a.eq.${id},examen_id_b.eq.${id}`).join(",")),
      ]);

      // Map examen_id -> prestador_id
      const peMap: Record<string, string> = {};
      const pNames: Record<string, string> = {};
      const pTipos: Record<string, string> = {};
      (peRes.data || []).forEach((pe: any) => {
        peMap[pe.examen_id] = pe.prestador_id;
        if (pe.prestadores?.nombre) {
          pNames[pe.prestador_id] = pe.prestadores.nombre;
          pTipos[pe.prestador_id] = pe.prestadores.tipo || "interno";
        }
      });
      setPrestadorExamenes(peMap);
      setPrestadores(pNames);
      setPrestadorTipos(pTipos);

      setArchivosCompartidos(archRes.data || []);

      // Map archivo_compartido_id -> [examen_id]
      const vincMap: Record<string, string[]> = {};
      (vincRes.data || []).forEach((v: any) => {
        if (!vincMap[v.archivo_compartido_id]) vincMap[v.archivo_compartido_id] = [];
        vincMap[v.archivo_compartido_id].push(v.examen_id);
      });
      setArchivoVinculos(vincMap);

      // Build trazabilidad map: examen_id -> [linked_examen_ids]
      const trazMap: Record<string, string[]> = {};
      (trazRes.data || []).forEach((t: any) => {
        if (!trazMap[t.examen_id_a]) trazMap[t.examen_id_a] = [];
        if (!trazMap[t.examen_id_b]) trazMap[t.examen_id_b] = [];
        if (!trazMap[t.examen_id_a].includes(t.examen_id_b)) trazMap[t.examen_id_a].push(t.examen_id_b);
        if (!trazMap[t.examen_id_b].includes(t.examen_id_a)) trazMap[t.examen_id_b].push(t.examen_id_a);
      });
      setTrazabilidadMap(trazMap);
    } catch (error) {
      console.error("Error loading prestador data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group exams by prestador
  const groups: PrestadorGroup[] = useMemo(() => {
    const groupMap: Record<string, PrestadorGroup> = {};

    atencionExamenes.forEach(ae => {
      const prestadorId = prestadorExamenes[ae.examen_id] || null;
      const key = prestadorId || "__sin_prestador__";
      
      if (!groupMap[key]) {
        groupMap[key] = {
          prestadorId,
          prestadorNombre: prestadorId ? (prestadores[prestadorId] || "Prestador") : "Sin prestador",
          prestadorTipo: prestadorId ? (prestadorTipos[prestadorId] || "interno") : "interno",
          examenes: [],
          archivosCompartidos: [],
        };
      }
      groupMap[key].examenes.push(ae);
    });

    // Assign shared files to groups by checking vinculos
    archivosCompartidos.forEach(archivo => {
      const linkedExamenIds = archivoVinculos[archivo.id] || [];
      // Find which group this file belongs to
      for (const [key, group] of Object.entries(groupMap)) {
        const groupExamenIds = group.examenes.map(e => e.examen_id);
        if (linkedExamenIds.some(id => groupExamenIds.includes(id))) {
          group.archivosCompartidos.push(archivo);
          break;
        }
      }
    });

    // Sort: groups with prestador first, then sin prestador
    return Object.values(groupMap).sort((a, b) => {
      if (a.prestadorId && !b.prestadorId) return -1;
      if (!a.prestadorId && b.prestadorId) return 1;
      return a.prestadorNombre.localeCompare(b.prestadorNombre);
    });
  }, [atencionExamenes, prestadorExamenes, prestadores, prestadorTipos, archivosCompartidos, archivoVinculos]);

  const handleUploadSharedFile = async (groupKey: string, group: PrestadorGroup, file: File) => {
    setUploading(groupKey);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `compartidos/${atencionId}/${groupKey}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("examen-resultados")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from("examen-resultados")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);

      if (!urlData?.signedUrl) throw new Error("No se pudo generar URL");

      // Create shared file record
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

      // Link to all exams in this group + trazabilidad-linked exams
      const linkedExamenIds = new Set(group.examenes.map(ae => ae.examen_id));
      
      // Add trazabilidad-linked exams
      group.examenes.forEach(ae => {
        const trazLinks = trazabilidadMap[ae.examen_id] || [];
        trazLinks.forEach(linkedId => linkedExamenIds.add(linkedId));
      });

      const vinculos = Array.from(linkedExamenIds).map(examenId => ({
        archivo_compartido_id: archivoData.id,
        examen_id: examenId,
      }));

      const { error: vincError } = await supabase
        .from("examen_archivo_vinculos")
        .insert(vinculos);

      if (vincError) throw vincError;

      toast.success(`PDF compartido subido para ${group.prestadorNombre}`);
      await loadPrestadorData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al subir archivo compartido");
    } finally {
      setUploading(null);
    }
  };

  const handleMuestraTomada = async (atencionExamenId: string) => {
    try {
      const { error } = await supabase
        .from("atencion_examenes")
        .update({ estado: "muestra_tomada" as any, fecha_realizacion: new Date().toISOString() })
        .eq("id", atencionExamenId);

      if (error) throw error;
      toast.success("Muestra tomada registrada");
      onComplete?.();
      await loadPrestadorData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al registrar muestra tomada");
    }
  };

  const handleSelectAllGroup = (groupKey: string, examenes: AtencionExamen[]) => {
    const pendientes = examenes.filter(e => e.estado === "pendiente" || e.estado === "incompleto");
    setBulkSelections(prev => ({
      ...prev,
      [groupKey]: new Set(pendientes.map(e => e.id)),
    }));
  };

  const handleToggleBulkExamen = (groupKey: string, atencionExamenId: string) => {
    setBulkSelections(prev => {
      const current = new Set(prev[groupKey] || []);
      if (current.has(atencionExamenId)) {
        current.delete(atencionExamenId);
      } else {
        current.add(atencionExamenId);
      }
      return { ...prev, [groupKey]: current };
    });
  };

  const handleClearBulkSelection = (groupKey: string) => {
    setBulkSelections(prev => {
      const next = { ...prev };
      delete next[groupKey];
      return next;
    });
  };

  const handleSaveBulkMuestraTomada = async (groupKey: string) => {
    const selected = bulkSelections[groupKey];
    if (!selected || selected.size === 0) {
      toast.error("No hay exámenes seleccionados");
      return;
    }
    setSavingBulk(groupKey);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from("atencion_examenes")
        .update({ estado: "muestra_tomada" as any, fecha_realizacion: new Date().toISOString() })
        .in("id", ids);

      if (error) throw error;
      toast.success(`${ids.length} muestra(s) tomada(s) registrada(s)`);
      handleClearBulkSelection(groupKey);
      onComplete?.();
      await loadPrestadorData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al registrar muestras tomadas");
    } finally {
      setSavingBulk(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (atencionExamenes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Todos los exámenes de este box ya fueron completados
      </p>
    );
  }

  // If only one group and it's "sin prestador", render flat list
  if (groups.length === 1 && !groups[0].prestadorId) {
    return (
      <div className="space-y-2">
        {groups[0].examenes.map((examen) => (
          <Collapsible
            key={examen.id}
            open={expandedExamen === examen.id}
            onOpenChange={(open) => setExpandedExamen(open ? examen.id : null)}
          >
             <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-2">
                  {expandedExamen === examen.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-medium text-sm">{examen.examenes.nombre}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(examen.estado === "pendiente" || examen.estado === "incompleto") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-6 text-xs"
                      onClick={(e) => { e.stopPropagation(); handleMuestraTomada(examen.id); }}
                    >
                      <FlaskConical className="h-3 w-3" />
                      Muestra Tomada
                    </Button>
                  )}
                  <Badge 
                    variant={examen.estado === "completado" ? "default" : examen.estado === "muestra_tomada" ? "secondary" : examen.estado === "incompleto" ? "secondary" : "outline"} 
                    className={`text-xs ${examen.estado === "muestra_tomada" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : ""}`}
                  >
                    {examen.estado === "muestra_tomada" ? "Muestra tomada" : examen.estado}
                  </Badge>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="border border-t-0 rounded-b-lg p-4">
              <ExamenFormulario
                atencionExamenId={examen.id}
                examenId={examen.examen_id}
                examenNombre={examen.examenes.nombre}
                onComplete={onComplete}
                fechaNacimiento={fechaNacimiento}
              />
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const groupKey = group.prestadorId || "__sin_prestador__";
        const completedCount = group.examenes.filter(e => e.estado === "completado").length;
        const totalCount = group.examenes.length;
        const allCompleted = completedCount === totalCount;

        return (
          <Card key={groupKey} className="overflow-hidden">
            <Collapsible
              open={expandedGroup === groupKey}
              onOpenChange={(open) => setExpandedGroup(open ? groupKey : null)}
            >
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 px-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedGroup === groupKey ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {group.prestadorId ? (
                        <Building2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Stethoscope className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-sm">{group.prestadorNombre}</span>
                      <Badge variant="outline" className="text-xs">
                        {completedCount}/{totalCount}
                      </Badge>
                    </div>
                    <Badge variant={allCompleted ? "default" : "secondary"} className="text-xs">
                      {allCompleted ? "Completo" : "Pendiente"}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {/* Shared PDF section for prestador groups */}
                  {group.prestadorId && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          PDF compartido ({group.prestadorNombre})
                        </span>
                        <div>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            id={`shared-file-${groupKey}`}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadSharedFile(groupKey, group, file);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs h-7"
                            onClick={() => document.getElementById(`shared-file-${groupKey}`)?.click()}
                            disabled={uploading === groupKey}
                          >
                            {uploading === groupKey ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3" />
                            )}
                            Subir PDF
                          </Button>
                        </div>
                      </div>
                      {group.archivosCompartidos.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {group.archivosCompartidos.map((archivo) => (
                            <a
                              key={archivo.id}
                              href={archivo.archivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline bg-background rounded px-2 py-1 border"
                            >
                              <FileText className="h-3 w-3" />
                              {archivo.nombre_archivo}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bulk muestra tomada controls for prestador groups */}
                  {(() => {
                    const pendientes = group.examenes.filter(e => e.estado === "pendiente" || e.estado === "incompleto");
                    const bulkActive = !!bulkSelections[groupKey];
                    const selectedCount = bulkSelections[groupKey]?.size || 0;

                    if (pendientes.length > 0) {
                      return (
                        <div className="flex items-center gap-2 flex-wrap bg-accent/20 rounded-lg p-2">
                          {!bulkActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs h-7"
                              onClick={(e) => { e.stopPropagation(); handleSelectAllGroup(groupKey, group.examenes); }}
                            >
                              <CheckSquare className="h-3 w-3" />
                              Seleccionar todas las muestras ({pendientes.length})
                            </Button>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground">
                                {selectedCount} de {pendientes.length} seleccionados
                              </span>
                              <Button
                                variant="default"
                                size="sm"
                                className="gap-1 text-xs h-7"
                                onClick={(e) => { e.stopPropagation(); handleSaveBulkMuestraTomada(groupKey); }}
                                disabled={savingBulk === groupKey || selectedCount === 0}
                              >
                                {savingBulk === groupKey ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                                Guardar Muestras Tomadas
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7"
                                onClick={(e) => { e.stopPropagation(); handleClearBulkSelection(groupKey); }}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* All exams rendered inline - no extra collapsibles */}
                  {group.examenes.map((examen) => {
                    const bulkActive = !!bulkSelections[groupKey];
                    const isPendiente = examen.estado === "pendiente" || examen.estado === "incompleto";
                    const isSelected = bulkSelections[groupKey]?.has(examen.id) || false;

                    return (
                      <div key={examen.id} className={`border rounded-lg p-4 space-y-2 ${bulkActive && isSelected ? "border-primary bg-primary/5" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {bulkActive && isPendiente && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleBulkExamen(groupKey, examen.id)}
                              />
                            )}
                            <span className="font-medium text-sm">{examen.examenes.nombre}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!bulkActive && isPendiente && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 h-6 text-xs"
                                onClick={() => handleMuestraTomada(examen.id)}
                              >
                                <FlaskConical className="h-3 w-3" />
                                Muestra Tomada
                              </Button>
                            )}
                            <Badge
                              variant={examen.estado === "completado" ? "default" : examen.estado === "muestra_tomada" ? "secondary" : examen.estado === "incompleto" ? "secondary" : "outline"}
                              className={`text-xs ${examen.estado === "muestra_tomada" ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : ""}`}
                            >
                              {examen.estado === "muestra_tomada" ? "Muestra tomada" : examen.estado}
                            </Badge>
                          </div>
                        </div>
                        <ExamenFormulario
                          atencionExamenId={examen.id}
                          examenId={examen.examen_id}
                          examenNombre={examen.examenes.nombre}
                          fechaNacimiento={fechaNacimiento}
                          esExterno={group.prestadorTipo === "externo"}
                          onComplete={() => {
                            onComplete?.();
                            loadPrestadorData();
                          }}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
};

export default ExamenPrestadorGroup;
