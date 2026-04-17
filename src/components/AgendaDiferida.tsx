import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Trash2, Calendar as CalendarIcon, Clock, Pencil, X } from "lucide-react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { formatRutStandard } from "@/lib/utils";
import { logActivity } from "@/lib/activityLog";
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

interface Empresa {
  id: string;
  nombre: string;
}

interface Faena {
  id: string;
  nombre: string;
}

interface Paquete {
  id: string;
  nombre: string;
  paquete_examen_items: Array<{ examen_id: string }>;
}

interface Examen {
  id: string;
  nombre: string;
  codigo: string | null;
}

interface AgendaItem {
  id: string;
  nombre: string;
  rut: string;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  tipo_servicio: string | null;
  empresa_id: string | null;
  faena_id: string | null;
  cargo: string | null;
  examenes_ids: string[];
  paquetes_ids: string[];
  estado: string;
  fecha_programada: string | null;
  created_at: string;
  empresas?: { nombre: string } | null;
  faenas?: { nombre: string } | null;
}

interface BateriaFaena {
  paquete_id: string;
  faena_id: string;
}

const AgendaDiferida = () => {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [faenasEmpresa, setFaenasEmpresa] = useState<Faena[]>([]);
  const [bateriaFaenas, setBateriaFaenas] = useState<BateriaFaena[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedExamenes, setSelectedExamenes] = useState<string[]>([]);
  const [selectedPaquetes, setSelectedPaquetes] = useState<string[]>([]);
  const [bateriaFilter, setBateriaFilter] = useState("");
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [empresaDropdownOpen, setEmpresaDropdownOpen] = useState(false);
  const empresaDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    tipo_servicio: "workmed" as "workmed" | "jenner" | "",
    empresa_id: "",
    faena_id: "",
    cargo: "",
    fecha_programada: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (empresaDropdownRef.current && !empresaDropdownRef.current.contains(event.target as Node)) {
        setEmpresaDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, empresasRes, paquetesRes, examenesRes, bateriaFaenasRes] = await Promise.all([
        supabase.from("agenda_diferida").select("*, empresas(nombre), faenas(nombre)").eq("estado", "pendiente").order("created_at", { ascending: false }),
        supabase.from("empresas").select("id, nombre").eq("activo", true).order("nombre"),
        supabase.from("paquetes_examenes").select("*, paquete_examen_items(examen_id)").order("nombre"),
        supabase.from("examenes").select("id, nombre, codigo").order("nombre"),
        supabase.from("bateria_faenas").select("paquete_id, faena_id").eq("activo", true),
      ]);

      setItems((itemsRes.data as any) || []);
      setEmpresas(empresasRes.data || []);
      setPaquetes(paquetesRes.data || []);
      setExamenes(examenesRes.data || []);
      setBateriaFaenas(bateriaFaenasRes.data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFaenas = async (empresaId: string) => {
    if (!empresaId) { setFaenasEmpresa([]); return; }
    const { data } = await supabase
      .from("empresa_faenas")
      .select("faena_id, faenas:faena_id(id, nombre)")
      .eq("empresa_id", empresaId)
      .eq("activo", true);
    const faenas = (data || []).map((ef: any) => ef.faenas).filter(Boolean);
    setFaenasEmpresa(faenas);
    if (faenas.length === 1) setFormData(prev => ({ ...prev, faena_id: faenas[0].id }));
  };

  // Get paquetes filtered by selected faena
  const filteredPaquetesByFaena = (() => {
    if (!formData.faena_id) return paquetes; // No faena selected → show all
    const allowedPaqueteIds = bateriaFaenas
      .filter(bf => bf.faena_id === formData.faena_id)
      .map(bf => bf.paquete_id);
    if (allowedPaqueteIds.length === 0) return paquetes; // No config → fallback to all
    return paquetes.filter(p => allowedPaqueteIds.includes(p.id));
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.rut) {
      toast.error("Nombre y RUT son requeridos");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const rutFormatted = formatRutStandard(formData.rut);

      const payload = {
        nombre: formData.nombre.toUpperCase(),
        rut: rutFormatted,
        tipo_servicio: formData.tipo_servicio || null,
        empresa_id: formData.empresa_id || null,
        faena_id: formData.faena_id || null,
        cargo: formData.cargo || null,
        examenes_ids: selectedExamenes,
        paquetes_ids: selectedPaquetes,
        fecha_programada: formData.fecha_programada || null,
      };

      if (editingId) {
        const { error } = await supabase.from("agenda_diferida").update(payload).eq("id", editingId);
        if (error) throw error;
        await logActivity("editar_agenda_diferida", { nombre: formData.nombre, rut: rutFormatted }, "/pacientes");
        toast.success("Pre-registro actualizado");
      } else {
        const { error } = await supabase.from("agenda_diferida").insert({
          ...payload,
          created_by: user?.id || null,
        });
        if (error) throw error;
        await logActivity("crear_agenda_diferida", { nombre: formData.nombre, rut: rutFormatted }, "/pacientes");
        toast.success("Paciente agregado a agenda diferida");
      }

      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar registro");
    }
  };

  const handleEdit = async (item: AgendaItem) => {
    setFormData({
      nombre: item.nombre,
      rut: item.rut,
      tipo_servicio: (item.tipo_servicio as any) || "workmed",
      empresa_id: item.empresa_id || "",
      faena_id: item.faena_id || "",
      cargo: item.cargo || "",
      fecha_programada: item.fecha_programada || "",
    });
    setSelectedPaquetes(item.paquetes_ids || []);
    setSelectedExamenes(item.examenes_ids || []);
    setEditingId(item.id);
    setShowForm(true);

    if (item.empresa_id) {
      setEmpresaSearch(item.empresas?.nombre || "");
      await loadFaenas(item.empresa_id);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("agenda_diferida").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Registro eliminado");
      setDeleteId(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar");
    }
  };

  const resetForm = () => {
    setFormData({ nombre: "", rut: "", tipo_servicio: "workmed", empresa_id: "", faena_id: "", cargo: "", fecha_programada: "" });
    setSelectedExamenes([]);
    setSelectedPaquetes([]);
    setShowForm(false);
    setEditingId(null);
    setFaenasEmpresa([]);
    setEmpresaSearch("");
  };

  const handleFaenaChange = (faenaId: string) => {
    setFormData(prev => ({ ...prev, faena_id: faenaId }));
    // Clear selected paquetes/examenes when faena changes
    setSelectedPaquetes([]);
    setSelectedExamenes([]);
  };

  const filteredItems = items.filter(
    (i) =>
      i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.rut.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEmpresas = empresas.filter(e =>
    !empresaSearch || e.nombre.toLowerCase().includes(empresaSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Agenda Diferida
          </h2>
          <p className="text-sm text-muted-foreground">Pacientes pre-registrados para atención futura</p>
        </div>
        <Button onClick={() => { if (showForm && !editingId) { resetForm(); } else { resetForm(); setShowForm(true); } }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Pre-Registro
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Editar Pre-Registro" : "Nuevo Pre-Registro"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={formData.nombre} onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Nombre completo" />
                </div>
                <div className="space-y-2">
                  <Label>RUT *</Label>
                  <Input value={formData.rut} onChange={(e) => setFormData(prev => ({ ...prev, rut: e.target.value }))} placeholder="12.345.678-9" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Programada</Label>
                  <Input type="date" value={formData.fecha_programada} onChange={(e) => setFormData(prev => ({ ...prev, fecha_programada: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={formData.cargo} onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))} placeholder="Cargo" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo Servicio</Label>
                  <select value={formData.tipo_servicio} onChange={(e) => setFormData(prev => ({ ...prev, tipo_servicio: e.target.value as any }))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    <option value="workmed">Workmed</option>
                    <option value="jenner">Jenner</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2" ref={empresaDropdownRef}>
                  <Label>Empresa</Label>
                  <div className="relative">
                    <Input
                      value={empresaSearch || (formData.empresa_id ? empresas.find(e => e.id === formData.empresa_id)?.nombre : "") || ""}
                      onChange={(e) => { setEmpresaSearch(e.target.value); setEmpresaDropdownOpen(true); }}
                      onFocus={() => setEmpresaDropdownOpen(true)}
                      placeholder="Buscar empresa..."
                    />
                    {empresaDropdownOpen && filteredEmpresas.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredEmpresas.slice(0, 10).map((emp) => (
                          <button key={emp.id} type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, empresa_id: emp.id, faena_id: "" }));
                              setEmpresaSearch(emp.nombre);
                              setEmpresaDropdownOpen(false);
                              setSelectedPaquetes([]);
                              setSelectedExamenes([]);
                              loadFaenas(emp.id);
                            }}>
                            {emp.nombre}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Faena</Label>
                  <select value={formData.faena_id} onChange={(e) => handleFaenaChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    disabled={faenasEmpresa.length === 0}>
                    <option value="">Seleccionar faena...</option>
                    {faenasEmpresa.map((f) => (<option key={f.id} value={f.id}>{f.nombre}</option>))}
                  </select>
                </div>
              </div>

              {/* Baterías selector - filtered by faena */}
              <div className="space-y-2">
                <Label>
                  Baterías / Exámenes
                  {formData.faena_id && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (filtradas por faena seleccionada)
                    </span>
                  )}
                </Label>
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar batería..." value={bateriaFilter} onChange={(e) => setBateriaFilter(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
                <div className="border rounded-md bg-muted/30 max-h-40 overflow-y-auto p-2">
                  {filteredPaquetesByFaena
                    .filter(p => !bateriaFilter || p.nombre.toLowerCase().includes(bateriaFilter.toLowerCase()))
                    .map((paquete) => (
                      <label key={paquete.id} className="flex items-center gap-2 cursor-pointer py-1 px-1 hover:bg-accent rounded text-sm">
                        <input type="checkbox" checked={selectedPaquetes.includes(paquete.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPaquetes([...selectedPaquetes, paquete.id]);
                              const exIds = paquete.paquete_examen_items.map(i => i.examen_id);
                              setSelectedExamenes(prev => [...new Set([...prev, ...exIds])]);
                            } else {
                              setSelectedPaquetes(selectedPaquetes.filter(id => id !== paquete.id));
                              const exIds = paquete.paquete_examen_items.map(i => i.examen_id);
                              setSelectedExamenes(prev => prev.filter(id => !exIds.includes(id)));
                            }
                          }} className="w-3.5 h-3.5" />
                        <span>{paquete.nombre}</span>
                        <span className="text-xs text-muted-foreground ml-auto">({paquete.paquete_examen_items.length})</span>
                      </label>
                    ))}
                  {filteredPaquetesByFaena.filter(p => !bateriaFilter || p.nombre.toLowerCase().includes(bateriaFilter.toLowerCase())).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No hay baterías configuradas para esta faena</p>
                  )}
                </div>
                {selectedPaquetes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPaquetes.map((id) => {
                      const p = paquetes.find(p => p.id === id);
                      return p ? <Badge key={id} variant="secondary" className="text-xs">{p.nombre}</Badge> : null;
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit">{editingId ? "Actualizar" : "Guardar"} Pre-Registro</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o RUT..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No hay pacientes en agenda diferida</div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{item.nombre}</span>
                      <span className="text-sm font-mono text-muted-foreground">{item.rut}</span>
                      {item.fecha_programada && (
                        <Badge variant="outline" className="text-xs">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {format(new Date(item.fecha_programada + "T12:00:00"), "dd/MM/yyyy")}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">{item.estado}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {item.empresas?.nombre && <span>{item.empresas.nombre}</span>}
                      {item.faenas?.nombre && <span>• {item.faenas.nombre}</span>}
                      {item.cargo && <span>• {item.cargo}</span>}
                      {item.paquetes_ids && item.paquetes_ids.length > 0 && (
                        <span>• {item.paquetes_ids.length} batería(s)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-sm text-muted-foreground">Mostrando {filteredItems.length} registros pendientes</p>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pre-registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AgendaDiferida;
