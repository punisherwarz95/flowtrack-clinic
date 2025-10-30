import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import PatientCombobox from "@/components/PatientCombobox";
import { Clock, UserPlus, Play, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Atencion {
  id: string;
  estado: string;
  fecha_ingreso: string;
  pacientes: { 
    id: string;
    nombre: string; 
    rut: string;
    tiene_ficha: boolean;
  };
  boxes: { nombre: string } | null;
}

interface Box {
  id: string;
  nombre: string;
  box_examenes: Array<{
    examen_id: string;
  }>;
}

const Flujo = () => {
  const [atenciones, setAtenciones] = useState<Atencion[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedBox, setSelectedBox] = useState<{[atencionId: string]: string}>({});
  const [availableBoxes, setAvailableBoxes] = useState<{[atencionId: string]: Box[]}>({});

  useEffect(() => {
    loadData();
    
    // Suscripción en tiempo real
    const channel = supabase
      .channel("atenciones-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atenciones" },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const [atencionesRes, boxesRes] = await Promise.all([
        supabase
          .from("atenciones")
          .select("*, pacientes(id, nombre, rut, tiene_ficha), boxes(*)")
          .in("estado", ["en_espera", "en_atencion"])
          .order("fecha_ingreso", { ascending: true }),
        supabase
          .from("boxes")
          .select("*, box_examenes(examen_id)")
          .eq("activo", true),
      ]);

      if (atencionesRes.error) throw atencionesRes.error;
      if (boxesRes.error) throw boxesRes.error;

      setAtenciones(atencionesRes.data || []);
      setBoxes(boxesRes.data || []);

      // Cargar boxes disponibles para cada atención
      await loadAvailableBoxesForAtenciones(atencionesRes.data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    }
  };

  const loadAvailableBoxesForAtenciones = async (atenciones: Atencion[]) => {
    const newAvailableBoxes: {[atencionId: string]: Box[]} = {};

    for (const atencion of atenciones) {
      if (atencion.estado === "en_espera") {
        try {
          // Obtener exámenes pendientes del paciente
          const { data: atencionExamenes, error } = await supabase
            .from("atencion_examenes")
            .select("examen_id")
            .eq("atencion_id", atencion.id)
            .eq("estado", "pendiente");

          if (error) throw error;

          const examenesIds = atencionExamenes?.map(ae => ae.examen_id) || [];

          // Filtrar boxes que tengan al menos un examen pendiente del paciente
          const boxesDisponibles = boxes.filter(box => 
            box.box_examenes.some(be => examenesIds.includes(be.examen_id))
          );

          newAvailableBoxes[atencion.id] = boxesDisponibles;
        } catch (error) {
          console.error("Error loading available boxes:", error);
          newAvailableBoxes[atencion.id] = [];
        }
      }
    }

    setAvailableBoxes(newAvailableBoxes);
  };

  const handleIngresoClick = async () => {
    if (!selectedPatient) {
      toast.error("Selecciona un paciente");
      return;
    }

    try {
      const { error } = await supabase.from("atenciones").insert([
        {
          paciente_id: selectedPatient,
          estado: "en_espera",
        },
      ]);

      if (error) throw error;
      
      toast.success("Paciente ingresado a la lista de espera");
      setSelectedPatient("");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al ingresar paciente");
    }
  };

  const handleIniciarAtencion = async (atencionId: string) => {
    const boxId = selectedBox[atencionId];
    if (!boxId) {
      toast.error("Selecciona un box");
      return;
    }

    try {
      const { error } = await supabase
        .from("atenciones")
        .update({
          estado: "en_atencion",
          box_id: boxId,
          fecha_inicio_atencion: new Date().toISOString(),
        })
        .eq("id", atencionId);

      if (error) throw error;
      
      toast.success("Atención iniciada");
      setSelectedBox(prev => {
        const newState = {...prev};
        delete newState[atencionId];
        return newState;
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al iniciar atención");
    }
  };

  const toggleFicha = async (pacienteId: string, tieneFicha: boolean) => {
    try {
      const { error } = await supabase
        .from("pacientes")
        .update({ tiene_ficha: !tieneFicha })
        .eq("id", pacienteId);

      if (error) throw error;
      toast.success("Estado de ficha actualizado");
      loadData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar ficha");
    }
  };

  const handleCompletarAtencion = async (atencionId: string, estado: "completado" | "incompleto") => {
    try {
      const { error } = await supabase
        .from("atenciones")
        .update({
          estado,
          fecha_fin_atencion: new Date().toISOString(),
        })
        .eq("id", atencionId);

      if (error) throw error;
      
      toast.success(estado === "completado" ? "Atención completada" : "Atención marcada como incompleta");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al actualizar atención");
    }
  };

  const enEspera = atenciones.filter((a) => a.estado === "en_espera");
  const enAtencion = atenciones.filter((a) => a.estado === "en_atencion");

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "en_espera":
        return <Badge variant="secondary" className="bg-warning/20 text-warning">En Espera</Badge>;
      case "en_atencion":
        return <Badge className="bg-info/20 text-info">En Atención</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Flujo de Pacientes</h1>
          <p className="text-muted-foreground">Gestión en tiempo real del flujo de atención</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Ingresar Paciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <PatientCombobox value={selectedPatient} onSelect={setSelectedPatient} />
              </div>
              <Button onClick={handleIngresoClick} className="gap-2">
                <Clock className="h-4 w-4" />
                Agregar a Espera
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-warning">En Espera ({enEspera.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enEspera.map((atencion) => {
                const boxesDisponibles = availableBoxes[atencion.id] || [];
                return (
                  <div
                    key={atencion.id}
                    className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          {atencion.pacientes.nombre}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          RUT: {atencion.pacientes.rut}
                        </div>
                        <Button
                          variant={atencion.pacientes.tiene_ficha ? "default" : "outline"}
                          size="sm"
                          className="mt-2"
                          onClick={() => toggleFicha(atencion.pacientes.id, atencion.pacientes.tiene_ficha)}
                        >
                          {atencion.pacientes.tiene_ficha ? "📋 Tiene ficha" : "⏳ Sin ficha"}
                        </Button>
                      </div>
                      {getEstadoBadge(atencion.estado)}
                    </div>
                    
                    {boxesDisponibles.length > 0 ? (
                      <div className="flex gap-2">
                        <Select 
                          value={selectedBox[atencion.id] || ""} 
                          onValueChange={(value) => setSelectedBox(prev => ({...prev, [atencion.id]: value}))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Seleccionar box" />
                          </SelectTrigger>
                          <SelectContent>
                            {boxesDisponibles.map((box) => (
                              <SelectItem key={box.id} value={box.id}>
                                {box.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => handleIniciarAtencion(atencion.id)}
                          className="gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Iniciar
                        </Button>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">
                        No hay boxes disponibles con exámenes pendientes
                      </div>
                    )}
                  </div>
                );
              })}
              
              {enEspera.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay pacientes en espera
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-info">En Atención ({enAtencion.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enAtencion.map((atencion) => (
                <div
                  key={atencion.id}
                  className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {atencion.pacientes.nombre}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        RUT: {atencion.pacientes.rut}
                      </div>
                      {atencion.boxes && (
                        <div className="text-sm text-primary font-medium mt-1">
                          Box: {atencion.boxes.nombre}
                        </div>
                      )}
                      <Button
                        variant={atencion.pacientes.tiene_ficha ? "default" : "outline"}
                        size="sm"
                        className="mt-2"
                        onClick={() => toggleFicha(atencion.pacientes.id, atencion.pacientes.tiene_ficha)}
                      >
                        {atencion.pacientes.tiene_ficha ? "📋 Tiene ficha" : "⏳ Sin ficha"}
                      </Button>
                    </div>
                    {getEstadoBadge(atencion.estado)}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleCompletarAtencion(atencion.id, "completado")}
                      className="flex-1 gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Completar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCompletarAtencion(atencion.id, "incompleto")}
                      className="flex-1 gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Incompleto
                    </Button>
                  </div>
                </div>
              ))}
              
              {enAtencion.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay pacientes en atención
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Flujo;
