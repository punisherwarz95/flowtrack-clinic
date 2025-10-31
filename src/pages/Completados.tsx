import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

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
  const [atenciones, setAtenciones] = useState<AtencionCompletada[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

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
        .select("*, pacientes(id, nombre, rut, empresas(nombre)), atencion_examenes(id, estado, examenes(nombre))")
        .eq("estado", "completado")
        .order("fecha_fin_atencion", { ascending: false });

      if (startOfDay && endOfDay) {
        query = query.gte("fecha_ingreso", startOfDay).lte("fecha_ingreso", endOfDay);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAtenciones(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar atenciones completadas");
    }
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
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Total Completadas: {atenciones.length}
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
                        <Badge className="bg-green-600">Completado</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        RUT: {atencion.pacientes.rut}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Empresa: {atencion.pacientes.empresas?.nombre || "Sin empresa"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        <div>Ingreso: {format(new Date(atencion.fecha_ingreso), "dd/MM/yyyy HH:mm", { locale: es })}</div>
                        <div>Finalizado: {format(new Date(atencion.fecha_fin_atencion), "dd/MM/yyyy HH:mm", { locale: es })}</div>
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
      </main>
    </div>
  );
};

export default Completados;
