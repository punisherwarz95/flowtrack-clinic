import { useState } from "react";
import { Copy, Search, Check, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CopiarExamenesPacienteProps {
  onCopyExamenes: (examenIds: string[]) => void;
}

interface PacienteResult {
  id: string;
  nombre: string;
  rut: string | null;
  empresa: string | null;
  atencionId: string;
  fecha: string;
  baterias: string[];
  examenes: { id: string; nombre: string }[];
}

const CopiarExamenesPaciente = ({ onCopyExamenes }: CopiarExamenesPacienteProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<PacienteResult[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteResult | null>(null);
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);

  const handleSearch = async () => {
    if (search.trim().length < 2) {
      toast.error("Ingrese al menos 2 caracteres para buscar");
      return;
    }

    setLoading(true);
    setSelectedPaciente(null);
    try {
      const searchTerm = `%${search.trim()}%`;
      const { data: pacientes, error } = await supabase
        .from("pacientes")
        .select("id, nombre, rut, empresas(nombre)")
        .or(`nombre.ilike.${searchTerm},rut.ilike.${searchTerm}`)
        .limit(20);

      if (error) throw error;
      if (!pacientes || pacientes.length === 0) {
        setResultados([]);
        return;
      }

      const pacienteIds = pacientes.map((p: any) => p.id);

      // Build atenciones query with optional date filter
      let atQuery = supabase
        .from("atenciones")
        .select("id, paciente_id, fecha_ingreso")
        .in("paciente_id", pacienteIds)
        .order("fecha_ingreso", { ascending: false });

      if (fechaDesde) {
        atQuery = atQuery.gte("fecha_ingreso", `${format(fechaDesde, "yyyy-MM-dd")}T00:00:00`);
      }
      if (fechaHasta) {
        atQuery = atQuery.lte("fecha_ingreso", `${format(fechaHasta, "yyyy-MM-dd")}T23:59:59`);
      }

      const { data: atenciones, error: atError } = await atQuery.limit(200);
      if (atError) throw atError;

      // Latest atencion per patient
      const latestAtencion = new Map<string, { id: string; fecha: string }>();
      (atenciones || []).forEach((a: any) => {
        if (!latestAtencion.has(a.paciente_id)) {
          latestAtencion.set(a.paciente_id, {
            id: a.id,
            fecha: a.fecha_ingreso ? String(a.fecha_ingreso).slice(0, 10) : "",
          });
        }
      });

      const atencionIds = Array.from(latestAtencion.values()).map(a => a.id);
      if (atencionIds.length === 0) {
        setResultados([]);
        return;
      }

      // Get exams and baterias in parallel
      const [aeRes, abRes] = await Promise.all([
        supabase
          .from("atencion_examenes")
          .select("atencion_id, examen_id, examenes(nombre)")
          .in("atencion_id", atencionIds),
        supabase
          .from("atencion_baterias")
          .select("atencion_id, paquete:paquetes_examenes(nombre)")
          .in("atencion_id", atencionIds),
      ]);

      if (aeRes.error) throw aeRes.error;

      // Build results
      const results: PacienteResult[] = [];
      pacientes.forEach((p: any) => {
        const atencion = latestAtencion.get(p.id);
        if (!atencion) return;

        const exams = (aeRes.data || [])
          .filter((ae: any) => ae.atencion_id === atencion.id)
          .map((ae: any) => ({
            id: ae.examen_id,
            nombre: (ae.examenes as any)?.nombre || "Examen",
          }));

        const baterias = (abRes.data || [])
          .filter((ab: any) => ab.atencion_id === atencion.id)
          .map((ab: any) => (ab.paquete as any)?.nombre || "Batería");

        if (exams.length > 0) {
          results.push({
            id: p.id,
            nombre: p.nombre,
            rut: p.rut,
            empresa: (p.empresas as any)?.nombre || null,
            atencionId: atencion.id,
            fecha: atencion.fecha,
            baterias,
            examenes: exams,
          });
        }
      });

      setResultados(results);
    } catch (error) {
      console.error("Error buscando pacientes:", error);
      toast.error("Error al buscar pacientes");
    } finally {
      setLoading(false);
    }
  };

  const handleCopiar = () => {
    if (!selectedPaciente) return;
    const examenIds = selectedPaciente.examenes.map(e => e.id);
    onCopyExamenes(examenIds);
    toast.success(`${examenIds.length} examen(es) copiados de ${selectedPaciente.nombre}`);
    setOpen(false);
    resetState();
  };

  const resetState = () => {
    setSearch("");
    setResultados([]);
    setSelectedPaciente(null);
    setFechaDesde(undefined);
    setFechaHasta(undefined);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => setOpen(true)}
      >
        <Copy className="h-3 w-3" />
        Igual a...
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Copiar exámenes de otro paciente</DialogTitle>
          </DialogHeader>

          {/* Filters */}
          <div className="space-y-2 flex-shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o RUT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-8 h-9"
                />
              </div>
              <Button type="button" size="sm" onClick={handleSearch} disabled={loading} className="h-9">
                {loading ? "..." : "Buscar"}
              </Button>
            </div>

            <div className="flex gap-2 items-center">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Fecha:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1 flex-1", !fechaDesde && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3" />
                    {fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Desde"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fechaDesde} onSelect={setFechaDesde} locale={es} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1 flex-1", !fechaHasta && "text-muted-foreground")}>
                    <CalendarIcon className="h-3 w-3" />
                    {fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Hasta"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fechaHasta} onSelect={setFechaHasta} locale={es} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              {(fechaDesde || fechaHasta) && (
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFechaDesde(undefined); setFechaHasta(undefined); }}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {resultados.length === 0 && !loading && search && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No se encontraron pacientes con exámenes
              </p>
            )}

            {resultados.map((pac) => (
              <div
                key={pac.id + pac.atencionId}
                className={cn(
                  "p-3 border rounded-lg cursor-pointer transition-colors",
                  selectedPaciente?.atencionId === pac.atencionId
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                )}
                onClick={() => setSelectedPaciente(pac)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedPaciente?.atencionId === pac.atencionId && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span className="font-medium text-sm">{pac.nombre}</span>
                    {pac.rut && <span className="text-xs text-muted-foreground">({pac.rut})</span>}
                    {pac.empresa && (
                      <Badge variant="secondary" className="text-xs">{pac.empresa}</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {pac.fecha ? format(new Date(pac.fecha + "T12:00:00"), "dd/MM/yyyy") : ""}
                  </span>
                </div>

                {pac.baterias.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {pac.baterias.map((b, i) => (
                      <Badge key={i} className="text-xs bg-primary/10 text-primary border-primary/20">
                        {b}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {pac.examenes.map((ex) => (
                    <Badge key={ex.id} variant="outline" className="text-xs">
                      {ex.nombre}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {selectedPaciente && (
            <div className="flex items-center justify-between pt-2 border-t flex-shrink-0">
              <span className="text-sm text-muted-foreground">
                {selectedPaciente.examenes.length} examen(es) de <strong>{selectedPaciente.nombre}</strong>
                {selectedPaciente.empresa && <span className="text-xs ml-1">({selectedPaciente.empresa})</span>}
              </span>
              <Button type="button" size="sm" onClick={handleCopiar} className="gap-1">
                <Copy className="h-3 w-3" />
                Copiar exámenes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CopiarExamenesPaciente;
