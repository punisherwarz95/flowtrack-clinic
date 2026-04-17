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

interface ModuloActivo {
  modulo_key: string;
  path: string;
  activo: boolean;
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
  const [modulosActivos, setModulosActivos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadModulos = async () => {
      const { data } = await supabase
        .from("empresa_modulos_config")
        .select("modulo_key, activo")
        .eq("activo", true);
      setModulosActivos(new Set((data || []).map((m: any) => m.modulo_key)));
    };
    loadModulos();
  }, []);

  const isModuloActivo = (key: string) => modulosActivos.has(key);

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
      setLoading(true);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      const today = now.toISOString().split("T")[0];

      // Fuente principal: tabla atenciones (igual método que el dashboard del staff)
      const [
        atencionesHoyRes,
        atencionesMesRes,
        prereservasPendientesRes,
        cotizacionesPendientesRes,
        estadosPagoPendientesRes,
        evaluacionesPendientesRes,
      ] = await Promise.all([
        supabase
          .from("atenciones")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", currentEmpresaId)
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay),
        supabase
          .from("atenciones")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", currentEmpresaId)
          .eq("estado", "completado")
          .gte("fecha_ingreso", startOfMonth)
          .lte("fecha_ingreso", endOfMonth),
        supabase
          .from("prereservas" as any)
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", currentEmpresaId)
          .eq("estado", "pendiente")
          .gte("fecha", today),
        supabase
          .from("cotizacion_solicitudes")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", currentEmpresaId)
          .in("estado", ["pendiente", "en_revision"]),
        supabase
          .from("estados_pago")
          .select("*", { count: "exact", head: true })
          .eq("empresa_id", currentEmpresaId)
          .eq("estado", "pendiente"),
        supabase
          .from("evaluaciones_clinicas")
          .select("id, atenciones!inner(empresa_id)", { count: "exact", head: true })
          .eq("atenciones.empresa_id", currentEmpresaId)
          .eq("resultado", "pendiente"),
      ]);

      setStats({
        prereservasHoy: atencionesHoyRes.count || 0,
        prereservasPendientes: prereservasPendientesRes.count || 0,
        pacientesAtendidosMes: atencionesMesRes.count || 0,
        cotizacionesPendientes: cotizacionesPendientesRes.count || 0,
        estadosPagoPendientes: estadosPagoPendientesRes.count || 0,
        evaluacionesPendientes: evaluacionesPendientesRes.count || 0,
      });
    } catch (error) {
      console.error("Error cargando stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const allStatCards = [
    {
      moduloKey: "agendamiento",
      title: "Atenciones Hoy",
      value: stats.prereservasHoy,
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      moduloKey: "agendamiento",
      title: "Pre-reservas Pendientes",
      value: stats.prereservasPendientes,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      moduloKey: "pacientes",
      title: "Atendidos este Mes",
      value: stats.pacientesAtendidosMes,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      moduloKey: "cotizaciones",
      title: "Cotizaciones Pendientes",
      value: stats.cotizacionesPendientes,
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      moduloKey: "estados-pago",
      title: "Estados de Pago",
      value: stats.estadosPagoPendientes,
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-50",
    },
    {
      moduloKey: "resultados",
      title: "Evaluaciones Pendientes",
      value: stats.evaluacionesPendientes,
      icon: CheckCircle,
      color: "text-teal-500",
      bgColor: "bg-teal-50",
    },
  ];

  const statCards = allStatCards.filter((s) => isModuloActivo(s.moduloKey));

  const allQuickActions = [
    {
      moduloKey: "agendamiento",
      href: "/empresa/agendamiento",
      title: "Agendar Pacientes",
      description: "Crear nuevas pre-reservas para sus trabajadores",
    },
    {
      moduloKey: "cotizaciones",
      href: "/empresa/cotizaciones",
      title: "Solicitar Cotización",
      description: "Pedir cotización para nuevas baterías o servicios",
    },
    {
      moduloKey: "resultados",
      href: "/empresa/resultados",
      title: "Ver Resultados",
      description: "Consultar estado y resultados de evaluaciones",
    },
  ];

  const quickActions = allQuickActions.filter((a) => isModuloActivo(a.moduloKey));

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
