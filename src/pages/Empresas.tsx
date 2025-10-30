import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Upload, Building2, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

interface Empresa {
  id: string;
  nombre: string;
  created_at: string;
}

const Empresas = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<string | null>(null);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
  });

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("nombre");

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar empresas");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmpresa) {
        const { error } = await supabase
          .from("empresas")
          .update({
            nombre: formData.nombre,
          })
          .eq("id", editingEmpresa.id);

        if (error) throw error;
        toast.success("Empresa actualizada exitosamente");
      } else {
        const { error } = await supabase.from("empresas").insert([
          {
            nombre: formData.nombre,
          },
        ]);

        if (error) throw error;
        toast.success("Empresa agregada exitosamente");
      }
      
      setOpenDialog(false);
      setEditingEmpresa(null);
      setFormData({ nombre: "" });
      loadEmpresas();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || (editingEmpresa ? "Error al actualizar empresa" : "Error al agregar empresa"));
    }
  };

  const handleEmpresasUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const rows = text.split("\n").map((row) => row.split(","));
      
      const empresasData = rows
        .slice(1)
        .filter((row) => row.length >= 1 && row[0]?.trim())
        .map((row) => ({
          nombre: row[0]?.trim() || "",
        }));

      const { error } = await supabase.from("empresas").insert(empresasData);

      if (error) throw error;
      
      toast.success(`${empresasData.length} empresas importadas`);
      loadEmpresas();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al importar empresas");
    }
  };

  const handleDelete = async () => {
    if (!empresaToDelete) return;

    try {
      const { error } = await supabase
        .from("empresas")
        .delete()
        .eq("id", empresaToDelete);

      if (error) throw error;
      
      toast.success("Empresa eliminada exitosamente");
      setEmpresaToDelete(null);
      loadEmpresas();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar empresa");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Empresas</h1>
            <p className="text-muted-foreground">Administra las empresas asociadas</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={openDialog} onOpenChange={(open) => {
              setOpenDialog(open);
              if (!open) {
                setEditingEmpresa(null);
                setFormData({ nombre: "" });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Empresa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingEmpresa ? "Editar Empresa" : "Agregar Nueva Empresa"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre de la Empresa *</Label>
                    <Input
                      id="nombre"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Empresa ABC S.A."
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingEmpresa ? "Actualizar Empresa" : "Guardar Empresa"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="secondary" className="gap-2" asChild>
              <label>
                <Upload className="h-4 w-4" />
                Importar CSV
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleEmpresasUpload}
                />
              </label>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empresas.map((empresa) => (
            <Card key={empresa.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {empresa.nombre}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingEmpresa(empresa);
                        setFormData({ nombre: empresa.nombre });
                        setOpenDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEmpresaToDelete(empresa.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Registrada: {new Date(empresa.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <AlertDialog open={!!empresaToDelete} onOpenChange={() => setEmpresaToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la empresa.
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

export default Empresas;
