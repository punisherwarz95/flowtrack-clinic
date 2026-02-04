import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, MapPin, Pencil, Trash2, Package, ChevronDown, ChevronUp, Link2, Unlink } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Faena {
  id: string;
  nombre: string;
  direccion: string | null;
  activo: boolean;
  empresa_id: string | null;
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
  // En BD puede venir null por datos antiguos; lo tratamos como activo mientras no sea false.
  activo: boolean | null;
}

interface EmpresaFaena {
  id: string;
  empresa_id: string;
  faena_id: string;
  activo: boolean;
}

interface EmpresaFaenasProps {
  empresaId: string;
  empresaNombre: string;
}

const EmpresaFaenas = ({ empresaId, empresaNombre }: EmpresaFaenasProps) => {
  const [allFaenas, setAllFaenas] = useState<Faena[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [bateriasFaenas, setBateriasFaenas] = useState<BateriaFaena[]>([]);
  const [empresaFaenas, setEmpresaFaenas] = useState<EmpresaFaena[]>([]);
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
      const [faenasRes, paquetesRes, bateriasRes, empresaFaenasRes] = await Promise.all([
        supabase
          .from("faenas")
          .select("*")
          .order("nombre"),
        supabase
          .from("paquetes_examenes")
          .select("id, nombre, descripcion")
          .order("nombre"),
        supabase
          .from("bateria_faenas")
          .select("*"),
        supabase
          .from("empresa_faenas")
          .select("*")
          .eq("empresa_id", empresaId),
      ]);

      if (faenasRes.error) throw faenasRes.error;
      if (paquetesRes.error) throw paquetesRes.error;
      if (bateriasRes.error) throw bateriasRes.error;
      if (empresaFaenasRes.error) throw empresaFaenasRes.error;

      setAllFaenas(faenasRes.data || []);
      setPaquetes(paquetesRes.data || []);
      setBateriasFaenas(bateriasRes.data || []);
      setEmpresaFaenas(empresaFaenasRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  // Faenas asignadas a esta empresa
  const assignedFaenaIds = new Set(
    empresaFaenas.filter((ef) => ef.activo !== false).map((ef) => ef.faena_id)
  );
  
  const assignedFaenas = allFaenas.filter(f => assignedFaenaIds.has(f.id));
  const availableFaenas = allFaenas.filter(f => !assignedFaenaIds.has(f.id) && f.activo);

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
        // Crear faena global (sin empresa_id)
        const { data: newFaena, error } = await supabase
          .from("faenas")
          .insert([{
            nombre: formData.nombre,
            direccion: formData.direccion || null,
          }])
          .select()
          .single();

        if (error) throw error;

        // Asignar automáticamente a esta empresa
        if (newFaena) {
          const { error: linkError } = await supabase
            .from("empresa_faenas")
            .insert([{
              empresa_id: empresaId,
              faena_id: newFaena.id,
              activo: true,
            }]);
          
          if (linkError) throw linkError;
        }

        toast.success("Faena creada y asignada");
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

  const handleAssignFaena = async (faenaId: string) => {
    try {
      const existing = empresaFaenas.find(ef => ef.faena_id === faenaId);
      
      if (existing) {
        // Reactivar
        const { error } = await supabase
          .from("empresa_faenas")
          .update({ activo: true })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Crear nueva asignación
        const { error } = await supabase
          .from("empresa_faenas")
          .insert([{
            empresa_id: empresaId,
            faena_id: faenaId,
            activo: true,
          }]);
        if (error) throw error;
      }

      // Copiar baterías de la faena a empresa_baterias (si no existen)
      // Importante: consultamos en backend para evitar estado desactualizado y
      // tratamos activo=null como activo (solo excluimos activo=false).
      const { data: bateriasDeFaenaRaw, error: bateriasFaenaError } = await supabase
        .from("bateria_faenas")
        .select("paquete_id, activo")
        .eq("faena_id", faenaId);

      if (bateriasFaenaError) throw bateriasFaenaError;

      const bateriasDeEstaFaena = (bateriasDeFaenaRaw || []).filter(
        (bf: { paquete_id: string; activo: boolean | null }) => bf.activo !== false
      );

      if (bateriasDeEstaFaena.length > 0) {
        // Obtener baterías ya existentes en la empresa
        const { data: empresaBateriasExistentes } = await supabase
          .from("empresa_baterias")
          .select("paquete_id")
          .eq("empresa_id", empresaId);

        const paquetesExistentes = new Set(
          empresaBateriasExistentes?.map(eb => eb.paquete_id) || []
        );

        // Filtrar baterías que aún no están en la empresa
        const nuevasBaterias = bateriasDeEstaFaena
          .filter(bf => !paquetesExistentes.has(bf.paquete_id))
          .map(bf => ({
            empresa_id: empresaId,
            paquete_id: bf.paquete_id,
            valor: 0, // Precio inicial 0, el staff debe configurarlo
            activo: true,
          }));

        if (nuevasBaterias.length > 0) {
          const { error: batError } = await supabase
            .from("empresa_baterias")
            .insert(nuevasBaterias);
          
          if (batError) {
            console.error("Error agregando baterías:", batError);
            toast.warning(
              `Faena asignada, pero no se pudieron vincular ${nuevasBaterias.length} baterías. Revisa permisos/políticas y reintenta.`
            );
          } else {
            toast.success(`Faena asignada con ${nuevasBaterias.length} baterías agregadas`);
          }
        } else {
          toast.success("Faena asignada (baterías ya existían)");
        }
      } else {
        toast.success("Faena asignada a la empresa");
      }

      loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al asignar faena");
    }
  };

  const handleUnassignFaena = async (faenaId: string) => {
    try {
      const existing = empresaFaenas.find(ef => ef.faena_id === faenaId);
      if (existing) {
        const { error } = await supabase
          .from("empresa_faenas")
          .update({ activo: false })
          .eq("id", existing.id);
        if (error) throw error;
      }

      toast.success("Faena desvinculada de la empresa");
      loadData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al desvincular faena");
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
      (bf) => bf.faena_id === faenaId && bf.paquete_id === paqueteId && bf.activo !== false
    );
  };

  const handleToggleBateria = async (faenaId: string, paqueteId: string) => {
    try {
      const existing = bateriasFaenas.find(
        (bf) => bf.faena_id === faenaId && bf.paquete_id === paqueteId
      );

      if (existing) {
        const { error } = await supabase
          .from("bateria_faenas")
          .update({ activo: !existing.activo })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
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
    return bateriasFaenas.filter((bf) => bf.faena_id === faenaId && bf.activo !== false).length;
  };

  const renderFaenaCard = (faena: Faena, isAssigned: boolean) => (
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
                  {!faena.activo && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Inactiva
                    </Badge>
                  )}
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
            {isAssigned ? (
              <>
                <Switch
                  checked={faena.activo}
                  onCheckedChange={() => handleToggleActivo(faena)}
                />
              <Button
                variant="ghost"
                size="icon"
                title="Desvincular de esta empresa"
                onClick={() => handleUnassignFaena(faena.id)}
              >
                <Unlink className="h-4 w-4 text-destructive" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              title="Asignar a esta empresa"
              onClick={() => handleAssignFaena(faena.id)}
            >
              <Link2 className="h-4 w-4 text-primary" />
              </Button>
            )}
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
                Estas baterías estarán disponibles para cotizaciones y agendamientos en esta faena
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
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Faenas / Centros de Trabajo
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona faenas globales y asígnalas a {empresaNombre}
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
                {editingFaena ? "Editar Faena" : "Nueva Faena Global"}
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
              <p className="text-xs text-muted-foreground">
                {editingFaena 
                  ? "Los cambios se aplicarán a todas las empresas que usen esta faena"
                  : "La faena se creará como global y se asignará automáticamente a esta empresa"
                }
              </p>
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
      ) : (
        <Tabs defaultValue="assigned" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assigned">
              Asignadas ({assignedFaenas.length})
            </TabsTrigger>
            <TabsTrigger value="available">
              Disponibles ({availableFaenas.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="assigned" className="space-y-2 mt-4">
            {assignedFaenas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay faenas asignadas a esta empresa</p>
                <p className="text-sm">Ve a "Disponibles" para asignar faenas existentes o crea una nueva</p>
              </div>
            ) : (
              assignedFaenas.map((faena) => renderFaenaCard(faena, true))
            )}
          </TabsContent>
          
          <TabsContent value="available" className="space-y-2 mt-4">
            {availableFaenas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Todas las faenas están asignadas a esta empresa</p>
                <p className="text-sm">Crea una nueva faena si necesitas más</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  Haz clic en <Link2 className="h-3 w-3 inline text-primary" /> para asignar una faena a {empresaNombre}
                </p>
                {availableFaenas.map((faena) => renderFaenaCard(faena, false))}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog
        open={!!faenaToDelete}
        onOpenChange={() => setFaenaToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar faena?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la faena de forma global. Si hay prereservas o 
              baterías asociadas, no podrá ser eliminada. Otras empresas que usen 
              esta faena también la perderán.
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
