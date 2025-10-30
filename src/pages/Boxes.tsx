import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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

interface Box {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

const Boxes = () => {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [boxToDelete, setBoxToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
  });

  useEffect(() => {
    loadBoxes();
  }, []);

  const loadBoxes = async () => {
    try {
      const { data, error } = await supabase
        .from("boxes")
        .select("*")
        .order("nombre");

      if (error) throw error;
      setBoxes(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar boxes");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("boxes").insert([
        {
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
        },
      ]);

      if (error) throw error;
      
      toast.success("Box agregado exitosamente");
      setOpenDialog(false);
      setFormData({ nombre: "", descripcion: "" });
      loadBoxes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al agregar box");
    }
  };

  const handleToggleActive = async (boxId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("boxes")
        .update({ activo: !currentState })
        .eq("id", boxId);

      if (error) throw error;
      
      toast.success(currentState ? "Box desactivado" : "Box activado");
      loadBoxes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al actualizar box");
    }
  };

  const handleDelete = async () => {
    if (!boxToDelete) return;

    try {
      const { error } = await supabase
        .from("boxes")
        .delete()
        .eq("id", boxToDelete);

      if (error) throw error;
      
      toast.success("Box eliminado exitosamente");
      setBoxToDelete(null);
      loadBoxes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar box");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Boxes</h1>
            <p className="text-muted-foreground">Administra los consultorios disponibles</p>
          </div>
          
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Box
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Box</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre del Box *</Label>
                  <Input
                    id="nombre"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Box 1, Consulta A"
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción opcional del box"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Guardar Box
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boxes.map((box) => (
            <Card key={box.id} className={box.activo ? "" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <span>{box.nombre}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={box.activo}
                      onCheckedChange={() => handleToggleActive(box.id, box.activo)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setBoxToDelete(box.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {box.descripcion && (
                  <p className="text-sm text-muted-foreground">{box.descripcion}</p>
                )}
                <div className="mt-3 text-sm">
                  <span className={`font-medium ${box.activo ? "text-success" : "text-muted-foreground"}`}>
                    {box.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AlertDialog open={!!boxToDelete} onOpenChange={() => setBoxToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el box.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Boxes;
