import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, Eye, Pencil, Search, Settings, Calendar, X, Clock, MessageSquare, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import CotizacionForm from "@/components/cotizacion/CotizacionForm";
import MargenesConfig from "@/components/cotizacion/MargenesConfig";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";

interface Cotizacion {
  id: string;
  numero_cotizacion: number;
  fecha_cotizacion: string;
  empresa_nombre: string | null;
  empresa_rut: string | null;
  subtotal_neto: number;
  total_iva: number;
  total_con_iva: number;
  total_con_margen: number;
  estado: string;
  created_at: string;
}

interface SolicitudCotizacion {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  created_at: string;
  empresa: {
    id: string;
    nombre: string;
  } | null;
  faena: {
    id: string;
    nombre: string;
  } | null;
  items: {
    id: string;
    cantidad_estimada: number | null;
    paquete: { id: string; nombre: string } | null;
    examen: { id: string; nombre: string } | null;
  }[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
};

const getEstadoBadge = (estado: string) => {
  const estados: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    borrador: { label: "Borrador", variant: "secondary" },
    enviada: { label: "Enviada", variant: "default" },
    aceptada: { label: "Aceptada", variant: "default" },
    rechazada: { label: "Rechazada", variant: "destructive" },
  };
  const config = estados[estado] || { label: estado, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const Cotizaciones = () => {
  useAuth();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudCotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(true);
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openMargenesDialog, setOpenMargenesDialog] = useState(false);
  const [cotizacionToDelete, setCotizacionToDelete] = useState<string | null>(null);
  const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null);
  const [respondingSolicitud, setRespondingSolicitud] = useState<SolicitudCotizacion | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState<string>("all");
  const [dateFilterType, setDateFilterType] = useState<"none" | "single" | "range">("none");
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  // Get unique empresas for filter
  const empresasUnicas = Array.from(new Set(cotizaciones.map(c => c.empresa_nombre).filter(Boolean))) as string[];
  useEffect(() => {
    loadCotizaciones();
    loadSolicitudes();
  }, []);

  const loadSolicitudes = async () => {
    try {
      setLoadingSolicitudes(true);
      const { data, error } = await supabase
        .from("cotizacion_solicitudes")
        .select(`
          id,
          titulo,
          descripcion,
          estado,
          created_at,
          empresa:empresas(id, nombre),
          faena:faenas(id, nombre),
          items:cotizacion_solicitud_items(
            id,
            cantidad_estimada,
            paquete:paquetes_examenes(id, nombre),
            examen:examenes(id, nombre)
          )
        `)
        .eq("estado", "pendiente")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error) {
      console.error("Error loading solicitudes:", error);
      toast.error("Error al cargar solicitudes pendientes");
    } finally {
      setLoadingSolicitudes(false);
    }
  };

  const loadCotizaciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cotizaciones")
        .select("*")
        .order("numero_cotizacion", { ascending: false });

      if (error) throw error;
      setCotizaciones(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar cotizaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCotizacion = async () => {
    if (!cotizacionToDelete) return;

    try {
      const { error } = await supabase
        .from("cotizaciones")
        .delete()
        .eq("id", cotizacionToDelete);

      if (error) throw error;
      
      toast.success("Cotización eliminada exitosamente");
      setCotizacionToDelete(null);
      loadCotizaciones();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar cotización");
    }
  };

  const filteredCotizaciones = cotizaciones.filter((c) => {
    // Text search filter
    const matchesSearch =
      c.empresa_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.empresa_rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numero_cotizacion.toString().includes(searchTerm);

    // Empresa filter
    const matchesEmpresa = filterEmpresa === "all" || c.empresa_nombre === filterEmpresa;

    // Date filter
    let matchesDate = true;
    if (dateFilterType === "single" && singleDate) {
      const cotizacionDate = new Date(c.fecha_cotizacion);
      matchesDate = format(cotizacionDate, "yyyy-MM-dd") === format(singleDate, "yyyy-MM-dd");
    } else if (dateFilterType === "range" && dateRange.from && dateRange.to) {
      const cotizacionDate = new Date(c.fecha_cotizacion);
      matchesDate = isWithinInterval(cotizacionDate, {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to),
      });
    }

    return matchesSearch && matchesEmpresa && matchesDate;
  });

