import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
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

interface Patient {
  id: string;
  nombre: string;
  tipo_servicio: 'workmed' | 'jenner' | null;
  empresa_id: string | null;
  empresas?: {
    id: string;
    nombre: string;
  } | null;
  atencion_actual?: {
    numero_ingreso: number;
    fecha_ingreso: string;
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

interface Paquete {
  id: string;
  nombre: string;
  descripcion: string | null;
  paquete_examen_items: Array<{
    examen_id: string;
  }>;
}

const Pacientes = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPatient, setEditingPatient] = useState<string | null>(null);
  const [pacienteToDelete, setPacienteToDelete] = useState<string | null>(null);
  const [selectedExamenes, setSelectedExamenes] = useState<string[]>([]);
  const [selectedPaquete, setSelectedPaquete] = useState<string>("");
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_servicio: "workmed" as "workmed" | "jenner",
    empresa_id: "",
    rut: "", // Temporary until types are regenerated
  });

  useEffect(() => {
    loadPatients();
    loadEmpresas();
    loadExamenes();
    loadPaquetes();
  }, []);

  const loadPatients = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data: patientsData, error: patientsError } = await supabase
        .from("pacientes")
        .select("*, empresas(*)")
        .order("nombre");

      if (patientsError) throw patientsError;

      // Obtener atenciones del día actual para cada paciente
      const { data: atencionesData, error: atencionesError } = await supabase
        .from("atenciones")
        .select("paciente_id, numero_ingreso, fecha_ingreso")
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .in("estado", ["en_espera", "en_atencion"]);

      if (atencionesError) throw atencionesError;

      // Mapear atenciones a pacientes
      const patientsWithAtenciones = (patientsData || []).map(patient => {
        const atencion = atencionesData?.find(a => a.paciente_id === patient.id);
        return {
          ...patient,
          atencion_actual: atencion ? {
            numero_ingreso: atencion.numero_ingreso,
            fecha_ingreso: atencion.fecha_ingreso
          } : null
        };
      });

      setPatients(patientsWithAtenciones);
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

  const loadPaquetes = async () => {
    try {
      const { data, error } = await supabase
        .from("paquetes_examenes")
        .select("*, paquete_examen_items(examen_id)")
        .order("nombre");

      if (error) throw error;
      setPaquetes(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar paquetes");
    }
  };

  const handleEdit = async (patient: Patient) => {
    setEditingPatient(patient.id);
    setFormData({
      nombre: patient.nombre,
      tipo_servicio: patient.tipo_servicio || "workmed",
      empresa_id: patient.empresa_id || "",
      rut: "",
    });

    // Cargar exámenes pendientes de la última atención
    try {
      const { data: atencionData, error: atencionError } = await supabase
        .from("atenciones")
        .select("id")
        .eq("paciente_id", patient.id)
        .in("estado", ["en_espera", "en_atencion"])
        .single();

      if (atencionError) throw atencionError;

      if (atencionData) {
        const { data: examenesData, error: examenesError } = await supabase
          .from("atencion_examenes")
          .select("examen_id")
          .eq("atencion_id", atencionData.id)
          .eq("estado", "pendiente");

        if (examenesError) throw examenesError;

        setSelectedExamenes(examenesData?.map(e => e.examen_id) || []);
      }
    } catch (error) {
      console.error("Error loading exams:", error);
      setSelectedExamenes([]);
    }

    setOpenDialog(true);
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
      if (editingPatient) {
        // Actualizar paciente
        const { error: pacienteError } = await supabase
          .from("pacientes")
          .update(formData)
          .eq("id", editingPatient);

        if (pacienteError) throw pacienteError;

        // Actualizar exámenes de la atención pendiente
        const { data: atencionData, error: atencionError } = await supabase
          .from("atenciones")
          .select("id")
          .eq("paciente_id", editingPatient)
          .in("estado", ["en_espera", "en_atencion"])
          .single();

        if (atencionError) throw atencionError;

        if (atencionData) {
          // Solo eliminar exámenes pendientes (conservar los completados)
          await supabase
            .from("atencion_examenes")
            .delete()
            .eq("atencion_id", atencionData.id)
            .eq("estado", "pendiente");

          // Agregar nuevos exámenes como pendientes
          const examenesData = selectedExamenes.map(examenId => ({
            atencion_id: atencionData.id,
            examen_id: examenId,
            estado: 'pendiente' as 'pendiente' | 'completado' | 'incompleto'
          }));

          const { error: examenesError } = await supabase
            .from("atencion_examenes")
            .insert(examenesData);

          if (examenesError) throw examenesError;
        }

        toast.success("Paciente actualizado exitosamente");
      } else {
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
      }

      setOpenDialog(false);
      setEditingPatient(null);
      setFormData({ nombre: "", tipo_servicio: "workmed", empresa_id: "", rut: "" });
      setSelectedExamenes([]);
      setSelectedPaquete("");
      loadPatients();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al procesar paciente");
    }
  };

  const handleDelete = async () => {
    if (!pacienteToDelete) return;

    try {
      const { error } = await supabase
        .from("pacientes")
        .delete()
        .eq("id", pacienteToDelete);

      if (error) throw error;
      
      toast.success("Paciente eliminado exitosamente");
      setPacienteToDelete(null);
      loadPatients();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar paciente");
    }
  };

  const filteredPatients = patients
    .filter(
      (p) =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.empresas?.nombre || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Primero ordenar por si tiene atención actual
      if (a.atencion_actual && !b.atencion_actual) return -1;
      if (!a.atencion_actual && b.atencion_actual) return 1;
      
      // Si ambos tienen atención actual, ordenar por número de ingreso
      if (a.atencion_actual && b.atencion_actual) {
        return a.atencion_actual.numero_ingreso - b.atencion_actual.numero_ingreso;
      }
      
      // Si ninguno tiene atención, ordenar por nombre
      return a.nombre.localeCompare(b.nombre);
    });

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
            <Dialog open={openDialog} onOpenChange={(open) => {
              setOpenDialog(open);
              if (!open) {
                setEditingPatient(null);
                setFormData({ nombre: "", tipo_servicio: "workmed", empresa_id: "", rut: "" });
                setSelectedExamenes([]);
                setSelectedPaquete("");
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingPatient ? "Editar Paciente" : "Agregar Nuevo Paciente"}</DialogTitle>
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
                    <Label htmlFor="paquete">Paquete de Exámenes (Opcional)</Label>
                    <select
                      id="paquete"
                      value={selectedPaquete}
                      onChange={(e) => {
                        const paqueteId = e.target.value;
                        setSelectedPaquete(paqueteId);
                        if (paqueteId) {
                          const paquete = paquetes.find(p => p.id === paqueteId);
                          if (paquete) {
                            const examenesIds = paquete.paquete_examen_items.map(item => item.examen_id);
                            setSelectedExamenes(examenesIds);
                          }
                        } else {
                          setSelectedExamenes([]);
                        }
                      }}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">Sin paquete - seleccionar individual</option>
                      {paquetes.map((paquete) => (
                        <option key={paquete.id} value={paquete.id}>
                          {paquete.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Exámenes a Realizar *</Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2 bg-muted/30">
                      {examenes.map((examen) => (
                        <label key={examen.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedExamenes.includes(examen.id)}
                            onChange={(e) => {
                              setSelectedPaquete(""); // Clear paquete selection
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

                  <Button type="submit" className="w-full">
                    {editingPatient ? "Actualizar Paciente" : "Guardar Paciente"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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
                     <div className="flex items-center gap-2">
                       {patient.atencion_actual && (
                         <Badge variant="outline" className="font-bold">#{patient.atencion_actual.numero_ingreso}</Badge>
                       )}
                       <div className="font-medium text-foreground">{patient.nombre}</div>
                     </div>
                     <div className="text-sm text-muted-foreground">
                       {patient.empresas?.nombre || "Sin empresa"}
                     </div>
                     {patient.atencion_actual && (
                       <div className="text-xs text-muted-foreground mt-1">
                         Ingresó hoy: {format(new Date(patient.atencion_actual.fecha_ingreso), "HH:mm", { locale: es })}
                       </div>
                     )}
                   </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <div className={`font-medium ${patient.tipo_servicio === 'workmed' ? 'text-blue-600' : 'text-green-600'}`}>
                        {patient.tipo_servicio === 'workmed' ? 'Workmed' : 'Jenner'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(patient)}
                    >
                      <Pencil className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPacienteToDelete(patient.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={!!pacienteToDelete} onOpenChange={() => setPacienteToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el paciente y todas sus atenciones.
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

export default Pacientes;
