import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import PatientCombobox from "@/components/PatientCombobox";
import { Clock, UserPlus, Play, CheckCircle, XCircle, Calendar as CalendarIcon, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  const [atenciones, setAtenciones] = useState<Atencion[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedBox, setSelectedBox] = useState<{[atencionId: string]: string}>({});
  const [showExamenesDialog, setShowExamenesDialog] = useState(false);
  const [selectedExamenes, setSelectedExamenes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [pendingBoxes, setPendingBoxes] = useState<{[atencionId: string]: string[]}>({});
  const [atencionExamenes, setAtencionExamenes] = useState<{[atencionId: string]: AtencionExamen[]}>({});
  const [examenesPendientes, setExamenesPendientes] = useState<{[atencionId: string]: string[]}>({});
  const [confirmCompletarDialog, setConfirmCompletarDialog] = useState<{open: boolean, atencionId: string | null}>({open: false, atencionId: null});

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
        const { data: atencionExamenes, error } = await supabase
          .from("atencion_examenes")
          .select("examen_id")
          .eq("atencion_id", atencion.id)
          .eq("estado", "pendiente");

        if (error) throw error;

        const examenesIds = atencionExamenes?.map(ae => ae.examen_id) || [];
        const nombresExamenes = examenesList
          .filter(ex => examenesIds.includes(ex.id))
          .map(ex => ex.nombre);

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

    for (const atencion of atenciones) {
      if (atencion.estado === "en_atencion" && atencion.box_id) {
        try {
          const box = boxesList.find(b => b.id === atencion.box_id);
          const boxExamIds = box?.box_examenes.map(be => be.examen_id) || [];

          const { data: examenesData, error } = await supabase
            .from("atencion_examenes")
            .select("id, examen_id, estado, examenes(nombre)")
            .eq("atencion_id", atencion.id)
            .in("examen_id", boxExamIds);

          if (error) throw error;
          newAtencionExamenes[atencion.id] = examenesData || [];
        } catch (error) {
          console.error("Error loading atencion examenes:", error);
          newAtencionExamenes[atencion.id] = [];
        }
      }
    }

    setAtencionExamenes(newAtencionExamenes);
  };

  const loadPendingBoxesForAtenciones = async (atenciones: Atencion[], boxesList: Box[]) => {
    const newPendingBoxes: {[atencionId: string]: string[]} = {};

    for (const atencion of atenciones) {
      try {
        const { data: atencionExamenes, error } = await supabase
          .from("atencion_examenes")
          .select("examen_id")
          .eq("atencion_id", atencion.id)
          .eq("estado", "pendiente");

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

  const handleIngresoClick = () => {
    if (!selectedPatient) {
      toast.error("Selecciona un paciente");
      return;
    }
    setShowExamenesDialog(true);
  };

  const handleConfirmIngreso = async () => {
    if (selectedExamenes.length === 0) {
      toast.error("Selecciona al menos un examen");
      return;
    }

    try {
      const { data: atencionData, error: atencionError } = await supabase
        .from("atenciones")
        .insert([
          {
            paciente_id: selectedPatient,
            estado: "en_espera",
          },
        ])
        .select()
        .single();

      if (atencionError) throw atencionError;

      const atencionExamenes = selectedExamenes.map((examenId) => ({
        atencion_id: atencionData.id,
        examen_id: examenId,
        estado: "pendiente" as const,
      }));

      const { error: examenesError } = await supabase
        .from("atencion_examenes")
        .insert(atencionExamenes);

      if (examenesError) throw examenesError;

      toast.success("Paciente ingresado a la lista de espera");
      setSelectedPatient("");
      setSelectedExamenes([]);
      setShowExamenesDialog(false);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al ingresar paciente");
    }
  };

  const handleIniciarAtencion = async (atencionId: string) => {
    const boxId = selectedBox[atencionId];
    if (!boxId) {
      toast.error("Selecciona un box");
      return;
    }

    try {
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

      // Forzar recarga inmediata de datos
      await loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al iniciar atención");
    }
  };


  const handleToggleExamen = async (atencionExamenId: string, currentEstado: string) => {
    try {
      const nuevoEstado = currentEstado === "pendiente" ? "completado" : "pendiente";
      const { error } = await supabase
        .from("atencion_examenes")
        .update({ 
          estado: nuevoEstado,
          fecha_realizacion: nuevoEstado === "completado" ? new Date().toISOString() : null
        })
        .eq("id", atencionExamenId);

      if (error) throw error;
      toast.success(`Examen marcado como ${nuevoEstado}`);
      await loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar examen");
    }
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
      // 1) Si se presiona "Completar" dentro de un box, marcar como completados
      // los exámenes de ese box para esta atención
      const atencionActual = atenciones.find((a) => a.id === atencionId);
      const currentBoxId = atencionActual?.box_id;

      if (estado === "completado" && currentBoxId) {
        const boxExamIds = boxes.find((b) => b.id === currentBoxId)?.box_examenes.map((be) => be.examen_id) || [];
        if (boxExamIds.length > 0) {
          const { error: updateExamsError } = await supabase
            .from("atencion_examenes")
            .update({ estado: "completado", fecha_realizacion: new Date().toISOString() })
            .eq("atencion_id", atencionId)
            .in("examen_id", boxExamIds)
            .eq("estado", "pendiente");
          if (updateExamsError) throw updateExamsError;
        }
      }

      // 2) Verificar si quedan exámenes pendientes luego de lo anterior
      const { data: examenesPendientes, error: examenesError } = await supabase
        .from("atencion_examenes")
        .select("id")
        .eq("atencion_id", atencionId)
        .eq("estado", "pendiente");

      if (examenesError) throw examenesError;

      // 3) Actualizar el estado de la atención según si quedan pendientes o no
      if (examenesPendientes && examenesPendientes.length > 0) {
        const { error } = await supabase
          .from("atenciones")
          .update({
            estado: "en_espera",
            box_id: null,
          })
          .eq("id", atencionId);

        if (error) throw error;
        toast.success("Paciente devuelto a espera - tiene exámenes pendientes");
      } else {
        const { error } = await supabase
          .from("atenciones")
          .update({
            estado,
            fecha_fin_atencion: new Date().toISOString(),
          })
          .eq("id", atencionId);

        if (error) throw error;
        toast.success(estado === "completado" ? "Atención completada" : "Atención marcada como incompleta");
      }

      // 4) Refrescar datos inmediatamente para reflejar cambios
      await loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al actualizar atención");
    }
  };

  // Solo mostrar en espera los pacientes que NO tienen box asignado
  const enEspera = atenciones.filter((a) => a.estado === "en_espera" && !a.box_id);
  const enAtencion = atenciones.filter((a) => a.estado === "en_atencion");

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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Ingresar Paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <PatientCombobox value={selectedPatient} onSelect={setSelectedPatient} />
              </div>
              <Button onClick={handleIngresoClick} className="gap-2">
                <Clock className="h-4 w-4" />
                Agregar a Espera
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showExamenesDialog} onOpenChange={setShowExamenesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Seleccionar Exámenes</DialogTitle>
              <DialogDescription>
                Selecciona los exámenes que el paciente debe realizar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {examenes.map((examen) => (
                <div key={examen.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={examen.id}
                    checked={selectedExamenes.includes(examen.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedExamenes([...selectedExamenes, examen.id]);
                      } else {
                        setSelectedExamenes(
                          selectedExamenes.filter((id) => id !== examen.id)
                        );
                      }
                    }}
                  />
                  <Label htmlFor={examen.id} className="cursor-pointer">
                    <div className="font-medium">{examen.nombre}</div>
                    {examen.descripcion && (
                      <div className="text-sm text-muted-foreground">
                        {examen.descripcion}
                      </div>
                    )}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExamenesDialog(false);
                  setSelectedExamenes([]);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmIngreso}>Confirmar</Button>
            </div>
          </DialogContent>
        </Dialog>

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
              <CardTitle className="text-warning">En Espera ({enEspera.length})</CardTitle>
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
                        {examenesPendientes[atencion.id] && examenesPendientes[atencion.id].length > 0 && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Exámenes pendientes: {examenesPendientes[atencion.id].join(", ")}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span>Ingreso: {format(new Date(atencion.fecha_ingreso), "HH:mm", { locale: es })}</span>
                          <Badge variant="outline" className="text-xs">
                            {atencion.pacientes.tipo_servicio === "workmed" ? "WM" : "J"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Ficha: 
                            {atencion.estado_ficha === 'pendiente' && ' Pendiente'}
                            {atencion.estado_ficha === 'en_mano_paciente' && ' Con paciente'}
                            {atencion.estado_ficha === 'completada' && ' ✓ Recibida'}
                          </span>
                          {atencion.estado_ficha === 'pendiente' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCambiarEstadoFicha(atencion.id, 'en_mano_paciente')}
                              className="h-6 px-2 text-xs"
                            >
                              Entregar
                            </Button>
                          )}
                          {atencion.estado_ficha === 'en_mano_paciente' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCambiarEstadoFicha(atencion.id, 'completada')}
                              className="h-6 px-2 text-xs"
                            >
                              Recibir
                            </Button>
                          )}
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
                      {examenesPendientes[atencion.id] && examenesPendientes[atencion.id].length > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Exámenes pendientes: {examenesPendientes[atencion.id].join(", ")}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>Ingreso: {format(new Date(atencion.fecha_ingreso), "HH:mm", { locale: es })}</span>
                        <Badge variant="outline" className="text-xs">
                          {atencion.pacientes.tipo_servicio === "workmed" ? "WM" : "J"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Ficha: 
                          {atencion.estado_ficha === 'pendiente' && ' Pendiente'}
                          {atencion.estado_ficha === 'en_mano_paciente' && ' Con paciente'}
                          {atencion.estado_ficha === 'completada' && ' ✓ Recibida'}
                        </span>
                        {atencion.estado_ficha === 'pendiente' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCambiarEstadoFicha(atencion.id, 'en_mano_paciente')}
                            className="h-6 px-2 text-xs"
                          >
                            Entregar
                          </Button>
                        )}
                        {atencion.estado_ficha === 'en_mano_paciente' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCambiarEstadoFicha(atencion.id, 'completada')}
                            className="h-6 px-2 text-xs"
                          >
                            Recibir
                          </Button>
                        )}
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
                        {atencionExamenes[atencion.id].map((ae) => (
                          <div key={ae.id} className="flex items-center gap-2">
                            <Checkbox
                              id={ae.id}
                              checked={ae.estado === "completado"}
                              onCheckedChange={() => handleToggleExamen(ae.id, ae.estado)}
                            />
                            <Label htmlFor={ae.id} className="text-sm cursor-pointer flex-1">
                              {ae.examenes.nombre}
                            </Label>
                            <Badge variant={ae.estado === "completado" ? "default" : "secondary"} className="text-xs">
                              {ae.estado === "completado" ? "✓" : "○"}
                            </Badge>
                          </div>
                        ))}
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
                      variant="destructive"
                      onClick={() => handleCompletarAtencion(atencion.id, "incompleto")}
                      className="flex-1 gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Incompleto
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
