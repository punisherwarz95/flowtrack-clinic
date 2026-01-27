import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Clock, Play, CheckCircle, XCircle, RefreshCw, Box as BoxIcon, Settings, FileText, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { GlobalChat } from "@/components/GlobalChat";
import { useAtencionDocumentos } from "@/hooks/useAtencionDocumentos";
import { DocumentoFormViewer, DocumentoContextData } from "@/components/DocumentoFormViewer";

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
    empresas?: {
      nombre: string;
    } | null;
  };
}

interface AtencionConExamenes extends Atencion {
  examenesRealizados?: string[];
  examenesPendientes?: string[];
}

// Constante para la query de paciente con todos los campos
const PACIENTE_SELECT = "*, pacientes(id, nombre, rut, tipo_servicio, fecha_nacimiento, email, telefono, direccion, empresa_id, empresas(nombre))";

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
  const { user } = useAuth();
  const { isAdmin } = usePermissions(user);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [showBoxSelector, setShowBoxSelector] = useState(false);
  const [tempSelectedBox, setTempSelectedBox] = useState<string>("");
  
  // Pacientes en espera (con exámenes pendientes para este box)
  const [pacientesEnEspera, setPacientesEnEspera] = useState<AtencionConExamenes[]>([]);
  // Pacientes actualmente en el box
  const [pacientesEnAtencion, setPacientesEnAtencion] = useState<Atencion[]>([]);
  // Pacientes completados en este box hoy (con sus exámenes realizados)
  const [pacientesCompletados, setPacientesCompletados] = useState<AtencionConExamenes[]>([]);
  // Pacientes pendientes en otros boxes (no pueden ser llamados)
  const [pacientesEnOtrosBoxes, setPacientesEnOtrosBoxes] = useState<number>(0);
  
  const [atencionExamenes, setAtencionExamenes] = useState<{[atencionId: string]: AtencionExamen[]}>({});
  const [confirmCompletarDialog, setConfirmCompletarDialog] = useState<{open: boolean, atencionId: string | null}>({open: false, atencionId: null});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showErrorOverlay, setShowErrorOverlay] = useState(false);
  
  // Estados para documentos
  const [documentosDialogOpen, setDocumentosDialogOpen] = useState(false);
  const [selectedAtencionForDocs, setSelectedAtencionForDocs] = useState<string | null>(null);
  const [selectedPacienteContext, setSelectedPacienteContext] = useState<DocumentoContextData | undefined>(undefined);
  
  // Hook para documentos de la atención seleccionada
  const { 
    documentos: atencionDocumentos, 
    campos: documentoCampos, 
    reload: reloadDocumentos,
    pendingCount: documentosPendientes 
  } = useAtencionDocumentos(selectedAtencionForDocs);

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

      // Cargar box directamente para asegurar que tenemos los exámenes
      const { data: boxData } = await supabase
        .from("boxes")
        .select("*, box_examenes(examen_id)")
        .eq("id", selectedBoxId)
        .single();

      const boxExamIds = boxData?.box_examenes?.map((be: { examen_id: string }) => be.examen_id) || [];

      // 1. Pacientes actualmente en atención en este box
      const { data: enAtencionData, error: enAtencionError } = await supabase
        .from("atenciones")
        .select(PACIENTE_SELECT)
        .eq("estado", "en_atencion")
        .eq("box_id", selectedBoxId)
        .gte("fecha_ingreso", startOfDay.toISOString())
        .lte("fecha_ingreso", endOfDay.toISOString())
        .order("numero_ingreso", { ascending: true });

      if (enAtencionError) throw enAtencionError;
      setPacientesEnAtencion(enAtencionData || []);

      // 2. Pacientes en espera con exámenes pendientes para este box
      if (boxExamIds.length > 0) {
        // Obtener atenciones en_espera de hoy
        const { data: esperaData, error: esperaError } = await supabase
          .from("atenciones")
          .select(PACIENTE_SELECT)
          .eq("estado", "en_espera")
          .gte("fecha_ingreso", startOfDay.toISOString())
          .lte("fecha_ingreso", endOfDay.toISOString())
          .order("numero_ingreso", { ascending: true });

        if (esperaError) throw esperaError;

        // Filtrar solo las que tienen exámenes pendientes de este box y obtener nombres
        const pacientesConExamenesBox: AtencionConExamenes[] = [];
        for (const atencion of esperaData || []) {
          const { data: examenes } = await supabase
            .from("atencion_examenes")
            .select("id, examenes(nombre)")
            .eq("atencion_id", atencion.id)
            .in("estado", ["pendiente", "incompleto"])
            .in("examen_id", boxExamIds);

          if (examenes && examenes.length > 0) {
            pacientesConExamenesBox.push({
              ...atencion,
              examenesPendientes: examenes.map((e: any) => e.examenes?.nombre || "")
            });
          }
        }
        setPacientesEnEspera(pacientesConExamenesBox);

        // 2b. Contar pacientes en otros boxes con exámenes pendientes para este box
        const { data: enOtrosBoxesData } = await supabase
          .from("atenciones")
          .select("id")
          .eq("estado", "en_atencion")
          .neq("box_id", selectedBoxId)
          .not("box_id", "is", null)
          .gte("fecha_ingreso", startOfDay.toISOString())
          .lte("fecha_ingreso", endOfDay.toISOString());

        let countEnOtrosBoxes = 0;
        for (const atencion of enOtrosBoxesData || []) {
          const { data: examenes } = await supabase
            .from("atencion_examenes")
            .select("id")
            .eq("atencion_id", atencion.id)
            .in("estado", ["pendiente", "incompleto"])
            .in("examen_id", boxExamIds);

          if (examenes && examenes.length > 0) {
            countEnOtrosBoxes++;
          }
        }
        setPacientesEnOtrosBoxes(countEnOtrosBoxes);
      } else {
        setPacientesEnEspera([]);
        setPacientesEnOtrosBoxes(0);
      }

      // 3. Pacientes atendidos en este box hoy (que tienen exámenes completados de este box)
      // Buscar en TODAS las atenciones de hoy, no solo las completadas
      if (boxExamIds.length > 0) {
        const { data: todasAtenciones, error: todasError } = await supabase
          .from("atenciones")
          .select("*, pacientes(id, nombre, rut, tipo_servicio)")
          .gte("fecha_ingreso", startOfDay.toISOString())
          .lte("fecha_ingreso", endOfDay.toISOString())
          .order("numero_ingreso", { ascending: true });

        if (todasError) throw todasError;

        const pacientesAtendidosBox: AtencionConExamenes[] = [];
        for (const atencion of todasAtenciones || []) {
          // Buscar exámenes COMPLETADOS de este box para esta atención
          const { data: examenesCompletados } = await supabase
            .from("atencion_examenes")
            .select("id, examenes(nombre)")
            .eq("atencion_id", atencion.id)
            .eq("estado", "completado")
            .in("examen_id", boxExamIds);

          if (examenesCompletados && examenesCompletados.length > 0) {
            pacientesAtendidosBox.push({
              ...atencion,
              examenesRealizados: examenesCompletados.map((e: any) => e.examenes?.nombre || "")
            });
          }
        }
        setPacientesCompletados(pacientesAtendidosBox);
      } else {
        setPacientesCompletados([]);
      }

      // Cargar exámenes para todos los pacientes en atención
      if (enAtencionData && enAtencionData.length > 0) {
        for (const atencion of enAtencionData) {
          await loadAtencionExamenes(atencion.id, boxExamIds);
        }
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
      .in("estado", ["pendiente", "incompleto"])
      .in("examen_id", boxExamIds);

    if (error) {
      console.error("Error loading examenes:", error);
      return;
    }

    setAtencionExamenes(prev => ({ ...prev, [atencionId]: data || [] }));
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
          fecha_realizacion: nuevoEstado === "completado" ? new Date().toISOString() : null,
          realizado_por: nuevoEstado === "completado" ? (user?.id || null) : null
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
          .update({ 
            estado: "completado", 
            fecha_realizacion: new Date().toISOString(),
            realizado_por: user?.id || null
          })
          .eq("atencion_id", atencionId)
          .in("examen_id", boxExamIds)
          .in("estado", ["pendiente", "incompleto"]);
      }

      const { data: examenesPendientesData } = await supabase
        .from("atencion_examenes")
        .select("id")
        .eq("atencion_id", atencionId)
        .in("estado", ["pendiente", "incompleto"]);

      if (examenesPendientesData && examenesPendientesData.length > 0) {
        // Si quedan exámenes pendientes, devolver a espera
        await supabase
          .from("atenciones")
          .update({ estado: "en_espera", box_id: null })
          .eq("id", atencionId);
        toast.success("Paciente devuelto a espera - tiene exámenes pendientes");
      } else {
        // Si NO quedan pendientes, solo liberar el box pero mantener en_atencion
        // El paciente aparecerá en "Listos para Finalizar" en Flujo
        await supabase
          .from("atenciones")
          .update({ box_id: null })
          .eq("id", atencionId);
        toast.success("Exámenes completados - paciente listo para finalizar en Flujo");
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

  const handleCambiarEstadoFicha = async (atencionId: string, nuevoEstado: "pendiente" | "en_mano_paciente" | "completada") => {
    try {
      const { error } = await supabase
        .from("atenciones")
        .update({ estado_ficha: nuevoEstado })
        .eq("id", atencionId);

      if (error) throw error;
      const mensajes = {
        pendiente: "Ficha: Pendiente",
        en_mano_paciente: "Ficha: Con Paciente",
        completada: "Ficha: Recibida"
      };
      toast.success(mensajes[nuevoEstado]);
      await loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cambiar estado de ficha");
    }
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
          <div className="flex items-center gap-4">
            {selectedBoxId && (
              <div className="flex gap-3">
                <Badge variant="default" className="text-sm px-3 py-1">
                  {pacientesEnEspera.length} disponibles
                </Badge>
                {pacientesEnOtrosBoxes > 0 && (
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {pacientesEnOtrosBoxes} en otros boxes
                  </Badge>
                )}
              </div>
            )}
            {isAdmin && selectedBoxId && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setTempSelectedBox(selectedBoxId);
                  setShowBoxSelector(true);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Cambiar Box
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
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
                        {atencion.pacientes.rut && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            RUT: {atencion.pacientes.rut}
                          </div>
                        )}
                    <Badge 
                      variant={atencion.pacientes.tipo_servicio === "workmed" ? "default" : "secondary"}
                      className="mt-1 text-xs"
                    >
                      {atencion.pacientes.tipo_servicio}
                    </Badge>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Checkbox
                          id={`pendiente-espera-${atencion.id}`}
                          checked={atencion.estado_ficha === 'pendiente'}
                          onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'pendiente')}
                        />
                        <Label htmlFor={`pendiente-espera-${atencion.id}`} className="text-xs cursor-pointer">
                          Pendiente
                        </Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          id={`en_mano-espera-${atencion.id}`}
                          checked={atencion.estado_ficha === 'en_mano_paciente'}
                          onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'en_mano_paciente')}
                        />
                        <Label htmlFor={`en_mano-espera-${atencion.id}`} className="text-xs cursor-pointer">
                          Con Paciente
                        </Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          id={`completada-espera-${atencion.id}`}
                          checked={atencion.estado_ficha === 'completada'}
                          onCheckedChange={() => handleCambiarEstadoFicha(atencion.id, 'completada')}
                        />
                        <Label htmlFor={`completada-espera-${atencion.id}`} className="text-xs cursor-pointer">
                          Recibida
                        </Label>
                      </div>
                    </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleLlamarPaciente(atencion.id)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Llamar
                      </Button>
                    </div>
                    {/* Exámenes pendientes para este box */}
                    {atencion.examenesPendientes && atencion.examenesPendientes.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t">
                        {atencion.examenesPendientes.map((examen, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {examen}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Pacientes en Atención */}
          <Card className="border-primary/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Play className="h-5 w-5 text-primary" />
                En Atención ({pacientesEnAtencion.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
              {pacientesEnAtencion.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No hay pacientes en atención
                </p>
              ) : (
                pacientesEnAtencion.map((paciente) => (
                  <div key={paciente.id} className="bg-accent/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{paciente.numero_ingreso}</Badge>
                      <span className="font-semibold">{paciente.pacientes.nombre}</span>
                    </div>
                    {paciente.pacientes.rut && (
                      <div className="text-sm text-muted-foreground">
                        RUT: {paciente.pacientes.rut}
                      </div>
                    )}
                    <Badge 
                      variant={paciente.pacientes.tipo_servicio === "workmed" ? "default" : "secondary"}
                    >
                      {paciente.pacientes.tipo_servicio}
                    </Badge>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Checkbox
                          id={`pendiente-aten-${paciente.id}`}
                          checked={paciente.estado_ficha === 'pendiente'}
                          onCheckedChange={() => handleCambiarEstadoFicha(paciente.id, 'pendiente')}
                        />
                        <Label htmlFor={`pendiente-aten-${paciente.id}`} className="text-xs cursor-pointer">
                          Pendiente
                        </Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          id={`en_mano-aten-${paciente.id}`}
                          checked={paciente.estado_ficha === 'en_mano_paciente'}
                          onCheckedChange={() => handleCambiarEstadoFicha(paciente.id, 'en_mano_paciente')}
                        />
                        <Label htmlFor={`en_mano-aten-${paciente.id}`} className="text-xs cursor-pointer">
                          Con Paciente
                        </Label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          id={`completada-aten-${paciente.id}`}
                          checked={paciente.estado_ficha === 'completada'}
                          onCheckedChange={() => handleCambiarEstadoFicha(paciente.id, 'completada')}
                        />
                        <Label htmlFor={`completada-aten-${paciente.id}`} className="text-xs cursor-pointer">
                          Recibida
                        </Label>
                      </div>
                    </div>

                    {/* Exámenes pendientes */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Exámenes:</Label>
                      {atencionExamenes[paciente.id]?.map((examen) => (
                        <div key={examen.id} className="flex items-center gap-2">
                          <Checkbox
                            id={examen.id}
                            checked={examen.estado === "completado"}
                            onCheckedChange={() => handleToggleExamen(examen.id, examen.estado, paciente.id)}
                          />
                          <Label htmlFor={examen.id} className="text-sm cursor-pointer">
                            {examen.examenes.nombre}
                          </Label>
                        </div>
                      ))}
                      {(!atencionExamenes[paciente.id] || atencionExamenes[paciente.id].length === 0) && (
                        <p className="text-muted-foreground text-sm">Todos los exámenes completados</p>
                      )}
                    </div>

                    {/* Botón para ver documentos */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedAtencionForDocs(paciente.id);
                        setSelectedPacienteContext({
                          paciente: {
                            nombre: paciente.pacientes.nombre,
                            rut: paciente.pacientes.rut || undefined,
                            fecha_nacimiento: paciente.pacientes.fecha_nacimiento || undefined,
                            email: paciente.pacientes.email || undefined,
                            telefono: paciente.pacientes.telefono || undefined,
                            direccion: paciente.pacientes.direccion || undefined,
                          },
                          empresa: paciente.pacientes.empresas?.nombre,
                          numero_ingreso: paciente.numero_ingreso,
                        });
                        setDocumentosDialogOpen(true);
                      }}
                    >
                      <ClipboardList className="h-4 w-4 mr-2" />
                      Ver Documentos
                    </Button>

                    {/* Botones de acción */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setConfirmCompletarDialog({ open: true, atencionId: paciente.id })}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Completar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCompletarAtencion(paciente.id, "incompleto")}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Parcial
                      </Button>
                    </div>
                  </div>
                ))
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
                  <div key={atencion.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">#{atencion.numero_ingreso}</Badge>
                      <span className="font-medium text-sm">{atencion.pacientes.nombre}</span>
                    </div>
                    {atencion.pacientes.rut && (
                      <div className="text-xs text-muted-foreground">
                        RUT: {atencion.pacientes.rut}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={atencion.pacientes.tipo_servicio === "workmed" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {atencion.pacientes.tipo_servicio}
                      </Badge>
                    </div>
                    {/* Exámenes realizados en este box */}
                    {atencion.examenesRealizados && atencion.examenesRealizados.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {atencion.examenesRealizados.map((examen, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-green-100 text-green-800">
                            ✓ {examen}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Chat Global */}
      <GlobalChat />

      {/* Dialog para ver documentos */}
      <Dialog open={documentosDialogOpen} onOpenChange={setDocumentosDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Documentos del Paciente
            </DialogTitle>
            <DialogDescription>
              {documentosPendientes > 0 
                ? `${documentosPendientes} documento(s) pendiente(s) de completar`
                : "Todos los documentos están completos"
              }
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {atencionDocumentos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay documentos asignados a esta atención
                </p>
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
