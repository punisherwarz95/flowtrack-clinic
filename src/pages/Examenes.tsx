import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ClipboardList, Package, Trash2, Pencil, FileText, DollarSign } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";

interface Examen {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion_estimada: number | null;
  codigo: string | null;
  costo_neto: number | null;
}

interface Box {
  id: string;
  nombre: string;
}

interface Paquete {
  id: string;
  nombre: string;
  descripcion: string | null;
  paquete_examen_items: Array<{
    examen_id: string;
    examenes: {
      nombre: string;
    };
  }>;
}

interface DocumentoFormulario {
  id: string;
  nombre: string;
  tipo: string;
}

interface Empresa {
  id: string;
  nombre: string;
}

interface EmpresaBateria {
  id: string;
  empresa_id: string;
  paquete_id: string;
  valor: number;
  empresa?: { nombre: string };
}

const Examenes = () => {
  useAuth(); // Protect route
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoFormulario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [openExamenDialog, setOpenExamenDialog] = useState(false);
  const [openPaqueteDialog, setOpenPaqueteDialog] = useState(false);
  const [examenToDelete, setExamenToDelete] = useState<string | null>(null);
  const [paqueteToDelete, setPaqueteToDelete] = useState<string | null>(null);
  const [editingExamen, setEditingExamen] = useState<Examen | null>(null);
  const [editingPaquete, setEditingPaquete] = useState<Paquete | null>(null);
  const [selectedBoxes, setSelectedBoxes] = useState<string[]>([]);
  const [selectedExamenes, setSelectedExamenes] = useState<string[]>([]);
  const [selectedDocumentos, setSelectedDocumentos] = useState<string[]>([]);
  const [empresaPrecios, setEmpresaPrecios] = useState<Record<string, string>>({});
  const [paqueteDialogTab, setPaqueteDialogTab] = useState("examenes");
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    duracion_estimada: "",
    codigo: "",
    costo_neto: "",
  });
  const [paqueteFormData, setPaqueteFormData] = useState({
    nombre: "",
    descripcion: "",
  });

  useEffect(() => {
    loadExamenes();
    loadBoxes();
    loadPaquetes();
    loadDocumentos();
    loadEmpresas();
  }, []);

  const loadDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from("documentos_formularios")
        .select("id, nombre, tipo")
        .order("nombre");

      if (error) throw error;
      setDocumentos(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nombre")
        .order("nombre");

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadPaqueteDocumentos = async (paqueteId: string) => {
    try {
      const { data, error } = await supabase
        .from("bateria_documentos")
        .select("documento_id")
        .eq("paquete_id", paqueteId);

      if (error) throw error;
      setSelectedDocumentos(data?.map(d => d.documento_id) || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadPaquetePrecios = async (paqueteId: string) => {
    try {
      const { data, error } = await supabase
        .from("empresa_baterias")
        .select("empresa_id, valor")
        .eq("paquete_id", paqueteId);

      if (error) throw error;
      const precios: Record<string, string> = {};
      data?.forEach(eb => {
        precios[eb.empresa_id] = eb.valor?.toString() || "";
      });
      setEmpresaPrecios(precios);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadExamenes = async () => {
    try {
      const { data, error } = await supabase
        .from("examenes")
        .select("*")
        .order("nombre");

      if (error) throw error;
      setExamenes(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar exámenes");
    }
  };

  const loadBoxes = async () => {
    try {
      const { data, error } = await supabase
        .from("boxes")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setBoxes(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar boxes");
    }
  };

  const loadPaquetes = async () => {
    try {
      const { data, error } = await supabase
        .from("paquetes_examenes")
        .select("*, paquete_examen_items(examen_id, examenes(nombre))")
        .order("nombre");

      if (error) throw error;
      setPaquetes(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar paquetes");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedBoxes.length === 0) {
      toast.error("Debe seleccionar al menos un box");
      return;
    }

    try {
      if (editingExamen) {
        const { error: examenError } = await supabase
          .from("examenes")
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            duracion_estimada: formData.duracion_estimada ? parseInt(formData.duracion_estimada) : null,
            codigo: formData.codigo || null,
            costo_neto: formData.costo_neto ? parseFloat(formData.costo_neto) : 0,
          })
          .eq("id", editingExamen.id);

        if (examenError) throw examenError;

        // Eliminar asociaciones anteriores
        await supabase
          .from("box_examenes")
          .delete()
          .eq("examen_id", editingExamen.id);

        // Crear nuevas asociaciones
        const boxExamenesData = selectedBoxes.map(boxId => ({
          box_id: boxId,
          examen_id: editingExamen.id,
        }));

        const { error: boxExamenesError } = await supabase
          .from("box_examenes")
          .insert(boxExamenesData);

        if (boxExamenesError) throw boxExamenesError;
        
        toast.success("Examen actualizado exitosamente");
      } else {
        const { data: examenData, error: examenError } = await supabase
          .from("examenes")
          .insert([
            {
              nombre: formData.nombre,
              descripcion: formData.descripcion || null,
              duracion_estimada: formData.duracion_estimada ? parseInt(formData.duracion_estimada) : null,
              codigo: formData.codigo || null,
              costo_neto: formData.costo_neto ? parseFloat(formData.costo_neto) : 0,
            },
          ])
          .select()
          .single();

        if (examenError) throw examenError;

        // Asociar el examen a los boxes seleccionados
        const boxExamenesData = selectedBoxes.map(boxId => ({
          box_id: boxId,
          examen_id: examenData.id,
        }));

        const { error: boxExamenesError } = await supabase
          .from("box_examenes")
          .insert(boxExamenesData);

        if (boxExamenesError) throw boxExamenesError;
        
        toast.success("Examen agregado y asociado a boxes exitosamente");
      }
      
      setOpenExamenDialog(false);
      setEditingExamen(null);
      setFormData({ nombre: "", descripcion: "", duracion_estimada: "", codigo: "", costo_neto: "" });
      setSelectedBoxes([]);
      loadExamenes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || (editingExamen ? "Error al actualizar examen" : "Error al agregar examen"));
    }
  };

  const handlePaqueteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedExamenes.length === 0) {
      toast.error("Debe seleccionar al menos un examen");
      return;
    }

    try {
      let paqueteId: string;
      
      if (editingPaquete) {
        paqueteId = editingPaquete.id;
        
        const { error: paqueteError } = await supabase
          .from("paquetes_examenes")
          .update({
            nombre: paqueteFormData.nombre,
            descripcion: paqueteFormData.descripcion || null,
          })
          .eq("id", editingPaquete.id);

        if (paqueteError) throw paqueteError;

        // Eliminar asociaciones anteriores de exámenes
        await supabase
          .from("paquete_examen_items")
          .delete()
          .eq("paquete_id", editingPaquete.id);

        // Eliminar asociaciones anteriores de documentos
        await supabase
          .from("bateria_documentos")
          .delete()
          .eq("paquete_id", editingPaquete.id);

        // Eliminar precios anteriores
        await supabase
          .from("empresa_baterias")
          .delete()
          .eq("paquete_id", editingPaquete.id);
      } else {
        const { data: paqueteData, error: paqueteError } = await supabase
          .from("paquetes_examenes")
          .insert([
            {
              nombre: paqueteFormData.nombre,
              descripcion: paqueteFormData.descripcion || null,
            },
          ])
          .select()
          .single();

        if (paqueteError) throw paqueteError;
        paqueteId = paqueteData.id;
      }

      // Asociar exámenes al paquete
      const paqueteExamenesData = selectedExamenes.map(examenId => ({
        paquete_id: paqueteId,
        examen_id: examenId,
      }));

      const { error: itemsError } = await supabase
        .from("paquete_examen_items")
        .insert(paqueteExamenesData);

      if (itemsError) throw itemsError;

      // Asociar documentos al paquete
      if (selectedDocumentos.length > 0) {
        const bateriaDocumentosData = selectedDocumentos.map((docId, idx) => ({
          paquete_id: paqueteId,
          documento_id: docId,
          orden: idx,
        }));

        const { error: docsError } = await supabase
          .from("bateria_documentos")
          .insert(bateriaDocumentosData);

        if (docsError) throw docsError;
      }

      // Guardar precios por empresa
      const preciosData = Object.entries(empresaPrecios)
        .filter(([_, valor]) => valor && parseFloat(valor) > 0)
        .map(([empresaId, valor]) => ({
          paquete_id: paqueteId,
          empresa_id: empresaId,
          valor: parseFloat(valor),
        }));

      if (preciosData.length > 0) {
        const { error: preciosError } = await supabase
          .from("empresa_baterias")
          .insert(preciosData);

        if (preciosError) throw preciosError;
      }
      
      toast.success(editingPaquete ? "Paquete actualizado exitosamente" : "Paquete de exámenes creado exitosamente");
      
      setOpenPaqueteDialog(false);
      setEditingPaquete(null);
      setPaqueteFormData({ nombre: "", descripcion: "" });
      setSelectedExamenes([]);
      setSelectedDocumentos([]);
      setEmpresaPrecios({});
      setPaqueteDialogTab("examenes");
      loadPaquetes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || (editingPaquete ? "Error al actualizar paquete" : "Error al crear paquete"));
    }
  };

  const handleDeleteExamen = async () => {
    if (!examenToDelete) return;

    try {
      const { error } = await supabase
        .from("examenes")
        .delete()
        .eq("id", examenToDelete);

      if (error) throw error;
      
      toast.success("Examen eliminado exitosamente");
      setExamenToDelete(null);
      loadExamenes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar examen");
    }
  };

  const handleDeletePaquete = async () => {
    if (!paqueteToDelete) return;

    try {
      const { error } = await supabase
        .from("paquetes_examenes")
        .delete()
        .eq("id", paqueteToDelete);

      if (error) throw error;
      
      toast.success("Paquete eliminado exitosamente");
      setPaqueteToDelete(null);
      loadPaquetes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al eliminar paquete");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Exámenes y Paquetes</h1>
            <p className="text-muted-foreground">Administra exámenes individuales y paquetes</p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={openExamenDialog} onOpenChange={(open) => {
              setOpenExamenDialog(open);
              if (!open) {
                setEditingExamen(null);
                setFormData({ nombre: "", descripcion: "", duracion_estimada: "", codigo: "", costo_neto: "" });
                setSelectedBoxes([]);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nuevo Examen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingExamen ? "Editar Examen" : "Agregar Nuevo Examen"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre del Examen *</Label>
                    <Input
                      id="nombre"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Radiografía, Análisis de Sangre"
                    />
                  </div>
                  <div>
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Descripción del examen"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duracion">Duración Estimada (minutos)</Label>
                    <Input
                      id="duracion"
                      type="number"
                      value={formData.duracion_estimada}
                      onChange={(e) => setFormData({ ...formData, duracion_estimada: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="codigo">Código</Label>
                      <Input
                        id="codigo"
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                        placeholder="EX-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="costo_neto">Costo Neto ($)</Label>
                      <Input
                        id="costo_neto"
                        type="number"
                        step="any"
                        value={formData.costo_neto}
                        onChange={(e) => setFormData({ ...formData, costo_neto: e.target.value })}
                        placeholder="5000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Boxes donde se realiza *</Label>
                    <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {boxes.map((box) => (
                        <label key={box.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedBoxes.includes(box.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBoxes([...selectedBoxes, box.id]);
                              } else {
                                setSelectedBoxes(selectedBoxes.filter(id => id !== box.id));
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{box.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    {editingExamen ? "Actualizar Examen" : "Guardar Examen"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={openPaqueteDialog} onOpenChange={(open) => {
              setOpenPaqueteDialog(open);
              if (!open) {
                setEditingPaquete(null);
                setPaqueteFormData({ nombre: "", descripcion: "" });
                setSelectedExamenes([]);
                setSelectedDocumentos([]);
                setEmpresaPrecios({});
                setPaqueteDialogTab("examenes");
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <Package className="h-4 w-4" />
                  Nuevo Paquete
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPaquete ? "Editar Paquete" : "Crear Paquete de Exámenes"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePaqueteSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paquete-nombre">Nombre del Paquete *</Label>
                      <Input
                        id="paquete-nombre"
                        required
                        value={paqueteFormData.nombre}
                        onChange={(e) => setPaqueteFormData({ ...paqueteFormData, nombre: e.target.value })}
                        placeholder="Ej: Examen Pre-ocupacional Completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paquete-descripcion">Descripción</Label>
                      <Input
                        id="paquete-descripcion"
                        value={paqueteFormData.descripcion}
                        onChange={(e) => setPaqueteFormData({ ...paqueteFormData, descripcion: e.target.value })}
                        placeholder="Descripción del paquete"
                      />
                    </div>
                  </div>
                  
                  <Tabs value={paqueteDialogTab} onValueChange={setPaqueteDialogTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="examenes" className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Exámenes
                      </TabsTrigger>
                      <TabsTrigger value="documentos" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Documentos
                      </TabsTrigger>
                      <TabsTrigger value="precios" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        Precios
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="examenes" className="mt-4">
                      <Label>Exámenes incluidos *</Label>
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2 mt-2">
                        {examenes.map((examen) => (
                          <label key={examen.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedExamenes.includes(examen.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedExamenes([...selectedExamenes, examen.id]);
                                } else {
                                  setSelectedExamenes(selectedExamenes.filter(id => id !== examen.id));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{examen.nombre}</span>
                            {examen.costo_neto && examen.costo_neto > 0 && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                ${examen.costo_neto.toLocaleString()}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedExamenes.length} exámenes seleccionados
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="documentos" className="mt-4">
                      <Label>Documentos requeridos</Label>
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2 mt-2">
                        {documentos.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No hay documentos creados. Crea documentos en el módulo Documentos.
                          </p>
                        ) : (
                          documentos.map((doc) => (
                            <label key={doc.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedDocumentos.includes(doc.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDocumentos([...selectedDocumentos, doc.id]);
                                  } else {
                                    setSelectedDocumentos(selectedDocumentos.filter(id => id !== doc.id));
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">{doc.nombre}</span>
                              <span className="text-xs text-muted-foreground ml-auto capitalize">
                                {doc.tipo}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedDocumentos.length} documentos seleccionados
                      </p>
                    </TabsContent>
                    
                    <TabsContent value="precios" className="mt-4">
                      <Label>Precios por Empresa</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Define precios específicos para cada empresa. Dejar vacío para usar precio estándar.
                      </p>
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-3 mt-2">
                        {empresas.map((empresa) => (
                          <div key={empresa.id} className="flex items-center gap-3">
                            <span className="text-sm flex-1 truncate">{empresa.nombre}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="any"
                                value={empresaPrecios[empresa.id] || ""}
                                onChange={(e) => setEmpresaPrecios({
                                  ...empresaPrecios,
                                  [empresa.id]: e.target.value
                                })}
                                placeholder="0"
                                className="w-28 h-8"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {Object.values(empresaPrecios).filter(v => v && parseFloat(v) > 0).length} empresas con precio específico
                      </p>
                    </TabsContent>
                  </Tabs>
                  
                  <Button type="submit" className="w-full">
                    {editingPaquete ? "Actualizar Paquete" : "Crear Paquete"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="examenes" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="examenes">Exámenes</TabsTrigger>
            <TabsTrigger value="paquetes">Paquetes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="examenes" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {examenes.map((examen) => (
                <Card key={examen.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        {examen.nombre}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            setEditingExamen(examen);
                            setFormData({
                              nombre: examen.nombre,
                              descripcion: examen.descripcion || "",
                              duracion_estimada: examen.duracion_estimada?.toString() || "",
                              codigo: examen.codigo || "",
                              costo_neto: examen.costo_neto?.toString() || "",
                            });
                            
                            // Cargar boxes asociados al examen
                            const { data: boxExamenes } = await supabase
                              .from("box_examenes")
                              .select("box_id")
                              .eq("examen_id", examen.id);
                            
                            setSelectedBoxes(boxExamenes?.map(be => be.box_id) || []);
                            setOpenExamenDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExamenToDelete(examen.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {examen.descripcion && (
                      <p className="text-sm text-muted-foreground mb-3">{examen.descripcion}</p>
                    )}
                    {examen.duracion_estimada && (
                      <div className="text-sm">
                        <span className="font-medium text-foreground">Duración:</span>{" "}
                        <span className="text-muted-foreground">{examen.duracion_estimada} min</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="paquetes" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paquetes.map((paquete) => (
                <Card key={paquete.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        {paquete.nombre}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            setEditingPaquete(paquete);
                            setPaqueteFormData({
                              nombre: paquete.nombre,
                              descripcion: paquete.descripcion || "",
                            });
                            setSelectedExamenes(paquete.paquete_examen_items.map(item => item.examen_id));
                            await Promise.all([
                              loadPaqueteDocumentos(paquete.id),
                              loadPaquetePrecios(paquete.id)
                            ]);
                            setOpenPaqueteDialog(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPaqueteToDelete(paquete.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {paquete.descripcion && (
                      <p className="text-sm text-muted-foreground mb-3">{paquete.descripcion}</p>
                    )}
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Incluye:</p>
                      <div className="flex flex-wrap gap-1">
                        {paquete.paquete_examen_items.map((item, idx) => (
                          <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {item.examenes.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <AlertDialog open={!!examenToDelete} onOpenChange={() => setExamenToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el examen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteExamen}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!paqueteToDelete} onOpenChange={() => setPaqueteToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el paquete.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePaquete}>Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Examenes;
