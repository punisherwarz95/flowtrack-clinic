import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Clock, Plus, Pencil, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

interface AgendaBloque {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number;
  activo: boolean;
  orden: number;
}

const Configuracion = () => {
  useAuth();
  const [bloques, setBloques] = useState<AgendaBloque[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBloque, setEditingBloque] = useState<AgendaBloque | null>(null);
  const [bloqueToDelete, setBloqueToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    hora_inicio: "08:00",
    hora_fin: "09:00",
    cupo_maximo: 10,
  });

  useEffect(() => {
    loadBloques();
  }, []);

  const loadBloques = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("agenda_bloques")
        .select("*")
        .order("orden");

      if (error) throw error;
      setBloques(data || []);
    } catch (error) {
      console.error("Error loading bloques:", error);
      toast.error("Error al cargar bloques horarios");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBloque) {
        const { error } = await supabase
          .from("agenda_bloques")
          .update({
            nombre: formData.nombre,
            hora_inicio: formData.hora_inicio,
            hora_fin: formData.hora_fin,
            cupo_maximo: formData.cupo_maximo,
          })
          .eq("id", editingBloque.id);

        if (error) throw error;
        toast.success("Bloque actualizado");
      } else {
        const maxOrden = bloques.length > 0 ? Math.max(...bloques.map(b => b.orden)) : 0;
        const { error } = await supabase.from("agenda_bloques").insert([
          {
            nombre: formData.nombre,
            hora_inicio: formData.hora_inicio,
            hora_fin: formData.hora_fin,
            cupo_maximo: formData.cupo_maximo,
            orden: maxOrden + 1,
          },
        ]);

        if (error) throw error;
        toast.success("Bloque creado");
      }

      setOpenDialog(false);
      setEditingBloque(null);
      setFormData({ nombre: "", hora_inicio: "08:00", hora_fin: "09:00", cupo_maximo: 10 });
      loadBloques();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar bloque");
    }
  };

  const handleToggleActivo = async (bloque: AgendaBloque) => {
    try {
      const { error } = await supabase
        .from("agenda_bloques")
        .update({ activo: !bloque.activo })
        .eq("id", bloque.id);

      if (error) throw error;
      toast.success(bloque.activo ? "Bloque desactivado" : "Bloque activado");
      loadBloques();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async () => {
    if (!bloqueToDelete) return;

    try {
      const { error } = await supabase
        .from("agenda_bloques")
        .delete()
        .eq("id", bloqueToDelete);

      if (error) throw error;
      toast.success("Bloque eliminado");
      setBloqueToDelete(null);
      loadBloques();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar bloque");
    }
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Configuración
          </h1>
          <p className="text-muted-foreground">
            Configuración general del sistema
          </p>
        </div>

        <Tabs defaultValue="bloques" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bloques" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Bloques Horarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bloques">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Bloques de Horario
                    </CardTitle>
                    <CardDescription>
                      Configura los bloques horarios disponibles para agendamiento de empresas
                    </CardDescription>
                  </div>
                  <Dialog
                    open={openDialog}
                    onOpenChange={(open) => {
                      setOpenDialog(open);
                      if (!open) {
                        setEditingBloque(null);
                        setFormData({
                          nombre: "",
                          hora_inicio: "08:00",
                          hora_fin: "09:00",
                          cupo_maximo: 10,
                        });
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo Bloque
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingBloque ? "Editar Bloque" : "Nuevo Bloque Horario"}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="nombre">Nombre del Bloque *</Label>
                          <Input
                            id="nombre"
                            required
                            value={formData.nombre}
                            onChange={(e) =>
                              setFormData({ ...formData, nombre: e.target.value })
                            }
                            placeholder="Ej: Bloque Mañana 1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="hora_inicio">Hora Inicio *</Label>
                            <Input
                              id="hora_inicio"
                              type="time"
                              required
                              value={formData.hora_inicio}
                              onChange={(e) =>
                                setFormData({ ...formData, hora_inicio: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="hora_fin">Hora Fin *</Label>
                            <Input
                              id="hora_fin"
                              type="time"
                              required
                              value={formData.hora_fin}
                              onChange={(e) =>
                                setFormData({ ...formData, hora_fin: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="cupo_maximo">Cupo Máximo *</Label>
                          <Input
                            id="cupo_maximo"
                            type="number"
                            min={1}
                            required
                            value={formData.cupo_maximo}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                cupo_maximo: parseInt(e.target.value) || 10,
                              })
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Número máximo de pacientes que pueden agendarse en este bloque
                          </p>
                        </div>
                        <Button type="submit" className="w-full">
                          {editingBloque ? "Actualizar" : "Crear Bloque"}
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
                ) : bloques.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay bloques horarios configurados</p>
                    <p className="text-sm">
                      Crea bloques para que las empresas puedan agendar pacientes
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead className="text-center">Cupo Máx.</TableHead>
                        <TableHead className="text-center">Activo</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bloques.map((bloque) => (
                        <TableRow key={bloque.id}>
                          <TableCell className="font-medium">
                            {bloque.nombre}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              {formatTime(bloque.hora_inicio)} - {formatTime(bloque.hora_fin)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                              {bloque.cupo_maximo}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={bloque.activo}
                              onCheckedChange={() => handleToggleActivo(bloque)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingBloque(bloque);
                                  setFormData({
                                    nombre: bloque.nombre,
                                    hora_inicio: formatTime(bloque.hora_inicio),
                                    hora_fin: formatTime(bloque.hora_fin),
                                    cupo_maximo: bloque.cupo_maximo,
                                  });
                                  setOpenDialog(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setBloqueToDelete(bloque.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog
          open={!!bloqueToDelete}
          onOpenChange={() => setBloqueToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar bloque horario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Si hay prereservas asociadas a
                este bloque, no podrá ser eliminado.
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
      </main>
    </div>
  );
};

export default Configuracion;
