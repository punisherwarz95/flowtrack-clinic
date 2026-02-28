import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Calendar, Building2, User, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";

interface Empresa {
  id: string;
  nombre: string;
}

interface ExamenHistorial {
  codigo: string | null;
  nombre: string;
  estado: string;
}

interface BateriaHistorial {
  nombre: string;
  examenes: ExamenHistorial[];
}

interface VisitaHistorial {
  id: string;
  fecha_ingreso: string;
  estado: string;
  paciente_nombre: string;
  paciente_rut: string;
  empresa_nombre: string;
  faena_nombre: string | null;
  baterias: string[];
  bateriasDetalle: BateriaHistorial[];
  examenes: ExamenHistorial[];
}

interface BusquedaPacientesHistorialProps {
  empresaId?: string | null;
  isStaffAdmin?: boolean;
}

const BusquedaPacientesHistorial = ({
  empresaId,
  isStaffAdmin,
}: BusquedaPacientesHistorialProps) => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>(empresaId || "__all__");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [busquedaGlobal, setBusquedaGlobal] = useState<string>("");
  const [resultados, setResultados] = useState<VisitaHistorial[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    if (isStaffAdmin || !empresaId) {
      loadEmpresas();
    }
  }, [isStaffAdmin, empresaId]);

  const loadEmpresas = async () => {
    const { data } = await supabase
      .from("empresas")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre");
    if (data) setEmpresas(data);
  };

  const buscarHistorial = async () => {
    setLoading(true);
    setBuscado(true);
    setErrorMsg(null);
    setDebugInfo(null);

    try {
      const empresaIdToFilter = empresaId || (empresaFiltro !== "__all__" ? empresaFiltro : null);

      const selectQuery = `
        id,
        fecha_ingreso,
        estado,
        pacientes!inner (
          id,
          nombre,
          rut,
          empresa_id,
          empresas ( nombre ),
          faena_id,
          faenas ( nombre )
        ),
        prereservas!atenciones_prereserva_id_fkey (
          prereserva_baterias (
            paquetes_examenes ( nombre )
          )
        ),
        atencion_baterias (
          paquetes_examenes (
            id,
            nombre,
            paquete_examen_items (
              examenes ( id, nombre, codigo )
            )
          )
        ),
        atencion_examenes (
          estado,
          examen_id,
          examenes ( nombre, codigo )
        )
      `;

      let query = supabase
        .from("atenciones")
        .select(selectQuery)
        .order("fecha_ingreso", { ascending: false });

      if (empresaIdToFilter) {
        query = query.eq("pacientes.empresa_id", empresaIdToFilter);
      }
      if (fechaDesde) query = query.gte("fecha_ingreso", fechaDesde);
      if (fechaHasta) query = query.lte("fecha_ingreso", `${fechaHasta}T23:59:59`);

      let { data, error } = await query.limit(500);

      // Fallback
      if (!error && empresaIdToFilter && (!data || data.length === 0)) {
        const { data: pacientesData, error: pacientesError } = await supabase
          .from("pacientes")
          .select("id")
          .eq("empresa_id", empresaIdToFilter);

        if (pacientesError) {
          setErrorMsg("No se pudieron cargar los pacientes de la empresa seleccionada.");
          setResultados([]);
          return;
        }

        const pacienteIds = pacientesData?.map((p: any) => p.id) || [];
        if (pacienteIds.length === 0) {
          setResultados([]);
          setDebugInfo(`empresa=${empresaIdToFilter} · pacientes=0 · atenciones=0`);
          return;
        }

        let query2 = supabase
          .from("atenciones")
          .select(selectQuery)
          .order("fecha_ingreso", { ascending: false })
          .in("paciente_id", pacienteIds);

        if (fechaDesde) query2 = query2.gte("fecha_ingreso", fechaDesde);
        if (fechaHasta) query2 = query2.lte("fecha_ingreso", `${fechaHasta}T23:59:59`);

        const res2 = await query2.limit(500);
        data = res2.data;
        error = res2.error;
        setDebugInfo(`fallback · empresa=${empresaIdToFilter} · pacientes=${pacienteIds.length} · atenciones=${data?.length ?? 0}`);
      } else {
        setDebugInfo(`join · empresa=${empresaIdToFilter ?? "__all__"} · atenciones=${data?.length ?? 0}`);
      }

      if (error) {
        console.error("Error buscando historial:", error);
        setErrorMsg("No se pudo ejecutar la búsqueda. Intenta nuevamente.");
        setResultados([]);
        return;
      }

      let visitas: VisitaHistorial[] = (data || []).map((atencion: any) => {
        // Build atencion_examenes map by examen_id for status lookup
        const examenEstadoMap = new Map<string, string>();
        (atencion.atencion_examenes || []).forEach((ae: any) => {
          if (ae.examen_id) examenEstadoMap.set(ae.examen_id, ae.estado || "pendiente");
        });

        // Build bateriasDetalle from atencion_baterias
        const bateriasDetalle: BateriaHistorial[] = (atencion.atencion_baterias || []).map((ab: any) => {
          const paquete = ab.paquetes_examenes;
          const examenesDelPaquete: ExamenHistorial[] = (paquete?.paquete_examen_items || []).map((item: any) => ({
            codigo: item.examenes?.codigo || null,
            nombre: item.examenes?.nombre || "",
            estado: examenEstadoMap.get(item.examenes?.id) || "pendiente",
          }));
          return {
            nombre: paquete?.nombre || "Sin nombre",
            examenes: examenesDelPaquete,
          };
        });

        return {
          id: atencion.id,
          fecha_ingreso: atencion.fecha_ingreso,
          estado: atencion.estado,
          paciente_nombre: atencion.pacientes?.nombre || "",
          paciente_rut: atencion.pacientes?.rut || "",
          empresa_nombre: atencion.pacientes?.empresas?.nombre || "Sin empresa",
          faena_nombre: atencion.pacientes?.faenas?.nombre || null,
          baterias: atencion.prereservas?.prereserva_baterias?.map(
            (pb: any) => pb.paquetes_examenes?.nombre
          ).filter(Boolean) || [],
          bateriasDetalle,
          examenes: (atencion.atencion_examenes || []).map((ae: any) => ({
            codigo: ae.examenes?.codigo || null,
            nombre: ae.examenes?.nombre || "",
            estado: ae.estado || "pendiente",
          })),
        };
      });

      if (busquedaGlobal.trim()) {
        const termino = busquedaGlobal.toLowerCase().trim();
        visitas = visitas.filter(
          (v) =>
            v.paciente_nombre.toLowerCase().includes(termino) ||
            (v.paciente_rut && v.paciente_rut.toLowerCase().includes(termino))
        );
      }

      setResultados(visitas);
    } catch (err) {
      console.error("Error en búsqueda:", err);
      setErrorMsg("Ocurrió un error inesperado al buscar.");
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  const formatEstadoExamen = (estado: string) => {
    const map: Record<string, string> = {
      pendiente: "Pendiente",
      completado: "Completado",
      incompleto: "Incompleto",
    };
    return map[estado] || estado;
  };

  const exportarExcel = () => {
    const rows: any[] = [];

    resultados.forEach((visita) => {
      const fecha = visita.fecha_ingreso
        ? format(new Date(visita.fecha_ingreso), "dd/MM/yyyy HH:mm")
        : "";

      if (visita.bateriasDetalle.length > 0) {
        visita.bateriasDetalle.forEach((bat) => {
          if (bat.examenes.length > 0) {
            bat.examenes.forEach((ex) => {
              rows.push({
                Fecha: fecha,
                RUT: visita.paciente_rut || "",
                Nombre: visita.paciente_nombre,
                Empresa: visita.empresa_nombre,
                Batería: bat.nombre,
                "Código Examen": ex.codigo || "",
                "Nombre Examen": ex.nombre,
                "Estado Examen": formatEstadoExamen(ex.estado),
              });
            });
          } else {
            rows.push({
              Fecha: fecha,
              RUT: visita.paciente_rut || "",
              Nombre: visita.paciente_nombre,
              Empresa: visita.empresa_nombre,
              Batería: bat.nombre,
              "Código Examen": "",
              "Nombre Examen": "Sin exámenes en batería",
              "Estado Examen": "",
            });
          }
        });
      } else if (visita.examenes.length > 0) {
        // Exámenes sueltos sin batería
        visita.examenes.forEach((ex) => {
          rows.push({
            Fecha: fecha,
            RUT: visita.paciente_rut || "",
            Nombre: visita.paciente_nombre,
            Empresa: visita.empresa_nombre,
            Batería: "Sin batería",
            "Código Examen": ex.codigo || "",
            "Nombre Examen": ex.nombre,
            "Estado Examen": formatEstadoExamen(ex.estado),
          });
        });
      } else {
        rows.push({
          Fecha: fecha,
          RUT: visita.paciente_rut || "",
          Nombre: visita.paciente_nombre,
          Empresa: visita.empresa_nombre,
          Batería: "",
          "Código Examen": "",
          "Nombre Examen": "Sin exámenes",
          "Estado Examen": "",
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");

    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key] || "").length)) + 2,
    }));
    ws["!cols"] = colWidths;

    const fileName = `historial_pacientes_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const formatEstado = (estado: string) => {
    const estados: Record<string, { label: string; className: string }> = {
      en_espera: { label: "En espera", className: "bg-amber-100 text-amber-800" },
      en_atencion: { label: "En atención", className: "bg-blue-100 text-blue-800" },
      completado: { label: "Completado", className: "bg-green-100 text-green-800" },
      incompleto: { label: "Incompleto", className: "bg-red-100 text-red-800" },
    };
    return estados[estado] || { label: estado, className: "bg-gray-100 text-gray-800" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Búsqueda de Historial de Pacientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Nombre o RUT
            </Label>
            <Input
              placeholder="Buscar por nombre o RUT..."
              value={busquedaGlobal}
              onChange={(e) => setBusquedaGlobal(e.target.value)}
            />
          </div>

          {(isStaffAdmin || !empresaId) && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Empresa
              </Label>
              <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas las empresas</SelectItem>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Desde
            </Label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Hasta
            </Label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2">
          {resultados.length > 0 && (
            <Button variant="outline" onClick={exportarExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          )}
          <Button onClick={buscarHistorial} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {errorMsg && (
          <div className="text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        {debugInfo && (
          <div className="text-xs text-muted-foreground">
            {debugInfo}
          </div>
        )}

        {/* Resultados */}
        {buscado && (
          <div className="border rounded-lg">
            {resultados.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No se encontraron resultados
              </div>
            ) : (
              <>
                <div className="p-2 bg-muted text-sm text-muted-foreground">
                  {resultados.length} resultado{resultados.length !== 1 ? "s" : ""} encontrado{resultados.length !== 1 ? "s" : ""}
                </div>
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>RUT</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Faena</TableHead>
                        <TableHead>Baterías</TableHead>
                        <TableHead>Exámenes</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultados.map((visita) => {
                        const estadoInfo = formatEstado(visita.estado);
                        return (
                          <TableRow key={visita.id}>
                            <TableCell className="whitespace-nowrap">
                              {visita.fecha_ingreso
                                ? format(new Date(visita.fecha_ingreso), "dd/MM/yyyy HH:mm", { locale: es })
                                : "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {visita.paciente_nombre}
                            </TableCell>
                            <TableCell>{visita.paciente_rut || "-"}</TableCell>
                            <TableCell>{visita.empresa_nombre}</TableCell>
                            <TableCell>{visita.faena_nombre || "-"}</TableCell>
                            <TableCell>
                              {visita.baterias.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {visita.baterias.map((b, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded"
                                    >
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {visita.examenes.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {visita.examenes.map((ex, idx) => (
                                    <span
                                      key={idx}
                                      className={`px-2 py-0.5 text-xs rounded ${
                                        ex.estado === "completado"
                                          ? "bg-green-100 text-green-800"
                                          : ex.estado === "incompleto"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-amber-100 text-amber-800"
                                      }`}
                                    >
                                      {ex.estado === "completado" && "✓ "}
                                      {ex.codigo ? `${ex.codigo} - ` : ""}{ex.nombre}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Sin exámenes</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${estadoInfo.className}`}
                              >
                                {estadoInfo.label}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BusquedaPacientesHistorial;
