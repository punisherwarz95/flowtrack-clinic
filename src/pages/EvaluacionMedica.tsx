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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Stethoscope, CheckCircle, AlertTriangle, FileText, RefreshCw, ChevronRight, ClipboardCheck } from "lucide-react";
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
  listaParaEvaluar: boolean;
  evaluacion: EvaluacionClinica | null;
}

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

  // Evaluation form state
  const [evaluandoPaquete, setEvaluandoPaquete] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string>("pendiente");
  const [observaciones, setObservaciones] = useState("");
  const [restricciones, setRestricciones] = useState("");
  const [savingEval, setSavingEval] = useState(false);

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
      setAtenciones((data as unknown as PacienteAtencion[]) || []);
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

  const handleSelectPaciente = async (atencion: PacienteAtencion) => {
    setSelectedPaciente(atencion);

    // Load paquete_examen_items for all batteries
    const paqueteIds = atencion.atencion_baterias.map(ab => ab.paquete_id);
    if (paqueteIds.length === 0) {
      setBateriasConEstado([]);
      setActiveTab("evaluacion");
      return;
    }

    const [peiRes, evalRes] = await Promise.all([
      supabase.from("paquete_examen_items").select("paquete_id, examen_id").in("paquete_id", paqueteIds),
      supabase.from("evaluaciones_clinicas").select("*, paquetes_examenes(nombre)").eq("atencion_id", atencion.id),
    ]);

    const peiMap: Record<string, string[]> = {};
    (peiRes.data || []).forEach((item: { paquete_id: string; examen_id: string }) => {
      if (!peiMap[item.paquete_id]) peiMap[item.paquete_id] = [];
      peiMap[item.paquete_id].push(item.examen_id);
    });
    setPaqueteExamenItems(peiMap);

    const evals = (evalRes.data || []) as unknown as EvaluacionClinica[];
    setEvaluaciones(evals);

    // Build battery status
    const baterias: BateriaConEstado[] = atencion.atencion_baterias.map(ab => {
      const examenIdsBateria = peiMap[ab.paquete_id] || [];
      const atencionExamenesRelacionados = atencion.atencion_examenes.filter(
        ae => examenIdsBateria.includes(ae.examen_id)
      );
      const total = atencionExamenesRelacionados.length;
      const completos = atencionExamenesRelacionados.filter(ae => ae.estado === "completado" || ae.estado === "muestra_tomada").length;
      const evaluacion = evals.find(e => e.paquete_id === ab.paquete_id) || null;

      return {
        paqueteId: ab.paquete_id,
        paqueteNombre: ab.paquetes_examenes.nombre,
        examenesTotal: total,
        examenesCompletos: completos,
        listaParaEvaluar: total > 0 && completos >= total,
        evaluacion,
      };
    });

    setBateriasConEstado(baterias);
    setActiveTab("evaluacion");
  };

  const handleEvaluar = (paqueteId: string) => {
    const bat = bateriasConEstado.find(b => b.paqueteId === paqueteId);
    if (bat?.evaluacion) {
      setResultado(bat.evaluacion.resultado || "pendiente");
      setObservaciones(bat.evaluacion.observaciones || "");
      setRestricciones(bat.evaluacion.restricciones || "");
    } else {
      setResultado("pendiente");
      setObservaciones("");
      setRestricciones("");
    }
    setEvaluandoPaquete(paqueteId);
  };

  const handleGuardarEvaluacion = async () => {
    if (!selectedPaciente || !evaluandoPaquete || resultado === "pendiente") {
      toast.error("Selecciona un resultado");
      return;
    }
    setSavingEval(true);
    try {
      const bat = bateriasConEstado.find(b => b.paqueteId === evaluandoPaquete);
      if (bat?.evaluacion) {
        // Update existing
        const { error } = await supabase.from("evaluaciones_clinicas").update({
          resultado,
          observaciones: observaciones || null,
          restricciones: restricciones || null,
          evaluado_por: user?.id || null,
          evaluado_at: new Date().toISOString(),
        }).eq("id", bat.evaluacion.id);
        if (error) throw error;
      } else {
        // Create new with folio
        const { data: folioData } = await supabase.rpc("get_next_informe_number");
        const { error } = await supabase.from("evaluaciones_clinicas").insert({
          atencion_id: selectedPaciente.id,
          paquete_id: evaluandoPaquete,
          resultado,
          observaciones: observaciones || null,
          restricciones: restricciones || null,
          evaluado_por: user?.id || null,
          evaluado_at: new Date().toISOString(),
          numero_informe: folioData || 1,
        });
        if (error) throw error;
      }

      toast.success("Evaluación guardada exitosamente");
      setEvaluandoPaquete(null);
      // Refresh
      await handleSelectPaciente(selectedPaciente);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar evaluación");
    } finally {
      setSavingEval(false);
    }
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
    if (bat.listaParaEvaluar) {
      return <Badge className="bg-green-500/20 text-green-700 border-green-500">Lista ({bat.examenesCompletos}/{bat.examenesTotal})</Badge>;
    }
    return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500">Pendiente ({bat.examenesCompletos}/{bat.examenesTotal})</Badge>;
  };

  const getAtencionBateriasResumen = (atencion: PacienteAtencion) => {
    const baterias = atencion.atencion_baterias;
    if (baterias.length === 0) return <span className="text-xs text-muted-foreground">Sin baterías</span>;

    return baterias.map(ab => {
      const examenIds = paqueteExamenItems[ab.paquete_id] || [];
      // Check without loading paquete_examen_items for the list view
      // We'll do a simple heuristic: all atencion_examenes with matching examen_ids
      return (
        <Badge key={ab.id} variant="outline" className="text-xs mr-1">
          {ab.paquetes_examenes.nombre}
        </Badge>
      );
    });
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

          {/* TAB 1: Listado de pacientes del día */}
          <TabsContent value="listado">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Pacientes Atendidos</CardTitle>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {format(selectedDate, "dd/MM/yyyy", { locale: es })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(d) => d && setSelectedDate(d)}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="sm" onClick={loadAtenciones}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
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
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atenciones.map((at) => {
                        const hasBaterias = at.atencion_baterias.length > 0;
                        return (
                          <TableRow
                            key={at.id}
                            className={`cursor-pointer hover:bg-muted/50 ${selectedPaciente?.id === at.id ? "bg-accent/50" : ""}`}
                            onClick={() => handleSelectPaciente(at)}
                          >
                            <TableCell className="font-mono font-bold">{at.numero_ingreso}</TableCell>
                            <TableCell className="font-medium">{at.pacientes.nombre}</TableCell>
                            <TableCell className="text-muted-foreground">{at.pacientes.rut}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{at.pacientes.empresas?.nombre || "-"}</TableCell>
                            <TableCell>
                              {hasBaterias ? at.atencion_baterias.map(ab => (
                                <Badge key={ab.id} variant="outline" className="text-xs mr-1 mb-1">
                                  {ab.paquetes_examenes.nombre}
                                </Badge>
                              )) : <span className="text-xs text-muted-foreground">Sin baterías</span>}
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Evaluación de baterías */}
          <TabsContent value="evaluacion">
            {selectedPaciente ? (
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
                    {bateriasConEstado.map((bat) => (
                      <Card key={bat.paqueteId} className={bat.listaParaEvaluar || bat.evaluacion ? "border-green-200" : "border-blue-200"}>
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
                                    ae.estado === "completado" || ae.estado === "muestra_tomada"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                  }`}
                                >
                                  {ae.examenes.nombre}: {ae.estado === "completado" ? "✓" : ae.estado === "muestra_tomada" ? "Muestra" : "Pendiente"}
                                </Badge>
                              ))
                            }
                          </div>
                          {bat.evaluacion && (
                            <div className="mt-3 p-3 bg-muted rounded-md text-sm space-y-1">
                              <p><strong>Folio:</strong> #{bat.evaluacion.numero_informe}</p>
                              {bat.evaluacion.observaciones && <p><strong>Observaciones:</strong> {bat.evaluacion.observaciones}</p>}
                              {bat.evaluacion.restricciones && <p><strong>Restricciones:</strong> {bat.evaluacion.restricciones}</p>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Evaluation Dialog */}
                <Dialog open={!!evaluandoPaquete} onOpenChange={(open) => !open && setEvaluandoPaquete(null)}>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Evaluar Batería</DialogTitle>
                      <DialogDescription>
                        {bateriasConEstado.find(b => b.paqueteId === evaluandoPaquete)?.paqueteNombre}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Resultado</Label>
                        <Select value={resultado} onValueChange={setResultado}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar resultado" />
                          </SelectTrigger>
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
                        <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Observaciones clínicas..." rows={3} />
                      </div>
                      {(resultado === "no_apto" || resultado === "apto_con_restricciones") && (
                        <div>
                          <Label>Restricciones / Contraindicaciones</Label>
                          <Textarea value={restricciones} onChange={(e) => setRestricciones(e.target.value)} placeholder="Detalle de restricciones..." rows={3} />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEvaluandoPaquete(null)}>Cancelar</Button>
                      <Button onClick={handleGuardarEvaluacion} disabled={savingEval || resultado === "pendiente"}>
                        {savingEval ? "Guardando..." : "Guardar Evaluación"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
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
                        <Calendar
                          mode="single"
                          selected={noAptoDate}
                          onSelect={(d) => d && setNoAptoDate(d)}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="sm" onClick={loadNoAptos}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
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
                          <TableCell>
                            <Badge variant="destructive" className="text-xs">{item.paquetes_examenes.nombre}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">#{item.numero_informe}</TableCell>
                          <TableCell className="text-sm max-w-xs truncate">{item.restricciones || "-"}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => handleReEvaluar(item, item.atenciones)}>
                              Re-evaluar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Re-evaluation Dialog */}
            <Dialog open={reEvalDialog.open} onOpenChange={(open) => !open && setReEvalDialog({ open: false, evaluacion: null, atencion: null })}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Re-evaluación</DialogTitle>
                  <DialogDescription>
                    {reEvalDialog.atencion?.pacientes.nombre} - {reEvalDialog.evaluacion?.paquetes_examenes.nombre}
                    <br />
                    <span className="text-xs">Evaluación original Folio #{reEvalDialog.evaluacion?.numero_informe}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nuevo Resultado</Label>
                    <Select value={reEvalResultado} onValueChange={setReEvalResultado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar resultado" />
                      </SelectTrigger>
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
