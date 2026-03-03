import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BoxVisita {
  id: string;
  box_id: string;
  fecha_entrada: string;
  fecha_salida: string | null;
  boxes: { nombre: string };
}

interface AtencionMetrica {
  id: string;
  numero_ingreso: number;
  fecha_ingreso: string;
  fecha_fin_atencion: string | null;
  pacientes: {
    nombre: string;
    rut: string;
    empresas: { nombre: string } | null;
  };
  atencion_baterias: Array<{
    paquetes_examenes: { nombre: string };
  }>;
  atencion_examenes: Array<{
    examenes: { nombre: string };
    estado: string;
  }>;
  visitas: BoxVisita[];
}

interface MetricasCompletadosProps {
  selectedDate: Date | undefined;
}

const MetricasCompletados = ({ selectedDate }: MetricasCompletadosProps) => {
  const [metricas, setMetricas] = useState<AtencionMetrica[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMetricas();
  }, [selectedDate]);

  const loadMetricas = async () => {
    setLoading(true);
    try {
      const dateToUse = selectedDate || new Date();
      const startOfDay = new Date(new Date(dateToUse).setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(new Date(dateToUse).setHours(23, 59, 59, 999)).toISOString();

      const { data: atenciones, error } = await supabase
        .from("atenciones")
        .select(`
          id, numero_ingreso, fecha_ingreso, fecha_fin_atencion,
          pacientes(nombre, rut, empresas(nombre)),
          atencion_baterias(paquetes_examenes(nombre)),
          atencion_examenes(examenes(nombre), estado)
        `)
        .eq("estado", "completado")
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("numero_ingreso", { ascending: true });

      if (error) throw error;

      // Load visitas for all atenciones
      const atencionIds = (atenciones || []).map(a => a.id);
      let visitasMap: Record<string, BoxVisita[]> = {};

      if (atencionIds.length > 0) {
        const { data: visitas, error: visitasError } = await supabase
          .from("atencion_box_visitas")
          .select("id, atencion_id, box_id, fecha_entrada, fecha_salida, boxes(nombre)")
          .in("atencion_id", atencionIds)
          .order("fecha_entrada", { ascending: true });

        if (visitasError) throw visitasError;

        (visitas || []).forEach((v: any) => {
          if (!visitasMap[v.atencion_id]) visitasMap[v.atencion_id] = [];
          visitasMap[v.atencion_id].push(v);
        });
      }

      const result: AtencionMetrica[] = (atenciones || []).map((a: any) => ({
        ...a,
        visitas: visitasMap[a.id] || [],
      }));

      setMetricas(result);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar métricas");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return format(new Date(dateStr), "HH:mm", { locale: es });
  };

  const calcDuration = (start: string, end: string | null) => {
    if (!end) return "En curso";
    const mins = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    if (mins < 1) return "<1 min";
    return `${mins} min`;
  };

  // Group visitas by box, numbering instances
  const groupVisitasByBox = (visitas: BoxVisita[]) => {
    const grouped: Record<string, { boxName: string; instances: BoxVisita[] }> = {};
    visitas.forEach(v => {
      if (!grouped[v.box_id]) {
        grouped[v.box_id] = { boxName: v.boxes?.nombre || "Box", instances: [] };
      }
      grouped[v.box_id].instances.push(v);
    });
    return grouped;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando métricas...</div>;
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Solo las atenciones realizadas después de activar la trazabilidad tendrán datos de visitas a boxes. Las anteriores mostrarán "Sin datos".
        </AlertDescription>
      </Alert>

      {metricas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay atenciones completadas para esta fecha
        </div>
      ) : (
        metricas.map((atencion) => {
          const grouped = groupVisitasByBox(atencion.visitas);
          const tiempoTotal = atencion.fecha_ingreso && atencion.fecha_fin_atencion
            ? Math.floor((new Date(atencion.fecha_fin_atencion).getTime() - new Date(atencion.fecha_ingreso).getTime()) / 60000)
            : null;

          return (
            <Card key={atencion.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Header: Patient info */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-bold">#{atencion.numero_ingreso}</Badge>
                  <span className="font-medium">{atencion.pacientes.nombre}</span>
                  <span className="text-sm text-muted-foreground">{atencion.pacientes.rut}</span>
                  <span className="text-sm text-muted-foreground">
                    | {atencion.pacientes.empresas?.nombre || "Sin empresa"}
                  </span>
                  {tiempoTotal !== null && (
                    <Badge variant="secondary" className="ml-auto">
                      Total: {tiempoTotal} min
                    </Badge>
                  )}
                </div>

                {/* Baterías y exámenes */}
                <div className="flex flex-wrap gap-1">
                  {atencion.atencion_baterias.map((ab, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-primary/10">
                      {ab.paquetes_examenes.nombre}
                    </Badge>
                  ))}
                  {atencion.atencion_examenes.map((ae, i) => (
                    <Badge key={`ex-${i}`} variant={ae.estado === "completado" ? "default" : "secondary"} className="text-xs">
                      {ae.examenes.nombre} {ae.estado === "completado" ? "✓" : "○"}
                    </Badge>
                  ))}
                </div>

                {/* Hora llegada */}
                <div className="text-xs text-muted-foreground">
                  Llegada: {formatTime(atencion.fecha_ingreso)} | Fin: {formatTime(atencion.fecha_fin_atencion)}
                </div>

                {/* Visitas a boxes */}
                {atencion.visitas.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded">
                    Sin datos de visitas a boxes (atención anterior a la trazabilidad)
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs h-8">Box</TableHead>
                        <TableHead className="text-xs h-8">Instancia</TableHead>
                        <TableHead className="text-xs h-8">Entrada</TableHead>
                        <TableHead className="text-xs h-8">Salida</TableHead>
                        <TableHead className="text-xs h-8">Duración</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(grouped).flatMap(([boxId, { boxName, instances }]) =>
                        instances.map((v, idx) => (
                          <TableRow key={v.id}>
                            <TableCell className="text-xs py-1">{boxName}</TableCell>
                            <TableCell className="text-xs py-1">
                              <Badge variant="outline" className="text-xs">
                                #{idx + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs py-1">{formatTime(v.fecha_entrada)}</TableCell>
                            <TableCell className="text-xs py-1">{formatTime(v.fecha_salida)}</TableCell>
                            <TableCell className="text-xs py-1">{calcDuration(v.fecha_entrada, v.fecha_salida)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default MetricasCompletados;
