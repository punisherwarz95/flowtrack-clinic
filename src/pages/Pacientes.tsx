import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Trash2, Pencil, Calendar as CalendarIcon, ClipboardList, FileText, ClipboardPaste } from "lucide-react";
import CodigoDelDia from "@/components/CodigoDelDia";
import { useGenerateDocumentosFromBateria } from "@/hooks/useAtencionDocumentos";
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
import { cn, formatRutStandard } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Patient {
  id: string;
  nombre: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  tipo_servicio: 'workmed' | 'jenner' | null;
  empresa_id: string | null;
  faena_id: string | null;
  empresas?: {
    id: string;
    nombre: string;
  } | null;
  atencion_actual?: {
    numero_ingreso: number;
    fecha_ingreso: string;
  } | null;
}

// Función para verificar si un paciente tiene datos del portal pendientes
// Solo verifica datos que el paciente completa en el portal (no tipo_servicio que lo asigna el staff)
const isPacienteIncompleto = (patient: Patient): boolean => {
  return patient.nombre === "PENDIENTE DE REGISTRO" ||
         !patient.fecha_nacimiento ||
         !patient.email ||
         !patient.telefono;
};

interface Empresa {
  id: string;
  nombre: string;
}

interface Faena {
  id: string;
  nombre: string;
  direccion: string | null;
}

interface EmpresaFaena {
  faena_id: string;
  faenas: Faena;
}

interface BateriaFaena {
  paquete_id: string;
}

interface PaqueteFaenaMap {
  [paqueteId: string]: string[]; // paquete_id -> faena_ids
}

interface Examen {
  id: string;
  nombre: string;
  descripcion: string | null;
  codigo: string | null;
}

interface Paquete {
  id: string;
  nombre: string;
  descripcion: string | null;
  paquete_examen_items: Array<{
    examen_id: string;
  }>;
}

