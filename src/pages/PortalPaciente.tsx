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
import { normalizeRut, formatRutForDisplay, getRutVariants } from "@/lib/utils";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { usePatientPortal } from "@/hooks/usePatientPortal";

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

  // Notification & sound hook (encapsula audio unlock, play, vibrate y permiso)
  const { play, vibrate, requestNotificationPermission, permission } = useNotificationSound();

  const notifyBox = useCallback((boxName: string) => {
    play();
    vibrate();
    if (permission === "granted") {
      try { new Notification("¡ES SU TURNO!", { body: `Diríjase al box: ${boxName}` }); } catch (err) { console.debug("Notification failed", err); }
    }
    const { id } = toast({
      title: "¡ES SU TURNO!",
      description: `Diríjase al box: ${boxName}`,
      duration: 0,
      action: (
        <ToastAction altText="Entendido" onClick={() => dismiss(id)}>OK</ToastAction>
      )
    });
    return id;
  }, [play, vibrate, permission, toast, dismiss]);

  const { atencion: portalAtencion, loadAtencion: loadPortalAtencion } = usePatientPortal(paciente?.id, notifyBox);

  // Normalize RUT
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
        setStep("portal");
        // Let the hook load the atencion to avoid races
        try {
          await loadPortalAtencion?.();
          toast({ title: "Bienvenido", description: `Verifique su número de atención en pantalla` });
        } catch (err) {
          console.error("Error cargando atención tras buscar paciente:", err);
        }
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
      // Set paciente and let hook pick up the new atencion (realtime)
      try {
        await loadPortalAtencion?.();
      } catch (err) {
        // fallback: set immediate value to show user
        setAtencion({ ...newAtencion, atencion_examenes: [], boxes: null });
      }
      
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

  // Mostrar notificación cuando el paciente es llamado
  const mostrarNotificacionLlamado = useCallback((boxName: string) => {
    play();
    vibrate();
    if (permission === "granted") {
      try { new Notification("¡ES SU TURNO!", { body: `Diríjase al box: ${boxName}` }); } catch {}
    }
    const { id } = toast({
      title: "¡ES SU TURNO!",
      description: `Diríjase al box: ${boxName}`,
      duration: 0,
      action: (
        <ToastAction altText="Entendido" onClick={() => dismiss(id)}>OK</ToastAction>
      ),
    });
  }, [play, vibrate, permission, toast, dismiss]);

  // Keep atencion in sync with portalAtencion (realtime hook)
  useEffect(() => {
    if (portalAtencion) {
      setAtencion(portalAtencion);
    }
  }, [portalAtencion]);

  // Polling with the MISMA lógica que Flujo
  useEffect(() => {
    if (!paciente?.id || step !== "portal") return;

    const cargarDatos = async () => {
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

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
        
        console.log("[Portal] Estado:", atencionData.estado, "Box:", boxNombre);

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

        // Mostrar notificación si fue llamado
        if (fueRecienLlamado && boxNombre) {
          mostrarNotificacionLlamado(boxNombre);
        }

        // Cargar empresa si no está cargada
        if (!empresa) {
          const { data: pacienteData } = await supabase
            .from("pacientes")
            .select("empresa_id")
            .eq("id", paciente.id)
            .single();

          if (pacienteData?.empresa_id) {
            const { data: empresaData } = await supabase
              .from("empresas")
              .select("id, nombre")
              .eq("id", pacienteData.empresa_id)
              .single();
            if (empresaData) setEmpresa(empresaData);
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
  
  // Keep empresa in sync when atencion changes
  useEffect(() => {
    (async () => {
      try {
        if (!paciente?.id || !atencion) return;
        if (!empresa) {
          const { data: pacienteData } = await supabase
            .from("pacientes")
            .select("empresa_id")
            .eq("id", paciente.id)
            .single();

          if (pacienteData?.empresa_id) {
            const { data: empresaData } = await supabase
              .from("empresas")
              .select("id, nombre")
              .eq("id", pacienteData.empresa_id)
              .single();
            if (empresaData) setEmpresa(empresaData);
          }
        }
      } catch (error) {
        console.error("Error cargando empresa:", error);
      }
    })();
  }, [atencion, paciente?.id, empresa]);

  // Refrescar manual
  const refreshData = useCallback(async () => {
    if (!paciente?.id || isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Use hook loader to refresh attention
      await loadPortalAtencion?.();
      toast({ title: "Actualizado", description: "Información actualizada correctamente" });
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [paciente?.id, isRefreshing, toast, loadPortalAtencion]);

  const isTestCompleted = (testId: string) => {
    return testTracking.some(t => t.examen_test_id === testId);
  };

  // Load examenTests & tracking when atencion available
  useEffect(() => {
    (async () => {
      if (!atencion) return;
      try {
        const examenIds = (atencion.atencion_examenes as any[] || []).map(a => a.examen_id).filter(Boolean);
        if (examenIds.length === 0) {
          setExamenTests([]);
        } else {
          const { data: tests } = await supabase
            .from("examen_tests")
            .select("id, nombre, url, examen_id")
            .in("examen_id", examenIds)
            .limit(50);
          if (tests) setExamenTests(tests as ExamenTest[]);
        }

        const { data: tracking } = await supabase
          .from("paciente_test_tracking" as any)
          .select("examen_test_id, abierto_at, completado")
          .eq("atencion_id", atencion.id);

        if (tracking) setTestTracking(tracking as TestTracking[]);
      } catch (error) {
        // ignore missing tables/errors
      }
    })();
  }, [atencion]);
  
  // Permission button handlers
  const handleRequestPermission = useCallback(async () => {
    await requestNotificationPermission();
    toast({ title: "Permiso actualizado", description: `Permiso: ${Notification.permission}` });
  }, [requestNotificationPermission, toast]);
  
  const handleTestSound = useCallback(() => {
    play();
    vibrate();
    toast({ title: "Prueba enviada", description: "Se reprodujo sonido y vibró si está disponible." });
  }, [play, vibrate, toast]);

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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRequestPermission}
                  title="Permitir notificaciones"
                >
                  🔔
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleTestSound}
                  title="Probar sonido/vibración"
                >
                  📳
                </Button>
                {import.meta.env.DEV && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      // Simulate a call locally, set attention to en_atencion and notify
                      const mockBoxName = "BOX (SIMULADO)";
                      setAtencion((prev) => ({
                        ...(prev as any || {}),
                        estado: "en_atencion",
                        box_id: "__simulated__",
                        boxes: { nombre: mockBoxName }
                      } as Atencion));
                      // Ensure portalAtencion isn't required for notify; directly call notifyBox
                      notifyBox(mockBoxName);
                    }}
                    title="Simular llamada"
                  >
                    Simular llamada
                  </Button>
                )}
                {atencion?.numero_ingreso && (
                  <Badge variant="secondary" className="text-2xl px-4 py-2">
                    #{atencion.numero_ingreso}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Show current box notification if portalAtencion indicates en_atencion and box */}
        {portalAtencion?.estado === 'en_atencion' && portalAtencion?.boxes?.nombre && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Llamado a box</p>
                  <p className="font-medium">{portalAtencion.boxes.nombre}</p>
                </div>
                <Button onClick={() => mostrarNotificacionLlamado(portalAtencion.boxes.nombre)}>Notificar</Button>
              </div>
            </CardContent>
          </Card>
        )}

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
