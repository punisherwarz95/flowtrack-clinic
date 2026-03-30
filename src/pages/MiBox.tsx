import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import CodigoDelDia from "@/components/CodigoDelDia";
import { Clock, Play, CheckCircle, XCircle, RefreshCw, Box as BoxIcon, Settings, ClipboardList, Users, UserCheck, UsersRound } from "lucide-react";
import { logActivity } from "@/lib/activityLog";
import { Badge } from "@/components/ui/badge";
import EstadoFichaCheckboxes from "@/components/EstadoFichaCheckboxes";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useAuthContext } from "@/contexts/AuthContext";
import { GlobalChat } from "@/components/GlobalChat";
import { useAtencionDocumentos } from "@/hooks/useAtencionDocumentos";
import { usePresionTimers } from "@/hooks/usePresionTimers";
import { DocumentoFormViewer, DocumentoContextData } from "@/components/DocumentoFormViewer";
import ExamenResultadosOtrosBoxes from "@/components/ExamenResultadosOtrosBoxes";
import ExamenPrestadorGroup from "@/components/ExamenPrestadorGroup";
import PresionTimerBadge from "@/components/PresionTimerBadge";
import PresionRetakeForm from "@/components/PresionRetakeForm";
import { useBoxes } from "@/hooks/useReferenceData";
import { useLocalAtenciones } from "@/hooks/useLocalAtenciones";
import { useSyncContext } from "@/contexts/SyncContext";

interface Atencion {
  id: string;
  estado: string;
  fecha_ingreso: string;
  numero_ingreso: number;
  box_id: string | null;
  estado_ficha: string;
  pacientes: {
    id: string;
    nombre: string;
    rut: string;
    tipo_servicio: string;
    fecha_nacimiento?: string | null;
    email?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    empresa_id?: string | null;
    empresas?: { nombre: string } | null;
  };
}

interface AtencionConExamenes extends Atencion {
  examenesRealizados?: string[];
  examenesPendientes?: string[];
}

const PACIENTE_SELECT = "*, pacientes(id, nombre, rut, tipo_servicio, fecha_nacimiento, email, telefono, direccion, empresa_id, empresas(nombre))";

interface AtencionExamen {
  id: string;
  examen_id: string;
  estado: string;
  examenes: { nombre: string };
}

interface Box {
  id: string;
  nombre: string;
  box_examenes: Array<{ examen_id: string }>;
}

