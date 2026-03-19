import { useState } from "react";
import { Copy, Search, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CopiarExamenesPacienteProps {
  onCopyExamenes: (examenIds: string[]) => void;
}

interface PacienteResult {
  id: string;
  nombre: string;
  rut: string | null;
  atencionId: string;
  fecha: string;
  examenes: { id: string; nombre: string }[];
}

const CopiarExamenesPaciente = ({ onCopyExamenes }: CopiarExamenesPacienteProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<PacienteResult[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<PacienteResult | null>(null);

  const handleSearch = async () => {
    if (search.trim().length < 2) {
      toast.error("Ingrese al menos 2 caracteres para buscar");
      return;
    }

    setLoading(true);
    setSelectedPaciente(null);
    try {
      // Search patients by name or RUT
      const searchTerm = `%${search.trim()}%`;
      const { data: pacientes, error } = await supabase
        .from("pacientes")
        .select("id, nombre, rut")
        .or(`nombre.ilike.${searchTerm},rut.ilike.${searchTerm}`)
        .limit(20);

      if (error) throw error;
      if (!pacientes || pacientes.length === 0) {
        setResultados([]);
        return;
      }

      const pacienteIds = pacientes.map(p => p.id);

      // Get latest atencion for each patient (with exams)
      const { data: atenciones, error: atError } = await supabase
        .from("atenciones")
        .select("id, paciente_id, fecha_ingreso")
        .in("paciente_id", pacienteIds)
        .order("fecha_ingreso", { ascending: false })
        .limit(200);

      if (atError) throw atError;

      // Group: latest atencion per patient
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

      // Get exams for those atenciones
      const { data: atencionExamenes, error: aeError } = await supabase
        .from("atencion_examenes")
        .select("atencion_id, examen_id, examenes(nombre)")
        .in("atencion_id", atencionIds);

      if (aeError) throw aeError;

      // Build results
      const results: PacienteResult[] = [];
      pacientes.forEach((p: any) => {
        const atencion = latestAtencion.get(p.id);
        if (!atencion) return;

        const exams = (atencionExamenes || [])
          .filter((ae: any) => ae.atencion_id === atencion.id)
          .map((ae: any) => ({
            id: ae.examen_id,
            nombre: (ae.examenes as any)?.nombre || "Examen",
          }));

        if (exams.length > 0) {
          results.push({
            id: p.id,
            nombre: p.nombre,
            rut: p.rut,
            atencionId: atencion.id,
            fecha: atencion.fecha,
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
    setSearch("");
    setResultados([]);
    setSelectedPaciente(null);
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

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedPaciente(null); setResultados([]); setSearch(""); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Copiar exámenes de otro paciente</DialogTitle>
          </DialogHeader>

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
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {resultados.length === 0 && !loading && search && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No se encontraron pacientes con exámenes
              </p>
            )}

            {resultados.map((pac) => (
              <div
                key={pac.id + pac.atencionId}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaciente?.atencionId === pac.atencionId
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent"
                }`}
                onClick={() => setSelectedPaciente(pac)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {selectedPaciente?.atencionId === pac.atencionId && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium text-sm">{pac.nombre}</span>
                    {pac.rut && <span className="text-xs text-muted-foreground">({pac.rut})</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">{pac.fecha}</span>
                </div>
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

          {selectedPaciente && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedPaciente.examenes.length} examen(es) de <strong>{selectedPaciente.nombre}</strong>
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
