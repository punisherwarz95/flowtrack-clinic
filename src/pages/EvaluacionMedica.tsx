import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Stethoscope, AlertTriangle, FileText, RefreshCw, ChevronRight, ClipboardCheck, Clock, FlaskConical, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { logActivity } from "@/lib/activityLog";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";

interface PacienteAtencion {
  id: string;
  numero_ingreso: number;
  fecha_ingreso: string;
  estado: string;
  pacientes: {
    id: string;
    nombre: string;
    rut: string;
    empresa_id: string | null;
    tipo_servicio: string | null;
    empresas: { nombre: string } | null;
  };
  atencion_baterias: Array<{
    id: string;
    paquete_id: string;
    paquetes_examenes: { id: string; nombre: string };
  }>;
  atencion_examenes: Array<{
    id: string;
    examen_id: string;
    estado: string;
    examenes: { nombre: string };
  }>;
}

interface EvaluacionClinica {
  id: string;
  atencion_id: string;
  paquete_id: string;
  resultado: string;
  observaciones: string | null;
  restricciones: string | null;
  datos_clinicos: Record<string, unknown> | null;
  evaluado_por: string | null;
  evaluado_at: string | null;
  numero_informe: number | null;
  paquetes_examenes: { nombre: string };
}

interface BateriaConEstado {
  paqueteId: string;
  paqueteNombre: string;
  examenesTotal: number;
  examenesCompletos: number;
  examenesMuestraTomada: number;
  examenesPendientes: number;
  listaParaEvaluar: boolean;
  esperandoResultados: boolean;
  evaluacion: EvaluacionClinica | null;
}

interface ExamenResultado {
  atencion_examen_id: string;
  campo_id: string;
  valor: string | null;
  archivo_url: string | null;
  examen_formulario_campos: {
    etiqueta: string;
    tipo_campo: string;
    opciones: Record<string, unknown> | null;
    orden: number;
    grupo: string | null;
  };
}

type BateriaListStatus = "evaluado_apto" | "evaluado_no_apto" | "evaluado_restricciones" | "lista" | "esperando_resultados" | "pendiente";

