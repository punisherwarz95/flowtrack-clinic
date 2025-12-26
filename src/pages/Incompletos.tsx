import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { AlertCircle, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface AtencionIncompleta {
  id: string;
  estado: string;
  fecha_ingreso: string;
  fecha_fin_atencion: string;
  numero_ingreso: number;
  paciente_id: string;
  observaciones: string | null;
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
    examen_id: string;
    examenes: {
      nombre: string;
    };
  }>;
}

const Incompletos = () => {
  useAuth(); // Protect route
  const [atenciones, setAtenciones] = useState<AtencionIncompleta[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [distribucion, setDistribucion] = useState({ workmed: 0, jenner: 0 });
  const [reactivateDialog, setReactivateDialog] = useState<{open: boolean, atencion: AtencionIncompleta | null}>({open: false, atencion: null});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAtenciones();

    const channel = supabase
      .channel("incompletos-changes")
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
        .select("*, pacientes(id, nombre, rut, tipo_servicio, empresas(nombre)), atencion_examenes(id, estado, examen_id, examenes(nombre))")
        .eq("estado", "incompleto")
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
      toast.error("Error al cargar atenciones incompletas");
    }
  };

  const handleOpenReactivateDialog = (atencion: AtencionIncompleta) => {
    setReactivateDialog({ open: true, atencion });
  };

  const handleReactivateAtencion = async () => {
    if (!reactivateDialog.atencion) return;

    setIsLoading(true);
    try {
      const atencionOriginal = reactivateDialog.atencion;
      
      // Obtener los exámenes incompletos de la atención original
      const examenesIncompletos = atencionOriginal.atencion_examenes
        .filter(ae => ae.estado === "incompleto")
        .map(ae => ae.examen_id);

      if (examenesIncompletos.length === 0) {
        toast.error("No hay exámenes incompletos para reactivar");
        setIsLoading(false);
        return;
      }

      // Crear una nueva atención para el mismo paciente
      // El trigger calcular_numero_ingreso generará automáticamente el nuevo número
      const { data: nuevaAtencion, error: atencionError } = await supabase
        .from("atenciones")
        .insert({
          paciente_id: atencionOriginal.paciente_id,
          estado: "en_espera",
          fecha_ingreso: new Date().toISOString(),
          observaciones: `Reactivado desde atención incompleta #${atencionOriginal.numero_ingreso}`
        })
        .select()
        .single();

      if (atencionError) throw atencionError;

      // Crear los atencion_examenes para la nueva atención con los exámenes incompletos
      const nuevosExamenes = examenesIncompletos.map(examenId => ({
        atencion_id: nuevaAtencion.id,
        examen_id: examenId,
        estado: "pendiente" as const
      }));

      const { error: examenesError } = await supabase
        .from("atencion_examenes")
        .insert(nuevosExamenes);

      if (examenesError) throw examenesError;

      toast.success(`Paciente reactivado con nuevo número de atención #${nuevaAtencion.numero_ingreso}`);
      setReactivateDialog({ open: false, atencion: null });
      await loadAtenciones();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al reactivar atención");
    } finally {
      setIsLoading(false);
    }
  };

  const getExamenesIncompletos = (atencion: AtencionIncompleta) => {
    return atencion.atencion_examenes.filter(ae => ae.estado === "incompleto");
  };

  const getExamenesCompletados = (atencion: AtencionIncompleta) => {
    return atencion.atencion_examenes.filter(ae => ae.estado === "completado");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Atenciones Incompletas</h1>
              <p className="text-muted-foreground">Pacientes con exámenes pendientes por completar</p>
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
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span>Total Incompletas: {atenciones.length}</span>
              <div className="flex gap-2 text-sm font-normal text-muted-foreground">
                <span>WM: {distribucion.workmed.toString().padStart(2, "0")}</span>
                <span>J: {distribucion.jenner.toString().padStart(2, "0")}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {atenciones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay atenciones incompletas para esta fecha
              </div>
            ) : (
              atenciones.map((atencion) => (
                <div
                  key={atencion.id}
                  className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 hover:shadow-md transition-shadow"
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
                        <Badge className="bg-amber-600">Incompleto</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        RUT: {atencion.pacientes.rut || "Sin RUT"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Empresa: {atencion.pacientes.empresas?.nombre || "Sin empresa"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        <div>Ingreso: {atencion.fecha_ingreso ? format(new Date(atencion.fecha_ingreso), "dd/MM/yyyy HH:mm", { locale: es }) : "Sin fecha"}</div>
                        <div>Marcado incompleto: {atencion.fecha_fin_atencion ? format(new Date(atencion.fecha_fin_atencion), "dd/MM/yyyy HH:mm", { locale: es }) : "Sin fecha"}</div>
                      </div>
                      {atencion.observaciones && (
                        <div className="text-xs text-muted-foreground mt-1 italic">
                          Obs: {atencion.observaciones}
                        </div>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleOpenReactivateDialog(atencion)}
                      className="shrink-0 bg-amber-600 hover:bg-amber-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reactivar
                    </Button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {getExamenesIncompletos(atencion).length > 0 && (
                      <div className="p-3 bg-amber-100/50 dark:bg-amber-900/30 rounded-md">
                        <div className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                          Exámenes incompletos ({getExamenesIncompletos(atencion).length}):
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {getExamenesIncompletos(atencion).map((ae) => (
                            <Badge
                              key={ae.id}
                              variant="secondary"
                              className="text-xs bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200"
                            >
                              {ae.examenes.nombre} ⚠
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {getExamenesCompletados(atencion).length > 0 && (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          Exámenes completados ({getExamenesCompletados(atencion).length}):
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {getExamenesCompletados(atencion).map((ae) => (
                            <Badge
                              key={ae.id}
                              variant="default"
                              className="text-xs"
                            >
                              {ae.examenes.nombre} ✓
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Dialog para reactivar atención */}
        <Dialog open={reactivateDialog.open} onOpenChange={(open) => {
          if (!isLoading) {
            setReactivateDialog({ open, atencion: open ? reactivateDialog.atencion : null });
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reactivar Paciente</DialogTitle>
              <DialogDescription>
                Se creará una nueva atención para el paciente{" "}
                <span className="font-semibold">{reactivateDialog.atencion?.pacientes.nombre}</span>{" "}
                con un nuevo número de ingreso, manteniendo solo los exámenes incompletos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="text-sm">
                <span className="font-medium">Atención original:</span> #{reactivateDialog.atencion?.numero_ingreso}
              </div>
              <div className="text-sm">
                <span className="font-medium">Exámenes a incluir en la nueva atención:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {reactivateDialog.atencion?.atencion_examenes
                  .filter(ae => ae.estado === "incompleto")
                  .map((ae) => (
                    <Badge key={ae.id} variant="secondary" className="bg-amber-200 text-amber-800">
                      {ae.examenes.nombre}
                    </Badge>
                  ))}
              </div>
              {reactivateDialog.atencion?.atencion_examenes.filter(ae => ae.estado === "incompleto").length === 0 && (
                <p className="text-muted-foreground text-sm">No hay exámenes incompletos para reactivar</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReactivateDialog({ open: false, atencion: null })} disabled={isLoading}>
                Cancelar
              </Button>
              <Button 
                onClick={handleReactivateAtencion} 
                disabled={isLoading || (reactivateDialog.atencion?.atencion_examenes.filter(ae => ae.estado === "incompleto").length || 0) === 0}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isLoading ? "Reactivando..." : "Reactivar Paciente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Incompletos;