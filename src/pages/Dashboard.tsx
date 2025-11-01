import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, Box, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalPacientes: 0,
    enEspera: 0,
    enAtencion: 0,
    completados: 0,
    totalBoxes: 0,
    totalExamenes: 0,
    pacientesPorEmpresa: [] as Array<{ empresa: string; count: number }>,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const [pacientesRes, atencionesRes, completadosRes, boxesRes, examenesRes, pacientesEmpresaRes] = await Promise.all([
        supabase.from("pacientes").select("id", { count: "exact", head: true }),
        supabase.from("atenciones").select("estado"),
        supabase
          .from("atenciones")
          .select("id", { count: "exact", head: true })
          .eq("estado", "completado")
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay),
        supabase.from("boxes").select("id", { count: "exact", head: true }).eq("activo", true),
        supabase.from("examenes").select("id", { count: "exact", head: true }),
        supabase.from("pacientes").select("empresa_id, empresas(nombre)"),
      ]);

      const enEspera = atencionesRes.data?.filter((a) => a.estado === "en_espera").length || 0;
      const enAtencion = atencionesRes.data?.filter((a) => a.estado === "en_atencion").length || 0;

      // Contar pacientes por empresa
      const empresaCount: Record<string, number> = {};
      pacientesEmpresaRes.data?.forEach((p: any) => {
        const empresaNombre = p.empresas?.nombre || "Sin empresa";
        empresaCount[empresaNombre] = (empresaCount[empresaNombre] || 0) + 1;
      });

      const pacientesPorEmpresa = Object.entries(empresaCount).map(([empresa, count]) => ({
        empresa,
        count,
      }));

      setStats({
        totalPacientes: pacientesRes.count || 0,
        enEspera,
        enAtencion,
        completados: completadosRes.count || 0,
        totalBoxes: boxesRes.count || 0,
        totalExamenes: examenesRes.count || 0,
        pacientesPorEmpresa,
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Vista general del sistema de gestión de pacientes
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Pacientes
              </CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalPacientes}</div>
              {stats.pacientesPorEmpresa.length > 0 && (
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  {stats.pacientesPorEmpresa.map((emp) => {
                    const abreviatura = emp.empresa.toLowerCase().includes('wom') ? 'WM' : 
                                       emp.empresa.toLowerCase().includes('jenner') ? 'J' : 
                                       emp.empresa.substring(0, 2).toUpperCase();
                    const countFormatted = emp.count.toString().padStart(2, '0');
                    return (
                      <span key={emp.empresa} className="flex items-center gap-1">
                        <span className="font-medium">{abreviatura}:</span>
                        <span>{countFormatted}</span>
                      </span>
                    );
                  })}
                </div>
              )}
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
