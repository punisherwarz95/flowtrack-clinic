import { useEffect, useState } from "react";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import EmpresaLayout from "@/components/empresa/EmpresaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";

interface Solicitud {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  created_at: string;
  faena: { nombre: string } | null;
  cotizacion: {
    id: string;
    numero_cotizacion: number;
    total_con_iva: number | null;
  } | null;
  items: {
    paquete: { nombre: string } | null;
    examen: { nombre: string } | null;
    cantidad_estimada: number;
  }[];
}

interface Faena {
  id: string;
  nombre: string;
}

interface Bateria {
  id: string;
  nombre: string;
}

const EmpresaCotizaciones = () => {
  const { empresaUsuario } = useEmpresaAuth();
  const { toast } = useToast();

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [faenas, setFaenas] = useState<Faena[]>([]);
  const [baterias, setBaterias] = useState<Bateria[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formTitulo, setFormTitulo] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formFaenaId, setFormFaenaId] = useState("");
  const [formBateriasSeleccionadas, setFormBateriasSeleccionadas] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (empresaUsuario?.empresa_id) {
      loadData();
    }
  }, [empresaUsuario?.empresa_id]);

  const loadData = async () => {
    if (!empresaUsuario?.empresa_id) return;

    setLoading(true);
    try {
      // Cargar solicitudes
      const { data: solicitudesData } = await supabase
        .from("cotizacion_solicitudes")
        .select(`
          *,
          faena:faenas(nombre),
          cotizacion:cotizaciones(id, numero_cotizacion, total_con_iva),
          items:cotizacion_solicitud_items(
            paquete:paquetes_examenes(nombre),
            examen:examenes(nombre),
            cantidad_estimada
          )
        `)
        .eq("empresa_id", empresaUsuario.empresa_id)
        .order("created_at", { ascending: false });

      setSolicitudes((solicitudesData as unknown as Solicitud[]) || []);

      // Cargar faenas
      const { data: faenasData } = await supabase
        .from("faenas")
        .select("*")
        .eq("empresa_id", empresaUsuario.empresa_id)
        .eq("activo", true);

      setFaenas(faenasData || []);

      // Cargar todas las baterías disponibles
      const { data: bateriasData } = await supabase
        .from("paquetes_examenes")
        .select("id, nombre")
        .order("nombre");

      setBaterias(bateriasData || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitulo.trim()) {
      toast({ title: "Ingrese un título para la solicitud", variant: "destructive" });
      return;
    }

    if (formBateriasSeleccionadas.length === 0) {
      toast({ title: "Seleccione al menos una batería", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      // Crear solicitud
      const { data: solicitud, error } = await supabase
        .from("cotizacion_solicitudes")
        .insert({
          empresa_id: empresaUsuario?.empresa_id,
          empresa_usuario_id: empresaUsuario?.id,
          titulo: formTitulo,
          descripcion: formDescripcion || null,
          faena_id: formFaenaId || null,
          estado: "pendiente",
        })
        .select()
        .single();

      if (error) throw error;

      // Crear items
      const itemsInsert = formBateriasSeleccionadas.map((paqueteId) => ({
        solicitud_id: solicitud.id,
        paquete_id: paqueteId,
        cantidad_estimada: 1,
      }));

      await supabase.from("cotizacion_solicitud_items").insert(itemsInsert);

      toast({ title: "Solicitud enviada exitosamente" });

      // Reset form
      setFormTitulo("");
      setFormDescripcion("");
      setFormFaenaId("");
      setFormBateriasSeleccionadas([]);
      setDialogOpen(false);

      loadData();
    } catch (error: any) {
      console.error("Error creando solicitud:", error);
      toast({ title: "Error al enviar solicitud", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAceptarCotizacion = async (solicitudId: string) => {
    if (!confirm("¿Está seguro de aceptar esta cotización? Los precios se actualizarán automáticamente.")) {
      return;
    }

    try {
      await supabase
        .from("cotizacion_solicitudes")
        .update({
          estado: "aceptada",
          aceptado_at: new Date().toISOString(),
        })
        .eq("id", solicitudId);

      toast({ title: "Cotización aceptada" });
      loadData();
    } catch (error) {
      console.error("Error aceptando cotización:", error);
      toast({ title: "Error al aceptar", variant: "destructive" });
    }
  };

  const handleRechazarCotizacion = async (solicitudId: string) => {
    if (!confirm("¿Está seguro de rechazar esta cotización?")) {
      return;
    }

    try {
      await supabase
        .from("cotizacion_solicitudes")
        .update({ estado: "rechazada" })
        .eq("id", solicitudId);

      toast({ title: "Cotización rechazada" });
      loadData();
    } catch (error) {
      console.error("Error rechazando cotización:", error);
      toast({ title: "Error al rechazar", variant: "destructive" });
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "en_revision":
        return <Badge className="bg-blue-500"><FileText className="h-3 w-3 mr-1" />En Revisión</Badge>;
      case "respondida":
        return <Badge className="bg-amber-500"><FileText className="h-3 w-3 mr-1" />Respondida</Badge>;
      case "aceptada":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Aceptada</Badge>;
      case "rechazada":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const pendientes = solicitudes.filter((s) => ["pendiente", "en_revision"].includes(s.estado));
  const respondidas = solicitudes.filter((s) => s.estado === "respondida");
  const finalizadas = solicitudes.filter((s) => ["aceptada", "rechazada"].includes(s.estado));

  const SolicitudCard = ({ solicitud }: { solicitud: Solicitud }) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{solicitud.titulo}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(solicitud.created_at), "dd/MM/yyyy HH:mm")}
            </p>
          </div>
          {getEstadoBadge(solicitud.estado)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {solicitud.descripcion && (
          <p className="text-sm text-muted-foreground">{solicitud.descripcion}</p>
        )}

        {solicitud.faena && (
          <p className="text-sm">
            <span className="font-medium">Faena:</span> {solicitud.faena.nombre}
          </p>
        )}

        <div>
          <p className="text-sm font-medium mb-1">Baterías solicitadas:</p>
          <div className="flex flex-wrap gap-1">
            {solicitud.items?.map((item, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {item.paquete?.nombre || item.examen?.nombre}
              </Badge>
            ))}
          </div>
        </div>

        {solicitud.cotizacion && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">
              Cotización N° {solicitud.cotizacion.numero_cotizacion}
            </p>
            {solicitud.cotizacion.total_con_iva && (
              <p className="text-lg font-bold">
                ${solicitud.cotizacion.total_con_iva.toLocaleString("es-CL")}
              </p>
            )}
          </div>
        )}

        {solicitud.estado === "respondida" && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600"
              onClick={() => handleAceptarCotizacion(solicitud.id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Aceptar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleRechazarCotizacion(solicitud.id)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rechazar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <EmpresaLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Cotizaciones</h1>
            <p className="text-muted-foreground">
              Solicite y gestione cotizaciones de servicios
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Solicitar Cotización
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nueva Solicitud de Cotización</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    placeholder="Ej: Cotización baterías altura física"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    value={formDescripcion}
                    onChange={(e) => setFormDescripcion(e.target.value)}
                    placeholder="Detalles adicionales de la solicitud..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Faena (opcional)</Label>
                  <Select value={formFaenaId} onValueChange={setFormFaenaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar faena" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin faena específica</SelectItem>
                      {faenas.map((faena) => (
                        <SelectItem key={faena.id} value={faena.id}>
                          {faena.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Baterías a cotizar *</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {baterias.map((bateria) => (
                      <div key={bateria.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`bat-${bateria.id}`}
                          checked={formBateriasSeleccionadas.includes(bateria.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormBateriasSeleccionadas([...formBateriasSeleccionadas, bateria.id]);
                            } else {
                              setFormBateriasSeleccionadas(
                                formBateriasSeleccionadas.filter((id) => id !== bateria.id)
                              );
                            }
                          }}
                        />
                        <label htmlFor={`bat-${bateria.id}`} className="text-sm cursor-pointer">
                          {bateria.nombre}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Enviando..." : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Solicitud
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="pendientes">
          <TabsList>
            <TabsTrigger value="pendientes">
              Pendientes ({pendientes.length})
            </TabsTrigger>
            <TabsTrigger value="respondidas">
              Por Revisar ({respondidas.length})
            </TabsTrigger>
            <TabsTrigger value="finalizadas">
              Finalizadas ({finalizadas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : pendientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay solicitudes pendientes
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendientes.map((solicitud) => (
                  <SolicitudCard key={solicitud.id} solicitud={solicitud} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="respondidas" className="mt-4">
            {respondidas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cotizaciones por revisar
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {respondidas.map((solicitud) => (
                  <SolicitudCard key={solicitud.id} solicitud={solicitud} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="finalizadas" className="mt-4">
            {finalizadas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cotizaciones finalizadas
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {finalizadas.map((solicitud) => (
                  <SolicitudCard key={solicitud.id} solicitud={solicitud} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </EmpresaLayout>
  );
};

export default EmpresaCotizaciones;
