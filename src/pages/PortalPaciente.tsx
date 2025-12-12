import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, Phone, Globe } from "lucide-react";
import jennerLogo from "@/assets/jenner-logo-horizontal.jpg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Bell, ExternalLink, CheckCircle2, Clock, Building2, FileText, AlertCircle, X, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// CRITICAL FOR iOS: Create Audio object at module level (outside React component)
// This ensures the same instance is used and can be properly "unlocked" by user gesture
const notificationSound = new Audio();
// Use a data URI for a short beep sound (base64 encoded WAV)
notificationSound.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleT4HHBER4Pt/BwAKDhUfKD1UVVZSRDU9QUVHSE9VWV1eXWBiaGpsaGVgW1xeYWNnaGhoZ2RjYGBgYGBfXl5dXFxbW1pYV1ZVVFRTUlFQT05NTEtKSUhHRkVEQ0JBQD8+PTw7Ojk4NzY1NDMyMTAvLi0sKyopKCcmJSQjIiEgHx4dHBsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQD//v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb2tnY19bV1NPS0dDPzs3My8rJyMfGxcTDwsHAv769vLu6ubm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIOCgYB/fn18e3p5eHd2dXRzcnFwb25tbGtqaWhnZmVkY2JhYF9eXVxbWllYV1ZVVFNSUVBPTk1MS0pJSEdGRURDQkFAPz49PDs6OTg3NjU0MzIxMC8uLSwrKikoJyYlJCMiISAfHh0cGxoZGBcWFRQTEhEQDw4NDAsKCQgHBgUEAwIBAP/+/fz7+vn49/b19PPy8fDv7u3s6+rp6Ofm5eTj4uHg397d3Nva2djX1tXU09LR0M/OzczLysnIx8bFxMPCwcC/vr28u7q5uLe2tbSzsrGwr66trKuqqainpqWko6KhoJ+enZybmpmYl5aVlJOSkZCPjo2Mi4qJiIeGhYSDgoGAf359fHt6eXh3dnV0c3JxcG9ubWxramloZ2ZlZGNiYWBfXl1cW1pZWFdWVVRTUlFQT05NTEtKSUhHRkVEQ0JBQD8+PTw7Ojk4NzY1NDMyMTAvLi0sKyopKCcmJSQjIiEgHx4dHBsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQA=";
notificationSound.volume = 0.7;
notificationSound.load();

// Track if audio has been unlocked (prevents adding listeners multiple times)
let audioUnlocked = false;

// Function to unlock audio for iOS - will be called once on first user interaction
const unlockAudioForIOS = () => {
  if (audioUnlocked) return;
  
  notificationSound.play().then(() => {
    notificationSound.pause();
    notificationSound.currentTime = 0;
    audioUnlocked = true;
    console.log("iOS Audio desbloqueado exitosamente");
  }).catch(err => {
    console.log("Error al desbloquear audio iOS:", err);
  });

  // IMPORTANT: Remove listeners after first unlock to prevent re-execution
  window.removeEventListener('click', unlockAudioForIOS);
  window.removeEventListener('touchstart', unlockAudioForIOS);
};

// Listen for both click AND touchstart (touchstart is CRITICAL for iOS)
window.addEventListener('click', unlockAudioForIOS);
window.addEventListener('touchstart', unlockAudioForIOS);

