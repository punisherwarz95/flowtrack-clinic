import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Plus, Search } from "lucide-react";
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

interface Patient {
  id: string;
  nombre: string;
  tipo_servicio: 'workmed' | 'jenner' | null;
  empresa_id: string | null;
  tiene_ficha: boolean;
  empresas?: {
    id: string;
    nombre: string;
  } | null;
}

interface Empresa {
  id: string;
  nombre: string;
}

interface Examen {
  id: string;
  nombre: string;
  descripcion: string | null;
}

const Pacientes = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedExamenes, setSelectedExamenes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_servicio: "workmed" as "workmed" | "jenner",
    empresa_id: "",
    tiene_ficha: true,
    rut: "", // Temporary until types are regenerated
  });

  useEffect(() => {
    loadPatients();
    loadEmpresas();
    loadExamenes();
  }, []);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("pacientes")
        .select("*, empresas(*)")
        .order("nombre");

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar pacientes");
    }
  };

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
    
    if (!formData.empresa_id) {
      toast.error("Debe seleccionar una empresa");
      return;
    }

    if (selectedExamenes.length === 0) {
      toast.error("Debe seleccionar al menos un examen");
      return;
    }

    try {
      // Insertar paciente
      const { data: pacienteData, error: pacienteError } = await supabase
        .from("pacientes")
        .insert([formData])
        .select()
        .single();

      if (pacienteError) throw pacienteError;

      // Crear atención para el paciente
      const { data: atencionData, error: atencionError } = await supabase
        .from("atenciones")
        .insert([{
          paciente_id: pacienteData.id,
          estado: 'en_espera'
        }])
        .select()
        .single();

      if (atencionError) throw atencionError;

      // Agregar exámenes a la atención
      const examenesData = selectedExamenes.map(examenId => ({
        atencion_id: atencionData.id,
        examen_id: examenId,
        estado: 'pendiente' as 'pendiente' | 'completado' | 'incompleto'
      }));

      const { error: examenesError } = await supabase
        .from("atencion_examenes")
        .insert(examenesData);

      if (examenesError) throw examenesError;

      toast.success("Paciente agregado exitosamente");
      setOpenDialog(false);
      setFormData({ nombre: "", tipo_servicio: "workmed", empresa_id: "", tiene_ficha: true, rut: "" });
      setSelectedExamenes([]);
      loadPatients();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al agregar paciente");
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

  const filteredPatients = patients.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.empresas?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Pacientes</h1>
            <p className="text-muted-foreground">Gestiona la base de datos de pacientes</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Nuevo Paciente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre Completo *</Label>
                    <Input
                      id="nombre"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipo de Servicio *</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tipo_servicio"
                          value="workmed"
                          checked={formData.tipo_servicio === "workmed"}
                          onChange={(e) => setFormData({ ...formData, tipo_servicio: e.target.value as "workmed" | "jenner" })}
                          className="w-4 h-4"
                        />
                        <span>Workmed</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="tipo_servicio"
                          value="jenner"
                          checked={formData.tipo_servicio === "jenner"}
                          onChange={(e) => setFormData({ ...formData, tipo_servicio: e.target.value as "workmed" | "jenner" })}
                          className="w-4 h-4"
                        />
                        <span>Jenner</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="empresa">Empresa *</Label>
                    <select
                      id="empresa"
                      required
                      value={formData.empresa_id}
                      onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">Seleccione una empresa</option>
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Exámenes a Realizar *</Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {examenes.map((examen) => (
                        <label key={examen.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedExamenes.includes(examen.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedExamenes([...selectedExamenes, examen.id]);
                              } else {
                                setSelectedExamenes(selectedExamenes.filter(id => id !== examen.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{examen.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="tiene_ficha"
                      checked={formData.tiene_ficha}
                      onChange={(e) => setFormData({ ...formData, tiene_ficha: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="tiene_ficha" className="cursor-pointer">
                      Tiene ficha en mano
                    </Label>
                  </div>

                  <Button type="submit" className="w-full">
                    Guardar Paciente
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="secondary" className="gap-2" asChild>
              <label>
                <Upload className="h-4 w-4" />
                Importar Empresas CSV
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div>
                    <div className="font-medium text-foreground">{patient.nombre}</div>
                    <div className="text-sm text-muted-foreground">
                      {patient.empresas?.nombre || "Sin empresa"}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className={`font-medium ${patient.tipo_servicio === 'workmed' ? 'text-blue-600' : 'text-green-600'}`}>
                      {patient.tipo_servicio === 'workmed' ? 'Workmed' : 'Jenner'}
                    </div>
                    <div className={`text-xs ${patient.tiene_ficha ? 'text-green-600' : 'text-orange-600'}`}>
                      {patient.tiene_ficha ? '📋 Tiene ficha' : '⏳ Ficha entregada'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Pacientes;
