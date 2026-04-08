import { useEffect, useState, useMemo } from "react";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import EmpresaLayout from "@/components/empresa/EmpresaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Search, Calendar, ClipboardCheck, CheckCircle, XCircle, Clock, FileText, Download,
} from "lucide-react";
import { generarEvaluacionPDF } from "@/components/empresa/EvaluacionPDF";
import { toast } from "sonner";

// v2 - Refactored to use atenciones as data source

interface Evaluacion {
  id: string;
  resultado: string;
  observaciones: string | null;
  restricciones: string | null;
  numero_informe: number | null;
  evaluado_at: string | null;
  evaluado_por: string | null;
  datos_clinicos: any;
  paquete: { nombre: string };
}

interface AtencionExamen {
  id: string;
  estado: string;
  examen: { nombre: string };
}

interface PacienteResultado {
  atencion_id: string;
  fecha_ingreso: string;
  nombre: string;
  rut: string;
  cargo: string;
  fecha_nacimiento: string | null;
  tipo_servicio: string | null;
  empresa_nombre: string;
  empresa_rut: string;
  evaluaciones: Evaluacion[];
  examenes: AtencionExamen[];
}

const EmpresaResultados = () => {
  const { currentEmpresaId } = useEmpresaAuth();

  const [pacientes, setPacientes] = useState<PacienteResultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [fechaDesde, setFechaDesde] = useState(
    format(new Date(new Date().setDate(1)), "yyyy-MM-dd")
  );
  const [fechaHasta, setFechaHasta] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteResultado | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    if (currentEmpresaId) loadResultados();
    else setLoading(false);
  }, [currentEmpresaId, fechaDesde, fechaHasta]);

  const loadResultados = async () => {
    if (!currentEmpresaId) return;
    setLoading(true);
    try {
      // Get atenciones for patients belonging to this empresa
      const { data, error } = await supabase
        .from("atenciones")
        .select(`
          id,
          fecha_ingreso,
          paciente:pacientes!inner(
            nombre, rut, cargo, fecha_nacimiento, tipo_servicio,
            empresa:empresas(nombre, rut)
          ),
          evaluaciones:evaluaciones_clinicas(
            id, resultado, observaciones, restricciones, numero_informe,
            evaluado_at, evaluado_por, datos_clinicos,
            paquete:paquetes_examenes(nombre)
          ),
          examenes:atencion_examenes(
            id, estado,
            examen:examenes(nombre)
          )
        `)
        .eq("paciente.empresa_id", currentEmpresaId)
        .gte("fecha_ingreso", `${fechaDesde}T00:00:00`)
        .lte("fecha_ingreso", `${fechaHasta}T23:59:59`)
        .in("estado", ["en_atencion", "completado"])
        .order("fecha_ingreso", { ascending: false });

      if (error) throw error;

      const mapped: PacienteResultado[] = (data || []).map((a: any) => ({
        atencion_id: a.id,
        fecha_ingreso: a.fecha_ingreso,
        nombre: a.paciente?.nombre || "",
        rut: a.paciente?.rut || "",
        cargo: a.paciente?.cargo || "",
        fecha_nacimiento: a.paciente?.fecha_nacimiento || null,
        tipo_servicio: a.paciente?.tipo_servicio || null,
        empresa_nombre: a.paciente?.empresa?.nombre || "",
        empresa_rut: a.paciente?.empresa?.rut || "",
        evaluaciones: a.evaluaciones || [],
        examenes: a.examenes || [],
      }));

      setPacientes(mapped);
    } catch (error) {
      console.error("Error cargando resultados:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPacientes = useMemo(() => {
    if (!searchFilter) return pacientes;
    const s = searchFilter.toLowerCase();
    return pacientes.filter(
      (p) => p.nombre.toLowerCase().includes(s) || p.rut.toLowerCase().includes(s) || p.cargo?.toLowerCase().includes(s)
    );
  }, [pacientes, searchFilter]);

  const getResultadoBadge = (resultado: string) => {
    switch (resultado) {
      case "aprobado":
        return (
          <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Apto</Badge>
        );
      case "rechazado":
        return (
          <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />No Apto</Badge>
        );
      default:
        return (
          <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>
        );
    }
  };

  const getResumenGeneral = (evaluaciones: Evaluacion[]) => {
    if (!evaluaciones || evaluaciones.length === 0) {
      return <Badge variant="secondary">Sin evaluaciones</Badge>;
    }
    const rechazados = evaluaciones.filter((e) => e.resultado === "rechazado").length;
    const pendientes = evaluaciones.filter((e) => !e.resultado || e.resultado === "pendiente").length;
    const aprobados = evaluaciones.filter((e) => e.resultado === "aprobado").length;

    if (rechazados > 0) return <Badge variant="destructive">No Apto</Badge>;
    if (pendientes > 0) return <Badge variant="secondary">En evaluación</Badge>;
    if (aprobados === evaluaciones.length) return <Badge className="bg-green-600 text-white">Apto</Badge>;
    return <Badge variant="secondary">En proceso</Badge>;
  };

  const handleDescargarPDF = async (paciente: PacienteResultado, evaluacion: Evaluacion) => {
    setGeneratingPDF(true);
    try {
      await generarEvaluacionPDF({
        evaluacion: {
          ...evaluacion,
          datos_clinicos: evaluacion.datos_clinicos || {},
        },
        paciente: {
          nombre: paciente.nombre,
          rut: paciente.rut,
          cargo: paciente.cargo,
          fecha_nacimiento: paciente.fecha_nacimiento,
        },
        empresa: {
          nombre: paciente.empresa_nombre,
          rut: paciente.empresa_rut,
        },
        tipo_servicio: paciente.tipo_servicio,
        fecha_atencion: paciente.fecha_ingreso,
        examenes: paciente.examenes.map((ex: any) => ({
          nombre: ex.examen?.nombre || "",
          estado: ex.estado,
        })),
      });
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setGeneratingPDF(false);
    }
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />Resultados ({filteredPacientes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
                      <TableHead>Baterías</TableHead>
                      <TableHead>Estado General</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPacientes.map((p) => (
                      <TableRow key={p.atencion_id}>
                        <TableCell>
                          {format(new Date(p.fecha_ingreso), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{p.rut}</TableCell>
                        <TableCell>{p.cargo || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {p.evaluaciones.map((e) => (
                              <div key={e.id} title={`${e.paquete?.nombre}: ${e.resultado}`} className="cursor-pointer" onClick={() => setSelectedPaciente(p)}>
                                {getResultadoBadge(e.resultado)}
                              </div>
                            ))}
                            {p.evaluaciones.length === 0 && (
                              <Badge variant="secondary">Sin baterías</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getResumenGeneral(p.evaluaciones)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPaciente(p)}>
                            <FileText className="h-4 w-4 mr-1" />Ver detalle
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
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
                    <p>{selectedPaciente.cargo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Atención</p>
                    <p>{format(new Date(selectedPaciente.fecha_ingreso), "dd/MM/yyyy")}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Evaluaciones por Batería</h4>
                  {selectedPaciente.evaluaciones.length === 0 ? (
                    <p className="text-muted-foreground">No hay evaluaciones registradas</p>
                  ) : (
                    selectedPaciente.evaluaciones.map((evaluacion) => (
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

                          {(evaluacion.resultado === "aprobado" || evaluacion.resultado === "rechazado") && evaluacion.numero_informe && (
                            <div className="mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={generatingPDF}
                                onClick={() => handleDescargarPDF(selectedPaciente, evaluacion)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {generatingPDF ? "Generando..." : `Descargar Informe N° ${evaluacion.numero_informe}`}
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
