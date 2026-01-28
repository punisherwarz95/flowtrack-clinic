import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, MapPin, Pencil, Trash2 } from "lucide-react";
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

interface Faena {
  id: string;
  nombre: string;
  direccion: string | null;
  activo: boolean;
  empresa_id: string;
  created_at: string;
}

interface EmpresaFaenasProps {
  empresaId: string;
  empresaNombre: string;
}

const EmpresaFaenas = ({ empresaId, empresaNombre }: EmpresaFaenasProps) => {
  const [faenas, setFaenas] = useState<Faena[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFaena, setEditingFaena] = useState<Faena | null>(null);
  const [faenaToDelete, setFaenaToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    direccion: "",
  });

  useEffect(() => {
    loadFaenas();
  }, [empresaId]);

  const loadFaenas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("faenas")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nombre");

      if (error) throw error;
      setFaenas(data || []);
    } catch (error) {
      console.error("Error loading faenas:", error);
      toast.error("Error al cargar faenas");
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
      const { error } = await supabase
        .from("faenas")
        .delete()
        .eq("id", faenaToDelete);

      if (error) throw error;
      toast.success("Faena eliminada");
      setFaenaToDelete(null);
      loadFaenas();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar faena");
    }
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
            Gestiona las faenas de {empresaNombre}
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
                  placeholder="Ej: Faena Norte"
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
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead className="text-center">Activo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faenas.map((faena) => (
                <TableRow key={faena.id}>
                  <TableCell className="font-medium">{faena.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {faena.direccion || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={faena.activo}
                      onCheckedChange={() => handleToggleActivo(faena)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
              Esta acción no se puede deshacer. Si hay prereservas asociadas a
              esta faena, no podrá ser eliminada.
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