  const clearDateFilter = () => {
    setDateFilterType("none");
    setSingleDate(undefined);
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Cotizaciones</h1>
            <p className="text-muted-foreground">Gestiona cotizaciones para empresas</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={openMargenesDialog} onOpenChange={setOpenMargenesDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Configurar Márgenes
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurar Márgenes de Cotización</DialogTitle>
                </DialogHeader>
                <MargenesConfig onClose={() => setOpenMargenesDialog(false)} />
              </DialogContent>
            </Dialog>

            <Dialog 
              open={openFormDialog} 
              onOpenChange={(open) => {
                setOpenFormDialog(open);
                if (!open) {
                  setEditingCotizacion(null);
                  setRespondingSolicitud(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nueva Cotización
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCotizacion 
                      ? `Editar Cotización #${editingCotizacion.numero_cotizacion}` 
                      : respondingSolicitud
                        ? `Responder Solicitud: ${respondingSolicitud.titulo}`
                        : "Nueva Cotización"}
                  </DialogTitle>
                </DialogHeader>
                <CotizacionForm 
                  cotizacionId={editingCotizacion?.id}
                  solicitudId={respondingSolicitud?.id}
                  onSuccess={() => {
                    setOpenFormDialog(false);
                    setEditingCotizacion(null);
                    setRespondingSolicitud(null);
                    loadCotizaciones();
                    loadSolicitudes();
                  }}
                  onCancel={() => {
                    setOpenFormDialog(false);
                    setEditingCotizacion(null);
                    setRespondingSolicitud(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Solicitudes Pendientes Section */}
        {solicitudes.length > 0 && (
          <Card className="mb-6 border-accent/50 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent-foreground">
                <Clock className="h-5 w-5 text-accent" />
                Solicitudes de Cotización Pendientes ({solicitudes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSolicitudes ? (
                <div className="text-center py-4 text-muted-foreground">Cargando...</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {solicitudes.map((solicitud) => (
                    <Card key={solicitud.id} className="border bg-card">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{solicitud.empresa?.nombre || "Sin empresa"}</span>
                          </div>
                          <Badge variant="secondary">
                            Pendiente
                          </Badge>
                        </div>
                        <h4 className="font-semibold mb-1">{solicitud.titulo}</h4>
                        {solicitud.faena && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Faena: {solicitud.faena.nombre}
                          </p>
                        )}
                        {solicitud.descripcion && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {solicitud.descripcion}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground mb-3">
                          <strong>Items solicitados:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {solicitud.items.slice(0, 3).map((item) => (
                              <li key={item.id}>
                                {item.paquete?.nombre || item.examen?.nombre || "Item"}
                                {item.cantidad_estimada ? ` (x${item.cantidad_estimada})` : ""}
                              </li>
                            ))}
                            {solicitud.items.length > 3 && (
                              <li className="text-muted-foreground">
                                +{solicitud.items.length - 3} más...
                              </li>
                            )}
                          </ul>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(solicitud.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              setRespondingSolicitud(solicitud);
                              setOpenFormDialog(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Responder
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Listado de Cotizaciones
                </CardTitle>
              </div>
              
              {/* Filters Row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por empresa o número..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Empresa Filter */}
                <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las empresas</SelectItem>
                    {empresasUnicas.map((empresa) => (
                      <SelectItem key={empresa} value={empresa}>
                        {empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date Filter Type */}
                <Select value={dateFilterType} onValueChange={(v) => setDateFilterType(v as "none" | "single" | "range")}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filtro de fecha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin filtro fecha</SelectItem>
                    <SelectItem value="single">Fecha específica</SelectItem>
                    <SelectItem value="range">Rango de fechas</SelectItem>
                  </SelectContent>
                </Select>

                {/* Single Date Picker */}
                {dateFilterType === "single" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-40 justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {singleDate ? format(singleDate, "dd/MM/yyyy") : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={singleDate}
                        onSelect={setSingleDate}
                        initialFocus
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                )}

                {/* Date Range Pickers */}
                {dateFilterType === "range" && (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-36 justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateRange.from ? format(dateRange.from, "dd/MM/yyyy") : "Desde"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-36 justify-start text-left font-normal">
                          <Calendar className="mr-2 h-4 w-4" />
                          {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "Hasta"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </>
                )}

                {/* Clear Date Filter */}
                {dateFilterType !== "none" && (
                  <Button variant="ghost" size="icon" onClick={clearDateFilter} title="Limpiar filtro de fecha">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : filteredCotizaciones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No se encontraron cotizaciones" : "No hay cotizaciones aún"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Nro.</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead className="text-right">Total Neto</TableHead>
                    <TableHead className="text-right">Total c/IVA</TableHead>
                    <TableHead className="text-right">Total Final</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCotizaciones.map((cotizacion) => (
                    <TableRow key={cotizacion.id}>
                      <TableCell className="font-mono font-medium">
                        {String(cotizacion.numero_cotizacion).padStart(4, "0")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(cotizacion.fecha_cotizacion), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">{cotizacion.empresa_nombre || "-"}</TableCell>
                      <TableCell>{cotizacion.empresa_rut || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cotizacion.subtotal_neto || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cotizacion.total_con_iva || 0)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(cotizacion.total_con_margen || 0)}</TableCell>
                      <TableCell>{getEstadoBadge(cotizacion.estado)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingCotizacion(cotizacion);
                              setOpenFormDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCotizacionToDelete(cotizacion.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!cotizacionToDelete} onOpenChange={() => setCotizacionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la cotización.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCotizacion}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Cotizaciones;
