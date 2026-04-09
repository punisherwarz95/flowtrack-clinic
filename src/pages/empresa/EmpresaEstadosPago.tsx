import { useEffect, useState, useMemo } from "react";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import EmpresaLayout from "@/components/empresa/EmpresaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Calendar,
  CreditCard,
  FileText,
  DollarSign,
  Trash2,
  Package,
} from "lucide-react";

interface EstadoPago {
  id: string;
  numero: number;
  fecha_desde: string;
  fecha_hasta: string;
  total_neto: number | null;
  total_iva: number | null;
  total: number | null;
  estado: string;
  created_at: string;
  items: EstadoPagoItem[];
}

interface EstadoPagoItem {
  id: string;
  paciente_nombre: string;
  paciente_rut: string | null;
  cargo: string | null;
  faena: string | null;
  fecha_atencion: string;
  baterias: { nombre: string; valor: number }[];
  subtotal: number | null;
}

const EmpresaEstadosPago = () => {
  const { currentEmpresaId, isStaffAdmin } = useEmpresaAuth();
  const { toast } = useToast();

  const [estadosPago, setEstadosPago] = useState<EstadoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEstado, setSelectedEstado] = useState<EstadoPago | null>(null);
  const [estadoToDelete, setEstadoToDelete] = useState<EstadoPago | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Generador de estado
  const [fechaDesde, setFechaDesde] = useState(
    format(new Date(new Date().setDate(1)), "yyyy-MM-dd")
  );
  const [fechaHasta, setFechaHasta] = useState(format(new Date(), "yyyy-MM-dd"));
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (currentEmpresaId) {
      loadEstadosPago();
    } else {
      setLoading(false);
    }
  }, [currentEmpresaId]);

  const loadEstadosPago = async () => {
    if (!currentEmpresaId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("estados_pago")
        .select(`
          *,
          items:estado_pago_items(*)
        `)
        .eq("empresa_id", currentEmpresaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEstadosPago((data as unknown as EstadoPago[]) || []);
    } catch (error) {
      console.error("Error cargando estados de pago:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarEstado = async () => {
    if (!currentEmpresaId) return;

    setGenerando(true);
    try {
      // 0. Verificar si la empresa es afecta a IVA
      const { data: empresaData } = await supabase
        .from("empresas")
        .select("afecto_iva")
        .eq("id", currentEmpresaId)
        .single();
      const esAfectaIva = empresaData?.afecto_iva !== false;

      // 1. Obtener atenciones completadas en el período para esta empresa
      const { data: atenciones, error: atencionesError } = await supabase
        .from("atenciones")
        .select(`
          id,
          paciente_id,
          fecha_ingreso,
          estado,
          fecha_fin_atencion
        `)
        .eq("empresa_id", currentEmpresaId)
        .eq("estado", "completado")
        .gte("fecha_ingreso", `${fechaDesde}T00:00:00`)
        .lte("fecha_ingreso", `${fechaHasta}T23:59:59`);

      // 2. Obtener atenciones completadas en el período
      const { data: atenciones, error: atencionesError } = await supabase
        .from("atenciones")
        .select(`
          id,
          paciente_id,
          fecha_ingreso,
          estado,
          fecha_fin_atencion
        `)
        .in("paciente_id", pacienteIds)
        .eq("estado", "completado")
        .gte("fecha_ingreso", `${fechaDesde}T00:00:00`)
        .lte("fecha_ingreso", `${fechaHasta}T23:59:59`);

      if (atencionesError) throw atencionesError;

      if (!atenciones || atenciones.length === 0) {
        toast({ title: "No hay atenciones completadas en el período seleccionado", variant: "destructive" });
        setGenerando(false);
        return;
      }

      // 2b. Obtener baterías de atencion_baterias
      const atencionIds = atenciones.map((a: any) => a.id);
      const { data: atencionBaterias } = await supabase
        .from("atencion_baterias")
        .select("atencion_id, paquete_id, paquete:paquetes_examenes(id, nombre)")
        .in("atencion_id", atencionIds);

      const bateriasPorAtencion: Record<string, { paquete_id: string; nombre: string }[]> = {};
      (atencionBaterias || []).forEach((ab: any) => {
        if (!bateriasPorAtencion[ab.atencion_id]) {
          bateriasPorAtencion[ab.atencion_id] = [];
        }
        bateriasPorAtencion[ab.atencion_id].push({
          paquete_id: ab.paquete_id,
          nombre: ab.paquete?.nombre || "Batería"
        });
      });

      // 3. Obtener valores de baterías para la empresa
      const { data: empresaBaterias } = await supabase
        .from("empresa_baterias")
        .select("paquete_id, valor")
        .eq("empresa_id", currentEmpresaId);

      const bateriaValores: Record<string, number> = {};
      empresaBaterias?.forEach((eb: any) => {
        bateriaValores[eb.paquete_id] = eb.valor || 0;
      });

      // 4. Calcular items y totales
      let totalNeto = 0;
      const items: {
        atencion_id: string;
        paciente_nombre: string;
        paciente_rut: string | null;
        cargo: string | null;
        faena: string | null;
        fecha_atencion: string;
        baterias: { nombre: string; valor: number }[];
        subtotal: number;
      }[] = [];

      atenciones.forEach((atencion: any) => {
        const paciente = pacientesMap.get(atencion.paciente_id);
        if (!paciente) return;

        const bateriasConValor: { nombre: string; valor: number }[] = [];
        let subtotal = 0;

        const bateriasDeAtencion = bateriasPorAtencion[atencion.id] || [];
        bateriasDeAtencion.forEach((b) => {
          const valor = bateriaValores[b.paquete_id] || 0;
          bateriasConValor.push({ nombre: b.nombre, valor });
          subtotal += valor;
        });

        totalNeto += subtotal;

        items.push({
          atencion_id: atencion.id,
          paciente_nombre: paciente.nombre,
          paciente_rut: paciente.rut,
          cargo: paciente.cargo,
          faena: (paciente.faena as any)?.nombre || null,
          fecha_atencion: atencion.fecha_ingreso?.split("T")[0] || fechaDesde,
          baterias: bateriasConValor,
          subtotal,
        });
      });

      if (items.length === 0) {
        toast({ title: "No se encontraron ítems válidos para generar", variant: "destructive" });
        setGenerando(false);
        return;
      }

      const totalIva = esAfectaIva ? Math.ceil(totalNeto * 0.19) : 0;
      const total = totalNeto + totalIva;

      // 5. Crear estado de pago
      const { data: estadoPago, error: estadoError } = await supabase
        .from("estados_pago")
        .insert({
          empresa_id: currentEmpresaId,
          numero: await getNextNumero(),
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          total_neto: totalNeto,
          total_iva: totalIva,
          total: total,
          estado: "pendiente",
        })
        .select()
        .single();

      if (estadoError) throw estadoError;

      // 6. Crear items
      const itemsInsert = items.map((item) => ({
        estado_pago_id: estadoPago.id,
        atencion_id: item.atencion_id,
        paciente_nombre: item.paciente_nombre,
        paciente_rut: item.paciente_rut,
        cargo: item.cargo,
        faena: item.faena,
        fecha_atencion: item.fecha_atencion,
        baterias: item.baterias,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase.from("estado_pago_items").insert(itemsInsert);
      if (itemsError) throw itemsError;

      toast({ title: `Estado de pago N° ${estadoPago.numero} generado con ${items.length} atenciones` });
      loadEstadosPago();
    } catch (error: any) {
      console.error("Error generando estado de pago:", error);
      toast({ 
        title: "Error al generar estado de pago", 
        description: error.message || "Revisa la consola para más detalles",
        variant: "destructive" 
      });
    } finally {
      setGenerando(false);
    }
  };

  const handleDeleteEstado = async () => {
    if (!estadoToDelete) return;
    setDeleting(true);
    try {
      // Delete items first
      const { error: itemsError } = await supabase
        .from("estado_pago_items")
        .delete()
        .eq("estado_pago_id", estadoToDelete.id);
      if (itemsError) throw itemsError;

      // Delete estado
      const { error } = await supabase
        .from("estados_pago")
        .delete()
        .eq("id", estadoToDelete.id);
      if (error) throw error;

      toast({ title: `Estado de pago N° ${estadoToDelete.numero} eliminado` });
      if (selectedEstado?.id === estadoToDelete.id) {
        setSelectedEstado(null);
      }
      setEstadoToDelete(null);
      loadEstadosPago();
    } catch (error: any) {
      console.error("Error eliminando estado de pago:", error);
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const getNextNumero = async (): Promise<number> => {
    const { data } = await supabase
      .from("estados_pago")
      .select("numero")
      .eq("empresa_id", currentEmpresaId)
      .order("numero", { ascending: false })
      .limit(1);

    return (data?.[0]?.numero || 0) + 1;
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge variant="secondary">Pendiente</Badge>;
      case "enviado":
        return <Badge className="bg-blue-600 text-white">Enviado</Badge>;
      case "pagado":
        return <Badge className="bg-green-600 text-white">Pagado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  // Compute battery summary for selected estado
  const bateriaSummary = useMemo(() => {
    if (!selectedEstado?.items) return [];
    const map: Record<string, { nombre: string; cantidad: number; valorUnitario: number }> = {};
    selectedEstado.items.forEach((item) => {
      (item.baterias as any[] || []).forEach((b: { nombre: string; valor: number }) => {
        if (!map[b.nombre]) {
          map[b.nombre] = { nombre: b.nombre, cantidad: 0, valorUnitario: b.valor };
        }
        map[b.nombre].cantidad += 1;
      });
    });
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [selectedEstado]);

  return (
    <EmpresaLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Estados de Pago</h1>
          <p className="text-muted-foreground">
            Consulte y genere estados de cuenta de sus atenciones
          </p>
        </div>

        {/* Generador */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Generar Nuevo Estado de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <Input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <Input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                />
              </div>
              <Button onClick={handleGenerarEstado} disabled={generando}>
                {generando ? "Generando..." : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generar Estado
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de estados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Estados de Pago Generados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : estadosPago.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay estados de pago generados
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Atenciones</TableHead>
                      <TableHead className="text-right">Neto</TableHead>
                      <TableHead className="text-right">IVA</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estadosPago.map((estado) => (
                      <TableRow key={estado.id}>
                        <TableCell className="font-medium">{estado.numero}</TableCell>
                        <TableCell>
                          {format(new Date(estado.fecha_desde + "T12:00:00"), "dd/MM/yyyy")} - {format(new Date(estado.fecha_hasta + "T12:00:00"), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>{estado.items?.length || 0}</TableCell>
                        <TableCell className="text-right">
                          ${estado.total_neto?.toLocaleString("es-CL") || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {(estado.total_iva ?? 0) > 0
                            ? `$${estado.total_iva?.toLocaleString("es-CL")}`
                            : <span className="text-muted-foreground text-xs">Exento</span>
                          }
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${estado.total?.toLocaleString("es-CL") || 0}
                        </TableCell>
                        <TableCell>{getEstadoBadge(estado.estado)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEstado(estado)}
                            >
                              Ver detalle
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setEstadoToDelete(estado)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalle del estado seleccionado */}
        {selectedEstado && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Detalle Estado N° {selectedEstado.numero}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setSelectedEstado(null)}>
                  Cerrar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Items table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>RUT</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Faena</TableHead>
                      <TableHead>Baterías</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEstado.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {format(new Date(item.fecha_atencion + "T12:00:00"), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">{item.paciente_nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{item.paciente_rut || "-"}</TableCell>
                        <TableCell>{item.cargo || "-"}</TableCell>
                        <TableCell>{item.faena || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(item.baterias as any[])?.map((b, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {b.nombre}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.subtotal?.toLocaleString("es-CL") || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Resumen de baterías */}
              {bateriaSummary.length > 0 && (
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Resumen por Batería
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Batería</TableHead>
                            <TableHead className="text-center">Cantidad</TableHead>
                            <TableHead className="text-right">Valor Unitario</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bateriaSummary.map((b) => (
                            <TableRow key={b.nombre}>
                              <TableCell className="font-medium">{b.nombre}</TableCell>
                              <TableCell className="text-center">{b.cantidad.toString().padStart(2, '0')}</TableCell>
                              <TableCell className="text-right">
                                ${b.valorUnitario.toLocaleString("es-CL")}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                ${(b.cantidad * b.valorUnitario).toLocaleString("es-CL")}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="text-right space-y-1">
                  <p className="text-sm">
                    Neto: <span className="font-medium">${selectedEstado.total_neto?.toLocaleString("es-CL")}</span>
                  </p>
                  {(selectedEstado.total_iva ?? 0) > 0 && (
                    <p className="text-sm">
                      IVA (19%): <span className="font-medium">${selectedEstado.total_iva?.toLocaleString("es-CL")}</span>
                    </p>
                  )}
                  {(selectedEstado.total_iva ?? 0) === 0 && (
                    <p className="text-sm text-muted-foreground">Exento de IVA</p>
                  )}
                  <p className="text-lg font-bold">
                    Total: ${selectedEstado.total?.toLocaleString("es-CL")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm delete dialog */}
      <AlertDialog open={!!estadoToDelete} onOpenChange={() => setEstadoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estado de pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el Estado de Pago N° {estadoToDelete?.numero} y todos sus ítems. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEstado} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EmpresaLayout>
  );
};

export default EmpresaEstadosPago;
