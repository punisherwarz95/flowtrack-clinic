import { useEffect, useState, useMemo } from "react";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import EmpresaLayout from "@/components/empresa/EmpresaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Search, Users, Calendar } from "lucide-react";

interface PacienteAtendido {
  id: string;
  fecha: string;
  nombre: string;
  rut: string;
  cargo: string;
  estado: string;
  faena: { nombre: string } | null;
  baterias: { paquete: { nombre: string } }[];
  atencion: {
    estado: string | null;
    fecha_fin_atencion: string | null;
  } | null;
}

const EmpresaPacientes = () => {
  const { currentEmpresaId, isStaffAdmin } = useEmpresaAuth();
  const [pacientes, setPacientes] = useState<PacienteAtendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState(
    format(new Date(new Date().setDate(1)), "yyyy-MM-dd")
  );
  const [fechaHasta, setFechaHasta] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (currentEmpresaId) {
      loadPacientes();
    } else {
      setLoading(false);
    }
  }, [currentEmpresaId, fechaDesde, fechaHasta]);

  const loadPacientes = async () => {
    if (!currentEmpresaId) return;

    setLoading(true);
    try {
      // Nota: En este proyecto las atenciones no están ligadas a prereservas (prereserva_id viene null),
      // por lo que el historial de atendidos se arma desde atenciones + pacientes.
      const { data: pacientesData, error: pacientesError } = await supabase
        .from("pacientes")
        .select("id, nombre, rut, cargo, faena:faenas(nombre)")
        .eq("empresa_id", currentEmpresaId);

      if (pacientesError) throw pacientesError;

      const pacienteIds = (pacientesData ?? []).map((p: any) => p.id).filter(Boolean);
      if (pacienteIds.length === 0) {
        setPacientes([]);
        return;
      }

      let atQuery = supabase
        .from("atenciones")
        .select("id, paciente_id, fecha_ingreso, estado, fecha_fin_atencion")
        .in("paciente_id", pacienteIds)
        .order("fecha_ingreso", { ascending: false });

      if (fechaDesde) atQuery = atQuery.gte("fecha_ingreso", `${fechaDesde}T00:00:00`);
      if (fechaHasta) atQuery = atQuery.lte("fecha_ingreso", `${fechaHasta}T23:59:59`);

      const { data: atencionesData, error: atencionesError } = await atQuery.limit(1000);
      if (atencionesError) throw atencionesError;

      const pacienteById = new Map<string, any>((pacientesData ?? []).map((p: any) => [p.id, p]));
      const rows: PacienteAtendido[] = (atencionesData ?? []).map((a: any) => {
        const p = pacienteById.get(a.paciente_id);
        const fecha = a.fecha_ingreso ? String(a.fecha_ingreso).slice(0, 10) : "";
        const estado = a.estado ?? "";

        return {
          id: a.id,
          fecha,
          nombre: p?.nombre ?? "",
          rut: p?.rut ?? "-",
          cargo: p?.cargo ?? "-",
          estado,
          faena: p?.faena ?? null,
          baterias: [],
          atencion: {
            estado: a.estado ?? null,
            fecha_fin_atencion: a.fecha_fin_atencion ?? null,
          },
        };
      });

      setPacientes(rows);
    } catch (error) {
      console.error("Error cargando pacientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPacientes = useMemo(() => {
    if (!searchFilter) return pacientes;
    const search = searchFilter.toLowerCase();
    return pacientes.filter(
      (p) =>
        p.nombre.toLowerCase().includes(search) ||
        (p.rut ?? "").toLowerCase().includes(search) ||
        p.cargo?.toLowerCase().includes(search)
    );
  }, [pacientes, searchFilter]);

  const getEstadoBadge = (paciente: PacienteAtendido) => {
    if (paciente.atencion?.estado === "completado") {
      return <Badge className="bg-green-600 text-white">Completado</Badge>;
    }
    if (paciente.atencion?.estado === "en_atencion") {
      return <Badge className="bg-blue-600 text-white">En Atención</Badge>;
    }
    if (paciente.atencion?.estado === "en_espera") {
      return <Badge className="bg-amber-600 text-white">En espera</Badge>;
    }
    if (paciente.atencion?.estado === "incompleto") {
      return <Badge variant="destructive">Incompleto</Badge>;
    }
    return <Badge variant="secondary">Pendiente</Badge>;
  };

  return (
    <EmpresaLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pacientes Atendidos</h1>
          <p className="text-muted-foreground">Historial de trabajadores atendidos</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <Input placeholder="Nombre, RUT, cargo..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="pl-10" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Atendidos</p>
                  <p className="text-2xl font-bold">{pacientes.filter((p) => p.atencion?.estado === "completado").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">En Proceso</p>
                  <p className="text-2xl font-bold">{pacientes.filter((p) => p.atencion?.estado === "en_atencion").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">En espera</p>
                  <p className="text-2xl font-bold">{pacientes.filter((p) => p.atencion?.estado === "en_espera").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
            ) : filteredPacientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No se encontraron pacientes</div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>RUT</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Faena</TableHead>
                      <TableHead>Baterías</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPacientes.map((paciente) => (
                      <TableRow key={paciente.id}>
                        <TableCell>{format(new Date(paciente.fecha + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">{paciente.nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{paciente.rut}</TableCell>
                        <TableCell>{paciente.cargo}</TableCell>
                        <TableCell>{paciente.faena?.nombre || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {paciente.baterias?.map((b, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{b.paquete?.nombre}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{getEstadoBadge(paciente)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">Mostrando {filteredPacientes.length} de {pacientes.length} registros</p>
          </CardContent>
        </Card>
      </div>
    </EmpresaLayout>
  );
};

export default EmpresaPacientes;
