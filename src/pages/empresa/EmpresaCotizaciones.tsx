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

interface CotizacionItem {
  nombre_prestacion: string;
  valor_final: number | null;
  paquete_id: string | null;
}

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
    total_con_margen: number | null;
    items: CotizacionItem[];
  } | null;
  items: {
    paquete: { nombre: string } | null;
    examen: { nombre: string } | null;
    cantidad_estimada: number;
  }[];
}

interface CotizacionDirecta {
  id: string;
  numero_cotizacion: number;
  fecha_cotizacion: string;
  estado: string | null;
  total_con_margen: number | null;
  observaciones: string | null;
  items: CotizacionItem[];
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
  const { currentEmpresaId, empresaUsuario, isStaffAdmin } = useEmpresaAuth();
  const { toast } = useToast();

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cotizacionesDirectas, setCotizacionesDirectas] = useState<CotizacionDirecta[]>([]);
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
    if (currentEmpresaId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [currentEmpresaId]);

  const loadData = async () => {
    if (!currentEmpresaId) return;

    setLoading(true);
    try {
      // Cargar solicitudes
      const { data: solicitudesData } = await supabase
        .from("cotizacion_solicitudes")
        .select(`
          *,
          faena:faenas(nombre),
          cotizacion:cotizaciones!cotizacion_solicitudes_cotizacion_id_fkey(
            id, 
            numero_cotizacion, 
            total_con_margen,
            items:cotizacion_items(nombre_prestacion, valor_final, paquete_id)
          ),
          items:cotizacion_solicitud_items(
            paquete:paquetes_examenes(nombre),
            examen:examenes(nombre),
            cantidad_estimada
          )
        `)
        .eq("empresa_id", currentEmpresaId)
        .order("created_at", { ascending: false });

      setSolicitudes((solicitudesData as unknown as Solicitud[]) || []);

      // Cargar cotizaciones directas (creadas por staff sin solicitud)
      const { data: directasData } = await supabase
        .from("cotizaciones")
        .select(`
          id, numero_cotizacion, fecha_cotizacion, estado, total_con_margen, observaciones,
          items:cotizacion_items(nombre_prestacion, valor_final, paquete_id)
        `)
        .eq("empresa_id", currentEmpresaId)
        .is("solicitud_id", null)
        .order("created_at", { ascending: false });

      setCotizacionesDirectas((directasData as unknown as CotizacionDirecta[]) || []);

      // Cargar faenas
      const { data: faenasData } = await supabase
        .from("faenas")
        .select("*")
        .eq("empresa_id", currentEmpresaId)
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
          empresa_id: currentEmpresaId,
          empresa_usuario_id: empresaUsuario?.id?.startsWith("admin-virtual") ? null : empresaUsuario?.id,
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
      // 1. Obtener la solicitud con su cotización asociada
      const { data: solicitud, error: solicitudError } = await supabase
        .from("cotizacion_solicitudes")
        .select("cotizacion_id, empresa_id")
        .eq("id", solicitudId)
        .maybeSingle();

      if (solicitudError || !solicitud?.cotizacion_id) {
        throw new Error("No se encontró la cotización asociada");
      }

      // 2. Obtener los items de la cotización (baterías con precios)
      const { data: items, error: itemsError } = await supabase
        .from("cotizacion_items")
        .select("paquete_id, valor_final")
        .eq("cotizacion_id", solicitud.cotizacion_id)
        .not("paquete_id", "is", null);

      if (itemsError) throw itemsError;

      // 3. Actualizar estado de la solicitud
      await supabase
        .from("cotizacion_solicitudes")
        .update({
          estado: "aceptada",
          aceptado_at: new Date().toISOString(),
        })
        .eq("id", solicitudId);

      // 4. Actualizar estado de la cotización
      await supabase
        .from("cotizaciones")
        .update({ estado: "aceptada" })
        .eq("id", solicitud.cotizacion_id);

      // 5. Insertar/actualizar baterías en empresa_baterias
      if (items && items.length > 0) {
        for (const item of items) {
          if (!item.paquete_id) continue;

          // Verificar si ya existe
          const { data: existing } = await supabase
            .from("empresa_baterias")
            .select("id")
            .eq("empresa_id", solicitud.empresa_id)
            .eq("paquete_id", item.paquete_id)
            .maybeSingle();

          if (existing) {
            // Actualizar precio existente
            await supabase
              .from("empresa_baterias")
              .update({ 
                valor: item.valor_final || 0,
                activo: true,
                updated_at: new Date().toISOString()
              })
              .eq("id", existing.id);
          } else {
            // Insertar nueva batería
            await supabase
              .from("empresa_baterias")
              .insert({
                empresa_id: solicitud.empresa_id,
                paquete_id: item.paquete_id,
                valor: item.valor_final || 0,
                activo: true,
              });
          }
        }
      }

      toast({ title: "Cotización aceptada y precios actualizados" });
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
      // 1. Obtener la solicitud con su cotización asociada
      const { data: solicitud } = await supabase
        .from("cotizacion_solicitudes")
        .select("cotizacion_id")
        .eq("id", solicitudId)
        .maybeSingle();

      // 2. Actualizar estado de la solicitud
      await supabase
        .from("cotizacion_solicitudes")
        .update({ estado: "rechazada" })
        .eq("id", solicitudId);

      // 3. Actualizar estado de la cotización si existe
      if (solicitud?.cotizacion_id) {
        await supabase
          .from("cotizaciones")
          .update({ estado: "rechazada" })
          .eq("id", solicitud.cotizacion_id);
      }

      toast({ title: "Cotización rechazada" });
      loadData();
    } catch (error) {
      console.error("Error rechazando cotización:", error);
      toast({ title: "Error al rechazar", variant: "destructive" });
    }
  };

  const handleAceptarDirecta = async (cotizacionId: string) => {
    if (!confirm("¿Está seguro de aceptar esta cotización? Los precios se actualizarán automáticamente.")) return;
    try {
      const { data: items } = await supabase
        .from("cotizacion_items")
        .select("paquete_id, valor_final")
        .eq("cotizacion_id", cotizacionId)
        .not("paquete_id", "is", null);

      await supabase.from("cotizaciones").update({ estado: "aceptada" }).eq("id", cotizacionId);

      if (items && items.length > 0 && currentEmpresaId) {
        for (const item of items) {
          if (!item.paquete_id) continue;
          const { data: existing } = await supabase
            .from("empresa_baterias")
            .select("id")
            .eq("empresa_id", currentEmpresaId)
            .eq("paquete_id", item.paquete_id)
            .maybeSingle();
          if (existing) {
            await supabase.from("empresa_baterias").update({ valor: item.valor_final || 0, activo: true, updated_at: new Date().toISOString() }).eq("id", existing.id);
          } else {
            await supabase.from("empresa_baterias").insert({ empresa_id: currentEmpresaId, paquete_id: item.paquete_id, valor: item.valor_final || 0, activo: true });
          }
        }
      }
      toast({ title: "Cotización aceptada y precios actualizados" });
      loadData();
    } catch (error) {
      console.error("Error aceptando cotización directa:", error);
      toast({ title: "Error al aceptar", variant: "destructive" });
    }
  };

  const handleRechazarDirecta = async (cotizacionId: string) => {
    if (!confirm("¿Está seguro de rechazar esta cotización?")) return;
    try {
      await supabase.from("cotizaciones").update({ estado: "rechazada" }).eq("id", cotizacionId);
      toast({ title: "Cotización rechazada" });
      loadData();
    } catch (error) {
      console.error("Error rechazando cotización directa:", error);
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
      case "borrador":
        return <Badge className="bg-amber-500"><FileText className="h-3 w-3 mr-1" />Por Revisar</Badge>;
      case "aceptada":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Aceptada</Badge>;
      case "rechazada":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rechazada</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  // Cotizaciones directas separadas por estado
  const directasPorRevisar = cotizacionesDirectas.filter(c => !c.estado || c.estado === "borrador" || c.estado === "respondida");
  const directasFinalizadas = cotizacionesDirectas.filter(c => c.estado === "aceptada" || c.estado === "rechazada");

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
          <div className="p-3 rounded-lg bg-muted space-y-2">
            <p className="text-sm font-medium">
              Cotización N° {solicitud.cotizacion.numero_cotizacion}
            </p>
            
            {/* Detalle de baterías con valores */}
            {solicitud.cotizacion.items && solicitud.cotizacion.items.length > 0 && (
              <div className="space-y-1">
                {solicitud.cotizacion.items
                  .filter(item => item.paquete_id) // Solo baterías
                  .map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.nombre_prestacion}</span>
                      <span className="font-medium">
                        ${Math.ceil(item.valor_final || 0).toLocaleString("es-CL")}
                      </span>
                    </div>
                  ))}
              </div>
            )}
            
            {/* Total calculado desde items */}
            {(() => {
              const itemsFiltrados = solicitud.cotizacion.items?.filter(item => item.paquete_id) || [];
              const totalCalculado = itemsFiltrados.reduce((acc, item) => acc + (item.valor_final || 0), 0);
              const totalFinal = totalCalculado > 0 ? totalCalculado : solicitud.cotizacion.total_con_margen;
              return totalFinal ? (
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">TOTAL</span>
                    <span className="text-lg font-bold">
                      ${Math.ceil(totalFinal).toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>
              ) : null;
            })()}
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

  const CotizacionDirectaCard = ({ cotizacion }: { cotizacion: CotizacionDirecta }) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Cotización N° {cotizacion.numero_cotizacion}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(cotizacion.fecha_cotizacion), "dd/MM/yyyy")}
            </p>
          </div>
          {getEstadoBadge(cotizacion.estado || "borrador")}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {cotizacion.observaciones && (
          <p className="text-sm text-muted-foreground">{cotizacion.observaciones}</p>
        )}

        <div className="p-3 rounded-lg bg-muted space-y-2">
          {cotizacion.items?.filter(item => item.paquete_id).map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.nombre_prestacion}</span>
              <span className="font-medium">
                ${Math.ceil(item.valor_final || 0).toLocaleString("es-CL")}
              </span>
            </div>
          ))}
          {(() => {
            const itemsFiltrados = cotizacion.items?.filter(item => item.paquete_id) || [];
            const totalCalculado = itemsFiltrados.reduce((acc, item) => acc + (item.valor_final || 0), 0);
            const totalFinal = totalCalculado > 0 ? totalCalculado : cotizacion.total_con_margen;
            return totalFinal ? (
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">TOTAL</span>
                  <span className="text-lg font-bold">
                    ${Math.ceil(totalFinal).toLocaleString("es-CL")}
                  </span>
                </div>
              </div>
            ) : null;
          })()}
        </div>

        {(!cotizacion.estado || cotizacion.estado === "borrador" || cotizacion.estado === "respondida") && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="bg-green-500 hover:bg-green-600" onClick={() => handleAceptarDirecta(cotizacion.id)}>
              <CheckCircle className="h-4 w-4 mr-1" />Aceptar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleRechazarDirecta(cotizacion.id)}>
              <XCircle className="h-4 w-4 mr-1" />Rechazar
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
                  <Select
                    value={formFaenaId}
                    onValueChange={(v) => setFormFaenaId(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar faena" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin faena específica</SelectItem>
                      {faenas.filter((f) => f.id).map((faena) => (
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

        <Tabs defaultValue="por_revisar">
          <TabsList>
            <TabsTrigger value="por_revisar">
              Por Revisar ({respondidas.length + directasPorRevisar.length})
            </TabsTrigger>
            <TabsTrigger value="pendientes">
              Mis Solicitudes ({pendientes.length})
            </TabsTrigger>
            <TabsTrigger value="finalizadas">
              Finalizadas ({finalizadas.length + directasFinalizadas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="por_revisar" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (respondidas.length + directasPorRevisar.length) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cotizaciones por revisar
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {respondidas.map((solicitud) => (
                  <SolicitudCard key={solicitud.id} solicitud={solicitud} />
                ))}
                {directasPorRevisar.map((cot) => (
                  <CotizacionDirectaCard key={cot.id} cotizacion={cot} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pendientes" className="mt-4">
            {pendientes.length === 0 ? (
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

          <TabsContent value="finalizadas" className="mt-4">
            {(finalizadas.length + directasFinalizadas.length) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay cotizaciones finalizadas
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {finalizadas.map((solicitud) => (
                  <SolicitudCard key={solicitud.id} solicitud={solicitud} />
                ))}
                {directasFinalizadas.map((cot) => (
                  <CotizacionDirectaCard key={cot.id} cotizacion={cot} />
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
