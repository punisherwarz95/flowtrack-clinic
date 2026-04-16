import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Play, CheckCircle, XCircle, Calendar as CalendarIcon, FileText, RefreshCw, ChevronDown, Check, FileWarning, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { GlobalChat } from "@/components/GlobalChat";
import { usePresionTimers } from "@/hooks/usePresionTimers";
import PresionTimerBadge from "@/components/PresionTimerBadge";
import { logActivity } from "@/lib/activityLog";
import { useBoxes, useExamenes } from "@/hooks/useReferenceData";
import { useLocalAtenciones } from "@/hooks/useLocalAtenciones";
import { useSyncContext } from "@/contexts/SyncContext";

interface Atencion {
  id: string;
  estado: string;
  fecha_ingreso: string;
  fecha_inicio_atencion: string | null;
  numero_ingreso: number;
  box_id: string | null;
  estado_ficha: string;
  prioridad?: boolean;
  pacientes: {
    id: string;
    nombre: string;
    rut: string;
    tipo_servicio: string;
  };
  boxes: { nombre: string } | null;
}

interface AtencionExamen {
  id: string;
  examen_id: string;
  estado: string;
  examenes: {
    nombre: string;
  };
}

interface Box {
  id: string;
  nombre: string;
  box_examenes: Array<{
    examen_id: string;
  }>;
}

interface Examen {
  id: string;
  nombre: string;
  descripcion: string | null;
}

