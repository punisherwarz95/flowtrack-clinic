import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Clock, Play, CheckCircle, XCircle, RefreshCw, Box as BoxIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

const STORAGE_KEY = "mediflow_selected_box";

const MiBox = () => {
  useAuth();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [showBoxSelector, setShowBoxSelector] = useState(false);
  const [tempSelectedBox, setTempSelectedBox] = useState<string>("");
  
  // Pacientes en espera (con exámenes pendientes para este box)
  const [pacientesEnEspera, setPacientesEnEspera] = useState<Atencion[]>([]);
  // Paciente actualmente en el box
  const [pacienteEnAtencion, setPacienteEnAtencion] = useState<Atencion | null>(null);
  // Pacientes completados en este box hoy
  const [pacientesCompletados, setPacientesCompletados] = useState<Atencion[]>([]);
  
  const [atencionExamenes, setAtencionExamenes] = useState<{[atencionId: string]: AtencionExamen[]}>({});
  const [confirmCompletarDialog, setConfirmCompletarDialog] = useState<{open: boolean, atencionId: string | null}>({open: false, atencionId: null});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);

  // Cargar box guardado al inicio
  useEffect(() => {
    const savedBox = localStorage.getItem(STORAGE_KEY);
    if (savedBox) {
      setSelectedBoxId(savedBox);
    } else {
      setShowBoxSelector(true);
    }
    loadBoxes();
  }, []);

  // Cargar datos cuando hay un box seleccionado
  useEffect(() => {
    if (selectedBoxId) {
      loadData();
      
      const channel = supabase
        .channel("mibox-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "atenciones" }, () => loadData())
        .on("postgres_changes", { event: "*", schema: "public", table: "atencion_examenes" }, () => loadData())
        .subscribe();

      const interval = setInterval(() => loadData(), 10000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [selectedBoxId]);

  const loadBoxes = async () => {
    const { data, error } = await supabase
      .from("boxes")
      .select("*, box_examenes(examen_id)")
      .eq("activo", true);
    
    if (error) {
      toast.error("Error al cargar boxes");
      return;
    }
    setBoxes(data || []);
  };

  const loadData = async () => {
    if (!selectedBoxId) return;

    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const currentBox = boxes.find(b => b.id === selectedBoxId);
      const boxExamIds = currentBox?.box_examenes.map(be => be.examen_id) || [];

      // 1. Paciente actualmente en atención en este box
      const { data: enAtencionData, error: enAtencionError } = await supabase
        .from("atenciones")
        .select("*, pacientes(id, nombre, rut, tipo_servicio)")
        .eq("estado", "en_atencion")
        .eq("box_id", selectedBoxId)
        .gte("fecha_ingreso", startOfDay.toISOString())
        .lte("fecha_ingreso", endOfDay.toISOString())
        .maybeSingle();

      if (enAtencionError) throw enAtencionError;
      setPacienteEnAtencion(enAtencionData);

      // 2. Pacientes en espera con exámenes pendientes para este box
      if (boxExamIds.length > 0) {
        // Obtener atenciones en_espera de hoy
        const { data: esperaData, error: esperaError } = await supabase
          .from("atenciones")
          .select("*, pacientes(id, nombre, rut, tipo_servicio)")
          .eq("estado", "en_espera")
          .gte("fecha_ingreso", startOfDay.toISOString())
          .lte("fecha_ingreso", endOfDay.toISOString())
          .order("numero_ingreso", { ascending: true });

        if (esperaError) throw esperaError;

        // Filtrar solo las que tienen exámenes pendientes de este box
        const pacientesConExamenesBox: Atencion[] = [];
        for (const atencion of esperaData || []) {
          const { data: examenes } = await supabase
            .from("atencion_examenes")
            .select("id")
            .eq("atencion_id", atencion.id)
            .eq("estado", "pendiente")
            .in("examen_id", boxExamIds);

          if (examenes && examenes.length > 0) {
            pacientesConExamenesBox.push(atencion);
          }
        }
        setPacientesEnEspera(pacientesConExamenesBox);
      } else {
        setPacientesEnEspera([]);
      }

      // 3. Pacientes completados por este box hoy (los que pasaron por este box)
      const { data: completadosData, error: completadosError } = await supabase
        .from("atenciones")
        .select("*, pacientes(id, nombre, rut, tipo_servicio)")
        .in("estado", ["completado", "incompleto"])
        .gte("fecha_ingreso", startOfDay.toISOString())
        .lte("fecha_ingreso", endOfDay.toISOString())
        .order("fecha_fin_atencion", { ascending: false });

      if (completadosError) throw completadosError;

      // Filtrar solo los que tienen exámenes completados de este box
      const pacientesAtendidosBox: Atencion[] = [];
      for (const atencion of completadosData || []) {
        const { data: examenesCompletados } = await supabase
          .from("atencion_examenes")
          .select("id")
          .eq("atencion_id", atencion.id)
          .eq("estado", "completado")
          .in("examen_id", boxExamIds);

        if (examenesCompletados && examenesCompletados.length > 0) {
          pacientesAtendidosBox.push(atencion);
        }
      }
      setPacientesCompletados(pacientesAtendidosBox);

      // Cargar exámenes para paciente en atención
      if (enAtencionData) {
        await loadAtencionExamenes(enAtencionData.id, boxExamIds);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    }
  };

  const loadAtencionExamenes = async (atencionId: string, boxExamIds: string[]) => {
    const { data, error } = await supabase
      .from("atencion_examenes")
      .select("id, examen_id, estado, examenes(nombre)")
      .eq("atencion_id", atencionId)
      .eq("estado", "pendiente")
      .in("examen_id", boxExamIds);

    if (error) {
      console.error("Error loading examenes:", error);
      return;
    }

    setAtencionExamenes({ [atencionId]: data || [] });
  };

  const handleSelectBox = () => {
    if (!tempSelectedBox) {
      toast.error("Selecciona un box");
      return;
    }
    localStorage.setItem(STORAGE_KEY, tempSelectedBox);
    setSelectedBoxId(tempSelectedBox);
    setShowBoxSelector(false);
    toast.success(`Registrado en ${boxes.find(b => b.id === tempSelectedBox)?.nombre}`);
  };

  const handleLlamarPaciente = async (atencionId: string) => {
    try {
      const { data: updated, error } = await supabase
        .from("atenciones")
        .update({
          estado: "en_atencion",
          box_id: selectedBoxId,
          fecha_inicio_atencion: new Date().toISOString(),
        })
        .eq("id", atencionId)
        .eq("estado", "en_espera")
        .is("box_id", null)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!updated) {
        setShowErrorOverlay(true);
        setTimeout(() => setShowErrorOverlay(false), 1000);
        await loadData();
        toast.error("Este paciente ya fue llamado por otro box");
        return;
      }

      const paciente = pacientesEnEspera.find(p => p.id === atencionId);
      toast.success(`🔔 Paciente ${paciente?.pacientes.nombre} entró al box`, {
        duration: 5000,
        style: { fontSize: '18px', padding: '20px', fontWeight: 'bold' }
      });
      await loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al llamar paciente");
    }
  };

  const handleToggleExamen = async (atencionExamenId: string, currentEstado: string, atencionId: string) => {
    const nuevoEstado = currentEstado === "pendiente" ? "completado" : "pendiente";
    
    setAtencionExamenes(prev => ({
      ...prev,
      [atencionId]: prev[atencionId]?.map(ae => 
        ae.id === atencionExamenId ? { ...ae, estado: nuevoEstado } : ae
      ) || []
    }));

    try {
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
      setAtencionExamenes(prev => ({
        ...prev,
        [atencionId]: prev[atencionId]?.map(ae => 
          ae.id === atencionExamenId ? { ...ae, estado: currentEstado } : ae
        ) || []
      }));
      toast.error("Error al actualizar examen");
    }
  };

  const handleCompletarAtencion = async (atencionId: string, estado: "completado" | "incompleto") => {
    try {
      const currentBox = boxes.find(b => b.id === selectedBoxId);
      const boxExamIds = currentBox?.box_examenes.map(be => be.examen_id) || [];

      if (estado === "completado" && boxExamIds.length > 0) {
        await supabase
          .from("atencion_examenes")
          .update({ estado: "completado", fecha_realizacion: new Date().toISOString() })
          .eq("atencion_id", atencionId)
          .in("examen_id", boxExamIds)
          .eq("estado", "pendiente");
      }

      const { data: examenesPendientes } = await supabase
        .from("atencion_examenes")
        .select("id")
        .eq("atencion_id", atencionId)
        .eq("estado", "pendiente");

      if (examenesPendientes && examenesPendientes.length > 0) {
        await supabase
          .from("atenciones")
          .update({ estado: "en_espera", box_id: null })
          .eq("id", atencionId);
        toast.success("Paciente devuelto a espera - tiene exámenes pendientes");
      } else {
        await supabase
          .from("atenciones")
          .update({ estado, fecha_fin_atencion: new Date().toISOString() })
          .eq("id", atencionId);
        toast.success(estado === "completado" ? "Atención completada" : "Atención marcada como incompleta");
      }

      setConfirmCompletarDialog({ open: false, atencionId: null });
      await loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al completar atención");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const currentBox = boxes.find(b => b.id === selectedBoxId);

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

      {/* Dialog para seleccionar box */}
      <Dialog open={showBoxSelector} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BoxIcon className="h-5 w-5" />
              Seleccionar Box de Trabajo
            </DialogTitle>
            <DialogDescription>
              Selecciona el box en el que trabajarás. Esta selección se mantendrá hasta que cierres sesión.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={tempSelectedBox} onValueChange={setTempSelectedBox}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un box..." />
              </SelectTrigger>
              <SelectContent>
                {boxes.map((box) => (
                  <SelectItem key={box.id} value={box.id}>
                    {box.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSelectBox} className="w-full">
              Confirmar Box
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm completar dialog */}
      <AlertDialog open={confirmCompletarDialog.open} onOpenChange={(open) => setConfirmCompletarDialog({ open, atencionId: confirmCompletarDialog.atencionId })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Completar atención?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas completar la atención de este paciente? Todos los exámenes de este box serán marcados como completados.
            </AlertDialogDescription>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mi Box</h1>
            {currentBox && (
              <p className="text-muted-foreground mt-1">
                Trabajando en: <span className="font-semibold text-primary">{currentBox.nombre}</span>
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pacientes en Espera */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-warning" />
                En Espera ({pacientesEnEspera.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
              {pacientesEnEspera.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No hay pacientes en espera para este box
                </p>
              ) : (
                pacientesEnEspera.map((atencion) => (
                  <div key={atencion.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">#{atencion.numero_ingreso}</Badge>
                          <span className="font-medium text-sm">{atencion.pacientes.nombre}</span>
                        </div>
                        <Badge 
                          variant={atencion.pacientes.tipo_servicio === "workmed" ? "default" : "secondary"}
                          className="mt-1 text-xs"
                        >
                          {atencion.pacientes.tipo_servicio}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLlamarPaciente(atencion.id)}
                        disabled={!!pacienteEnAtencion}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Llamar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Paciente en Atención */}
          <Card className="border-primary/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Play className="h-5 w-5 text-primary" />
                En Atención
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pacienteEnAtencion ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No hay paciente en atención
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="bg-accent/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">#{pacienteEnAtencion.numero_ingreso}</Badge>
                      <span className="font-semibold">{pacienteEnAtencion.pacientes.nombre}</span>
                    </div>
                    <Badge 
                      variant={pacienteEnAtencion.pacientes.tipo_servicio === "workmed" ? "default" : "secondary"}
                    >
                      {pacienteEnAtencion.pacientes.tipo_servicio}
                    </Badge>
                  </div>

                  {/* Exámenes pendientes */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Exámenes:</Label>
                    {atencionExamenes[pacienteEnAtencion.id]?.map((examen) => (
                      <div key={examen.id} className="flex items-center gap-2">
                        <Checkbox
                          id={examen.id}
                          checked={examen.estado === "completado"}
                          onCheckedChange={() => handleToggleExamen(examen.id, examen.estado, pacienteEnAtencion.id)}
                        />
                        <Label htmlFor={examen.id} className="text-sm cursor-pointer">
                          {examen.examenes.nombre}
                        </Label>
                      </div>
                    ))}
                    {(!atencionExamenes[pacienteEnAtencion.id] || atencionExamenes[pacienteEnAtencion.id].length === 0) && (
                      <p className="text-muted-foreground text-sm">Todos los exámenes completados</p>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setConfirmCompletarDialog({ open: true, atencionId: pacienteEnAtencion.id })}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Completar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompletarAtencion(pacienteEnAtencion.id, "incompleto")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Parcial
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pacientes Completados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-success" />
                Atendidos Hoy ({pacientesCompletados.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
              {pacientesCompletados.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No hay pacientes atendidos aún
                </p>
              ) : (
                pacientesCompletados.map((atencion) => (
                  <div key={atencion.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">#{atencion.numero_ingreso}</Badge>
                      <span className="font-medium text-sm">{atencion.pacientes.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={atencion.pacientes.tipo_servicio === "workmed" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {atencion.pacientes.tipo_servicio}
                      </Badge>
                      <Badge 
                        variant={atencion.estado === "completado" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {atencion.estado}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default MiBox;
