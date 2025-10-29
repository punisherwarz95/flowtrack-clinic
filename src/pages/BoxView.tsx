import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface Atencion {
  id: string;
  paciente_id: string;
  estado: string;
  fecha_ingreso: string;
  pacientes: {
    id: string;
    nombre: string;
    tipo_servicio: string;
    tiene_ficha: boolean;
    empresas: {
      nombre: string;
    } | null;
  };
  atencion_examenes: Array<{
    id: string;
    examen_id: string;
    estado: string;
    examenes: {
      id: string;
      nombre: string;
    };
  }>;
}

interface Box {
  id: string;
  nombre: string;
  descripcion: string | null;
  box_examenes: Array<{
    examen_id: string;
    examenes: {
      id: string;
      nombre: string;
    };
  }>;
}

const BoxView = () => {
  const { boxId } = useParams();
  const [box, setBox] = useState<Box | null>(null);
  const [atenciones, setAtenciones] = useState<Atencion[]>([]);

  useEffect(() => {
    if (boxId) {
      loadBox();
      loadAtenciones();
      subscribeToChanges();
    }
  }, [boxId]);

  const loadBox = async () => {
    try {
      const { data, error } = await supabase
        .from("boxes")
        .select("*, box_examenes(examen_id, examenes(*))")
        .eq("id", boxId)
        .single();

      if (error) throw error;
      setBox(data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar box");
    }
  };

  const loadAtenciones = async () => {
    if (!boxId) return;

    try {
      // Obtener los exámenes del box
      const { data: boxData, error: boxError } = await supabase
        .from("box_examenes")
        .select("examen_id")
        .eq("box_id", boxId);

      if (boxError) throw boxError;

      const examenIds = boxData.map(be => be.examen_id);

      // Obtener atenciones que tienen exámenes pendientes para este box
      const { data, error } = await supabase
        .from("atenciones")
        .select(`
          *,
          pacientes(*, empresas(*)),
          atencion_examenes(*, examenes(*))
        `)
        .in("estado", ["en_espera", "en_atencion"])
        .order("fecha_ingreso", { ascending: true });

      if (error) throw error;

      // Filtrar atenciones que tienen al menos un examen pendiente del box
      const atencionesRelevantes = data.filter(atencion => 
        atencion.atencion_examenes.some(ae => 
          examenIds.includes(ae.examen_id) && ae.estado === 'pendiente'
        )
      );

      setAtenciones(atencionesRelevantes);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar atenciones");
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel('box-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atenciones'
        },
        () => {
          loadAtenciones();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'atencion_examenes'
        },
        () => {
          loadAtenciones();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pacientes'
        },
        () => {
          loadAtenciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateExamenEstado = async (atencionExamenId: string, estado: 'completado' | 'incompleto' | 'pendiente') => {
    try {
      const { error } = await supabase
        .from("atencion_examenes")
        .update({ estado, fecha_realizacion: estado !== 'pendiente' ? new Date().toISOString() : null })
        .eq("id", atencionExamenId);

      if (error) throw error;
      toast.success("Estado actualizado");
      loadAtenciones();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar estado");
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
      loadAtenciones();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar ficha");
    }
  };

  if (!box) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Cargando...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Box: {box.nombre}
          </h1>
          <p className="text-muted-foreground">{box.descripcion}</p>
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Exámenes disponibles en este box:</h3>
            <div className="flex flex-wrap gap-2">
              {box.box_examenes.map((be) => (
                <span key={be.examen_id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {be.examenes.nombre}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {atenciones.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay pacientes pendientes para este box
              </CardContent>
            </Card>
          ) : (
            atenciones.map((atencion) => (
              <Card key={atencion.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{atencion.pacientes.nombre}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {atencion.pacientes.empresas?.nombre || "Sin empresa"} •{" "}
                        <span className={atencion.pacientes.tipo_servicio === 'workmed' ? 'text-blue-600' : 'text-green-600'}>
                          {atencion.pacientes.tipo_servicio === 'workmed' ? 'Workmed' : 'Jenner'}
                        </span>
                      </p>
                    </div>
                    <Button
                      variant={atencion.pacientes.tiene_ficha ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFicha(atencion.pacientes.id, atencion.pacientes.tiene_ficha)}
                    >
                      {atencion.pacientes.tiene_ficha ? "📋 Tiene ficha" : "⏳ Ficha entregada"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {atencion.atencion_examenes
                      .filter(ae => box.box_examenes.some(be => be.examen_id === ae.examen_id))
                      .map((ae) => (
                        <div
                          key={ae.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            {ae.estado === 'completado' && <CheckCircle className="h-5 w-5 text-green-600" />}
                            {ae.estado === 'incompleto' && <XCircle className="h-5 w-5 text-red-600" />}
                            {ae.estado === 'pendiente' && <Clock className="h-5 w-5 text-orange-600" />}
                            <span className="font-medium">{ae.examenes.nombre}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={ae.estado === 'completado' ? 'default' : 'outline'}
                              onClick={() => updateExamenEstado(ae.id, 'completado')}
                            >
                              Completado
                            </Button>
                            <Button
                              size="sm"
                              variant={ae.estado === 'incompleto' ? 'destructive' : 'outline'}
                              onClick={() => updateExamenEstado(ae.id, 'incompleto')}
                            >
                              Incompleto
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default BoxView;
