import { useState, useEffect, useCallback, useRef } from "react";
import portalBackground from "@/assets/portal-background.jpeg";

// Portal Paciente v0.0.7 - RUT formato estándar 00.000.000-0
// Cambios: Estandarización de formato RUT en BD, búsqueda simplificada
const PORTAL_VERSION = "0.0.7";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Loader2, ExternalLink, CheckCircle2, Clock, Building2, FileText, AlertCircle, X, RefreshCw, ChevronDown, CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatRutStandard, normalizeRut as normalizeRutUtil } from "@/lib/utils";

interface Paciente {
  id: string;
  nombre: string;
  rut: string | null;
  fecha_nacimiento: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  tipo_servicio?: string | null;
}

interface Empresa {
  id: string;
  nombre: string;
}

interface Examen {
  id: string;
  nombre: string;
}

interface AtencionExamen {
  id: string;
  examen_id: string;
  estado: string;
  examenes: Examen;
}

interface Box {
  id: string;
  nombre: string;
  box_examenes: Array<{ examen_id: string }>;
}

interface Atencion {
  id: string;
  estado: string;
  box_id: string | null;
  numero_ingreso: number | null;
  fecha_ingreso: string;
  atencion_examenes: AtencionExamen[];
  boxes?: { nombre: string } | null;
}

interface ExamenTest {
  id: string;
  nombre: string;
  url: string;
  examen_id: string;
}

interface TestTracking {
  examen_test_id: string;
  abierto_at: string;
  completado: boolean;
}

