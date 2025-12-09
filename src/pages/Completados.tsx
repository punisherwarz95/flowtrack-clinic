import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { CheckCircle, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface AtencionCompletada {
  id: string;
  estado: string;
  fecha_ingreso: string;
  fecha_fin_atencion: string;
  numero_ingreso: number;
  pacientes: {
    id: string;
    nombre: string;
    rut: string;
    tipo_servicio: string;
    empresas: {
      nombre: string;
    } | null;
  };
  atencion_examenes: Array<{
    id: string;
    estado: string;
    examenes: {
      nombre: string;
    };
  }>;
}

const Completados = () => {
  useAuth(); // Protect route
  const [atenciones, setAtenciones] = useState<AtencionCompletada[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [distribucion, setDistribucion] = useState({ workmed: 0, jenner: 0 });
  const [revertDialog, setRevertDialog] = useState<{open: boolean, atencion: AtencionCompletada | null}>({open: false, atencion: null});
  const [selectedExamenesRevert, setSelectedExamenesRevert] = useState<string[]>([]);

  useEffect(() => {
    loadAtenciones();

    const channel = supabase
      .channel("completados-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atenciones" },
        () => loadAtenciones()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]);

  const loadAtenciones = async () => {
    try {
      const startOfDay = selectedDate ? new Date(selectedDate.setHours(0, 0, 0, 0)).toISOString() : null;
      const endOfDay = selectedDate ? new Date(selectedDate.setHours(23, 59, 59, 999)).toISOString() : null;

      let query = supabase
        .from("atenciones")
        .select("*, pacientes(id, nombre, rut, tipo_servicio, empresas(nombre)), atencion_examenes(id, estado, examenes(nombre))")
        .eq("estado", "completado")
        .order("fecha_fin_atencion", { ascending: false });

      if (startOfDay && endOfDay) {
        query = query.gte("fecha_ingreso", startOfDay).lte("fecha_ingreso", endOfDay);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAtenciones(data || []);
      
      // Calcular distribución por tipo de servicio
      const workmedCount = data?.filter(a => a.pacientes.tipo_servicio === "workmed").length || 0;
      const jennerCount = data?.filter(a => a.pacientes.tipo_servicio === "jenner").length || 0;
      setDistribucion({ workmed: workmedCount, jenner: jennerCount });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar atenciones completadas");
    }
  };

  const handleOpenRevertDialog = (atencion: AtencionCompletada) => {
    setRevertDialog({ open: true, atencion });
    // Pre-seleccionar todos los exámenes completados
    const completedExams = atencion.atencion_examenes
      .filter(ae => ae.estado === "completado")
      .map(ae => ae.id);
    setSelectedExamenesRevert(completedExams);
  };

  const handleRevertAtencion = async () => {
    if (!revertDialog.atencion || selectedExamenesRevert.length === 0) {
      toast.error("Selecciona al menos un examen para revertir");
      return;
    }

    try {
      // Revertir los exámenes seleccionados a pendiente
      const { error: examenesError } = await supabase
        .from("atencion_examenes")
        .update({ estado: "pendiente", fecha_realizacion: null })
        .in("id", selectedExamenesRevert);

      if (examenesError) throw examenesError;

      // Devolver la atención a en_espera
      const { error: atencionError } = await supabase
        .from("atenciones")
        .update({ 
          estado: "en_espera", 
          box_id: null,
          fecha_fin_atencion: null 
        })
        .eq("id", revertDialog.atencion.id);

      if (atencionError) throw atencionError;

      toast.success(`Paciente devuelto a espera con ${selectedExamenesRevert.length} examen(es) pendiente(s)`);
      setRevertDialog({ open: false, atencion: null });
      setSelectedExamenesRevert([]);
      await loadAtenciones();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al revertir atención");
    }
  };

  const toggleExamenRevert = (examenId: string) => {
    setSelectedExamenesRevert(prev => 
      prev.includes(examenId) 
        ? prev.filter(id => id !== examenId)
        : [...prev, examenId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Atenciones Completadas</h1>
              <p className="text-muted-foreground">Historial de pacientes con atención finalizada</p>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Total Completadas: {atenciones.length}</span>
              <div className="flex gap-2 text-sm font-normal text-muted-foreground">
                <span>WM: {distribucion.workmed.toString().padStart(2, "0")}</span>
                <span>J: {distribucion.jenner.toString().padStart(2, "0")}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {atenciones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay atenciones completadas para esta fecha
              </div>
            ) : (
              atenciones.map((atencion) => (
                <div
                  key={atencion.id}
                  className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-bold">#{atencion.numero_ingreso}</Badge>
                        <div className="font-medium text-foreground">
                          {atencion.pacientes.nombre}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {atencion.pacientes.tipo_servicio === "workmed" ? "WM" : "J"}
                        </Badge>
                        <Badge className="bg-green-600">Completado</Badge>
                      </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleOpenRevertDialog(atencion)}
                      className="shrink-0"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Devolver
                    </Button>
                      <div className="text-sm text-muted-foreground">
                        Empresa: {atencion.pacientes.empresas?.nombre || "Sin empresa"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        <div>Ingreso: {format(new Date(atencion.fecha_ingreso), "dd/MM/yyyy HH:mm", { locale: es })}</div>
                        <div>Finalizado: {format(new Date(atencion.fecha_fin_atencion), "dd/MM/yyyy HH:mm", { locale: es })}</div>
                        <div className="font-medium mt-1">
                          Tiempo en centro: {Math.floor((new Date(atencion.fecha_fin_atencion).getTime() - new Date(atencion.fecha_ingreso).getTime()) / 60000)} min
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-muted/50 rounded-md">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Exámenes realizados:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {atencion.atencion_examenes.map((ae) => (
                        <Badge
                          key={ae.id}
                          variant={ae.estado === "completado" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {ae.examenes.nombre} {ae.estado === "completado" ? "✓" : "○"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Dialog para revertir atención */}
        <Dialog open={revertDialog.open} onOpenChange={(open) => {
          setRevertDialog({ open, atencion: open ? revertDialog.atencion : null });
          if (!open) setSelectedExamenesRevert([]);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Devolver Paciente a Espera</DialogTitle>
              <DialogDescription>
                Selecciona los exámenes que deseas revertir a pendiente para el paciente{" "}
                <span className="font-semibold">{revertDialog.atencion?.pacientes.nombre}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Label className="text-sm font-medium">Exámenes a revertir:</Label>
              {revertDialog.atencion?.atencion_examenes
                .filter(ae => ae.estado === "completado")
                .map((ae) => (
                  <div key={ae.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`revert-${ae.id}`}
                      checked={selectedExamenesRevert.includes(ae.id)}
                      onCheckedChange={() => toggleExamenRevert(ae.id)}
                    />
                    <Label htmlFor={`revert-${ae.id}`} className="cursor-pointer">
                      {ae.examenes.nombre}
                    </Label>
                  </div>
                ))}
              {revertDialog.atencion?.atencion_examenes.filter(ae => ae.estado === "completado").length === 0 && (
                <p className="text-muted-foreground text-sm">No hay exámenes completados para revertir</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevertDialog({ open: false, atencion: null })}>
                Cancelar
              </Button>
              <Button onClick={handleRevertAtencion} disabled={selectedExamenesRevert.length === 0}>
                Devolver a Espera
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Completados;