interface Paciente {
  id: string;
  nombre: string;
  rut: string | null;
  fecha_nacimiento: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
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

// Footer component with Jenner contact info
const JennerFooter = () => (
  <footer className="w-full py-6 px-4 mt-auto">
    <div className="max-w-lg mx-auto text-center space-y-4">
      {/* Logo and slogan */}
      <div className="space-y-1">
        <h3 className="text-xl font-bold">
          <span className="text-[#00B5AD]">jenner</span>
        </h3>
        <p className="text-sm text-muted-foreground">centro médico</p>
        <p className="text-xs text-[#00B5AD] italic">Siempre cuidando de ti</p>
      </div>
      
      {/* Contact info */}
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4 text-[#00B5AD]" />
          <span>Av. Salvador Allende Gossens 3432, Iquique, Chile</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Phone className="h-4 w-4 text-[#00B5AD]" />
          <a href="tel:+56572262775" className="hover:text-[#00B5AD]">+56 57 226 2775</a>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Globe className="h-4 w-4 text-[#00B5AD]" />
          <a href="https://www.centrojenner.cl" target="_blank" rel="noopener noreferrer" className="hover:text-[#00B5AD]">
            www.centrojenner.cl
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default function PortalPaciente() {
  const [step, setStep] = useState<"identificacion" | "registro" | "portal">("identificacion");
  const [rut, setRut] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [atencion, setAtencion] = useState<Atencion | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [examenTests, setExamenTests] = useState<ExamenTest[]>([]);
  const [testTracking, setTestTracking] = useState<TestTracking[]>([]);
  const [llamadoActivo, setLlamadoActivo] = useState(false);
  const [boxLlamado, setBoxLlamado] = useState<string | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [currentTest, setCurrentTest] = useState<ExamenTest | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [notificationInterval, setNotificationInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastNotificationBox, setLastNotificationBox] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Ref to AudioContext for Web Audio API fallback
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Form fields for new registration or update
  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    fecha_nacimiento: "",
    email: "",
    telefono: "",
    direccion: ""
  });
  
  // Track if we're updating an existing patient (vs creating new)
  const [existingPatientId, setExistingPatientId] = useState<string | null>(null);

  // Function to play notification sound using Web Audio API - SHORT beeps
  const playNotificationSound = useCallback(() => {
    try {
      // Use existing or create new AudioContext
      const ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (!audioContext) setAudioContext(ctx);
      
      // Resume context if suspended (required on mobile)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      // Create a short attention beep
      const playBeep = (startTime: number, frequency: number) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = "sine";
        
        // Shorter beep - 0.15 seconds
        gainNode.gain.setValueAtTime(0.7, ctx.currentTime + startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + 0.15);
        
        oscillator.start(ctx.currentTime + startTime);
        oscillator.stop(ctx.currentTime + startTime + 0.15);
      };

      // Play 2 quick ascending beeps (total ~0.4 seconds)
      playBeep(0, 800);
      playBeep(0.2, 1200);
      
      console.log("Sound played successfully via AudioContext");
      return true;
    } catch (error) {
      console.error("Error playing sound:", error);
      return false;
    }
  }, [audioContext]);

  // Function to vibrate device
  const vibrateDevice = useCallback(() => {
    try {
      if ("vibrate" in navigator) {
        // Pattern: vibrate 500ms, pause 200ms, repeat 3 times
        navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
        console.log("Vibration triggered");
        return true;
      }
    } catch (error) {
      console.error("Error vibrating:", error);
    }
    return false;
  }, []);

  // Enable audio on first user interaction - CRITICAL for mobile
  // This must be called from a user gesture (click/tap) to unlock audio on iOS/Android
  const enableAudio = useCallback(() => {
    if (!audioEnabled) {
      try {
        // Create AudioContext and play a silent sound to unlock audio on iOS/Safari
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
        audioContextRef.current = ctx;
        
        // Create and play a silent buffer to unlock audio
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        
        // Also play a quick test beep so user knows audio works
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = 440;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
        
        // CRITICAL FOR iOS: Use the global notificationSound and unlock it
        // This must happen within a user gesture handler
        notificationSound.play().then(() => {
          notificationSound.pause();
          notificationSound.currentTime = 0;
          console.log("iOS: Global Audio element unlocked via enableAudio");
        }).catch(err => {
          console.log("Could not unlock global audio:", err);
        });
        
        setAudioEnabled(true);
        console.log("Audio enabled successfully");
        
        // Test vibration too
        if ("vibrate" in navigator) {
          navigator.vibrate(100);
        }
      } catch (error) {
        console.error("Error enabling audio:", error);
      }
    }
  }, [audioEnabled]);

