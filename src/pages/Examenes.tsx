import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Examen {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_estimada: number | null;
}

const Examenes = () => {
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    duracion_estimada: "",
  });

  useEffect(() => {
    loadExamenes();
  }, []);

  const loadExamenes = async () => {
    try {
      const { data, error } = await supabase
        .from("examenes")
        .select("*")
        .order("nombre");

      if (error) throw error;
      setExamenes(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar exámenes");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("examenes").insert([
        {
          nombre: formData.nombre,
          descripcion: formData.descripcion || null,
          duracion_estimada: formData.duracion_estimada ? parseInt(formData.duracion_estimada) : null,
        },
      ]);

      if (error) throw error;
      
      toast.success("Examen agregado exitosamente");
      setOpenDialog(false);
      setFormData({ nombre: "", descripcion: "", duracion_estimada: "" });
      loadExamenes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al agregar examen");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Exámenes</h1>
            <p className="text-muted-foreground">Administra los tipos de exámenes disponibles</p>
          </div>
          
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Examen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Examen</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre del Examen *</Label>
                  <Input
                    id="nombre"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Radiografía, Análisis de Sangre"
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción del examen"
                  />
                </div>
                <div>
                  <Label htmlFor="duracion">Duración Estimada (minutos)</Label>
                  <Input
                    id="duracion"
                    type="number"
                    value={formData.duracion_estimada}
                    onChange={(e) => setFormData({ ...formData, duracion_estimada: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Guardar Examen
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examenes.map((examen) => (
            <Card key={examen.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  {examen.nombre}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {examen.descripcion && (
                  <p className="text-sm text-muted-foreground mb-3">{examen.descripcion}</p>
                )}
                {examen.duracion_estimada && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Duración:</span>{" "}
                    <span className="text-muted-foreground">{examen.duracion_estimada} min</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Examenes;
