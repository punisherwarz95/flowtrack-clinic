import { useState, useEffect, useMemo } from "react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar, CreditCard, FileText, DollarSign, Trash2, Package,
  Building2, TrendingUp, Search, Users, Download,
} from "lucide-react";
import { generateEstadoPagoPDF } from "@/components/cotizacion/EstadoPagoPDF";

interface Empresa {
  id: string;
  nombre: string;
  rut: string | null;
  afecto_iva: boolean;
}

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

interface EmpresaBateria {
  id: string;
  empresa_id: string;
  paquete_id: string;
  valor: number;
  paquete?: { nombre: string };
}

interface MonthlySale {
  mes: string;
  total_neto: number;
  total_iva: number;
  total: number;
  cantidad_estados: number;
}

interface Prestador {
  id: string;
  nombre: string;
  rut: string | null;
  especialidad: string | null;
  tipo: string;
}

interface PrestadorExamenDetail {
  atencion_examen_id: string;
  examen_nombre: string;
  paciente_nombre: string;
  paciente_rut: string | null;
  empresa_nombre: string | null;
  fecha_realizacion: string;
  valor_prestacion: number;
}

const EstadosPago = () => {
  useAuth();
  const { toast } = useToast();

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [activeTab, setActiveTab] = useState("estados");

  // Estados de pago
  const [estadosPago, setEstadosPago] = useState<EstadoPago[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEstado, setSelectedEstado] = useState<EstadoPago | null>(null);
  const [estadoToDelete, setEstadoToDelete] = useState<EstadoPago | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fechaDesde, setFechaDesde] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [fechaHasta, setFechaHasta] = useState(format(new Date(), "yyyy-MM-dd"));
  const [generando, setGenerando] = useState(false);

  // Baterías
  const [empresaBaterias, setEmpresaBaterias] = useState<EmpresaBateria[]>([]);
  const [bateriaPrecios, setBateriaPrecios] = useState<Record<string, string>>({});
  const [savingPrecios, setSavingPrecios] = useState(false);

  // Ventas mensuales
  const [ventasMensuales, setVentasMensuales] = useState<MonthlySale[]>([]);
  const [ventasLoading, setVentasLoading] = useState(false);

  // Prestadores
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [selectedPrestadorId, setSelectedPrestadorId] = useState<string>("");
  const [prestadorSearch, setPrestadorSearch] = useState("");
  const [prestadorFechaDesde, setPrestadorFechaDesde] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [prestadorFechaHasta, setPrestadorFechaHasta] = useState(format(new Date(), "yyyy-MM-dd"));
  const [prestadorExamenes, setPrestadorExamenes] = useState<PrestadorExamenDetail[]>([]);
  const [prestadorLoading, setPrestadorLoading] = useState(false);

  useEffect(() => {
    loadEmpresas();
    loadPrestadores();
  }, []);

  useEffect(() => {
    if (selectedEmpresaId) {
      loadEstadosPago();
      loadEmpresaBaterias();
    } else {
      setEstadosPago([]);
      setEmpresaBaterias([]);
      setSelectedEstado(null);
    }
  }, [selectedEmpresaId]);

  useEffect(() => {
    if (activeTab === "ventas") {
      loadVentasMensuales();
    }
  }, [activeTab]);

  const loadEmpresas = async () => {
    const { data } = await supabase
      .from("empresas")
      .select("id, nombre, rut, afecto_iva")
      .eq("activo", true)
      .order("nombre");
    setEmpresas(data || []);
  };

  const loadEstadosPago = async () => {
    if (!selectedEmpresaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("estados_pago")
        .select("*, items:estado_pago_items(*)")
        .eq("empresa_id", selectedEmpresaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setEstadosPago((data as unknown as EstadoPago[]) || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmpresaBaterias = async () => {
    if (!selectedEmpresaId) return;
    try {
      const { data } = await supabase
        .from("empresa_baterias")
        .select("*, paquete:paquetes_examenes(nombre)")
        .eq("empresa_id", selectedEmpresaId);

      // Filter by faenas
      const { data: efData } = await supabase
        .from("empresa_faenas")
        .select("faena_id")
        .eq("empresa_id", selectedEmpresaId)
        .eq("activo", true);

      const faenaIds = (efData || []).map((ef: any) => ef.faena_id);
      let validPaqueteIds = new Set<string>();
      if (faenaIds.length > 0) {
        const { data: bfData } = await supabase
          .from("bateria_faenas")
          .select("paquete_id")
          .in("faena_id", faenaIds)
          .neq("activo", false);
        (bfData || []).forEach((bf: any) => validPaqueteIds.add(bf.paquete_id));
      }

      const filtered = (data || []).filter((eb: any) => validPaqueteIds.has(eb.paquete_id));
      setEmpresaBaterias(filtered);
      const precios: Record<string, string> = {};
      filtered.forEach((eb: any) => { precios[eb.paquete_id] = eb.valor?.toString() || ""; });
      setBateriaPrecios(precios);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadVentasMensuales = async () => {
    setVentasLoading(true);
    try {
      const { data, error } = await supabase
        .from("estados_pago")
        .select("fecha_desde, total_neto, total_iva, total, empresa_id")
        .order("fecha_desde", { ascending: false });
      if (error) throw error;

      const monthMap: Record<string, MonthlySale> = {};
      (data || []).forEach((ep: any) => {
        const mes = ep.fecha_desde?.substring(0, 7); // yyyy-MM
        if (!mes) return;
        if (!monthMap[mes]) {
          monthMap[mes] = { mes, total_neto: 0, total_iva: 0, total: 0, cantidad_estados: 0 };
        }
        monthMap[mes].total_neto += ep.total_neto || 0;
        monthMap[mes].total_iva += ep.total_iva || 0;
        monthMap[mes].total += ep.total || 0;
        monthMap[mes].cantidad_estados += 1;
      });

      setVentasMensuales(Object.values(monthMap).sort((a, b) => b.mes.localeCompare(a.mes)));
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setVentasLoading(false);
    }
  };

  const loadPrestadores = async () => {
    const { data } = await supabase
      .from("prestadores")
      .select("id, nombre, rut, especialidad, tipo")
      .eq("activo", true)
      .order("nombre");
    setPrestadores(data || []);
  };

  const handleBuscarPrestadorExamenes = async () => {
    if (!selectedPrestadorId) return;
    setPrestadorLoading(true);
    try {
      // Get the prestador's user_id (realizado_por stores auth user id, not prestador id)
      const selectedPrestador = prestadores.find(p => p.id === selectedPrestadorId);
      
      // Get prestador_examenes for this prestador (valor_prestacion per exam)
      const { data: peData } = await supabase
        .from("prestador_examenes")
        .select("examen_id, valor_prestacion")
        .eq("prestador_id", selectedPrestadorId);

      const valorMap: Record<string, number> = {};
      const examenIds = new Set<string>();
      (peData || []).forEach((pe: any) => { 
        valorMap[pe.examen_id] = pe.valor_prestacion || 0;
        examenIds.add(pe.examen_id);
      });

      // Look up prestador's user_id from the prestadores table
      const { data: prestadorData } = await supabase
        .from("prestadores")
        .select("user_id")
        .eq("id", selectedPrestadorId)
        .single();

      const prestadorUserId = prestadorData?.user_id;

      // Build the query for atencion_examenes
      let query = supabase
        .from("atencion_examenes")
        .select(`
          id,
          examen_id,
          fecha_realizacion,
          realizado_por,
          examen:examenes(nombre),
          atencion:atenciones(
            id,
            fecha_ingreso,
            paciente:pacientes(nombre, rut, empresa:empresas(nombre))
          )
        `)
        .in("estado", ["completado", "muestra_tomada"])
        .gte("fecha_realizacion", `${prestadorFechaDesde}T00:00:00`)
        .lte("fecha_realizacion", `${prestadorFechaHasta}T23:59:59`);

      // Filter by user_id if prestador has one, otherwise filter by examen_ids assigned to this prestador
      if (prestadorUserId) {
        query = query.eq("realizado_por", prestadorUserId);
      } else if (examenIds.size > 0) {
        // Fallback: filter by exams this prestador is assigned to
        query = query.in("examen_id", Array.from(examenIds));
      } else {
        setPrestadorExamenes([]);
        setPrestadorLoading(false);
        return;
      }

      const { data: aeData, error } = await query;

      if (error) throw error;

      const details: PrestadorExamenDetail[] = (aeData || []).map((ae: any) => ({
        atencion_examen_id: ae.id,
        examen_nombre: ae.examen?.nombre || "Examen",
        paciente_nombre: ae.atencion?.paciente?.nombre || "-",
        paciente_rut: ae.atencion?.paciente?.rut || null,
        empresa_nombre: ae.atencion?.paciente?.empresa?.nombre || null,
        fecha_realizacion: ae.fecha_realizacion?.split("T")[0] || "",
        valor_prestacion: valorMap[ae.examen_id] || 0,
      }));

      details.sort((a, b) => a.fecha_realizacion.localeCompare(b.fecha_realizacion));
      setPrestadorExamenes(details);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error al cargar exámenes del prestador", variant: "destructive" });
    } finally {
      setPrestadorLoading(false);
    }
  };

  const filteredPrestadores = prestadores.filter(p =>
    p.nombre.toLowerCase().includes(prestadorSearch.toLowerCase()) ||
    (p.rut && p.rut.toLowerCase().includes(prestadorSearch.toLowerCase()))
  );

  const prestadorTotalPagar = useMemo(() => {
    return prestadorExamenes.reduce((sum, pe) => sum + pe.valor_prestacion, 0);
  }, [prestadorExamenes]);

  const prestadorResumen = useMemo(() => {
    const map: Record<string, { nombre: string; cantidad: number; valorUnitario: number }> = {};
    prestadorExamenes.forEach(pe => {
      if (!map[pe.examen_nombre]) map[pe.examen_nombre] = { nombre: pe.examen_nombre, cantidad: 0, valorUnitario: pe.valor_prestacion };
      map[pe.examen_nombre].cantidad += 1;
    });
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [prestadorExamenes]);

  const handleGenerarEstado = async () => {
    if (!selectedEmpresaId) return;
    setGenerando(true);
    try {
      const empresa = empresas.find(e => e.id === selectedEmpresaId);
      const esAfectaIva = empresa?.afecto_iva !== false;

      const { data: pacientesEmpresa } = await supabase
        .from("pacientes")
        .select("id, nombre, rut, cargo, faena:faenas(nombre)")
        .eq("empresa_id", selectedEmpresaId);

      if (!pacientesEmpresa?.length) {
        toast({ title: "No hay pacientes registrados para esta empresa", variant: "destructive" });
        setGenerando(false);
        return;
      }

      const pacienteIds = pacientesEmpresa.map(p => p.id);
      const pacientesMap = new Map(pacientesEmpresa.map(p => [p.id, p]));

      const { data: atenciones } = await supabase
        .from("atenciones")
        .select("id, paciente_id, fecha_ingreso, estado")
        .in("paciente_id", pacienteIds)
        .eq("estado", "completado")
        .gte("fecha_ingreso", `${fechaDesde}T00:00:00`)
        .lte("fecha_ingreso", `${fechaHasta}T23:59:59`);

      if (!atenciones?.length) {
        toast({ title: "No hay atenciones completadas en el período", variant: "destructive" });
        setGenerando(false);
        return;
      }

      const atencionIds = atenciones.map(a => a.id);
      const { data: atencionBaterias } = await supabase
        .from("atencion_baterias")
        .select("atencion_id, paquete_id, paquete:paquetes_examenes(id, nombre)")
        .in("atencion_id", atencionIds);

      const bateriasPorAtencion: Record<string, { paquete_id: string; nombre: string }[]> = {};
      (atencionBaterias || []).forEach((ab: any) => {
        if (!bateriasPorAtencion[ab.atencion_id]) bateriasPorAtencion[ab.atencion_id] = [];
        bateriasPorAtencion[ab.atencion_id].push({ paquete_id: ab.paquete_id, nombre: ab.paquete?.nombre || "Batería" });
      });

      const { data: ebData } = await supabase
        .from("empresa_baterias")
        .select("paquete_id, valor")
        .eq("empresa_id", selectedEmpresaId);
      const bateriaValores: Record<string, number> = {};
      ebData?.forEach((eb: any) => { bateriaValores[eb.paquete_id] = eb.valor || 0; });

      let totalNeto = 0;
      const items: any[] = [];

      atenciones.forEach((atencion: any) => {
        const paciente = pacientesMap.get(atencion.paciente_id);
        if (!paciente) return;
        const bateriasConValor: { nombre: string; valor: number }[] = [];
        let subtotal = 0;
        (bateriasPorAtencion[atencion.id] || []).forEach(b => {
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

      if (!items.length) {
        toast({ title: "No se encontraron ítems válidos", variant: "destructive" });
        setGenerando(false);
        return;
      }

      const totalIva = esAfectaIva ? Math.ceil(totalNeto * 0.19) : 0;
      const total = totalNeto + totalIva;

      const { data: numData } = await supabase
        .from("estados_pago")
        .select("numero")
        .eq("empresa_id", selectedEmpresaId)
        .order("numero", { ascending: false })
        .limit(1);
      const nextNum = ((numData?.[0] as any)?.numero || 0) + 1;

      const { data: estadoPago, error: estadoError } = await supabase
        .from("estados_pago")
        .insert({
          empresa_id: selectedEmpresaId,
          numero: nextNum,
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          total_neto: totalNeto,
          total_iva: totalIva,
          total,
          estado: "pendiente",
        })
        .select()
        .single();
      if (estadoError) throw estadoError;

      const { error: itemsError } = await supabase.from("estado_pago_items").insert(
        items.map(item => ({ estado_pago_id: estadoPago.id, ...item }))
      );
      if (itemsError) throw itemsError;

      toast({ title: `Estado de pago N° ${estadoPago.numero} generado con ${items.length} atenciones` });
      loadEstadosPago();
    } catch (error: any) {
      toast({ title: "Error al generar estado de pago", description: error.message, variant: "destructive" });
    } finally {
      setGenerando(false);
    }
  };

  const handleDeleteEstado = async () => {
    if (!estadoToDelete) return;
    setDeleting(true);
    try {
      await supabase.from("estado_pago_items").delete().eq("estado_pago_id", estadoToDelete.id);
      await supabase.from("estados_pago").delete().eq("id", estadoToDelete.id);
      toast({ title: `Estado de pago N° ${estadoToDelete.numero} eliminado` });
      if (selectedEstado?.id === estadoToDelete.id) setSelectedEstado(null);
      setEstadoToDelete(null);
      loadEstadosPago();
    } catch (error: any) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleSavePrecios = async () => {
    setSavingPrecios(true);
    try {
      for (const eb of empresaBaterias) {
        const newVal = parseFloat(bateriaPrecios[eb.paquete_id] || "0");
        if (newVal !== eb.valor) {
          await supabase.from("empresa_baterias").update({ valor: newVal }).eq("id", eb.id);
        }
      }
      toast({ title: "Precios actualizados correctamente" });
      loadEmpresaBaterias();
    } catch (error: any) {
      toast({ title: "Error al guardar precios", description: error.message, variant: "destructive" });
    } finally {
      setSavingPrecios(false);
    }
  };

  const bateriaSummary = useMemo(() => {
    if (!selectedEstado?.items) return [];
    const map: Record<string, { nombre: string; cantidad: number; valorUnitario: number }> = {};
    selectedEstado.items.forEach(item => {
      (item.baterias as any[] || []).forEach((b: { nombre: string; valor: number }) => {
        if (!map[b.nombre]) map[b.nombre] = { nombre: b.nombre, cantidad: 0, valorUnitario: b.valor };
        map[b.nombre].cantidad += 1;
      });
    });
    return Object.values(map).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [selectedEstado]);

  const filteredEmpresas = empresas.filter(e =>
    e.nombre.toLowerCase().includes(empresaSearch.toLowerCase()) ||
    (e.rut && e.rut.toLowerCase().includes(empresaSearch.toLowerCase()))
  );

  const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente": return <Badge variant="secondary">Pendiente</Badge>;
      case "enviado": return <Badge className="bg-blue-600 text-white">Enviado</Badge>;
      case "pagado": return <Badge className="bg-green-600 text-white">Pagado</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const ventasTotal = useMemo(() => {
    return ventasMensuales.reduce((acc, v) => ({
      total_neto: acc.total_neto + v.total_neto,
      total_iva: acc.total_iva + v.total_iva,
      total: acc.total + v.total,
      cantidad: acc.cantidad + v.cantidad_estados,
    }), { total_neto: 0, total_iva: 0, total: 0, cantidad: 0 });
  }, [ventasMensuales]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Estados de Pago
            </h1>
            <p className="text-muted-foreground">Gestión de facturación por empresa</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="estados">
              <FileText className="h-4 w-4 mr-1" /> Estados de Pago
            </TabsTrigger>
            <TabsTrigger value="ventas">
              <TrendingUp className="h-4 w-4 mr-1" /> Ventas Mensuales
            </TabsTrigger>
            <TabsTrigger value="precios">
              <DollarSign className="h-4 w-4 mr-1" /> Baterías y Precios
            </TabsTrigger>
            <TabsTrigger value="prestadores">
              <Users className="h-4 w-4 mr-1" /> Prestadores
            </TabsTrigger>
          </TabsList>

          {/* === TAB: Estados de Pago === */}
          <TabsContent value="estados" className="space-y-4">
            {/* Company selector */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 max-w-sm">
                    <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empresa..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2">
                          <Input
                            placeholder="Buscar empresa..."
                            value={empresaSearch}
                            onChange={(e) => setEmpresaSearch(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        {filteredEmpresas.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.nombre} {emp.rut ? `(${emp.rut})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedEmpresa && (
                    <Badge variant="outline">
                      {selectedEmpresa.afecto_iva ? "Afecto IVA" : "Exento IVA"}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {selectedEmpresaId && (
              <>
                {/* Generator */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Generar Nuevo Estado de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-end gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Desde</label>
                        <Input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Hasta</label>
                        <Input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                      </div>
                      <Button onClick={handleGenerarEstado} disabled={generando}>
                        {generando ? "Generando..." : <><FileText className="h-4 w-4 mr-2" />Generar Estado</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Estados de Pago - {selectedEmpresa?.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      </div>
                    ) : estadosPago.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No hay estados de pago generados</div>
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
                            {estadosPago.map(estado => (
                              <TableRow key={estado.id}>
                                <TableCell className="font-medium">{estado.numero}</TableCell>
                                <TableCell>
                                  {format(new Date(estado.fecha_desde + "T12:00:00"), "dd/MM/yyyy")} - {format(new Date(estado.fecha_hasta + "T12:00:00"), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>{estado.items?.length || 0}</TableCell>
                                <TableCell className="text-right">${estado.total_neto?.toLocaleString("es-CL") || 0}</TableCell>
                                <TableCell className="text-right">
                                  {(estado.total_iva ?? 0) > 0
                                    ? `$${estado.total_iva?.toLocaleString("es-CL")}`
                                    : <span className="text-muted-foreground text-xs">Exento</span>}
                                </TableCell>
                                <TableCell className="text-right font-bold">${estado.total?.toLocaleString("es-CL") || 0}</TableCell>
                                <TableCell>{getEstadoBadge(estado.estado)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedEstado(estado)}>Ver detalle</Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setEstadoToDelete(estado)}>
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

                {/* Detail */}
                {selectedEstado && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="h-4 w-4" /> Detalle Estado N° {selectedEstado.numero}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            if (!selectedEstado || !selectedEmpresa) return;
                            generateEstadoPagoPDF({
                              numero: selectedEstado.numero,
                              fecha_desde: selectedEstado.fecha_desde,
                              fecha_hasta: selectedEstado.fecha_hasta,
                              empresa_nombre: selectedEmpresa.nombre,
                              empresa_rut: selectedEmpresa.rut,
                              total_neto: selectedEstado.total_neto,
                              total_iva: selectedEstado.total_iva,
                              total: selectedEstado.total,
                              items: selectedEstado.items || [],
                              bateriaSummary,
                              afecto_iva: selectedEmpresa.afecto_iva,
                            });
                          }}>
                            <Download className="h-4 w-4 mr-1" /> Exportar PDF
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSelectedEstado(null)}>Cerrar</Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
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
                            {selectedEstado.items?.map(item => (
                              <TableRow key={item.id}>
                                <TableCell>{format(new Date(item.fecha_atencion + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                                <TableCell className="font-medium">{item.paciente_nombre}</TableCell>
                                <TableCell className="font-mono text-sm">{item.paciente_rut || "-"}</TableCell>
                                <TableCell>{item.cargo || "-"}</TableCell>
                                <TableCell>{item.faena || "-"}</TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {(item.baterias as any[])?.map((b, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">{b.nombre}</Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">${item.subtotal?.toLocaleString("es-CL") || 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {bateriaSummary.length > 0 && (
                        <Card className="border-dashed">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Package className="h-4 w-4" /> Resumen por Batería
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
                                  {bateriaSummary.map(b => (
                                    <TableRow key={b.nombre}>
                                      <TableCell className="font-medium">{b.nombre}</TableCell>
                                      <TableCell className="text-center">{b.cantidad.toString().padStart(2, "0")}</TableCell>
                                      <TableCell className="text-right">${b.valorUnitario.toLocaleString("es-CL")}</TableCell>
                                      <TableCell className="text-right font-semibold">${(b.cantidad * b.valorUnitario).toLocaleString("es-CL")}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      <div className="flex justify-end">
                        <div className="text-right space-y-1">
                          <p className="text-sm">Neto: <span className="font-medium">${selectedEstado.total_neto?.toLocaleString("es-CL")}</span></p>
                          {(selectedEstado.total_iva ?? 0) > 0 && (
                            <p className="text-sm">IVA (19%): <span className="font-medium">${selectedEstado.total_iva?.toLocaleString("es-CL")}</span></p>
                          )}
                          {(selectedEstado.total_iva ?? 0) === 0 && <p className="text-sm text-muted-foreground">Exento de IVA</p>}
                          <p className="text-lg font-bold">Total: ${selectedEstado.total?.toLocaleString("es-CL")}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* === TAB: Ventas Mensuales === */}
          <TabsContent value="ventas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Resumen de Ventas por Mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ventasLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : ventasMensuales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No hay datos de ventas</div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mes</TableHead>
                            <TableHead className="text-center">Estados Generados</TableHead>
                            <TableHead className="text-right">Neto</TableHead>
                            <TableHead className="text-right">IVA</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ventasMensuales.map(v => {
                            const [year, month] = v.mes.split("-");
                            const mesLabel = format(new Date(parseInt(year), parseInt(month) - 1, 1), "MMMM yyyy", { locale: es });
                            return (
                              <TableRow key={v.mes}>
                                <TableCell className="font-medium capitalize">{mesLabel}</TableCell>
                                <TableCell className="text-center">{v.cantidad_estados}</TableCell>
                                <TableCell className="text-right">${v.total_neto.toLocaleString("es-CL")}</TableCell>
                                <TableCell className="text-right">${v.total_iva.toLocaleString("es-CL")}</TableCell>
                                <TableCell className="text-right font-bold">${v.total.toLocaleString("es-CL")}</TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-center">{ventasTotal.cantidad}</TableCell>
                            <TableCell className="text-right">${ventasTotal.total_neto.toLocaleString("es-CL")}</TableCell>
                            <TableCell className="text-right">${ventasTotal.total_iva.toLocaleString("es-CL")}</TableCell>
                            <TableCell className="text-right">${ventasTotal.total.toLocaleString("es-CL")}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TAB: Baterías y Precios === */}
          <TabsContent value="precios" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 max-w-sm">
                    <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empresa..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2">
                          <Input
                            placeholder="Buscar empresa..."
                            value={empresaSearch}
                            onChange={(e) => setEmpresaSearch(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        {filteredEmpresas.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.nombre} {emp.rut ? `(${emp.rut})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {selectedEmpresaId && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" /> Baterías y Precios - {selectedEmpresa?.nombre}
                    </CardTitle>
                    <Button onClick={handleSavePrecios} disabled={savingPrecios} size="sm">
                      {savingPrecios ? "Guardando..." : "Guardar Precios"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {empresaBaterias.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay baterías asignadas a esta empresa (verifique las faenas asignadas)
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Batería</TableHead>
                            <TableHead className="w-[200px]">Valor Neto ($)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {empresaBaterias.map(eb => (
                            <TableRow key={eb.id}>
                              <TableCell className="font-medium">{eb.paquete?.nombre || "Sin nombre"}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={bateriaPrecios[eb.paquete_id] || ""}
                                  onChange={e => setBateriaPrecios(prev => ({ ...prev, [eb.paquete_id]: e.target.value }))}
                                  className="w-[150px] h-8"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* === TAB: Prestadores === */}
          <TabsContent value="prestadores" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px] max-w-sm">
                    <label className="text-sm font-medium mb-1 block">Prestador</label>
                    <Select value={selectedPrestadorId} onValueChange={setSelectedPrestadorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar prestador..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2">
                          <Input
                            placeholder="Buscar prestador..."
                            value={prestadorSearch}
                            onChange={(e) => setPrestadorSearch(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        {filteredPrestadores.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre} {p.especialidad ? `(${p.especialidad})` : ""} {p.rut ? `- ${p.rut}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Desde</label>
                    <Input type="date" value={prestadorFechaDesde} onChange={e => setPrestadorFechaDesde(e.target.value)} className="w-[160px]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Hasta</label>
                    <Input type="date" value={prestadorFechaHasta} onChange={e => setPrestadorFechaHasta(e.target.value)} className="w-[160px]" />
                  </div>
                  <Button onClick={handleBuscarPrestadorExamenes} disabled={!selectedPrestadorId || prestadorLoading}>
                    {prestadorLoading ? "Buscando..." : <><Search className="h-4 w-4 mr-2" />Buscar</>}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {prestadorExamenes.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Exámenes realizados - {prestadores.find(p => p.id === selectedPrestadorId)?.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Paciente</TableHead>
                            <TableHead>RUT</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Examen</TableHead>
                            <TableHead className="text-right">Valor Prestación</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {prestadorExamenes.map((pe, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{pe.fecha_realizacion ? format(new Date(pe.fecha_realizacion + "T12:00:00"), "dd/MM/yyyy") : "-"}</TableCell>
                              <TableCell className="font-medium">{pe.paciente_nombre}</TableCell>
                              <TableCell className="font-mono text-sm">{pe.paciente_rut || "-"}</TableCell>
                              <TableCell>{pe.empresa_nombre || "-"}</TableCell>
                              <TableCell>{pe.examen_nombre}</TableCell>
                              <TableCell className="text-right">${pe.valor_prestacion.toLocaleString("es-CL")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Resumen */}
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" /> Resumen por Examen
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Examen</TableHead>
                            <TableHead className="text-center">Cantidad</TableHead>
                            <TableHead className="text-right">Valor Unitario</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {prestadorResumen.map(r => (
                            <TableRow key={r.nombre}>
                              <TableCell className="font-medium">{r.nombre}</TableCell>
                              <TableCell className="text-center">{r.cantidad.toString().padStart(2, "0")}</TableCell>
                              <TableCell className="text-right">${r.valorUnitario.toLocaleString("es-CL")}</TableCell>
                              <TableCell className="text-right font-semibold">${(r.cantidad * r.valorUnitario).toLocaleString("es-CL")}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-muted/50 font-bold">
                            <TableCell>TOTAL A PAGAR</TableCell>
                            <TableCell className="text-center">{prestadorExamenes.length}</TableCell>
                            <TableCell />
                            <TableCell className="text-right text-lg">${prestadorTotalPagar.toLocaleString("es-CL")}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {selectedPrestadorId && !prestadorLoading && prestadorExamenes.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No se encontraron exámenes realizados por este prestador en el período seleccionado
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete dialog */}
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
    </div>
  );
};

export default EstadosPago;
