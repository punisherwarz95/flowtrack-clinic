import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search, Activity, RefreshCw, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LogEntry {
  id: string;
  user_id: string;
  username: string | null;
  action: string;
  details: any;
  module: string | null;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  crear_paciente: "Crear paciente",
  editar_paciente: "Editar paciente",
  eliminar_paciente: "Eliminar paciente",
  crear_atencion: "Crear atención",
  completar_atencion: "Completar atención",
  incompleto_atencion: "Atención incompleta",
  llamar_paciente: "Llamar paciente",
  devolver_espera: "Devolver a espera",
  crear_usuario: "Crear usuario",
  eliminar_usuario: "Eliminar usuario",
  cambiar_password: "Cambiar contraseña",
  crear_empresa: "Crear empresa",
  editar_empresa: "Editar empresa",
  crear_cotizacion: "Crear cotización",
  editar_cotizacion: "Editar cotización",
  eliminar_cotizacion: "Eliminar cotización",
  duplicar_cotizacion: "Duplicar cotización",
  crear_prereserva: "Crear pre-reserva",
  eliminar_prereserva: "Eliminar pre-reserva",
  cambiar_estado_examen: "Cambiar estado examen",
  navegar_modulo: "Navegar módulo",
  crear_agenda_diferida: "Crear agenda diferida",
  vincular_agenda_diferida: "Vincular agenda diferida",
  generar_estado_pago: "Generar estado de pago",
};

const ActividadLog = () => {
  useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fechaHasta, setFechaHasta] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    loadLogs();
  }, [fechaDesde, fechaHasta]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (fechaDesde) query = query.gte("created_at", `${fechaDesde}T00:00:00`);
      if (fechaHasta) query = query.lte("created_at", `${fechaHasta}T23:59:59`);

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as LogEntry[]) || []);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const search = searchFilter.toLowerCase();
    if (!search) return true;
    return (
      (log.username || "").toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      JSON.stringify(log.details).toLowerCase().includes(search)
    );
  });

  const getActionBadge = (action: string) => {
    if (action.includes("eliminar") || action.includes("logout")) return <Badge variant="destructive" className="text-xs">{actionLabels[action] || action}</Badge>;
    if (action.includes("crear") || action.includes("login")) return <Badge className="bg-green-600 text-white text-xs">{actionLabels[action] || action}</Badge>;
    if (action.includes("editar") || action.includes("cambiar")) return <Badge className="bg-blue-600 text-white text-xs">{actionLabels[action] || action}</Badge>;
    return <Badge variant="secondary" className="text-xs">{actionLabels[action] || action}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" />
              Log de Actividad
            </h1>
            <p className="text-muted-foreground">Registro de todas las acciones realizadas en el sistema</p>
          </div>
          <Button variant="outline" onClick={loadLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Usuario, acción, detalle..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="pl-10" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No se encontraron registros</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha/Hora</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Detalles</TableHead>
                      <TableHead>Módulo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell className="font-medium">{log.username || "—"}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.details && Object.keys(log.details).length > 0
                            ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(", ")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{log.module || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">Mostrando {filteredLogs.length} de {logs.length} registros</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActividadLog;
