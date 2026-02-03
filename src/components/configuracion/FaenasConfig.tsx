import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Package, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Faena {
  id: string;
  nombre: string;
  direccion: string | null;
  activo: boolean;
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

const FaenasConfig = () => {
  const [faenas, setFaenas] = useState<Faena[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [bateriasFaenas, setBateriasFaenas] = useState<BateriaFaena[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaenas, setExpandedFaenas] = useState<Set<string>>(new Set());
  const [searchBateria, setSearchBateria] = useState<Record<string, string>>({});
  
  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFaena, setEditingFaena] = useState<Faena | null>(null);
  const [faenaToDelete, setFaenaToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadFaenas(), loadPaquetes(), loadBateriasFaenas()]);
    setLoading(false);
  };

  const loadFaenas = async () => {
    try {
      const { data, error } = await supabase
        .from("faenas")
        .select("*")
        .order("nombre");

      if (error) throw error;
      setFaenas(data || []);
    } catch (error) {
      console.error("Error loading faenas:", error);
      toast.error("Error al cargar faenas");
    }
  };

  const loadPaquetes = async () => {
    try {
      const { data, error } = await supabase
        .from("paquetes_examenes")
        .select("id, nombre, descripcion")
        .order("nombre");

      if (error) throw error;
      setPaquetes(data || []);
    } catch (error) {
      console.error("Error loading paquetes:", error);
      toast.error("Error al cargar baterías");
    }
  };

  const loadBateriasFaenas = async () => {
    try {
      const { data, error } = await supabase
        .from("bateria_faenas")
        .select("*");

      if (error) throw error;
      setBateriasFaenas(data || []);
    } catch (error) {
      console.error("Error loading bateria_faenas:", error);
      toast.error("Error al cargar asignaciones");
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
          },
        ]);

        if (error) throw error;
        toast.success("Faena creada");
      }

      setOpenDialog(false);
      setEditingFaena(null);
      setFormData({ nombre: "", direccion: "" });
      loadFaenas();
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
      loadFaenas();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async () => {
    if (!faenaToDelete) return;

    try {
      // First delete related bateria_faenas
      await supabase
        .from("bateria_faenas")
        .delete()
        .eq("faena_id", faenaToDelete);

      // Then delete the faena
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

  const handleToggleBateria = async (faenaId: string, paqueteId: string, isCurrentlyAssigned: boolean) => {
    try {
      if (isCurrentlyAssigned) {
        // Remove assignment
        const { error } = await supabase
          .from("bateria_faenas")
          .delete()
          .eq("faena_id", faenaId)
          .eq("paquete_id", paqueteId);

        if (error) throw error;
        toast.success("Batería desasignada");
      } else {
        // Add assignment
        const { error } = await supabase
          .from("bateria_faenas")
          .insert([{ faena_id: faenaId, paquete_id: paqueteId, activo: true }]);

        if (error) throw error;
        toast.success("Batería asignada");
      }
      loadBateriasFaenas();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al cambiar asignación");
    }
  };

  const toggleExpanded = (faenaId: string) => {
    setExpandedFaenas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(faenaId)) {
        newSet.delete(faenaId);
      } else {
        newSet.add(faenaId);
      }
      return newSet;
    });
  };

  const getBateriasCount = (faenaId: string) => {
    return bateriasFaenas.filter((bf) => bf.faena_id === faenaId && bf.activo).length;
  };

  const isBateriaAssigned = (faenaId: string, paqueteId: string) => {
    return bateriasFaenas.some(
      (bf) => bf.faena_id === faenaId && bf.paquete_id === paqueteId
    );
  };

  const getFilteredPaquetes = (faenaId: string) => {
    const search = (searchBateria[faenaId] || "").toLowerCase();
    if (!search) return paquetes;
    return paquetes.filter((p) => 
      p.nombre.toLowerCase().includes(search) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(search))
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Faenas / Centros de Trabajo
            </CardTitle>
            <CardDescription>
              Gestiona las faenas globales y sus baterías asignadas
            </CardDescription>
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
            <Button className="gap-2" onClick={() => setOpenDialog(true)}>
              <Plus className="h-4 w-4" />
              Nueva Faena
            </Button>
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
                    placeholder="Ej: Homologación Interfaena"
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
                    placeholder="Dirección del centro de trabajo"
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingFaena ? "Actualizar" : "Crear Faena"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : faenas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay faenas configuradas</p>
            <p className="text-sm">
              Crea faenas para agrupar baterías de exámenes
            </p>
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
                  <div className="flex items-center justify-between p-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-3 p-0 h-auto hover:bg-transparent">
                        {expandedFaenas.has(faena.id) ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <div className="font-medium">{faena.nombre}</div>
                          {faena.direccion && (
                            <div className="text-sm text-muted-foreground">
                              {faena.direccion}
                            </div>
                          )}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        {getBateriasCount(faena.id)}
                      </Badge>
                      <Switch
                        checked={faena.activo}
                        onCheckedChange={() => handleToggleActivo(faena)}
                      />
                      <div className="flex items-center gap-1">
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
                  </div>
                  <CollapsibleContent>
                    <div className="border-t px-4 py-4 bg-muted/30">
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar baterías..."
                            className="pl-9"
                            value={searchBateria[faena.id] || ""}
                            onChange={(e) =>
                              setSearchBateria((prev) => ({
                                ...prev,
                                [faena.id]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {getFilteredPaquetes(faena.id).map((paquete) => {
                            const isAssigned = isBateriaAssigned(faena.id, paquete.id);
                            return (
                              <div
                                key={paquete.id}
                                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                              >
                                <Checkbox
                                  id={`${faena.id}-${paquete.id}`}
                                  checked={isAssigned}
                                  onCheckedChange={() =>
                                    handleToggleBateria(faena.id, paquete.id, isAssigned)
                                  }
                                />
                                <label
                                  htmlFor={`${faena.id}-${paquete.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="font-medium text-sm">
                                    {paquete.nombre}
                                  </div>
                                  {paquete.descripcion && (
                                    <div className="text-xs text-muted-foreground">
                                      {paquete.descripcion}
                                    </div>
                                  )}
                                </label>
                              </div>
                            );
                          })}
                          {getFilteredPaquetes(faena.id).length === 0 && (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                              No se encontraron baterías
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={!!faenaToDelete}
        onOpenChange={() => setFaenaToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar faena?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la faena y todas sus asignaciones de baterías.
              Si hay empresas o pacientes asociados, estos quedarán sin faena asignada.
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
    </Card>
  );
};

export default FaenasConfig;
