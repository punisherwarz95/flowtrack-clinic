import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, Plus, Trash2, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Examen {
  id: string;
  nombre: string;
  codigo: string | null;
}

interface Vinculo {
  id: string;
  examen_id_a: string;
  examen_id_b: string;
}

interface Props {
  examenId: string;
  examenNombre: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ExamenTrazabilidadConfig = ({ examenId, examenNombre, open, onOpenChange }: Props) => {
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) loadData();
  }, [open, examenId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [examenesRes, vinculosRes] = await Promise.all([
        supabase.from("examenes").select("id, nombre, codigo").order("nombre"),
        supabase.from("examen_trazabilidad").select("*")
          .or(`examen_id_a.eq.${examenId},examen_id_b.eq.${examenId}`),
      ]);

      setExamenes((examenesRes.data || []).filter((e: any) => e.id !== examenId));
      setVinculos(vinculosRes.data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const linkedExamenIds = vinculos.map(v =>
    v.examen_id_a === examenId ? v.examen_id_b : v.examen_id_a
  );

  const getExamenNombre = (id: string) => {
    const ex = examenes.find(e => e.id === id);
    return ex ? `${ex.codigo ? `[${ex.codigo}] ` : ""}${ex.nombre}` : id;
  };

  const handleAdd = async (otherExamenId: string) => {
    try {
      // Always store with alphabetical order to avoid duplicates
      const [a, b] = [examenId, otherExamenId].sort();
      const { error } = await supabase.from("examen_trazabilidad").insert({
        examen_id_a: a,
        examen_id_b: b,
      });
      if (error) throw error;
      toast.success("Vínculo de trazabilidad creado");
      loadData();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.info("Este vínculo ya existe");
      } else {
        toast.error("Error al crear vínculo");
      }
    }
  };

  const handleRemove = async (vinculoId: string) => {
    try {
      const { error } = await supabase.from("examen_trazabilidad").delete().eq("id", vinculoId);
      if (error) throw error;
      toast.success("Vínculo eliminado");
      loadData();
    } catch {
      toast.error("Error al eliminar vínculo");
    }
  };

  const availableExamenes = examenes.filter(e => {
    if (linkedExamenIds.includes(e.id)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return e.nombre.toLowerCase().includes(s) || (e.codigo?.toLowerCase().includes(s) ?? false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Trazabilidad: {examenNombre}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current links */}
            <div>
              <p className="text-sm font-medium mb-2">Exámenes vinculados ({vinculos.length})</p>
              {vinculos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No hay exámenes vinculados. Los archivos compartidos de este examen solo serán visibles aquí.
                </p>
              ) : (
                <div className="space-y-1">
                  {vinculos.map(v => {
                    const otherId = v.examen_id_a === examenId ? v.examen_id_b : v.examen_id_a;
                    return (
                      <div key={v.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-3.5 w-3.5 text-primary" />
                          <span className="text-sm">{getExamenNombre(otherId)}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(v.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add new link */}
            <div>
              <p className="text-sm font-medium mb-2">Agregar vínculo</p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar examen..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {availableExamenes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {search ? "Sin resultados" : "Todos los exámenes ya están vinculados"}
                  </p>
                ) : (
                  availableExamenes.slice(0, 20).map(ex => (
                    <button
                      key={ex.id}
                      className="w-full text-left px-3 py-2 hover:bg-accent/50 text-sm flex items-center justify-between border-b last:border-b-0 transition-colors"
                      onClick={() => handleAdd(ex.id)}
                    >
                      <span>
                        {ex.codigo && <Badge variant="outline" className="mr-2 text-xs">{ex.codigo}</Badge>}
                        {ex.nombre}
                      </span>
                      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                <strong>¿Qué hace la trazabilidad?</strong> Los exámenes vinculados comparten archivos PDF automáticamente. 
                Si subes un PDF en uno de los exámenes vinculados, será visible en todos los demás exámenes del vínculo 
                dentro de la misma atención. La relación es bidireccional.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExamenTrazabilidadConfig;
