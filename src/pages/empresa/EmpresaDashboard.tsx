import { useEffect, useState } from "react";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import EmpresaLayout from "@/components/empresa/EmpresaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import BusquedaPacientesHistorial from "@/components/empresa/BusquedaPacientesHistorial";
import {
  Calendar,
  Users,
  FileText,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface DashboardStats {
  prereservasHoy: number;
  prereservasPendientes: number;
  pacientesAtendidosMes: number;
  cotizacionesPendientes: number;
  estadosPagoPendientes: number;
  evaluacionesPendientes: number;
}

const EmpresaDashboard = () => {
  const { empresaUsuario, currentEmpresaId, isStaffAdmin, empresaOverride } = useEmpresaAuth();
  const [stats, setStats] = useState<DashboardStats>({
    prereservasHoy: 0,
    prereservasPendientes: 0,
    pacientesAtendidosMes: 0,
    cotizacionesPendientes: 0,
    estadosPagoPendientes: 0,
    evaluacionesPendientes: 0,
  });
  const [loading, setLoading] = useState(true);

  // Nombre de empresa actual (override o original)
  const currentEmpresaNombre = empresaOverride?.nombre ?? empresaUsuario?.empresas?.nombre ?? "Empresa";

  useEffect(() => {
    if (currentEmpresaId) {
      loadStats();
    } else if (isStaffAdmin) {
      // Admin sin empresa seleccionada - mostrar stats vacíos
      setLoading(false);
    }
  }, [currentEmpresaId]);

  const loadStats = async () => {
    if (!currentEmpresaId) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Pre-reservas de hoy
      const { count: prereservasHoy } = await supabase
        .from("prereservas")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", currentEmpresaId)
        .eq("fecha", today)
        .eq("estado", "pendiente");

      // Pre-reservas pendientes totales
      const { count: prereservasPendientes } = await supabase
        .from("prereservas")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", currentEmpresaId)
        .eq("estado", "pendiente")
        .gte("fecha", today);

      // Pacientes atendidos del mes
      const { count: pacientesAtendidosMes } = await supabase
        .from("prereservas")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", currentEmpresaId)
        .eq("estado", "atendido")
        .gte("fecha", startOfMonth.toISOString().split("T")[0]);

      // Cotizaciones pendientes
      const { count: cotizacionesPendientes } = await supabase
        .from("cotizacion_solicitudes")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", currentEmpresaId)
        .in("estado", ["pendiente", "en_revision"]);

      // Estados de pago pendientes
      const { count: estadosPagoPendientes } = await supabase
        .from("estados_pago")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", currentEmpresaId)
        .eq("estado", "pendiente");

      setStats({
        prereservasHoy: prereservasHoy || 0,
        prereservasPendientes: prereservasPendientes || 0,
        pacientesAtendidosMes: pacientesAtendidosMes || 0,
        cotizacionesPendientes: cotizacionesPendientes || 0,
        estadosPagoPendientes: estadosPagoPendientes || 0,
        evaluacionesPendientes: 0, // TODO: calcular
      });
    } catch (error) {
      console.error("Error cargando stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Pre-reservas Hoy",
      value: stats.prereservasHoy,
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      title: "Pendientes de Confirmar",
      value: stats.prereservasPendientes,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      title: "Atendidos este Mes",
      value: stats.pacientesAtendidosMes,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      title: "Cotizaciones Pendientes",
      value: stats.cotizacionesPendientes,
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      title: "Estados de Pago",
      value: stats.estadosPagoPendientes,
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-50",
    },
    {
      title: "Evaluaciones Pendientes",
      value: stats.evaluacionesPendientes,
      icon: CheckCircle,
      color: "text-teal-500",
      bgColor: "bg-teal-50",
    },
  ];

  return (
    <EmpresaLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            Bienvenido, {empresaUsuario?.nombre}
          </h1>
          <p className="text-muted-foreground">
            Panel de gestión de {currentEmpresaNombre}
          </p>
        </div>

        {/* Mensaje para admin sin empresa seleccionada */}
        {isStaffAdmin && !currentEmpresaId && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-amber-800 font-medium">
              Seleccione una empresa desde el menú superior para ver sus datos.
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? "..." : stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Acciones Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="/empresa/agendamiento"
                className="block p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <div className="font-medium">Agendar Pacientes</div>
                <div className="text-sm text-muted-foreground">
                  Crear nuevas pre-reservas para sus trabajadores
                </div>
              </a>
              <a
                href="/empresa/cotizaciones"
                className="block p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <div className="font-medium">Solicitar Cotización</div>
                <div className="text-sm text-muted-foreground">
                  Pedir cotización para nuevas baterías o servicios
                </div>
              </a>
              <a
                href="/empresa/resultados"
                className="block p-3 rounded-lg border hover:bg-muted transition-colors"
              >
                <div className="font-medium">Ver Resultados</div>
                <div className="text-sm text-muted-foreground">
                  Consultar estado y resultados de evaluaciones
                </div>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Información
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-sm font-medium">Empresa</div>
                <div className="text-lg">{currentEmpresaNombre}</div>
              </div>
              {(empresaOverride?.rut || empresaUsuario?.empresas?.rut) && (
                <div className="p-3 rounded-lg bg-muted">
                  <div className="text-sm font-medium">RUT</div>
                  <div className="text-lg">{empresaOverride?.rut || empresaUsuario?.empresas?.rut}</div>
                </div>
              )}
              <div className="p-3 rounded-lg bg-muted">
                <div className="text-sm font-medium">Usuario</div>
                <div className="text-lg">{empresaUsuario?.email}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda de Historial de Pacientes */}
        <BusquedaPacientesHistorial
          empresaId={currentEmpresaId}
          isStaffAdmin={isStaffAdmin}
        />
      </div>
    </EmpresaLayout>
  );
};

export default EmpresaDashboard;
