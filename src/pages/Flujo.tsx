import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Play, CheckCircle, XCircle, Calendar as CalendarIcon, FileText, RefreshCw, ChevronDown, Check } from "lucide-react";
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
  useAuth(); // Protect route
  const [atenciones, setAtenciones] = useState<Atencion[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [examenes, setExamenes] = useState<Examen[]>([]);
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

  useEffect(() => {
    loadData();
    
    const channel = supabase
      .channel("atenciones-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atenciones" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atencion_examenes" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pacientes" },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  // Auto-refresh cada 10 segundos solo para tabla "En Espera"
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const startOfDay = selectedDate ? new Date(selectedDate.setHours(0, 0, 0, 0)).toISOString() : null;
      const endOfDay = selectedDate ? new Date(selectedDate.setHours(23, 59, 59, 999)).toISOString() : null;

      let atencionesQuery = supabase
        .from("atenciones")
        .select("*, pacientes(id, nombre, rut, tipo_servicio), boxes(*)")
        .in("estado", ["en_espera", "en_atencion"])
        .order("fecha_ingreso", { ascending: true });

      if (startOfDay && endOfDay) {
        atencionesQuery = atencionesQuery.gte("fecha_ingreso", startOfDay).lte("fecha_ingreso", endOfDay);
      }

      const [atencionesRes, boxesRes, examenesRes] = await Promise.all([
        atencionesQuery,
        supabase
          .from("boxes")
          .select("*, box_examenes(examen_id)")
          .eq("activo", true),
        supabase
          .from("examenes")
          .select("*")
          .order("nombre", { ascending: true }),
      ]);

      if (atencionesRes.error) throw atencionesRes.error;
      if (boxesRes.error) throw boxesRes.error;
      if (examenesRes.error) throw examenesRes.error;

      setAtenciones(atencionesRes.data || []);
      setBoxes(boxesRes.data || []);
      setExamenes(examenesRes.data || []);

      await loadPendingBoxesForAtenciones(atencionesRes.data || [], boxesRes.data || []);
      await loadAtencionExamenes(atencionesRes.data || [], boxesRes.data || []);
      await loadExamenesPendientes(atencionesRes.data || [], examenesRes.data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    }
  };

  const loadExamenesPendientes = async (atenciones: Atencion[], examenesList: Examen[]) => {
    const newExamenesPendientes: {[atencionId: string]: string[]} = {};

    for (const atencion of atenciones) {
      try {
        // Incluir pendientes e incompletos
        const { data: atencionExamenes, error } = await supabase
          .from("atencion_examenes")
          .select("examen_id, estado")
          .eq("atencion_id", atencion.id)
          .in("estado", ["pendiente", "incompleto"]);

        if (error) throw error;

        const nombresExamenes = (atencionExamenes || []).map(ae => {
          const examen = examenesList.find(ex => ex.id === ae.examen_id);
          const nombre = examen?.nombre || "";
          // Agregar indicador si es incompleto
          return ae.estado === "incompleto" ? `${nombre} (I)` : nombre;
        }).filter(n => n);

        newExamenesPendientes[atencion.id] = nombresExamenes;
      } catch (error) {
        console.error("Error loading examenes pendientes:", error);
        newExamenesPendientes[atencion.id] = [];
      }
    }

    setExamenesPendientes(newExamenesPendientes);
  };

  const loadAtencionExamenes = async (atenciones: Atencion[], boxesList: Box[]) => {
    const newAtencionExamenes: {[atencionId: string]: AtencionExamen[]} = {};

    // Cargar todos los exámenes en paralelo para mejor rendimiento
    const promises = atenciones.map(async (atencion) => {
      try {
        // Si está en atención con box, filtrar directamente en la query
        if (atencion.estado === "en_atencion" && atencion.box_id) {
          const box = boxesList.find(b => b.id === atencion.box_id);
          const boxExamIds = box?.box_examenes.map(be => be.examen_id) || [];
          
          if (boxExamIds.length === 0) {
            return { atencionId: atencion.id, examenes: [] };
          }

          // Incluir pendientes e incompletos para que puedan ser reintentados
          const { data: examenesData, error } = await supabase
            .from("atencion_examenes")
            .select("id, examen_id, estado, examenes(nombre)")
            .eq("atencion_id", atencion.id)
            .in("estado", ["pendiente", "incompleto"])
            .in("examen_id", boxExamIds);

          if (error) throw error;
          return { atencionId: atencion.id, examenes: examenesData || [] };
        } else {
          // Para pacientes en espera, cargar todos los pendientes e incompletos
          const { data: examenesData, error } = await supabase
            .from("atencion_examenes")
            .select("id, examen_id, estado, examenes(nombre)")
            .eq("atencion_id", atencion.id)
            .in("estado", ["pendiente", "incompleto"]);

          if (error) throw error;
          return { atencionId: atencion.id, examenes: examenesData || [] };
        }
      } catch (error) {
        console.error("Error loading atencion examenes:", error);
        return { atencionId: atencion.id, examenes: [] };
      }
    });

    const results = await Promise.all(promises);
    results.forEach(({ atencionId, examenes }) => {
      newAtencionExamenes[atencionId] = examenes;
    });

    setAtencionExamenes(newAtencionExamenes);
  };

  const loadPendingBoxesForAtenciones = async (atenciones: Atencion[], boxesList: Box[]) => {
    const newPendingBoxes: {[atencionId: string]: string[]} = {};

    for (const atencion of atenciones) {
      try {
        // Incluir pendientes e incompletos
        const { data: atencionExamenes, error } = await supabase
          .from("atencion_examenes")
          .select("examen_id")
          .eq("atencion_id", atencion.id)
          .in("estado", ["pendiente", "incompleto"]);

        if (error) throw error;

        const examenesIds = atencionExamenes?.map(ae => ae.examen_id) || [];

        const boxesConExamenes = boxesList.filter(box => 
          box.box_examenes.some(be => examenesIds.includes(be.examen_id))
        );

        newPendingBoxes[atencion.id] = boxesConExamenes.map(b => b.nombre);
      } catch (error) {
        console.error("Error loading pending boxes:", error);
        newPendingBoxes[atencion.id] = [];
      }
    }

    setPendingBoxes(newPendingBoxes);
  };

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

      // Intento atómico: solo pasar a en_atencion si sigue en espera y sin box
      const { data: updated, error: updateError } = await supabase
        .from("atenciones")
        .update({
          estado: "en_atencion",
          box_id: boxId,
          fecha_inicio_atencion: new Date().toISOString(),
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
        await loadData();
        
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

      toast.success(`🔔 Paciente ${atenciones.find(a => a.id === atencionId)?.pacientes.nombre} entró a ${boxes.find(b => b.id === boxId)?.nombre}`, {
        duration: 5000,
        style: {
          fontSize: '18px',
          padding: '20px',
          fontWeight: 'bold'
        }
      });
      setSelectedBox((prev) => {
        const newState = { ...prev };
        delete newState[atencionId];
        return newState;
      });

      // Forzar recarga de datos para sincronizar con BD
      await loadData();
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
      const { error } = await supabase
        .from("atenciones")
        .update({ estado_ficha: nuevoEstado as 'pendiente' | 'en_mano_paciente' | 'completada' })
        .eq("id", atencionId);

      if (error) throw error;
      
      const mensajes = {
        'en_mano_paciente': 'Ficha entregada al paciente',
        'completada': 'Ficha recibida de vuelta'
      };
      
      toast.success(mensajes[nuevoEstado as keyof typeof mensajes] || 'Estado actualizado');
      await loadData();
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

      if (currentBoxId) {
        const box = boxes.find((b) => b.id === currentBoxId);
        const boxExamIds = box?.box_examenes.map((be) => be.examen_id) || [];
        
        // Si no hay exámenes asociados al box, no hay nada que hacer
        if (boxExamIds.length === 0) {
          toast.error("Este box no tiene exámenes asociados");
          return;
        }
        
        // Obtener exámenes pendientes/incompletos del box directamente de la BD
        const { data: examenesDelBoxDB, error: fetchError } = await supabase
          .from("atencion_examenes")
          .select("id, examen_id, estado")
          .eq("atencion_id", atencionId)
          .in("estado", ["pendiente", "incompleto"])
          .in("examen_id", boxExamIds);

        if (fetchError) throw fetchError;
        
        const examenesDelBox = examenesDelBoxDB || [];

        if (estado === "completado") {
          // Completar: marcar TODOS los exámenes del box como completados
          if (examenesDelBox.length > 0) {
            const idsToComplete = examenesDelBox.map(ae => ae.id);
            const { error: updateExamsError } = await supabase
              .from("atencion_examenes")
              .update({ estado: "completado", fecha_realizacion: new Date().toISOString() })
              .in("id", idsToComplete);
            if (updateExamsError) throw updateExamsError;
          }
        } else {
          // Parcial: marcar solo los seleccionados como completados, el resto como incompleto
          for (const ae of examenesDelBox) {
            const nuevoEstado = seleccionados.has(ae.id) ? "completado" : "incompleto";
            const { error } = await supabase
              .from("atencion_examenes")
              .update({ 
                estado: nuevoEstado, 
                fecha_realizacion: nuevoEstado === "completado" ? new Date().toISOString() : null 
              })
              .eq("id", ae.id);
            if (error) throw error;
          }
        }
      }

      // Limpiar selección local
      setExamenesSeleccionados(prev => {
        const newState = { ...prev };
        delete newState[atencionId];
        return newState;
      });

      // Verificar si quedan exámenes pendientes o incompletos
      const { data: examenesPendientesData, error: examenesError } = await supabase
        .from("atencion_examenes")
        .select("id")
        .eq("atencion_id", atencionId)
        .in("estado", ["pendiente", "incompleto"]);

      if (examenesError) throw examenesError;

      // Actualizar el estado de la atención
      if (examenesPendientesData && examenesPendientesData.length > 0) {
        const { error } = await supabase
          .from("atenciones")
          .update({ estado: "en_espera", box_id: null })
          .eq("id", atencionId);
        if (error) throw error;
        toast.success("Paciente devuelto a espera - tiene exámenes pendientes");
      } else if (currentBoxId) {
        const { error } = await supabase
          .from("atenciones")
          .update({ box_id: null })
          .eq("id", atencionId);
        if (error) throw error;
        toast.success("Exámenes completados - paciente listo para finalizar");
      } else {
        const { error } = await supabase
          .from("atenciones")
          .update({ estado, fecha_fin_atencion: new Date().toISOString() })
          .eq("id", atencionId);
        if (error) throw error;
        toast.success(estado === "completado" ? "Atención completada" : "Atención marcada como incompleta");
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

  // Pacientes listos para finalizar: en_atencion sin box_id asignado (ya liberados de todos los boxes)
  const listosParaFinalizar = atenciones.filter((a) => {
    return a.estado === "en_atencion" && !a.box_id;
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
              <div className="flex flex-wrap gap-3 justify-start">
                {listosParaFinalizar.map((atencion) => (
                  <div
                    key={atencion.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-success/30 bg-success/5"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-bold">#{atencion.numero_ingreso}</Badge>
                      <span className="font-medium text-foreground">{atencion.pacientes.nombre}</span>
                      <Badge variant="outline" className="text-xs">
                        {atencion.pacientes.tipo_servicio === "workmed" ? "WM" : "J"}
                      </Badge>
                      {atencion.boxes && (
                        <span className="text-xs text-muted-foreground">({atencion.boxes.nombre})</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleCompletarAtencion(atencion.id, "completado")}
                      className="gap-2 bg-success hover:bg-success/90"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Finalizar
                    </Button>
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
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-bold">#{atencion.numero_ingreso}</Badge>
                          <div className="font-medium text-foreground">
                            {atencion.pacientes.nombre}
                          </div>
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
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-bold">#{atencion.numero_ingreso}</Badge>
                        <div className="font-medium text-foreground">
                          {atencion.pacientes.nombre}
                        </div>
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
    </div>
  );
};

export default Flujo;
