import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2, Pencil, Calendar as CalendarIcon } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

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
  useAuth(); // Protect route
  const [patients, setPatients] = useState<Patient[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPatient, setEditingPatient] = useState<string | null>(null);
  const [pacienteToDelete, setPacienteToDelete] = useState<string | null>(null);
  const [selectedExamenes, setSelectedExamenes] = useState<string[]>([]);
  const [selectedPaquetes, setSelectedPaquetes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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
  }, [selectedDate]);

  const loadPatients = async () => {
    try {
      const dateToUse = selectedDate || new Date();
      const startOfDay = new Date(dateToUse.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(dateToUse.setHours(23, 59, 59, 999)).toISOString();

      // Obtener atenciones del día seleccionado (cualquier estado)
      const { data: atencionesData, error: atencionesError } = await supabase
        .from("atenciones")
        .select("paciente_id, numero_ingreso, fecha_ingreso, estado")
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay);

      if (atencionesError) throw atencionesError;

      // Obtener IDs únicos de pacientes que tienen atención en el día
      const pacienteIds = [...new Set(atencionesData?.map(a => a.paciente_id) || [])];

      if (pacienteIds.length === 0) {
        setPatients([]);
        return;
      }

      // Obtener solo los pacientes que tienen atenciones en el día
      const { data: patientsData, error: patientsError } = await supabase
        .from("pacientes")
        .select("*, empresas(*)")
        .in("id", pacienteIds)
        .order("nombre");

      if (patientsError) throw patientsError;

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

    // Cargar exámenes de la última atención (cualquier estado)
    try {
      const dateToUse = selectedDate || new Date();
      const startOfDay = new Date(dateToUse.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(dateToUse.setHours(23, 59, 59, 999)).toISOString();

      const { data: atencionData, error: atencionError } = await supabase
        .from("atenciones")
        .select("id, estado")
        .eq("paciente_id", patient.id)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (atencionError) throw atencionError;

      if (atencionData) {
        // Cargar exámenes pendientes (para agregar nuevos)
        const { data: examenesData, error: examenesError } = await supabase
          .from("atencion_examenes")
          .select("examen_id")
          .eq("atencion_id", atencionData.id)
          .eq("estado", "pendiente");

        if (examenesError) throw examenesError;

        setSelectedExamenes(examenesData?.map(e => e.examen_id) || []);
      } else {
        setSelectedExamenes([]);
      }
    } catch (error) {
      console.error("Error loading exams:", error);
      setSelectedExamenes([]);
    }

    setOpenDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Empresa requerida solo para Jenner
    if (formData.tipo_servicio === "jenner" && !formData.empresa_id) {
      toast.error("Debe seleccionar una empresa para servicio Jenner");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPatient) {
        // Actualizar paciente - convertir empresa_id vacío a null
        const updateData = {
          ...formData,
          empresa_id: formData.empresa_id || null
        };
        const { error: pacienteError } = await supabase
          .from("pacientes")
          .update(updateData)
          .eq("id", editingPatient);

        if (pacienteError) throw pacienteError;

        // Buscar atención del día (cualquier estado)
        const dateToUse = selectedDate || new Date();
        const startOfDay = new Date(dateToUse.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(dateToUse.setHours(23, 59, 59, 999)).toISOString();

        const { data: atencionData, error: atencionError } = await supabase
          .from("atenciones")
          .select("id, estado")
          .eq("paciente_id", editingPatient)
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

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

          // Si la atención estaba completada o incompleta, devolverla a en_espera
          if (atencionData.estado === "completado" || atencionData.estado === "incompleto") {
            const { error: updateError } = await supabase
              .from("atenciones")
              .update({ 
                estado: "en_espera", 
                box_id: null,
                fecha_fin_atencion: null 
              })
              .eq("id", atencionData.id);

            if (updateError) throw updateError;
            toast.success("Paciente devuelto a lista de espera con nuevos exámenes");
          } else {
            toast.success("Paciente actualizado exitosamente");
          }
        }
      } else {
        // Insertar paciente - convertir empresa_id vacío a null
        const insertData = {
          ...formData,
          empresa_id: formData.empresa_id || null
        };
        const { data: pacienteData, error: pacienteError } = await supabase
          .from("pacientes")
          .insert([insertData])
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

        // Agregar exámenes a la atención solo si hay seleccionados
        if (selectedExamenes.length > 0) {
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

        toast.success("Paciente agregado exitosamente");
      }

      setOpenDialog(false);
      setEditingPatient(null);
      setFormData({ nombre: "", tipo_servicio: "workmed", empresa_id: "", rut: "" });
      setSelectedExamenes([]);
      setSelectedPaquetes([]);
      loadPatients();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al procesar paciente");
    } finally {
      setIsSubmitting(false);
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={es}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Dialog open={openDialog} onOpenChange={(open) => {
              setOpenDialog(open);
              if (!open) {
                setEditingPatient(null);
                setFormData({ nombre: "", tipo_servicio: "workmed", empresa_id: "", rut: "" });
                setSelectedExamenes([]);
                setSelectedPaquetes([]);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPatient ? "Editar Paciente" : "Agregar Nuevo Paciente"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Columna izquierda - Datos del paciente */}
                    <div className="space-y-4">
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
                        <Label htmlFor="empresa">
                          Empresa {formData.tipo_servicio === "jenner" && "*"}
                        </Label>
                        <select
                          id="empresa"
                          required={formData.tipo_servicio === "jenner"}
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
                        <Label>Paquetes de Exámenes</Label>
                        <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2 bg-muted/30">
                          {paquetes.map((paquete) => (
                            <label key={paquete.id} className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPaquetes.includes(paquete.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPaquetes([...selectedPaquetes, paquete.id]);
                                    const examenesIds = paquete.paquete_examen_items.map(item => item.examen_id);
                                    const nuevosExamenes = examenesIds.filter(id => !selectedExamenes.includes(id));
                                    setSelectedExamenes([...selectedExamenes, ...nuevosExamenes]);
                                  } else {
                                    setSelectedPaquetes(selectedPaquetes.filter(id => id !== paquete.id));
                                  }
                                }}
                                className="w-4 h-4 mt-0.5"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium">{paquete.nombre}</span>
                                {paquete.descripcion && (
                                  <p className="text-xs text-muted-foreground">{paquete.descripcion}</p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Columna derecha - Exámenes */}
                    <div className="space-y-4">
                      <div>
                        <Label>Exámenes a Realizar</Label>
                        <div className="border rounded-md p-3 max-h-[400px] overflow-y-auto space-y-2 bg-muted/30">
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
                                    const paquetesConExamen = paquetes.filter(p => 
                                      p.paquete_examen_items.some(item => item.examen_id === examen.id)
                                    );
                                    const paquetesARemover = paquetesConExamen.filter(p => selectedPaquetes.includes(p.id));
                                    if (paquetesARemover.length > 0) {
                                      setSelectedPaquetes(selectedPaquetes.filter(id => 
                                        !paquetesARemover.map(p => p.id).includes(id)
                                      ));
                                    }
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{examen.nombre}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Guardando..." : (editingPatient ? "Actualizar Paciente" : "Guardar Paciente")}
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
