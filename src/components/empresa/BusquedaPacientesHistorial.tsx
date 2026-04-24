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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar, Building2, User, Download, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import { normalizeRut } from "@/lib/utils";

// v2 - Búsqueda histórica por RUT normalizado y empresa histórica de la atención

const ALL_EXPORT_COLUMNS = [
  { key: "Fecha", label: "Fecha" },
  { key: "RUT", label: "RUT" },
  { key: "Nombre", label: "Nombre" },
  { key: "Empresa", label: "Empresa" },
  { key: "Batería", label: "Batería" },
  { key: "Código Examen", label: "Código Examen" },
  { key: "Nombre Examen", label: "Nombre Examen" },
  { key: "Estado Examen", label: "Estado Examen" },
] as const;

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
  const [selectedExportColumns, setSelectedExportColumns] = useState<string[]>([]);

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

      const baseSelectQuery = `
        id,
        empresa_id,
        fecha_ingreso,
        estado,
        paciente_id,
        pacientes!inner (
          id,
          nombre,
          rut,
          faenas ( nombre )
        )
      `;

      const PAGE_SIZE = 500;
      const SUPABASE_ROW_LIMIT = 1000;
      const MAX_PAGES = 200; // hasta 100.000 atenciones livianas
      // Chunk pequeño para evitar el límite de 1,000 filas por query de Supabase.
      // Con ~12 exámenes por atención, 50 atenciones ~= 600 filas (margen seguro).
      const DETAIL_CHUNK_SIZE = 50;

      const fetchAllPaginated = async (
        selectQuery: string,
        applyFilters: (q: any) => any
      ): Promise<{ data: any[] | null; error: any; total: number | null }> => {
        const all: any[] = [];
        let from = 0;
        let total: number | null = null;

        for (let i = 0; i < MAX_PAGES; i++) {
          let q = supabase
            .from("atenciones")
            .select(selectQuery, i === 0 ? { count: "exact" } : undefined)
            .order("fecha_ingreso", { ascending: false });
          q = applyFilters(q);
          q = q.range(from, from + PAGE_SIZE - 1);
          const { data: pageData, error: pageErr, count } = await q;
          if (pageErr) return { data: null, error: pageErr, total };
          if (i === 0 && typeof count === "number") total = count;
          if (!pageData || pageData.length === 0) break;
          all.push(...pageData);
          from += pageData.length;
          if (pageData.length < PAGE_SIZE) break;
          if (total !== null && all.length >= total) break;
        }
        return { data: all, error: null, total };
      };

      const fetchDetallesAtenciones = async (atencionIds: string[]) => {
        const bateriasPorAtencion = new Map<string, BateriaHistorial[]>();
        const examenesPorAtencion = new Map<string, ExamenHistorial[]>();

        // Fetch paginado para evitar el límite de 1,000 filas por query de Supabase.
        const fetchAllRowsByAtencionIds = async (table: string, select: string, ids: string[]) => {
          const all: any[] = [];
          let from = 0;
          while (true) {
            const { data, error } = await supabase
              .from(table as any)
              .select(select)
              .in("atencion_id", ids)
              .range(from, from + SUPABASE_ROW_LIMIT - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            all.push(...data);
            if (data.length < SUPABASE_ROW_LIMIT) break;
            from += data.length;
          }
          return all;
        };

        for (let i = 0; i < atencionIds.length; i += DETAIL_CHUNK_SIZE) {
          const idsChunk = atencionIds.slice(i, i + DETAIL_CHUNK_SIZE);

          const [atencionExamenesData, atencionBateriasData] = await Promise.all([
            fetchAllRowsByAtencionIds(
              "atencion_examenes",
              `atencion_id, estado, examen_id, examen:examenes ( id, nombre, codigo )`,
              idsChunk
            ),
            fetchAllRowsByAtencionIds(
              "atencion_baterias",
              `atencion_id, paquete:paquetes_examenes ( id, nombre, paquete_examen_items ( examenes ( id, nombre, codigo ) ) )`,
              idsChunk
            ),
          ]);

          const estadoExamenPorAtencion = new Map<string, Map<string, string>>();

          (atencionExamenesData || []).forEach((ae: any) => {
            if (!examenesPorAtencion.has(ae.atencion_id)) {
              examenesPorAtencion.set(ae.atencion_id, []);
            }
            examenesPorAtencion.get(ae.atencion_id)!.push({
              codigo: ae.examen?.codigo || null,
              nombre: ae.examen?.nombre || "",
              estado: ae.estado || "pendiente",
            });

            if (!estadoExamenPorAtencion.has(ae.atencion_id)) {
              estadoExamenPorAtencion.set(ae.atencion_id, new Map<string, string>());
            }
            if (ae.examen_id) {
              estadoExamenPorAtencion.get(ae.atencion_id)!.set(ae.examen_id, ae.estado || "pendiente");
            }
          });

          (atencionBateriasData || []).forEach((ab: any) => {
            const paquete = ab.paquete;
            const estadoMap = estadoExamenPorAtencion.get(ab.atencion_id) || new Map<string, string>();
            const examenesDelPaquete: ExamenHistorial[] = (paquete?.paquete_examen_items || []).map((item: any) => ({
              codigo: item.examenes?.codigo || null,
              nombre: item.examenes?.nombre || "",
              estado: estadoMap.get(item.examenes?.id) || "pendiente",
            }));

            if (!bateriasPorAtencion.has(ab.atencion_id)) {
              bateriasPorAtencion.set(ab.atencion_id, []);
            }
            bateriasPorAtencion.get(ab.atencion_id)!.push({
              nombre: paquete?.nombre || "Sin nombre",
              examenes: examenesDelPaquete,
            });
          });
        }

        return { bateriasPorAtencion, examenesPorAtencion };
      };

      const applyMainFilters = (q: any) => {
        if (empresaIdToFilter) q = q.eq("empresa_id", empresaIdToFilter);
        if (fechaDesde) q = q.gte("fecha_ingreso", `${fechaDesde}T00:00:00`);
        if (fechaHasta) q = q.lte("fecha_ingreso", `${fechaHasta}T23:59:59`);
        return q;
      };

      const { data, error, total } = await fetchAllPaginated(baseSelectQuery, applyMainFilters);
      setDebugInfo(`histórico · empresa=${empresaIdToFilter ?? "__all__"} · atenciones=${data?.length ?? 0}/${total ?? "?"}`);

      if (error) {
        console.error("Error buscando historial:", error);
        setErrorMsg("No se pudo ejecutar la búsqueda. Intenta nuevamente.");
        setResultados([]);
        return;
      }

      let baseAtenciones = data || [];

      if (busquedaGlobal.trim()) {
        const termino = busquedaGlobal.toLowerCase().trim();
        const terminoRut = normalizeRut(busquedaGlobal.trim());
        baseAtenciones = baseAtenciones.filter(
          (v) =>
            v.pacientes?.nombre?.toLowerCase().includes(termino) ||
            (terminoRut.length > 0 && normalizeRut(v.pacientes?.rut || "").includes(terminoRut))
        );
      }

      const empresaIds = [...new Set(baseAtenciones.map((atencion: any) => atencion.empresa_id).filter(Boolean))];
      const { data: empresasData, error: empresasError } = empresaIds.length
        ? await supabase.from("empresas").select("id, nombre").in("id", empresaIds)
        : { data: [], error: null };

      if (empresasError) throw empresasError;

      const empresasMap = new Map((empresasData || []).map((empresa: any) => [empresa.id, empresa.nombre]));
      const { bateriasPorAtencion, examenesPorAtencion } = await fetchDetallesAtenciones(baseAtenciones.map((atencion: any) => atencion.id));

      const visitas: VisitaHistorial[] = baseAtenciones.map((atencion: any) => {
        const bateriasDetalle = bateriasPorAtencion.get(atencion.id) || [];
        return {
          id: atencion.id,
          fecha_ingreso: atencion.fecha_ingreso,
          estado: atencion.estado,
          paciente_nombre: atencion.pacientes?.nombre || "",
          paciente_rut: atencion.pacientes?.rut || "",
          empresa_nombre: empresasMap.get(atencion.empresa_id) || "Sin empresa",
          faena_nombre: atencion.pacientes?.faenas?.nombre || null,
          baterias: bateriasDetalle.map((bateria) => bateria.nombre),
          bateriasDetalle,
          examenes: examenesPorAtencion.get(atencion.id) || [],
        };
      });

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

    // Check if exam-level columns are selected
    const columnsToExport = selectedExportColumns.length > 0
      ? selectedExportColumns
      : ALL_EXPORT_COLUMNS.map(c => c.key);
    const includeExamColumns = columnsToExport.includes("Código Examen") ||
      columnsToExport.includes("Nombre Examen") ||
      columnsToExport.includes("Estado Examen");

    resultados.forEach((visita) => {
      const fecha = visita.fecha_ingreso
        ? format(new Date(visita.fecha_ingreso), "dd/MM/yyyy HH:mm")
        : "";

      const baseRow = {
        Fecha: fecha,
        RUT: visita.paciente_rut || "",
        Nombre: visita.paciente_nombre,
        Empresa: visita.empresa_nombre,
      };

      if (visita.bateriasDetalle.length > 0) {
        if (includeExamColumns) {
          // Expand per exam as before
          visita.bateriasDetalle.forEach((bat) => {
            if (bat.examenes.length > 0) {
              bat.examenes.forEach((ex) => {
                rows.push({
                  ...baseRow,
                  Batería: bat.nombre,
                  "Código Examen": ex.codigo || "",
                  "Nombre Examen": ex.nombre,
                  "Estado Examen": formatEstadoExamen(ex.estado),
                });
              });
            } else {
              rows.push({
                ...baseRow,
                Batería: bat.nombre,
                "Código Examen": "",
                "Nombre Examen": "Sin exámenes en batería",
                "Estado Examen": "",
              });
            }
          });
        } else {
          // One row per battery, no exam expansion
          visita.bateriasDetalle.forEach((bat) => {
            rows.push({
              ...baseRow,
              Batería: bat.nombre,
            });
          });
        }
      } else if (visita.examenes.length > 0) {
        if (includeExamColumns) {
          visita.examenes.forEach((ex) => {
            rows.push({
              ...baseRow,
              Batería: "Sin batería",
              "Código Examen": ex.codigo || "",
              "Nombre Examen": ex.nombre,
              "Estado Examen": formatEstadoExamen(ex.estado),
            });
          });
        } else {
          rows.push({
            ...baseRow,
            Batería: "Sin batería",
          });
        }
      } else {
        rows.push({
          ...baseRow,
          Batería: "",
          ...(includeExamColumns ? { "Código Examen": "", "Nombre Examen": "Sin exámenes", "Estado Examen": "" } : {}),
        });
      }
    });

    // Filter columns based on selection (already computed above)

    const filteredRows = rows.map(row => {
      const filtered: any = {};
      columnsToExport.forEach(col => {
        if (col in row) filtered[col] = row[col];
      });
      return filtered;
    });

    const ws = XLSX.utils.json_to_sheet(filteredRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");

    // Auto-width columns
    const colWidths = Object.keys(filteredRows[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...filteredRows.map((r) => String(r[key] || "").length)) + 2,
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
        <div className="flex justify-end gap-2 flex-wrap items-center">
          {resultados.length > 0 && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <ChevronDown className="h-4 w-4" />
                    {selectedExportColumns.length === 0
                      ? "Columnas: Todas"
                      : `Columnas: ${selectedExportColumns.length} seleccionada${selectedExportColumns.length !== 1 ? "s" : ""}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="space-y-1">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      Columnas a exportar
                    </div>
                    <button
                      className="w-full text-left px-2 py-1 text-xs text-primary hover:bg-muted rounded cursor-pointer"
                      onClick={() => setSelectedExportColumns([])}
                    >
                      Seleccionar todas
                    </button>
                    {ALL_EXPORT_COLUMNS.map((col) => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-muted rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={
                            selectedExportColumns.length === 0 ||
                            selectedExportColumns.includes(col.key)
                          }
                          onCheckedChange={(checked) => {
                            if (selectedExportColumns.length === 0) {
                              // Was "all" → now deselect this one
                              setSelectedExportColumns(
                                ALL_EXPORT_COLUMNS.map(c => c.key).filter(k => k !== col.key)
                              );
                            } else if (checked) {
                              const next = [...selectedExportColumns, col.key];
                              // If all selected, reset to empty (= all)
                              if (next.length === ALL_EXPORT_COLUMNS.length) {
                                setSelectedExportColumns([]);
                              } else {
                                setSelectedExportColumns(next);
                              }
                            } else {
                              setSelectedExportColumns(
                                selectedExportColumns.filter(k => k !== col.key)
                              );
                            }
                          }}
                        />
                        <span className="text-sm">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" onClick={exportarExcel}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </>
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
