import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Plus, FileText, Edit, Trash2, GripVertical, Eye, Settings, ChevronDown, ChevronUp, Variable } from "lucide-react";
import { GlobalChat } from "@/components/GlobalChat";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DocumentoFormulario {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  activo: boolean;
  created_at: string;
}

interface DocumentoCampo {
  id: string;
  documento_id: string;
  etiqueta: string;
  tipo_campo: string;
  opciones: unknown;
  requerido: boolean;
  orden: number;
}

const TIPOS_DOCUMENTO = [
  { value: "consentimiento", label: "Consentimiento" },
  { value: "declaracion", label: "Declaración" },
  { value: "cuestionario", label: "Cuestionario" },
];

const TIPOS_CAMPO = [
  { value: "texto_informativo", label: "📄 Texto informativo (solo lectura)" },
  { value: "texto", label: "Texto corto" },
  { value: "texto_largo", label: "Texto largo" },
  { value: "checkbox", label: "Casilla de verificación" },
  { value: "select", label: "Lista desplegable" },
  { value: "radio", label: "Opciones múltiples" },
  { value: "fecha", label: "Fecha" },
  { value: "firma", label: "Firma digital" },
];

// Helper to safely get opciones as string array
const getOpcionesArray = (opciones: unknown): string[] => {
  if (Array.isArray(opciones)) {
    return opciones.filter((o): o is string => typeof o === "string");
  }
  return [];
};

// Variables disponibles para insertar en textos informativos
const VARIABLES_DISPONIBLES = [
  { value: "{{nombre}}", label: "Nombre del paciente", category: "Paciente" },
  { value: "{{rut}}", label: "RUT del paciente", category: "Paciente" },
  { value: "{{fecha_nacimiento}}", label: "Fecha de nacimiento", category: "Paciente" },
  { value: "{{edad}}", label: "Edad del paciente", category: "Paciente" },
  { value: "{{email}}", label: "Email del paciente", category: "Paciente" },
  { value: "{{telefono}}", label: "Teléfono del paciente", category: "Paciente" },
  { value: "{{direccion}}", label: "Dirección del paciente", category: "Paciente" },
  { value: "{{empresa}}", label: "Nombre de la empresa", category: "Empresa" },
  { value: "{{fecha_actual}}", label: "Fecha de hoy", category: "Sistema" },
  { value: "{{numero_ingreso}}", label: "Número de ingreso", category: "Atención" },
];

