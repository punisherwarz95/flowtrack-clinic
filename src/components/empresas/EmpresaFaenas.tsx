import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, MapPin, Pencil, Trash2, Package, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Faena {
  id: string;
  nombre: string;
  direccion: string | null;
  activo: boolean;
  empresa_id: string;
  created_at: string;
}

interface Paquete {
  id: string;
  nombre: string;
  descripcion: string | null;
}

interface BateriaFaena {
  id: string;
  paquete_id: string;
  faena_id: string;
  activo: boolean;
}

interface EmpresaFaenasProps {
  empresaId: string;
  empresaNombre: string;
}

const EmpresaFaenas = ({ empresaId, empresaNombre }: EmpresaFaenasProps) => {
  const [faenas, setFaenas] = useState<Faena[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [bateriasFaenas, setBateriasFaenas] = useState<BateriaFaena[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFaena, setEditingFaena] = useState<Faena | null>(null);
  const [faenaToDelete, setFaenaToDelete] = useState<string | null>(null);
  const [expandedFaenas, setExpandedFaenas] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
  });

  useEffect(() => {
    loadData();
  }, [empresaId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [faenasRes, paquetesRes, bateriasRes] = await Promise.all([
        supabase
          .from("faenas")
          .select("*")
          .eq("empresa_id", empresaId)
          .order("nombre"),
        supabase
          .from("paquetes_examenes")
          .select("id, nombre, descripcion")
          .order("nombre"),
        supabase
          .from("bateria_faenas")
          .select("*"),
      ]);

      if (faenasRes.error) throw faenasRes.error;
      if (paquetesRes.error) throw paquetesRes.error;
      if (bateriasRes.error) throw bateriasRes.error;

      setFaenas(faenasRes.data || []);
      setPaquetes(paquetesRes.data || []);
      setBateriasFaenas(bateriasRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFaena) {
        const { error } = await supabase
          .from("faenas")
          .update({
            nombre: formData.nombre,
            direccion: formData.direccion || null,
          })
          .eq("id", editingFaena.id);

        if (error) throw error;
        toast.success("Faena actualizada");
      } else {
        const { error } = await supabase.from("faenas").insert([
          {
            nombre: formData.nombre,
            direccion: formData.direccion || null,
            empresa_id: empresaId,
          },
        ]);

        if (error) throw error;
        toast.success("Faena creada");
      }

      setOpenDialog(false);
      setEditingFaena(null);
      setFormData({ nombre: "", direccion: "" });
      loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar faena");
    }
  };

  const handleToggleActivo = async (faena: Faena) => {
    try {
      const { error } = await supabase
        .from("faenas")
        .update({ activo: !faena.activo })
        .eq("id", faena.id);

      if (error) throw error;
      toast.success(faena.activo ? "Faena desactivada" : "Faena activada");
      loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async () => {
    if (!faenaToDelete) return;

    try {
      const { error } = await supabase
        .from("faenas")
        .delete()
        .eq("id", faenaToDelete);

      if (error) throw error;
      toast.success("Faena eliminada");
      setFaenaToDelete(null);
      loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar faena");
    }
  };

  const toggleExpanded = (faenaId: string) => {
    const newExpanded = new Set(expandedFaenas);
    if (newExpanded.has(faenaId)) {
      newExpanded.delete(faenaId);
    } else {
      newExpanded.add(faenaId);
    }
    setExpandedFaenas(newExpanded);
  };

  const isBateriaAsignada = (faenaId: string, paqueteId: string) => {
    return bateriasFaenas.some(
      (bf) => bf.faena_id === faenaId && bf.paquete_id === paqueteId && bf.activo
    );
  };

  const handleToggleBateria = async (faenaId: string, paqueteId: string) => {
    try {
      const existing = bateriasFaenas.find(
        (bf) => bf.faena_id === faenaId && bf.paquete_id === paqueteId
      );

      if (existing) {
        // Toggle activo status
        const { error } = await supabase
          .from("bateria_faenas")
          .update({ activo: !existing.activo })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Create new relationship
        const { error } = await supabase
          .from("bateria_faenas")
          .insert([{ faena_id: faenaId, paquete_id: paqueteId, activo: true }]);

        if (error) throw error;
      }

      toast.success("Batería actualizada");
      loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al actualizar batería");
    }
  };

  const getBateriasCount = (faenaId: string) => {
    return bateriasFaenas.filter((bf) => bf.faena_id === faenaId && bf.activo).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Faenas / Centros de Trabajo
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las faenas y sus baterías para {empresaNombre}
          </p>
        </div>
        <Dialog
          open={openDialog}
          onOpenChange={(open) => {
            setOpenDialog(open);
            if (!open) {
              setEditingFaena(null);
              setFormData({ nombre: "", direccion: "" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Faena
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFaena ? "Editar Faena" : "Nueva Faena"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  required
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Homologación, Zaldivar, etc."
                />
              </div>
              <div>
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData({ ...formData, direccion: e.target.value })
                  }
                  placeholder="Ej: Av. Principal 123"
                />
              </div>
              <Button type="submit" className="w-full">
                {editingFaena ? "Actualizar" : "Crear Faena"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : faenas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay faenas registradas</p>
          <p className="text-sm">Crea la primera faena para esta empresa</p>
        </div>
      ) : (
        <div className="space-y-2">
          {faenas.map((faena) => (
            <Collapsible
              key={faena.id}
              open={expandedFaenas.has(faena.id)}
              onOpenChange={() => toggleExpanded(faena.id)}
            >
              <div className="border rounded-lg">
                <div className="flex items-center justify-between p-3 bg-muted/30">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-3 flex-1 text-left hover:bg-muted/50 rounded p-1 -m-1">
                      {expandedFaenas.has(faena.id) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {faena.nombre}
                          <Badge variant="secondary" className="text-xs">
                            <Package className="h-3 w-3 mr-1" />
                            {getBateriasCount(faena.id)} baterías
                          </Badge>
                        </div>
                        {faena.direccion && (
                          <div className="text-sm text-muted-foreground">
                            {faena.direccion}
                          </div>
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={faena.activo}
                      onCheckedChange={() => handleToggleActivo(faena)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingFaena(faena);
                        setFormData({
                          nombre: faena.nombre,
                          direccion: faena.direccion || "",
                        });
                        setOpenDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFaenaToDelete(faena.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="p-4 border-t bg-background">
                    <div className="mb-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Baterías asignadas a esta faena
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Selecciona las baterías que corresponden a esta faena
                      </p>
                    </div>
                    <div className="grid gap-2 max-h-64 overflow-y-auto">
                      {paquetes.map((paquete) => (
                        <label
                          key={paquete.id}
                          className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={isBateriaAsignada(faena.id, paquete.id)}
                            onCheckedChange={() =>
                              handleToggleBateria(faena.id, paquete.id)
                            }
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{paquete.nombre}</div>
                            {paquete.descripcion && (
                              <div className="text-xs text-muted-foreground">
                                {paquete.descripcion}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                      {paquetes.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay baterías disponibles
                        </p>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!faenaToDelete}
        onOpenChange={() => setFaenaToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar faena?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Si hay prereservas o baterías
              asociadas a esta faena, no podrá ser eliminada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmpresaFaenas;