export default function PortalPaciente() {
  const [step, setStep] = useState<"identificacion" | "registro" | "portal">("identificacion");
  const [rut, setRut] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [atencion, setAtencion] = useState<Atencion | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [pendingBoxes, setPendingBoxes] = useState<string[]>([]);
  const [examenTests, setExamenTests] = useState<ExamenTest[]>([]);
  const [testTracking, setTestTracking] = useState<TestTracking[]>([]);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [currentTest, setCurrentTest] = useState<ExamenTest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Lista de ciudades de Chile para validación
  const ciudadesChile = [
    "Arica", "Iquique", "Alto Hospicio", "Antofagasta", "Calama", "Tocopilla",
    "Copiapó", "Vallenar", "La Serena", "Coquimbo", "Ovalle", "Illapel",
    "Valparaíso", "Viña del Mar", "Quilpué", "Villa Alemana", "Quillota", "San Antonio", "Los Andes", "San Felipe",
    "Santiago", "Puente Alto", "Maipú", "La Florida", "Las Condes", "Peñalolén", "San Bernardo", "Providencia", "Ñuñoa", "Lo Barnechea", "Vitacura", "La Reina", "Macul", "El Bosque", "La Pintana", "San Ramón", "La Granja", "Recoleta", "Independencia", "Conchalí", "Huechuraba", "Renca", "Cerro Navia", "Lo Prado", "Pudahuel", "Quinta Normal", "Estación Central", "Cerrillos", "Pedro Aguirre Cerda", "Lo Espejo", "San Miguel", "La Cisterna", "San Joaquín", "Colina", "Lampa", "Buin", "Paine", "Melipilla", "Talagante", "Peñaflor",
    "Rancagua", "San Fernando", "Rengo", "Machalí",
    "Talca", "Curicó", "Linares", "Constitución",
    "Chillán", "Chillán Viejo", "Los Ángeles", "Concepción", "Talcahuano", "Hualpén", "Coronel", "San Pedro de la Paz", "Tomé", "Penco", "Lota",
    "Temuco", "Padre Las Casas", "Villarrica", "Pucón", "Angol",
    "Valdivia", "Osorno", "La Unión",
    "Puerto Montt", "Puerto Varas", "Castro", "Ancud", "Quellón",
    "Coyhaique", "Puerto Aysén",
    "Punta Arenas", "Puerto Natales"
  ];

  // Form fields for new registration
  const [formData, setFormData] = useState({
    // Campos separados para nombre
    primerNombre: "",
    apellidoPaterno: "",
    apellidoMaterno: "",
    rut: "",
    fecha_nacimiento: "",
    fecha_nacimiento_display: "",
    email: "",
    telefono: "",
    // Campos separados para dirección
    calle: "",
    numeracion: "",
    ciudad: ""
  });

  // Estado para sugerencias de ciudades
  const [ciudadSugerencias, setCiudadSugerencias] = useState<string[]>([]);
  const [showCiudadSugerencias, setShowCiudadSugerencias] = useState(false);

  const { toast, dismiss } = useToast();
  const lastNotificationBoxRef = useRef<string | null>(null);
  const prevEstadoRef = useRef<string | null>(null);
  const prevBoxIdRef = useRef<string | null>(null);
  const prevDataHashRef = useRef<string>("");
  const prevBoxesHashRef = useRef<string>("");
  
  // Audio para Android
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef<boolean>(false);

  // Desbloquear audio en el primer toque (requerido para Android)
  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;
      
      try {
        // Crear AudioContext
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          // Reproducir un sonido silencioso para desbloquear
          const oscillator = audioContextRef.current.createOscillator();
          const gainNode = audioContextRef.current.createGain();
          gainNode.gain.value = 0; // Silencioso
          oscillator.connect(gainNode);
          gainNode.connect(audioContextRef.current.destination);
          oscillator.start();
          oscillator.stop(audioContextRef.current.currentTime + 0.001);
          audioUnlockedRef.current = true;
          console.log("[Portal] Audio desbloqueado para Android");
        }
      } catch (e) {
        console.log("[Portal] Error desbloqueando audio:", e);
      }
    };

    // Escuchar primer toque/click
    document.addEventListener("touchstart", unlockAudio, { once: true });
    document.addEventListener("click", unlockAudio, { once: true });

    return () => {
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };
  }, []);

  // Función para reproducir sonido de notificación (v0.0.5 - defensiva para Android 12+)
  const reproducirSonido = useCallback(() => {
    // Ejecutar de forma asíncrona para no bloquear el renderizado
    setTimeout(() => {
      try {
        if (!audioContextRef.current || audioContextRef.current.state === "closed") {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioContextRef.current = new AudioContextClass();
          }
        }

        const ctx = audioContextRef.current;
        if (!ctx) {
          console.log("[Portal v" + PORTAL_VERSION + "] AudioContext no disponible");
          return;
        }

        // Resumir si está suspendido
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {
            console.log("[Portal v" + PORTAL_VERSION + "] No se pudo resumir AudioContext");
          });
        }

        // Reproducir 3 beeps
        const beepDuration = 0.15;
        const beepGap = 0.1;
        
        for (let i = 0; i < 3; i++) {
          const startTime = ctx.currentTime + i * (beepDuration + beepGap);
          
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          oscillator.type = "sine";
          oscillator.frequency.value = 880; // Nota A5
          
          gainNode.gain.setValueAtTime(0.3, startTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + beepDuration);
          
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + beepDuration);
        }
        console.log("[Portal v" + PORTAL_VERSION + "] Sonido reproducido");
      } catch (e) {
        console.log("[Portal v" + PORTAL_VERSION + "] Error reproduciendo sonido:", e);
        // No propagar el error para evitar crash
      }
    }, 0);
  }, []);

  // Función para vibrar (Android) - v0.0.5 - defensiva para Xiaomi Android 12+
  const vibrar = useCallback(() => {
    // Ejecutar de forma asíncrona para no bloquear el renderizado
    setTimeout(() => {
      try {
        if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
          // Patrón de vibración más simple para mejor compatibilidad
          const result = navigator.vibrate([200, 100, 200]);
          console.log("[Portal v" + PORTAL_VERSION + "] Vibración:", result ? "OK" : "No soportado");
        }
      } catch (e) {
        console.log("[Portal v" + PORTAL_VERSION + "] Error vibrando:", e);
        // No propagar el error para evitar crash
      }
    }, 50); // Pequeño delay para dispositivos problemáticos
  }, []);

  // Usar formatRutStandard de utils para display (mismo formato estándar)
  const formatRutForDisplay = (value: string) => {
    return formatRutStandard(value);
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRutForDisplay(e.target.value);
    setRut(formatted);
  };

  const handleFormRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRutForDisplay(e.target.value);
    setFormData(prev => ({ ...prev, rut: formatted }));
  };

  const buscarPaciente = async () => {
    if (!rut.trim()) {
      toast({
        title: "Error",
        description: "Ingrese su RUT",
        variant: "destructive"
      });
      return;
    }

    // Convertir RUT al formato estándar para búsqueda
    const rutFormateado = formatRutStandard(rut);

    setIsLoading(true);
    try {
      // Buscar por RUT en formato estándar - usando limit(1) para evitar error de múltiples resultados
      const { data: pacientesData, error: pacienteError } = await supabase
        .from("pacientes")
        .select("*")
        .eq("rut", rutFormateado)
        .order("created_at", { ascending: false })
        .limit(1);

      if (pacienteError) throw pacienteError;
      
      // Tomar el primer resultado (el más reciente si hay duplicados)
      const pacienteData = pacientesData && pacientesData.length > 0 ? pacientesData[0] : null;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      if (pacienteData) {
        setPaciente(pacienteData);
        
        // Si el paciente tiene nombre "PENDIENTE DE REGISTRO", llevarlo al formulario
        // para que complete sus datos (caso: recargó la página antes de terminar)
        if (pacienteData.nombre === "PENDIENTE DE REGISTRO") {
          // Buscar su atención existente
          const { data: existingAtencion } = await supabase
            .from("atenciones")
            .select("*, boxes(*)")
            .eq("paciente_id", pacienteData.id)
            .gte("fecha_ingreso", startOfDay)
            .lte("fecha_ingreso", endOfDay)
            .order("fecha_ingreso", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingAtencion) {
            setAtencion({ ...existingAtencion, atencion_examenes: [] });
            toast({
              title: `Su número de atención es #${existingAtencion.numero_ingreso}`,
              description: "Por favor complete sus datos a continuación",
            });
          }

          // Ir a registro con el RUT ya establecido
          setFormData(prev => ({ ...prev, rut: rut }));
          setStep("registro");
          return;
        }
        
        // Misma query que Flujo - un solo select con joins
        const { data: existingAtencion } = await supabase
          .from("atenciones")
          .select("*, pacientes(id, nombre, rut, tipo_servicio), boxes(*)")
          .eq("paciente_id", pacienteData.id)
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay)
          .order("fecha_ingreso", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingAtencion) {
          // Cargar exámenes por separado
          const { data: examenesData } = await supabase
            .from("atencion_examenes")
            .select("id, examen_id, estado, examenes(id, nombre)")
            .eq("atencion_id", existingAtencion.id);

          const atencionCompleta: Atencion = {
            id: existingAtencion.id,
            estado: existingAtencion.estado,
            box_id: existingAtencion.box_id,
            numero_ingreso: existingAtencion.numero_ingreso,
            fecha_ingreso: existingAtencion.fecha_ingreso,
            boxes: existingAtencion.boxes,
            atencion_examenes: (examenesData || []).map((ae: any) => ({
              id: ae.id,
              examen_id: ae.examen_id,
              estado: ae.estado,
              examenes: ae.examenes
            }))
          };

          setAtencion(atencionCompleta);
          prevEstadoRef.current = existingAtencion.estado;
          prevBoxIdRef.current = existingAtencion.box_id;
          
          // Ya no cargamos empresa automáticamente - recepción la asigna manualmente
          // porque el paciente puede venir por diferentes empresas
          
          toast({
            title: "Bienvenido",
            description: `Su número de atención es #${existingAtencion.numero_ingreso}`,
          });
        } else {
          const { data: newAtencion, error: atencionError } = await supabase
            .from("atenciones")
            .insert({
              paciente_id: pacienteData.id,
              estado: "en_espera",
              fecha_ingreso: new Date().toISOString()
            })
            .select("*, boxes(*)")
            .single();

          if (atencionError) throw atencionError;

          setAtencion({
            ...newAtencion,
            atencion_examenes: []
          });
          prevEstadoRef.current = "en_espera";
          prevBoxIdRef.current = null;
          
          // Ya no cargamos empresa automáticamente - recepción la asigna manualmente
          // porque el paciente puede venir por diferentes empresas
          
          toast({
            title: "Registro de hoy",
            description: `Su número de atención es #${newAtencion.numero_ingreso}. Espere a que el recepcionista complete su registro.`,
          });
        }
        
        setStep("portal");
      } else {
        // NUEVO FLUJO: Crear paciente placeholder y atención inmediatamente
        // Esto garantiza que el paciente obtenga su número de atención antes de completar el registro
        const { data: newPaciente, error: createError } = await supabase
          .from("pacientes")
          .insert({
            nombre: "PENDIENTE DE REGISTRO",
            rut: rutFormateado,
            fecha_nacimiento: null,
            email: null,
            telefono: null,
            direccion: null,
            empresa_id: null,
            tipo_servicio: null
          })
          .select()
          .single();

        if (createError) throw createError;

        // Crear atención inmediatamente para obtener número de ingreso
        const { data: newAtencion, error: atencionError } = await supabase
          .from("atenciones")
          .insert({
            paciente_id: newPaciente.id,
            estado: "en_espera",
            fecha_ingreso: new Date().toISOString()
          })
          .select()
          .single();

        if (atencionError) throw atencionError;

        // Mostrar número de atención inmediatamente
        toast({
          title: `Su número de atención es #${newAtencion.numero_ingreso}`,
          description: "Por favor complete sus datos a continuación",
        });

        // Ir a registro con el RUT ya establecido y guardar referencias
        setFormData(prev => ({ ...prev, rut: rut }));
        setPaciente(newPaciente);
        setAtencion({ ...newAtencion, atencion_examenes: [], boxes: null });
        setStep("registro");
      }
    } catch (error: any) {
      console.error("Error buscando paciente:", error);
      toast({
        title: "Error",
        description: "No se pudo buscar el paciente",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validar email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validar que los 3 campos de nombre estén completos
  const isValidNombreCompleto = () => {
    return formData.primerNombre.trim().length > 0 && 
           formData.apellidoPaterno.trim().length > 0 && 
           formData.apellidoMaterno.trim().length > 0;
  };

  // Concatenar nombre completo
  const getNombreCompleto = () => {
    return `${formData.primerNombre.trim()} ${formData.apellidoPaterno.trim()} ${formData.apellidoMaterno.trim()}`.trim();
  };

  // Validar ciudad de Chile
  const isValidCiudad = (ciudad: string) => {
    return ciudadesChile.some(c => c.toLowerCase() === ciudad.toLowerCase().trim());
  };

  // Concatenar dirección completa
  const getDireccionCompleta = () => {
    return `${formData.calle.trim()} ${formData.numeracion.trim()} ${formData.ciudad.trim()}`.trim();
  };

  // Handler para campos de nombre - auto mayúsculas, sin espacios
  const handleNombreFieldChange = (field: 'primerNombre' | 'apellidoPaterno' | 'apellidoMaterno') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '').toUpperCase();
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handler para calle - auto mayúsculas
  const handleCalleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, calle: value }));
  };

  // Handler para ciudad con autocompletado
  const handleCiudadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, ciudad: value }));
    
    if (value.length >= 2) {
      const filtradas = ciudadesChile.filter(c => 
        c.toLowerCase().startsWith(value.toLowerCase())
      ).slice(0, 5);
      setCiudadSugerencias(filtradas);
      setShowCiudadSugerencias(filtradas.length > 0);
    } else {
      setCiudadSugerencias([]);
      setShowCiudadSugerencias(false);
    }
  };

  // Seleccionar ciudad de sugerencias
  const seleccionarCiudad = (ciudad: string) => {
    setFormData(prev => ({ ...prev, ciudad }));
    setShowCiudadSugerencias(false);
    setCiudadSugerencias([]);
  };

  // Handler para teléfono - solo 9 dígitos
  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 9);
    setFormData(prev => ({ ...prev, telefono: value }));
  };

  // Formatear teléfono para display (9 1234 5678)
  const formatTelefonoDisplay = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 1) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 1)} ${cleaned.slice(1)}`;
    return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 5)} ${cleaned.slice(5)}`;
  };

  // Handler para fecha manual (DD/MM/AAAA)
  const handleFechaNacimientoManual = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, "");
    
    // Auto-formatear con slashes
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2);
    }
    if (value.length >= 5) {
      value = value.slice(0, 5) + "/" + value.slice(5);
    }
    value = value.slice(0, 10); // Max DD/MM/AAAA
    
    setFormData(prev => ({ ...prev, fecha_nacimiento_display: value }));
    
    // Intentar parsear y guardar en formato ISO
    if (value.length === 10) {
      const parsed = parse(value, "dd/MM/yyyy", new Date());
      if (isValid(parsed) && parsed <= new Date()) {
        setFormData(prev => ({ ...prev, fecha_nacimiento: format(parsed, "yyyy-MM-dd") }));
      } else {
        setFormData(prev => ({ ...prev, fecha_nacimiento: "" }));
      }
    } else {
      setFormData(prev => ({ ...prev, fecha_nacimiento: "" }));
    }
  };

  // Handler para selección de calendario
  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        fecha_nacimiento: format(date, "yyyy-MM-dd"),
        fecha_nacimiento_display: format(date, "dd/MM/yyyy")
      }));
    }
  };

  const registrarPaciente = async () => {
    // Validaciones
    const errores: string[] = [];
    
    if (!formData.primerNombre.trim()) {
      errores.push("Nombre es obligatorio");
    }
    if (!formData.apellidoPaterno.trim()) {
      errores.push("Apellido paterno es obligatorio");
    }
    if (!formData.apellidoMaterno.trim()) {
      errores.push("Apellido materno es obligatorio");
    }
    
    if (!formData.rut.trim()) {
      errores.push("RUT es obligatorio");
    }
    
    if (!formData.fecha_nacimiento) {
      errores.push("Fecha de nacimiento es obligatoria");
    }
    
    if (!formData.email.trim()) {
      errores.push("Email es obligatorio");
    } else if (!isValidEmail(formData.email)) {
      errores.push("Email no tiene formato válido");
    }
    
    if (!formData.telefono) {
      errores.push("Teléfono es obligatorio");
    } else if (formData.telefono.length !== 9) {
      errores.push("El teléfono debe tener 9 dígitos");
    }
    
    if (!formData.calle.trim()) {
      errores.push("Calle es obligatoria");
    }
    if (!formData.numeracion.trim()) {
      errores.push("Numeración es obligatoria");
    }
    if (!formData.ciudad.trim()) {
      errores.push("Ciudad es obligatoria");
    } else if (!isValidCiudad(formData.ciudad)) {
      errores.push("Ingrese una ciudad válida de Chile");
    }

    if (errores.length > 0) {
      toast({
        title: "Campos incompletos",
        description: errores[0],
        variant: "destructive"
      });
      return;
    }

    const rutFormateado = formatRutStandard(formData.rut);
    const telefonoCompleto = `+56${formData.telefono}`;

    setIsLoading(true);
    try {
      // Si ya tenemos un paciente creado (nuevo flujo), actualizarlo
      if (paciente && paciente.nombre === "PENDIENTE DE REGISTRO") {
        // Usar update sin .single() para evitar error "Cannot coerce"
        const { error: updateError } = await supabase
          .from("pacientes")
          .update({
            nombre: getNombreCompleto(),
            rut: rutFormateado,
            fecha_nacimiento: formData.fecha_nacimiento,
            email: formData.email.trim().toLowerCase(),
            telefono: telefonoCompleto,
            direccion: getDireccionCompleta()
          })
          .eq("id", paciente.id);

        if (updateError) throw updateError;

        // Recuperar el paciente actualizado con select separado + limit(1)
        const { data: updatedPacientes, error: selectError } = await supabase
          .from("pacientes")
          .select("*")
          .eq("id", paciente.id)
          .limit(1);

        if (selectError) throw selectError;
        
        const updatedPaciente = updatedPacientes && updatedPacientes.length > 0 ? updatedPacientes[0] : null;
        
        if (!updatedPaciente) {
          throw new Error("No se pudo confirmar el guardado. Por favor reingrese su RUT.");
        }

        setPaciente(updatedPaciente);
        
        toast({
          title: "Registro completado",
          description: `Su número de atención es #${atencion?.numero_ingreso}. Espere a que el recepcionista complete su registro.`,
        });

        setStep("portal");
      } else {
        // Flujo antiguo: verificar si existe y crear nuevo (fallback)
        // Usar order + limit(1) en lugar de maybeSingle para evitar error con duplicados
        const { data: existingPacientes } = await supabase
          .from("pacientes")
          .select("id, nombre")
          .eq("rut", rutFormateado)
          .order("created_at", { ascending: false })
          .limit(1);

        const existingPaciente = existingPacientes && existingPacientes.length > 0 ? existingPacientes[0] : null;

        // Si existe un paciente con ese RUT que NO es placeholder, redirigir
        if (existingPaciente && existingPaciente.nombre !== "PENDIENTE DE REGISTRO") {
          toast({
            title: "RUT ya registrado",
            description: "Este RUT ya está registrado. Por favor identifíquese.",
            variant: "destructive"
          });
          setRut(formData.rut);
          setStep("identificacion");
          setIsLoading(false);
          return;
        }
        
        // Si existe un placeholder, actualizarlo en lugar de crear uno nuevo
        if (existingPaciente && existingPaciente.nombre === "PENDIENTE DE REGISTRO") {
          const { error: updateError } = await supabase
            .from("pacientes")
            .update({
              nombre: getNombreCompleto(),
              fecha_nacimiento: formData.fecha_nacimiento,
              email: formData.email.trim().toLowerCase(),
              telefono: telefonoCompleto,
              direccion: getDireccionCompleta()
            })
            .eq("id", existingPaciente.id);

          if (updateError) throw updateError;

          // Recuperar paciente actualizado
          const { data: updatedPacientes } = await supabase
            .from("pacientes")
            .select("*")
            .eq("id", existingPaciente.id)
            .limit(1);

          const updatedPaciente = updatedPacientes && updatedPacientes.length > 0 ? updatedPacientes[0] : null;
          
          if (!updatedPaciente) {
            throw new Error("No se pudo confirmar el guardado. Por favor reingrese su RUT.");
          }

          // Buscar atención existente del día
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

          const { data: existingAtenciones } = await supabase
            .from("atenciones")
            .select("*")
            .eq("paciente_id", existingPaciente.id)
            .gte("fecha_ingreso", startOfDay)
            .lte("fecha_ingreso", endOfDay)
            .order("fecha_ingreso", { ascending: false })
            .limit(1);

          const existingAtencion = existingAtenciones && existingAtenciones.length > 0 ? existingAtenciones[0] : null;

          if (existingAtencion) {
            setPaciente(updatedPaciente);
            setAtencion({ ...existingAtencion, atencion_examenes: [], boxes: null });
            prevEstadoRef.current = existingAtencion.estado;
            prevBoxIdRef.current = existingAtencion.box_id;
            
            toast({
              title: "Registro completado",
              description: `Su número de atención es #${existingAtencion.numero_ingreso}. Espere a que el recepcionista complete su registro.`,
            });

            setStep("portal");
            setIsLoading(false);
            return;
          }
        }

        const { data: newPaciente, error } = await supabase
          .from("pacientes")
          .insert({
            nombre: getNombreCompleto(),
            rut: rutFormateado,
            fecha_nacimiento: formData.fecha_nacimiento,
            email: formData.email.trim().toLowerCase(),
            telefono: telefonoCompleto,
            direccion: getDireccionCompleta(),
            empresa_id: null,
            tipo_servicio: null
          })
          .select()
          .single();

        if (error) throw error;

        const { data: newAtencion, error: atencionError } = await supabase
          .from("atenciones")
          .insert({
            paciente_id: newPaciente.id,
            estado: "en_espera",
            fecha_ingreso: new Date().toISOString()
          })
          .select()
          .single();

        if (atencionError) throw atencionError;

        setPaciente(newPaciente);
        setAtencion({ ...newAtencion, atencion_examenes: [], boxes: null });
        prevEstadoRef.current = "en_espera";
        prevBoxIdRef.current = null;
        
        toast({
          title: "Registro exitoso",
          description: `Su número de atención es #${newAtencion.numero_ingreso}. Espere a que el recepcionista complete su registro.`,
        });

        setStep("portal");
      }
    } catch (error: any) {
      console.error("Error registrando paciente:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el paciente",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const abrirTest = async (test: ExamenTest) => {
    setCurrentTest(test);
    setTestModalOpen(true);

    if (atencion) {
      try {
        await supabase
          .from("paciente_test_tracking" as any)
          .upsert({
            atencion_id: atencion.id,
            examen_test_id: test.id,
            abierto_at: new Date().toISOString()
          } as any, {
            onConflict: "atencion_id,examen_test_id"
          });

        setTestTracking(prev => {
          const exists = prev.find(t => t.examen_test_id === test.id);
          if (exists) return prev;
          return [...prev, { examen_test_id: test.id, abierto_at: new Date().toISOString(), completado: false }];
        });
      } catch (error) {
        console.error("Error tracking test:", error);
      }
    }
  };

  const cerrarTest = () => {
    setTestModalOpen(false);
    setCurrentTest(null);
  };

  // Mostrar notificación cuando el paciente es llamado - v0.0.5 defensiva
  const mostrarNotificacionLlamado = useCallback((boxName: string) => {
    console.log("[Portal v" + PORTAL_VERSION + "] Mostrando notificación para box:", boxName);

    // Primero mostrar el toast (lo más importante)
    let toastId: string | undefined;
    try {
      const result = toast({
        title: "¡ES SU TURNO!",
        description: `Diríjase al box: ${boxName}`,
        duration: 0, // Persistente hasta que el usuario cierre
        action: (
          <ToastAction
            altText="Entendido"
            onClick={() => {
              if (toastId) dismiss(toastId);
            }}
          >
            OK
          </ToastAction>
        ),
      });
      toastId = result.id;
    } catch (e) {
      console.error("[Portal v" + PORTAL_VERSION + "] Error mostrando toast:", e);
    }

    // Luego intentar sonido y vibración (en segundo plano, sin bloquear)
    reproducirSonido();
    vibrar();
  }, [toast, dismiss, reproducirSonido, vibrar]);

  // Polling con la MISMA lógica que Flujo
  useEffect(() => {
    if (!paciente?.id || step !== "portal") return;

    const cargarDatos = async () => {
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

        // Cargar boxes con sus exámenes (como Flujo)
        const { data: boxesData } = await supabase
          .from("boxes")
          .select("*, box_examenes(examen_id)")
          .eq("activo", true);
        
        // Solo actualizar boxes si hay cambios
        const boxesHash = JSON.stringify(boxesData || []);
        if (boxesHash !== prevBoxesHashRef.current) {
          prevBoxesHashRef.current = boxesHash;
          if (boxesData) {
            setBoxes(boxesData);
          }
        }

        // Query IDÉNTICA a Flujo - un solo select con join a boxes
        const { data: atencionData, error } = await supabase
          .from("atenciones")
          .select("*, pacientes(id, nombre, rut, tipo_servicio), boxes(*)")
          .eq("paciente_id", paciente.id)
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay)
          .order("fecha_ingreso", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[Portal] Error:", error);
          return;
        }

        if (!atencionData) return;

        // Obtener nombre del box directamente del join (como Flujo)
        const boxNombre = atencionData.boxes?.nombre || null;

        // Detectar si el paciente fue llamado (transición a en_atencion con box)
        const fueRecienLlamado = 
          atencionData.estado === "en_atencion" && 
          atencionData.box_id && 
          (prevEstadoRef.current !== "en_atencion" || prevBoxIdRef.current !== atencionData.box_id);

        // Actualizar refs ANTES de mostrar notificación
        prevEstadoRef.current = atencionData.estado;
        prevBoxIdRef.current = atencionData.box_id;

        // Cargar exámenes
        const { data: examenesData } = await supabase
          .from("atencion_examenes")
          .select("id, examen_id, estado, examenes(id, nombre)")
          .eq("atencion_id", atencionData.id);

        // Crear hash para comparar si hay cambios
        const dataHash = JSON.stringify({
          estado: atencionData.estado,
          box_id: atencionData.box_id,
          numero_ingreso: atencionData.numero_ingreso,
          boxNombre,
          examenes: examenesData
        });

        // Solo actualizar si hay cambios reales
        if (dataHash !== prevDataHashRef.current) {
          prevDataHashRef.current = dataHash;

          // Construir objeto de atención
          const atencionCompleta: Atencion = {
            id: atencionData.id,
            estado: atencionData.estado,
            box_id: atencionData.box_id,
            numero_ingreso: atencionData.numero_ingreso,
            fecha_ingreso: atencionData.fecha_ingreso,
            boxes: boxNombre ? { nombre: boxNombre } : null,
            atencion_examenes: (examenesData || []).map((ae: any) => ({
              id: ae.id,
              examen_id: ae.examen_id,
              estado: ae.estado,
              examenes: ae.examenes
            }))
          };

          setAtencion(atencionCompleta);

          // Calcular boxes pendientes (como Flujo)
          const examenesPendientesIds = (examenesData || [])
            .filter((ae: any) => ae.estado === "pendiente" || ae.estado === "incompleto")
            .map((ae: any) => ae.examen_id);

          const boxesPendientes = (boxesData || [])
            .filter(box => box.box_examenes.some((be: any) => examenesPendientesIds.includes(be.examen_id)))
            .map(box => box.nombre);
          
          setPendingBoxes(boxesPendientes);
        }

        // Mostrar notificación si fue llamado
        if (fueRecienLlamado && boxNombre) {
          mostrarNotificacionLlamado(boxNombre);
        }

        // Cargar empresa si no está cargada
        // Ya no cargamos empresa ni tipo_servicio automáticamente
        // Recepción los asigna manualmente porque el paciente puede venir por diferentes empresas

      } catch (error) {
        console.error("[Portal] Error en polling:", error);
      }
    };

    // Carga inicial
    cargarDatos();

    // Polling cada 3 segundos (igual que antes)
    const interval = setInterval(cargarDatos, 3000);

    return () => clearInterval(interval);
  }, [paciente?.id, step, mostrarNotificacionLlamado]);

  // Refrescar manual
  const refreshData = useCallback(async () => {
    if (!paciente?.id || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      const { data: atencionData } = await supabase
        .from("atenciones")
        .select("*, boxes(*)")
        .eq("paciente_id", paciente.id)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (atencionData) {
        const { data: examenesData } = await supabase
          .from("atencion_examenes")
          .select("id, examen_id, estado, examenes(id, nombre)")
          .eq("atencion_id", atencionData.id);

        setAtencion({
          id: atencionData.id,
          estado: atencionData.estado,
          box_id: atencionData.box_id,
          numero_ingreso: atencionData.numero_ingreso,
          fecha_ingreso: atencionData.fecha_ingreso,
          boxes: atencionData.boxes,
          atencion_examenes: (examenesData || []).map((ae: any) => ({
            id: ae.id,
            examen_id: ae.examen_id,
            estado: ae.estado,
            examenes: ae.examenes
          }))
        });
      }

      toast({
        title: "Actualizado",
        description: "Información actualizada correctamente",
      });
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [paciente?.id, isRefreshing, toast]);

  const isTestCompleted = (testId: string) => {
    return testTracking.some(t => t.examen_test_id === testId);
  };

  if (step === "identificacion") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: `url(${portalBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Portal del Paciente</CardTitle>
            <CardDescription>Ingrese su RUT para identificarse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                placeholder="12.345.678-9"
                value={rut}
                onChange={handleRutChange}
                onKeyDown={(e) => e.key === "Enter" && buscarPaciente()}
                className="text-lg"
              />
            </div>
            <Button 
              onClick={buscarPaciente} 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                "Ingresar"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "registro") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundImage: `url(${portalBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Registro de Paciente</CardTitle>
            <CardDescription>Complete sus datos para registrarse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primerNombre" className="text-sm font-medium mb-1.5 block">Nombre *</Label>
                <Input
                  id="primerNombre"
                  placeholder="JUAN"
                  value={formData.primerNombre}
                  onChange={handleNombreFieldChange('primerNombre')}
                  className="h-11 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="apellidoPaterno" className="text-sm font-medium mb-1.5 block">Apellido Paterno *</Label>
                <Input
                  id="apellidoPaterno"
                  placeholder="PÉREZ"
                  value={formData.apellidoPaterno}
                  onChange={handleNombreFieldChange('apellidoPaterno')}
                  className="h-11 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="apellidoMaterno" className="text-sm font-medium mb-1.5 block">Apellido Materno *</Label>
                <Input
                  id="apellidoMaterno"
                  placeholder="GONZÁLEZ"
                  value={formData.apellidoMaterno}
                  onChange={handleNombreFieldChange('apellidoMaterno')}
                  className="h-11 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="formRut" className="text-sm font-medium mb-1.5 block">RUT *</Label>
                <Input
                  id="formRut"
                  placeholder="12.345.678-9"
                  value={formData.rut}
                  onChange={handleFormRutChange}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="fecha_nacimiento" className="text-sm font-medium mb-1.5 block">Fecha de Nacimiento *</Label>
                <div className="flex gap-2">
                  <Input
                    id="fecha_nacimiento"
                    placeholder="DD/MM/AAAA"
                    value={formData.fecha_nacimiento_display}
                    onChange={handleFechaNacimientoManual}
                    className="h-11 flex-1"
                    maxLength={10}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={formData.fecha_nacimiento ? new Date(formData.fecha_nacimiento + "T12:00:00") : undefined}
                        onSelect={handleCalendarSelect}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="telefono" className="text-sm font-medium mb-1.5 block">Teléfono *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-2.5 rounded-md border h-11 flex items-center">+56</span>
                  <Input
                    id="telefono"
                    type="tel"
                    placeholder="9 1234 5678"
                    value={formatTelefonoDisplay(formData.telefono)}
                    onChange={handleTelefonoChange}
                    className="h-11 flex-1"
                    maxLength={13}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="calle" className="text-sm font-medium mb-1.5 block">Calle *</Label>
                <Input
                  id="calle"
                  placeholder="AV. PRINCIPAL"
                  value={formData.calle}
                  onChange={handleCalleChange}
                  className="h-11 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="numeracion" className="text-sm font-medium mb-1.5 block">Numeración *</Label>
                <Input
                  id="numeracion"
                  placeholder="123"
                  value={formData.numeracion}
                  onChange={(e) => setFormData(prev => ({ ...prev, numeracion: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div className="sm:col-span-2 relative">
                <Label htmlFor="ciudad" className="text-sm font-medium mb-1.5 block">Ciudad *</Label>
                <Input
                  id="ciudad"
                  placeholder="Santiago"
                  value={formData.ciudad}
                  onChange={handleCiudadChange}
                  onBlur={() => setTimeout(() => setShowCiudadSugerencias(false), 200)}
                  onFocus={() => {
                    if (ciudadSugerencias.length > 0) setShowCiudadSugerencias(true);
                  }}
                  className="h-11"
                />
                {showCiudadSugerencias && ciudadSugerencias.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg">
                    {ciudadSugerencias.map((ciudad, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
                        onMouseDown={() => seleccionarCiudad(ciudad)}
                      >
                        {ciudad}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Ingrese una ciudad de Chile</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setStep("identificacion")}
                className="flex-1 h-11"
              >
                Volver
              </Button>
              <Button 
                onClick={registrarPaciente} 
                className="flex-1 h-11" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Registrar"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Portal view
  return (
    <div className="min-h-screen p-4" style={{ backgroundImage: `url(${portalBackground})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>

      <div className="max-w-lg mx-auto space-y-4">
        {/* Patient Card - Similar to Flujo */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-bold text-lg">
                    #{atencion?.numero_ingreso || "--"}
                  </Badge>
                  <div className="font-medium text-lg text-foreground">
                    {paciente?.nombre}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span>{paciente?.rut}</span>
                  {atencion?.fecha_ingreso && (
                    <span>• Ingreso: {format(new Date(atencion.fecha_ingreso), "HH:mm", { locale: es })}</span>
                  )}
                  {paciente?.tipo_servicio && (
                    <Badge variant="outline" className="text-xs">
                      {paciente.tipo_servicio === "workmed" ? "WM" : "J"}
                    </Badge>
                  )}
                </div>

                {/* Empresa */}
                {empresa && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{empresa.nombre}</span>
                  </div>
                )}

                {/* Pending Boxes */}
                {pendingBoxes.length > 0 && (
                  <div className="text-sm text-primary mt-2 font-medium">
                    Boxes pendientes: {pendingBoxes.map(b => `Box ${b}`).join(", ")}
                  </div>
                )}

                {/* Exams grouped by box - Like Flujo */}
                {atencion && atencion.atencion_examenes.length > 0 && (
                  <Collapsible className="mt-3" defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:underline">
                      <ChevronDown className="h-4 w-4" />
                      <span className="font-medium">
                        Ver exámenes ({atencion.atencion_examenes.filter(ae => ae.estado === "pendiente" || ae.estado === "incompleto").length} pendientes)
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-3 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      {(() => {
                        const examenPorBox: { [boxNombre: string]: { nombre: string; estado: string }[] } = {};
                        
                        atencion.atencion_examenes.forEach((ae) => {
                          const boxConExamen = boxes.find((box) =>
                            box.box_examenes.some((be) => be.examen_id === ae.examen_id)
                          );
                          const boxNombre = boxConExamen?.nombre || "Sin box";
                          if (!examenPorBox[boxNombre]) {
                            examenPorBox[boxNombre] = [];
                          }
                          examenPorBox[boxNombre].push({ nombre: ae.examenes.nombre, estado: ae.estado });
                        });

                        return Object.entries(examenPorBox).map(([boxNombre, examenes]) => (
                          <div key={boxNombre} className="pl-3 border-l-2 border-primary/30">
                            <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                              {boxNombre}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {examenes.map((examen, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant={examen.estado === "completado" ? "default" : examen.estado === "incompleto" ? "outline" : "secondary"}
                                  className={`text-xs py-0.5 px-2 ${
                                    examen.estado === "completado" 
                                      ? "bg-green-600" 
                                      : examen.estado === "incompleto" 
                                        ? "border-amber-500 text-amber-600" 
                                        : ""
                                  }`}
                                >
                                  {examen.estado === "completado" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                  {examen.nombre}
                                  {examen.estado === "incompleto" ? " (I)" : ""}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ));
                      })()}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
              
              {/* Status Badge */}
              <div className="flex flex-col items-end gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshData}
                  disabled={isRefreshing}
                  title="Actualizar información"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                {atencion && (
                  <Badge 
                    variant={
                      atencion.estado === "completado" ? "default" :
                      atencion.estado === "en_atencion" ? "secondary" : "outline"
                    }
                    className={`text-xs ${
                      atencion.estado === "completado" ? "bg-green-600" :
                      atencion.estado === "en_atencion" ? "bg-blue-600 text-white" : 
                      atencion.estado === "incompleto" ? "bg-amber-500 text-white" : ""
                    }`}
                  >
                    {atencion.estado === "en_espera" && "En Espera"}
                    {atencion.estado === "en_atencion" && `En Box ${atencion.boxes?.nombre || ""}`}
                    {atencion.estado === "completado" && "Completado"}
                    {atencion.estado === "incompleto" && "Incompleto"}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* No company warning */}
            {!empresa && (
              <div className="mt-3 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Esperando asignación de empresa por recepción</span>
                </div>
              </div>
            )}

            {/* No exams warning */}
            {atencion && atencion.atencion_examenes.length === 0 && (
              <div className="mt-3 p-2 rounded bg-muted/50 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <FileText className="h-4 w-4" />
                  <span>Sus exámenes aparecerán aquí cuando estén asignados</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tests / Forms */}
        {examenTests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Formularios a Completar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {examenTests.map((test) => (
                <Button
                  key={test.id}
                  variant={isTestCompleted(test.id) ? "secondary" : "outline"}
                  className="w-full justify-between"
                  onClick={() => abrirTest(test)}
                >
                  <span>{test.nombre}</span>
                  {isTestCompleted(test.id) ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {!atencion && (
          <Card className="border-muted">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Esperando que recepción complete su registro</p>
              <p className="text-sm mt-2">Sus exámenes aparecerán aquí cuando estén asignados</p>
            </CardContent>
          </Card>
        )}

        {/* Back button */}
        <Button 
          variant="ghost" 
          className="w-full"
          onClick={() => {
            setPaciente(null);
            setAtencion(null);
            setEmpresa(null);
            setBoxes([]);
            setPendingBoxes([]);
            setRut("");
            setStep("identificacion");
          }}
        >
          Cambiar Paciente
        </Button>
      </div>

      {/* Test Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{currentTest?.nombre}</DialogTitle>
              <Button variant="ghost" size="icon" onClick={cerrarTest}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {currentTest && (
              <iframe
                src={currentTest.url}
                className="w-full h-full border-0"
                title={currentTest.nombre}
                allow="camera; microphone"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Indicador de versión - v0.0.5 */}
      <div className="fixed bottom-2 left-2 text-xs text-muted-foreground/50 select-none pointer-events-none">
        v{PORTAL_VERSION}
      </div>
    </div>
  );
}