interface ExamenCompletado {
  id: string;
  examen_id: string;
  estado: string;
  examenes: {
    nombre: string;
  };
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
  const [examenFilter, setExamenFilter] = useState("");
  const [empresaSearchFilter, setEmpresaSearchFilter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [documentosPendientes, setDocumentosPendientes] = useState<{[patientId: string]: number}>({});
  
  // Estados para faenas
  const [faenasEmpresa, setFaenasEmpresa] = useState<Faena[]>([]);
  const [bateriasDisponibles, setBateriasDisponibles] = useState<string[]>([]);
  const [loadingFaenas, setLoadingFaenas] = useState(false);
  
  // Estados para filtro de baterías por faena (como en cotizaciones)
  const [allFaenas, setAllFaenas] = useState<Faena[]>([]);
  const [paqueteFaenasMap, setPaqueteFaenasMap] = useState<PaqueteFaenaMap>({});
  const [bateriaFilter, setBateriaFilter] = useState("");
  const [filtroFaenaIdBateria, setFiltroFaenaIdBateria] = useState<string>("__all__");
  const [textoWorkmed, setTextoWorkmed] = useState("");
  const [mostrarPegarTexto, setMostrarPegarTexto] = useState(false);
  
  const { generateDocuments } = useGenerateDocumentosFromBateria();
  
  // Estado para el diálogo de exámenes completados
  const [examenesCompletadosDialog, setExamenesCompletadosDialog] = useState<{
    open: boolean;
    patientId: string | null;
    patientName: string;
    examenes: ExamenCompletado[];
  }>({ open: false, patientId: null, patientName: "", examenes: [] });
  const [formData, setFormData] = useState({
    nombre: "",
    tipo_servicio: "" as "workmed" | "jenner" | "",
    empresa_id: "",
    faena_id: "",
    rut: "",
    email: "",
    telefono: "",
    fecha_nacimiento: "",
    direccion: "",
  });

  useEffect(() => {
    loadPatients();
    loadEmpresas();
    loadExamenes();
    loadPaquetes();
    loadAllFaenasAndBateriaFaenas();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      loadPatients();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  // Cargar todas las faenas y mapeo bateria-faena
  const loadAllFaenasAndBateriaFaenas = async () => {
    try {
      const [faenasRes, bateriaFaenasRes] = await Promise.all([
        supabase.from("faenas").select("id, nombre, direccion").eq("activo", true).order("nombre"),
        supabase.from("bateria_faenas").select("paquete_id, faena_id").eq("activo", true)
      ]);

      if (faenasRes.error) throw faenasRes.error;
      if (bateriaFaenasRes.error) throw bateriaFaenasRes.error;

      setAllFaenas(faenasRes.data || []);

      // Crear mapa de paquete -> faenas
      const map: PaqueteFaenaMap = {};
      (bateriaFaenasRes.data || []).forEach((bf: any) => {
        if (!map[bf.paquete_id]) {
          map[bf.paquete_id] = [];
        }
        map[bf.paquete_id].push(bf.faena_id);
      });
      setPaqueteFaenasMap(map);
    } catch (error) {
      console.error("Error loading faenas and bateria_faenas:", error);
    }
  };

  // Load document counts for patients
  const loadDocumentCounts = async (patientIds: string[]) => {
    if (patientIds.length === 0) return;
    
    try {
      const dateToUse = selectedDate || new Date();
      const startOfDay = new Date(new Date(dateToUse).setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(new Date(dateToUse).setHours(23, 59, 59, 999)).toISOString();

      // Get atenciones for these patients
      const { data: atenciones, error: atencionesError } = await supabase
        .from("atenciones")
        .select("id, paciente_id")
        .in("paciente_id", patientIds)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay);

      if (atencionesError) throw atencionesError;
      if (!atenciones || atenciones.length === 0) return;

      const atencionIds = atenciones.map(a => a.id);

      // Get pending documents count
      const { data: docs, error: docsError } = await supabase
        .from("atencion_documentos")
        .select("atencion_id, estado")
        .in("atencion_id", atencionIds)
        .eq("estado", "pendiente");

      if (docsError) throw docsError;

      // Map counts to patient IDs
      const counts: {[patientId: string]: number} = {};
      atenciones.forEach(a => {
        const pendingCount = (docs || []).filter(d => d.atencion_id === a.id).length;
        if (pendingCount > 0) {
          counts[a.paciente_id] = pendingCount;
        }
      });

      setDocumentosPendientes(counts);
    } catch (error) {
      console.error("Error loading document counts:", error);
    }
  };

  // Real-time updates for atenciones table
  useEffect(() => {
    const channel = supabase
      .channel('pacientes-atenciones-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atenciones'
        },
        () => {
          loadPatients();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pacientes'
        },
        () => {
          loadPatients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      
      // Load document counts after patients
      if (pacienteIds.length > 0) {
        loadDocumentCounts(pacienteIds);
      }
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
        .select("id, nombre, descripcion, codigo")
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

  // Cargar faenas disponibles para una empresa
  const loadFaenasDeEmpresa = async (empresaId: string) => {
    if (!empresaId) {
      setFaenasEmpresa([]);
      return;
    }
    
    setLoadingFaenas(true);
    try {
      const { data, error } = await supabase
        .from("empresa_faenas")
        .select("faena_id, faenas:faena_id(id, nombre, direccion)")
        .eq("empresa_id", empresaId)
        .eq("activo", true);

      if (error) throw error;
      
      const faenas = (data || [])
        .map((ef: any) => ef.faenas)
        .filter((f: any) => f !== null) as Faena[];
      
      setFaenasEmpresa(faenas);
    } catch (error) {
      console.error("Error loading faenas:", error);
      setFaenasEmpresa([]);
    } finally {
      setLoadingFaenas(false);
    }
  };

  // Cargar baterías disponibles para una faena
  const loadBateriasDisponibles = async (faenaId: string) => {
    if (!faenaId) {
      setBateriasDisponibles([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("bateria_faenas")
        .select("paquete_id")
        .eq("faena_id", faenaId)
        .eq("activo", true);

      if (error) throw error;
      
      const paqueteIds = (data || []).map((bf: any) => bf.paquete_id);
      setBateriasDisponibles(paqueteIds);
    } catch (error) {
      console.error("Error loading baterias:", error);
      setBateriasDisponibles([]);
    }
  };

  // Manejar cambio de empresa
  const handleEmpresaChange = async (empresaId: string) => {
    setFormData(prev => ({ ...prev, empresa_id: empresaId, faena_id: "" }));
    setSelectedPaquetes([]);
    setBateriasDisponibles([]);
    await loadFaenasDeEmpresa(empresaId);
  };

  // Manejar cambio de faena
  const handleFaenaChange = async (faenaId: string) => {
    setFormData(prev => ({ ...prev, faena_id: faenaId }));
    setSelectedPaquetes([]);
    await loadBateriasDisponibles(faenaId);
  };

  const handleEdit = async (patient: Patient) => {
    setEditingPatient(patient.id);
    setFormData({
      nombre: patient.nombre,
      tipo_servicio: patient.tipo_servicio || "",
      empresa_id: patient.empresa_id || "",
      faena_id: (patient as any).faena_id || "",
      rut: patient.rut || "",
      email: patient.email || "",
      telefono: patient.telefono || "",
      fecha_nacimiento: patient.fecha_nacimiento || "",
      direccion: patient.direccion || "",
    });
    
    // Cargar faenas de la empresa si existe
    if (patient.empresa_id) {
      await loadFaenasDeEmpresa(patient.empresa_id);
      if ((patient as any).faena_id) {
        await loadBateriasDisponibles((patient as any).faena_id);
      }
    }

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
    
    // Tipo de servicio obligatorio
    if (!formData.tipo_servicio) {
      toast.error("Debe seleccionar un tipo de servicio");
      return;
    }
    
    // Empresa requerida solo para Jenner
    if (formData.tipo_servicio === "jenner" && !formData.empresa_id) {
      toast.error("Debe seleccionar una empresa para servicio Jenner");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPatient) {
        // Actualizar paciente - convertir empresa_id vacío a null y formatear RUT
        const updateData: any = {
          ...formData,
          empresa_id: formData.empresa_id || null,
          rut: formData.rut.trim() ? formatRutStandard(formData.rut) : undefined,
        };

        // Si el RUT viene vacío en el formulario, NO lo tocamos para no borrarlo
        if (!formData.rut.trim()) {
          delete updateData.rut;
        }

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
          // Solo modificar exámenes si se seleccionaron exámenes o paquetes
          const hayNuevosExamenes = selectedExamenes.length > 0 || selectedPaquetes.length > 0;
          
          if (hayNuevosExamenes) {
            // Solo eliminar exámenes pendientes (conservar los completados)
            await supabase
              .from("atencion_examenes")
              .delete()
              .eq("atencion_id", atencionData.id)
              .eq("estado", "pendiente");

            // Agregar nuevos exámenes como pendientes
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

            // Registrar baterías asignadas a la atención para trazabilidad (edición)
            if (selectedPaquetes.length > 0) {
              // Primero eliminar baterías anteriores de esta atención
              await supabase
                .from("atencion_baterias")
                .delete()
                .eq("atencion_id", atencionData.id);

              // Insertar las nuevas baterías
              const bateriasData = selectedPaquetes.map(paqueteId => ({
                atencion_id: atencionData.id,
                paquete_id: paqueteId
              }));

              const { error: bateriasError } = await supabase
                .from("atencion_baterias")
                .insert(bateriasData);

              if (bateriasError) {
                console.error("Error registrando baterías:", bateriasError);
              }
            }

            // FASE 6: Generate documents from selected batteries (also on edit)
            if (selectedPaquetes.length > 0) {
              console.log("[Pacientes] Generando documentos para paquetes:", selectedPaquetes);
              const result = await generateDocuments(atencionData.id, selectedPaquetes);
              if (result.success && result.count > 0) {
                toast.success(`${result.count} documento(s) generado(s)`);
              } else if (!result.success) {
                toast.error(`Error generando documentos: ${result.error}`);
              }
            }

            // Solo devolver a espera si se agregaron nuevos exámenes Y la atención estaba completada/incompleta
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
              toast.success("Paciente actualizado con nuevos exámenes");
            }
          } else {
            // Solo se modificaron datos del paciente, no tocar exámenes ni estado
            toast.success("Datos del paciente actualizados");
          }
        }
      } else {
        // Insertar paciente - convertir empresa_id y faena_id vacíos a null y formatear RUT
        const insertData = {
          ...formData,
          tipo_servicio: formData.tipo_servicio as "workmed" | "jenner",
          empresa_id: formData.empresa_id || null,
          faena_id: formData.faena_id || null,
          rut: formData.rut.trim() ? formatRutStandard(formData.rut) : null,
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

        // Registrar baterías asignadas a la atención para trazabilidad
        if (selectedPaquetes.length > 0) {
          const bateriasData = selectedPaquetes.map(paqueteId => ({
            atencion_id: atencionData.id,
            paquete_id: paqueteId
          }));

          const { error: bateriasError } = await supabase
            .from("atencion_baterias")
            .insert(bateriasData);

          if (bateriasError) {
            console.error("Error registrando baterías:", bateriasError);
            // No interrumpir el flujo, solo log
          }
        }

        // FASE 6: Generate documents from selected batteries
        if (selectedPaquetes.length > 0) {
          console.log("[Pacientes] Generando documentos para nuevo paciente, paquetes:", selectedPaquetes);
          const result = await generateDocuments(atencionData.id, selectedPaquetes);
          if (result.success && result.count > 0) {
            toast.success(`${result.count} documento(s) generado(s)`);
          } else if (!result.success) {
            toast.error(`Error generando documentos: ${result.error}`);
          }
        }

        toast.success("Paciente agregado exitosamente");
      }

      setOpenDialog(false);
      setEditingPatient(null);
      const workmedEmpresaReset = empresas.find(emp => emp.nombre.toUpperCase() === "WORKMED");
      setFormData({ nombre: "", tipo_servicio: "workmed", empresa_id: workmedEmpresaReset?.id || "", faena_id: "", rut: "", email: "", telefono: "", fecha_nacimiento: "", direccion: "" });
      setFaenasEmpresa([]);
      setBateriasDisponibles([]);
      setSelectedExamenes([]);
      setSelectedPaquetes([]);
      setBateriaFilter("");
      setFiltroFaenaIdBateria("__all__");
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
      const dateToUse = selectedDate || new Date();
      const startOfDay = new Date(new Date(dateToUse).setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(new Date(dateToUse).setHours(23, 59, 59, 999)).toISOString();

      // En vez de eliminar el paciente (lo que borraría su historial por cascada),
      // eliminamos SOLO la atención del día seleccionado.
      const { data: atencionData, error: atencionError } = await supabase
        .from("atenciones")
        .select("id, numero_ingreso")
        .eq("paciente_id", pacienteToDelete)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (atencionError) throw atencionError;

      if (!atencionData) {
        toast.info("Este paciente no tiene atención en la fecha seleccionada");
        setPacienteToDelete(null);
        return;
      }

      const { error: deleteError } = await supabase
        .from("atenciones")
        .delete()
        .eq("id", atencionData.id);

      if (deleteError) throw deleteError;

      toast.success(`Atención #${atencionData.numero_ingreso ?? "--"} eliminada`);
      setPacienteToDelete(null);
      loadPatients();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar atención");
    }
  };

  // Abrir diálogo de exámenes completados
  const handleViewExamenesCompletados = async (patient: Patient) => {
    try {
      const dateToUse = selectedDate || new Date();
      const startOfDay = new Date(new Date(dateToUse).setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(new Date(dateToUse).setHours(23, 59, 59, 999)).toISOString();

      // Buscar atención del día
      const { data: atencionData, error: atencionError } = await supabase
        .from("atenciones")
        .select("id")
        .eq("paciente_id", patient.id)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (atencionError) throw atencionError;

      if (!atencionData) {
        toast.info("Este paciente no tiene atención registrada hoy");
        return;
      }

      // Cargar exámenes completados e incompletos
      const { data: examenesData, error: examenesError } = await supabase
        .from("atencion_examenes")
        .select("id, examen_id, estado, examenes(nombre)")
        .eq("atencion_id", atencionData.id)
        .in("estado", ["completado", "incompleto"]);

      if (examenesError) throw examenesError;

      setExamenesCompletadosDialog({
        open: true,
        patientId: patient.id,
        patientName: patient.nombre,
        examenes: (examenesData || []) as ExamenCompletado[]
      });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar exámenes");
    }
  };

  // Revertir examen a pendiente
  const handleRevertirExamen = async (atencionExamenId: string) => {
    try {
      const { error } = await supabase
        .from("atencion_examenes")
        .update({ estado: "pendiente", fecha_realizacion: null })
        .eq("id", atencionExamenId);

      if (error) throw error;

      // Actualizar lista local
      setExamenesCompletadosDialog(prev => ({
        ...prev,
        examenes: prev.examenes.filter(e => e.id !== atencionExamenId)
      }));

      // Si el paciente está completado/incompleto, devolverlo a en_espera
      if (examenesCompletadosDialog.patientId) {
        const dateToUse = selectedDate || new Date();
        const startOfDay = new Date(new Date(dateToUse).setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(new Date(dateToUse).setHours(23, 59, 59, 999)).toISOString();

        const { data: atencionData } = await supabase
          .from("atenciones")
          .select("id, estado")
          .eq("paciente_id", examenesCompletadosDialog.patientId)
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay)
          .maybeSingle();

        if (atencionData && (atencionData.estado === "completado" || atencionData.estado === "incompleto")) {
          await supabase
            .from("atenciones")
            .update({ estado: "en_espera", box_id: null, fecha_fin_atencion: null })
            .eq("id", atencionData.id);
        }
      }

      toast.success("Examen devuelto a pendiente");
      loadPatients();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al revertir examen");
    }
  };

  // Función para parsear texto de Workmed y auto-seleccionar exámenes
  const handleParsearTextoWorkmed = () => {
    if (!textoWorkmed.trim()) {
      toast.error("Pegue el texto de Workmed primero");
      return;
    }

    // Normalizar texto: convertir a mayúsculas y limpiar
    const textoNormalizado = textoWorkmed.toUpperCase();
    
    // Extraer todas las líneas no vacías del texto pegado
    const lineas = textoNormalizado
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    let coincidencias = 0;
    const nuevosExamenes = [...selectedExamenes];

    examenes.forEach((examen) => {
      const nombreExamen = examen.nombre.toUpperCase().trim();
      const codigoExamen = examen.codigo?.toUpperCase().trim() || "";

      // Buscar si alguna línea del texto coincide con el nombre o código del examen
      const encontrado = lineas.some(linea => {
        // Coincidencia exacta o si la línea contiene el nombre del examen
        if (linea === nombreExamen || linea.includes(nombreExamen)) return true;
        // Coincidencia por código
        if (codigoExamen && (linea === codigoExamen || linea.includes(codigoExamen))) return true;
        // Coincidencia inversa: el nombre del examen contiene la línea (para nombres parciales)
        if (linea.length >= 5 && nombreExamen.includes(linea)) return true;
        return false;
      });

      if (encontrado && !nuevosExamenes.includes(examen.id)) {
        nuevosExamenes.push(examen.id);
        coincidencias++;
      }
    });

    setSelectedExamenes(nuevosExamenes);
    
    if (coincidencias > 0) {
      toast.success(`${coincidencias} examen(es) encontrado(s) y seleccionado(s)`);
      setTextoWorkmed("");
      setMostrarPegarTexto(false);
    } else {
      toast.error("No se encontraron coincidencias con los exámenes registrados");
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
        <div className="mb-4 flex items-center justify-between">
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
                const workmedEmpresa = empresas.find(emp => emp.nombre.toUpperCase() === "WORKMED");
                setFormData({ nombre: "", tipo_servicio: "workmed", empresa_id: workmedEmpresa?.id || "", faena_id: "", rut: "", email: "", telefono: "", fecha_nacimiento: "", direccion: "" });
                setFaenasEmpresa([]);
                setBateriasDisponibles([]);
                setSelectedExamenes([]);
                setSelectedPaquetes([]);
                setExamenFilter("");
                setBateriaFilter("");
                setFiltroFaenaIdBateria("__all__");
                setTextoWorkmed("");
                setMostrarPegarTexto(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Paciente
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[90vw] h-[85vh] max-w-none flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>{editingPatient ? "Editar Paciente" : "Agregar Nuevo Paciente"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden">
                    {/* Columna 1 - Datos personales del paciente */}
                    <div className="flex flex-col space-y-3 overflow-y-auto pr-2">
                      <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2 sticky top-0 bg-background z-10">Datos Personales</h3>
                      <div>
                        <Label htmlFor="nombre" className="text-sm font-medium">Nombre Completo *</Label>
                        <Input
                          id="nombre"
                          required
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          className="h-9 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rut" className="text-sm font-medium">RUT</Label>
                        <Input
                          id="rut"
                          value={formData.rut}
                          onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                          placeholder="12.345.678-9"
                          className="h-9 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fecha_nacimiento" className="text-sm font-medium">Fecha de Nacimiento</Label>
                        <Input
                          id="fecha_nacimiento"
                          type="date"
                          value={formData.fecha_nacimiento}
                          onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                          className="h-9 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="correo@ejemplo.com"
                          className="h-9 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="telefono" className="text-sm font-medium">Teléfono</Label>
                        <Input
                          id="telefono"
                          type="tel"
                          value={formData.telefono}
                          onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                          placeholder="+56 9 1234 5678"
                          className="h-9 mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="direccion" className="text-sm font-medium">Dirección</Label>
                        <Input
                          id="direccion"
                          value={formData.direccion}
                          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                          placeholder="Av. Principal 123, Comuna"
                          className="h-9 mt-1"
                        />
                      </div>
                    </div>

                    {/* Columna 2 - Servicio y empresa */}
                    <div className="flex flex-col space-y-3 overflow-y-auto pr-2">
                      <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2 sticky top-0 bg-background z-10">Servicio y Empresa</h3>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Tipo de Servicio *</Label>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="tipo_servicio"
                                value="workmed"
                                checked={formData.tipo_servicio === "workmed"}
                                onChange={async (e) => {
                                  const workmedEmpresa = empresas.find(emp => emp.nombre.toUpperCase() === "WORKMED");
                                  const empresaId = workmedEmpresa?.id || "";
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    tipo_servicio: e.target.value as "workmed" | "jenner",
                                    empresa_id: empresaId,
                                    faena_id: ""
                                  }));
                                  setSelectedPaquetes([]);
                                  setBateriasDisponibles([]);
                                  if (empresaId) {
                                    await loadFaenasDeEmpresa(empresaId);
                                  }
                                }}
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
                                onChange={(e) => setFormData(prev => ({ ...prev, tipo_servicio: e.target.value as "workmed" | "jenner" }))}
                                className="w-4 h-4"
                              />
                              <span>Jenner</span>
                            </label>
                          </div>
                          {!formData.tipo_servicio && editingPatient && (
                            <p className="text-sm text-amber-600">
                              ⚠️ Paciente del portal. Seleccione un tipo de servicio.
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="empresa" className="text-sm font-medium">
                          Empresa {formData.tipo_servicio === "jenner" && "*"}
                        </Label>
                        <div className="relative mt-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                          <Input
                            placeholder="Buscar empresa..."
                            value={empresaSearchFilter}
                            onChange={(e) => setEmpresaSearchFilter(e.target.value)}
                            className="pl-10 h-9 mb-1"
                          />
                        </div>
                        <select
                          id="empresa"
                          required={formData.tipo_servicio === "jenner"}
                          value={formData.empresa_id}
                          onChange={(e) => handleEmpresaChange(e.target.value)}
                          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="">Seleccione una empresa</option>
                          {empresas
                            .filter((empresa) => 
                              !empresaSearchFilter || 
                              empresa.nombre.toLowerCase().includes(empresaSearchFilter.toLowerCase())
                            )
                            .map((empresa) => (
                              <option key={empresa.id} value={empresa.id}>
                                {empresa.nombre}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Selector de Faena - solo visible si hay empresa seleccionada */}
                      {formData.empresa_id && (
                        <div>
                          <Label htmlFor="faena" className="text-sm font-medium">
                            Faena / Centro de Trabajo
                          </Label>
                          {loadingFaenas ? (
                            <div className="h-9 flex items-center text-sm text-muted-foreground">
                              Cargando faenas...
                            </div>
                          ) : faenasEmpresa.length === 0 ? (
                            <div className="h-9 flex items-center text-sm text-amber-600">
                              Esta empresa no tiene faenas asignadas
                            </div>
                          ) : (
                            <select
                              id="faena"
                              value={formData.faena_id}
                              onChange={(e) => handleFaenaChange(e.target.value)}
                              className="w-full h-9 px-3 rounded-md border border-input bg-background mt-1 text-sm"
                            >
                              <option value="">Seleccione una faena</option>
                              {faenasEmpresa.map((faena) => (
                                <option key={faena.id} value={faena.id}>
                                  {faena.nombre}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Columna 3 - Exámenes seleccionados (confirmación) */}
                    <div className="flex flex-col overflow-hidden">
                      <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2 mb-2 flex-shrink-0">
                        Exámenes a Realizar
                        {selectedExamenes.length > 0 && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {selectedExamenes.length}
                          </span>
                        )}
                      </h3>
                      <div className="flex-1 border rounded-md bg-muted/30 overflow-y-auto">
                        {selectedExamenes.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-sm text-muted-foreground p-4 text-center">
                            Seleccione baterías o exámenes individuales desde la columna derecha
                          </div>
                        ) : (
                          <div className="p-2 space-y-1">
                            {selectedExamenes.map((examenId) => {
                              const examen = examenes.find(e => e.id === examenId);
                              if (!examen) return null;
                              return (
                                <div
                                  key={examenId}
                                  className="flex items-center justify-between py-1.5 px-2 bg-background rounded border text-sm"
                                >
                                  <div className="flex-1 min-w-0">
                                    <span className="block break-words">{examen.nombre}</span>
                                    {examen.codigo && (
                                      <span className="text-xs text-muted-foreground">{examen.codigo}</span>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={() => setSelectedExamenes(prev => prev.filter(id => id !== examenId))}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {selectedPaquetes.length > 0 && (
                        <div className="mt-2 flex-shrink-0">
                          <div className="text-xs text-muted-foreground mb-1">Baterías seleccionadas:</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedPaquetes.map((paqueteId) => {
                              const paquete = paquetes.find(p => p.id === paqueteId);
                              return paquete ? (
                                <Badge key={paqueteId} variant="secondary" className="text-xs">
                                  {paquete.nombre}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Columna 4 - Buscador de baterías y exámenes */}
                    <div className="flex flex-col overflow-hidden">
                      <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2 mb-2 flex-shrink-0 flex items-center justify-between">
                        Agregar Exámenes
                        <Button
                          type="button"
                          variant={mostrarPegarTexto ? "secondary" : "outline"}
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setMostrarPegarTexto(!mostrarPegarTexto)}
                        >
                          <ClipboardPaste className="h-3 w-3" />
                          Pegar texto
                        </Button>
                      </h3>

                      {/* Pegar texto Workmed */}
                      {mostrarPegarTexto && (
                        <div className="flex-shrink-0 mb-2 p-2 border rounded-md bg-muted/50 space-y-2">
                          <Label className="text-xs text-muted-foreground">Pegue el extracto de exámenes de Workmed:</Label>
                          <textarea
                            value={textoWorkmed}
                            onChange={(e) => setTextoWorkmed(e.target.value)}
                            placeholder={"Antropometría\nANTROPOMETRIA Y CONTROL DE SIGNOS VITALES\nConsulta médica\nCONSULTA MÉDICA\n..."}
                            className="w-full h-28 p-2 text-xs rounded-md border border-input bg-background resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs flex-1"
                              onClick={handleParsearTextoWorkmed}
                            >
                              Analizar y seleccionar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setTextoWorkmed(""); setMostrarPegarTexto(false); }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Filtro de faena arriba */}
                      <div className="flex-shrink-0 mb-2">
                        <Label className="text-xs text-muted-foreground mb-1 block">Filtrar por faena:</Label>
                        <select
                          value={filtroFaenaIdBateria}
                          onChange={(e) => setFiltroFaenaIdBateria(e.target.value)}
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="__all__">📍 Todas las faenas</option>
                          {allFaenas.map((f) => (
                            <option key={f.id} value={f.id}>
                              📍 {f.nombre}
                            </option>
                          ))}
                          <option value="__none__">Sin faena</option>
                        </select>
                      </div>

                      {/* Buscador */}
                      <div className="flex-shrink-0 relative mb-2">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar batería o examen..."
                          value={bateriaFilter}
                          onChange={(e) => setBateriaFilter(e.target.value)}
                          className="pl-8 h-8 text-sm"
                        />
                      </div>

                      {/* Lista de baterías y exámenes */}
                      <div className="flex-1 border rounded-md bg-muted/30 overflow-y-auto">
                        {/* Baterías */}
                        <div className="p-2">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">BATERÍAS</div>
                          {(() => {
                            // Agrupar paquetes por faena
                            const grupos: { faenaId: string; faenaNombre: string; paquetes: typeof paquetes }[] = [];
                            const sinFaena: typeof paquetes = [];

                            paquetes.forEach((paquete) => {
                              // Filtrar por búsqueda de texto
                              if (bateriaFilter && !paquete.nombre.toLowerCase().includes(bateriaFilter.toLowerCase())) {
                                return;
                              }

                              const faenaIds = paqueteFaenasMap[paquete.id] || [];
                              if (faenaIds.length === 0) {
                                sinFaena.push(paquete);
                              } else {
                                faenaIds.forEach((faenaId) => {
                                  const faena = allFaenas.find((f) => f.id === faenaId);
                                  if (!faena) return;
                                  let grupo = grupos.find((g) => g.faenaId === faenaId);
                                  if (!grupo) {
                                    grupo = { faenaId, faenaNombre: faena.nombre, paquetes: [] };
                                    grupos.push(grupo);
                                  }
                                  if (!grupo.paquetes.some((p) => p.id === paquete.id)) {
                                    grupo.paquetes.push(paquete);
                                  }
                                });
                              }
                            });

                            grupos.sort((a, b) => a.faenaNombre.localeCompare(b.faenaNombre));
                            if (sinFaena.length > 0) {
                              grupos.push({ faenaId: "__none__", faenaNombre: "Sin faena asignada", paquetes: sinFaena });
                            }

                            // Aplicar filtro de faena
                            const gruposFiltrados = filtroFaenaIdBateria === "__all__" 
                              ? grupos 
                              : grupos.filter(g => g.faenaId === filtroFaenaIdBateria);

                            if (gruposFiltrados.length === 0) {
                              return (
                                <div className="text-xs text-muted-foreground text-center py-2">
                                  No se encontraron baterías
                                </div>
                              );
                            }

                            return gruposFiltrados.map((grupo) => (
                              <div key={grupo.faenaId} className="mb-2 last:mb-0">
                                <div className="text-xs font-medium text-muted-foreground bg-muted py-1 px-2 rounded mb-1">
                                  {grupo.faenaNombre}
                                </div>
                                <div className="space-y-0.5 pl-1">
                                  {grupo.paquetes.map((paquete) => (
                                    <label key={paquete.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 hover:bg-accent rounded text-sm">
                                      <input
                                        type="checkbox"
                                        checked={selectedPaquetes.includes(paquete.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedPaquetes([...selectedPaquetes, paquete.id]);
                                            const examenesIds = paquete.paquete_examen_items.map(item => item.examen_id);
                                            setSelectedExamenes(prev => [...new Set([...prev, ...examenesIds])]);
                                          } else {
                                            setSelectedPaquetes(selectedPaquetes.filter(id => id !== paquete.id));
                                            const examenesIds = paquete.paquete_examen_items.map(item => item.examen_id);
                                            setSelectedExamenes(prev => prev.filter(id => !examenesIds.includes(id)));
                                          }
                                        }}
                                        className="w-3.5 h-3.5"
                                      />
                                      <span className="break-words">{paquete.nombre}</span>
                                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                                        ({paquete.paquete_examen_items.length})
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>

                        {/* Separador */}
                        <div className="border-t mx-2 my-2" />

                        {/* Exámenes individuales */}
                        <div className="p-2">
                          <div className="text-xs font-semibold text-muted-foreground mb-2">EXÁMENES INDIVIDUALES</div>
                          <div className="space-y-0.5">
                            {examenes
                              .filter(examen => 
                                !bateriaFilter || 
                                examen.nombre.toLowerCase().includes(bateriaFilter.toLowerCase()) ||
                                (examen.codigo && examen.codigo.toLowerCase().includes(bateriaFilter.toLowerCase()))
                              )
                              .slice(0, 50)
                              .map((examen) => (
                                <label key={examen.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 hover:bg-accent rounded text-sm">
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
                                    className="w-3.5 h-3.5"
                                  />
                                  <span className="break-words flex-1">{examen.nombre}</span>
                                  {examen.codigo && (
                                    <span className="text-xs text-muted-foreground shrink-0">{examen.codigo}</span>
                                  )}
                                </label>
                              ))}
                            {examenes.filter(examen => 
                              !bateriaFilter || 
                              examen.nombre.toLowerCase().includes(bateriaFilter.toLowerCase()) ||
                              (examen.codigo && examen.codigo.toLowerCase().includes(bateriaFilter.toLowerCase()))
                            ).length > 50 && (
                              <div className="text-xs text-muted-foreground text-center py-1">
                                Use el buscador para filtrar más resultados...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0 mt-4">
                    <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Guardando..." : (editingPatient ? "Guardar Cambios" : "Agregar Paciente")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Card del Código del Día */}
        <CodigoDelDia className="mb-4" />

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
              {filteredPatients.map((patient) => {
                const incompleto = isPacienteIncompleto(patient);
                
                return (
                  <div
                    key={patient.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border transition-colors",
                      incompleto 
                        ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700" 
                        : "border-border hover:bg-accent"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {patient.atencion_actual && (
                          <Badge variant="outline" className="font-bold">#{patient.atencion_actual.numero_ingreso}</Badge>
                        )}
                        {incompleto && (
                          <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600">
                            Esperando datos
                          </Badge>
                        )}
                        <div className="font-medium text-foreground">
                          {patient.nombre === "PENDIENTE DE REGISTRO" ? (
                            <span className="italic text-muted-foreground">Pendiente de registro</span>
                          ) : (
                            patient.nombre
                          )}
                        </div>
                        {patient.rut && (
                          <span className="text-sm text-muted-foreground">({patient.rut})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        {incompleto ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            El paciente está completando sus datos en el portal...
                          </span>
                        ) : (
                          <>
                            <span>{patient.empresas?.nombre || "Sin empresa"}</span>
                            {patient.fecha_nacimiento && patient.fecha_nacimiento.length > 0 && !isNaN(new Date(patient.fecha_nacimiento + "T00:00:00").getTime()) && (
                              <span>• Nac: {format(new Date(patient.fecha_nacimiento + "T00:00:00"), "dd/MM/yyyy", { locale: es })}</span>
                            )}
                            {patient.email && <span>• {patient.email}</span>}
                            {patient.telefono && <span>• {patient.telefono}</span>}
                          </>
                        )}
                      </div>
                      {patient.atencion_actual?.fecha_ingreso && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Ingresó hoy: {format(new Date(patient.atencion_actual.fecha_ingreso), "HH:mm", { locale: es })}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {!incompleto && (
                        <>
                          <div className="text-right text-sm">
                            <div className={`font-medium ${patient.tipo_servicio === 'workmed' ? 'text-blue-600' : 'text-green-600'}`}>
                              {patient.tipo_servicio === 'workmed' ? 'Workmed' : 'Jenner'}
                            </div>
                          </div>
                          {/* FASE 7: Document pending indicator */}
                          {documentosPendientes[patient.id] > 0 && (
                            <Badge variant="outline" className="border-warning text-warning gap-1">
                              <FileText className="h-3 w-3" />
                              {documentosPendientes[patient.id]} docs
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewExamenesCompletados(patient)}
                            title="Ver exámenes completados"
                          >
                            <ClipboardList className="h-4 w-4 text-info" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(patient)}
                        title={incompleto ? "Completar datos del paciente" : "Editar paciente"}
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      {patient.atencion_actual && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPacienteToDelete(patient.id)}
                          title="Eliminar atención del día"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={!!pacienteToDelete} onOpenChange={() => setPacienteToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará la atención del día seleccionado. El historial del paciente (atenciones anteriores) no se elimina.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Eliminar atención</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de exámenes completados */}
        <Dialog 
          open={examenesCompletadosDialog.open} 
          onOpenChange={(open) => setExamenesCompletadosDialog(prev => ({ ...prev, open }))}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Exámenes de {examenesCompletadosDialog.patientName}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
              {examenesCompletadosDialog.examenes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay exámenes completados o incompletos para este paciente
                </p>
              ) : (
                examenesCompletadosDialog.examenes.map((examen) => (
                  <div 
                    key={examen.id} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{examen.examenes.nombre}</span>
                      <Badge 
                        variant={examen.estado === "completado" ? "default" : "secondary"}
                        className={examen.estado === "completado" ? "bg-green-500" : "bg-orange-500"}
                      >
                        {examen.estado === "completado" ? "Completado" : "Incompleto"}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevertirExamen(examen.id)}
                      className="text-warning border-warning hover:bg-warning/10"
                    >
                      Revertir
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Pacientes;
