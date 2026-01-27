import { useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Calendar,
  Download,
  CreditCard,
  FileText,
  DollarSign,
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
  const { empresaUsuario } = useEmpresaAuth();
  const { toast } = useToast();

  const [estadosPago, setEstadosPago] = useState<EstadoPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEstado, setSelectedEstado] = useState<EstadoPago | null>(null);

  // Generador de estado
  const [fechaDesde, setFechaDesde] = useState(
    format(new Date(new Date().setDate(1)), "yyyy-MM-dd")
  );
  const [fechaHasta, setFechaHasta] = useState(format(new Date(), "yyyy-MM-dd"));
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (empresaUsuario?.empresa_id) {
      loadEstadosPago();
    }
  }, [empresaUsuario?.empresa_id]);

  const loadEstadosPago = async () => {
    if (!empresaUsuario?.empresa_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("estados_pago")
        .select(`
          *,
          items:estado_pago_items(*)
        `)
        .eq("empresa_id", empresaUsuario.empresa_id)
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
    if (!empresaUsuario?.empresa_id) return;

    setGenerando(true);
    try {
      // Obtener atenciones del período
      const { data: atenciones, error: atencionesError } = await supabase
        .from("prereservas")
        .select(`
          *,
          faena:faenas(nombre),
          baterias:prereserva_baterias(paquete:paquetes_examenes(nombre)),
          atencion:atenciones(id, fecha_fin_atencion)
        `)
        .eq("empresa_id", empresaUsuario.empresa_id)
        .eq("estado", "atendido")
        .gte("fecha", fechaDesde)
        .lte("fecha", fechaHasta);

      if (atencionesError) throw atencionesError;

      if (!atenciones || atenciones.length === 0) {
        toast({ title: "No hay atenciones en el período seleccionado", variant: "destructive" });
        setGenerando(false);
        return;
      }

      // Obtener valores de baterías para la empresa
      const { data: empresaBaterias } = await supabase
        .from("empresa_baterias")
        .select("paquete_id, valor")
        .eq("empresa_id", empresaUsuario.empresa_id);

      const bateriaValores: Record<string, number> = {};
      empresaBaterias?.forEach((eb: any) => {
        bateriaValores[eb.paquete_id] = eb.valor;
      });

      // Calcular items y totales
      let totalNeto = 0;
      const items: any[] = [];

      atenciones.forEach((atencion: any) => {
        const bateriasConValor: { nombre: string; valor: number }[] = [];
        let subtotal = 0;

        atencion.baterias?.forEach((b: any) => {
          const valor = bateriaValores[b.paquete?.id] || 0;
          bateriasConValor.push({ nombre: b.paquete?.nombre || "", valor });
          subtotal += valor;
        });

        totalNeto += subtotal;

        items.push({
          paciente_nombre: atencion.nombre,
          paciente_rut: atencion.rut,
          cargo: atencion.cargo,
          faena: atencion.faena?.nombre,
          fecha_atencion: atencion.fecha,
          baterias: bateriasConValor,
          subtotal,
        });
      });

      const totalIva = totalNeto * 0.19;
      const total = totalNeto + totalIva;

      // Crear estado de pago
      const { data: estadoPago, error: estadoError } = await supabase
        .from("estados_pago")
        .insert({
          empresa_id: empresaUsuario.empresa_id,
          numero: await getNextNumero(),
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          total_neto: totalNeto,
          total_iva: totalIva,
          total: total,
          estado: "pendiente",
          created_by: empresaUsuario.auth_user_id,
        })
        .select()
        .single();

      if (estadoError) throw estadoError;

      // Crear items
      const itemsInsert = items.map((item) => ({
        estado_pago_id: estadoPago.id,
        atencion_id: atenciones.find((a: any) => a.nombre === item.paciente_nombre)?.atencion?.id,
        ...item,
      }));

      await supabase.from("estado_pago_items").insert(itemsInsert);

      toast({ title: "Estado de pago generado exitosamente" });
      loadEstadosPago();
    } catch (error: any) {
      console.error("Error generando estado de pago:", error);
      toast({ title: "Error al generar estado de pago", variant: "destructive" });
    } finally {
      setGenerando(false);
    }
  };

  const getNextNumero = async (): Promise<number> => {
    const { data } = await supabase
      .from("estados_pago")
      .select("numero")
      .eq("empresa_id", empresaUsuario?.empresa_id)
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
                          ${estado.total_iva?.toLocaleString("es-CL") || 0}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${estado.total?.toLocaleString("es-CL") || 0}
                        </TableCell>
                        <TableCell>{getEstadoBadge(estado.estado)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEstado(estado)}
                          >
                            Ver detalle
                          </Button>
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
            <CardContent>
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

              <div className="mt-4 flex justify-end">
                <div className="text-right space-y-1">
                  <p className="text-sm">
                    Neto: <span className="font-medium">${selectedEstado.total_neto?.toLocaleString("es-CL")}</span>
                  </p>
                  <p className="text-sm">
                    IVA (19%): <span className="font-medium">${selectedEstado.total_iva?.toLocaleString("es-CL")}</span>
                  </p>
                  <p className="text-lg font-bold">
                    Total: ${selectedEstado.total?.toLocaleString("es-CL")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </EmpresaLayout>
  );
};

export default EmpresaEstadosPago;
