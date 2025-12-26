import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { AlertCircle, Calendar as CalendarIcon, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // Inicio del mes
    to: new Date()
  });
  const [distribucion, setDistribucion] = useState({ workmed: 0, jenner: 0 });
  const [totalExamenesIncompletos, setTotalExamenesIncompletos] = useState(0);
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
  }, [dateRange]);

  const loadAtenciones = async () => {
    try {
      // Primero obtenemos las atenciones con estado "incompleto"
      let queryIncompletas = supabase
        .from("atenciones")
        .select("*, pacientes(id, nombre, rut, tipo_servicio, empresas(nombre)), atencion_examenes(id, estado, examen_id, examenes(nombre))")
        .eq("estado", "incompleto")
        .order("fecha_ingreso", { ascending: false });

      // También buscamos atenciones que tengan exámenes individuales con estado "incompleto"
      // (pueden estar en estado "completado" pero tener exámenes incompletos)
      let queryConExamenesIncompletos = supabase
        .from("atenciones")
        .select("*, pacientes(id, nombre, rut, tipo_servicio, empresas(nombre)), atencion_examenes(id, estado, examen_id, examenes(nombre))")
        .neq("estado", "incompleto") // Excluir las que ya tienen estado incompleto
        .order("fecha_ingreso", { ascending: false });

      if (dateRange?.from) {
        const startDate = new Date(dateRange.from);
        startDate.setHours(0, 0, 0, 0);
        queryIncompletas = queryIncompletas.gte("fecha_ingreso", startDate.toISOString());
        queryConExamenesIncompletos = queryConExamenesIncompletos.gte("fecha_ingreso", startDate.toISOString());
      }

      if (dateRange?.to) {
        const endDate = new Date(dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        queryIncompletas = queryIncompletas.lte("fecha_ingreso", endDate.toISOString());
        queryConExamenesIncompletos = queryConExamenesIncompletos.lte("fecha_ingreso", endDate.toISOString());
      } else if (dateRange?.from) {
        const endDate = new Date(dateRange.from);
        endDate.setHours(23, 59, 59, 999);
        queryIncompletas = queryIncompletas.lte("fecha_ingreso", endDate.toISOString());
        queryConExamenesIncompletos = queryConExamenesIncompletos.lte("fecha_ingreso", endDate.toISOString());
      }

      const [resultIncompletas, resultConExamenes] = await Promise.all([
        queryIncompletas,
        queryConExamenesIncompletos
      ]);

      if (resultIncompletas.error) throw resultIncompletas.error;
      if (resultConExamenes.error) throw resultConExamenes.error;

      // Filtrar las atenciones que tienen al menos un examen incompleto
      const atencionesConExamenesIncompletos = (resultConExamenes.data || []).filter(
        atencion => atencion.atencion_examenes.some(ae => ae.estado === "incompleto")
      );

      // Combinar ambos resultados sin duplicados
      const todasAtenciones = [...(resultIncompletas.data || [])];
      const idsExistentes = new Set(todasAtenciones.map(a => a.id));
      
      atencionesConExamenesIncompletos.forEach(atencion => {
        if (!idsExistentes.has(atencion.id)) {
          todasAtenciones.push(atencion);
        }
      });

      // Ordenar por fecha de ingreso descendente
      todasAtenciones.sort((a, b) => 
        new Date(b.fecha_ingreso || 0).getTime() - new Date(a.fecha_ingreso || 0).getTime()
      );

      setAtenciones(todasAtenciones);
      
      // Calcular distribución por tipo de servicio
      const workmedCount = todasAtenciones.filter(a => a.pacientes.tipo_servicio === "workmed").length;
      const jennerCount = todasAtenciones.filter(a => a.pacientes.tipo_servicio === "jenner").length;
      setDistribucion({ workmed: workmedCount, jenner: jennerCount });
      
      // Calcular total de exámenes incompletos
      const totalIncompletos = todasAtenciones.reduce((acc, atencion) => {
        return acc + atencion.atencion_examenes.filter(ae => ae.estado === "incompleto").length;
      }, 0);
      setTotalExamenesIncompletos(totalIncompletos);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar atenciones incompletas");
    }
  };

  const handleClearDateRange = () => {
    setDateRange(undefined);
  };

  const getDateRangeLabel = () => {
    if (!dateRange?.from) return "Todas las fechas";
    if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, "PPP", { locale: es });
    }
    return `${format(dateRange.from, "dd/MM/yyyy", { locale: es })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: es })}`;
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
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("gap-2", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4" />
                    {getDateRangeLabel()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    locale={es}
                    initialFocus
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {dateRange && (
                <Button variant="ghost" size="icon" onClick={handleClearDateRange} title="Ver todas las fechas">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 flex-wrap">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span>Atenciones con Incompletos: {atenciones.length}</span>
              <Badge variant="secondary" className="bg-amber-200 text-amber-800">
                {totalExamenesIncompletos} exámenes incompletos
              </Badge>
              <div className="flex gap-2 text-sm font-normal text-muted-foreground">
                <span>WM: {distribucion.workmed.toString().padStart(2, "0")}</span>
                <span>J: {distribucion.jenner.toString().padStart(2, "0")}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {atenciones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay atenciones incompletas para el rango de fechas seleccionado
              </div>
            ) : (
              atenciones.map((atencion) => (
                <div
                  key={atencion.id}
                  className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-bold">#{atencion.numero_ingreso}</Badge>
                        <div className="font-medium text-foreground">
                          {atencion.pacientes.nombre}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {atencion.pacientes.tipo_servicio === "workmed" ? "WM" : "J"}
                        </Badge>
                        {atencion.estado === "incompleto" ? (
                          <Badge className="bg-amber-600">Atención Incompleta</Badge>
                        ) : (
                          <Badge className="bg-orange-500">Exámenes Incompletos</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          Estado: {atencion.estado}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        RUT: {atencion.pacientes.rut || "Sin RUT"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Empresa: {atencion.pacientes.empresas?.nombre || "Sin empresa"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        <div>Ingreso: {atencion.fecha_ingreso ? format(new Date(atencion.fecha_ingreso), "dd/MM/yyyy HH:mm", { locale: es }) : "Sin fecha"}</div>
                        {atencion.estado === "incompleto" && atencion.fecha_fin_atencion && (
                          <div>Marcado incompleto: {format(new Date(atencion.fecha_fin_atencion), "dd/MM/yyyy HH:mm", { locale: es })}</div>
                        )}
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