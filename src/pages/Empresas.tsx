import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Upload, Building2, Trash2, Pencil, Package, DollarSign, MapPin, Eye, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAuth } from "@/hooks/useAuth";
import EmpresaFaenas from "@/components/empresas/EmpresaFaenas";

interface Empresa {
  id: string;
  nombre: string;
  rut?: string;
  razon_social?: string;
  contacto?: string;
  email?: string;
  telefono?: string;
  created_at: string;
}

interface Paquete {
  id: string;
  nombre: string;
}

interface EmpresaBateria {
  id: string;
  empresa_id: string;
  paquete_id: string;
  valor: number;
  paquete?: { nombre: string };
}

const Empresas = () => {
  useAuth(); // Protect route
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openBateriasDialog, setOpenBateriasDialog] = useState(false);
  const [openFaenasDialog, setOpenFaenasDialog] = useState(false);
  const [empresaToDelete, setEmpresaToDelete] = useState<string | null>(null);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [empresaBaterias, setEmpresaBaterias] = useState<EmpresaBateria[]>([]);
  const [bateriaPrecios, setBateriaPrecios] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    nombre: "",
  });

  // Filtrar empresas por nombre
  const filteredEmpresas = empresas.filter((empresa) =>
    empresa.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadEmpresas();
    loadPaquetes();
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

  const loadPaquetes = async () => {
    try {
      const { data, error } = await supabase
        .from("paquetes_examenes")
        .select("id, nombre")
        .order("nombre");

      if (error) throw error;
      setPaquetes(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadEmpresaBaterias = async (empresaId: string) => {
    try {
      const { data, error } = await supabase
        .from("empresa_baterias")
        .select("*, paquete:paquetes_examenes(nombre)")
        .eq("empresa_id", empresaId);

      if (error) throw error;
      setEmpresaBaterias(data || []);
      
      // Cargar precios en el estado
      const precios: Record<string, string> = {};
      data?.forEach(eb => {
        precios[eb.paquete_id] = eb.valor?.toString() || "";
      });
      setBateriaPrecios(precios);
    } catch (error) {
      console.error("Error:", error);
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

  const handleSaveBaterias = async () => {
    if (!selectedEmpresa) return;

    try {
      // Eliminar baterías existentes
      await supabase
        .from("empresa_baterias")
        .delete()
        .eq("empresa_id", selectedEmpresa.id);

      // Insertar nuevos precios
      const preciosData = Object.entries(bateriaPrecios)
        .filter(([_, valor]) => valor && parseFloat(valor) > 0)
        .map(([paqueteId, valor]) => ({
          empresa_id: selectedEmpresa.id,
          paquete_id: paqueteId,
          valor: parseFloat(valor),
        }));

      if (preciosData.length > 0) {
        const { error } = await supabase
          .from("empresa_baterias")
          .insert(preciosData);

        if (error) throw error;
      }

      toast.success("Baterías contratadas actualizadas");
      setOpenBateriasDialog(false);
      setSelectedEmpresa(null);
      setBateriaPrecios({});
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar baterías");
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

  const getBateriasCount = (empresaId: string) => {
    // Esta función se puede optimizar si es necesario
    return 0; // Por ahora no mostramos count en la card
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Empresas</h1>
            <p className="text-muted-foreground">Administra las empresas asociadas y sus baterías contratadas</p>
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

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredEmpresas.length} empresa(s) encontrada(s)
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmpresas.map((empresa) => (
            <Card key={empresa.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {empresa.nombre}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Faenas / Centros de Trabajo"
                      onClick={() => {
                        setSelectedEmpresa(empresa);
                        setOpenFaenasDialog(true);
                      }}
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Baterías Contratadas"
                      onClick={async () => {
                        setSelectedEmpresa(empresa);
                        await loadEmpresaBaterias(empresa.id);
                        setOpenBateriasDialog(true);
                      }}
                    >
                      <Package className="h-4 w-4 text-primary" />
                    </Button>
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
                {empresa.rut && (
                  <p className="text-sm text-muted-foreground">RUT: {empresa.rut}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dialog de Baterías Contratadas */}
        <Dialog open={openBateriasDialog} onOpenChange={(open) => {
          setOpenBateriasDialog(open);
          if (!open) {
            setSelectedEmpresa(null);
            setBateriaPrecios({});
          }
        }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Baterías Contratadas - {selectedEmpresa?.nombre}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define los precios específicos para cada batería/paquete contratado por esta empresa.
              </p>
              
              <div className="border rounded-md divide-y max-h-96 overflow-y-auto">
                {paquetes
                  .filter((paquete) => {
                    const precio = bateriaPrecios[paquete.id];
                    return precio && parseFloat(precio) > 0;
                  })
                  .map((paquete) => (
                    <div key={paquete.id} className="flex items-center justify-between p-3 gap-4">
                      <span className="text-sm font-medium flex-1">{paquete.nombre}</span>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="any"
                          value={bateriaPrecios[paquete.id] || ""}
                          onChange={(e) => setBateriaPrecios({
                            ...bateriaPrecios,
                            [paquete.id]: e.target.value
                          })}
                          placeholder="Precio"
                          className="w-28 h-8"
                        />
                      </div>
                    </div>
                  ))}
                {Object.values(bateriaPrecios).filter(v => v && parseFloat(v) > 0).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Esta empresa no tiene baterías con precio asignado.
                  </p>
                )}
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <p className="text-xs text-muted-foreground">
                  {Object.values(bateriaPrecios).filter(v => v && parseFloat(v) > 0).length} baterías con precio asignado
                </p>
                <Button onClick={handleSaveBaterias}>
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Faenas */}
        <Dialog open={openFaenasDialog} onOpenChange={(open) => {
          setOpenFaenasDialog(open);
          if (!open) {
            setSelectedEmpresa(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedEmpresa && (
              <EmpresaFaenas 
                empresaId={selectedEmpresa.id} 
                empresaNombre={selectedEmpresa.nombre} 
              />
            )}
          </DialogContent>
        </Dialog>

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