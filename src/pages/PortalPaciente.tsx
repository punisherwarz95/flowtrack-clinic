import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Loader2, ExternalLink, CheckCircle2, Clock, Building2, FileText, AlertCircle, X, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export default function PortalPaciente() {
  const [step, setStep] = useState<"identificacion" | "registro" | "portal">("identificacion");
  const [rut, setRut] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [atencion, setAtencion] = useState<Atencion | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [examenTests, setExamenTests] = useState<ExamenTest[]>([]);
  const [testTracking, setTestTracking] = useState<TestTracking[]>([]);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [currentTest, setCurrentTest] = useState<ExamenTest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [boxNombreManual, setBoxNombreManual] = useState<string | null>(null);
  
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
          // Patient exists but no attention for today, create one
          const { data: newAtencion, error: atencionError } = await supabase
            .from("atenciones")
            .insert({
              paciente_id: pacienteData.id,
              estado: "en_espera",
              fecha_ingreso: new Date().toISOString()
            })
            .select(`
              *,
              boxes(nombre),
              atencion_examenes(*, examenes(*))
            `)
            .single();

          if (atencionError) throw atencionError;

          setAtencion(newAtencion);
          
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
            title: "Registro de hoy",
            description: `Su número de atención es #${newAtencion.numero_ingreso}. Espere a que el recepcionista complete su registro.`,
          });
        }
        
        setStep("portal");
      } else {
        // Patient not found, go to registration
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

    // Normalize RUT for storage y generar variantes para evitar duplicados
    const rutVariants = getRutVariants(formData.rut);
    const rutNormalizado = normalizeRut(formData.rut);

    setIsLoading(true);
    try {
      // Check if RUT already exists (cualquier formato conocido)
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

      // Create new patient sin empresa - SIEMPRE guardamos el RUT normalizado
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

      // Create atencion to get numero_ingreso
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
      setAtencion({ ...newAtencion, atencion_examenes: [] });
      
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

  // Function to trigger notification (show persistent toast until OK)
  const triggerNotification = useCallback(
    (boxName: string) => {
      // Evitar múltiples toasts para el mismo box
      if (lastNotificationBoxRef.current === boxName) {
        console.log("Notification already shown for box", boxName);
        return;
      }

      console.log("Triggering notification for box:", boxName);
      lastNotificationBoxRef.current = boxName;

      const { id } = toast({
        title: "¡ES SU TURNO!",
        description: `Está siendo llamado del box ${boxName}`,
        duration: 0,
        action: (
          <ToastAction
            altText="Entendido"
            onClick={() => {
              dismiss(id);
              lastNotificationBoxRef.current = null;
            }}
          >
            OK
          </ToastAction>
        ),
      });
    },
    [toast, dismiss]
  );

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

    // Keep track of last known box_id to detect changes
    let lastKnownBoxId: string | null = atencion?.box_id || null;
    let lastKnownEstado: string | null = atencion?.estado || null;

    const checkForCall = async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      const { data: atencionData } = await supabase
        .from("atenciones")
        .select("*, boxes(nombre), atencion_examenes(*, examenes(*))")
        .eq("paciente_id", paciente.id)
        .gte("fecha_ingreso", startOfDay)
        .lte("fecha_ingreso", endOfDay)
        .order("fecha_ingreso", { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("[PortalPaciente polling] atencionData:", atencionData);

      if (atencionData) {
        const typedAtencion = atencionData as Atencion;

        // Detect if patient was JUST called to a box (state changed to en_atencion with a box_id)
        const wasJustCalled =
          typedAtencion.estado === "en_atencion" &&
          typedAtencion.box_id &&
          (lastKnownEstado !== "en_atencion" || lastKnownBoxId !== typedAtencion.box_id);

        if (wasJustCalled) {
          // Asegurar que tenemos nombre de box, aún si el join viene vacío
          let boxName = typedAtencion.boxes?.nombre || null;

          if (!boxName && typedAtencion.box_id) {
            const { data: boxData } = await supabase
              .from("boxes")
              .select("nombre")
              .eq("id", typedAtencion.box_id)
              .single();

            boxName = boxData?.nombre || null;
            if (boxName) {
              setBoxNombreManual(boxName);
            }
          }

          if (boxName) {
            console.log("Patient called to box (polling):", boxName);
            triggerNotification(boxName);
          }
        }

        // Update tracking variables
        lastKnownBoxId = typedAtencion.box_id;
        lastKnownEstado = typedAtencion.estado;

        // Always update local state so estado y box se vean correctos
        setAtencion(typedAtencion);
      }
    };

    // Check immediately and then every 3 seconds
    checkForCall();
    const interval = setInterval(checkForCall, 3000);

    return () => clearInterval(interval);
  }, [paciente?.id, step, atencion?.box_id, atencion?.estado, triggerNotification]);

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
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">

      <div className="max-w-lg mx-auto space-y-4">
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
                  onClick={refreshData}
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
                    {atencion.estado === "en_atencion" && `En Atención - ${atencion.boxes?.nombre || boxNombreManual || ""}`}
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
