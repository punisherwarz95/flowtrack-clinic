import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, Eye, Pencil, Search, Settings } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import CotizacionForm from "@/components/cotizacion/CotizacionForm";
import MargenesConfig from "@/components/cotizacion/MargenesConfig";
import { format } from "date-fns";
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
  const [loading, setLoading] = useState(true);
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openMargenesDialog, setOpenMargenesDialog] = useState(false);
  const [cotizacionToDelete, setCotizacionToDelete] = useState<string | null>(null);
  const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadCotizaciones();
  }, []);

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

  const filteredCotizaciones = cotizaciones.filter(
    (c) =>
      c.empresa_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.empresa_rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numero_cotizacion.toString().includes(searchTerm)
  );

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
                if (!open) setEditingCotizacion(null);
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
                    {editingCotizacion ? `Editar Cotización #${editingCotizacion.numero_cotizacion}` : "Nueva Cotización"}
                  </DialogTitle>
                </DialogHeader>
                <CotizacionForm 
                  cotizacionId={editingCotizacion?.id}
                  onSuccess={() => {
                    setOpenFormDialog(false);
                    setEditingCotizacion(null);
                    loadCotizaciones();
                  }}
                  onCancel={() => {
                    setOpenFormDialog(false);
                    setEditingCotizacion(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Listado de Cotizaciones
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por empresa o número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
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
