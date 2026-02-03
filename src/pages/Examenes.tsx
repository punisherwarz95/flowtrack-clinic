import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ClipboardList, Package, Trash2, Pencil, FileText, DollarSign, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Search, MapPin } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
import { Progress } from "@/components/ui/progress";
import { parseExcelFile, importExamenesYPrestadoresFromExcel, ExcelRowData, ImportResult } from "@/lib/supabase";

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

interface Faena {
  id: string;
  nombre: string;
  empresa_id: string | null;
}

// Componente para mostrar paquetes con filtro
interface PaquetesGridProps {
  paquetes: Paquete[];
  faenas: Faena[];
  searchFilter: string;
  faenaFilter: string;
  onEdit: (paquete: Paquete) => void;
  onDelete: (paqueteId: string) => void;
}

const PaquetesGrid = ({ paquetes, faenas, searchFilter, faenaFilter, onEdit, onDelete }: PaquetesGridProps) => {
  const [paqueteFaenasMap, setPaqueteFaenasMap] = useState<Record<string, string[]>>({});
  
  useEffect(() => {
    const loadPaqueteFaenas = async () => {
      const { data } = await supabase
        .from("bateria_faenas")
        .select("paquete_id, faena_id")
        .eq("activo", true);
      
      const map: Record<string, string[]> = {};
      (data || []).forEach(bf => {
        if (!map[bf.paquete_id]) map[bf.paquete_id] = [];
        map[bf.paquete_id].push(bf.faena_id);
      });
      setPaqueteFaenasMap(map);
    };
    loadPaqueteFaenas();
  }, [paquetes]);

  const filteredPaquetes = useMemo(() => {
    return paquetes.filter(paquete => {
      // Filtro por nombre
      if (searchFilter && !paquete.nombre.toLowerCase().includes(searchFilter.toLowerCase())) {
        return false;
      }
      // Filtro por faena
      if (faenaFilter) {
        const paqueteFaenas = paqueteFaenasMap[paquete.id] || [];
        if (!paqueteFaenas.includes(faenaFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [paquetes, searchFilter, faenaFilter, paqueteFaenasMap]);

  const getFaenaNombre = (faenaId: string) => {
    return faenas.find(f => f.id === faenaId)?.nombre || "";
  };

  if (filteredPaquetes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchFilter || faenaFilter ? "No se encontraron paquetes con los filtros aplicados" : "No hay paquetes registrados"}
      </div>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPaquetes.map((paquete) => {
          const faenasDelPaquete = paqueteFaenasMap[paquete.id] || [];
          return (
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
                      onClick={() => onEdit(paquete)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(paquete.id)}
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
                {faenasDelPaquete.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Faenas:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {faenasDelPaquete.slice(0, 3).map((faenaId) => (
                        <span key={faenaId} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                          {getFaenaNombre(faenaId)}
                        </span>
                      ))}
                      {faenasDelPaquete.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{faenasDelPaquete.length - 3} más</span>
                      )}
                    </div>
                  </div>
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
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground mt-4">
        Mostrando {filteredPaquetes.length} de {paquetes.length} paquetes
      </p>
    </>
  );
};

const Examenes = () => {
  useAuth(); // Protect route
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoFormulario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [faenas, setFaenas] = useState<Faena[]>([]);
  const [selectedFaenas, setSelectedFaenas] = useState<string[]>([]);
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
  const [paqueteExamenFilter, setPaqueteExamenFilter] = useState("");
  // Estado para filtro de búsqueda de paquetes en la lista principal
  const [paqueteSearchFilter, setPaqueteSearchFilter] = useState("");
  const [paqueteFaenaFilter, setPaqueteFaenaFilter] = useState<string>("");
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

  // Estado para filtro de búsqueda de exámenes
  const [searchFilter, setSearchFilter] = useState("");

  // Estados para importación Excel
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ExcelRowData[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadExamenes();
    loadBoxes();
    loadPaquetes();
    loadDocumentos();
    loadEmpresas();
    loadFaenas();
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

  const loadFaenas = async () => {
    try {
      const { data, error } = await supabase
        .from("faenas")
        .select("id, nombre, empresa_id")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      setFaenas(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadPaqueteFaenas = async (paqueteId: string) => {
    try {
      const { data, error } = await supabase
        .from("bateria_faenas")
        .select("faena_id")
        .eq("paquete_id", paqueteId)
        .eq("activo", true);

      if (error) throw error;
      setSelectedFaenas(data?.map(d => d.faena_id) || []);
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

        // Eliminar faenas anteriores
        await supabase
          .from("bateria_faenas")
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

      // Guardar faenas asignadas
      if (selectedFaenas.length > 0) {
        const faenasData = selectedFaenas.map(faenaId => ({
          paquete_id: paqueteId,
          faena_id: faenaId,
          activo: true,
        }));

        const { error: faenasError } = await supabase
          .from("bateria_faenas")
          .insert(faenasData);

        if (faenasError) throw faenasError;
      }
      
      toast.success(editingPaquete ? "Paquete actualizado exitosamente" : "Paquete de exámenes creado exitosamente");
      
      setOpenPaqueteDialog(false);
      setEditingPaquete(null);
      setPaqueteFormData({ nombre: "", descripcion: "" });
      setSelectedExamenes([]);
      setSelectedDocumentos([]);
      setSelectedFaenas([]);
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

  // Handlers para importación Excel
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportFile(file);
      const data = await parseExcelFile(file);
      
      if (data.length === 0) {
        toast.error("El archivo no contiene datos válidos");
        setImportFile(null);
        return;
      }

      setImportData(data);
      setImportResult(null);
      setImportProgress(0);
    } catch (error: any) {
      console.error("Error al leer archivo:", error);
      toast.error("Error al leer el archivo Excel");
      setImportFile(null);
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const result = await importExamenesYPrestadoresFromExcel(importData, setImportProgress);
      setImportResult(result);
      
      if (result.errores.length === 0) {
        toast.success("Importación completada exitosamente");
      } else {
        toast.warning(`Importación completada con ${result.errores.length} errores`);
      }
      
      loadExamenes();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error durante la importación");
    } finally {
      setIsImporting(false);
    }
  };

  const resetImportDialog = () => {
    setImportFile(null);
    setImportData([]);
    setImportProgress(0);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Filtrar exámenes por código o nombre
  const filteredExamenes = useMemo(() => {
    const searchLower = searchFilter.toLowerCase().trim();
    if (!searchLower) return examenes;
    
    return examenes.filter((examen) => {
      const codigoMatch = examen.codigo?.toLowerCase().includes(searchLower) || false;
      const nombreMatch = examen.nombre.toLowerCase().includes(searchLower);
      return codigoMatch || nombreMatch;
    });
  }, [examenes, searchFilter]);

  // Calcular preview de la importación
  const getImportPreview = () => {
    const codigosExistentes = new Set(examenes.map(e => e.codigo?.toLowerCase().trim()).filter(Boolean));
    const prestadoresUnicos = new Set<string>();
    const boxesUnicos = new Set<string>();
    
    let nuevos = 0;
    let actualizar = 0;

    importData.forEach(row => {
      if (codigosExistentes.has(row.codigo.toLowerCase().trim())) {
        actualizar++;
      } else {
        nuevos++;
      }
      if (row.prestador) {
        prestadoresUnicos.add(row.prestador.toLowerCase().trim());
      }
      if (row.box) {
        boxesUnicos.add(row.box.toLowerCase().trim());
      }
    });

    return { nuevos, actualizar, prestadores: prestadoresUnicos.size, boxes: boxesUnicos.size };
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
            {/* Botón Importar Excel */}
            <Dialog open={openImportDialog} onOpenChange={(open) => {
              setOpenImportDialog(open);
              if (!open) resetImportDialog();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Importar Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Importar Exámenes desde Excel
                  </DialogTitle>
                  <DialogDescription>
                    Carga un archivo Excel con exámenes y prestadores
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Instrucciones */}
                  <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                    <p className="font-medium">Formato esperado del archivo:</p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                      <li>Columna A: Código del examen (obligatorio)</li>
                      <li>Columna B: Nombre del examen (obligatorio)</li>
                      <li>Columna C: Costo neto (opcional)</li>
                      <li>Columna D: Nombre del prestador (opcional)</li>
                      <li>Columna E: Nombre del box (opcional)</li>
                    </ul>
                  </div>

                  {/* Input de archivo */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="excel-file-input"
                    />
                    <Label
                      htmlFor="excel-file-input"
                      className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      {importFile ? (
                        <span className="text-sm">{importFile.name}</span>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-muted-foreground">Seleccionar archivo...</span>
                        </>
                      )}
                    </Label>
                  </div>

                  {/* Preview de datos */}
                  {importData.length > 0 && !importResult && (
                    <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                      <p className="font-medium">Se encontraron {importData.length} registros</p>
                      {(() => {
                        const preview = getImportPreview();
                        return (
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• {preview.nuevos} exámenes nuevos</li>
                            <li>• {preview.actualizar} exámenes a actualizar</li>
                            <li>• {preview.prestadores} prestadores únicos</li>
                            <li>• {preview.boxes} boxes únicos</li>
                          </ul>
                        );
                      })()}
                    </div>
                  )}

                  {/* Progreso de importación */}
                  {isImporting && (
                    <div className="space-y-2">
                      <Progress value={importProgress} />
                      <p className="text-sm text-center text-muted-foreground">
                        Importando... {importProgress}%
                      </p>
                    </div>
                  )}

                  {/* Resultado de importación */}
                  {importResult && (
                    <div className="space-y-3">
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 space-y-2">
                        <p className="font-medium flex items-center gap-2 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Importación completada
                        </p>
                        <ul className="text-sm space-y-1">
                          <li>• {importResult.examenesCreados} exámenes creados</li>
                          <li>• {importResult.examenesActualizados} exámenes actualizados</li>
                          <li>• {importResult.prestadoresCreados} prestadores creados</li>
                          <li>• {importResult.relacionesCreadas} relaciones prestador-examen</li>
                          <li>• {importResult.boxRelacionesCreadas} relaciones box-examen</li>
                        </ul>
                      </div>

                      {importResult.errores.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 space-y-2">
                          <p className="font-medium flex items-center gap-2 text-red-700 dark:text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            Errores ({importResult.errores.length})
                          </p>
                          <ul className="text-sm text-red-600 dark:text-red-400 max-h-24 overflow-y-auto space-y-1">
                            {importResult.errores.slice(0, 5).map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                            {importResult.errores.length > 5 && (
                              <li>... y {importResult.errores.length - 5} más</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setOpenImportDialog(false)}
                  >
                    {importResult ? "Cerrar" : "Cancelar"}
                  </Button>
                  {!importResult && (
                    <Button
                      onClick={handleImport}
                      disabled={importData.length === 0 || isImporting}
                    >
                      Importar
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>

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
                setSelectedFaenas([]);
                setEmpresaPrecios({});
                setPaqueteDialogTab("examenes");
                setPaqueteExamenFilter("");
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
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="examenes" className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Exámenes
                      </TabsTrigger>
                      <TabsTrigger value="documentos" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Documentos
                      </TabsTrigger>
                      <TabsTrigger value="faenas" className="gap-2">
                        <MapPin className="h-4 w-4" />
                        Faenas
                      </TabsTrigger>
                      <TabsTrigger value="precios" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        Precios
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="examenes" className="mt-4 space-y-4">
                      {/* Exámenes Seleccionados */}
                      {selectedExamenes.length > 0 && (
                        <div>
                          <Label className="mb-2 block">Exámenes en el paquete ({selectedExamenes.length})</Label>
                          <div className="border rounded-md max-h-40 overflow-y-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-24">Código</TableHead>
                                  <TableHead>Nombre</TableHead>
                                  <TableHead className="w-24 text-right">Costo</TableHead>
                                  <TableHead className="w-12"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {examenes
                                  .filter(e => selectedExamenes.includes(e.id))
                                  .filter(e => {
                                    if (!paqueteExamenFilter.trim()) return true;
                                    const searchLower = paqueteExamenFilter.toLowerCase().trim();
                                    const codigoMatch = e.codigo?.toLowerCase().includes(searchLower) || false;
                                    const nombreMatch = e.nombre.toLowerCase().includes(searchLower);
                                    return codigoMatch || nombreMatch;
                                  })
                                  .map((examen) => (
                                    <TableRow key={examen.id}>
                                      <TableCell className="font-mono text-xs">{examen.codigo || "-"}</TableCell>
                                      <TableCell className="text-sm">{examen.nombre}</TableCell>
                                      <TableCell className="text-right text-xs text-muted-foreground">
                                        {examen.costo_neto && examen.costo_neto > 0 
                                          ? `$${examen.costo_neto.toLocaleString()}` 
                                          : "-"}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => setSelectedExamenes(selectedExamenes.filter(id => id !== examen.id))}
                                        >
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                      
                      {/* Buscador y lista de todos los exámenes */}
                      <div>
                        <Label className="mb-2 block">Agregar exámenes</Label>
                        <div className="relative mb-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar por código o nombre..."
                            value={paqueteExamenFilter}
                            onChange={(e) => setPaqueteExamenFilter(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                          {examenes
                            .filter(e => !selectedExamenes.includes(e.id))
                            .filter(e => {
                              if (!paqueteExamenFilter.trim()) return true;
                              const searchLower = paqueteExamenFilter.toLowerCase().trim();
                              const codigoMatch = e.codigo?.toLowerCase().includes(searchLower) || false;
                              const nombreMatch = e.nombre.toLowerCase().includes(searchLower);
                              return codigoMatch || nombreMatch;
                            })
                            .map((examen) => (
                              <label key={examen.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={false}
                                  onChange={() => setSelectedExamenes([...selectedExamenes, examen.id])}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs font-mono text-muted-foreground w-16 truncate">
                                  {examen.codigo || "-"}
                                </span>
                                <span className="text-sm flex-1">{examen.nombre}</span>
                                {examen.costo_neto && examen.costo_neto > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    ${examen.costo_neto.toLocaleString()}
                                  </span>
                                )}
                              </label>
                            ))}
                          {examenes.filter(e => !selectedExamenes.includes(e.id)).filter(e => {
                            if (!paqueteExamenFilter.trim()) return true;
                            const searchLower = paqueteExamenFilter.toLowerCase().trim();
                            const codigoMatch = e.codigo?.toLowerCase().includes(searchLower) || false;
                            const nombreMatch = e.nombre.toLowerCase().includes(searchLower);
                            return codigoMatch || nombreMatch;
                          }).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              {paqueteExamenFilter.trim() 
                                ? "No se encontraron exámenes con ese criterio" 
                                : "Todos los exámenes ya están seleccionados"}
                            </p>
                          )}
                        </div>
                      </div>
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

                    <TabsContent value="faenas" className="mt-4">
                      <Label>Faenas donde aplica este paquete</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Selecciona las faenas donde este paquete estará disponible.
                      </p>
                      <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2 mt-2">
                        {faenas.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No hay faenas creadas. Crea faenas en el módulo Empresas.
                          </p>
                        ) : (
                          faenas.map((faena) => (
                            <label key={faena.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedFaenas.includes(faena.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFaenas([...selectedFaenas, faena.id]);
                                  } else {
                                    setSelectedFaenas(selectedFaenas.filter(id => id !== faena.id));
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{faena.nombre}</span>
                            </label>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedFaenas.length} faenas seleccionadas
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
            {/* Filtro de búsqueda */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o nombre..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10 max-w-md"
              />
            </div>

            {/* Tabla de exámenes */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="w-[120px] text-right">Costo</TableHead>
                    <TableHead className="w-[100px] text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExamenes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {searchFilter ? "No se encontraron exámenes" : "No hay exámenes registrados"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExamenes.map((examen) => (
                      <TableRow key={examen.id}>
                        <TableCell className="font-mono text-sm">
                          {examen.codigo || "-"}
                        </TableCell>
                        <TableCell>{examen.nombre}</TableCell>
                        <TableCell className="text-right">
                          {examen.costo_neto ? `$${examen.costo_neto.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Contador de resultados */}
            <p className="text-sm text-muted-foreground mt-2">
              Mostrando {filteredExamenes.length} de {examenes.length} exámenes
            </p>
          </TabsContent>

          <TabsContent value="paquetes" className="mt-6">
            {/* Filtros de búsqueda */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar batería por nombre..."
                  value={paqueteSearchFilter}
                  onChange={(e) => setPaqueteSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-64">
                <select
                  value={paqueteFaenaFilter}
                  onChange={(e) => setPaqueteFaenaFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Todas las faenas</option>
                  {faenas.map((faena) => (
                    <option key={faena.id} value={faena.id}>
                      {faena.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <PaquetesGrid 
              paquetes={paquetes}
              faenas={faenas}
              searchFilter={paqueteSearchFilter}
              faenaFilter={paqueteFaenaFilter}
              onEdit={async (paquete) => {
                setEditingPaquete(paquete);
                setPaqueteFormData({
                  nombre: paquete.nombre,
                  descripcion: paquete.descripcion || "",
                });
                setSelectedExamenes(paquete.paquete_examen_items.map(item => item.examen_id));
                await Promise.all([
                  loadPaqueteDocumentos(paquete.id),
                  loadPaquetePrecios(paquete.id),
                  loadPaqueteFaenas(paquete.id)
                ]);
                setOpenPaqueteDialog(true);
              }}
              onDelete={(paqueteId) => setPaqueteToDelete(paqueteId)}
            />
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
