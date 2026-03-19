import { useState, useEffect } from "react";
import { Copy, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface CopiarExamenesPacienteProps {
  onCopyExamenes: (examenIds: string[]) => void;
}

interface PacienteResult {
  id: string;
  nombre: string;
  rut: string | null;
  empresa: string | null;
  atencionId: string;
  baterias: string[];
  examenes: { id: string; nombre: string }[];
}

const CopiarExamenesPaciente = ({ onCopyExamenes }: CopiarExamenesPacienteProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [allResults, setAllResults] = useState<PacienteResult[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteResult | null>(null);

  const loadTodayPatients = async () => {
    setLoading(true);
    setSelectedPaciente(null);
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      const { data: atenciones, error: atError } = await supabase
        .from("atenciones")
        .select("id, paciente_id, fecha_ingreso")
        .gte("fecha_ingreso", `${today}T00:00:00`)
        .lte("fecha_ingreso", `${today}T23:59:59`)
        .order("fecha_ingreso", { ascending: false })
        .limit(200);

      if (atError) throw atError;
      if (!atenciones || atenciones.length === 0) {
        setAllResults([]);
        return;
      }

      const atencionIds = atenciones.map((a: any) => a.id);
      const pacienteIds = [...new Set(atenciones.map((a: any) => a.paciente_id))];

      const [pacRes, aeRes, abRes] = await Promise.all([
        supabase.from("pacientes").select("id, nombre, rut, empresas(nombre)").in("id", pacienteIds),
        supabase.from("atencion_examenes").select("atencion_id, examen_id, examenes(nombre)").in("atencion_id", atencionIds),
        supabase.from("atencion_baterias").select("atencion_id, paquete:paquetes_examenes(nombre)").in("atencion_id", atencionIds),
      ]);

      if (pacRes.error) throw pacRes.error;
      if (aeRes.error) throw aeRes.error;

      const pacientesMap = new Map<string, any>();
      (pacRes.data || []).forEach((p: any) => pacientesMap.set(p.id, p));

      const results: PacienteResult[] = [];
      atenciones.forEach((a: any) => {
        const p = pacientesMap.get(a.paciente_id);
        if (!p) return;

        const exams = (aeRes.data || [])
          .filter((ae: any) => ae.atencion_id === a.id)
          .map((ae: any) => ({ id: ae.examen_id, nombre: (ae.examenes as any)?.nombre || "Examen" }));

        if (exams.length === 0) return;

        const baterias = (abRes.data || [])
          .filter((ab: any) => ab.atencion_id === a.id)
          .map((ab: any) => (ab.paquete as any)?.nombre || "Batería");

        results.push({
          id: p.id,
          nombre: p.nombre,
          rut: p.rut,
          empresa: (p.empresas as any)?.nombre || null,
          atencionId: a.id,
          baterias,
          examenes: exams,
        });
      });

      setAllResults(results);
    } catch (error) {
      console.error("Error cargando pacientes del día:", error);
      toast.error("Error al cargar pacientes del día");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadTodayPatients();
  }, [open]);

  const filtered = search.trim()
    ? allResults.filter(r => {
        const term = search.trim().toLowerCase();
        return r.nombre.toLowerCase().includes(term) || (r.rut && r.rut.toLowerCase().includes(term)) || (r.empresa && r.empresa.toLowerCase().includes(term));
      })
    : allResults;

  const handleCopiar = () => {
    if (!selectedPaciente) return;
    const examenIds = selectedPaciente.examenes.map(e => e.id);
    onCopyExamenes(examenIds);
    toast.success(`${examenIds.length} examen(es) copiados de ${selectedPaciente.nombre}`);
    setOpen(false);
    setSearch("");
    setAllResults([]);
    setSelectedPaciente(null);
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setOpen(true)}>
        <Copy className="h-3 w-3" />
        Igual a...
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(""); setAllResults([]); setSelectedPaciente(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Copiar exámenes de paciente del día</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nombre, RUT o empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {loading && <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>}
            {filtered.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-4">No hay pacientes con exámenes hoy</p>
            )}

            {filtered.map((pac) => (
              <div
                key={pac.atencionId}
                className={cn(
                  "p-3 border rounded-lg cursor-pointer transition-colors",
                  selectedPaciente?.atencionId === pac.atencionId ? "border-primary bg-primary/5" : "hover:bg-accent"
                )}
                onClick={() => setSelectedPaciente(pac)}
              >
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {selectedPaciente?.atencionId === pac.atencionId && <Check className="h-4 w-4 text-primary shrink-0" />}
                  <span className="font-medium text-sm">{pac.nombre}</span>
                  {pac.rut && <span className="text-xs text-muted-foreground">({pac.rut})</span>}
                  {pac.empresa && <Badge variant="secondary" className="text-xs">{pac.empresa}</Badge>}
                </div>

                {pac.baterias.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {pac.baterias.map((b, i) => (
                      <Badge key={i} className="text-xs bg-primary/10 text-primary border-primary/20">{b}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {pac.examenes.map((ex) => (
                    <Badge key={ex.id} variant="outline" className="text-xs">{ex.nombre}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

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
