import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Box, ClipboardCheck, Calendar as CalendarIcon, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [stats, setStats] = useState({
    enEspera: 0,
    enAtencion: 0,
    completados: 0,
    totalBoxes: 0,
    totalExamenes: 0,
    enEsperaDistribucion: { workmed: 0, jenner: 0 },
    enAtencionDistribucion: { workmed: 0, jenner: 0 },
    completadosDistribucion: { workmed: 0, jenner: 0 },
  });

  useEffect(() => {
    loadStats();
  }, [selectedDate]);

  const loadStats = async () => {
    try {
      const dateToUse = selectedDate || new Date();
      const startOfDay = new Date(dateToUse.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(dateToUse.setHours(23, 59, 59, 999)).toISOString();

      const [atencionesRes, completadosRes, boxesRes, examenesRes] = await Promise.all([
        supabase
          .from("atenciones")
          .select("estado, pacientes(tipo_servicio)")
          .in("estado", ["en_espera", "en_atencion"])
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay),
        supabase
          .from("atenciones")
          .select("id, pacientes(tipo_servicio)")
          .eq("estado", "completado")
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay),
        supabase.from("boxes").select("id", { count: "exact", head: true }).eq("activo", true),
        supabase.from("examenes").select("id", { count: "exact", head: true }),
      ]);

      const enEsperaData = atencionesRes.data?.filter((a: any) => a.estado === "en_espera") || [];
      const enAtencionData = atencionesRes.data?.filter((a: any) => a.estado === "en_atencion") || [];

      // Distribución en espera
      const enEsperaWM = enEsperaData.filter((a: any) => a.pacientes?.tipo_servicio === "workmed").length;
      const enEsperaJ = enEsperaData.filter((a: any) => a.pacientes?.tipo_servicio === "jenner").length;

      // Distribución en atención
      const enAtencionWM = enAtencionData.filter((a: any) => a.pacientes?.tipo_servicio === "workmed").length;
      const enAtencionJ = enAtencionData.filter((a: any) => a.pacientes?.tipo_servicio === "jenner").length;

      // Distribución completados
      const completadosWM = completadosRes.data?.filter((a: any) => a.pacientes?.tipo_servicio === "workmed").length || 0;
      const completadosJ = completadosRes.data?.filter((a: any) => a.pacientes?.tipo_servicio === "jenner").length || 0;

      setStats({
        enEspera: enEsperaData.length,
        enAtencion: enAtencionData.length,
        completados: completadosRes.data?.length || 0,
        totalBoxes: boxesRes.count || 0,
        totalExamenes: examenesRes.count || 0,
        enEsperaDistribucion: { workmed: enEsperaWM, jenner: enEsperaJ },
        enAtencionDistribucion: { workmed: enAtencionWM, jenner: enAtencionJ },
        completadosDistribucion: { workmed: completadosWM, jenner: completadosJ },
      });
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
              <p className="text-muted-foreground">
                Vista general del sistema de gestión de pacientes
              </p>
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
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-l-4 border-l-primary col-span-full lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pacientes
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stats.enEspera + stats.enAtencion + stats.completados}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Hoy
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En Espera
              </CardTitle>
              <Activity className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.enEspera}</div>
              <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                <span>WM: {stats.enEsperaDistribucion.workmed.toString().padStart(2, "0")}</span>
                <span>J: {stats.enEsperaDistribucion.jenner.toString().padStart(2, "0")}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-info">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En Atención
              </CardTitle>
              <Activity className="h-5 w-5 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.enAtencion}</div>
              <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                <span>WM: {stats.enAtencionDistribucion.workmed.toString().padStart(2, "0")}</span>
                <span>J: {stats.enAtencionDistribucion.jenner.toString().padStart(2, "0")}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-600">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completados Hoy
              </CardTitle>
              <ClipboardCheck className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.completados}</div>
              <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                <span>WM: {stats.completadosDistribucion.workmed.toString().padStart(2, "0")}</span>
                <span>J: {stats.completadosDistribucion.jenner.toString().padStart(2, "0")}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Boxes Activos
              </CardTitle>
              <Box className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalBoxes}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Exámenes Disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{stats.totalExamenes}</div>
              <p className="text-sm text-muted-foreground mt-2">
                Exámenes configurados en el sistema
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
            <CardHeader>
              <CardTitle>Acceso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="/flujo"
                className="block p-3 rounded-lg bg-card hover:bg-accent transition-colors border border-border"
              >
                <div className="font-medium text-foreground">Ver Flujo de Pacientes</div>
                <div className="text-sm text-muted-foreground">
                  Gestiona el flujo en tiempo real
                </div>
              </a>
              <a
                href="/pacientes"
                className="block p-3 rounded-lg bg-card hover:bg-accent transition-colors border border-border"
              >
                <div className="font-medium text-foreground">Gestionar Pacientes</div>
                <div className="text-sm text-muted-foreground">
                  Agregar, editar o importar pacientes
                </div>
              </a>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
