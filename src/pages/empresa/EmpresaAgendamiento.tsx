import { useEffect, useState, useMemo } from "react";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import EmpresaLayout from "@/components/empresa/EmpresaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Calendar,
  Plus,
  Clock,
  Users,
  Trash2,
  Search,
} from "lucide-react";
import { formatRutStandard } from "@/lib/utils";

interface Bloque {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number;
}

interface Faena {
  id: string;
  nombre: string;
}

interface Bateria {
  id: string;
  nombre: string;
}

interface Prereserva {
  id: string;
  fecha: string;
  nombre: string;
  rut: string;
  cargo: string;
  estado: string;
  bloque: Bloque;
  faena: Faena;
  baterias: { paquete: Bateria }[];
}

interface CupoDisponible {
  bloque_id: string;
  cupo_disponible: number;
}

const EmpresaAgendamiento = () => {
  const { currentEmpresaId, empresaUsuario, isStaffAdmin } = useEmpresaAuth();
  const { toast } = useToast();

  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [faenas, setFaenas] = useState<Faena[]>([]);
  const [baterias, setBaterias] = useState<Bateria[]>([]);
  const [prereservas, setPrereservas] = useState<Prereserva[]>([]);
  const [cuposDisponibles, setCuposDisponibles] = useState<Record<string, number>>({});
  
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [formNombre, setFormNombre] = useState("");
  const [formRut, setFormRut] = useState("");
  const [formCargo, setFormCargo] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formBloqueId, setFormBloqueId] = useState("");
  const [formFaenaId, setFormFaenaId] = useState("");
  const [formBateriasSeleccionadas, setFormBateriasSeleccionadas] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (currentEmpresaId) {
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, [currentEmpresaId]);

  useEffect(() => {
    if (selectedDate && currentEmpresaId) {
      loadPrereservas();
      loadCuposDisponibles();
    }
  }, [selectedDate, currentEmpresaId]);

  useEffect(() => {
    if (formFaenaId) {
      loadBateriasForFaena(formFaenaId);
    }
  }, [formFaenaId]);

  const loadInitialData = async () => {
    if (!currentEmpresaId) return;

    try {
      // Cargar bloques
      const { data: bloquesData } = await supabase
        .from("agenda_bloques")
        .select("*")
        .eq("activo", true)
        .order("orden");

      setBloques(bloquesData || []);

      // Cargar faenas de la empresa
      const { data: faenasData } = await supabase
        .from("faenas")
        .select("*")
        .eq("empresa_id", currentEmpresaId)
        .eq("activo", true)
        .order("nombre");

      setFaenas(faenasData || []);
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrereservas = async () => {
    if (!currentEmpresaId) return;

    const { data } = await supabase
      .from("prereservas")
      .select(`
        *,
        bloque:agenda_bloques(*),
        faena:faenas(*),
        baterias:prereserva_baterias(paquete:paquetes_examenes(*))
      `)
      .eq("empresa_id", currentEmpresaId)
      .eq("fecha", selectedDate)
      .order("created_at", { ascending: false });

    setPrereservas((data as unknown as Prereserva[]) || []);
  };

  const loadCuposDisponibles = async () => {
    if (!currentEmpresaId) return;

    // Obtener cupos reservados para la fecha
    const { data: cuposData } = await supabase
      .from("agenda_cupos")
      .select("bloque_id, cupos_reservados")
      .eq("fecha", selectedDate);

    // Calcular cupos disponibles por bloque
    const cuposMap: Record<string, number> = {};
    bloques.forEach((bloque) => {
      const cupoReservado = cuposData?.find((c) => c.bloque_id === bloque.id)?.cupos_reservados || 0;
      cuposMap[bloque.id] = bloque.cupo_maximo - cupoReservado;
    });

    setCuposDisponibles(cuposMap);
  };

  const loadBateriasForFaena = async (faenaId: string) => {
    const { data } = await supabase
      .from("bateria_faenas")
      .select("paquete:paquetes_examenes(*)")
      .eq("faena_id", faenaId)
      .eq("activo", true);

    const bateriasFromFaena = data?.map((d: any) => d.paquete).filter(Boolean) || [];
    
    // Si no hay baterías específicas de faena, cargar todas las baterías de la empresa
    if (bateriasFromFaena.length === 0 && currentEmpresaId) {
      const { data: empresaBaterias } = await supabase
        .from("empresa_baterias")
        .select("paquete:paquetes_examenes(*)")
        .eq("empresa_id", currentEmpresaId)
        .eq("activo", true);

      setBaterias(empresaBaterias?.map((d: any) => d.paquete).filter(Boolean) || []);
    } else {
      setBaterias(bateriasFromFaena);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentEmpresaId) {
      toast({ title: "Seleccione una empresa primero", variant: "destructive" });
      return;
    }
      toast({ title: "Complete todos los campos obligatorios", variant: "destructive" });
      return;
    }

    if (formBateriasSeleccionadas.length === 0) {
      toast({ title: "Seleccione al menos una batería", variant: "destructive" });
      return;
    }

    // Verificar cupo disponible
    if ((cuposDisponibles[formBloqueId] || 0) <= 0) {
      toast({ title: "No hay cupos disponibles para este bloque", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      // Crear prereserva
      const { data: prereserva, error } = await supabase
        .from("prereservas")
        .insert({
          empresa_id: empresaUsuario?.empresa_id,
          bloque_id: formBloqueId,
          faena_id: formFaenaId,
          fecha: selectedDate,
          rut: formatRutStandard(formRut),
          nombre: formNombre,
          cargo: formCargo,
          email: formEmail || null,
          telefono: formTelefono || null,
          created_by: empresaUsuario?.id,
          estado: "pendiente",
        })
        .select()
        .single();

      if (error) throw error;

      // Crear baterías asociadas
      const bateriasInsert = formBateriasSeleccionadas.map((paqueteId) => ({
        prereserva_id: prereserva.id,
        paquete_id: paqueteId,
      }));

      await supabase.from("prereserva_baterias").insert(bateriasInsert);

      // Actualizar cupos
      const { data: existingCupo } = await supabase
        .from("agenda_cupos")
        .select("*")
        .eq("bloque_id", formBloqueId)
        .eq("empresa_id", empresaUsuario?.empresa_id)
        .eq("fecha", selectedDate)
        .limit(1);

      if (existingCupo && existingCupo.length > 0) {
        await supabase
          .from("agenda_cupos")
          .update({ cupos_reservados: existingCupo[0].cupos_reservados + 1 })
          .eq("id", existingCupo[0].id);
      } else {
        await supabase.from("agenda_cupos").insert({
          bloque_id: formBloqueId,
          empresa_id: empresaUsuario?.empresa_id,
          fecha: selectedDate,
          cupos_reservados: 1,
        });
      }

      toast({ title: "Pre-reserva creada exitosamente" });
      
      // Reset form
      setFormNombre("");
      setFormRut("");
      setFormCargo("");
      setFormEmail("");
      setFormTelefono("");
      setFormBloqueId("");
      setFormBateriasSeleccionadas([]);
      setDialogOpen(false);
      
      // Reload data
      loadPrereservas();
      loadCuposDisponibles();
    } catch (error: any) {
      console.error("Error creando prereserva:", error);
      toast({ title: "Error al crear pre-reserva", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPrereserva = async (id: string) => {
    if (!confirm("¿Está seguro de cancelar esta pre-reserva?")) return;

    try {
      await supabase
        .from("prereservas")
        .update({ estado: "cancelado" })
        .eq("id", id);

      toast({ title: "Pre-reserva cancelada" });
      loadPrereservas();
      loadCuposDisponibles();
    } catch (error) {
      console.error("Error cancelando prereserva:", error);
      toast({ title: "Error al cancelar", variant: "destructive" });
    }
  };

  const filteredPrereservas = useMemo(() => {
    if (!searchFilter) return prereservas;
    const search = searchFilter.toLowerCase();
    return prereservas.filter(
      (p) =>
        p.nombre.toLowerCase().includes(search) ||
        p.rut.toLowerCase().includes(search) ||
        p.cargo.toLowerCase().includes(search)
    );
  }, [prereservas, searchFilter]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return <Badge variant="secondary">Pendiente</Badge>;
      case "confirmado":
        return <Badge className="bg-blue-500">Confirmado</Badge>;
      case "atendido":
        return <Badge className="bg-green-500">Atendido</Badge>;
      case "cancelado":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <EmpresaLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Agendamiento de Pacientes</h1>
            <p className="text-muted-foreground">
              Gestione las pre-reservas de sus trabajadores
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Pre-reserva
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Pre-reserva</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha *</Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bloque Horario *</Label>
                    <Select value={formBloqueId} onValueChange={setFormBloqueId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar bloque" />
                      </SelectTrigger>
                      <SelectContent>
                        {bloques.filter((b) => b.id).map((bloque) => {
                          const cupoDisp = cuposDisponibles[bloque.id] || 0;
                          return (
                            <SelectItem
                              key={bloque.id}
                              value={bloque.id}
                              disabled={cupoDisp <= 0}
                            >
                              {bloque.nombre} ({bloque.hora_inicio} - {bloque.hora_fin}) 
                              - {cupoDisp} cupos
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Faena *</Label>
                  <Select value={formFaenaId} onValueChange={setFormFaenaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar faena" />
                    </SelectTrigger>
                    <SelectContent>
                      {faenas.filter((f) => f.id).map((faena) => (
                        <SelectItem key={faena.id} value={faena.id}>
                          {faena.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo *</Label>
                    <Input
                      value={formNombre}
                      onChange={(e) => setFormNombre(e.target.value)}
                      placeholder="Juan Pérez González"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>RUT *</Label>
                    <Input
                      value={formRut}
                      onChange={(e) => setFormRut(e.target.value)}
                      placeholder="12.345.678-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cargo *</Label>
                    <Input
                      value={formCargo}
                      onChange={(e) => setFormCargo(e.target.value)}
                      placeholder="Operador de maquinaria"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="trabajador@empresa.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    placeholder="+56 9 1234 5678"
                  />
                </div>

                {formFaenaId && (
                  <div className="space-y-2">
                    <Label>Baterías * (seleccione al menos 1)</Label>
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {baterias.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No hay baterías disponibles para esta faena
                        </p>
                      ) : (
                        baterias.map((bateria) => (
                          <div key={bateria.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={bateria.id}
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
                            <label htmlFor={bateria.id} className="text-sm cursor-pointer">
                              {bateria.nombre}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creando..." : "Crear Pre-reserva"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Selector de fecha y cupos */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha Seleccionada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </CardContent>
          </Card>

          {bloques.slice(0, 3).map((bloque) => (
            <Card key={bloque.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {bloque.nombre}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-1">
                  {bloque.hora_inicio} - {bloque.hora_fin}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">
                    {cuposDisponibles[bloque.id] || 0} / {bloque.cupo_maximo} disponibles
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lista de prereservas */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>
                Pre-reservas para {format(new Date(selectedDate + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, RUT..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPrereservas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay pre-reservas para esta fecha
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bloque</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>RUT</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Faena</TableHead>
                      <TableHead>Baterías</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[80px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrereservas.map((prereserva) => (
                      <TableRow key={prereserva.id}>
                        <TableCell>
                          <div className="text-sm">
                            {prereserva.bloque?.nombre}
                            <div className="text-xs text-muted-foreground">
                              {prereserva.bloque?.hora_inicio} - {prereserva.bloque?.hora_fin}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{prereserva.nombre}</TableCell>
                        <TableCell className="font-mono text-sm">{prereserva.rut}</TableCell>
                        <TableCell>{prereserva.cargo}</TableCell>
                        <TableCell>{prereserva.faena?.nombre}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {prereserva.baterias?.map((b) => (
                              <Badge key={b.paquete?.id} variant="outline" className="text-xs">
                                {b.paquete?.nombre}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{getEstadoBadge(prereserva.estado)}</TableCell>
                        <TableCell>
                          {prereserva.estado === "pendiente" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelPrereserva(prereserva.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EmpresaLayout>
  );
};

export default EmpresaAgendamiento;
