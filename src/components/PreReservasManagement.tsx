import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatRutStandard } from "@/lib/utils";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar as CalendarIcon, Trash2, Ban, ChevronDown, ChevronRight, Users } from "lucide-react";

interface Prereserva {
  id: string;
  nombre: string;
  rut: string;
  cargo: string;
  estado: string;
  fecha: string;
  bloque_id: string;
  empresa_id: string;
  faena_id: string;
  agenda_bloques: { id: string; nombre: string; hora_inicio: string; hora_fin: string; cupo_maximo: number } | null;
  empresas: { id: string; nombre: string } | null;
  faenas: { id: string; nombre: string } | null;
  prereserva_baterias: Array<{ paquete_id: string; paquetes_examenes: { nombre: string } | null }>;
}

interface AgendaCupo {
  id: string;
  bloque_id: string;
  empresa_id: string;
  fecha: string;
  cupos_reservados: number;
}

interface Bloque {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number;
}

const PreReservasManagement = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [prereservas, setPrereservas] = useState<Prereserva[]>([]);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [cupos, setCupos] = useState<AgendaCupo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [blockCupo, setBlockCupo] = useState<{ bloqueId: string; empresaId: string; empresaNombre: string } | null>(null);
  const [expandedEmpresas, setExpandedEmpresas] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBloques();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadBloques = async () => {
    const { data } = await supabase
      .from("agenda_bloques")
      .select("*")
      .eq("activo", true)
      .order("orden");
    setBloques(data || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const fechaStr = format(selectedDate, "yyyy-MM-dd");

      const [prereservasRes, cuposRes] = await Promise.all([
        supabase
          .from("prereservas")
          .select(`
            *,
            agenda_bloques(*),
            empresas(*),
            faenas(*),
            prereserva_baterias(paquete_id, paquetes_examenes:paquete_id(nombre))
          `)
          .eq("fecha", fechaStr)
          .order("created_at", { ascending: false }),
        supabase
          .from("agenda_cupos")
          .select("*")
          .eq("fecha", fechaStr),
      ]);

      if (prereservasRes.error) throw prereservasRes.error;
      if (cuposRes.error) throw cuposRes.error;

      setPrereservas(prereservasRes.data || []);
      setCupos(cuposRes.data || []);

      // Auto-expand all empresas
      const empresaIds = new Set((prereservasRes.data || []).map((p: any) => p.empresa_id));
      setExpandedEmpresas(empresaIds);
    } catch (error) {
      console.error("Error loading prereservas:", error);
      toast.error("Error al cargar pre-reservas");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrereserva = async () => {
    if (!deleteId) return;

    try {
      // Delete prereserva_baterias first
      await supabase.from("prereserva_baterias").delete().eq("prereserva_id", deleteId);

      // Find the prereserva to update cupos
      const prereserva = prereservas.find(p => p.id === deleteId);

      const { error } = await supabase.from("prereservas").delete().eq("id", deleteId);
      if (error) throw error;

      // Decrement cupo
      if (prereserva) {
        const cupo = cupos.find(
          c => c.bloque_id === prereserva.bloque_id && c.empresa_id === prereserva.empresa_id
        );
        if (cupo && cupo.cupos_reservados > 0) {
          await supabase
            .from("agenda_cupos")
            .update({ cupos_reservados: cupo.cupos_reservados - 1 })
            .eq("id", cupo.id);
        }
      }

      toast.success("Pre-reserva eliminada");
      setDeleteId(null);
      loadData();
    } catch (error) {
      console.error("Error deleting prereserva:", error);
      toast.error("Error al eliminar pre-reserva");
    }
  };

  const handleBlockCupo = async () => {
    if (!blockCupo) return;

    try {
      const fechaStr = format(selectedDate, "yyyy-MM-dd");

      // Find existing cupo or create one
      const existingCupo = cupos.find(
        c => c.bloque_id === blockCupo.bloqueId && c.empresa_id === blockCupo.empresaId
      );

      if (existingCupo) {
        const bloque = bloques.find(b => b.id === blockCupo.bloqueId);
        if (bloque && existingCupo.cupos_reservados >= bloque.cupo_maximo) {
          toast.error("Este bloque ya está completo");
          setBlockCupo(null);
          return;
        }

        await supabase
          .from("agenda_cupos")
          .update({ cupos_reservados: existingCupo.cupos_reservados + 1 })
          .eq("id", existingCupo.id);
      } else {
        await supabase.from("agenda_cupos").insert({
          bloque_id: blockCupo.bloqueId,
          empresa_id: blockCupo.empresaId,
          fecha: fechaStr,
          cupos_reservados: 1,
        });
      }

      toast.success("Cupo bloqueado exitosamente");
      setBlockCupo(null);
      loadData();
    } catch (error) {
      console.error("Error blocking cupo:", error);
      toast.error("Error al bloquear cupo");
    }
  };

  // Group prereservas by empresa
  const prereservasByEmpresa = prereservas.reduce<Record<string, { nombre: string; prereservas: Prereserva[] }>>((acc, p) => {
    const empresaId = p.empresa_id;
    const empresaNombre = p.empresas?.nombre || "Sin empresa";
    if (!acc[empresaId]) {
      acc[empresaId] = { nombre: empresaNombre, prereservas: [] };
    }
    acc[empresaId].prereservas.push(p);
    return acc;
  }, {});

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge variant="secondary">Pendiente</Badge>;
      case "confirmado":
        return <Badge className="bg-green-500">Confirmado</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      case "atendido":
        return <Badge className="bg-blue-500">Atendido</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  const getCuposInfo = (bloqueId: string, empresaId: string) => {
    const bloque = bloques.find(b => b.id === bloqueId);
    const cupo = cupos.find(c => c.bloque_id === bloqueId && c.empresa_id === empresaId);
    const reservados = cupo?.cupos_reservados || 0;
    const maximo = bloque?.cupo_maximo || 0;
    return { reservados, maximo, disponibles: maximo - reservados };
  };

  const toggleEmpresa = (empresaId: string) => {
    setExpandedEmpresas(prev => {
      const next = new Set(prev);
      if (next.has(empresaId)) next.delete(empresaId);
      else next.add(empresaId);
      return next;
    });
  };

  // Get unique empresa IDs from prereservas for cupo blocking
  const empresasConPrereservas = Object.entries(prereservasByEmpresa);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pre-Reservas</h2>
          <p className="text-muted-foreground">Gestiona pre-reservas agrupadas por empresa</p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {format(selectedDate, "PPP", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              locale={es}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Cargando...</p>
      ) : empresasConPrereservas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay pre-reservas para esta fecha
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {empresasConPrereservas.map(([empresaId, { nombre, prereservas: empresaPrereservas }]) => {
            const isExpanded = expandedEmpresas.has(empresaId);

            // Group by bloque
            const byBloque = empresaPrereservas.reduce<Record<string, Prereserva[]>>((acc, p) => {
              const bloqueId = p.bloque_id;
              if (!acc[bloqueId]) acc[bloqueId] = [];
              acc[bloqueId].push(p);
              return acc;
            }, {});

            return (
              <Card key={empresaId}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleEmpresa(empresaId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{nombre}</CardTitle>
                      <Badge variant="outline">{empresaPrereservas.length} reservas</Badge>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4">
                    {Object.entries(byBloque).map(([bloqueId, bloquePrereservas]) => {
                      const bloque = bloques.find(b => b.id === bloqueId);
                      const cuposInfo = getCuposInfo(bloqueId, empresaId);
                      const bloqueNombre = bloque
                        ? `${bloque.nombre} (${bloque.hora_inicio.slice(0, 5)} - ${bloque.hora_fin.slice(0, 5)})`
                        : "Bloque desconocido";

                      return (
                        <div key={bloqueId} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{bloqueNombre}</span>
                              <Badge variant={cuposInfo.disponibles > 0 ? "outline" : "destructive"}>
                                {cuposInfo.reservados}/{cuposInfo.maximo} cupos
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setBlockCupo({ bloqueId, empresaId, empresaNombre: nombre })
                              }
                              disabled={cuposInfo.disponibles <= 0}
                              className="gap-1"
                            >
                              <Ban className="h-4 w-4" />
                              Bloquear cupo
                            </Button>
                          </div>

                          <div className="divide-y">
                            {bloquePrereservas.map((p) => (
                              <div key={p.id} className="flex items-center justify-between py-2 gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{p.nombre}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {formatRutStandard(p.rut)}
                                    </span>
                                    {getEstadoBadge(p.estado || "pendiente")}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex gap-3 flex-wrap">
                                    <span>Cargo: {p.cargo}</span>
                                    {p.faenas && <span>Faena: {p.faenas.nombre}</span>}
                                    {p.prereserva_baterias?.length > 0 && (
                                      <span>
                                        Baterías:{" "}
                                        {p.prereserva_baterias
                                          .map((b) => b.paquetes_examenes?.nombre || "—")
                                          .join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteId(p.id)}
                                  className="text-destructive hover:text-destructive shrink-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pre-reserva</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta pre-reserva? Se liberará el cupo asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePrereserva}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block cupo confirmation */}
      <AlertDialog open={!!blockCupo} onOpenChange={(o) => !o && setBlockCupo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear cupo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas bloquear un cupo disponible para {blockCupo?.empresaNombre}? Esto reducirá la disponibilidad sin crear una pre-reserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockCupo}>Bloquear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PreReservasManagement;