  // Play notification using both AudioContext and the global Audio element for iOS compatibility
  const playMobileNotification = useCallback(() => {
    // Try AudioContext first (Web Audio API)
    playNotificationSound();
    
    // CRITICAL FOR iOS: Also play the global audio element
    // This element was "unlocked" on first user interaction (touchstart/click)
    notificationSound.currentTime = 0;
    notificationSound.play().catch(err => {
      console.log("Global audio play failed:", err);
    });
  }, [playNotificationSound]);

  // Normalize RUT: remove all dots, dashes, spaces and convert to uppercase
  // Always uses: 12345678K (no dots, no dash, uppercase)
  const normalizeRut = (value: string) => {
    return value.replace(/[^0-9kK]/g, "").toUpperCase();
  };

  // Given ANY input, generate all possible stored variants we want to match
  // - normalized: 12345678K
  // - with dash: 12345678-K
  // - with dots + dash: 12.345.678-K
  const getRutVariants = (value: string): string[] => {
    const variants = new Set<string>();
    const cleaned = normalizeRut(value);

    if (!cleaned) return [];

    // 1) Normalizado sin puntos ni guion
    variants.add(cleaned);

    if (cleaned.length > 1) {
      const body = cleaned.slice(0, -1);
      const dv = cleaned.slice(-1);

      // 2) Solo guion
      variants.add(`${body}-${dv}`);

      // 3) Puntos + guion
      const bodyWithDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      variants.add(`${bodyWithDots}-${dv}`);
    }

    // 4) También agregar el valor tal como lo escribió el usuario (por compatibilidad)
    variants.add(value.trim());

    return Array.from(variants).filter(Boolean);
  };

  // Format RUT for display (with dots and dash)
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
    // Store normalized version but display formatted
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

    // Generar todas las variantes posibles para la búsqueda (compatibilidad hacia atrás)
    const rutVariants = getRutVariants(rut);

