import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ClipboardCheck, Calendar as CalendarIcon, Users, Check, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface AtencionIngresada {
  id: string;
  numero_ingreso: number;
  estado: string;
  boxes: {
    nombre: string;
  } | null;
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
      id: string;
      nombre: string;
    };
  }>;
}

interface Examen {
  id: string;
  nombre: string;
}

interface Empresa {
  id: string;
  nombre: string;
}

const Dashboard = () => {
  const { loading: authLoading } = useAuth();
  
  // Filtro diario (sección 1)
  const [selectedDateDaily, setSelectedDateDaily] = useState<Date | undefined>(new Date());
  
  // Filtro mensual (sección 2)
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(new Date());
  
  // Filtro tabla pacientes (sección 3) - fecha independiente
  const [selectedDateTable, setSelectedDateTable] = useState<Date | undefined>(new Date());
  const [selectedExamenFilter, setSelectedExamenFilter] = useState<string>("all");
  const [selectedEmpresaFilter, setSelectedEmpresaFilter] = useState<string>("all");
  const [selectedTipoFilter, setSelectedTipoFilter] = useState<string>("all");
  const [filterCompletado, setFilterCompletado] = useState<boolean>(true);
  const [filterIncompleto, setFilterIncompleto] = useState<boolean>(true);
  
  const [atencionesIngresadas, setAtencionesIngresadas] = useState<AtencionIngresada[]>([]);
  const [examenes, setExamenes] = useState<Examen[]>([]);
  
  
  // Stats diarias
  const [examenesConteoDiario, setExamenesConteoDiario] = useState<Record<string, { asignados: number; completados: number }>>({});
  const [statsDaily, setStatsDaily] = useState({
    enEspera: 0,
    enAtencion: 0,
    completados: 0,
    totalExamenes: 0,
    examenesRealizadosHoy: 0,
    enEsperaDistribucion: { workmed: 0, jenner: 0 },
    enAtencionDistribucion: { workmed: 0, jenner: 0 },
    completadosDistribucion: { workmed: 0, jenner: 0 },
  });
  
  // Stats mensuales
  const [examenesConteoMensual, setExamenesConteoMensual] = useState<Record<string, { asignados: number; completados: number }>>({});
  const [statsMonthly, setStatsMonthly] = useState({
    pacientesMensuales: { total: 0, workmed: 0, jenner: 0 },
    examenesRealizadosMes: 0,
  });

  useEffect(() => {
    loadExamenes();
  }, []);

  useEffect(() => {
    loadDailyStats();
  }, [selectedDateDaily]);

  useEffect(() => {
    loadMonthlyStats();
  }, [selectedMonth]);

  useEffect(() => {
    loadTableData();
  }, [selectedDateTable]);

  // Auto-refresh cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadDailyStats();
      loadMonthlyStats();
      loadTableData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [selectedDateDaily, selectedMonth, selectedDateTable]);

  const loadExamenes = async () => {
    const { data } = await supabase.from("examenes").select("id, nombre").order("nombre");
    setExamenes(data || []);
  };

  // Extraer empresas únicas de las atenciones cargadas
  const empresasDelDia = (() => {
    const empresasMap = new Map<string, Empresa>();
    atencionesIngresadas.forEach(a => {
      const empresa = (a.pacientes as any).empresas;
      if (empresa?.id && empresa?.nombre) {
        empresasMap.set(empresa.id, { id: empresa.id, nombre: empresa.nombre });
      }
    });
    return Array.from(empresasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  })();

  const loadDailyStats = async () => {
    try {
      const dateToUse = selectedDateDaily || new Date();
      const startOfDay = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate(), 23, 59, 59, 999).toISOString();

      const [atencionesRes, completadosRes, examenesRes, examenesRealizadosRes] = await Promise.all([
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
        supabase.from("examenes").select("id", { count: "exact", head: true }),
        supabase
          .from("atencion_examenes")
          .select("id, examen_id, estado, examenes(nombre), atencion_id, atenciones!inner(fecha_ingreso)")
          .gte("atenciones.fecha_ingreso", startOfDay)
          .lte("atenciones.fecha_ingreso", endOfDay),
      ]);

      const enEsperaData = atencionesRes.data?.filter((a: any) => a.estado === "en_espera") || [];
      const enAtencionData = atencionesRes.data?.filter((a: any) => a.estado === "en_atencion") || [];

      const enEsperaWM = enEsperaData.filter((a: any) => a.pacientes?.tipo_servicio === "workmed").length;
      const enEsperaJ = enEsperaData.filter((a: any) => a.pacientes?.tipo_servicio === "jenner").length;
      const enAtencionWM = enAtencionData.filter((a: any) => a.pacientes?.tipo_servicio === "workmed").length;
      const enAtencionJ = enAtencionData.filter((a: any) => a.pacientes?.tipo_servicio === "jenner").length;
      const completadosWM = completadosRes.data?.filter((a: any) => a.pacientes?.tipo_servicio === "workmed").length || 0;
      const completadosJ = completadosRes.data?.filter((a: any) => a.pacientes?.tipo_servicio === "jenner").length || 0;

      // Conteo de exámenes diarios
      const conteoExamenes: Record<string, { asignados: number; completados: number }> = {};
      examenesRealizadosRes.data?.forEach((ae: any) => {
        const nombreExamen = ae.examenes?.nombre || "Sin nombre";
        if (!conteoExamenes[nombreExamen]) {
          conteoExamenes[nombreExamen] = { asignados: 0, completados: 0 };
        }
        conteoExamenes[nombreExamen].asignados += 1;
        if (ae.estado === "completado") {
          conteoExamenes[nombreExamen].completados += 1;
        }
      });
      setExamenesConteoDiario(conteoExamenes);

      setStatsDaily({
        enEspera: enEsperaData.length,
        enAtencion: enAtencionData.length,
        completados: completadosRes.data?.length || 0,
        totalExamenes: examenesRes.count || 0,
        examenesRealizadosHoy: examenesRealizadosRes.data?.length || 0,
        enEsperaDistribucion: { workmed: enEsperaWM, jenner: enEsperaJ },
        enAtencionDistribucion: { workmed: enAtencionWM, jenner: enAtencionJ },
        completadosDistribucion: { workmed: completadosWM, jenner: completadosJ },
      });
    } catch (error) {
      console.error("Error cargando estadísticas diarias:", error);
    }
  };

  const loadMonthlyStats = async () => {
    try {
      const monthToUse = selectedMonth || new Date();
      const startOfMonth = new Date(monthToUse.getFullYear(), monthToUse.getMonth(), 1, 0, 0, 0, 0).toISOString();
      const endOfMonth = new Date(monthToUse.getFullYear(), monthToUse.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      // Obtener pacientes mensuales
      const pacientesMensualesRes = await supabase
        .from("atenciones")
        .select("id, pacientes(tipo_servicio)")
        .gte("fecha_ingreso", startOfMonth)
        .lte("fecha_ingreso", endOfMonth);

      const pacientesMensualesWM = pacientesMensualesRes.data?.filter((a: any) => a.pacientes?.tipo_servicio === "workmed").length || 0;
      const pacientesMensualesJ = pacientesMensualesRes.data?.filter((a: any) => a.pacientes?.tipo_servicio === "jenner").length || 0;
      const pacientesMensualesTotal = pacientesMensualesRes.data?.length || 0;

      // Obtener todos los exámenes mensuales con paginación para evitar límite de 1000
      let allExamenes: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("atencion_examenes")
          .select("id, examen_id, estado, examenes(nombre), atencion_id, atenciones!inner(fecha_ingreso)")
          .gte("atenciones.fecha_ingreso", startOfMonth)
          .lte("atenciones.fecha_ingreso", endOfMonth)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.error("Error fetching examenes:", error);
          break;
        }

        if (data && data.length > 0) {
          allExamenes = [...allExamenes, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Conteo de exámenes mensuales
      const conteoExamenes: Record<string, { asignados: number; completados: number }> = {};
      allExamenes.forEach((ae: any) => {
        const nombreExamen = ae.examenes?.nombre || "Sin nombre";
        if (!conteoExamenes[nombreExamen]) {
          conteoExamenes[nombreExamen] = { asignados: 0, completados: 0 };
        }
        conteoExamenes[nombreExamen].asignados += 1;
        if (ae.estado === "completado") {
          conteoExamenes[nombreExamen].completados += 1;
        }
      });
      setExamenesConteoMensual(conteoExamenes);

      setStatsMonthly({
        pacientesMensuales: { total: pacientesMensualesTotal, workmed: pacientesMensualesWM, jenner: pacientesMensualesJ },
        examenesRealizadosMes: allExamenes.length,
      });
    } catch (error) {
      console.error("Error cargando estadísticas mensuales:", error);
    }
  };

  const loadTableData = async () => {
    try {
      const dateToUse = selectedDateTable || new Date();
      const startOfDay = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate(), 23, 59, 59, 999).toISOString();

      const { data } = await supabase
        .from("atenciones")
        .select(`
          id,
          numero_ingreso,
          estado,
          boxes (
            nombre
          ),
          pacientes (
            nombre,
            tipo_servicio,
            empresas (
              id,
              nombre
            )
          ),
          atencion_examenes (
            estado,
            examenes (
              id,
              nombre
            )
          )
        `)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("numero_ingreso", { ascending: true });

      setAtencionesIngresadas((data as AtencionIngresada[]) || []);
    } catch (error) {
      console.error("Error cargando tabla de pacientes:", error);
    }
  };

  // Calcular conteos para el examen filtrado
  const conteosFiltro = (() => {
    if (selectedExamenFilter === "all") {
      return { completados: 0, pendientes: 0, total: atencionesIngresadas.length };
    }
    
    const pacientesConExamen = atencionesIngresadas.filter(a => 
      a.atencion_examenes.some(ae => ae.examenes.id === selectedExamenFilter)
    );
    
    let completados = 0;
    let pendientes = 0;
    
    pacientesConExamen.forEach(a => {
      const examStatus = a.atencion_examenes.find(ae => ae.examenes.id === selectedExamenFilter);
      if (examStatus?.estado === "completado") {
        completados++;
      } else {
        pendientes++;
      }
    });
    
    return { completados, pendientes, total: pacientesConExamen.length };
  })();

  // Filter patients by selected filters
  const filteredAtenciones = atencionesIngresadas.filter(a => {
    // Filter by empresa
    if (selectedEmpresaFilter !== "all") {
      if ((a.pacientes as any).empresas?.id !== selectedEmpresaFilter) return false;
    }
    
    // Filter by tipo servicio
    if (selectedTipoFilter !== "all") {
      if (a.pacientes.tipo_servicio !== selectedTipoFilter) return false;
    }
    
    // Filter by exam if selected
    if (selectedExamenFilter !== "all") {
      const hasExam = a.atencion_examenes.some(ae => ae.examenes.id === selectedExamenFilter);
      if (!hasExam) return false;
      
      // Then filter by exam status checkboxes
      const examStatus = a.atencion_examenes.find(ae => ae.examenes.id === selectedExamenFilter);
      if (examStatus) {
        const isCompleted = examStatus.estado === "completado";
        if (isCompleted && !filterCompletado) return false;
        if (!isCompleted && !filterIncompleto) return false;
      }
    }
    return true;
  });

  const renderExamenesGrid = (conteo: Record<string, { asignados: number; completados: number }>, totalExamenes: number) => {
    if (Object.keys(conteo).length === 0) {
      return <p className="text-sm text-muted-foreground">Sin exámenes asignados</p>;
    }

    const sortedExamenes = Object.entries(conteo).sort((a, b) => b[1].asignados - a[1].asignados);
    const itemsPerColumn = Math.ceil(sortedExamenes.length / 3);
    const columns = [
      sortedExamenes.slice(0, itemsPerColumn),
      sortedExamenes.slice(itemsPerColumn, itemsPerColumn * 2),
      sortedExamenes.slice(itemsPerColumn * 2),
    ].filter(col => col.length > 0);

    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {columns.map((column, colIndex) => (
            <table key={colIndex} className="w-auto">
              <tbody>
                {column.map(([nombre, c]) => (
                  <tr key={nombre}>
                    <td className="text-sm text-muted-foreground py-1 pr-3">{nombre}</td>
                    <td className="py-1">
                      <Badge 
                        variant="secondary"
                        className={c.completados === c.asignados ? "bg-green-100 text-green-800 border-green-300" : ""}
                      >
                        {c.completados}/{c.asignados}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="text-2xl font-bold text-foreground">{totalExamenes}</div>
          <p className="text-sm text-muted-foreground mt-1">
            Total exámenes asignados
          </p>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Centro Médico Jenner</h1>
          <p className="text-muted-foreground">
            Vista general del sistema de gestión de pacientes
          </p>
        </div>

        {/* SECCIÓN 1: Estadísticas Diarias */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Estadísticas Diarias</h2>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {selectedDateDaily ? format(selectedDateDaily, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDateDaily}
                  onSelect={setSelectedDateDaily}
                  locale={es}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Pacientes
                </CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {statsDaily.enEspera + statsDaily.enAtencion + statsDaily.completados}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {format(selectedDateDaily || new Date(), "dd/MM/yyyy", { locale: es })}
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
                <div className="text-3xl font-bold text-foreground">{statsDaily.enEspera}</div>
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <span>WM: {statsDaily.enEsperaDistribucion.workmed.toString().padStart(2, "0")}</span>
                  <span>J: {statsDaily.enEsperaDistribucion.jenner.toString().padStart(2, "0")}</span>
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
                <div className="text-3xl font-bold text-foreground">{statsDaily.enAtencion}</div>
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <span>WM: {statsDaily.enAtencionDistribucion.workmed.toString().padStart(2, "0")}</span>
                  <span>J: {statsDaily.enAtencionDistribucion.jenner.toString().padStart(2, "0")}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completados
                </CardTitle>
                <ClipboardCheck className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{statsDaily.completados}</div>
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <span>WM: {statsDaily.completadosDistribucion.workmed.toString().padStart(2, "0")}</span>
                  <span>J: {statsDaily.completadosDistribucion.jenner.toString().padStart(2, "0")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exámenes del Día */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Exámenes del Día
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(selectedDateDaily || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground mb-4">{statsDaily.examenesRealizadosHoy}</div>
              {renderExamenesGrid(examenesConteoDiario, statsDaily.examenesRealizadosHoy)}
            </CardContent>
          </Card>
        </section>

        {/* SECCIÓN 2: Estadísticas Mensuales */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Estadísticas Mensuales</h2>
            <div className="flex gap-2">
              <Select
                value={(selectedMonth || new Date()).getMonth().toString()}
                onValueChange={(value) => {
                  const newDate = new Date(selectedMonth || new Date());
                  newDate.setMonth(parseInt(value));
                  setSelectedMonth(newDate);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {format(new Date(2024, i, 1), "MMMM", { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={(selectedMonth || new Date()).getFullYear().toString()}
                onValueChange={(value) => {
                  const newDate = new Date(selectedMonth || new Date());
                  newDate.setFullYear(parseInt(value));
                  setSelectedMonth(newDate);
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Pacientes Mes
                </CardTitle>
                <Users className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{statsMonthly.pacientesMensuales.total}</div>
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
                <div className="text-3xl font-bold text-foreground">{statsMonthly.pacientesMensuales.workmed}</div>
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
                <div className="text-3xl font-bold text-foreground">{statsMonthly.pacientesMensuales.jenner}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {format(selectedMonth || new Date(), "MMMM yyyy", { locale: es })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exámenes del Mes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Exámenes del Mes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(selectedMonth || new Date(), "MMMM 'de' yyyy", { locale: es })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground mb-4">{statsMonthly.examenesRealizadosMes}</div>
              {renderExamenesGrid(examenesConteoMensual, statsMonthly.examenesRealizadosMes)}
            </CardContent>
          </Card>
        </section>

        {/* SECCIÓN 3: Pacientes Ingresados */}
        <section>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Pacientes Ingresados
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(selectedDateTable || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {selectedDateTable ? format(selectedDateTable, "dd/MM/yyyy", { locale: es }) : "Fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDateTable}
                        onSelect={setSelectedDateTable}
                        locale={es}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-4">
                  <Select value={selectedEmpresaFilter} onValueChange={setSelectedEmpresaFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Building2 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrar por empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las empresas</SelectItem>
                      {empresasDelDia.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>{empresa.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedTipoFilter} onValueChange={setSelectedTipoFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="workmed">Workmed</SelectItem>
                      <SelectItem value="jenner">Jenner</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedExamenFilter} onValueChange={setSelectedExamenFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar por examen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los exámenes</SelectItem>
                      {examenes.map((examen) => (
                        <SelectItem key={examen.id} value={examen.id}>{examen.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedExamenFilter !== "all" && (
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-sm">
                        Total: {conteosFiltro.total}
                      </Badge>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div 
                          onClick={() => setFilterCompletado(!filterCompletado)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            filterCompletado 
                              ? "bg-green-600 border-green-600 text-white" 
                              : "border-muted-foreground"
                          }`}
                        >
                          {filterCompletado && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-sm">Completado ({conteosFiltro.completados})</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <div 
                          onClick={() => setFilterIncompleto(!filterIncompleto)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            filterIncompleto 
                              ? "bg-yellow-600 border-yellow-600 text-white" 
                              : "border-muted-foreground"
                          }`}
                        >
                          {filterIncompleto && <Check className="h-3 w-3" />}
                        </div>
                        <span className="text-sm">Pendiente ({conteosFiltro.pendientes})</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAtenciones.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay pacientes ingresados con los filtros seleccionados
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
                        <TableHead>Box</TableHead>
                        <TableHead>Exámenes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAtenciones.map((atencion) => (
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
                            {atencion.boxes?.nombre || "-"}
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
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