const STORAGE_KEY = "mediflow_selected_box";
const CALL_MODE_KEY = "mediflow_call_mode"; // "single" or "multi"
const MiBox = () => {
  const { user } = useAuth();
  const { isAdmin } = useAuthContext();
  const { data: cachedBoxes = [] } = useBoxes();
  const boxes = cachedBoxes as Box[];
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [showBoxSelector, setShowBoxSelector] = useState(false);
  const [tempSelectedBox, setTempSelectedBox] = useState<string>("");
  const [activeTab, setActiveTab] = useState("cola");
  const [callMode, setCallMode] = useState<"single" | "multi">(() => {
    return (localStorage.getItem(CALL_MODE_KEY) as "single" | "multi") || "single";
  });
  const [pacientesEnEspera, setPacientesEnEspera] = useState<AtencionConExamenes[]>([]);
  const [pacientesEnAtencion, setPacientesEnAtencion] = useState<Atencion[]>([]);
  const [pacientesCompletados, setPacientesCompletados] = useState<AtencionConExamenes[]>([]);
  const [pacientesEnOtrosBoxes, setPacientesEnOtrosBoxes] = useState<number>(0);

  const [atencionExamenes, setAtencionExamenes] = useState<{ [atencionId: string]: AtencionExamen[] }>({});
  const [confirmCompletarDialog, setConfirmCompletarDialog] = useState<{ open: boolean; atencionId: string | null }>({ open: false, atencionId: null });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);

  // Paciente seleccionado para atención
  const [selectedAtencion, setSelectedAtencion] = useState<Atencion | null>(null);
  const [expandedExamen, setExpandedExamen] = useState<string | null>(null);

  // Documentos
  const [documentosDialogOpen, setDocumentosDialogOpen] = useState(false);
  const [selectedAtencionForDocs, setSelectedAtencionForDocs] = useState<string | null>(null);
  const [selectedPacienteContext, setSelectedPacienteContext] = useState<DocumentoContextData | undefined>(undefined);

  const atencionesConTemporizador = useMemo(
    () => [...pacientesEnEspera, ...pacientesEnAtencion, ...pacientesCompletados].map((a) => a.id),
    [pacientesEnEspera, pacientesEnAtencion, pacientesCompletados]
  );
  const { timerByAtencion, reloadTimers } = usePresionTimers(atencionesConTemporizador);

  const {
    documentos: atencionDocumentos,
    campos: documentoCampos,
    reload: reloadDocumentos,
    pendingCount: documentosPendientes,
  } = useAtencionDocumentos(selectedAtencionForDocs);

  // ── Offline-first data ──────────────────────────────────────────────
  const localData = useLocalAtenciones();
  const syncCtx = useSyncContext();

  useEffect(() => {
    const savedBox = localStorage.getItem(STORAGE_KEY);
    if (savedBox) setSelectedBoxId(savedBox);
    else setShowBoxSelector(true);
  }, []);

  // ── Populate from local cache ─────────────────────────────────────
  useEffect(() => {
    if (!selectedBoxId || !localData.isLoaded || boxes.length === 0) return;

    const cachedBox = boxes.find(b => b.id === selectedBoxId);
    const boxExamIds = cachedBox?.box_examenes?.map(be => be.examen_id) || [];

    // En atencion: assigned to this box
    const enAtencionLocal = localData.atenciones
      .filter(a => a.estado === 'en_atencion' && a.box_id === selectedBoxId)
      .sort((a, b) => (a.numero_ingreso || 0) - (b.numero_ingreso || 0))
      .map(la => ({
        id: la.id,
        estado: la.estado,
        fecha_ingreso: la.fecha_ingreso,
        numero_ingreso: la.numero_ingreso || 0,
        box_id: la.box_id,
        estado_ficha: la.estado_ficha,
        pacientes: {
          id: la.paciente_id,
          nombre: la.paciente_nombre || '',
          rut: la.paciente_rut || '',
          tipo_servicio: la.paciente_tipo_servicio || '',
          fecha_nacimiento: la.paciente_fecha_nacimiento,
          email: la.paciente_email,
          telefono: la.paciente_telefono,
          direccion: la.paciente_direccion,
          empresa_id: la.paciente_empresa_id,
          empresas: la.paciente_empresa_nombre ? { nombre: la.paciente_empresa_nombre } : null,
        },
      } as Atencion));
    setPacientesEnAtencion(enAtencionLocal);

    if (boxExamIds.length === 0) {
      setPacientesEnEspera([]);
      setPacientesEnOtrosBoxes(0);
      setPacientesCompletados([]);
      return;
    }

    // En espera: have pending exams for this box
    const enEsperaLocal: AtencionConExamenes[] = [];
    const completadosLocal: AtencionConExamenes[] = [];
    let otrosBoxesCount = 0;

    localData.atenciones.forEach(la => {
      const exams = localData.atencionExamenes.filter(ae => 
        ae.atencion_id === la.id && boxExamIds.includes(ae.examen_id)
      );

      const atencionMapped: any = {
        id: la.id,
        estado: la.estado,
        fecha_ingreso: la.fecha_ingreso,
        numero_ingreso: la.numero_ingreso || 0,
        box_id: la.box_id,
        estado_ficha: la.estado_ficha,
        pacientes: {
          id: la.paciente_id,
          nombre: la.paciente_nombre || '',
          rut: la.paciente_rut || '',
          tipo_servicio: la.paciente_tipo_servicio || '',
          fecha_nacimiento: la.paciente_fecha_nacimiento,
          email: la.paciente_email,
          telefono: la.paciente_telefono,
          direccion: la.paciente_direccion,
          empresa_id: la.paciente_empresa_id,
          empresas: la.paciente_empresa_nombre ? { nombre: la.paciente_empresa_nombre } : null,
        },
      };

      if (la.estado === 'en_espera') {
        const pending = exams.filter(e => e.estado === 'pendiente' || e.estado === 'incompleto');
        if (pending.length > 0) {
          enEsperaLocal.push({
            ...atencionMapped,
            examenesPendientes: pending.map(e => e.examen_nombre || ''),
          });
        }
      }

      // Completados
      const completed = exams.filter(e => e.estado === 'completado' || e.estado === 'muestra_tomada');
      if (completed.length > 0) {
        completadosLocal.push({
          ...atencionMapped,
          examenesRealizados: completed.map(e => e.examen_nombre || ''),
        });
      }

      // Otros boxes
      if (la.estado === 'en_atencion' && la.box_id && la.box_id !== selectedBoxId) {
        const pendingInOtherBox = exams.filter(e => e.estado === 'pendiente' || e.estado === 'incompleto');
        if (pendingInOtherBox.length > 0) otrosBoxesCount++;
      }
    });

    enEsperaLocal.sort((a, b) => (a.numero_ingreso || 0) - (b.numero_ingreso || 0));
    setPacientesEnEspera(enEsperaLocal);
    setPacientesCompletados(completadosLocal);
    setPacientesEnOtrosBoxes(otrosBoxesCount);

    // Atencion examenes for detail view
    const newAE: Record<string, AtencionExamen[]> = {};
    enAtencionLocal.forEach(a => {
      newAE[a.id] = localData.atencionExamenes
        .filter(ae => ae.atencion_id === a.id && boxExamIds.includes(ae.examen_id))
        .map(ae => ({
          id: ae.id,
          examen_id: ae.examen_id,
          estado: ae.estado,
          examenes: { nombre: ae.examen_nombre || '' },
        }));
    });
    setAtencionExamenes(prev => ({ ...prev, ...newAE }));
  }, [localData.atenciones, localData.atencionExamenes, localData.isLoaded, selectedBoxId, boxes]);

  useEffect(() => {
    if (selectedBoxId) {
      // Still do an initial cloud load as fallback + for data not in cache
      loadData();
      // Realtime as sync trigger (sync engine also handles this)
      const channel = supabase
        .channel("mibox-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "atenciones" }, () => syncCtx.forcePull())
        .on("postgres_changes", { event: "*", schema: "public", table: "atencion_examenes" }, () => syncCtx.forcePull())
        .subscribe();
      // Remove the 10s polling - sync engine handles it
      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedBoxId]);

  // loadBoxes is no longer needed - boxes come from useBoxes() cache

  const loadData = async () => {
    if (!selectedBoxId) return;
    try {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

      // Get box exam IDs - use cached or fetch
      let boxExamIds: string[] = [];
      const cachedBox = boxes.find(b => b.id === selectedBoxId);
      if (cachedBox) {
        boxExamIds = cachedBox.box_examenes?.map((be) => be.examen_id) || [];
      } else {
        const { data: boxData } = await supabase.from("boxes").select("*, box_examenes(examen_id)").eq("id", selectedBoxId).single();
        boxExamIds = boxData?.box_examenes?.map((be: { examen_id: string }) => be.examen_id) || [];
      }

      // Fetch all today's atenciones in ONE query
      const [enAtencionRes, esperaRes, todasRes] = await Promise.all([
        supabase.from("atenciones").select(PACIENTE_SELECT)
          .eq("estado", "en_atencion").eq("box_id", selectedBoxId)
          .gte("fecha_ingreso", startOfDay.toISOString()).lte("fecha_ingreso", endOfDay.toISOString())
          .order("numero_ingreso", { ascending: true }),
        boxExamIds.length > 0
          ? supabase.from("atenciones").select(PACIENTE_SELECT)
              .eq("estado", "en_espera")
              .gte("fecha_ingreso", startOfDay.toISOString()).lte("fecha_ingreso", endOfDay.toISOString())
              .order("numero_ingreso", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      boxExamIds.length > 0
          ? supabase.from("atenciones").select(PACIENTE_SELECT)
              .gte("fecha_ingreso", startOfDay.toISOString()).lte("fecha_ingreso", endOfDay.toISOString())
              .order("numero_ingreso", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (enAtencionRes.error) throw enAtencionRes.error;
      const enAtencionData = enAtencionRes.data || [];
      setPacientesEnAtencion(enAtencionData);

      if (boxExamIds.length === 0) {
        setPacientesEnEspera([]);
        setPacientesEnOtrosBoxes(0);
        setPacientesCompletados([]);
        return;
      }

      // Collect ALL atencion IDs from espera + todas + en_atencion
      const esperaData = esperaRes.data || [];
      const todasData = todasRes.data || [];
      const allAtencionIds = [
        ...esperaData.map(a => a.id),
        ...todasData.map(a => a.id),
        ...enAtencionData.map(a => a.id),
      ];
      const uniqueIds = [...new Set(allAtencionIds)];

      // ONE batch query for ALL atencion_examenes
      let allExamenes: any[] = [];
      if (uniqueIds.length > 0) {
        // Batch in chunks of 100 to avoid URL length limits
        for (let i = 0; i < uniqueIds.length; i += 100) {
          const chunk = uniqueIds.slice(i, i + 100);
          const { data } = await supabase
            .from("atencion_examenes").select("id, atencion_id, examen_id, estado, examenes(nombre)")
            .in("atencion_id", chunk)
            .in("examen_id", boxExamIds);
          if (data) allExamenes = allExamenes.concat(data);
        }
      }

      // Index by atencion_id for fast lookup
      const examenesByAtencion: Record<string, any[]> = {};
      for (const ex of allExamenes) {
        if (!examenesByAtencion[ex.atencion_id]) examenesByAtencion[ex.atencion_id] = [];
        examenesByAtencion[ex.atencion_id].push(ex);
      }

      // En espera: filter those with pending exams for this box
      const pacientesConExamenesBox: AtencionConExamenes[] = [];
      for (const atencion of esperaData) {
        const exams = (examenesByAtencion[atencion.id] || []).filter(
          (e: any) => e.estado === "pendiente" || e.estado === "incompleto"
        );
        if (exams.length > 0) {
          pacientesConExamenesBox.push({
            ...atencion,
            examenesPendientes: exams.map((e: any) => e.examenes?.nombre || ""),
          });
        }
      }
      setPacientesEnEspera(pacientesConExamenesBox);

      // Otros boxes count - fetch in parallel
      const { data: enOtrosBoxesData } = await supabase
        .from("atenciones").select("id")
        .eq("estado", "en_atencion").neq("box_id", selectedBoxId).not("box_id", "is", null)
        .gte("fecha_ingreso", startOfDay.toISOString()).lte("fecha_ingreso", endOfDay.toISOString());

      let countEnOtrosBoxes = 0;
      if (enOtrosBoxesData) {
        // We already have exams data, but these atenciones may not be in our batch
        const otrosIds = enOtrosBoxesData.map(a => a.id).filter(id => !examenesByAtencion[id]);
        let otrosExamenes: any[] = [];
        for (let i = 0; i < otrosIds.length; i += 100) {
          const chunk = otrosIds.slice(i, i + 100);
          const { data } = await supabase
            .from("atencion_examenes").select("id, atencion_id")
            .in("atencion_id", chunk)
            .in("examen_id", boxExamIds)
            .in("estado", ["pendiente", "incompleto"]);
          if (data) otrosExamenes = otrosExamenes.concat(data);
        }
        const otrosSet = new Set(otrosExamenes.map(e => e.atencion_id));
        // Also check already-fetched data
        for (const a of enOtrosBoxesData) {
          if (otrosSet.has(a.id)) { countEnOtrosBoxes++; continue; }
          const cached = examenesByAtencion[a.id];
          if (cached && cached.some((e: any) => e.estado === "pendiente" || e.estado === "incompleto")) {
            countEnOtrosBoxes++;
          }
        }
      }
      setPacientesEnOtrosBoxes(countEnOtrosBoxes);

      // Completados hoy
      const pacientesAtendidosBox: AtencionConExamenes[] = [];
      for (const atencion of todasData) {
        const exams = (examenesByAtencion[atencion.id] || []).filter((e: any) => e.estado === "completado" || e.estado === "muestra_tomada");
        if (exams.length > 0) {
          pacientesAtendidosBox.push({
            ...atencion,
            examenesRealizados: exams.map((e: any) => e.examenes?.nombre || ""),
          });
        }
      }
      setPacientesCompletados(pacientesAtendidosBox);

      // Exámenes para pacientes en atención (already in examenesByAtencion)
      const newAtencionExamenes: Record<string, AtencionExamen[]> = {};
      for (const atencion of enAtencionData) {
        newAtencionExamenes[atencion.id] = (examenesByAtencion[atencion.id] || []).map((e: any) => ({
          id: e.id,
          examen_id: e.examen_id,
          estado: e.estado,
          examenes: e.examenes,
        }));
      }
      setAtencionExamenes(prev => ({ ...prev, ...newAtencionExamenes }));

    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    }
  };

  const loadAtencionExamenes = async (atencionId: string, boxExamIds: string[]) => {
    const { data } = await supabase
      .from("atencion_examenes").select("id, examen_id, estado, examenes(nombre)")
      .eq("atencion_id", atencionId).in("examen_id", boxExamIds);
    setAtencionExamenes((prev) => ({ ...prev, [atencionId]: data || [] }));
  };

  const handleSelectBox = () => {
    if (!tempSelectedBox) { toast.error("Selecciona un box"); return; }
    localStorage.setItem(STORAGE_KEY, tempSelectedBox);
    setSelectedBoxId(tempSelectedBox);
    setShowBoxSelector(false);
    toast.success(`Registrado en ${boxes.find((b) => b.id === tempSelectedBox)?.nombre}`);
    logActivity("seleccionar_box", { box: boxes.find((b) => b.id === tempSelectedBox)?.nombre }, "/mi-box");
  };

  const handleLlamarPaciente = async (atencionId: string) => {
    const paciente = pacientesEnEspera.find((p) => p.id === atencionId);
    
    // Optimistic UI: move patient from espera to atencion immediately
    if (paciente) {
      setPacientesEnEspera(prev => prev.filter(p => p.id !== atencionId));
      setPacientesEnAtencion(prev => [...prev, { ...paciente, estado: "en_atencion", box_id: selectedBoxId }]);
      setSelectedAtencion({ ...paciente, estado: "en_atencion", box_id: selectedBoxId });
      if (callMode === "single") {
        setActiveTab("atencion");
      }
    }

    try {
      const { data: updated, error } = await supabase
        .from("atenciones")
        .update({ estado: "en_atencion", box_id: selectedBoxId, fecha_inicio_atencion: new Date().toISOString() })
        .eq("id", atencionId).eq("estado", "en_espera").is("box_id", null)
        .select("id").maybeSingle();
      if (error) throw error;
      if (!updated) {
        setShowErrorOverlay(true);
        setTimeout(() => setShowErrorOverlay(false), 1000);
        toast.error("Este paciente ya fue llamado por otro box");
        // Revert optimistic update
        await loadData();
        return;
      }
      await supabase.from("atencion_box_visitas").insert({ atencion_id: atencionId, box_id: selectedBoxId! });
      
      toast.success(`🔔 Paciente ${paciente?.pacientes.nombre} entró al box`, {
        duration: 5000,
        style: { fontSize: "18px", padding: "20px", fontWeight: "bold" },
      });
      logActivity("llamar_paciente", { paciente: paciente?.pacientes.nombre, atencion_id: atencionId, box: currentBox?.nombre }, "/mi-box");

      // Background refresh to sync all data
      loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al llamar paciente");
      loadData(); // Revert on error
    }
  };

  const handleCompletarAtencion = async (atencionId: string, estado: "completado" | "incompleto") => {
    // Optimistic UI: remove from atencion immediately
    setPacientesEnAtencion(prev => prev.filter(p => p.id !== atencionId));
    setSelectedAtencion(null);
    setExpandedExamen(null);
    setConfirmCompletarDialog({ open: false, atencionId: null });
    setActiveTab("cola");

    try {
      const currentBox = boxes.find((b) => b.id === selectedBoxId);
      const boxExamIds = currentBox?.box_examenes.map((be) => be.examen_id) || [];

      if (estado === "completado" && boxExamIds.length > 0) {
        await supabase
          .from("atencion_examenes")
          .update({ estado: "completado", fecha_realizacion: new Date().toISOString(), realizado_por: user?.id || null })
          .eq("atencion_id", atencionId).in("examen_id", boxExamIds).in("estado", ["pendiente", "incompleto"]);
      }

      if (selectedBoxId) {
        await supabase
          .from("atencion_box_visitas")
          .update({ fecha_salida: new Date().toISOString() })
          .eq("atencion_id", atencionId).eq("box_id", selectedBoxId).is("fecha_salida", null);
      }

      const { data: examenesPendientesData } = await supabase
        .from("atencion_examenes").select("id")
        .eq("atencion_id", atencionId).in("estado", ["pendiente", "incompleto"]);

      if (examenesPendientesData && examenesPendientesData.length > 0) {
        await supabase.from("atenciones").update({ estado: "en_espera", box_id: null }).eq("id", atencionId);
        toast.success("Paciente devuelto a espera - tiene exámenes pendientes");
        logActivity("devolver_espera_box", { atencion_id: atencionId }, "/mi-box");
      } else {
        await supabase.from("atenciones").update({ box_id: null }).eq("id", atencionId);
        toast.success("Exámenes completados - paciente listo para finalizar en Flujo");
        logActivity("completar_box", { atencion_id: atencionId }, "/mi-box");
      }

      // Background refresh
      loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al completar atención");
      loadData(); // Revert
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const currentBox = boxes.find((b) => b.id === selectedBoxId);

  // Auto-select first patient in atencion when switching to atencion tab
  useEffect(() => {
    if (activeTab === "atencion" && pacientesEnAtencion.length > 0 && !selectedAtencion) {
      setSelectedAtencion(pacientesEnAtencion[0]);
    }
  }, [activeTab, pacientesEnAtencion]);

  const calcularEdad = (fechaNacimiento?: string | null) => {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {showErrorOverlay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="text-destructive-foreground text-xl font-bold bg-destructive px-8 py-4 rounded-lg">
            Paciente ya fue llamado
          </div>
        </div>
      )}

      {/* Dialog seleccionar box */}
      <Dialog open={showBoxSelector} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BoxIcon className="h-5 w-5" /> Seleccionar Box de Trabajo
            </DialogTitle>
            <DialogDescription>Selecciona el box en el que trabajarás.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={tempSelectedBox} onValueChange={setTempSelectedBox}>
              <SelectTrigger><SelectValue placeholder="Selecciona un box..." /></SelectTrigger>
              <SelectContent>
                {boxes.map((box) => (
                  <SelectItem key={box.id} value={box.id}>{box.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSelectBox} className="w-full">Confirmar Box</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm completar dialog */}
      <AlertDialog open={confirmCompletarDialog.open} onOpenChange={(open) => setConfirmCompletarDialog({ open, atencionId: confirmCompletarDialog.atencionId })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Completar atención?</AlertDialogTitle>
            <AlertDialogDescription>Todos los exámenes de este box serán marcados como completados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmCompletarDialog.atencionId && handleCompletarAtencion(confirmCompletarDialog.atencionId, "completado")}>
              Completar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mi Box</h1>
            {currentBox && (
              <p className="text-muted-foreground mt-1">
                Trabajando en: <span className="font-semibold text-primary">{currentBox.nombre}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selectedBoxId && (
              <div className="flex gap-2">
                <Badge variant="default" className="text-sm px-3 py-1">{pacientesEnEspera.length} disponibles</Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">{pacientesCompletados.length} atendidos</Badge>
                {pacientesEnOtrosBoxes > 0 && (
                  <Badge variant="outline" className="text-sm px-3 py-1">{pacientesEnOtrosBoxes} en otros boxes</Badge>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
              <UsersRound className={`h-4 w-4 ${callMode === "multi" ? "text-primary" : "text-muted-foreground"}`} />
              <Switch
                checked={callMode === "single"}
                onCheckedChange={(checked) => {
                  const mode = checked ? "single" : "multi";
                  setCallMode(mode);
                  localStorage.setItem(CALL_MODE_KEY, mode);
                }}
              />
              <UserCheck className={`h-4 w-4 ${callMode === "single" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {callMode === "single" ? "1 paciente" : "Múltiples"}
              </span>
            </div>
            {isAdmin && selectedBoxId && (
              <Button variant="outline" size="sm" onClick={() => { setTempSelectedBox(selectedBoxId); setShowBoxSelector(true); }}>
                <Settings className="h-4 w-4 mr-2" /> Cambiar Box
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} /> Actualizar
            </Button>
          </div>
        </div>

        {selectedBoxId && <CodigoDelDia className="mb-4" />}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
            <TabsTrigger value="cola" className="gap-2">
              <Users className="h-4 w-4" />
              Cola ({pacientesEnEspera.length})
            </TabsTrigger>
            <TabsTrigger value="atencion" className="gap-2" disabled={pacientesEnAtencion.length === 0 && !selectedAtencion}>
              <Play className="h-4 w-4" />
              Atención ({pacientesEnAtencion.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Cola de Pacientes */}
          <TabsContent value="cola" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* En espera */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    Pacientes Disponibles ({pacientesEnEspera.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {pacientesEnEspera.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No hay pacientes en espera para este box</p>
                  ) : (
                    pacientesEnEspera.map((atencion) => (
                      <div key={atencion.id} className="border rounded-lg p-3 flex items-center justify-between hover:bg-accent/30 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs font-bold">#{atencion.numero_ingreso}</Badge>
                            <span className="font-medium text-sm">{atencion.pacientes.nombre}</span>
                            {atencion.pacientes.rut && (
                              <span className="text-xs text-muted-foreground font-mono">{atencion.pacientes.rut}</span>
                            )}
                            <Badge variant={atencion.pacientes.tipo_servicio === "workmed" ? "default" : "secondary"} className="text-xs">
                              {atencion.pacientes.tipo_servicio}
                            </Badge>
                            {atencion.pacientes.empresas?.nombre && (
                              <span className="text-xs text-muted-foreground">| {atencion.pacientes.empresas.nombre}</span>
                            )}
                            {atencion.pacientes.fecha_nacimiento && (
                              <span className="text-xs text-muted-foreground">| {new Date(atencion.pacientes.fecha_nacimiento + 'T12:00:00').toLocaleDateString('es-CL')} ({calcularEdad(atencion.pacientes.fecha_nacimiento)} años)</span>
                            )}
                            <PresionTimerBadge timer={timerByAtencion[atencion.id]} />
                          </div>
                          <div className="mt-1">
                            <EstadoFichaCheckboxes atencionId={atencion.id} estadoFicha={atencion.estado_ficha} onUpdate={loadData} prefix="cola-" />
                          </div>
                          {atencion.examenesPendientes && atencion.examenesPendientes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {atencion.examenesPendientes.map((examen, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{examen}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button size="sm" onClick={() => handleLlamarPaciente(atencion.id)}>
                          <Play className="h-4 w-4 mr-1" /> Llamar
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Atendidos hoy */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Atendidos Hoy ({pacientesCompletados.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {pacientesCompletados.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No hay pacientes atendidos aún</p>
                  ) : (
                    pacientesCompletados.map((atencion) => (
                      <div key={atencion.id} className="border rounded-lg p-2 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs font-bold">#{atencion.numero_ingreso}</Badge>
                          <span className="font-medium text-xs">{atencion.pacientes.nombre}</span>
                          {atencion.pacientes.rut && (
                            <span className="text-xs text-muted-foreground font-mono">{atencion.pacientes.rut}</span>
                          )}
                          <Badge variant={atencion.pacientes.tipo_servicio === "workmed" ? "default" : "secondary"} className="text-xs">
                            {atencion.pacientes.tipo_servicio}
                          </Badge>
                          {atencion.pacientes.empresas?.nombre && (
                            <span className="text-xs text-muted-foreground">| {atencion.pacientes.empresas.nombre}</span>
                          )}
                          {atencion.pacientes.fecha_nacimiento && (
                            <span className="text-xs text-muted-foreground">| {calcularEdad(atencion.pacientes.fecha_nacimiento)} años</span>
                          )}
                          <PresionTimerBadge timer={timerByAtencion[atencion.id]} />
                        </div>
                        <EstadoFichaCheckboxes atencionId={atencion.id} estadoFicha={atencion.estado_ficha} onUpdate={loadData} prefix="done-" />
                        {atencion.examenesRealizados && (
                          <div className="flex flex-wrap gap-1">
                            {atencion.examenesRealizados.map((examen, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">✓ {examen}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: Atención */}
          <TabsContent value="atencion" className="mt-4">
            {pacientesEnAtencion.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No hay pacientes en atención. Llame a un paciente desde la Cola.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Patient selector if multiple in atencion */}
                {pacientesEnAtencion.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {pacientesEnAtencion.map((p) => (
                      <Button
                        key={p.id}
                        variant={selectedAtencion?.id === p.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setSelectedAtencion(p); setExpandedExamen(null); }}
                      >
                        #{p.numero_ingreso} {p.pacientes.nombre}
                      </Button>
                    ))}
                  </div>
                )}

                {selectedAtencion && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Patient info + exams */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Patient header */}
                      <Card>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <Badge variant="outline">#{selectedAtencion.numero_ingreso}</Badge>
                                  <h2 className="text-xl font-bold">{selectedAtencion.pacientes.nombre}</h2>
                                  <PresionTimerBadge timer={timerByAtencion[selectedAtencion.id]} />
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                  {selectedAtencion.pacientes.rut && <span>RUT: {selectedAtencion.pacientes.rut}</span>}
                                  {selectedAtencion.pacientes.fecha_nacimiento && (
                                    <span>Edad: {calcularEdad(selectedAtencion.pacientes.fecha_nacimiento)} años</span>
                                  )}
                                  {selectedAtencion.pacientes.empresas?.nombre && (
                                    <span>Empresa: {selectedAtencion.pacientes.empresas.nombre}</span>
                                  )}
                                </div>
                                <Badge variant={selectedAtencion.pacientes.tipo_servicio === "workmed" ? "default" : "secondary"}>
                                  {selectedAtencion.pacientes.tipo_servicio}
                                </Badge>
                                <EstadoFichaCheckboxes atencionId={selectedAtencion.id} estadoFicha={selectedAtencion.estado_ficha} onUpdate={loadData} prefix="aten-" />
                              </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAtencionForDocs(selectedAtencion.id);
                                  setSelectedPacienteContext({
                                    paciente: {
                                      nombre: selectedAtencion.pacientes.nombre,
                                      rut: selectedAtencion.pacientes.rut || undefined,
                                      fecha_nacimiento: selectedAtencion.pacientes.fecha_nacimiento || undefined,
                                      email: selectedAtencion.pacientes.email || undefined,
                                      telefono: selectedAtencion.pacientes.telefono || undefined,
                                      direccion: selectedAtencion.pacientes.direccion || undefined,
                                    },
                                    empresa: selectedAtencion.pacientes.empresas?.nombre,
                                    numero_ingreso: selectedAtencion.numero_ingreso,
                                  });
                                  setDocumentosDialogOpen(true);
                                }}
                              >
                                <ClipboardList className="h-4 w-4 mr-2" /> Documentos
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Pressure retake form if timer active */}
                      {timerByAtencion[selectedAtencion.id] && (
                        <PresionRetakeForm
                          atencionId={selectedAtencion.id}
                          timer={timerByAtencion[selectedAtencion.id]}
                          onSaved={() => {
                            reloadTimers();
                            loadData();
                          }}
                        />
                      )}

                      {/* Exams grouped by prestador */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Exámenes de este Box</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ExamenPrestadorGroup
                            atencionId={selectedAtencion.id}
                            atencionExamenes={atencionExamenes[selectedAtencion.id] || []}
                            fechaNacimiento={selectedAtencion.pacientes.fecha_nacimiento}
                            onComplete={() => {
                              loadData();
                              const boxExamIds = currentBox?.box_examenes.map(be => be.examen_id) || [];
                              loadAtencionExamenes(selectedAtencion.id, boxExamIds);
                            }}
                          />
                        </CardContent>
                      </Card>

                      {/* Datos de otros boxes */}
                      {selectedBoxId && (
                        <Card>
                          <CardContent className="pt-4">
                            <ExamenResultadosOtrosBoxes
                              atencionId={selectedAtencion.id}
                              currentBoxId={selectedBoxId}
                            />
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Action panel */}
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Acciones</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => handleCompletarAtencion(selectedAtencion.id, "incompleto")}
                          >
                            <XCircle className="h-4 w-4" /> Liberar Paciente
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Other patients in atencion quick list */}
                      {pacientesEnAtencion.length > 1 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-muted-foreground">Otros en atención</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {pacientesEnAtencion
                              .filter((p) => p.id !== selectedAtencion.id)
                              .map((p) => (
                                <Button
                                  key={p.id}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start"
                                  onClick={() => { setSelectedAtencion(p); setExpandedExamen(null); }}
                                >
                                  #{p.numero_ingreso} {p.pacientes.nombre}
                                </Button>
                              ))}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <GlobalChat />

      {/* Dialog documentos */}
      <Dialog open={documentosDialogOpen} onOpenChange={setDocumentosDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" /> Documentos del Paciente
            </DialogTitle>
            <DialogDescription>
              {documentosPendientes > 0
                ? `${documentosPendientes} documento(s) pendiente(s)`
                : "Todos los documentos están completos"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {atencionDocumentos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay documentos asignados</p>
              ) : (
                atencionDocumentos.map((doc) => (
                  <DocumentoFormViewer
                    key={doc.id}
                    atencionDocumento={doc}
                    campos={documentoCampos[doc.documento_id] || []}
                    readonly
                    onComplete={reloadDocumentos}
                    contextData={selectedPacienteContext}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MiBox;