const Flujo = () => {
  const { user } = useAuth(); // Protect route and get current user
  const [atenciones, setAtenciones] = useState<Atencion[]>([]);
  const { data: cachedBoxes = [] } = useBoxes();
  const { data: cachedExamenes = [] } = useExamenes();
  const boxes = cachedBoxes as Box[];
  const examenes = cachedExamenes as Examen[];
  const [selectedBox, setSelectedBox] = useState<{[atencionId: string]: string}>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [pendingBoxes, setPendingBoxes] = useState<{[atencionId: string]: string[]}>({});
  const [atencionExamenes, setAtencionExamenes] = useState<{[atencionId: string]: AtencionExamen[]}>({});
  const [examenesPendientes, setExamenesPendientes] = useState<{[atencionId: string]: string[]}>({});
  const [confirmCompletarDialog, setConfirmCompletarDialog] = useState<{open: boolean, atencionId: string | null}>({open: false, atencionId: null});
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);
  const [filtroBox, setFiltroBox] = useState<string>("todos");
  const [filtroBoxAtencion, setFiltroBoxAtencion] = useState<string>("todos");
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Estado local para marcar exámenes antes de guardar
  const [examenesSeleccionados, setExamenesSeleccionados] = useState<{[atencionId: string]: Set<string>}>({});
  // FASE 7: Document counts per atencion (pendientes y totales)
  const [docsPendientes, setDocsPendientes] = useState<{[atencionId: string]: number}>({});
  const [docsTotal, setDocsTotal] = useState<{[atencionId: string]: number}>({});
  const [totalExamenesPorAtencion, setTotalExamenesPorAtencion] = useState<{[atencionId: string]: number}>({});
  // Pacientes con fusion de agenda diferida pendiente (RUTs)
  const [rutsConFusionPendiente, setRutsConFusionPendiente] = useState<Set<string>>(new Set());
  const atencionesRef = useRef<Atencion[]>([]);
  const boxesRef = useRef<Box[]>([]);
  const examenesRef = useRef<Examen[]>([]);

  // ── Offline-first: read from local cache ──────────────────────────
  const localData = useLocalAtenciones();
  const syncCtx = useSyncContext();
  const isToday = selectedDate ? (
    selectedDate.toDateString() === new Date().toDateString()
  ) : true;

  const atencionIdsConTemporizador = useMemo(() => atenciones.map((a) => a.id), [atenciones]);
  const { timerByAtencion } = usePresionTimers(atencionIdsConTemporizador);

  useEffect(() => {
    atencionesRef.current = atenciones;
  }, [atenciones]);

  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  useEffect(() => {
    examenesRef.current = examenes;
  }, [examenes]);

  // ── Derive data from local cache using useMemo (no setState cycles) ──
  const localDerived = useMemo(() => {
    if (!isToday || !localData.isLoaded) return null;
    
    const localAtenciones: Atencion[] = localData.atenciones
      .filter(a => a.estado === 'en_espera' || a.estado === 'en_atencion')
      .sort((a, b) => {
        const pa = a.prioridad ? 1 : 0;
        const pb = b.prioridad ? 1 : 0;
        if (pb !== pa) return pb - pa;
        return (a.numero_ingreso || 0) - (b.numero_ingreso || 0);
      })
      .map(la => ({
        id: la.id,
        estado: la.estado,
        fecha_ingreso: la.fecha_ingreso,
        fecha_inicio_atencion: la.fecha_inicio_atencion,
        numero_ingreso: la.numero_ingreso || 0,
        box_id: la.box_id,
        estado_ficha: la.estado_ficha,
        prioridad: la.prioridad,
        pacientes: {
          id: la.paciente_id,
          nombre: la.paciente_nombre || '',
          rut: la.paciente_rut || '',
          tipo_servicio: la.paciente_tipo_servicio || '',
        },
        boxes: la.box_nombre ? { nombre: la.box_nombre } : null,
      }));

    const atencionIds = localAtenciones.map(a => a.id);
    const newExamenesPendientes: {[id: string]: string[]} = {};
    const newTotalExamenes: {[id: string]: number} = {};
    const newAtencionExamenes: {[id: string]: AtencionExamen[]} = {};
    const newPendingBoxes: {[id: string]: string[]} = {};
    
    atencionIds.forEach(id => {
      newExamenesPendientes[id] = [];
      newTotalExamenes[id] = 0;
      newAtencionExamenes[id] = [];
      newPendingBoxes[id] = [];
    });

    const allLocalExamenes = localData.atencionExamenes.filter(ae => atencionIds.includes(ae.atencion_id));
    
    allLocalExamenes.forEach(ae => {
      newTotalExamenes[ae.atencion_id] = (newTotalExamenes[ae.atencion_id] || 0) + 1;
      
      if (ae.estado === 'pendiente' || ae.estado === 'incompleto') {
        const nombre = ae.examen_nombre || '';
        if (nombre) {
          const nombreConEstado = ae.estado === 'incompleto' ? `${nombre} (I)` : nombre;
          newExamenesPendientes[ae.atencion_id]?.push(nombreConEstado);
        }
        
        const atencion = localAtenciones.find(a => a.id === ae.atencion_id);
        if (atencion?.estado === 'en_atencion' && atencion.box_id) {
          const box = boxes.find(b => b.id === atencion.box_id);
          const boxExamIds = box?.box_examenes.map(be => be.examen_id) || [];
          if (boxExamIds.includes(ae.examen_id)) {
            newAtencionExamenes[ae.atencion_id].push({
              id: ae.id,
              examen_id: ae.examen_id,
              estado: ae.estado,
              examenes: { nombre: ae.examen_nombre || '' },
            });
          }
        } else {
          newAtencionExamenes[ae.atencion_id].push({
            id: ae.id,
            examen_id: ae.examen_id,
            estado: ae.estado,
            examenes: { nombre: ae.examen_nombre || '' },
          });
        }

        const examenId = ae.examen_id;
        boxes.forEach(box => {
          if (box.box_examenes.some(be => be.examen_id === examenId)) {
            if (!newPendingBoxes[ae.atencion_id]?.includes(box.nombre)) {
              newPendingBoxes[ae.atencion_id]?.push(box.nombre);
            }
          }
        });
      }
    });

    // Docs counts from local cache
    const allLocalDocs = localData.atencionDocumentos.filter(d => atencionIds.includes(d.atencion_id));
    const pendingCounts: {[id: string]: number} = {};
    const totalCounts: {[id: string]: number} = {};
    allLocalDocs.forEach(d => {
      totalCounts[d.atencion_id] = (totalCounts[d.atencion_id] || 0) + 1;
      if (d.estado === 'pendiente') {
        pendingCounts[d.atencion_id] = (pendingCounts[d.atencion_id] || 0) + 1;
      }
    });

    return {
      atenciones: localAtenciones,
      examenesPendientes: newExamenesPendientes,
      totalExamenes: newTotalExamenes,
      atencionExamenes: newAtencionExamenes,
      pendingBoxes: newPendingBoxes,
      docsPendientes: pendingCounts,
      docsTotal: totalCounts,
    };
  }, [localData.atenciones, localData.atencionExamenes, localData.atencionDocumentos, localData.isLoaded, isToday, boxes]);

  // Apply derived data to state only when it changes
  useEffect(() => {
    if (!localDerived) return;
    setAtenciones(localDerived.atenciones);
    atencionesRef.current = localDerived.atenciones;
    setExamenesPendientes(localDerived.examenesPendientes);
    setTotalExamenesPorAtencion(localDerived.totalExamenes);
    setAtencionExamenes(localDerived.atencionExamenes);
    setPendingBoxes(localDerived.pendingBoxes);
    setDocsPendientes(localDerived.docsPendientes);
    setDocsTotal(localDerived.docsTotal);
  }, [localDerived]);

  // OPTIMIZACIÓN v0.0.2: Realtime inteligente - actualiza solo lo necesario
  const handleRealtimeAtencionChange = async (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const recordId = newRecord?.id || oldRecord?.id;
    const currentAtenciones = atencionesRef.current;
    
    if (!recordId) {
      await loadData();
      return;
    }

    // Si es un cambio de estado o box_id, necesitamos recargar
    if (eventType === 'UPDATE') {
      const atencion = currentAtenciones.find(a => a.id === recordId);
      const hasStatusChange = newRecord?.estado !== atencion?.estado;
      const hasBoxChange = newRecord?.box_id !== atencion?.box_id;
      
      if (hasStatusChange || hasBoxChange) {
        // Recargar todo si cambia estado o box
        await loadData();
      } else {
        // Actualizar solo el registro específico en memoria
        setAtenciones(prev => prev.map(a => 
          a.id === recordId ? { ...a, ...newRecord } : a
        ));
      }
    } else if (eventType === 'INSERT') {
      // Nueva atención: recargar para obtener datos completos con joins
      await loadData();
    } else if (eventType === 'DELETE') {
      // Eliminar de memoria
      setAtenciones(prev => prev.filter(a => a.id !== recordId));
    }
  };

  const handleRealtimeExamenChange = async (payload: any) => {
    const { new: newRecord, old: oldRecord } = payload;
    const atencionId = newRecord?.atencion_id || oldRecord?.atencion_id;
    const currentAtenciones = atencionesRef.current;
    const currentBoxes = boxesRef.current;
    const currentExamenes = examenesRef.current;
    
    if (!atencionId) {
      await loadData();
      return;
    }

    // Solo recargar los datos de exámenes para esta atención específica
    const atencion = currentAtenciones.find(a => a.id === atencionId);
    if (atencion) {
      // Recargar solo las funciones de exámenes
      await Promise.all([
        loadAllExamDataOptimized(currentAtenciones, currentBoxes, currentExamenes),
        loadTotalExamenesPorAtencion(currentAtenciones)
      ]);
    } else {
      await loadData();
    }
  };

  // Re-run dependent calculations when cached reference data arrives
  useEffect(() => {
    if (boxes.length > 0 && examenes.length > 0 && atencionesRef.current.length > 0) {
      loadAllExamDataOptimized(atencionesRef.current, boxes, examenes);
    }
  }, [boxes, examenes]);

  useEffect(() => {
    // For today, local cache is populated by useLocalSync;
    // for other dates, we still need cloud queries
    if (!isToday) {
      loadData();
    }
    
    // Realtime channels only needed for non-today views (today uses sync engine)
    if (!isToday) {
      const channel = supabase
        .channel("atenciones-changes-v2")
        .on("postgres_changes", { event: "*", schema: "public", table: "atenciones" }, handleRealtimeAtencionChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "atencion_examenes" }, handleRealtimeExamenChange)
        .on("postgres_changes", { event: "*", schema: "public", table: "pacientes" }, () => loadData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedDate, isToday]);

  // Auto-refresh only for non-today views
  useEffect(() => {
    if (isToday) return; // Today uses sync engine
    const interval = setInterval(() => { loadData(); }, 30000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const startOfDay = selectedDate
        ? new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            0,
            0,
            0,
            0
          ).toISOString()
        : null;
      const endOfDay = selectedDate
        ? new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            23,
            59,
            59,
            999
          ).toISOString()
        : null;

      let atencionesQuery = supabase
        .from("atenciones")
        .select("*, pacientes(id, nombre, rut, tipo_servicio), boxes(*)")
        .in("estado", ["en_espera", "en_atencion"])
        .order("prioridad", { ascending: false })
        .order("numero_ingreso", { ascending: true });

      if (startOfDay && endOfDay) {
        atencionesQuery = atencionesQuery.gte("fecha_ingreso", startOfDay).lte("fecha_ingreso", endOfDay);
      }

      const atencionesRes = await atencionesQuery;

      if (atencionesRes.error) throw atencionesRes.error;

      setAtenciones(atencionesRes.data || []);
      atencionesRef.current = atencionesRes.data || [];

      // Use latest cached reference data
      const currentBoxes = boxes.length > 0 ? boxes : boxesRef.current;
      const currentExamenes = examenes.length > 0 ? examenes : examenesRef.current;
      boxesRef.current = currentBoxes;
      examenesRef.current = currentExamenes;

      // Cargar datos optimizados en paralelo (consolidated single query)
      await Promise.all([
        loadAllExamDataOptimized(atencionesRes.data || [], currentBoxes, currentExamenes),
        loadDocsPendientesCount(atencionesRes.data || []),
        loadTotalExamenesPorAtencion(atencionesRes.data || [])
      ]);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    }
  };

  // FASE 7: Load document counts (pending and total) for all atenciones
  const loadDocsPendientesCount = async (atencionesData: Atencion[]) => {
    if (atencionesData.length === 0) {
      setDocsPendientes({});
      setDocsTotal({});
      return;
    }

    try {
      const atencionIds = atencionesData.map(a => a.id);
      
      // Get ALL documents for these atenciones
      const { data: docs, error } = await supabase
        .from("atencion_documentos")
        .select("atencion_id, estado")
        .in("atencion_id", atencionIds);

      if (error) throw error;

      // Group counts by atencion
      const pendingCounts: {[atencionId: string]: number} = {};
      const totalCounts: {[atencionId: string]: number} = {};
      
      (docs || []).forEach(d => {
        totalCounts[d.atencion_id] = (totalCounts[d.atencion_id] || 0) + 1;
        if (d.estado === "pendiente") {
          pendingCounts[d.atencion_id] = (pendingCounts[d.atencion_id] || 0) + 1;
        }
      });

      setDocsPendientes(pendingCounts);
      setDocsTotal(totalCounts);
    } catch (error) {
      console.error("Error loading docs pendientes:", error);
    }
  };

  // Load total exam count per atencion (to distinguish "no exams" from "all completed")
  const loadTotalExamenesPorAtencion = async (atencionesData: Atencion[]) => {
    if (atencionesData.length === 0) {
      setTotalExamenesPorAtencion({});
      return;
    }
    try {
      const atencionIds = atencionesData.map(a => a.id);
      const { data, error } = await supabase
        .from("atencion_examenes")
        .select("atencion_id")
        .in("atencion_id", atencionIds);
      if (error) throw error;
      const counts: {[id: string]: number} = {};
      atencionIds.forEach(id => { counts[id] = 0; });
      (data || []).forEach(d => { counts[d.atencion_id] = (counts[d.atencion_id] || 0) + 1; });
      setTotalExamenesPorAtencion(counts);
    } catch (error) {
      console.error("Error loading total examenes:", error);
    }
  };


  // CONSOLIDATED: Single query for all 3 exam-derived computations
  const loadAllExamDataOptimized = async (atenciones: Atencion[], boxesList: Box[], examenesList: Examen[]) => {
    if (atenciones.length === 0) {
      setExamenesPendientes({});
      setAtencionExamenes({});
      setPendingBoxes({});
      return;
    }

    try {
      const atencionIds = atenciones.map(a => a.id);
      
      // ONE single query for all pending/incomplete exams
      const { data: allExamenes, error } = await supabase
        .from("atencion_examenes")
        .select("id, atencion_id, examen_id, estado, examenes(nombre)")
        .in("atencion_id", atencionIds)
        .in("estado", ["pendiente", "incompleto"]);

      if (error) throw error;

      const newExamenesPendientes: {[id: string]: string[]} = {};
      const newAtencionExamenes: {[id: string]: AtencionExamen[]} = {};
      const newPendingBoxes: {[id: string]: string[]} = {};
      const examenesPorAtencion: {[id: string]: string[]} = {};

      atencionIds.forEach(id => {
        newExamenesPendientes[id] = [];
        newAtencionExamenes[id] = [];
        newPendingBoxes[id] = [];
        examenesPorAtencion[id] = [];
      });

      (allExamenes || []).forEach(ae => {
        // For examenesPendientes
        const examen = examenesList.find(ex => ex.id === ae.examen_id);
        const nombre = examen?.nombre || (ae as any).examenes?.nombre || "";
        if (nombre) {
          const nombreConEstado = ae.estado === "incompleto" ? `${nombre} (I)` : nombre;
          newExamenesPendientes[ae.atencion_id]?.push(nombreConEstado);
        }

        // For atencionExamenes (filtered by box for en_atencion)
        const atencion = atenciones.find(a => a.id === ae.atencion_id);
        if (atencion?.estado === "en_atencion" && atencion.box_id) {
          const box = boxesList.find(b => b.id === atencion.box_id);
          const boxExamIds = box?.box_examenes.map(be => be.examen_id) || [];
          if (boxExamIds.includes(ae.examen_id)) {
            newAtencionExamenes[ae.atencion_id].push(ae as AtencionExamen);
          }
        } else {
          newAtencionExamenes[ae.atencion_id]?.push(ae as AtencionExamen);
        }

        // For pendingBoxes
        examenesPorAtencion[ae.atencion_id]?.push(ae.examen_id);
      });

      // Calculate pending boxes from collected exam IDs
      atencionIds.forEach(atencionId => {
        const exIds = examenesPorAtencion[atencionId];
        const boxesConExamenes = boxesList.filter(box => 
          box.box_examenes.some(be => exIds.includes(be.examen_id))
        );
        newPendingBoxes[atencionId] = boxesConExamenes.map(b => b.nombre);
      });

      setExamenesPendientes(newExamenesPendientes);
      setAtencionExamenes(newAtencionExamenes);
      setPendingBoxes(newPendingBoxes);
    } catch (error) {
      console.error("Error loading exam data:", error);
      setExamenesPendientes({});
      setAtencionExamenes({});
      setPendingBoxes({});
    }
  };

  // Keep legacy names as wrappers for callers that need individual functions
  const loadPendingBoxesOptimized = async (a: Atencion[], b: Box[]) => loadAllExamDataOptimized(a, b, examenesRef.current);
  const loadAtencionExamenesOptimized = async (a: Atencion[], b: Box[]) => { /* handled by consolidated */ };
  const loadExamenesPendientesOptimized = async (a: Atencion[], e: Examen[]) => { /* handled by consolidated */ };


  const handleIniciarAtencion = async (atencionId: string) => {
    const boxId = selectedBox[atencionId];
    if (!boxId) {
      toast.error("Selecciona un box");
      return;
    }

    try {
      // Obtener los exámenes filtrados por box ANTES de actualizar
      const box = boxes.find(b => b.id === boxId);
      const boxExamIds = box?.box_examenes.map(be => be.examen_id) || [];
      const now = new Date().toISOString();

      // Intento atómico: solo pasar a en_atencion si sigue en espera y sin box
      const { data: updated, error: updateError } = await supabase
        .from("atenciones")
        .update({
          estado: "en_atencion",
          box_id: boxId,
          fecha_inicio_atencion: now,
        })
        .eq("id", atencionId)
        .eq("estado", "en_espera")
        .is("box_id", null)
        .select("id")
        .maybeSingle();

      if (updateError) throw updateError;

      // Si no se actualizó ninguna fila, otro box lo llamó antes
      if (!updated) {
        // Mostrar overlay oscuro
        setShowErrorOverlay(true);
        setTimeout(() => setShowErrorOverlay(false), 1000);
        
        // Actualizar inmediatamente la vista
        if (isToday) await syncCtx.forcePull();
        else await loadData();
        
        const { data: current } = await supabase
          .from("atenciones")
          .select("box_id, boxes(nombre), estado")
          .eq("id", atencionId)
          .single();

        if (current?.box_id) {
          toast.error(`Este paciente ya está siendo atendido en ${current.boxes?.nombre || "otro box"}`);
        } else {
          toast.error("Este paciente ya fue llamado por otro box recientemente");
        }
        return;
      }

      // Actualizar estado local inmediatamente con exámenes filtrados
      // para evitar parpadeo visual
      setAtencionExamenes(prev => {
        const currentExamenes = prev[atencionId] || [];
        const filteredExamenes = currentExamenes.filter(ae => 
          boxExamIds.includes(ae.examen_id)
        );
        return { ...prev, [atencionId]: filteredExamenes };
      });

      // Registrar visita al box
      const { error: visitaError } = await supabase.from("atencion_box_visitas").insert({
        atencion_id: atencionId,
        box_id: boxId,
      });
      if (visitaError) console.error("Error registrando visita:", visitaError);

      const pacienteNombre = atenciones.find(a => a.id === atencionId)?.pacientes.nombre;
      const boxNombre = boxes.find(b => b.id === boxId)?.nombre;
      toast.success(`🔔 Paciente ${pacienteNombre} entró a ${boxNombre}`, {
        duration: 5000,
        style: {
          fontSize: '18px',
          padding: '20px',
          fontWeight: 'bold'
        }
      });
      await logActivity("llamar_paciente", { paciente: pacienteNombre, box: boxNombre, atencion_id: atencionId }, "/flujo");
      setSelectedBox((prev) => {
        const newState = { ...prev };
        delete newState[atencionId];
        return newState;
      });

      if (isToday) {
        await localData.updateLocalAtencion(atencionId, {
          estado: "en_atencion",
          box_id: boxId,
          fecha_inicio_atencion: now,
          box_nombre: boxNombre || null,
        });
      } else {
        await loadData();
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al iniciar atención");
    }
  };


  // Solo marca/desmarca visualmente, NO guarda en BD hasta Completar/Parcial
  const handleToggleExamenLocal = (atencionExamenId: string, atencionId: string) => {
    setExamenesSeleccionados(prev => {
      const current = prev[atencionId] || new Set<string>();
      const newSet = new Set(current);
      if (newSet.has(atencionExamenId)) {
        newSet.delete(atencionExamenId);
      } else {
        newSet.add(atencionExamenId);
      }
      return { ...prev, [atencionId]: newSet };
    });
  };

  const handleCambiarEstadoFicha = async (atencionId: string, nuevoEstado: string) => {
    try {
      // Non-critical: use local + outbox when viewing today
      if (isToday) {
        await localData.updateEstadoFicha(atencionId, nuevoEstado);
      } else {
        const { error } = await supabase
          .from("atenciones")
          .update({ estado_ficha: nuevoEstado as 'pendiente' | 'en_mano_paciente' | 'completada' })
          .eq("id", atencionId);
        if (error) throw error;
      }
      
      const mensajes = {
        'en_mano_paciente': 'Ficha entregada al paciente',
        'completada': 'Ficha recibida de vuelta'
      };
      
      toast.success(mensajes[nuevoEstado as keyof typeof mensajes] || 'Estado actualizado');
      if (!isToday) await loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al actualizar estado de ficha");
    }
  };

  const handleCompletarAtencion = async (atencionId: string, estado: "completado" | "incompleto") => {
    try {
      const atencionActual = atenciones.find((a) => a.id === atencionId);
      const currentBoxId = atencionActual?.box_id;
      const seleccionados = examenesSeleccionados[atencionId] || new Set<string>();

      // Offline-first for today
      if (isToday) {
        const box = currentBoxId ? boxes.find((b) => b.id === currentBoxId) : null;
        const boxExamIds = box?.box_examenes.map((be) => be.examen_id) || [];

        if (currentBoxId && boxExamIds.length === 0) {
          toast.error("Este box no tiene exámenes asociados");
          return;
        }

        const result = await localData.completarAtencionFlujo(
          atencionId, estado, currentBoxId || null, boxExamIds,
          seleccionados, user?.id, atencionActual?.fecha_inicio_atencion,
        );

        // Clean local selection
        setExamenesSeleccionados(prev => {
          const newState = { ...prev };
          delete newState[atencionId];
          return newState;
        });

        if (result === 'devuelto_espera') {
          toast.success("Paciente devuelto a espera - tiene exámenes pendientes");
          await logActivity("devolver_espera", { atencion_id: atencionId }, "/flujo");
        } else if (result === 'listo_finalizar') {
          toast.success("Exámenes completados - paciente listo para finalizar");
          await logActivity("cambiar_estado_examen", { atencion_id: atencionId, estado: "completado_box" }, "/flujo");
        } else {
          toast.success(estado === "completado" ? "Atención completada" : "Atención marcada como incompleta");
          await logActivity(estado === "completado" ? "completar_atencion" : "incompleto_atencion", { atencion_id: atencionId, paciente: atencionActual?.pacientes.nombre }, "/flujo");
        }
        return;
      }

      // Cloud-direct for non-today dates
      if (currentBoxId) {
        const box = boxes.find((b) => b.id === currentBoxId);
        const boxExamIds = box?.box_examenes.map((be) => be.examen_id) || [];
        
        if (boxExamIds.length === 0) {
          toast.error("Este box no tiene exámenes asociados");
          return;
        }
        
        const { data: examenesDelBoxDB, error: fetchError } = await supabase
          .from("atencion_examenes")
          .select("id, examen_id, estado")
          .eq("atencion_id", atencionId)
          .in("estado", ["pendiente", "incompleto"])
          .in("examen_id", boxExamIds);

        if (fetchError) throw fetchError;
        const examenesDelBox = examenesDelBoxDB || [];

        if (estado === "completado") {
          if (examenesDelBox.length > 0) {
            const idsToComplete = examenesDelBox.map(ae => ae.id);
            const { error: updateExamsError } = await supabase
              .from("atencion_examenes")
              .update({ estado: "completado", fecha_realizacion: new Date().toISOString(), realizado_por: user?.id || null })
              .in("id", idsToComplete);
            if (updateExamsError) throw updateExamsError;
          }
        } else {
          for (const ae of examenesDelBox) {
            const nuevoEstado = seleccionados.has(ae.id) ? "completado" : "incompleto";
            const updateData: any = { estado: nuevoEstado, fecha_realizacion: nuevoEstado === "completado" ? new Date().toISOString() : null };
            if (nuevoEstado === "completado") updateData.realizado_por = user?.id || null;
            const { error } = await supabase.from("atencion_examenes").update(updateData).eq("id", ae.id);
            if (error) throw error;
          }
        }

        if (currentBoxId) {
          await supabase.from("atencion_box_visitas")
            .update({ fecha_salida: new Date().toISOString() })
            .eq("atencion_id", atencionId).eq("box_id", currentBoxId).is("fecha_salida", null);
        }
      }

      setExamenesSeleccionados(prev => { const s = { ...prev }; delete s[atencionId]; return s; });

      const { data: examenesPendientesData, error: examenesError } = await supabase
        .from("atencion_examenes").select("id")
        .eq("atencion_id", atencionId).in("estado", ["pendiente", "incompleto"]);
      if (examenesError) throw examenesError;

      if (examenesPendientesData && examenesPendientesData.length > 0) {
        const { error } = await supabase.from("atenciones").update({ estado: "en_espera", box_id: null }).eq("id", atencionId);
        if (error) throw error;
        toast.success("Paciente devuelto a espera - tiene exámenes pendientes");
        await logActivity("devolver_espera", { atencion_id: atencionId }, "/flujo");
      } else if (currentBoxId) {
        const { error } = await supabase.from("atenciones").update({ box_id: null }).eq("id", atencionId);
        if (error) throw error;
        toast.success("Exámenes completados - paciente listo para finalizar");
        await logActivity("cambiar_estado_examen", { atencion_id: atencionId, estado: "completado_box" }, "/flujo");
      } else {
        const { error } = await supabase.from("atenciones")
          .update({ estado, fecha_fin_atencion: new Date().toISOString(), fecha_inicio_atencion: atencionActual?.fecha_inicio_atencion || new Date().toISOString() })
          .eq("id", atencionId);
        if (error) throw error;
        toast.success(estado === "completado" ? "Atención completada" : "Atención marcada como incompleta");
        await logActivity(estado === "completado" ? "completar_atencion" : "incompleto_atencion", { atencion_id: atencionId, paciente: atencionActual?.pacientes.nombre }, "/flujo");
      }

      await loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al actualizar atención");
    }
  };

  // Función de refrescar manual
  const handleRefreshEnEspera = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Solo mostrar en espera los pacientes que NO tienen box asignado
  let enEspera = atenciones.filter((a) => a.estado === "en_espera" && !a.box_id);
  
  // Filtrar por box pendiente si se seleccionó uno
  if (filtroBox !== "todos") {
    enEspera = enEspera.filter((a) => 
      pendingBoxes[a.id]?.includes(boxes.find(b => b.id === filtroBox)?.nombre || "")
    );
  }
  
  // En atención: solo mostrar pacientes que tienen box asignado (están siendo atendidos activamente)
  let enAtencion = atenciones.filter((a) => a.estado === "en_atencion" && a.box_id);
  
  // Filtrar por box asignado si se seleccionó uno
  if (filtroBoxAtencion !== "todos") {
    enAtencion = enAtencion.filter((a) => a.box_id === filtroBoxAtencion);
  }

  // Pacientes listos para finalizar: en_atencion sin box_id O en_espera con exámenes asignados y todos completados
  const listosParaFinalizar = atenciones.filter((a) => {
    if (a.estado === "en_atencion" && !a.box_id) return true;
    // Pacientes en espera que ya no tienen exámenes pendientes (completados vía portal u otro medio)
    // PERO deben tener al menos 1 examen asignado (si no, aún no se les ha ingresado nada)
    if (a.estado === "en_espera") {
      const pending = examenesPendientes[a.id];
      const totalExams = totalExamenesPorAtencion[a.id] || 0;
      return pending && pending.length === 0 && totalExams > 0;
    }
    return false;
  });

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "en_espera":
        return <Badge variant="secondary" className="bg-warning/20 text-warning">En Espera</Badge>;
      case "en_atencion":
        return <Badge className="bg-info/20 text-info">En Atención</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Overlay de error */}
      {showErrorOverlay && (
        <div className="fixed inset-0 bg-black/70 z-50 animate-fade-in" />
      )}
      
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Flujo de Pacientes</h1>
              <p className="text-muted-foreground">Gestión en tiempo real del flujo de atención</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {listosParaFinalizar.length > 0 && (
          <Card className="mb-6 border-success/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-success">
                <Check className="h-5 w-5" />
                Listos para Finalizar ({listosParaFinalizar.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {listosParaFinalizar.map((atencion) => (
                  <div
                    key={atencion.id}
                    className="p-4 rounded-lg border border-success/30 bg-success/5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-bold">#{atencion.numero_ingreso}</Badge>
                          {(atencion as any).prioridad && (
                            <Badge className="bg-amber-500 text-white text-xs gap-1 py-0">
                              <Star className="h-3 w-3" /> Prioritario
                            </Badge>
                          )}
                          <span className="font-medium text-foreground">{atencion.pacientes.nombre}</span>
                          <Badge variant="outline" className="text-xs">
                            {atencion.pacientes.tipo_servicio === "workmed" ? "WM" : "J"}
                          </Badge>
                          <PresionTimerBadge timer={timerByAtencion[atencion.id]} />
                          {/* FASE 7: Document status indicator */}
                          {docsTotal[atencion.id] > 0 ? (
                            docsPendientes[atencion.id] > 0 ? (
                              <Badge variant="outline" className="text-xs border-warning text-warning gap-1">
                                <FileWarning className="h-3 w-3" />
                                {docsPendientes[atencion.id]} docs pend.
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-success text-success gap-1">
                                <Check className="h-3 w-3" />
                                Docs OK
                              </Badge>
                            )
                          ) : null}
                          {atencion.boxes && (
                            <span className="text-xs text-muted-foreground">({atencion.boxes.nombre})</span>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center gap-1 mb-1">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">Estado Ficha:</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`listo-pendiente-${atencion.id}`}
                                checked={atencion.estado_ficha === 'pendiente'}
                                onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'pendiente')}
                              />
                              <Label htmlFor={`listo-pendiente-${atencion.id}`} className="text-xs cursor-pointer">
                                Pendiente
                              </Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`listo-en_mano-${atencion.id}`}
                                checked={atencion.estado_ficha === 'en_mano_paciente'}
                                onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'en_mano_paciente')}
                              />
                              <Label htmlFor={`listo-en_mano-${atencion.id}`} className="text-xs cursor-pointer">
                                Con Paciente
                              </Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`listo-completada-${atencion.id}`}
                                checked={atencion.estado_ficha === 'completada'}
                                onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'completada')}
                              />
                              <Label htmlFor={`listo-completada-${atencion.id}`} className="text-xs cursor-pointer">
                                Recibida
                              </Label>
                            </div>
                          </div>
                        </div>
                      </div>
                      {(docsPendientes[atencion.id] || 0) > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            disabled
                            className="gap-2 bg-muted text-muted-foreground cursor-not-allowed"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Finalizar
                          </Button>
                          <span className="text-xs text-warning">
                            Faltan {docsPendientes[atencion.id]} doc(s) por firmar
                          </span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleCompletarAtencion(atencion.id, "completado")}
                          className="gap-2 bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Finalizar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}


        <AlertDialog open={confirmCompletarDialog.open} onOpenChange={(open) => setConfirmCompletarDialog({open, atencionId: null})}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Completar atención?</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Todos los exámenes de este box han sido completados? Esta acción marcará los exámenes pendientes del box actual como completados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (confirmCompletarDialog.atencionId) {
                  handleCompletarAtencion(confirmCompletarDialog.atencionId, "completado");
                }
                setConfirmCompletarDialog({open: false, atencionId: null});
              }}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-warning">En Espera ({enEspera.length})</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshEnEspera}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
              <div className="mt-3">
                <Select value={filtroBox} onValueChange={setFiltroBox}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filtrar por box pendiente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los boxes</SelectItem>
                    {boxes.map((box) => (
                      <SelectItem key={box.id} value={box.id}>
                        {box.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {enEspera.map((atencion) => (
                  <div
                    key={atencion.id}
                    className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-bold">#{atencion.numero_ingreso}</Badge>
                          {(atencion as any).prioridad && (
                            <Badge className="bg-amber-500 text-white text-xs gap-1 py-0">
                              <Star className="h-3 w-3" /> Prioritario
                            </Badge>
                          )}
                          <div className="font-medium text-foreground">
                            {atencion.pacientes.nombre}
                          </div>
                          <PresionTimerBadge timer={timerByAtencion[atencion.id]} />
                        </div>
                        {examenesPendientes[atencion.id] && examenesPendientes[atencion.id].length > 0 && atencionExamenes[atencion.id] && (
                          <Collapsible className="mt-2">
                            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <ChevronDown className="h-3 w-3" />
                              <span className="font-medium">
                                Ver exámenes pendientes ({examenesPendientes[atencion.id].length})
                              </span>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 space-y-2 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                              {(() => {
                                const examenPorBox: { [boxNombre: string]: { nombre: string; estado: string }[] } = {};
                                atencionExamenes[atencion.id]
                                  ?.filter((ae) => ae.estado === "pendiente" || ae.estado === "incompleto")
                                  .forEach((ae) => {
                                    const boxConExamen = boxes.find((box) =>
                                      box.box_examenes.some((be) => be.examen_id === ae.examen_id)
                                    );
                                    const boxNombre = boxConExamen?.nombre || "Sin box";
                                    if (!examenPorBox[boxNombre]) {
                                      examenPorBox[boxNombre] = [];
                                    }
                                    examenPorBox[boxNombre].push({ nombre: ae.examenes.nombre, estado: ae.estado });
                                  });
                                return Object.entries(examenPorBox).map(([boxNombre, examenes]) => (
                                  <div key={boxNombre} className="pl-4 border-l-2 border-primary/30">
                                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                                      {boxNombre}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {examenes.map((examen, idx) => (
                                        <Badge 
                                          key={idx} 
                                          variant={examen.estado === "incompleto" ? "outline" : "secondary"} 
                                          className={`text-xs py-0 px-2 ${examen.estado === "incompleto" ? "border-warning text-warning" : ""}`}
                                        >
                                          {examen.nombre}{examen.estado === "incompleto" ? " (I)" : ""}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                ));
                              })()}
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span>Ingreso: {atencion.fecha_ingreso ? format(new Date(atencion.fecha_ingreso), "HH:mm", { locale: es }) : "--:--"}</span>
                          <Badge variant="outline" className="text-xs">
                            {atencion.pacientes.tipo_servicio === "workmed" ? "WM" : "J"}
                          </Badge>
                          {/* FASE 7: Document status indicator */}
                          {docsTotal[atencion.id] > 0 ? (
                            docsPendientes[atencion.id] > 0 ? (
                              <Badge variant="outline" className="text-xs border-warning text-warning gap-1">
                                <FileWarning className="h-3 w-3" />
                                {docsPendientes[atencion.id]} docs pend.
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-success text-success gap-1">
                                <Check className="h-3 w-3" />
                                Docs OK
                              </Badge>
                            )
                          ) : null}
                        </div>
                        <div className="mt-2">
                          <div className="flex items-center gap-1 mb-1">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">Estado Ficha:</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`pendiente-${atencion.id}`}
                                checked={atencion.estado_ficha === 'pendiente'}
                                onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'pendiente')}
                              />
                              <Label htmlFor={`pendiente-${atencion.id}`} className="text-xs cursor-pointer">
                                Pendiente
                              </Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`en_mano-${atencion.id}`}
                                checked={atencion.estado_ficha === 'en_mano_paciente'}
                                onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'en_mano_paciente')}
                              />
                              <Label htmlFor={`en_mano-${atencion.id}`} className="text-xs cursor-pointer">
                                Con Paciente
                              </Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`completada-${atencion.id}`}
                                checked={atencion.estado_ficha === 'completada'}
                                onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'completada')}
                              />
                              <Label htmlFor={`completada-${atencion.id}`} className="text-xs cursor-pointer">
                                Recibida
                              </Label>
                            </div>
                          </div>
                        </div>
                        {pendingBoxes[atencion.id] && pendingBoxes[atencion.id].length > 0 && (
                          <div className="text-xs text-primary mt-1">
                            Boxes pendientes: {pendingBoxes[atencion.id].join(", ")}
                          </div>
                        )}
                      </div>
                      {getEstadoBadge(atencion.estado)}
                    </div>
                    
                    <div className="flex gap-2">
                      <Select 
                        value={selectedBox[atencion.id] || ""} 
                        onValueChange={(value) => setSelectedBox(prev => ({...prev, [atencion.id]: value}))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Seleccionar box" />
                        </SelectTrigger>
                        <SelectContent>
                          {boxes
                            .filter((box) => pendingBoxes[atencion.id]?.includes(box.nombre))
                            .map((box) => (
                              <SelectItem key={box.id} value={box.id}>
                                {box.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={() => handleIniciarAtencion(atencion.id)}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Llamar
                      </Button>
                    </div>
                  </div>
                ))}
              {enEspera.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay pacientes en espera
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-info">En Atención ({enAtencion.length})</CardTitle>
              <div className="mt-3">
                <Select value={filtroBoxAtencion} onValueChange={setFiltroBoxAtencion}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filtrar por box pendiente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los boxes</SelectItem>
                    {boxes.map((box) => (
                      <SelectItem key={box.id} value={box.id}>
                        {box.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {enAtencion.map((atencion) => (
                <div
                  key={atencion.id}
                  className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-bold">#{atencion.numero_ingreso}</Badge>
                        <div className="font-medium text-foreground">
                          {atencion.pacientes.nombre}
                        </div>
                        <PresionTimerBadge timer={timerByAtencion[atencion.id]} />
                      </div>
                      {examenesPendientes[atencion.id] && examenesPendientes[atencion.id].length > 0 && atencionExamenes[atencion.id] && (
                        <Collapsible className="mt-2">
                          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <ChevronDown className="h-3 w-3" />
                            <span className="font-medium">
                              Ver exámenes pendientes ({examenesPendientes[atencion.id].length})
                            </span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 space-y-2 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                            {(() => {
                              // Agrupar exámenes por box
                              const examenPorBox: { [boxNombre: string]: string[] } = {};
                              
                              atencionExamenes[atencion.id]
                                ?.filter((ae) => ae.estado === "pendiente")
                                .forEach((ae) => {
                                  // Encontrar a qué box pertenece este examen
                                  const boxConExamen = boxes.find((box) =>
                                    box.box_examenes.some((be) => be.examen_id === ae.examen_id)
                                  );
                                  const boxNombre = boxConExamen?.nombre || "Sin box";
                                  
                                  if (!examenPorBox[boxNombre]) {
                                    examenPorBox[boxNombre] = [];
                                  }
                                  examenPorBox[boxNombre].push(ae.examenes.nombre);
                                });

                              return Object.entries(examenPorBox).map(([boxNombre, examenes]) => (
                                <div key={boxNombre} className="pl-4 border-l-2 border-primary/30">
                                  <div className="text-xs font-semibold text-muted-foreground mb-1">
                                    {boxNombre}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {examenes.map((examen, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-xs py-0 px-2"
                                      >
                                        {examen}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ));
                            })()}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>Ingreso: {atencion.fecha_ingreso ? format(new Date(atencion.fecha_ingreso), "HH:mm", { locale: es }) : "--:--"}</span>
                        <Badge variant="outline" className="text-xs">
                          {atencion.pacientes.tipo_servicio === "workmed" ? "WM" : "J"}
                        </Badge>
                        {/* FASE 7: Document status indicator in En Atención */}
                        {docsTotal[atencion.id] > 0 ? (
                          docsPendientes[atencion.id] > 0 ? (
                            <Badge variant="outline" className="text-xs border-warning text-warning gap-1">
                              <FileWarning className="h-3 w-3" />
                              {docsPendientes[atencion.id]} docs pend.
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-success text-success gap-1">
                              <Check className="h-3 w-3" />
                              Docs OK
                            </Badge>
                          )
                        ) : null}
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center gap-1 mb-1">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Estado Ficha:</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Checkbox
                              id={`pendiente-aten-${atencion.id}`}
                              checked={atencion.estado_ficha === 'pendiente'}
                              onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'pendiente')}
                            />
                            <Label htmlFor={`pendiente-aten-${atencion.id}`} className="text-xs cursor-pointer">
                              Pendiente
                            </Label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Checkbox
                              id={`en_mano-aten-${atencion.id}`}
                              checked={atencion.estado_ficha === 'en_mano_paciente'}
                              onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'en_mano_paciente')}
                            />
                            <Label htmlFor={`en_mano-aten-${atencion.id}`} className="text-xs cursor-pointer">
                              Con Paciente
                            </Label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Checkbox
                              id={`completada-aten-${atencion.id}`}
                              checked={atencion.estado_ficha === 'completada'}
                              onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'completada')}
                            />
                            <Label htmlFor={`completada-aten-${atencion.id}`} className="text-xs cursor-pointer">
                              Recibida
                            </Label>
                          </div>
                        </div>
                      </div>
                      {atencion.boxes && (
                        <div className="text-sm text-primary font-medium mt-1">
                          Box: {atencion.boxes.nombre}
                        </div>
                      )}
                      {pendingBoxes[atencion.id] && pendingBoxes[atencion.id].length > 0 && (
                        <div className="text-xs text-primary mt-1">
                          Boxes pendientes: {pendingBoxes[atencion.id].join(", ")}
                        </div>
                      )}
                    </div>
                    {getEstadoBadge(atencion.estado)}
                  </div>

                  {atencionExamenes[atencion.id] && atencionExamenes[atencion.id].length > 0 && (
                    <div className="mb-3 p-3 bg-muted/50 rounded-md">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        Exámenes de este box:
                      </div>
                      <div className="space-y-2">
                        {atencionExamenes[atencion.id].map((ae) => {
                          const isSelected = examenesSeleccionados[atencion.id]?.has(ae.id) || false;
                          return (
                            <div key={ae.id} className="flex items-center gap-2">
                              <Checkbox
                                id={ae.id}
                                checked={isSelected}
                                onCheckedChange={() => handleToggleExamenLocal(ae.id, atencion.id)}
                              />
                              <Label htmlFor={ae.id} className="text-sm cursor-pointer flex-1">
                                {ae.examenes.nombre}
                              </Label>
                              <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                                {isSelected ? "✓" : "○"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setConfirmCompletarDialog({open: true, atencionId: atencion.id})}
                      className="flex-1 gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Completar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompletarAtencion(atencion.id, "incompleto")}
                      className="flex-1 gap-2 border-warning text-warning hover:bg-warning/10"
                    >
                      <XCircle className="h-4 w-4" />
                      Parcial
                    </Button>
                  </div>
                </div>
              ))}
              
              {enAtencion.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay pacientes en atención
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Versión */}
      <div className="fixed bottom-2 right-16 text-xs text-muted-foreground/50">
        Flujo v0.0.2
      </div>
      
      {/* Chat Global */}
      <GlobalChat selectedDate={selectedDate} />
    </div>
  );
};

export default Flujo;
