import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import portalBackground from "@/assets/portal-background.jpeg";
import { PORTAL_BEEP_DATA_URI } from "@/lib/portalNotificationSound";

// Portal Paciente v0.0.6 - Punto de referencia estable
// Fix Xiaomi Android 12+: usar <audio> data-uri (sin AudioContext)
const PORTAL_VERSION = "0.0.6";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Loader2, ExternalLink, CheckCircle2, Clock, Building2, FileText, AlertCircle, X, RefreshCw, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  
  // Form fields for new registration
  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    fecha_nacimiento: "",
    email: "",
    telefono: "",
    direccion: ""
  });

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
        // Xiaomi Android 12+: evitar WebAudio (causa pantalla blanca en algunos equipos)
        if (isXiaomiAndroid12Plus) {
          if (!notificationAudioRef.current) notificationAudioRef.current = new Audio(PORTAL_BEEP_DATA_URI);
          const a = notificationAudioRef.current;
          if (a) { a.muted = true; Promise.resolve(a.play()).then(() => { a.pause(); a.currentTime = 0; a.muted = false; audioUnlockedRef.current = true; console.log("[Portal] Audio <audio> desbloqueado (Xiaomi)"); }).catch((e) => console.log("[Portal] No se pudo desbloquear <audio>:", e)); }
          return;
        }
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
          const ctx = audioContextRef.current;
          const o = ctx.createOscillator(); const g = ctx.createGain(); g.gain.value = 0; o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.001);
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

  // Función para reproducir sonido de notificación (v0.0.6 - workaround Xiaomi Android 12+)
  const reproducirSonido = useCallback(() => {
    // Ejecutar de forma asíncrona para no bloquear el renderizado
    setTimeout(() => {
      try {
        if (isXiaomiAndroid12Plus) {
          if (!notificationAudioRef.current) notificationAudioRef.current = new Audio(PORTAL_BEEP_DATA_URI);
          const a = notificationAudioRef.current;
          if (!a) return;

          const playOnce = () => {
            try {
              a.pause();
              a.currentTime = 0;
              const p = a.play();
              if (p && typeof (p as any).catch === "function") (p as any).catch(() => {});
            } catch {
              // ignore
            }
          };

          playOnce();
          setTimeout(playOnce, 220);
          setTimeout(playOnce, 440);
          console.log("[Portal v" + PORTAL_VERSION + "] Sonido <audio> reproducido (Xiaomi)");
          return;
        }

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

  // Normalize RUT
  const normalizeRut = (value: string) => {
    return value.replace(/[^0-9kK]/g, "").toUpperCase();
  };

  const getRutVariants = (value: string): string[] => {
    const variants = new Set<string>();
    const cleaned = normalizeRut(value);

    if (!cleaned) return [];

    variants.add(cleaned);

    if (cleaned.length > 1) {
      const body = cleaned.slice(0, -1);
      const dv = cleaned.slice(-1);
      variants.add(`${body}-${dv}`);
      const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      variants.add(`${bodyWithDots}-${dv}`);
    }

    variants.add(value.trim());

    return Array.from(variants).filter(Boolean);
  };

  const formatRutForDisplay = (value: string) => {
    const cleaned = normalizeRut(value);
    
    if (cleaned.length > 1) {
      const body = cleaned.slice(0, -1);
      const dv = cleaned.slice(-1);
      const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return `${formattedBody}-${dv}`;
    }
    
    return cleaned;
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

    const rutVariants = getRutVariants(rut);

    setIsLoading(true);
    try {
      const { data: pacienteData, error: pacienteError } = await supabase
        .from("pacientes")
        .select("*")
        .in("rut", rutVariants)
        .maybeSingle();

      if (pacienteError) throw pacienteError;

      if (pacienteData) {
        setPaciente(pacienteData);
        
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

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
          
          if (pacienteData.empresa_id) {
            const { data: empresaData } = await supabase
              .from("empresas")
              .select("*")
              .eq("id", pacienteData.empresa_id)
              .single();
            
            if (empresaData) setEmpresa(empresaData);
          }
          
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
          
          if (pacienteData.empresa_id) {
            const { data: empresaData } = await supabase
              .from("empresas")
              .select("*")
              .eq("id", pacienteData.empresa_id)
              .single();
            
            if (empresaData) setEmpresa(empresaData);
          }
          
          toast({
            title: "Registro de hoy",
            description: `Su número de atención es #${newAtencion.numero_ingreso}. Espere a que el recepcionista complete su registro.`,
          });
        }
        
        setStep("portal");
      } else {
        setFormData(prev => ({ ...prev, rut: rut }));
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

  const registrarPaciente = async () => {
    if (!formData.nombre.trim() || !formData.rut.trim()) {
      toast({
        title: "Error",
        description: "Nombre y RUT son obligatorios",
        variant: "destructive"
      });
      return;
    }

    const rutVariants = getRutVariants(formData.rut);
    const rutNormalizado = normalizeRut(formData.rut);

    setIsLoading(true);
    try {
      const { data: existingPaciente } = await supabase
        .from("pacientes")
        .select("id")
        .in("rut", rutVariants)
        .maybeSingle();

      if (existingPaciente) {
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

      const { data: newPaciente, error } = await supabase
        .from("pacientes")
        .insert({
          nombre: formData.nombre.trim(),
          rut: rutNormalizado,
          fecha_nacimiento: formData.fecha_nacimiento || null,
          email: formData.email.trim() || null,
          telefono: formData.telefono.trim() || null,
          direccion: formData.direccion.trim() || null,
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
        if (!empresa) {
          const { data: pacienteData } = await supabase
            .from("pacientes")
            .select("empresa_id, tipo_servicio")
            .eq("id", paciente.id)
            .single();

          if (pacienteData) {
            // Actualizar tipo_servicio del paciente
            setPaciente(prev => prev ? { ...prev, tipo_servicio: pacienteData.tipo_servicio } : null);
            
            if (pacienteData.empresa_id) {
              const { data: empresaData } = await supabase
                .from("empresas")
                .select("id, nombre")
                .eq("id", pacienteData.empresa_id)
                .single();
              if (empresaData) setEmpresa(empresaData);
            }
          }
        }

      } catch (error) {
        console.error("[Portal] Error en polling:", error);
      }
    };

    // Carga inicial
    cargarDatos();

    // Polling cada 3 segundos (igual que antes)
    const interval = setInterval(cargarDatos, 3000);

    return () => clearInterval(interval);
  }, [paciente?.id, step, mostrarNotificacionLlamado, empresa]);

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
              <div className="sm:col-span-2">
                <Label htmlFor="nombre" className="text-sm font-medium mb-1.5 block">Nombre Completo *</Label>
                <Input
                  id="nombre"
                  placeholder="Juan Pérez González"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className="h-11"
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
                <Label htmlFor="fecha_nacimiento" className="text-sm font-medium mb-1.5 block">Fecha de Nacimiento</Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={formData.fecha_nacimiento}
                  onChange={(e) => setFormData(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-sm font-medium mb-1.5 block">Email</Label>
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
                <Label htmlFor="telefono" className="text-sm font-medium mb-1.5 block">Teléfono</Label>
                <Input
                  id="telefono"
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="direccion" className="text-sm font-medium mb-1.5 block">Dirección</Label>
                <Input
                  id="direccion"
                  placeholder="Av. Principal 123, Comuna"
                  value={formData.direccion}
                  onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                  className="h-11"
                />
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

      {/* Indicador de versión - v0.0.6 */}
      <div className="fixed bottom-2 left-2 text-xs text-muted-foreground/50 select-none pointer-events-none">
        v{PORTAL_VERSION}
      </div>
    </div>
  );
}
