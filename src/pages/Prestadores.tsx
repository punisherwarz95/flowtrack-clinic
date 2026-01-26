import { useState, useEffect, useMemo } from "react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, UserCheck, CalendarIcon, RefreshCw, Link2, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { GlobalChat } from "@/components/GlobalChat";

interface Prestador {
  id: string;
  nombre: string;
  rut: string | null;
  especialidad: string | null;
  telefono: string | null;
  email: string | null;
  user_id: string | null;
  activo: boolean;
  created_at: string;
}

interface PrestadorExamen {
  id: string;
  prestador_id: string;
  examen_id: string;
  valor_prestacion: number;
}

interface Examen {
  id: string;
  nombre: string;
  codigo: string | null;
}

interface User {
  id: string;
  username: string;
}

interface Reemplazo {
  id: string;
  prestador_original_id: string;
  prestador_reemplazo_id: string;
  fecha: string;
  motivo: string | null;
  created_at: string;
}

const Prestadores = () => {
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [reemplazos, setReemplazos] = useState<Reemplazo[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrestador, setEditingPrestador] = useState<Prestador | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prestadorToDelete, setPrestadorToDelete] = useState<Prestador | null>(null);
  const [reemplazoDialogOpen, setReemplazoDialogOpen] = useState(false);
  const [tarifasDialogOpen, setTarifasDialogOpen] = useState(false);
  const [selectedPrestadorTarifas, setSelectedPrestadorTarifas] = useState<Prestador | null>(null);
  const [prestadorExamenes, setPrestadorExamenes] = useState<PrestadorExamen[]>([]);

  // Form states
  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activo, setActivo] = useState(true);

  // Tarifas form
  const [selectedExamenes, setSelectedExamenes] = useState<{ [key: string]: number }>({});
  const [tarifaSearchFilter, setTarifaSearchFilter] = useState("");

  // Reemplazo form
  const [reemplazoOriginalId, setReemplazoOriginalId] = useState("");
  const [reemplazoReemplazoId, setReemplazoReemplazoId] = useState("");
  const [reemplazoFecha, setReemplazoFecha] = useState<Date | undefined>(new Date());
  const [reemplazoMotivo, setReemplazoMotivo] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPrestadores(), loadExamenes(), loadUsuarios(), loadReemplazos()]);
    setLoading(false);
  };

  const loadPrestadores = async () => {
    const { data, error } = await supabase
      .from("prestadores")
      .select("*")
      .order("nombre");

    if (error) {
      toast({ title: "Error al cargar prestadores", variant: "destructive" });
      return;
    }
    setPrestadores(data || []);
  };

  const loadExamenes = async () => {
    const { data, error } = await supabase
      .from("examenes")
      .select("id, nombre, codigo")
      .order("nombre");

    if (error) {
      toast({ title: "Error al cargar exámenes", variant: "destructive" });
      return;
    }
    setExamenes(data || []);
  };

  const loadUsuarios = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username");

    if (error) {
      console.error("Error loading users:", error);
      return;
    }
    setUsuarios(data || []);
  };

  const loadReemplazos = async () => {
    const { data, error } = await supabase
      .from("prestador_reemplazos")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error loading reemplazos:", error);
      return;
    }
    setReemplazos(data || []);
  };

  const loadPrestadorExamenes = async (prestadorId: string) => {
    const { data, error } = await supabase
      .from("prestador_examenes")
      .select("*")
      .eq("prestador_id", prestadorId);

    if (error) {
      console.error("Error loading prestador examenes:", error);
      return;
    }
    
    const examenesMap: { [key: string]: number } = {};
    (data || []).forEach((pe) => {
      examenesMap[pe.examen_id] = pe.valor_prestacion;
    });
    setSelectedExamenes(examenesMap);
    setPrestadorExamenes(data || []);
  };

  const resetForm = () => {
    setNombre("");
    setRut("");
    setEspecialidad("");
    setTelefono("");
    setEmail("");
    setSelectedUserId(null);
    setActivo(true);
    setEditingPrestador(null);
  };

  const handleOpenDialog = (prestador?: Prestador) => {
    if (prestador) {
      setEditingPrestador(prestador);
      setNombre(prestador.nombre);
      setRut(prestador.rut || "");
      setEspecialidad(prestador.especialidad || "");
      setTelefono(prestador.telefono || "");
      setEmail(prestador.email || "");
      setSelectedUserId(prestador.user_id);
      setActivo(prestador.activo);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      return;
    }

    const prestadorData = {
      nombre: nombre.trim(),
      rut: rut.trim() || null,
      especialidad: especialidad.trim() || null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      user_id: selectedUserId,
      activo,
    };

    if (editingPrestador) {
      const { error } = await supabase
        .from("prestadores")
        .update(prestadorData)
        .eq("id", editingPrestador.id);

      if (error) {
        toast({ title: "Error al actualizar prestador", variant: "destructive" });
        return;
      }
      toast({ title: "Prestador actualizado" });
    } else {
      const { error } = await supabase.from("prestadores").insert(prestadorData);

      if (error) {
        toast({ title: "Error al crear prestador", variant: "destructive" });
        return;
      }
      toast({ title: "Prestador creado" });
    }

    setDialogOpen(false);
    resetForm();
    loadPrestadores();
  };

  const handleDelete = async () => {
    if (!prestadorToDelete) return;

    const { error } = await supabase
      .from("prestadores")
      .delete()
      .eq("id", prestadorToDelete.id);

    if (error) {
      toast({ title: "Error al eliminar prestador", variant: "destructive" });
      return;
    }

    toast({ title: "Prestador eliminado" });
    setDeleteDialogOpen(false);
    setPrestadorToDelete(null);
    loadPrestadores();
  };

  const handleOpenTarifas = async (prestador: Prestador) => {
    setSelectedPrestadorTarifas(prestador);
    setTarifaSearchFilter("");
    await loadPrestadorExamenes(prestador.id);
    setTarifasDialogOpen(true);
  };

  // Filtered exams for tarifas dialog
  const filteredExamenesForTarifas = useMemo(() => {
    const searchLower = tarifaSearchFilter.toLowerCase().trim();
    if (!searchLower) return examenes;
    
    return examenes.filter((examen) => {
      const codigoMatch = examen.codigo?.toLowerCase().includes(searchLower) || false;
      const nombreMatch = examen.nombre.toLowerCase().includes(searchLower);
      return codigoMatch || nombreMatch;
    });
  }, [examenes, tarifaSearchFilter]);

  // Get activated tarifas for current prestador
  const tarifasActivadas = useMemo(() => {
    return examenes.filter((examen) => examen.id in selectedExamenes);
  }, [examenes, selectedExamenes]);

  const filteredTarifasActivadas = useMemo(() => {
    const searchLower = tarifaSearchFilter.toLowerCase().trim();
    if (!searchLower) return tarifasActivadas;
    
    return tarifasActivadas.filter((examen) => {
      const codigoMatch = examen.codigo?.toLowerCase().includes(searchLower) || false;
      const nombreMatch = examen.nombre.toLowerCase().includes(searchLower);
      return codigoMatch || nombreMatch;
    });
  }, [tarifasActivadas, tarifaSearchFilter]);

  const handleToggleExamen = (examenId: string, checked: boolean) => {
    if (checked) {
      setSelectedExamenes((prev) => ({ ...prev, [examenId]: 0 }));
    } else {
      setSelectedExamenes((prev) => {
        const newState = { ...prev };
        delete newState[examenId];
        return newState;
      });
    }
  };

  const handleValorChange = (examenId: string, valor: number) => {
    setSelectedExamenes((prev) => ({ ...prev, [examenId]: valor }));
  };

  const handleSaveTarifas = async () => {
    if (!selectedPrestadorTarifas) return;

    // Delete existing
    await supabase
      .from("prestador_examenes")
      .delete()
      .eq("prestador_id", selectedPrestadorTarifas.id);

    // Insert new
    const inserts = Object.entries(selectedExamenes).map(([examenId, valor]) => ({
      prestador_id: selectedPrestadorTarifas.id,
      examen_id: examenId,
      valor_prestacion: valor,
    }));

    if (inserts.length > 0) {
      const { error } = await supabase.from("prestador_examenes").insert(inserts);
      if (error) {
        toast({ title: "Error al guardar tarifas", variant: "destructive" });
        return;
      }
    }

    toast({ title: "Tarifas guardadas" });
    setTarifasDialogOpen(false);
    setSelectedPrestadorTarifas(null);
    setSelectedExamenes({});
  };

  const handleCreateReemplazo = async () => {
    if (!reemplazoOriginalId || !reemplazoReemplazoId || !reemplazoFecha) {
      toast({ title: "Completa todos los campos obligatorios", variant: "destructive" });
      return;
    }

    if (reemplazoOriginalId === reemplazoReemplazoId) {
      toast({ title: "El prestador original y el reemplazo no pueden ser el mismo", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("prestador_reemplazos").insert({
      prestador_original_id: reemplazoOriginalId,
      prestador_reemplazo_id: reemplazoReemplazoId,
      fecha: format(reemplazoFecha, "yyyy-MM-dd"),
      motivo: reemplazoMotivo.trim() || null,
    });

    if (error) {
      toast({ title: "Error al crear reemplazo", variant: "destructive" });
      return;
    }

    toast({ title: "Reemplazo programado" });
    setReemplazoDialogOpen(false);
    setReemplazoOriginalId("");
    setReemplazoReemplazoId("");
    setReemplazoFecha(new Date());
    setReemplazoMotivo("");
    loadReemplazos();
  };

  const handleDeleteReemplazo = async (id: string) => {
    const { error } = await supabase.from("prestador_reemplazos").delete().eq("id", id);
    if (error) {
      toast({ title: "Error al eliminar reemplazo", variant: "destructive" });
      return;
    }
    toast({ title: "Reemplazo eliminado" });
    loadReemplazos();
  };

  const getPrestadorNombre = (id: string) => {
    return prestadores.find((p) => p.id === id)?.nombre || "Desconocido";
  };

  const getUsuarioNombre = (userId: string | null) => {
    if (!userId) return null;
    return usuarios.find((u) => u.id === userId)?.username || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Prestadores</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="prestadores" className="space-y-6">
          <TabsList>
            <TabsTrigger value="prestadores">Prestadores</TabsTrigger>
            <TabsTrigger value="reemplazos">Reemplazos</TabsTrigger>
          </TabsList>

          <TabsContent value="prestadores" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Prestador
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingPrestador ? "Editar Prestador" : "Nuevo Prestador"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nombre *</Label>
                      <Input
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <Label>RUT</Label>
                      <Input
                        value={rut}
                        onChange={(e) => setRut(e.target.value)}
                        placeholder="12.345.678-9"
                      />
                    </div>
                    <div>
                      <Label>Especialidad</Label>
                      <Input
                        value={especialidad}
                        onChange={(e) => setEspecialidad(e.target.value)}
                        placeholder="Ej: Médico Ocupacional"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Teléfono</Label>
                        <Input
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          placeholder="+56 9 1234 5678"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Vincular a Usuario</Label>
                      <Select
                        value={selectedUserId || "none"}
                        onValueChange={(val) => setSelectedUserId(val === "none" ? null : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sin vincular" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin vincular</SelectItem>
                          {usuarios.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="activo"
                        checked={activo}
                        onCheckedChange={(checked) => setActivo(!!checked)}
                      />
                      <Label htmlFor="activo">Activo</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmit}>
                      {editingPrestador ? "Guardar" : "Crear"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prestadores.map((prestador) => (
                <Card key={prestador.id} className={!prestador.activo ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{prestador.nombre}</CardTitle>
                        {prestador.rut && (
                          <p className="text-sm text-muted-foreground">{prestador.rut}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!prestador.activo && (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                        {prestador.user_id && (
                          <Badge variant="outline" className="gap-1">
                            <Link2 className="h-3 w-3" />
                            {getUsuarioNombre(prestador.user_id)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {prestador.especialidad && (
                        <p><span className="text-muted-foreground">Especialidad:</span> {prestador.especialidad}</p>
                      )}
                      {prestador.telefono && (
                        <p><span className="text-muted-foreground">Tel:</span> {prestador.telefono}</p>
                      )}
                      {prestador.email && (
                        <p><span className="text-muted-foreground">Email:</span> {prestador.email}</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTarifas(prestador)}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Tarifas
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(prestador)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPrestadorToDelete(prestador);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reemplazos" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={reemplazoDialogOpen} onOpenChange={setReemplazoDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Programar Reemplazo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Programar Reemplazo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Prestador Original *</Label>
                      <Select value={reemplazoOriginalId} onValueChange={setReemplazoOriginalId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prestador" />
                        </SelectTrigger>
                        <SelectContent>
                          {prestadores.filter((p) => p.activo).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Prestador Reemplazo *</Label>
                      <Select value={reemplazoReemplazoId} onValueChange={setReemplazoReemplazoId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar reemplazo" />
                        </SelectTrigger>
                        <SelectContent>
                          {prestadores.filter((p) => p.activo).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fecha *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {reemplazoFecha
                              ? format(reemplazoFecha, "PPP", { locale: es })
                              : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={reemplazoFecha}
                            onSelect={setReemplazoFecha}
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label>Motivo (opcional)</Label>
                      <Input
                        value={reemplazoMotivo}
                        onChange={(e) => setReemplazoMotivo(e.target.value)}
                        placeholder="Ej: Licencia médica"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setReemplazoDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateReemplazo}>Programar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {reemplazos.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No hay reemplazos programados
                  </CardContent>
                </Card>
              ) : (
                reemplazos.map((reemplazo) => (
                  <Card key={reemplazo.id}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[80px]">
                            <p className="text-lg font-bold">
                              {format(new Date(reemplazo.fecha), "dd")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(reemplazo.fecha), "MMM yyyy", { locale: es })}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">
                              <span className="text-muted-foreground">Original:</span>{" "}
                              {getPrestadorNombre(reemplazo.prestador_original_id)}
                            </p>
                            <p className="font-medium">
                              <span className="text-muted-foreground">Reemplazo:</span>{" "}
                              {getPrestadorNombre(reemplazo.prestador_reemplazo_id)}
                            </p>
                            {reemplazo.motivo && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {reemplazo.motivo}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteReemplazo(reemplazo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Tarifas Dialog */}
      <Dialog open={tarifasDialogOpen} onOpenChange={setTarifasDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Tarifas de {selectedPrestadorTarifas?.nombre}
            </DialogTitle>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o nombre..."
              value={tarifaSearchFilter}
              onChange={(e) => setTarifaSearchFilter(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tarifas Activadas Table */}
          {tarifasActivadas.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">
                Tarifas activadas ({filteredTarifasActivadas.length} de {tarifasActivadas.length})
              </h3>
              <div className="rounded-md border max-h-[200px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="w-[120px] text-right">Valor</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTarifasActivadas.map((examen) => (
                      <TableRow key={examen.id}>
                        <TableCell className="font-mono text-sm">
                          {examen.codigo || "-"}
                        </TableCell>
                        <TableCell>{examen.nombre}</TableCell>
                        <TableCell className="text-right">
                          ${selectedExamenes[examen.id]?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleToggleExamen(examen.id, false)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* All Exams List */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <h3 className="font-medium text-sm text-muted-foreground">
              Todos los exámenes ({filteredExamenesForTarifas.length} de {examenes.length})
            </h3>
            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
              {filteredExamenesForTarifas.map((examen) => (
                <div key={examen.id} className="flex items-center gap-4 p-2 border rounded-lg">
                  <Checkbox
                    checked={examen.id in selectedExamenes}
                    onCheckedChange={(checked) => handleToggleExamen(examen.id, !!checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{examen.nombre}</p>
                    {examen.codigo && (
                      <p className="text-xs text-muted-foreground">{examen.codigo}</p>
                    )}
                  </div>
                  {examen.id in selectedExamenes && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">$</Label>
                      <Input
                        type="number"
                        className="w-28"
                        value={selectedExamenes[examen.id] || ""}
                        onChange={(e) =>
                          handleValorChange(examen.id, parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setTarifasDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTarifas}>Guardar Tarifas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar prestador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará a "{prestadorToDelete?.nombre}" y todas sus tarifas asociadas.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GlobalChat />
    </div>
  );
};

export default Prestadores;
