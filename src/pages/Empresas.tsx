import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Upload, Building2, Trash2, Pencil, Package, DollarSign, Search, MapPin, ChevronRight, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import EmpresaFaenas from "@/components/empresas/EmpresaFaenas";
import { logActivity } from "@/lib/activityLog";

interface Empresa {
  id: string;
  nombre: string;
  rut?: string;
  razon_social?: string;
  contacto?: string;
  email?: string;
  telefono?: string;
  centro_costo?: string;
  afecto_iva?: boolean;
  created_at: string;
}

interface Paquete {
  id: string;
  nombre: string;
}

interface EmpresaBateria {
  id: string;
  empresa_id: string;
  paquete_id: string;
  valor: number;
  paquete?: { nombre: string };
}

interface EmpresaFaenaRow {
  id: string;
  faena_id: string;
  activo: boolean;
  faena?: { id: string; nombre: string };
}

interface BateriaFaenaRow {
  paquete_id: string;
  activo: boolean | null;
  paquete?: { id: string; nombre: string };
}

const emptyForm = {
  nombre: "",
  rut: "",
  razon_social: "",
  contacto: "",
  email: "",
  telefono: "",
  centro_costo: "",
  afecto_iva: true,
};

const Empresas = () => {
  useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("datos");
  const [empresaToDelete, setEmpresaToDelete] = useState<string | null>(null);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [empresaBaterias, setEmpresaBaterias] = useState<EmpresaBateria[]>([]);
  const [bateriaPrecios, setBateriaPrecios] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  // Baterías tab state
  const [empresaFaenasList, setEmpresaFaenasList] = useState<EmpresaFaenaRow[]>([]);
  const [selectedFaenaId, setSelectedFaenaId] = useState<string | null>(null);
  const [faenaBaterias, setFaenaBaterias] = useState<BateriaFaenaRow[]>([]);

  const filteredEmpresas = empresas.filter((empresa) =>
    empresa.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (empresa.rut && empresa.rut.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    Promise.all([loadEmpresas(), loadPaquetes()]);
  }, []);

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase.from("empresas").select("*").order("nombre");
      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar empresas");
    }
  };

  const loadPaquetes = async () => {
    try {
      const { data, error } = await supabase.from("paquetes_examenes").select("id, nombre").order("nombre");
      if (error) throw error;
      setPaquetes(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadEmpresaBaterias = async (empresaId: string) => {
    try {
      const { data, error } = await supabase
        .from("empresa_baterias")
        .select("*, paquete:paquetes_examenes(nombre)")
        .eq("empresa_id", empresaId);
      if (error) throw error;

      // Load faenas assigned to this empresa to filter batteries
      const { data: efData } = await supabase
        .from("empresa_faenas")
        .select("faena_id")
        .eq("empresa_id", empresaId)
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
      filtered.forEach((eb: any) => {
        precios[eb.paquete_id] = eb.valor?.toString() || "";
      });
      setBateriaPrecios(precios);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadEmpresaFaenasList = async (empresaId: string) => {
    try {
      const { data, error } = await supabase
        .from("empresa_faenas")
        .select("id, faena_id, activo, faena:faenas(id, nombre)")
        .eq("empresa_id", empresaId)
        .eq("activo", true);
      if (error) throw error;
      setEmpresaFaenasList((data || []) as any);
      setSelectedFaenaId(null);
      setFaenaBaterias([]);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadFaenaBaterias = async (faenaId: string) => {
    try {
      const { data, error } = await supabase
        .from("bateria_faenas")
        .select("paquete_id, activo, paquete:paquetes_examenes(id, nombre)")
        .eq("faena_id", faenaId)
        .neq("activo", false);
      if (error) throw error;
      setFaenaBaterias((data || []) as any);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSelectFaena = async (faenaId: string) => {
    if (!faenaId || faenaId === selectedFaenaId) {
      setSelectedFaenaId(null);
      setFaenaBaterias([]);
      return;
    }
    setSelectedFaenaId(faenaId);
    await loadFaenaBaterias(faenaId);
  };

  const handleAddBateria = async (paqueteId: string, paqueteNombre: string) => {
    if (!editingEmpresa) return;
    try {
      // Check if already exists
      const existing = empresaBaterias.find(eb => eb.paquete_id === paqueteId);
      if (existing) {
        toast.info(`${paqueteNombre} ya está agregada`);
        return;
      }
      const { error } = await supabase
        .from("empresa_baterias")
        .insert([{ empresa_id: editingEmpresa.id, paquete_id: paqueteId, valor: 0, activo: true }]);
      if (error) throw error;
      toast.success(`${paqueteNombre} agregada`);
      await loadEmpresaBaterias(editingEmpresa.id);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al agregar batería");
    }
  };

  const handleRemoveBateria = async (paqueteId: string) => {
    if (!editingEmpresa) return;
    try {
      const { error } = await supabase
        .from("empresa_baterias")
        .delete()
        .eq("empresa_id", editingEmpresa.id)
        .eq("paquete_id", paqueteId);
      if (error) throw error;
      toast.success("Batería eliminada");
      await loadEmpresaBaterias(editingEmpresa.id);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al eliminar batería");
    }
  };

  // Derived: paquete IDs already assigned to empresa
  const assignedPaqueteIds = new Set(empresaBaterias.map(eb => eb.paquete_id));

  // Available baterias from the selected faena that are NOT yet assigned
  const availableBaterias = faenaBaterias.filter(fb => !assignedPaqueteIds.has(fb.paquete_id));

  const openEmpresaDialog = async (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setFormData({
      nombre: empresa.nombre || "",
      rut: empresa.rut || "",
      razon_social: empresa.razon_social || "",
      contacto: empresa.contacto || "",
      email: empresa.email || "",
      telefono: empresa.telefono || "",
      centro_costo: empresa.centro_costo || "",
      afecto_iva: empresa.afecto_iva !== false,
    });
    await Promise.all([loadEmpresaBaterias(empresa.id), loadEmpresaFaenasList(empresa.id)]);
    setActiveTab("datos");
    setOpenDialog(true);
  };

  const openNewDialog = () => {
    setEditingEmpresa(null);
    setFormData(emptyForm);
    setEmpresaBaterias([]);
    setBateriaPrecios({});
    setActiveTab("datos");
    setOpenDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: formData.nombre,
        rut: formData.rut || null,
        razon_social: formData.razon_social || null,
        contacto: formData.contacto || null,
        email: formData.email || null,
        telefono: formData.telefono || null,
        centro_costo: formData.centro_costo || null,
        afecto_iva: formData.afecto_iva,
      };

      if (editingEmpresa) {
        const { error } = await supabase.from("empresas").update(payload).eq("id", editingEmpresa.id);
        if (error) throw error;
        toast.success("Empresa actualizada exitosamente");
        await logActivity("editar_empresa", { empresa_id: editingEmpresa.id, nombre: formData.nombre }, "/empresas");
      } else {
        const { data, error } = await supabase.from("empresas").insert([payload]).select().single();
        if (error) throw error;
        toast.success("Empresa agregada exitosamente");
        await logActivity("crear_empresa", { nombre: formData.nombre }, "/empresas");
        // Switch to editing mode so tabs are available
        if (data) {
          setEditingEmpresa(data as Empresa);
        }
      }
      loadEmpresas();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar empresa");
    }
  };

  const handleSaveBaterias = async () => {
    if (!editingEmpresa) return;
    try {
      const linkedPaqueteIds = Array.from(new Set(empresaBaterias.map((eb) => eb.paquete_id)));
      const updates = linkedPaqueteIds.map((paqueteId) => {
        const raw = (bateriaPrecios[paqueteId] ?? "").trim();
        const parsed = raw === "" ? 0 : Number(raw);
        const valor = Number.isFinite(parsed) ? parsed : 0;
        return supabase
          .from("empresa_baterias")
          .update({ valor, activo: true })
          .eq("empresa_id", editingEmpresa.id)
          .eq("paquete_id", paqueteId);
      });
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
      toast.success("Precios de baterías actualizados");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar baterías");
    }
  };

  const handleEmpresasUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = text.split("\n").map((row) => row.split(","));
      const empresasData = rows
        .slice(1)
        .filter((row) => row.length >= 1 && row[0]?.trim())
        .map((row) => ({ nombre: row[0]?.trim() || "" }));
      const { error } = await supabase.from("empresas").insert(empresasData);
      if (error) throw error;
      toast.success(`${empresasData.length} empresas importadas`);
      loadEmpresas();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al importar empresas");
    }
  };

  const handleDelete = async () => {
    if (!empresaToDelete) return;
    try {
      const { error } = await supabase.from("empresas").delete().eq("id", empresaToDelete);
      if (error) throw error;
      toast.success("Empresa eliminada exitosamente");
      await logActivity("eliminar_empresa", { empresa_id: empresaToDelete }, "/empresas");
      setEmpresaToDelete(null);
      loadEmpresas();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar empresa");
    }
  };



  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Empresas</h1>
            <p className="text-muted-foreground">Administra las empresas asociadas y sus baterías contratadas</p>
          </div>
          <div className="flex gap-3">
            <Button className="gap-2" onClick={openNewDialog}>
              <Plus className="h-4 w-4" />
              Nueva Empresa
            </Button>
            <Button variant="secondary" className="gap-2" asChild>
              <label>
                <Upload className="h-4 w-4" />
                Importar CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleEmpresasUpload} />
              </label>
            </Button>
          </div>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa por nombre o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredEmpresas.length} empresa(s) encontrada(s)
            </p>
          )}
        </div>

        {openDialog ? (
          /* Inline empresa detail/edit form */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="sm" onClick={() => {
                setOpenDialog(false);
                setEditingEmpresa(null);
                setFormData(emptyForm);
                setEmpresaBaterias([]);
                setBateriaPrecios({});
                setEmpresaFaenasList([]);
                setSelectedFaenaId(null);
                setFaenaBaterias([]);
              }}>
                ← Volver
              </Button>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {editingEmpresa ? editingEmpresa.nombre : "Nueva Empresa"}
              </h2>
            </div>

            <Tabs value={activeTab} onValueChange={(tab) => {
              setActiveTab(tab);
              if (tab === "baterias" && editingEmpresa) {
                Promise.all([loadEmpresaBaterias(editingEmpresa.id), loadEmpresaFaenasList(editingEmpresa.id)]);
              }
            }}>
              <TabsList className="w-full">
                <TabsTrigger value="datos" className="flex-1">Datos Generales</TabsTrigger>
                <TabsTrigger value="faenas" className="flex-1" disabled={!editingEmpresa}>
                  Faenas
                </TabsTrigger>
                <TabsTrigger value="baterias" className="flex-1" disabled={!editingEmpresa}>
                  Baterías y Precios
                </TabsTrigger>
              </TabsList>

              {/* Tab: Datos Generales */}
              <TabsContent value="datos" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="nombre">Nombre *</Label>
                          <Input
                            id="nombre"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            placeholder="Ej: Empresa ABC S.A."
                          />
                        </div>
                        <div>
                          <Label htmlFor="rut">RUT</Label>
                          <Input
                            id="rut"
                            value={formData.rut}
                            onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                            placeholder="12.345.678-9"
                          />
                        </div>
                        <div>
                          <Label htmlFor="razon_social">Razón Social</Label>
                          <Input
                            id="razon_social"
                            value={formData.razon_social}
                            onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                            placeholder="Razón social"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contacto">Contacto</Label>
                          <Input
                            id="contacto"
                            value={formData.contacto}
                            onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                            placeholder="Nombre contacto"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="correo@empresa.cl"
                          />
                        </div>
                        <div>
                          <Label htmlFor="telefono">Teléfono</Label>
                          <Input
                            id="telefono"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            placeholder="+56 9 1234 5678"
                          />
                        </div>
                        <div>
                          <Label htmlFor="centro_costo">Centro de Costo</Label>
                          <Input
                            id="centro_costo"
                            value={formData.centro_costo}
                            onChange={(e) => setFormData({ ...formData, centro_costo: e.target.value })}
                            placeholder="Código centro costo"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <Label htmlFor="afecto_iva" className="font-medium">Afecto a IVA</Label>
                            <p className="text-xs text-muted-foreground">Si está desactivado, los estados de pago se generarán sin IVA (exento)</p>
                          </div>
                          <Switch
                            id="afecto_iva"
                            checked={formData.afecto_iva}
                            onCheckedChange={(checked) => setFormData({ ...formData, afecto_iva: checked })}
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full">
                        {editingEmpresa ? "Guardar Cambios" : "Crear Empresa"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Faenas */}
              <TabsContent value="faenas" className="mt-4">
                {editingEmpresa && (
                  <EmpresaFaenas
                    empresaId={editingEmpresa.id}
                    empresaNombre={editingEmpresa.nombre}
                  />
                )}
              </TabsContent>

              {/* Tab: Baterías y Precios */}
              <TabsContent value="baterias" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-5 gap-6 min-h-[400px]">
                      {/* LEFT: Faena selector + available batteries (3 cols) */}
                      <div className="col-span-3 space-y-4">
                        <div>
                          <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            Faenas de esta empresa
                          </Label>
                          <div className="border rounded-md max-h-48 overflow-y-auto">
                            {empresaFaenasList.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No hay faenas asignadas. Ve a la pestaña "Faenas" primero.
                              </p>
                            ) : (
                              <div className="divide-y">
                                {empresaFaenasList.map((ef) => {
                                  const isExpanded = selectedFaenaId === ef.faena_id;
                                  const faenaName = (ef as any).faena?.nombre || ef.faena_id;
                                  return (
                                    <div key={ef.faena_id}>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectFaena(isExpanded ? "" : ef.faena_id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors ${
                                          isExpanded ? "bg-primary/10 font-medium" : ""
                                        }`}
                                      >
                                        <span>{faenaName}</span>
                                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180 text-primary" : ""}`} />
                                      </button>
                                      {isExpanded && faenaBaterias.length > 0 && (
                                        <div className="px-3 pb-2 bg-muted/20">
                                          <p className="text-xs text-muted-foreground mb-1 pt-1">Baterías de esta faena:</p>
                                          <div className="space-y-1">
                                            {faenaBaterias.map((fb) => {
                                              const name = (fb as any).paquete?.nombre || fb.paquete_id;
                                              const alreadyAdded = assignedPaqueteIds.has(fb.paquete_id);
                                              return (
                                                <div key={fb.paquete_id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background border">
                                                  <span className={alreadyAdded ? "text-muted-foreground" : ""}>{name}</span>
                                                  {alreadyAdded ? (
                                                    <Badge variant="secondary" className="text-[10px] h-5">Agregada</Badge>
                                                  ) : (
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="h-6 text-[10px] gap-1 px-2"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddBateria(fb.paquete_id, name);
                                                      }}
                                                    >
                                                      <Plus className="h-3 w-3" />
                                                      Agregar
                                                    </Button>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                      {isExpanded && faenaBaterias.length === 0 && (
                                        <div className="px-3 pb-2 bg-muted/20">
                                          <p className="text-xs text-muted-foreground py-1">Esta faena no tiene baterías asignadas</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Assigned batteries with prices (2 cols) */}
                      <div className="col-span-2 space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          Baterías contratadas y precios
                        </Label>
                        {empresaBaterias.length === 0 ? (
                          <div className="border rounded-md p-8 text-center">
                            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                              No hay baterías agregadas. Despliega una faena y agrega baterías.
                            </p>
                          </div>
                        ) : (
                          <>
                            <ScrollArea className="border rounded-md h-[320px]">
                              <div className="divide-y">
                                {empresaBaterias.map((eb) => (
                                  <div key={eb.paquete_id} className="flex items-center gap-2 px-3 py-2">
                                    <span className="text-sm font-medium flex-1 min-w-0">
                                      {eb.paquete?.nombre || eb.paquete_id}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-xs text-muted-foreground">$</span>
                                      <Input
                                        type="number"
                                        step="any"
                                        value={bateriaPrecios[eb.paquete_id] ?? ""}
                                        onChange={(e) =>
                                          setBateriaPrecios({
                                            ...bateriaPrecios,
                                            [eb.paquete_id]: e.target.value,
                                          })
                                        }
                                        placeholder="0"
                                        className="w-28 h-7 text-sm"
                                      />
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0"
                                      onClick={() => handleRemoveBateria(eb.paquete_id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            <div className="flex justify-between items-center pt-1">
                              <p className="text-xs text-muted-foreground">
                                {empresaBaterias.length} baterías · {empresaBaterias.filter((eb) => {
                                  const v = (bateriaPrecios[eb.paquete_id] ?? "").trim();
                                  return v !== "" && Number(v) > 0;
                                }).length} con precio &gt; 0
                              </p>
                              <Button size="sm" onClick={handleSaveBaterias}>
                                Guardar Precios
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmpresas.map((empresa) => (
              <Card key={empresa.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEmpresaDialog(empresa)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-5 w-5 text-primary" />
                      {empresa.nombre}
                    </CardTitle>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEmpresaToDelete(empresa.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {empresa.rut && <p>RUT: {empresa.rut}</p>}
                    {empresa.razon_social && <p>{empresa.razon_social}</p>}
                    {empresa.contacto && <p>Contacto: {empresa.contacto}</p>}
                    {empresa.email && <p>{empresa.email}</p>}
                    {empresa.telefono && <p>Tel: {empresa.telefono}</p>}
                    {!empresa.rut && !empresa.contacto && !empresa.email && (
                      <p>Registrada: {new Date(empresa.created_at).toLocaleDateString()}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={!!empresaToDelete} onOpenChange={() => setEmpresaToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la empresa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Empresas;
