import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Box, ClipboardCheck, Calendar as CalendarIcon, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface AtencionIngresada {
  id: string;
  numero_ingreso: number;
  estado: string;
  pacientes: {
    nombre: string;
    tipo_servicio: string;
    empresas: {
      nombre: string;
    } | null;
  };
  atencion_examenes: Array<{
    estado: string;
    examenes: {
      nombre: string;
    };
  }>;
}

const Dashboard = () => {
  const { loading: authLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(new Date());
  const [atencionesIngresadas, setAtencionesIngresadas] = useState<AtencionIngresada[]>([]);
  const [stats, setStats] = useState({
    enEspera: 0,
    enAtencion: 0,
    completados: 0,
    totalBoxes: 0,
    totalExamenes: 0,
    enEsperaDistribucion: { workmed: 0, jenner: 0 },
    enAtencionDistribucion: { workmed: 0, jenner: 0 },
    completadosDistribucion: { workmed: 0, jenner: 0 },
    pacientesMensuales: { total: 0, workmed: 0, jenner: 0 },
  });

  useEffect(() => {
    loadStats();
  }, [selectedDate, selectedMonth]);

  const loadStats = async () => {
    try {
      const dateToUse = selectedDate || new Date();
      const startOfDay = new Date(dateToUse.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(dateToUse.setHours(23, 59, 59, 999)).toISOString();

      // Calcular inicio y fin del mes seleccionado
      const monthToUse = selectedMonth || new Date();
      const startOfMonth = new Date(monthToUse.getFullYear(), monthToUse.getMonth(), 1, 0, 0, 0, 0).toISOString();
      const endOfMonth = new Date(monthToUse.getFullYear(), monthToUse.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      const [atencionesRes, completadosRes, boxesRes, examenesRes, pacientesMensualesRes, atencionesIngresadasRes] = await Promise.all([
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
        supabase
          .from("atenciones")
          .select("id, pacientes(tipo_servicio)")
          .gte("fecha_ingreso", startOfMonth)
          .lte("fecha_ingreso", endOfMonth),
        supabase
          .from("atenciones")
          .select(`
            id,
            numero_ingreso,
            estado,
            pacientes (
              nombre,
              tipo_servicio,
              empresas (
                nombre
              )
            ),
            atencion_examenes (
              estado,
              examenes (
                nombre
              )
            )
          `)
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay)
          .order("numero_ingreso", { ascending: true }),
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

      // Contadores mensuales
      const pacientesMensualesWM = pacientesMensualesRes.data?.filter((a: any) => a.pacientes?.tipo_servicio === "workmed").length || 0;
      const pacientesMensualesJ = pacientesMensualesRes.data?.filter((a: any) => a.pacientes?.tipo_servicio === "jenner").length || 0;
      const pacientesMensualesTotal = pacientesMensualesRes.data?.length || 0;

      setAtencionesIngresadas((atencionesIngresadasRes.data as AtencionIngresada[]) || []);

      setStats({
        enEspera: enEsperaData.length,
        enAtencion: enAtencionData.length,
        completados: completadosRes.data?.length || 0,
        totalBoxes: boxesRes.count || 0,
        totalExamenes: examenesRes.count || 0,
        enEsperaDistribucion: { workmed: enEsperaWM, jenner: enEsperaJ },
        enAtencionDistribucion: { workmed: enAtencionWM, jenner: enAtencionJ },
        completadosDistribucion: { workmed: completadosWM, jenner: completadosJ },
        pacientesMensuales: { total: pacientesMensualesTotal, workmed: pacientesMensualesWM, jenner: pacientesMensualesJ },
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
            <div className="flex gap-2">
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

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Estadísticas Mensuales</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {selectedMonth ? format(selectedMonth, "MMMM yyyy", { locale: es }) : "Seleccionar mes"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={setSelectedMonth}
                  locale={es}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Pacientes Mes
                </CardTitle>
                <Users className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.pacientesMensuales.total}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {format(selectedMonth || new Date(), "MMMM yyyy", { locale: es })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Workmed Mensual
                </CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.pacientesMensuales.workmed}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {format(selectedMonth || new Date(), "MMMM yyyy", { locale: es })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-600">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Jenner Mensual
                </CardTitle>
                <Users className="h-5 w-5 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stats.pacientesMensuales.jenner}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {format(selectedMonth || new Date(), "MMMM yyyy", { locale: es })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Pacientes Ingresados
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </CardHeader>
            <CardContent>
              {atencionesIngresadas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay pacientes ingresados en esta fecha
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Orden</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Exámenes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atencionesIngresadas.map((atencion) => (
                        <TableRow key={atencion.id}>
                          <TableCell className="font-medium">
                            #{atencion.numero_ingreso.toString().padStart(3, "0")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {atencion.pacientes.nombre}
                          </TableCell>
                          <TableCell>
                            {atencion.pacientes.empresas?.nombre || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={atencion.pacientes.tipo_servicio === "workmed" ? "default" : "secondary"}>
                              {atencion.pacientes.tipo_servicio === "workmed" ? "Workmed" : "Jenner"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                atencion.estado === "completado" 
                                  ? "default" 
                                  : atencion.estado === "en_atencion"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {atencion.estado === "en_espera" 
                                ? "En Espera" 
                                : atencion.estado === "en_atencion"
                                ? "En Atención"
                                : "Completado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {atencion.atencion_examenes.length > 0 ? (
                                atencion.atencion_examenes.map((ae, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="outline" 
                                    className={`text-xs ${ae.estado === "completado" ? "bg-green-100 text-green-800 border-green-300" : ""}`}
                                  >
                                    {ae.estado === "completado" && "✓ "}{ae.examenes.nombre}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">Sin exámenes</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
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
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
