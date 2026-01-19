import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Building2, Package, ClipboardList, ChevronDown, ChevronUp, FileDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateCotizacionPDF } from "./CotizacionPDF";
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
  rut: string | null;
  razon_social: string | null;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
}

interface Examen {
  id: string;
  nombre: string;
  codigo: string | null;
  costo_neto: number;
}

interface Paquete {
  id: string;
  nombre: string;
  paquete_examen_items: Array<{
    examen_id: string;
    examenes: Examen;
  }>;
}

interface Margen {
  id: string;
  nombre: string;
  porcentaje: number;
}

interface CotizacionItem {
  id: string;
  item_numero: number;
  tipo_item: "paquete" | "examen";
  paquete_id: string | null;
  examen_id: string | null;
  nombre_prestacion: string;
  detalle_examenes: Array<{ examen_id: string; nombre: string; costo_neto: number }>;
  valor_unitario_neto: number;
  cantidad: number;
  valor_total_neto: number;
  valor_iva: number;
  valor_con_iva: number;
  margen_id: string | null;
  margen_nombre: string | null;
  margen_porcentaje: number;
  valor_margen: number;
  valor_final: number;
  expanded?: boolean;
}

interface CotizacionFormProps {
  cotizacionId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(value);
};

const CotizacionForm = ({ cotizacionId, onSuccess, onCancel }: CotizacionFormProps) => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [margenes, setMargenes] = useState<Margen[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [empresaSearch, setEmpresaSearch] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [empresaForm, setEmpresaForm] = useState({
    nombre: "",
    rut: "",
    razon_social: "",
    contacto: "",
    email: "",
    telefono: "",
  });
  const [isNewEmpresa, setIsNewEmpresa] = useState(false);
  const [items, setItems] = useState<CotizacionItem[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [afectoIva, setAfectoIva] = useState(true);

  // Add item state
  const [tipoItem, setTipoItem] = useState<"paquete" | "examen">("paquete");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [itemCantidad, setItemCantidad] = useState<number>(1);
  const [itemMargenId, setItemMargenId] = useState<string>("");

  // Duplicate confirmation dialog state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateItems, setDuplicateItems] = useState<Array<{ nombre: string; count: number }>>([]);
  const pendingSaveRef = useRef<{ estado: string; generatePdf: boolean } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (cotizacionId) {
      loadCotizacion(cotizacionId);
    }
  }, [cotizacionId]);

  const loadData = async () => {
    try {
      const [empresasRes, examenesRes, paquetesRes, margenesRes] = await Promise.all([
        supabase.from("empresas").select("*").eq("activo", true).order("nombre"),
        supabase.from("examenes").select("id, nombre, codigo, costo_neto").order("nombre"),
        supabase.from("paquetes_examenes").select("id, nombre, paquete_examen_items(examen_id, examenes(id, nombre, codigo, costo_neto))").order("nombre"),
        supabase.from("margenes_cotizacion").select("*").eq("activo", true).order("orden"),
      ]);

      if (empresasRes.error) throw empresasRes.error;
      if (examenesRes.error) throw examenesRes.error;
      if (paquetesRes.error) throw paquetesRes.error;
      if (margenesRes.error) throw margenesRes.error;

      setEmpresas(empresasRes.data || []);
      setExamenes(examenesRes.data || []);
      setPaquetes(paquetesRes.data || []);
      setMargenes(margenesRes.data || []);

      // Set default margen
      if (margenesRes.data && margenesRes.data.length > 0) {
        setItemMargenId(margenesRes.data[0].id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const loadCotizacion = async (id: string) => {
    try {
      const { data: cotizacion, error: cotError } = await supabase
        .from("cotizaciones")
        .select("*")
        .eq("id", id)
        .single();

      if (cotError) throw cotError;

      // Set empresa data
      if (cotizacion.empresa_id) {
        const empresa = empresas.find((e) => e.id === cotizacion.empresa_id);
        if (empresa) setSelectedEmpresa(empresa);
      }
      setEmpresaForm({
        nombre: cotizacion.empresa_nombre || "",
        rut: cotizacion.empresa_rut || "",
        razon_social: cotizacion.empresa_razon_social || "",
        contacto: cotizacion.empresa_contacto || "",
        email: cotizacion.empresa_email || "",
        telefono: cotizacion.empresa_telefono || "",
      });
      setObservaciones(cotizacion.observaciones || "");
      setAfectoIva(cotizacion.afecto_iva !== false);

      // Load items
      const { data: itemsData, error: itemsError } = await supabase
        .from("cotizacion_items")
        .select("*")
        .eq("cotizacion_id", id)
        .order("item_numero");

      if (itemsError) throw itemsError;

      setItems(
        (itemsData || []).map((item: any) => ({
          ...item,
          detalle_examenes: item.detalle_examenes || [],
          expanded: false,
        }))
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar cotización");
    }
  };

  const filteredEmpresas = empresas.filter(
    (e) =>
      e.nombre?.toLowerCase().includes(empresaSearch.toLowerCase()) ||
      e.rut?.toLowerCase().includes(empresaSearch.toLowerCase())
  );

  const handleSelectEmpresa = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setEmpresaForm({
      nombre: empresa.nombre || "",
      rut: empresa.rut || "",
      razon_social: empresa.razon_social || "",
      contacto: empresa.contacto || "",
      email: empresa.email || "",
      telefono: empresa.telefono || "",
    });
    setIsNewEmpresa(false);
    setEmpresaSearch("");
  };

  const handleNewEmpresa = () => {
    setSelectedEmpresa(null);
    setIsNewEmpresa(true);
    setEmpresaForm({
      nombre: empresaSearch,
      rut: "",
      razon_social: empresaSearch,
      contacto: "",
      email: "",
      telefono: "",
    });
  };

  const calculateItemValues = (
    valorUnitarioNeto: number,
    cantidad: number,
    margenId: string | null,
    aplicaIva: boolean = true
  ) => {
    const valorTotalNeto = valorUnitarioNeto * cantidad;
    const valorIva = aplicaIva ? valorTotalNeto * 0.19 : 0;
    const valorConIva = valorTotalNeto + valorIva;

    const margen = margenes.find((m) => m.id === margenId);
    const margenPorcentaje = margen?.porcentaje || 0;
    const valorMargen = valorConIva * (margenPorcentaje / 100);
    const valorFinal = valorConIva + valorMargen;

    return {
      valor_total_neto: valorTotalNeto,
      valor_iva: valorIva,
      valor_con_iva: valorConIva,
      margen_nombre: margen?.nombre || null,
      margen_porcentaje: margenPorcentaje,
      valor_margen: valorMargen,
      valor_final: valorFinal,
    };
  };

  const handleAddItem = () => {
    if (!selectedItemId) {
      toast.error("Seleccione una prestación");
      return;
    }

    let newItem: CotizacionItem;

    if (tipoItem === "paquete") {
      const paquete = paquetes.find((p) => p.id === selectedItemId);
      if (!paquete) return;

      const detalleExamenes = paquete.paquete_examen_items.map((item) => ({
        examen_id: item.examen_id,
        nombre: item.examenes.nombre,
        costo_neto: item.examenes.costo_neto || 0,
      }));

      const valorUnitarioNeto = detalleExamenes.reduce((sum, e) => sum + e.costo_neto, 0);
      const calculatedValues = calculateItemValues(valorUnitarioNeto, itemCantidad, itemMargenId, afectoIva);

      newItem = {
        id: crypto.randomUUID(),
        item_numero: items.length + 1,
        tipo_item: "paquete",
        paquete_id: paquete.id,
        examen_id: null,
        nombre_prestacion: paquete.nombre,
        detalle_examenes: detalleExamenes,
        valor_unitario_neto: valorUnitarioNeto,
        cantidad: itemCantidad,
        margen_id: itemMargenId || null,
        expanded: true,
        ...calculatedValues,
      };
    } else {
      const examen = examenes.find((e) => e.id === selectedItemId);
      if (!examen) return;

      const valorUnitarioNeto = examen.costo_neto || 0;
      const calculatedValues = calculateItemValues(valorUnitarioNeto, itemCantidad, itemMargenId, afectoIva);

      newItem = {
        id: crypto.randomUUID(),
        item_numero: items.length + 1,
        tipo_item: "examen",
        paquete_id: null,
        examen_id: examen.id,
        nombre_prestacion: examen.nombre,
        detalle_examenes: [{ examen_id: examen.id, nombre: examen.nombre, costo_neto: examen.costo_neto || 0 }],
        valor_unitario_neto: valorUnitarioNeto,
        cantidad: itemCantidad,
        margen_id: itemMargenId || null,
        expanded: false,
        ...calculatedValues,
      };
    }

    setItems([...items, newItem]);
    setSelectedItemId("");
    setItemCantidad(1);
  };

  const handleUpdateItem = (itemId: string, field: "cantidad" | "margen_id", value: number | string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const newCantidad = field === "cantidad" ? (value as number) : item.cantidad;
        const newMargenId = field === "margen_id" ? (value as string) : item.margen_id;
        const calculatedValues = calculateItemValues(item.valor_unitario_neto, newCantidad, newMargenId, afectoIva);

        return {
          ...item,
          cantidad: newCantidad,
          margen_id: newMargenId,
          ...calculatedValues,
        };
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) =>
      prev
        .filter((item) => item.id !== itemId)
        .map((item, index) => ({ ...item, item_numero: index + 1 }))
    );
  };

  const toggleItemExpanded = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, expanded: !item.expanded } : item
      )
    );
  };

  // Recalculate all items when afectoIva changes
  useEffect(() => {
    if (items.length > 0) {
      setItems((prev) =>
        prev.map((item) => {
          const calculatedValues = calculateItemValues(
            item.valor_unitario_neto,
            item.cantidad,
            item.margen_id,
            afectoIva
          );
          return { ...item, ...calculatedValues };
        })
      );
    }
  }, [afectoIva]);

  const totals = useMemo(() => {
    const subtotalNeto = items.reduce((sum, item) => sum + item.valor_total_neto, 0);
    const totalIva = items.reduce((sum, item) => sum + item.valor_iva, 0);
    const totalConIva = items.reduce((sum, item) => sum + item.valor_con_iva, 0);
    const totalMargenes = items.reduce((sum, item) => sum + item.valor_margen, 0);
    const totalFinal = items.reduce((sum, item) => sum + item.valor_final, 0);

    return { subtotalNeto, totalIva, totalConIva, totalMargenes, totalFinal };
  }, [items]);

  const handleSave = async (estado: string = "borrador", generatePdf: boolean = false) => {
    // Validar campos requeridos
    const errores: string[] = [];
    
    if (!empresaForm.nombre?.trim()) {
      errores.push("Nombre de la empresa");
    }
    if (!empresaForm.rut?.trim()) {
      errores.push("RUT de la empresa");
    }
    if (!empresaForm.contacto?.trim()) {
      errores.push("Nombre de contacto");
    }
    if (!empresaForm.email?.trim()) {
      errores.push("Email de contacto");
    }
    if (!empresaForm.telefono?.trim()) {
      errores.push("Teléfono de contacto");
    }
    if (items.length === 0) {
      errores.push("Al menos un ítem en la cotización");
    }
    
    // Validar que cada ítem tenga margen seleccionado
    const itemsSinMargen = items.filter(item => !item.margen_id);
    if (itemsSinMargen.length > 0) {
      errores.push(`Margen de utilidad para ${itemsSinMargen.length} ítem(s)`);
    }

    if (errores.length > 0) {
      toast.error(
        <div>
          <strong>Complete los siguientes campos obligatorios:</strong>
          <ul className="mt-2 list-disc list-inside">
            {errores.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    // Detectar ítems duplicados
    const itemCounts = new Map<string, { nombre: string; count: number }>();
    items.forEach(item => {
      const key = item.paquete_id || item.examen_id || item.nombre_prestacion;
      if (key) {
        const existing = itemCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          itemCounts.set(key, { nombre: item.nombre_prestacion, count: 1 });
        }
      }
    });

    const duplicados = Array.from(itemCounts.values()).filter(item => item.count > 1);
    if (duplicados.length > 0) {
      // Store pending save params and show confirmation dialog
      pendingSaveRef.current = { estado, generatePdf };
      setDuplicateItems(duplicados);
      setShowDuplicateDialog(true);
      return;
    }

    // Proceed with save
    await executeSave(estado, generatePdf);
  };

  const executeSave = async (estado: string, generatePdf: boolean) => {
    setSaving(true);
    try {
      let empresaId = selectedEmpresa?.id || null;

      // Create new empresa if needed
      if (isNewEmpresa && empresaForm.nombre) {
        const { data: newEmpresa, error: empresaError } = await supabase
          .from("empresas")
          .insert({
            nombre: empresaForm.nombre,
            rut: empresaForm.rut || null,
            razon_social: empresaForm.razon_social || null,
            contacto: empresaForm.contacto || null,
            email: empresaForm.email || null,
            telefono: empresaForm.telefono || null,
          })
          .select()
          .single();

        if (empresaError) throw empresaError;
        empresaId = newEmpresa.id;
      }

      const cotizacionData = {
        empresa_id: empresaId,
        empresa_nombre: empresaForm.nombre,
        empresa_rut: empresaForm.rut || null,
        empresa_razon_social: empresaForm.razon_social || null,
        empresa_contacto: empresaForm.contacto || null,
        empresa_email: empresaForm.email || null,
        empresa_telefono: empresaForm.telefono || null,
        subtotal_neto: totals.subtotalNeto,
        total_iva: totals.totalIva,
        total_con_iva: totals.totalConIva,
        total_con_margen: totals.totalFinal,
        estado,
        observaciones: observaciones || null,
        afecto_iva: afectoIva,
      };

      let savedCotizacionId: string;
      let numeroCotizacion: number;

      if (cotizacionId) {
        const { data: updated, error } = await supabase
          .from("cotizaciones")
          .update(cotizacionData)
          .eq("id", cotizacionId)
          .select("id, numero_cotizacion, fecha_cotizacion")
          .single();

        if (error) throw error;
        savedCotizacionId = cotizacionId;
        numeroCotizacion = updated.numero_cotizacion;

        // Delete existing items
        await supabase.from("cotizacion_items").delete().eq("cotizacion_id", cotizacionId);
      } else {
        const { data: newCotizacion, error } = await supabase
          .from("cotizaciones")
          .insert(cotizacionData)
          .select("id, numero_cotizacion, fecha_cotizacion")
          .single();

        if (error) throw error;
        savedCotizacionId = newCotizacion.id;
        numeroCotizacion = newCotizacion.numero_cotizacion;
      }

      // Insert items - convert empty strings to null for UUID fields
      const itemsToInsert = items.map((item) => ({
        cotizacion_id: savedCotizacionId,
        item_numero: item.item_numero,
        tipo_item: item.tipo_item,
        paquete_id: item.paquete_id || null,
        examen_id: item.examen_id || null,
        nombre_prestacion: item.nombre_prestacion,
        detalle_examenes: item.detalle_examenes,
        valor_unitario_neto: item.valor_unitario_neto,
        cantidad: item.cantidad,
        valor_total_neto: item.valor_total_neto,
        valor_iva: item.valor_iva,
        valor_con_iva: item.valor_con_iva,
        margen_id: item.margen_id || null,
        margen_nombre: item.margen_nombre || null,
        margen_porcentaje: item.margen_porcentaje,
        valor_margen: item.valor_margen,
        valor_final: item.valor_final,
      }));

      const { error: itemsError } = await supabase.from("cotizacion_items").insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Generate PDF if requested
      if (generatePdf) {
        generateCotizacionPDF({
          numero_cotizacion: numeroCotizacion,
          fecha_cotizacion: new Date().toISOString(),
          empresa_nombre: empresaForm.nombre,
          empresa_rut: empresaForm.rut || null,
          empresa_telefono: empresaForm.telefono || null,
          empresa_contacto: empresaForm.contacto || null,
          observaciones: observaciones || null,
          items: items.map((item) => ({
            item_numero: item.item_numero,
            nombre_prestacion: item.nombre_prestacion,
            detalle_examenes: item.detalle_examenes,
            valor_unitario_neto: item.valor_unitario_neto,
            cantidad: item.cantidad,
            valor_final: item.valor_final,
          })),
          subtotal_neto: totals.subtotalNeto,
          total_iva: totals.totalIva,
          total_con_iva: totals.totalConIva,
          total_con_margen: totals.totalFinal,
          afecto_iva: afectoIva,
        });
        toast.success("PDF generado exitosamente");
      }

      toast.success(cotizacionId ? "Cotización actualizada" : "Cotización creada exitosamente");
      onSuccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar cotización");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDuplicateSave = async () => {
    setShowDuplicateDialog(false);
    if (pendingSaveRef.current) {
      await executeSave(pendingSaveRef.current.estado, pendingSaveRef.current.generatePdf);
      pendingSaveRef.current = null;
    }
  };

  const handleCancelDuplicateSave = () => {
    setShowDuplicateDialog(false);
    pendingSaveRef.current = null;
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Empresa Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Datos de la Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedEmpresa && !isNewEmpresa ? (
            <div className="space-y-3">
              <div>
                <Label>Buscar Empresa</Label>
                <Input
                  placeholder="Buscar por nombre o RUT..."
                  value={empresaSearch}
                  onChange={(e) => setEmpresaSearch(e.target.value)}
                />
              </div>
              {empresaSearch && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {filteredEmpresas.length > 0 ? (
                    filteredEmpresas.slice(0, 10).map((empresa) => (
                      <div
                        key={empresa.id}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        onClick={() => handleSelectEmpresa(empresa)}
                      >
                        <div className="font-medium">{empresa.nombre}</div>
                        {empresa.rut && (
                          <div className="text-sm text-muted-foreground">RUT: {empresa.rut}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center">
                      <p className="text-muted-foreground mb-2">No se encontró la empresa</p>
                      <Button size="sm" onClick={handleNewEmpresa}>
                        Crear Nueva Empresa
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant={isNewEmpresa ? "secondary" : "default"}>
                  {isNewEmpresa ? "Nueva Empresa" : "Empresa Existente"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedEmpresa(null);
                    setIsNewEmpresa(false);
                    setEmpresaForm({ nombre: "", rut: "", razon_social: "", contacto: "", email: "", telefono: "" });
                  }}
                >
                  Cambiar
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={empresaForm.nombre}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <Label>RUT *</Label>
                  <Input
                    value={empresaForm.rut}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, rut: e.target.value })}
                    placeholder="76.XXX.XXX-X"
                  />
                </div>
                <div>
                  <Label>Razón Social</Label>
                  <Input
                    value={empresaForm.razon_social}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, razon_social: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contacto *</Label>
                  <Input
                    value={empresaForm.contacto}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, contacto: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={empresaForm.email}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Teléfono *</Label>
                  <Input
                    value={empresaForm.telefono}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, telefono: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Item Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Agregar Ítem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-40">
              <Label>Tipo</Label>
              <Select value={tipoItem} onValueChange={(v) => { setTipoItem(v as "paquete" | "examen"); setSelectedItemId(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paquete">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Batería/Paquete
                    </div>
                  </SelectItem>
                  <SelectItem value="examen">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Examen Individual
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label>Prestación</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {tipoItem === "paquete"
                    ? paquetes.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre}
                        </SelectItem>
                      ))
                    : examenes.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nombre} {e.costo_neto > 0 && `(${formatCurrency(e.costo_neto)})`}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={itemCantidad}
                onChange={(e) => setItemCantidad(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="w-48">
              <Label>Margen</Label>
              <Select value={itemMargenId || "none"} onValueChange={(v) => setItemMargenId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin margen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin margen</SelectItem>
                  {margenes.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nombre} ({m.porcentaje}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddItem} className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items List (Glosa) */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Detalle de Cotización</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="border rounded-lg overflow-hidden">
                  {/* Item Header */}
                  <div className="bg-muted/50 p-4 flex items-center gap-4">
                    <div className="flex items-center gap-2 font-medium w-16">
                      <Badge variant="outline">{item.item_numero}</Badge>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.tipo_item === "paquete" ? (
                          <Package className="h-4 w-4 text-primary" />
                        ) : (
                          <ClipboardList className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium">{item.nombre_prestacion}</span>
                        {item.tipo_item === "paquete" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleItemExpanded(item.id)}
                          >
                            {item.expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20">
                        <Input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) =>
                            handleUpdateItem(item.id, "cantidad", parseInt(e.target.value) || 1)
                          }
                          className="h-8 text-center"
                        />
                      </div>
                      <div className="w-40">
                        <Select
                          value={item.margen_id || "none"}
                          onValueChange={(v) => handleUpdateItem(item.id, "margen_id", v === "none" ? "" : v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Sin margen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin margen</SelectItem>
                            {margenes.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.nombre} ({m.porcentaje}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Item Details (Expanded) */}
                  {item.expanded && item.detalle_examenes.length > 0 && (
                    <div className="px-4 py-2 border-t bg-background">
                      <div className="ml-8 space-y-1">
                        {item.detalle_examenes.map((examen, idx) => (
                          <div
                            key={examen.examen_id}
                            className="flex justify-between text-sm py-1 border-b border-dashed last:border-b-0"
                          >
                            <span className="text-muted-foreground">
                              {idx === item.detalle_examenes.length - 1 ? "└─" : "├─"} {examen.nombre}
                            </span>
                            <span className="font-mono">{formatCurrency(examen.costo_neto)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Item Totals */}
                  <div className="px-4 py-3 border-t bg-muted/30">
                    <div className={`grid gap-4 text-sm ${afectoIva ? 'grid-cols-5' : 'grid-cols-4'}`}>
                      <div>
                        <span className="text-muted-foreground">Valor Unitario:</span>
                        <div className="font-mono font-medium">{formatCurrency(item.valor_unitario_neto)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subtotal Neto:</span>
                        <div className="font-mono font-medium">{formatCurrency(item.valor_total_neto)}</div>
                      </div>
                      {afectoIva && (
                        <div>
                          <span className="text-muted-foreground">IVA (19%):</span>
                          <div className="font-mono">{formatCurrency(item.valor_iva)}</div>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">
                          {item.margen_nombre ? `${item.margen_nombre} (${item.margen_porcentaje}%):` : "Margen:"}
                        </span>
                        <div className="font-mono">{formatCurrency(item.valor_margen)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Ítem:</span>
                        <div className="font-mono font-bold text-primary">{formatCurrency(item.valor_final)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Grand Totals */}
            <Separator className="my-6" />
            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Neto:</span>
                  <span className="font-mono">{formatCurrency(totals.subtotalNeto)}</span>
                </div>
                {afectoIva ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (19%):</span>
                      <span className="font-mono">{formatCurrency(totals.totalIva)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total con IVA:</span>
                      <span className="font-mono">{formatCurrency(totals.totalConIva)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground italic">Documento Exento de IVA</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Márgenes aplicados:</span>
                  <span className="font-mono">{formatCurrency(totals.totalMargenes)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL COTIZACIÓN:</span>
                  <span className="font-mono text-primary">{formatCurrency(totals.totalFinal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* IVA Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Documento Afecto a IVA</Label>
              <p className="text-sm text-muted-foreground">
                {afectoIva 
                  ? "Se aplicará IVA (19%) a todos los ítems" 
                  : "Documento exento de IVA - No se aplicará impuesto"}
              </p>
            </div>
            <Switch
              checked={afectoIva}
              onCheckedChange={setAfectoIva}
            />
          </div>
        </CardContent>
      </Card>

      {/* Observaciones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Notas adicionales para la cotización..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="secondary" onClick={() => handleSave("borrador")} disabled={saving}>
          {saving ? "Guardando..." : "Guardar Borrador"}
        </Button>
        <Button onClick={() => handleSave("borrador", true)} disabled={saving} className="gap-2">
          <FileDown className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar y Generar PDF"}
        </Button>
      </div>

      {/* Duplicate Items Confirmation Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Se detectaron ítems repetidos
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Los siguientes ítems aparecen más de una vez en la cotización:</p>
                <ul className="list-disc list-inside space-y-1 bg-amber-50 dark:bg-amber-950 p-3 rounded-md">
                  {duplicateItems.map((dup, i) => (
                    <li key={i} className="text-amber-800 dark:text-amber-200 font-medium">
                      {dup.nombre} <span className="text-amber-600">(×{dup.count})</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm">¿Desea continuar con el guardado o prefiere corregir los ítems duplicados?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDuplicateSave}>
              Corregir
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicateSave} className="bg-amber-600 hover:bg-amber-700">
              Continuar y Guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CotizacionForm;
