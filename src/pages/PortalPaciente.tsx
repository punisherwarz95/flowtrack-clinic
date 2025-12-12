import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Bell, ExternalLink, CheckCircle2, Clock, Building2, FileText, AlertCircle, X } from "lucide-react";
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
  const [llamadoActivo, setLlamadoActivo] = useState(false);
  const [boxLlamado, setBoxLlamado] = useState<string | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [currentTest, setCurrentTest] = useState<ExamenTest | null>(null);
  
  // Form fields for new registration
  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    fecha_nacimiento: "",
    email: "",
    telefono: ""
  });

  const formatRut = (value: string) => {
    // Remove non-alphanumeric characters
    let cleaned = value.replace(/[^0-9kK]/g, "").toUpperCase();
    
    if (cleaned.length > 1) {
      const body = cleaned.slice(0, -1);
      const dv = cleaned.slice(-1);
      const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      cleaned = `${formattedBody}-${dv}`;
    }
    
    return cleaned;
  };

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
    setRut(formatted);
  };

  const handleFormRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRut(e.target.value);
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

    setIsLoading(true);
    try {
      // Search for patient by RUT
      const { data: pacienteData, error: pacienteError } = await supabase
        .from("pacientes")
        .select("*")
        .eq("rut", rut.trim())
        .maybeSingle();

      if (pacienteError) throw pacienteError;

      if (pacienteData) {
        setPaciente(pacienteData);
        await cargarDatosPaciente(pacienteData.id);
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

    setIsLoading(true);
    try {
      // Check if RUT already exists
      const { data: existingPaciente } = await supabase
        .from("pacientes")
        .select("id")
        .eq("rut", formData.rut.trim())
        .maybeSingle();

      if (existingPaciente) {
        toast({
          title: "RUT ya registrado",
          description: "Este RUT ya está registrado. Por favor identifíquese.",
          variant: "destructive"
        });
        setRut(formData.rut);
        setStep("identificacion");
        return;
      }

      // Create new patient without empresa
      const { data: newPaciente, error } = await supabase
        .from("pacientes")
        .insert({
          nombre: formData.nombre.trim(),
          rut: formData.rut.trim(),
          fecha_nacimiento: formData.fecha_nacimiento || null,
          email: formData.email.trim() || null,
          telefono: formData.telefono.trim() || null,
          empresa_id: null,
          tipo_servicio: null
        })
        .select()
        .single();

      if (error) throw error;

      setPaciente(newPaciente);
      
      toast({
        title: "Registro exitoso",
        description: "Sus datos han sido registrados. Espere a que el recepcionista complete su registro.",
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
              setBoxLlamado(boxData.nombre);
              setLlamadoActivo(true);
              
              // Play notification sound and vibrate
              try {
                // Vibrate if supported
                if ("vibrate" in navigator) {
                  navigator.vibrate([500, 200, 500, 200, 500]);
                }
                
                // Play sound
                const audio = new Audio("/notification.mp3");
                audio.volume = 1;
                audio.play().catch(() => {
                  // Fallback: use Web Audio API
                  const audioContext = new AudioContext();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  oscillator.frequency.value = 800;
                  oscillator.type = "sine";
                  gainNode.gain.value = 0.5;
                  
                  oscillator.start();
                  setTimeout(() => {
                    oscillator.stop();
                    audioContext.close();
                  }, 500);
                });
              } catch (error) {
                console.error("Error playing notification:", error);
              }
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
  }, [paciente?.id, atencion?.estado]);

  // Refresh data periodically
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
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Registro de Paciente</CardTitle>
            <CardDescription>Complete sus datos para registrarse</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre Completo *</Label>
              <Input
                id="nombre"
                placeholder="Juan Pérez González"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="formRut">RUT *</Label>
              <Input
                id="formRut"
                placeholder="12.345.678-9"
                value={formData.rut}
                onChange={handleFormRutChange}
              />
            </div>
            <div>
              <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
              <Input
                id="fecha_nacimiento"
                type="date"
                value={formData.fecha_nacimiento}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha_nacimiento: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="+56 9 1234 5678"
                value={formData.telefono}
                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep("identificacion")}
                className="flex-1"
              >
                Volver
              </Button>
              <Button 
                onClick={registrarPaciente} 
                className="flex-1" 
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
      {/* Notification overlay when called */}
      {llamadoActivo && (
        <div className="fixed inset-0 bg-primary/95 z-50 flex items-center justify-center animate-pulse">
          <div className="text-center text-primary-foreground p-8">
            <Bell className="h-24 w-24 mx-auto mb-6 animate-bounce" />
            <h1 className="text-4xl font-bold mb-4">¡Es su turno!</h1>
            <p className="text-2xl mb-8">Diríjase a</p>
            <div className="bg-white/20 rounded-2xl p-6 inline-block">
              <p className="text-5xl font-black">{boxLlamado}</p>
            </div>
            <Button 
              variant="secondary" 
              size="lg" 
              className="mt-8"
              onClick={() => setLlamadoActivo(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{paciente?.nombre}</h1>
                <p className="text-muted-foreground">{paciente?.rut}</p>
              </div>
              {atencion?.numero_ingreso && (
                <Badge variant="secondary" className="text-2xl px-4 py-2">
                  #{atencion.numero_ingreso}
                </Badge>
              )}
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