const Documentos = () => {
  const [documentos, setDocumentos] = useState<DocumentoFormulario[]>([]);
  const [campos, setCampos] = useState<DocumentoCampo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [campoDialogOpen, setCampoDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCampoDialogOpen, setDeleteCampoDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // Form states
  const [editingDocumento, setEditingDocumento] = useState<DocumentoFormulario | null>(null);
  const [editingCampo, setEditingCampo] = useState<DocumentoCampo | null>(null);
  const [documentoToDelete, setDocumentoToDelete] = useState<DocumentoFormulario | null>(null);
  const [campoToDelete, setCampoToDelete] = useState<DocumentoCampo | null>(null);
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoFormulario | null>(null);
  
  // Documento form
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("consentimiento");
  const [activo, setActivo] = useState(true);
  
  // Campo form
  const [campoEtiqueta, setCampoEtiqueta] = useState("");
  const [campoTipo, setCampoTipo] = useState("texto");
  const [campoOpciones, setCampoOpciones] = useState("");
  const [campoRequerido, setCampoRequerido] = useState(false);
  
  // Expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // Ref for textarea cursor position
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadDocumentos();
  }, []);

  const loadDocumentos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documentos_formularios")
      .select("*")
      .order("nombre");
    
    if (error) {
      toast({ title: "Error al cargar documentos", description: error.message, variant: "destructive" });
    } else {
      setDocumentos(data || []);
    }
    setLoading(false);
  };

  const loadCampos = async (documentoId: string) => {
    const { data, error } = await supabase
      .from("documento_campos")
      .select("*")
      .eq("documento_id", documentoId)
      .order("orden");
    
    if (error) {
      toast({ title: "Error al cargar campos", description: error.message, variant: "destructive" });
    } else {
      setCampos(data || []);
    }
  };

  const toggleExpanded = async (documentoId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(documentoId)) {
      newExpanded.delete(documentoId);
    } else {
      newExpanded.add(documentoId);
      await loadCampos(documentoId);
    }
    setExpandedCards(newExpanded);
  };

  const resetDocumentoForm = () => {
    setNombre("");
    setDescripcion("");
    setTipo("consentimiento");
    setActivo(true);
    setEditingDocumento(null);
  };

  const resetCampoForm = () => {
    setCampoEtiqueta("");
    setCampoTipo("texto");
    setCampoOpciones("");
    setCampoRequerido(false);
    setEditingCampo(null);
  };

  const handleOpenDocumentoDialog = (documento?: DocumentoFormulario) => {
    if (documento) {
      setEditingDocumento(documento);
      setNombre(documento.nombre);
      setDescripcion(documento.descripcion || "");
      setTipo(documento.tipo);
      setActivo(documento.activo);
    } else {
      resetDocumentoForm();
    }
    setDialogOpen(true);
  };

  const handleOpenCampoDialog = (documento: DocumentoFormulario, campo?: DocumentoCampo) => {
    setSelectedDocumento(documento);
    if (campo) {
      setEditingCampo(campo);
      setCampoEtiqueta(campo.etiqueta);
      setCampoTipo(campo.tipo_campo);
      setCampoOpciones(getOpcionesArray(campo.opciones).join("\n"));
      setCampoRequerido(campo.requerido);
    } else {
      resetCampoForm();
    }
    setCampoDialogOpen(true);
  };

  const handleSubmitDocumento = async () => {
    if (!nombre.trim()) {
      toast({ title: "El nombre es requerido", variant: "destructive" });
      return;
    }

    const documentoData = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      tipo,
      activo,
    };

    if (editingDocumento) {
      const { error } = await supabase
        .from("documentos_formularios")
        .update(documentoData)
        .eq("id", editingDocumento.id);
      
      if (error) {
        toast({ title: "Error al actualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Documento actualizado" });
        setDialogOpen(false);
        loadDocumentos();
      }
    } else {
      const { error } = await supabase
        .from("documentos_formularios")
        .insert(documentoData);
      
      if (error) {
        toast({ title: "Error al crear", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Documento creado" });
        setDialogOpen(false);
        loadDocumentos();
      }
    }
  };

  const handleSubmitCampo = async () => {
    if (!campoEtiqueta.trim() || !selectedDocumento) {
      toast({ title: "La etiqueta es requerida", variant: "destructive" });
      return;
    }

    const opcionesArray = (campoTipo === "select" || campoTipo === "radio") && campoOpciones.trim()
      ? campoOpciones.split("\n").map(o => o.trim()).filter(Boolean)
      : null;

    // Get max orden
    const { data: existingCampos } = await supabase
      .from("documento_campos")
      .select("orden")
      .eq("documento_id", selectedDocumento.id)
      .order("orden", { ascending: false })
      .limit(1);

    const nextOrden = editingCampo ? editingCampo.orden : ((existingCampos?.[0]?.orden ?? -1) + 1);

    const campoData = {
      documento_id: selectedDocumento.id,
      etiqueta: campoEtiqueta.trim(),
      tipo_campo: campoTipo,
      opciones: opcionesArray,
      requerido: campoRequerido,
      orden: nextOrden,
    };

    if (editingCampo) {
      const { error } = await supabase
        .from("documento_campos")
        .update(campoData)
        .eq("id", editingCampo.id);
      
      if (error) {
        toast({ title: "Error al actualizar campo", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Campo actualizado" });
        setCampoDialogOpen(false);
        loadCampos(selectedDocumento.id);
      }
    } else {
      const { error } = await supabase
        .from("documento_campos")
        .insert(campoData);
      
      if (error) {
        toast({ title: "Error al crear campo", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Campo creado" });
        setCampoDialogOpen(false);
        loadCampos(selectedDocumento.id);
      }
    }
  };

  const handleDeleteDocumento = async () => {
    if (!documentoToDelete) return;

    const { error } = await supabase
      .from("documentos_formularios")
      .delete()
      .eq("id", documentoToDelete.id);
    
    if (error) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Documento eliminado" });
      loadDocumentos();
    }
    setDeleteDialogOpen(false);
    setDocumentoToDelete(null);
  };

  const handleDeleteCampo = async () => {
    if (!campoToDelete || !selectedDocumento) return;

    const { error } = await supabase
      .from("documento_campos")
      .delete()
      .eq("id", campoToDelete.id);
    
    if (error) {
      toast({ title: "Error al eliminar campo", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Campo eliminado" });
      loadCampos(selectedDocumento.id);
    }
    setDeleteCampoDialogOpen(false);
    setCampoToDelete(null);
  };

  const moveCampo = async (campo: DocumentoCampo, direction: "up" | "down") => {
    const currentIndex = campos.findIndex(c => c.id === campo.id);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= campos.length) return;
    
    const otherCampo = campos[newIndex];
    
    // Swap orden values
    await Promise.all([
      supabase.from("documento_campos").update({ orden: otherCampo.orden }).eq("id", campo.id),
      supabase.from("documento_campos").update({ orden: campo.orden }).eq("id", otherCampo.id),
    ]);
    
    loadCampos(campo.documento_id);
  };

  const handlePreview = async (documento: DocumentoFormulario) => {
    setSelectedDocumento(documento);
    await loadCampos(documento.id);
    setPreviewDialogOpen(true);
  };

  const getTipoLabel = (tipo: string) => {
    return TIPOS_DOCUMENTO.find(t => t.value === tipo)?.label || tipo;
  };

  const getCampoTipoLabel = (tipo: string) => {
    return TIPOS_CAMPO.find(t => t.value === tipo)?.label || tipo;
  };

  // Preview sample data for variable replacement
  const previewSampleData = (text: string): string => {
    return text
      .replace(/\{\{nombre\}\}/g, "Juan Pérez González")
      .replace(/\{\{rut\}\}/g, "12.345.678-9")
      .replace(/\{\{fecha_nacimiento\}\}/g, "15/03/1985")
      .replace(/\{\{edad\}\}/g, "39 años")
      .replace(/\{\{email\}\}/g, "juan.perez@email.com")
      .replace(/\{\{telefono\}\}/g, "+56 9 1234 5678")
      .replace(/\{\{direccion\}\}/g, "Av. Principal 123, Santiago")
      .replace(/\{\{empresa\}\}/g, "Empresa Ejemplo S.A.")
      .replace(/\{\{numero_ingreso\}\}/g, "42")
      .replace(/\{\{fecha_actual\}\}/g, new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }));
  };

  const renderPreviewCampo = (campo: DocumentoCampo) => {
    switch (campo.tipo_campo) {
      case "texto_informativo":
        return (
          <div className="bg-muted/50 border rounded-md p-4 text-sm text-foreground whitespace-pre-wrap">
            {previewSampleData(campo.etiqueta)}
          </div>
        );
      case "texto":
        return <Input placeholder={campo.etiqueta} disabled />;
      case "texto_largo":
        return <Textarea placeholder={campo.etiqueta} disabled />;
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <input type="checkbox" disabled className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">{campo.etiqueta}</span>
          </div>
        );
      case "select":
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {getOpcionesArray(campo.opciones).map((op, i) => (
                <SelectItem key={i} value={op}>{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "radio":
        return (
          <div className="space-y-2">
            {getOpcionesArray(campo.opciones).map((op, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" disabled name={campo.id} className="h-4 w-4" />
                <span className="text-sm">{op}</span>
              </div>
            ))}
          </div>
        );
      case "fecha":
        return <Input type="date" disabled />;
      case "firma":
        return (
          <div className="border-2 border-dashed rounded-md h-24 flex items-center justify-center text-muted-foreground">
            Espacio para firma digital
          </div>
        );
      default:
        return <Input disabled />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto py-8 px-4">
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Documentos y Formularios</h1>
            <p className="text-muted-foreground mt-1">
              Crea y administra consentimientos, declaraciones y cuestionarios
            </p>
          </div>
          <Button onClick={() => handleOpenDocumentoDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Documento
          </Button>
        </div>

        {documentos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay documentos creados</p>
              <Button className="mt-4" onClick={() => handleOpenDocumentoDialog()}>
                Crear primer documento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documentos.map((doc) => (
              <Card key={doc.id} className={!doc.activo ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{doc.nombre}</CardTitle>
                        <Badge variant={doc.activo ? "default" : "secondary"}>
                          {doc.activo ? "Activo" : "Inactivo"}
                        </Badge>
                        <Badge variant="outline">{getTipoLabel(doc.tipo)}</Badge>
                      </div>
                      {doc.descripcion && (
                        <CardDescription className="mt-1">{doc.descripcion}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handlePreview(doc)} title="Vista previa">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDocumentoDialog(doc)} title="Editar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { setDocumentoToDelete(doc); setDeleteDialogOpen(true); }}
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => toggleExpanded(doc.id)}
                        title={expandedCards.has(doc.id) ? "Colapsar" : "Expandir"}
                      >
                        {expandedCards.has(doc.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {expandedCards.has(doc.id) && (
                  <CardContent className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-sm text-muted-foreground">Campos del formulario</h4>
                      <Button size="sm" variant="outline" onClick={() => handleOpenCampoDialog(doc)}>
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar Campo
                      </Button>
                    </div>
                    
                    {campos.filter(c => c.documento_id === doc.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay campos. Agrega el primer campo al formulario.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {campos.filter(c => c.documento_id === doc.id).map((campo, index) => (
                          <div key={campo.id} className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                            <div className="flex flex-col gap-0.5">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5" 
                                onClick={() => moveCampo(campo, "up")}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5" 
                                onClick={() => moveCampo(campo, "down")}
                                disabled={index === campos.filter(c => c.documento_id === doc.id).length - 1}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{campo.etiqueta}</span>
                                {campo.requerido && <Badge variant="destructive" className="text-xs">Requerido</Badge>}
                              </div>
                              <span className="text-xs text-muted-foreground">{getCampoTipoLabel(campo.tipo_campo)}</span>
                              {getOpcionesArray(campo.opciones).length > 0 && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({getOpcionesArray(campo.opciones).length} opciones)
                                </span>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenCampoDialog(doc, campo)}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => { setSelectedDocumento(doc); setCampoToDelete(campo); setDeleteCampoDialogOpen(true); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog crear/editar documento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDocumento ? "Editar Documento" : "Nuevo Documento"}</DialogTitle>
            <DialogDescription>
              {editingDocumento ? "Modifica los datos del documento" : "Crea un nuevo documento o formulario"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input 
                id="nombre" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)} 
                placeholder="Ej: Consentimiento de divulgación"
              />
            </div>
            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea 
                id="descripcion" 
                value={descripcion} 
                onChange={(e) => setDescripcion(e.target.value)} 
                placeholder="Descripción del documento..."
              />
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={activo} onCheckedChange={setActivo} id="activo" />
              <Label htmlFor="activo">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitDocumento}>
              {editingDocumento ? "Guardar Cambios" : "Crear Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog crear/editar campo */}
      <Dialog open={campoDialogOpen} onOpenChange={setCampoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCampo ? "Editar Campo" : "Nuevo Campo"}</DialogTitle>
            <DialogDescription>
              {selectedDocumento && `Agregando campo a: ${selectedDocumento.nombre}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="campoTipo">Tipo de campo</Label>
              <Select value={campoTipo} onValueChange={setCampoTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CAMPO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="campoEtiqueta">
                  {campoTipo === "texto_informativo" ? "Texto a mostrar *" : "Etiqueta del campo *"}
                </Label>
                {campoTipo === "texto_informativo" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1">
                        <Variable className="h-3 w-3" />
                        Insertar variable
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2" align="end">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground px-2">
                          Click para insertar en el texto:
                        </p>
                        {["Paciente", "Empresa", "Atención", "Sistema"].map((category) => (
                          <div key={category}>
                            <p className="text-xs font-semibold text-foreground px-2 py-1">{category}</p>
                            <div className="flex flex-wrap gap-1 px-1">
                              {VARIABLES_DISPONIBLES.filter(v => v.category === category).map((v) => (
                                <Button
                                  key={v.value}
                                  variant="secondary"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => {
                                    const textarea = textareaRef.current;
                                    if (textarea) {
                                      const start = textarea.selectionStart;
                                      const end = textarea.selectionEnd;
                                      const newValue = campoEtiqueta.substring(0, start) + v.value + campoEtiqueta.substring(end);
                                      setCampoEtiqueta(newValue);
                                      // Restore cursor position after insertion
                                      setTimeout(() => {
                                        textarea.focus();
                                        const newCursorPos = start + v.value.length;
                                        textarea.setSelectionRange(newCursorPos, newCursorPos);
                                      }, 0);
                                    } else {
                                      setCampoEtiqueta(prev => prev + v.value);
                                    }
                                  }}
                                >
                                  {v.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {campoTipo === "texto_informativo" ? (
                <Textarea 
                  ref={textareaRef}
                  id="campoEtiqueta" 
                  value={campoEtiqueta} 
                  onChange={(e) => setCampoEtiqueta(e.target.value)} 
                  placeholder="Yo, {{nombre}}, con RUT {{rut}}, declaro que..."
                  className="resize font-mono text-sm min-h-[50vh] max-h-[70vh] h-[400px]"
                />
              ) : (
                <Input 
                  id="campoEtiqueta" 
                  value={campoEtiqueta} 
                  onChange={(e) => setCampoEtiqueta(e.target.value)} 
                  placeholder="Ej: ¿Acepta los términos?"
                />
              )}
              {campoTipo === "texto_informativo" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Use variables como <code className="bg-muted px-1 rounded">{"{{nombre}}"}</code> para insertar datos del paciente automáticamente.
                </p>
              )}
            </div>
            {(campoTipo === "select" || campoTipo === "radio") && (
              <div>
                <Label htmlFor="campoOpciones">Opciones (una por línea)</Label>
                <Textarea 
                  id="campoOpciones" 
                  value={campoOpciones} 
                  onChange={(e) => setCampoOpciones(e.target.value)} 
                  placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                  rows={4}
                />
              </div>
            )}
            {campoTipo !== "texto_informativo" && (
              <div className="flex items-center gap-2">
                <Switch checked={campoRequerido} onCheckedChange={setCampoRequerido} id="campoRequerido" />
                <Label htmlFor="campoRequerido">Campo requerido</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCampoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitCampo}>
              {editingCampo ? "Guardar Cambios" : "Agregar Campo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog vista previa */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista Previa: {selectedDocumento?.nombre}</DialogTitle>
            <DialogDescription>
              Así se verá el formulario para el paciente
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 p-4">
              {campos.filter(c => c.documento_id === selectedDocumento?.id).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Este documento no tiene campos configurados
                </p>
              ) : (
                campos.filter(c => c.documento_id === selectedDocumento?.id).map((campo) => (
                  <div key={campo.id} className="space-y-2">
                    {campo.tipo_campo !== "checkbox" && (
                      <Label className="flex items-center gap-1">
                        {campo.etiqueta}
                        {campo.requerido && <span className="text-destructive">*</span>}
                      </Label>
                    )}
                    {renderPreviewCampo(campo)}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setPreviewDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog eliminar documento */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{documentoToDelete?.nombre}" y todos sus campos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocumento} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog eliminar campo */}
      <AlertDialog open={deleteCampoDialogOpen} onOpenChange={setDeleteCampoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el campo "{campoToDelete?.etiqueta}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GlobalChat />
    </div>
  );
};

export default Documentos;
