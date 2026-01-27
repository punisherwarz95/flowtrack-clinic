import { useEffect, useState, useMemo } from "react";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import EmpresaLayout from "@/components/empresa/EmpresaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Search,
  Calendar,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";

interface Evaluacion {
  id: string;
  resultado: string;
  observaciones: string | null;
  restricciones: string | null;
  numero_informe: number | null;
  evaluado_at: string | null;
  paquete: { nombre: string };
}

interface PacienteResultado {
  id: string;
  fecha: string;
  nombre: string;
  rut: string;
  cargo: string;
  faena: { nombre: string } | null;
  atencion: {
    id: string;
    evaluaciones: Evaluacion[];
  } | null;
}

const EmpresaResultados = () => {
  const { empresaUsuario } = useEmpresaAuth();

  const [pacientes, setPacientes] = useState<PacienteResultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState(
    format(new Date(new Date().setDate(1)), "yyyy-MM-dd")
  );
  const [fechaHasta, setFechaHasta] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteResultado | null>(null);

  useEffect(() => {
    if (empresaUsuario?.empresa_id) {
      loadResultados();
    }
  }, [empresaUsuario?.empresa_id, fechaDesde, fechaHasta]);

  const loadResultados = async () => {
    if (!empresaUsuario?.empresa_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prereservas")
        .select(`
          id,
          fecha,
          nombre,
          rut,
          cargo,
          faena:faenas(nombre),
          atencion:atenciones(
            id,
            evaluaciones:evaluaciones_clinicas(
              id,
              resultado,
              observaciones,
              restricciones,
              numero_informe,
              evaluado_at,
              paquete:paquetes_examenes(nombre)
            )
          )
        `)
        .eq("empresa_id", empresaUsuario.empresa_id)
        .eq("estado", "atendido")
        .gte("fecha", fechaDesde)
        .lte("fecha", fechaHasta)
        .order("fecha", { ascending: false });

      if (error) throw error;
      setPacientes((data as unknown as PacienteResultado[]) || []);
    } catch (error) {
      console.error("Error cargando resultados:", error);
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
        p.rut.toLowerCase().includes(search) ||
        p.cargo?.toLowerCase().includes(search)
    );
  }, [pacientes, searchFilter]);

  const getResultadoBadge = (resultado: string) => {
    switch (resultado) {
      case "aprobado":
        return (
          <Badge className="bg-green-600 text-white cursor-pointer">
            <CheckCircle className="h-3 w-3 mr-1" />
            Apto
          </Badge>
        );
      case "rechazado":
        return (
          <Badge variant="destructive" className="cursor-pointer">
            <XCircle className="h-3 w-3 mr-1" />
            No Apto
          </Badge>
        );
      case "observado":
        return (
          <Badge className="bg-amber-600 text-white cursor-pointer">
            <Clock className="h-3 w-3 mr-1" />
            Observado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="cursor-pointer">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  const getResumenResultados = (evaluaciones: Evaluacion[] | undefined) => {
    if (!evaluaciones || evaluaciones.length === 0) {
      return <Badge variant="secondary">Sin evaluaciones</Badge>;
    }

    const aprobados = evaluaciones.filter((e) => e.resultado === "aprobado").length;
    const rechazados = evaluaciones.filter((e) => e.resultado === "rechazado").length;
    const pendientes = evaluaciones.filter((e) => e.resultado === "pendiente").length;

    if (rechazados > 0) {
      return <Badge variant="destructive">No Apto</Badge>;
    }
    if (pendientes > 0) {
      return <Badge variant="secondary">En evaluación</Badge>;
    }
    if (aprobados === evaluaciones.length) {
      return <Badge className="bg-green-600 text-white">Apto</Badge>;
    }
    return <Badge variant="secondary">En proceso</Badge>;
  };

  return (
    <EmpresaLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Resultados de Evaluaciones</h1>
          <p className="text-muted-foreground">
            Consulte el estado de aptitud de sus trabajadores
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre, RUT, cargo..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de resultados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Resultados ({filteredPacientes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredPacientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron resultados para los filtros seleccionados
              </div>
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
                      <TableHead>Estado General</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPacientes.map((paciente) => (
                      <TableRow key={paciente.id}>
                        <TableCell>
                          {format(new Date(paciente.fecha + "T12:00:00"), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">{paciente.nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{paciente.rut}</TableCell>
                        <TableCell>{paciente.cargo}</TableCell>
                        <TableCell>{paciente.faena?.nombre || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {paciente.atencion?.evaluaciones?.map((e) => (
                              <div
                                key={e.id}
                                title={`${e.paquete?.nombre}: ${e.resultado}`}
                              >
                                {getResultadoBadge(e.resultado)}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getResumenResultados(paciente.atencion?.evaluaciones)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPaciente(paciente)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Ver detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de detalle */}
        <Dialog open={!!selectedPaciente} onOpenChange={() => setSelectedPaciente(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle de Evaluaciones</DialogTitle>
            </DialogHeader>

            {selectedPaciente && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-medium">{selectedPaciente.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">RUT</p>
                    <p className="font-mono">{selectedPaciente.rut}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cargo</p>
                    <p>{selectedPaciente.cargo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Faena</p>
                    <p>{selectedPaciente.faena?.nombre || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Atención</p>
                    <p>{format(new Date(selectedPaciente.fecha + "T12:00:00"), "dd/MM/yyyy")}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Evaluaciones por Batería</h4>
                  {selectedPaciente.atencion?.evaluaciones?.length === 0 ? (
                    <p className="text-muted-foreground">No hay evaluaciones registradas</p>
                  ) : (
                    selectedPaciente.atencion?.evaluaciones?.map((evaluacion) => (
                      <Card key={evaluacion.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium">{evaluacion.paquete?.nombre}</h5>
                              {evaluacion.evaluado_at && (
                                <p className="text-sm text-muted-foreground">
                                  Evaluado: {format(new Date(evaluacion.evaluado_at), "dd/MM/yyyy HH:mm")}
                                </p>
                              )}
                            </div>
                            {getResultadoBadge(evaluacion.resultado)}
                          </div>

                          {evaluacion.observaciones && (
                            <div className="mt-3 p-3 rounded-lg bg-muted">
                              <p className="text-sm font-medium">Observaciones:</p>
                              <p className="text-sm">{evaluacion.observaciones}</p>
                            </div>
                          )}

                          {evaluacion.restricciones && (
                            <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                              <p className="text-sm font-medium text-amber-800">Restricciones:</p>
                              <p className="text-sm text-amber-700">{evaluacion.restricciones}</p>
                            </div>
                          )}

                          {evaluacion.numero_informe && (
                            <div className="mt-3">
                              <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-2" />
                                Descargar Informe N° {evaluacion.numero_informe}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </EmpresaLayout>
  );
};

export default EmpresaResultados;