    setIsLoading(true);
    try {
      // Search for patient by any RUT variant
      const { data: pacienteData, error: pacienteError } = await supabase
        .from("pacientes")
        .select("*")
        .in("rut", rutVariants)
        .maybeSingle();

      if (pacienteError) throw pacienteError;

      if (pacienteData) {
        setPaciente(pacienteData);
        
        // Check if patient already has an attention for today
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

        const { data: existingAtencion } = await supabase
          .from("atenciones")
          .select(`
            *,
            boxes(nombre),
            atencion_examenes(*, examenes(*))
          `)
          .eq("paciente_id", pacienteData.id)
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay)
          .order("fecha_ingreso", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingAtencion) {
          // Patient already has attention for today, use it
          setAtencion(existingAtencion);
          
          // Load empresa if patient has one
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
          // Patient exists but no attention for today
          // Pre-fill form with existing data and let them update if needed
          setFormData({
            nombre: pacienteData.nombre || "",
            rut: formatRutForDisplay(pacienteData.rut || ""),
            fecha_nacimiento: pacienteData.fecha_nacimiento || "",
            email: pacienteData.email || "",
            telefono: pacienteData.telefono || "",
            direccion: pacienteData.direccion || ""
          });
          setExistingPatientId(pacienteData.id);
          
          toast({
            title: "Bienvenido de vuelta",
            description: "Verifique sus datos y actualice si es necesario",
          });
          
          setStep("registro");
        }
      } else {
        // Patient not found, go to registration with empty form
        setFormData({
          nombre: "",
          rut: rut,
          fecha_nacimiento: "",
          email: "",
          telefono: "",
          direccion: ""
        });
        setExistingPatientId(null);
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

  const cargarDatosPaciente = async (pacienteId: string) => {
    try {
      // Get today's attention
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data: atencionData, error: atencionError } = await supabase
        .from("atenciones")
        .select(`
          *,
          boxes(nombre),
          atencion_examenes(*, examenes(*))
        `)
        .eq("paciente_id", pacienteId)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (atencionError) throw atencionError;

      if (atencionData) {
        setAtencion(atencionData);
        
        // Load empresa if paciente has one
        const { data: pacienteCompleto } = await supabase
          .from("pacientes")
          .select("empresa_id")
          .eq("id", pacienteId)
          .single();

        if (pacienteCompleto?.empresa_id) {
          const { data: empresaData } = await supabase
            .from("empresas")
            .select("*")
            .eq("id", pacienteCompleto.empresa_id)
            .single();
          
          if (empresaData) setEmpresa(empresaData);
        }

        // Load tests for assigned exams
        const examenIds = atencionData.atencion_examenes.map((ae: AtencionExamen) => ae.examen_id);
        if (examenIds.length > 0) {
          const { data: testsData } = await supabase
            .from("examen_tests" as any)
            .select("*")
            .in("examen_id", examenIds)
            .eq("activo", true)
            .order("orden") as { data: ExamenTest[] | null };

          if (testsData) setExamenTests(testsData);

          // Load tracking
          const { data: trackingData } = await supabase
            .from("paciente_test_tracking" as any)
            .select("*")
            .eq("atencion_id", atencionData.id) as { data: TestTracking[] | null };

          if (trackingData) setTestTracking(trackingData);
        }
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
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

    // Normalize RUT for storage
    const rutNormalizado = normalizeRut(formData.rut);

    setIsLoading(true);
    try {
      let pacienteId: string;
      let pacienteData: Paciente;

      if (existingPatientId) {
        // UPDATE existing patient with new data
        const { data: updatedPaciente, error: updateError } = await supabase
          .from("pacientes")
          .update({
            nombre: formData.nombre.trim(),
            fecha_nacimiento: formData.fecha_nacimiento || null,
            email: formData.email.trim() || null,
            telefono: formData.telefono.trim() || null,
            direccion: formData.direccion.trim() || null
            // Note: We don't update RUT as it's the identifier
          })
          .eq("id", existingPatientId)
          .select()
          .single();

        if (updateError) throw updateError;

        pacienteId = existingPatientId;
        pacienteData = updatedPaciente;

        toast({
          title: "Datos actualizados",
          description: "Su información ha sido actualizada correctamente",
        });
      } else {
        // Check if RUT already exists (should not happen but safety check)
        const rutVariants = getRutVariants(formData.rut);
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

        // Create new patient
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

        pacienteId = newPaciente.id;
        pacienteData = newPaciente;
      }

      // Create atencion to get numero_ingreso
      const { data: newAtencion, error: atencionError } = await supabase
        .from("atenciones")
        .insert({
          paciente_id: pacienteId,
          estado: "en_espera",
          fecha_ingreso: new Date().toISOString()
        })
        .select()
        .single();

      if (atencionError) throw atencionError;

      setPaciente(pacienteData);
      setAtencion({ ...newAtencion, atencion_examenes: [] });
      setExistingPatientId(null);
      
      toast({
        title: existingPatientId ? "Bienvenido de vuelta" : "Registro exitoso",
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

    // Track that the test was opened
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

        // Update local tracking
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

  // Function to trigger notification (sound + vibrate)
  const triggerNotification = useCallback((boxName: string) => {
    console.log("Triggering notification for box:", boxName);
    setBoxLlamado(boxName);
    setLlamadoActivo(true);
    setLastNotificationBox(boxName);
    
    // Play notification sound and vibrate immediately - use mobile-compatible function
    vibrateDevice();
    playMobileNotification();
    
    // Repeat only 2 more times (total 3), every 1.5 seconds
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (count >= 2) {
        clearInterval(interval);
        setNotificationInterval(null);
        return;
      }
      vibrateDevice();
      playMobileNotification();
    }, 1500);
    
    setNotificationInterval(interval);
  }, [vibrateDevice, playMobileNotification]);

  // Stop notification when user acknowledges
  const stopNotification = useCallback(() => {
    setLlamadoActivo(false);
    if (notificationInterval) {
      clearInterval(notificationInterval);
      setNotificationInterval(null);
    }
    // Stop vibration
    if ("vibrate" in navigator) {
      navigator.vibrate(0);
    }
  }, [notificationInterval]);

  // Listen for real-time updates when patient is called
  useEffect(() => {
    if (!paciente?.id) return;

    const channel = supabase
      .channel("atencion-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "atenciones",
          filter: `paciente_id=eq.${paciente.id}`
        },
        async (payload) => {
          const newAtencion = payload.new as any;
          
          // Check if patient was just called to a box
          if (newAtencion.estado === "en_atencion" && newAtencion.box_id && atencion?.estado !== "en_atencion") {
            // Get box name
            const { data: boxData } = await supabase
              .from("boxes")
              .select("nombre")
              .eq("id", newAtencion.box_id)
              .single();

            if (boxData) {
              triggerNotification(boxData.nombre);
            }
          }

          // Update atencion state
          await cargarDatosPaciente(paciente.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paciente?.id, atencion?.estado, triggerNotification]);

  // Polling fallback for mobile (realtime may not work when app is in background)
  // Check every 3 seconds if the patient was called
  useEffect(() => {
    if (!paciente?.id || step !== "portal") return;

    const checkForCall = async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      const { data: atencionData } = await supabase
        .from("atenciones")
        .select("*, boxes(nombre)")
        .eq("paciente_id", paciente.id)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (atencionData) {
        // If patient was called to a box and we haven't shown the notification yet
        if (
          atencionData.estado === "en_atencion" && 
          atencionData.box_id && 
          atencionData.boxes?.nombre &&
          atencion?.estado !== "en_atencion" &&
          !llamadoActivo &&
          atencionData.boxes.nombre !== lastNotificationBox
        ) {
          triggerNotification(atencionData.boxes.nombre);
        }

        // Update local state
        setAtencion({
          ...atencionData,
          atencion_examenes: atencion?.atencion_examenes || []
        });
      }
    };

    // Check immediately and then every 3 seconds
    checkForCall();
    const interval = setInterval(checkForCall, 3000);

    return () => clearInterval(interval);
  }, [paciente?.id, step, atencion?.estado, llamadoActivo, lastNotificationBox, triggerNotification]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    if (!paciente?.id || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await cargarDatosPaciente(paciente.id);
      toast({
        title: "Actualizado",
        description: "Información actualizada correctamente",
      });
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [paciente?.id, isRefreshing]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!paciente?.id || step !== "portal") return;

    const interval = setInterval(() => {
      cargarDatosPaciente(paciente.id);
    }, 10000);

    return () => clearInterval(interval);
  }, [paciente?.id, step]);

  const isTestCompleted = (testId: string) => {
    return testTracking.some(t => t.examen_test_id === testId);
  };

  if (step === "identificacion") {
    return (
      <div className="min-h-screen bg-white flex flex-col p-4 relative overflow-hidden">
        {/* Decorative figure-8 curves - top left */}
        <svg className="absolute top-0 left-0 w-32 h-64 pointer-events-none" viewBox="0 0 120 250">
          {/* Navy blue curved lines - figure 8 pattern */}
          <path d="M-10,0 Q40,60 -10,120 Q40,180 -10,240" fill="none" stroke="#003B5C" strokeWidth="6" strokeLinecap="round"/>
          <path d="M2,0 Q52,60 2,120 Q52,180 2,240" fill="none" stroke="#003B5C" strokeWidth="6" strokeLinecap="round"/>
          <path d="M14,0 Q64,60 14,120 Q64,180 14,240" fill="none" stroke="#003B5C" strokeWidth="6" strokeLinecap="round"/>
          {/* Teal curved lines */}
          <path d="M26,0 Q76,60 26,120 Q76,180 26,240" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
          <path d="M36,0 Q86,60 36,120 Q86,180 36,240" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
        </svg>
        
        {/* Decorative figure-8 curves - top right */}
        <svg className="absolute top-0 right-0 w-32 h-64 pointer-events-none" viewBox="0 0 120 250">
          {/* Teal curved lines */}
          <path d="M130,0 Q80,60 130,120 Q80,180 130,240" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
          <path d="M118,0 Q68,60 118,120 Q68,180 118,240" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
          {/* Navy blue curved lines - figure 8 pattern */}
          <path d="M106,0 Q56,60 106,120 Q56,180 106,240" fill="none" stroke="#003B5C" strokeWidth="6" strokeLinecap="round"/>
          <path d="M94,0 Q44,60 94,120 Q44,180 94,240" fill="none" stroke="#003B5C" strokeWidth="6" strokeLinecap="round"/>
          <path d="M84,0 Q34,60 84,120 Q34,180 84,240" fill="none" stroke="#003B5C" strokeWidth="6" strokeLinecap="round"/>
        </svg>
        
        {/* Decorative serpentine curves - bottom left */}
        <svg className="absolute bottom-0 left-0 w-48 h-40 pointer-events-none" viewBox="0 0 180 150">
          {/* Teal serpentine waves */}
          <path d="M-20,150 C20,150 20,120 60,120 C100,120 100,90 140,90 C180,90 180,60 220,60" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
          <path d="M-20,138 C20,138 20,108 60,108 C100,108 100,78 140,78 C180,78 180,48 220,48" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
          <path d="M-20,126 C20,126 20,96 60,96 C100,96 100,66 140,66 C180,66 180,36 220,36" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
          <path d="M-20,114 C20,114 20,84 60,84 C100,84 100,54 140,54 C180,54 180,24 220,24" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
        </svg>
        
        {/* Decorative serpentine curves - bottom right */}
        <svg className="absolute bottom-0 right-0 w-48 h-40 pointer-events-none" viewBox="0 0 180 150">
          {/* Teal serpentine waves - mirrored */}
          <path d="M200,150 C160,150 160,120 120,120 C80,120 80,90 40,90 C0,90 0,60 -40,60" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
          <path d="M200,138 C160,138 160,108 120,108 C80,108 80,78 40,78 C0,78 0,48 -40,48" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
          <path d="M200,126 C160,126 160,96 120,96 C80,96 80,66 40,66 C0,66 0,36 -40,36" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
          <path d="M200,114 C160,114 160,84 120,84 C80,84 80,54 40,54 C0,54 0,24 -40,24" fill="none" stroke="#00B5AD" strokeWidth="5" strokeLinecap="round"/>
        </svg>
        
        <div className="flex-1 flex flex-col items-center justify-center gap-6 relative z-10 px-12">
          {/* Jenner Logo */}
          <div className="w-full max-w-[280px]">
            <img 
              src={jennerLogo} 
              alt="Jenner Centro Médico" 
              className="w-full h-auto object-contain"
            />
          </div>
          
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-[#003B5C]">Portal del Paciente</CardTitle>
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
                onClick={() => {
                  enableAudio();
                  buscarPaciente();
                }} 
                className="w-full bg-[#00B5AD] hover:bg-[#009990]" 
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
        <JennerFooter />
      </div>
    );
  }

  if (step === "registro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col p-4">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold">
                {existingPatientId ? "Confirmar Datos" : "Registro de Paciente"}
              </CardTitle>
              <CardDescription>
                {existingPatientId 
                  ? "Verifique y actualice sus datos si es necesario" 
                  : "Complete sus datos para registrarse"}
              </CardDescription>
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
                    disabled={!!existingPatientId}
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
                  onClick={() => {
                    enableAudio();
                    registrarPaciente();
                  }} 
                  className="flex-1 h-11" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {existingPatientId ? "Confirmando..." : "Registrando..."}
                    </>
                  ) : (
                    existingPatientId ? "Confirmar y Continuar" : "Registrar"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <JennerFooter />
      </div>
    );
  }

  // Portal view
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      {/* Notification overlay when called - FULL SCREEN with blinking effect */}
      {llamadoActivo && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            animation: 'blink-bg 0.8s ease-in-out infinite'
          }}
        >
          <style>
            {`
              @keyframes blink-bg {
                0%, 100% { 
                  background: linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(142, 76%, 28%) 100%);
                }
                50% { 
                  background: linear-gradient(135deg, hsl(142, 76%, 50%) 0%, hsl(142, 76%, 40%) 100%);
                }
              }
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
              }
              @keyframes ring-bell {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-20deg); }
                75% { transform: rotate(20deg); }
              }
              @keyframes pulse-box {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
            `}
          </style>
          <div className="text-center text-white p-8 w-full max-w-md">
            <div 
              className="mb-6"
              style={{ animation: 'ring-bell 0.5s ease-in-out infinite' }}
            >
              <Bell className="h-24 w-24 mx-auto drop-shadow-2xl" />
            </div>
            <h1 
              className="text-4xl font-black mb-4 drop-shadow-lg"
              style={{ animation: 'shake 0.5s ease-in-out infinite' }}
            >
              ¡ES SU TURNO!
            </h1>
            <p className="text-2xl mb-4 font-medium opacity-90">Diríjase a</p>
            <div 
              className="bg-white/30 backdrop-blur rounded-3xl p-6 mb-6 shadow-2xl border-4 border-white/50"
              style={{ animation: 'pulse-box 1s ease-in-out infinite' }}
            >
              <p className="text-5xl font-black drop-shadow-md">{boxLlamado}</p>
            </div>
            <Button 
              variant="secondary" 
              size="lg" 
              className="text-xl px-12 py-6 h-auto font-bold shadow-xl bg-white text-green-700 hover:bg-white/90"
              onClick={() => {
                enableAudio(); // Re-enable audio on user interaction
                stopNotification();
              }}
            >
              ✓ Entendido
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto space-y-4">
        {/* Audio permission banner */}
        {!audioEnabled && (
          <Card className="border-amber-500 bg-amber-500/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Bell className="h-5 w-5" />
                  <span className="text-sm font-medium">Active las notificaciones</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="border-amber-500 text-amber-700 hover:bg-amber-500/20"
                  onClick={() => {
                    enableAudio();
                    toast({
                      title: "Notificaciones activadas",
                      description: "Recibirá sonido y vibración cuando lo llamen",
                    });
                  }}
                >
                  Activar Sonido
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{paciente?.nombre}</h1>
                <p className="text-muted-foreground">{paciente?.rut}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    enableAudio(); // Also enable audio on any user interaction
                    refreshData();
                  }}
                  disabled={isRefreshing}
                  title="Actualizar información"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                {atencion?.numero_ingreso && (
                  <Badge variant="secondary" className="text-2xl px-4 py-2">
                    #{atencion.numero_ingreso}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company info */}
        {empresa ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-medium">{empresa.nombre}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
                <p>Esperando asignación de empresa por recepción</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status */}
        {atencion && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge 
                    variant={
                      atencion.estado === "completado" ? "default" :
                      atencion.estado === "en_atencion" ? "secondary" : "outline"
                    }
                    className={
                      atencion.estado === "completado" ? "bg-green-600" :
                      atencion.estado === "en_atencion" ? "bg-blue-600 text-white" : ""
                    }
                  >
                    {atencion.estado === "en_espera" && "En Espera"}
                    {atencion.estado === "en_atencion" && `En Atención - ${atencion.boxes?.nombre || ""}`}
                    {atencion.estado === "completado" && "Completado"}
                    {atencion.estado === "incompleto" && "Incompleto"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exams */}
        {atencion && atencion.atencion_examenes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Exámenes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {atencion.atencion_examenes.map((ae) => (
                <div 
                  key={ae.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <span>{ae.examenes.nombre}</span>
                  {ae.estado === "completado" ? (
                    <Badge className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completado
                    </Badge>
                  ) : ae.estado === "incompleto" ? (
                    <Badge variant="secondary" className="bg-amber-500 text-white">
                      Incompleto
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pendiente</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
            setRut("");
            setStep("identificacion");
          }}
        >
          Cambiar Paciente
        </Button>
        
        <JennerFooter />
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
    </div>
  );
}