const EvaluacionMedica = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("listado");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [atenciones, setAtenciones] = useState<PacienteAtencion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteAtencion | null>(null);
  const [bateriasConEstado, setBateriasConEstado] = useState<BateriaConEstado[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionClinica[]>([]);
  const [paqueteExamenItems, setPaqueteExamenItems] = useState<Record<string, string[]>>({});

  const [listEvaluaciones, setListEvaluaciones] = useState<Record<string, EvaluacionClinica[]>>({});
  const [listPaqueteExamItems, setListPaqueteExamItems] = useState<Record<string, string[]>>({});

  // Evaluation form state - now inline, not dialog
  const [evaluandoPaquete, setEvaluandoPaquete] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string>("pendiente");
  const [observaciones, setObservaciones] = useState("");
  const [restricciones, setRestricciones] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [duracion, setDuracion] = useState<string>("1");
  const [examenEvals, setExamenEvals] = useState<Record<string, string>>({});
  const [savingEval, setSavingEval] = useState(false);

  // Exam results for the selected battery
  const [examenResultados, setExamenResultados] = useState<ExamenResultado[]>([]);
  const [loadingResultados, setLoadingResultados] = useState(false);

  // No aptos
  const [noAptoDate, setNoAptoDate] = useState<Date>(new Date());
  const [noAptos, setNoAptos] = useState<Array<EvaluacionClinica & { atenciones: PacienteAtencion }>>([]);
  const [loadingNoAptos, setLoadingNoAptos] = useState(false);

  // Re-evaluation dialog
  const [reEvalDialog, setReEvalDialog] = useState<{ open: boolean; evaluacion: EvaluacionClinica | null; atencion: PacienteAtencion | null }>({ open: false, evaluacion: null, atencion: null });
  const [reEvalResultado, setReEvalResultado] = useState("pendiente");
  const [reEvalObservaciones, setReEvalObservaciones] = useState("");
  const [reEvalRestricciones, setReEvalRestricciones] = useState("");
  const [savingReEval, setSavingReEval] = useState(false);

  const loadAtenciones = useCallback(async () => {
    setLoading(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("atenciones")
        .select(`
          id, numero_ingreso, fecha_ingreso, estado,
          pacientes!inner(id, nombre, rut, empresa_id, tipo_servicio, empresas(nombre)),
          atencion_baterias(id, paquete_id, paquetes_examenes(id, nombre)),
          atencion_examenes(id, examen_id, estado, examenes(nombre))
        `)
        .neq("pacientes.tipo_servicio", "workmed")
        .gte("fecha_ingreso", startOfDay.toISOString())
        .lte("fecha_ingreso", endOfDay.toISOString())
        .order("numero_ingreso", { ascending: true });

      if (error) throw error;
      const atencionesData = (data as unknown as PacienteAtencion[]) || [];
      setAtenciones(atencionesData);

      const allPaqueteIds = Array.from(new Set(atencionesData.flatMap(a => a.atencion_baterias.map(ab => ab.paquete_id))));
      const allAtencionIds = atencionesData.map(a => a.id);

      if (allPaqueteIds.length > 0 && allAtencionIds.length > 0) {
        const [peiRes, evalRes] = await Promise.all([
          supabase.from("paquete_examen_items").select("paquete_id, examen_id").in("paquete_id", allPaqueteIds),
          supabase.from("evaluaciones_clinicas").select("*, paquetes_examenes(nombre)").in("atencion_id", allAtencionIds),
        ]);

        const peiMap: Record<string, string[]> = {};
        (peiRes.data || []).forEach((item: { paquete_id: string; examen_id: string }) => {
          if (!peiMap[item.paquete_id]) peiMap[item.paquete_id] = [];
          peiMap[item.paquete_id].push(item.examen_id);
        });
        setListPaqueteExamItems(peiMap);

        const evalMap: Record<string, EvaluacionClinica[]> = {};
        ((evalRes.data || []) as unknown as EvaluacionClinica[]).forEach(ev => {
          if (!evalMap[ev.atencion_id]) evalMap[ev.atencion_id] = [];
          evalMap[ev.atencion_id].push(ev);
        });
        setListEvaluaciones(evalMap);
      } else {
        setListPaqueteExamItems({});
        setListEvaluaciones({});
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar atenciones");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadAtenciones();
  }, [loadAtenciones]);

  const computeBateriaStatus = useCallback((atencion: PacienteAtencion, paqueteId: string): BateriaListStatus => {
    const evals = listEvaluaciones[atencion.id] || [];
    const evaluacion = evals.find(e => e.paquete_id === paqueteId);
    if (evaluacion) {
      if (evaluacion.resultado === "apto") return "evaluado_apto";
      if (evaluacion.resultado === "no_apto") return "evaluado_no_apto";
      if (evaluacion.resultado === "apto_con_restricciones") return "evaluado_restricciones";
    }

    const examenIds = listPaqueteExamItems[paqueteId] || [];
    const related = atencion.atencion_examenes.filter(ae => examenIds.includes(ae.examen_id));
    if (related.length === 0) return "pendiente";

    const allCompleted = related.every(ae => ae.estado === "completado");
    if (allCompleted) return "lista";

    const hasMuestra = related.some(ae => ae.estado === "muestra_tomada");
    if (hasMuestra) return "esperando_resultados";

    return "pendiente";
  }, [listEvaluaciones, listPaqueteExamItems]);

  const getPatientOverallStatus = useCallback((atencion: PacienteAtencion): number => {
    const baterias = atencion.atencion_baterias;
    if (baterias.length === 0) return 99;
    const statuses = baterias.map(ab => computeBateriaStatus(atencion, ab.paquete_id));
    const allEvaluated = statuses.every(s => s.startsWith("evaluado"));
    if (allEvaluated) return 3;
    if (statuses.includes("lista")) return 0;
    if (statuses.includes("esperando_resultados")) return 1;
    return 2;
  }, [computeBateriaStatus]);

  const handleSelectPaciente = async (atencion: PacienteAtencion) => {
    setSelectedPaciente(atencion);
    setEvaluandoPaquete(null);

    const paqueteIds = atencion.atencion_baterias.map(ab => ab.paquete_id);
    if (paqueteIds.length === 0) {
      setBateriasConEstado([]);
      setActiveTab("evaluacion");
      return;
    }

    let peiMap = listPaqueteExamItems;
    let evals = listEvaluaciones[atencion.id] || [];

    if (Object.keys(peiMap).length === 0) {
      const [peiRes, evalRes] = await Promise.all([
        supabase.from("paquete_examen_items").select("paquete_id, examen_id").in("paquete_id", paqueteIds),
        supabase.from("evaluaciones_clinicas").select("*, paquetes_examenes(nombre)").eq("atencion_id", atencion.id),
      ]);

      peiMap = {};
      (peiRes.data || []).forEach((item: { paquete_id: string; examen_id: string }) => {
        if (!peiMap[item.paquete_id]) peiMap[item.paquete_id] = [];
        peiMap[item.paquete_id].push(item.examen_id);
      });
      evals = (evalRes.data || []) as unknown as EvaluacionClinica[];
    }

    setPaqueteExamenItems(peiMap);
    setEvaluaciones(evals);

    const baterias: BateriaConEstado[] = atencion.atencion_baterias.map(ab => {
      const examenIdsBateria = peiMap[ab.paquete_id] || [];
      const atencionExamenesRelacionados = atencion.atencion_examenes.filter(
        ae => examenIdsBateria.includes(ae.examen_id)
      );
      const total = atencionExamenesRelacionados.length;
      const completos = atencionExamenesRelacionados.filter(ae => ae.estado === "completado").length;
      const muestraTomada = atencionExamenesRelacionados.filter(ae => ae.estado === "muestra_tomada").length;
      const pendientes = total - completos - muestraTomada;
      const evaluacion = evals.find(e => e.paquete_id === ab.paquete_id) || null;

      return {
        paqueteId: ab.paquete_id,
        paqueteNombre: ab.paquetes_examenes.nombre,
        examenesTotal: total,
        examenesCompletos: completos,
        examenesMuestraTomada: muestraTomada,
        examenesPendientes: pendientes,
        listaParaEvaluar: total > 0 && completos === total,
        esperandoResultados: muestraTomada > 0,
        evaluacion,
      };
    });

    setBateriasConEstado(baterias);
    setActiveTab("evaluacion");
  };

  // Load exam results for a specific battery when evaluating
  const loadExamenResultados = async (atencion: PacienteAtencion, paqueteId: string) => {
    setLoadingResultados(true);
    try {
      const examenIds = paqueteExamenItems[paqueteId] || [];
      const atencionExamenIds = atencion.atencion_examenes
        .filter(ae => examenIds.includes(ae.examen_id))
        .map(ae => ae.id);

      if (atencionExamenIds.length === 0) {
        setExamenResultados([]);
        return;
      }

      const { data, error } = await supabase
        .from("examen_resultados")
        .select(`
          atencion_examen_id, campo_id, valor, archivo_url,
          examen_formulario_campos(etiqueta, tipo_campo, opciones, orden, grupo)
        `)
        .in("atencion_examen_id", atencionExamenIds)
        .order("campo_id");

      if (error) throw error;
      setExamenResultados((data as unknown as ExamenResultado[]) || []);
    } catch (error) {
      console.error("Error loading results:", error);
    } finally {
      setLoadingResultados(false);
    }
  };

  const handleEvaluar = async (paqueteId: string) => {
    const bat = bateriasConEstado.find(b => b.paqueteId === paqueteId);
    if (bat?.evaluacion) {
      setResultado(bat.evaluacion.resultado || "pendiente");
      setObservaciones(bat.evaluacion.observaciones || "");
      setRestricciones(bat.evaluacion.restricciones || "");
      const dc = bat.evaluacion.datos_clinicos as Record<string, unknown> || {};
      setConclusion((dc.conclusion as string) || "");
      setDuracion((dc.duracion_anios as string) || "1");
      setExamenEvals((dc.examen_evaluaciones as Record<string, string>) || {});
    } else {
      setResultado("pendiente");
      setObservaciones("");
      setRestricciones("");
      setConclusion("");
      setDuracion("1");
      setExamenEvals({});
    }
    setEvaluandoPaquete(paqueteId);

    if (selectedPaciente) {
      await loadExamenResultados(selectedPaciente, paqueteId);
    }
  };

  const handleGuardarEvaluacion = async () => {
    if (!selectedPaciente || !evaluandoPaquete || resultado === "pendiente") {
      toast.error("Selecciona un resultado");
      return;
    }
    setSavingEval(true);
    try {
      const datosClinicosPayload = {
        conclusion: conclusion || null,
        duracion_anios: resultado === "no_apto" ? null : duracion,
        examen_evaluaciones: examenEvals,
      };

      const bat = bateriasConEstado.find(b => b.paqueteId === evaluandoPaquete);
      if (bat?.evaluacion) {
        const { error } = await supabase.from("evaluaciones_clinicas").update({
          resultado,
          observaciones: observaciones || null,
          restricciones: restricciones || null,
          datos_clinicos: datosClinicosPayload,
          evaluado_por: user?.id || null,
          evaluado_at: new Date().toISOString(),
        }).eq("id", bat.evaluacion.id);
        if (error) throw error;
      } else {
        const { data: folioData } = await supabase.rpc("get_next_informe_number");
        const { error } = await supabase.from("evaluaciones_clinicas").insert({
          atencion_id: selectedPaciente.id,
          paquete_id: evaluandoPaquete,
          resultado,
          observaciones: observaciones || null,
          restricciones: restricciones || null,
          datos_clinicos: datosClinicosPayload,
          evaluado_por: user?.id || null,
          evaluado_at: new Date().toISOString(),
          numero_informe: folioData || 1,
        });
        if (error) throw error;
      }

      toast.success("Evaluación guardada exitosamente");
      const batNombre = bateriasConEstado.find(b => b.paqueteId === evaluandoPaquete)?.paqueteNombre;
      logActivity("evaluar_bateria", { paciente: selectedPaciente.pacientes.nombre, bateria: batNombre, resultado }, "/evaluacion-medica");
      setEvaluandoPaquete(null);
      await loadAtenciones();
      const refreshedAtencion = await refreshSingleAtencion(selectedPaciente.id);
      if (refreshedAtencion) {
        await handleSelectPaciente(refreshedAtencion);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar evaluación");
    } finally {
      setSavingEval(false);
    }
  };

  const refreshSingleAtencion = async (atencionId: string): Promise<PacienteAtencion | null> => {
    const { data } = await supabase
      .from("atenciones")
      .select(`
        id, numero_ingreso, fecha_ingreso, estado,
        pacientes!inner(id, nombre, rut, empresa_id, tipo_servicio, empresas(nombre)),
        atencion_baterias(id, paquete_id, paquetes_examenes(id, nombre)),
        atencion_examenes(id, examen_id, estado, examenes(nombre))
      `)
      .eq("id", atencionId)
      .maybeSingle();
    return (data as unknown as PacienteAtencion) || null;
  };

  // Load no aptos
  const loadNoAptos = useCallback(async () => {
    setLoadingNoAptos(true);
    try {
      const startOfDay = new Date(noAptoDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(noAptoDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("evaluaciones_clinicas")
        .select(`
          *, paquetes_examenes(nombre),
          atenciones!inner(
            id, numero_ingreso, fecha_ingreso, estado,
            pacientes(id, nombre, rut, empresa_id, empresas(nombre)),
            atencion_baterias(id, paquete_id, paquetes_examenes(id, nombre)),
            atencion_examenes(id, examen_id, estado, examenes(nombre))
          )
        `)
        .eq("resultado", "no_apto")
        .gte("evaluado_at", startOfDay.toISOString())
        .lte("evaluado_at", endOfDay.toISOString())
        .order("evaluado_at", { ascending: false });

      if (error) throw error;
      setNoAptos((data as unknown as Array<EvaluacionClinica & { atenciones: PacienteAtencion }>) || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar pacientes no aptos");
    } finally {
      setLoadingNoAptos(false);
    }
  }, [noAptoDate]);

  useEffect(() => {
    if (activeTab === "no_aptos") {
      loadNoAptos();
    }
  }, [activeTab, loadNoAptos]);

  const handleReEvaluar = (evaluacion: EvaluacionClinica, atencion: PacienteAtencion) => {
    setReEvalResultado("pendiente");
    setReEvalObservaciones("");
    setReEvalRestricciones("");
    setReEvalDialog({ open: true, evaluacion, atencion });
  };

  const handleGuardarReEvaluacion = async () => {
    if (!reEvalDialog.evaluacion || !reEvalDialog.atencion || reEvalResultado === "pendiente") {
      toast.error("Selecciona un resultado");
      return;
    }
    setSavingReEval(true);
    try {
      const { data: folioData } = await supabase.rpc("get_next_informe_number");
      const { error } = await supabase.from("evaluaciones_clinicas").insert({
        atencion_id: reEvalDialog.atencion.id,
        paquete_id: reEvalDialog.evaluacion.paquete_id,
        resultado: reEvalResultado,
        observaciones: reEvalObservaciones || null,
        restricciones: reEvalRestricciones || null,
        evaluado_por: user?.id || null,
        evaluado_at: new Date().toISOString(),
        numero_informe: folioData || 1,
      });
      if (error) throw error;

      toast.success("Re-evaluación guardada");
      logActivity("re_evaluar_bateria", { paciente: reEvalDialog.atencion.pacientes.nombre, bateria: reEvalDialog.evaluacion.paquetes_examenes.nombre, resultado: reEvalResultado }, "/evaluacion-medica");
      setReEvalDialog({ open: false, evaluacion: null, atencion: null });
      loadNoAptos();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar re-evaluación");
    } finally {
      setSavingReEval(false);
    }
  };

  const getBateriaStatusBadge = (bat: BateriaConEstado) => {
    if (bat.evaluacion) {
      const r = bat.evaluacion.resultado;
      if (r === "apto") return <Badge className="bg-green-600 text-white">APTO</Badge>;
      if (r === "no_apto") return <Badge variant="destructive">NO APTO</Badge>;
      if (r === "apto_con_restricciones") return <Badge className="bg-amber-500 text-white">APTO C/R</Badge>;
      return <Badge variant="outline">Pendiente</Badge>;
    }
    if (bat.listaParaEvaluar) return <Badge className="bg-green-500/20 text-green-700 border-green-500">✓ Lista para evaluar</Badge>;
    if (bat.esperandoResultados) return (
      <Badge className="bg-amber-500/20 text-amber-700 border-amber-500">
        <FlaskConical className="h-3 w-3 mr-1" />Esperando resultados ({bat.examenesCompletos}/{bat.examenesTotal})
      </Badge>
    );
    return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500">Pendiente ({bat.examenesCompletos}/{bat.examenesTotal})</Badge>;
  };

  const getListBateriaBadge = (status: BateriaListStatus, nombre: string) => {
    switch (status) {
      case "evaluado_apto":
        return <Badge key={nombre} className="text-xs mr-1 mb-1 bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />APTO</Badge>;
      case "evaluado_no_apto":
        return <Badge key={nombre} variant="destructive" className="text-xs mr-1 mb-1"><XCircle className="h-3 w-3 mr-1" />NO APTO</Badge>;
      case "evaluado_restricciones":
        return <Badge key={nombre} className="text-xs mr-1 mb-1 bg-amber-500 text-white">APTO C/R</Badge>;
      case "lista":
        return <Badge key={nombre} className="text-xs mr-1 mb-1 bg-green-500/20 text-green-700 border-green-500">{nombre}</Badge>;
      case "esperando_resultados":
        return <Badge key={nombre} className="text-xs mr-1 mb-1 bg-amber-500/20 text-amber-700 border-amber-500"><FlaskConical className="h-3 w-3 mr-1" />{nombre}</Badge>;
      default:
        return <Badge key={nombre} className="text-xs mr-1 mb-1 bg-blue-500/20 text-blue-700 border-blue-500"><Clock className="h-3 w-3 mr-1" />{nombre}</Badge>;
    }
  };

  const sortedAtenciones = [...atenciones].sort((a, b) => getPatientOverallStatus(a) - getPatientOverallStatus(b));

  // Group exam results by atencion_examen_id
  const getResultadosByExamen = () => {
    const map: Record<string, ExamenResultado[]> = {};
    examenResultados.forEach(r => {
      if (!map[r.atencion_examen_id]) map[r.atencion_examen_id] = [];
      map[r.atencion_examen_id].push(r);
    });
    return map;
  };

  // Render inline evaluation view (replaces dialog)
  const renderEvaluacionInline = () => {
    if (!selectedPaciente || !evaluandoPaquete) return null;

    const bat = bateriasConEstado.find(b => b.paqueteId === evaluandoPaquete);
    if (!bat) return null;

    const examenIds = paqueteExamenItems[evaluandoPaquete] || [];
    const examenesRelacionados = selectedPaciente.atencion_examenes.filter(ae => examenIds.includes(ae.examen_id));
    const resultadosByExamen = getResultadosByExamen();

    return (
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  Evaluación: {bat.paqueteNombre}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedPaciente.pacientes.nombre} — RUT: {selectedPaciente.pacientes.rut} — N° {selectedPaciente.numero_ingreso}
                  {selectedPaciente.pacientes.empresas && ` — ${selectedPaciente.pacientes.empresas.nombre}`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEvaluandoPaquete(null)} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Split layout: Left = form, Right = results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Evaluation Form */}
          <div className="space-y-4">
            {/* Per-exam evaluation with radio buttons */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evaluación por Examen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {examenesRelacionados.map(ae => (
                  <div key={ae.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <span className="text-sm font-medium flex-1">{ae.examenes.nombre}</span>
                    <RadioGroup
                      value={examenEvals[ae.examen_id] || ""}
                      onValueChange={(val) => setExamenEvals(prev => ({ ...prev, [ae.examen_id]: val }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="normal" id={`${ae.id}-normal`} />
                        <Label htmlFor={`${ae.id}-normal`} className="text-xs cursor-pointer text-green-700">Normal</Label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <RadioGroupItem value="anormal" id={`${ae.id}-anormal`} />
                        <Label htmlFor={`${ae.id}-anormal`} className="text-xs cursor-pointer text-red-700">Anormal</Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
                {examenesRelacionados.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay exámenes asociados</p>
                )}
              </CardContent>
            </Card>

            {/* Aptitude */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resultado de Aptitud</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block">Dictamen</Label>
                  <RadioGroup value={resultado} onValueChange={setResultado} className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-green-50 dark:hover:bg-green-950/20">
                      <RadioGroupItem value="apto" id="eval-apto" />
                      <Label htmlFor="eval-apto" className="cursor-pointer font-semibold text-green-700">APTO</Label>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20">
                      <RadioGroupItem value="no_apto" id="eval-no-apto" />
                      <Label htmlFor="eval-no-apto" className="cursor-pointer font-semibold text-red-700">NO APTO</Label>
                    </div>
                    <div className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20">
                      <RadioGroupItem value="apto_con_restricciones" id="eval-apto-cr" />
                      <Label htmlFor="eval-apto-cr" className="cursor-pointer font-semibold text-amber-700">APTO C/R</Label>
                    </div>
                  </RadioGroup>
                </div>

                {resultado !== "no_apto" && (
                  <div>
                    <Label className="mb-2 block">Duración del Examen</Label>
                    <Select value={duracion} onValueChange={setDuracion}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Año</SelectItem>
                        <SelectItem value="2">2 Años</SelectItem>
                        <SelectItem value="3">3 Años</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(resultado === "no_apto" || resultado === "apto_con_restricciones") && (
                  <div>
                    <Label className="mb-2 block">Restricciones / Contraindicaciones</Label>
                    <Textarea value={restricciones} onChange={(e) => setRestricciones(e.target.value)} placeholder="Detalle de restricciones..." rows={3} />
                  </div>
                )}

                <div>
                  <Label className="mb-2 block">Conclusión</Label>
                  <Textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="Conclusión médica..." rows={3} />
                </div>

                <div>
                  <Label className="mb-2 block">Observaciones</Label>
                  <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones clínicas..." rows={3} />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleGuardarEvaluacion} disabled={savingEval || resultado === "pendiente"} className="flex-1">
                    {savingEval ? "Guardando..." : "Guardar Evaluación"}
                  </Button>
                  <Button variant="outline" onClick={() => setEvaluandoPaquete(null)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Exam Results */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resultados de Exámenes</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingResultados ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Cargando resultados...</p>
                ) : examenesRelacionados.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin exámenes</p>
                ) : (
                  <div className="space-y-4">
                    {examenesRelacionados.map(ae => {
                      const resultados = resultadosByExamen[ae.id] || [];
                      const sorted = [...resultados].sort((a, b) => (a.examen_formulario_campos?.orden || 0) - (b.examen_formulario_campos?.orden || 0));

                      return (
                        <div key={ae.id} className="border rounded-lg overflow-hidden">
                          <div className={`px-3 py-2 font-medium text-sm flex items-center justify-between ${
                            ae.estado === "completado"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : ae.estado === "muestra_tomada"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}>
                            <span>{ae.examenes.nombre}</span>
                            <Badge variant="outline" className="text-xs">
                              {ae.estado === "completado" ? "✓ Completado" : ae.estado === "muestra_tomada" ? "⏳ Esperando" : "Pendiente"}
                            </Badge>
                          </div>
                          <div className="p-3">
                            {sorted.length > 0 ? (
                              <div className="space-y-2">
                                {sorted.map((r, idx) => {
                                  const campo = r.examen_formulario_campos;
                                  const unidad = (campo?.opciones as Record<string, string>)?.unidad;
                                  return (
                                    <div key={idx} className="flex justify-between items-center text-sm border-b last:border-0 pb-1 last:pb-0">
                                      <span className="text-muted-foreground">{campo?.etiqueta || "Campo"}</span>
                                      <span className="font-medium">
                                        {r.valor || "-"}
                                        {unidad && unidad !== "none" && <span className="text-xs text-muted-foreground ml-1">{unidad}</span>}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-2">Sin resultados cargados</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <Stethoscope className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Evaluación Médica</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="listado" className="gap-1.5">
              <ClipboardCheck className="h-4 w-4" />
              Pacientes del Día
            </TabsTrigger>
            <TabsTrigger value="evaluacion" className="gap-1.5" disabled={!selectedPaciente}>
              <FileText className="h-4 w-4" />
              Evaluación
            </TabsTrigger>
            <TabsTrigger value="no_aptos" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              No Aptos
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Listado */}
          <TabsContent value="listado">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Pacientes del Día</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Lista para evaluar</span>
                      <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Esperando resultados</span>
                      <span className="inline-flex items-center gap-1 mr-3"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Exámenes pendientes</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {format(selectedDate, "dd/MM/yyyy", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={es} />
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="sm" onClick={loadAtenciones}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Cargando...</p>
                ) : atenciones.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No hay pacientes en esta fecha (excluye Workmed)</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">N°</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>RUT</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Baterías</TableHead>
                        <TableHead className="w-24">Estado</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAtenciones.map((at) => {
                        const hasBaterias = at.atencion_baterias.length > 0;
                        const overallStatus = getPatientOverallStatus(at);
                        const allEvaluated = overallStatus === 3;

                        return (
                          <TableRow
                            key={at.id}
                            className={`cursor-pointer hover:bg-muted/50 ${selectedPaciente?.id === at.id ? "bg-accent/50" : ""} ${allEvaluated ? "opacity-60" : ""}`}
                            onClick={() => handleSelectPaciente(at)}
                          >
                            <TableCell className="font-mono font-bold">{at.numero_ingreso}</TableCell>
                            <TableCell className="font-medium">{at.pacientes.nombre}</TableCell>
                            <TableCell className="text-muted-foreground">{at.pacientes.rut}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{at.pacientes.empresas?.nombre || "-"}</TableCell>
                            <TableCell>
                              {hasBaterias ? at.atencion_baterias.map(ab => {
                                const status = computeBateriaStatus(at, ab.paquete_id);
                                return getListBateriaBadge(status, ab.paquetes_examenes.nombre);
                              }) : <span className="text-xs text-muted-foreground">Sin baterías</span>}
                            </TableCell>
                            <TableCell>
                              {allEvaluated && <Badge variant="outline" className="text-xs">Evaluado</Badge>}
                              {overallStatus === 0 && <Badge className="text-xs bg-green-500/20 text-green-700 border-green-500">Listo</Badge>}
                              {overallStatus === 1 && <Badge className="text-xs bg-amber-500/20 text-amber-700 border-amber-500">Esperando</Badge>}
                              {overallStatus === 2 && <Badge className="text-xs bg-blue-500/20 text-blue-700 border-blue-500">Pendiente</Badge>}
                            </TableCell>
                            <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Evaluación */}
          <TabsContent value="evaluacion">
            {selectedPaciente ? (
              evaluandoPaquete ? (
                renderEvaluacionInline()
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{selectedPaciente.pacientes.nombre}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            RUT: {selectedPaciente.pacientes.rut} | N° Ingreso: {selectedPaciente.numero_ingreso}
                            {selectedPaciente.pacientes.empresas && ` | ${selectedPaciente.pacientes.empresas.nombre}`}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedPaciente(null); setActiveTab("listado"); }}>
                          Volver al listado
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>

                  {bateriasConEstado.length === 0 ? (
                    <Card><CardContent className="py-8 text-center text-muted-foreground">Este paciente no tiene baterías asignadas</CardContent></Card>
                  ) : (
                    <div className="grid gap-4">
                      {bateriasConEstado.map((bat) => {
                        const borderClass = bat.evaluacion
                          ? bat.evaluacion.resultado === "apto" ? "border-green-300" : bat.evaluacion.resultado === "no_apto" ? "border-red-300" : "border-amber-300"
                          : bat.listaParaEvaluar ? "border-green-200" : bat.esperandoResultados ? "border-amber-200" : "border-blue-200";

                        return (
                          <Card key={bat.paqueteId} className={borderClass}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <CardTitle className="text-base">{bat.paqueteNombre}</CardTitle>
                                  {getBateriaStatusBadge(bat)}
                                </div>
                                {(bat.listaParaEvaluar || bat.evaluacion) && (
                                  <Button size="sm" onClick={() => handleEvaluar(bat.paqueteId)}>
                                    {bat.evaluacion ? "Editar Evaluación" : "Evaluar"}
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-wrap gap-2">
                                {selectedPaciente.atencion_examenes
                                  .filter(ae => (paqueteExamenItems[bat.paqueteId] || []).includes(ae.examen_id))
                                  .map(ae => (
                                    <Badge
                                      key={ae.id}
                                      variant="outline"
                                      className={`text-xs ${
                                        ae.estado === "completado"
                                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                          : ae.estado === "muestra_tomada"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                      }`}
                                    >
                                      {ae.examenes.nombre}: {ae.estado === "completado" ? "✓ Resultado cargado" : ae.estado === "muestra_tomada" ? "⏳ Esperando resultado" : "Pendiente"}
                                    </Badge>
                                  ))
                                }
                              </div>
                              {bat.evaluacion && (
                                <div className="mt-3 p-3 bg-muted rounded-md text-sm space-y-1">
                                  <p><strong>Folio:</strong> #{bat.evaluacion.numero_informe}</p>
                                  <p><strong>Resultado:</strong> {bat.evaluacion.resultado === "apto" ? "APTO" : bat.evaluacion.resultado === "no_apto" ? "NO APTO" : "APTO CON RESTRICCIONES"}</p>
                                  {bat.evaluacion.observaciones && <p><strong>Observaciones:</strong> {bat.evaluacion.observaciones}</p>}
                                  {bat.evaluacion.restricciones && <p><strong>Restricciones:</strong> {bat.evaluacion.restricciones}</p>}
                                  {(bat.evaluacion.datos_clinicos as Record<string, unknown>)?.duracion_anios && (
                                    <p><strong>Duración:</strong> {String((bat.evaluacion.datos_clinicos as Record<string, unknown>).duracion_anios)} año(s)</p>
                                  )}
                                  {(bat.evaluacion.datos_clinicos as Record<string, unknown>)?.conclusion && (
                                    <p><strong>Conclusión:</strong> {(bat.evaluacion.datos_clinicos as Record<string, unknown>).conclusion as string}</p>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona un paciente del listado para evaluar sus baterías</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 3: No Aptos */}
          <TabsContent value="no_aptos">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Pacientes No Aptos
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {format(noAptoDate, "dd/MM/yyyy", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={noAptoDate} onSelect={(d) => d && setNoAptoDate(d)} locale={es} />
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="sm" onClick={loadNoAptos}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingNoAptos ? (
                  <p className="text-muted-foreground text-center py-8">Cargando...</p>
                ) : noAptos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No hay pacientes no aptos en esta fecha</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">N°</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>RUT</TableHead>
                        <TableHead>Batería</TableHead>
                        <TableHead>Folio</TableHead>
                        <TableHead>Restricciones</TableHead>
                        <TableHead className="w-32"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {noAptos.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono font-bold">{item.atenciones.numero_ingreso}</TableCell>
                          <TableCell className="font-medium">{item.atenciones.pacientes.nombre}</TableCell>
                          <TableCell className="text-muted-foreground">{item.atenciones.pacientes.rut}</TableCell>
                          <TableCell><Badge variant="destructive" className="text-xs">{item.paquetes_examenes.nombre}</Badge></TableCell>
                          <TableCell className="font-mono">#{item.numero_informe}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{item.restricciones || "-"}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handleReEvaluar(item, item.atenciones)}>Re-evaluar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Re-evaluation Dialog (kept for No Aptos tab) */}
            <Dialog open={reEvalDialog.open} onOpenChange={(open) => !open && setReEvalDialog({ open: false, evaluacion: null, atencion: null })}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Re-evaluación</DialogTitle>
                  <DialogDescription>
                    {reEvalDialog.atencion?.pacientes.nombre} - {reEvalDialog.evaluacion?.paquetes_examenes.nombre}
                    <br /><span className="text-xs">Evaluación original Folio #{reEvalDialog.evaluacion?.numero_informe}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nuevo Resultado</Label>
                    <Select value={reEvalResultado} onValueChange={setReEvalResultado}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar resultado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente" disabled>Pendiente</SelectItem>
                        <SelectItem value="apto">APTO</SelectItem>
                        <SelectItem value="no_apto">NO APTO</SelectItem>
                        <SelectItem value="apto_con_restricciones">APTO CON RESTRICCIONES</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Observaciones</Label>
                    <Textarea value={reEvalObservaciones} onChange={(e) => setReEvalObservaciones(e.target.value)} placeholder="Observaciones de la re-evaluación..." rows={3} />
                  </div>
                  {(reEvalResultado === "no_apto" || reEvalResultado === "apto_con_restricciones") && (
                    <div>
                      <Label>Restricciones</Label>
                      <Textarea value={reEvalRestricciones} onChange={(e) => setReEvalRestricciones(e.target.value)} placeholder="Detalle de restricciones..." rows={3} />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReEvalDialog({ open: false, evaluacion: null, atencion: null })}>Cancelar</Button>
                  <Button onClick={handleGuardarReEvaluacion} disabled={savingReEval || reEvalResultado === "pendiente"}>
                    {savingReEval ? "Guardando..." : "Guardar Re-evaluación"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EvaluacionMedica;
