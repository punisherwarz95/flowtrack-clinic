import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

interface DocumentoCampo {
  id: string;
  documento_id: string;
  etiqueta: string;
  tipo_campo: string;
  opciones: unknown;
  requerido: boolean;
  orden: number;
}

interface AtencionDocumento {
  id: string;
  atencion_id: string;
  documento_id: string;
  respuestas: Record<string, unknown>;
  estado: string;
  completado_at: string | null;
  revisado_at: string | null;
  revisado_por: string | null;
  observaciones: string | null;
  documentos_formularios: {
    id: string;
    nombre: string;
    descripcion: string | null;
    tipo: string;
  };
}

// Context data for variable replacement
export interface DocumentoContextData {
  paciente?: {
    nombre?: string;
    rut?: string;
    fecha_nacimiento?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  };
  empresa?: string;
  numero_ingreso?: number;
}

interface DocumentoFormViewerProps {
  atencionDocumento: AtencionDocumento;
  campos: DocumentoCampo[];
  readonly?: boolean;
  onComplete?: () => void;
  showHeader?: boolean;
  contextData?: DocumentoContextData;
}

// Helper to safely get opciones as string array
const getOpcionesArray = (opciones: unknown): string[] => {
  if (Array.isArray(opciones)) {
    return opciones.filter((o): o is string => typeof o === "string");
  }
  return [];
};

// Calculate age from birth date
const calculateAge = (birthDateStr?: string): string => {
  if (!birthDateStr) return "[Sin edad]";
  try {
    const birthDate = new Date(birthDateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} años`;
  } catch {
    return "[Sin edad]";
  }
};

// Replace variables in text with actual values
const replaceVariables = (text: string, context?: DocumentoContextData): string => {
  if (!context) return text;
  
  let result = text;
  
  // Patient variables
  if (context.paciente) {
    result = result.replace(/\{\{nombre\}\}/g, context.paciente.nombre || "[Sin nombre]");
    result = result.replace(/\{\{rut\}\}/g, context.paciente.rut || "[Sin RUT]");
    result = result.replace(/\{\{fecha_nacimiento\}\}/g, context.paciente.fecha_nacimiento || "[Sin fecha]");
    result = result.replace(/\{\{edad\}\}/g, calculateAge(context.paciente.fecha_nacimiento));
    result = result.replace(/\{\{email\}\}/g, context.paciente.email || "[Sin email]");
    result = result.replace(/\{\{telefono\}\}/g, context.paciente.telefono || "[Sin teléfono]");
    result = result.replace(/\{\{direccion\}\}/g, context.paciente.direccion || "[Sin dirección]");
  }
  
  // Company variable
  result = result.replace(/\{\{empresa\}\}/g, context.empresa || "[Sin empresa]");
  
  // Attention variables
  result = result.replace(/\{\{numero_ingreso\}\}/g, context.numero_ingreso?.toString() || "[Sin número]");
  
  // System variables
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-CL', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  result = result.replace(/\{\{fecha_actual\}\}/g, formattedDate);
  
  return result;
};

export const DocumentoFormViewer = ({
  atencionDocumento,
  campos,
  readonly = false,
  onComplete,
  showHeader = true,
  contextData,
}: DocumentoFormViewerProps) => {
  const [respuestas, setRespuestas] = useState<Record<string, unknown>>(
    atencionDocumento.respuestas || {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Use a map of refs for multiple signature fields
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeSignatureField, setActiveSignatureField] = useState<string | null>(null);

  const isComplete = atencionDocumento.estado === "completado";
  const isReviewed = atencionDocumento.estado === "revisado";

  const handleChange = (fieldId: string, value: unknown) => {
    if (readonly || isComplete || isReviewed) return;
    setRespuestas((prev) => ({ ...prev, [fieldId]: value }));
  };

  const validateForm = (): boolean => {
    for (const campo of campos) {
      if (campo.requerido) {
        const valor = respuestas[campo.id];
        if (valor === undefined || valor === null || valor === "") {
          toast({
            title: "Campo requerido",
            description: `El campo "${campo.etiqueta}" es obligatorio`,
            variant: "destructive",
          });
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("atencion_documentos")
        .update({
          respuestas: respuestas as Json,
          estado: "completado",
          completado_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", atencionDocumento.id);

      if (error) throw error;

      toast({
        title: "Documento completado",
        description: "Sus respuestas han sido guardadas correctamente",
      });
      onComplete?.();
    } catch (error: any) {
      console.error("Error saving document:", error);
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo guardar el documento",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Signature canvas handling - use field-specific canvas from refs map
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, fieldId: string) => {
    if (readonly || isComplete || isReviewed) return;
    setIsDrawing(true);
    setActiveSignatureField(fieldId);
    const canvas = canvasRefs.current.get(fieldId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;
    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, fieldId: string) => {
    if (!isDrawing || activeSignatureField !== fieldId || readonly || isComplete || isReviewed) return;
    const canvas = canvasRefs.current.get(fieldId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;
    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (fieldId: string) => {
    if (!isDrawing || activeSignatureField !== fieldId) return;
    setIsDrawing(false);
    const canvas = canvasRefs.current.get(fieldId);
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    handleChange(fieldId, dataUrl);
    setActiveSignatureField(null);
  };

  const clearSignature = (fieldId: string) => {
    const canvas = canvasRefs.current.get(fieldId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    handleChange(fieldId, "");
  };

  const renderField = (campo: DocumentoCampo) => {
    const value = respuestas[campo.id];
    const isDisabled = readonly || isComplete || isReviewed;

    switch (campo.tipo_campo) {
      case "texto_informativo":
        return (
          <div className="bg-muted/50 border rounded-md p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {replaceVariables(campo.etiqueta, contextData)}
          </div>
        );

      case "texto":
        return (
          <Input
            value={(value as string) || ""}
            onChange={(e) => handleChange(campo.id, e.target.value)}
            placeholder={campo.etiqueta}
            disabled={isDisabled}
          />
        );

      case "texto_largo":
        return (
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => handleChange(campo.id, e.target.value)}
            placeholder={campo.etiqueta}
            disabled={isDisabled}
            rows={4}
          />
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={campo.id}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(campo.id, checked)}
              disabled={isDisabled}
            />
            <Label htmlFor={campo.id} className="text-sm cursor-pointer">
              {campo.etiqueta}
            </Label>
          </div>
        );

      case "select":
        return (
          <Select
            value={(value as string) || ""}
            onValueChange={(v) => handleChange(campo.id, v)}
            disabled={isDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {getOpcionesArray(campo.opciones).map((op, i) => (
                <SelectItem key={i} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "radio":
        return (
          <RadioGroup
            value={(value as string) || ""}
            onValueChange={(v) => handleChange(campo.id, v)}
            disabled={isDisabled}
          >
            {getOpcionesArray(campo.opciones).map((op, i) => (
              <div key={i} className="flex items-center space-x-2">
                <RadioGroupItem value={op} id={`${campo.id}-${i}`} />
                <Label htmlFor={`${campo.id}-${i}`} className="text-sm cursor-pointer">
                  {op}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "fecha":
        return (
          <Input
            type="date"
            value={(value as string) || ""}
            onChange={(e) => handleChange(campo.id, e.target.value)}
            disabled={isDisabled}
          />
        );

      case "firma":
        const signatureValue = value as string | undefined;
        if (signatureValue && isDisabled) {
          return (
            <div className="border rounded-md p-2 bg-muted/30">
              <img src={signatureValue} alt="Firma" className="max-h-24 mx-auto" />
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <div className="border-2 border-dashed rounded-md relative bg-white">
              <canvas
                ref={(el) => {
                  if (el) {
                    canvasRefs.current.set(campo.id, el);
                    const ctx = el.getContext("2d");
                    if (ctx) {
                      ctx.strokeStyle = "#000";
                      ctx.lineWidth = 2;
                      ctx.lineCap = "round";
                      // Load existing signature if any
                      if (signatureValue && !el.dataset.loaded) {
                        el.dataset.loaded = "true";
                        const img = new Image();
                        img.onload = () => {
                          ctx.drawImage(img, 0, 0);
                        };
                        img.src = signatureValue;
                      }
                    }
                  }
                }}
                width={300}
                height={130}
                className="w-full h-32 cursor-crosshair touch-none"
                onMouseDown={(e) => startDrawing(e, campo.id)}
                onMouseMove={(e) => draw(e, campo.id)}
                onMouseUp={() => stopDrawing(campo.id)}
                onMouseLeave={() => stopDrawing(campo.id)}
                onTouchStart={(e) => startDrawing(e, campo.id)}
                onTouchMove={(e) => draw(e, campo.id)}
                onTouchEnd={() => stopDrawing(campo.id)}
              />
            </div>
            {!isDisabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => clearSignature(campo.id)}
              >
                Limpiar firma
              </Button>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={(value as string) || ""}
            onChange={(e) => handleChange(campo.id, e.target.value)}
            disabled={isDisabled}
          />
        );
    }
  };

  const getStatusBadge = () => {
    if (isReviewed) {
      return <Badge className="bg-primary text-primary-foreground">Revisado</Badge>;
    }
    if (isComplete) {
      return <Badge className="bg-secondary text-secondary-foreground">Completado</Badge>;
    }
    return <Badge variant="outline">Pendiente</Badge>;
  };

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {atencionDocumento.documentos_formularios.nombre}
              </CardTitle>
              {atencionDocumento.documentos_formularios.descripcion && (
                <CardDescription className="mt-1">
                  {atencionDocumento.documentos_formularios.descripcion}
                </CardDescription>
              )}
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {campos.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Este documento no tiene campos configurados</p>
          </div>
        ) : (
          campos
            .sort((a, b) => a.orden - b.orden)
            .map((campo) => (
              <div key={campo.id} className="space-y-2">
                {campo.tipo_campo !== "checkbox" && campo.tipo_campo !== "texto_informativo" && (
                  <Label className="flex items-center gap-1">
                    {campo.etiqueta}
                    {campo.requerido && <span className="text-destructive">*</span>}
                  </Label>
                )}
                {renderField(campo)}
              </div>
            ))
        )}
      </CardContent>
      {!readonly && !isComplete && !isReviewed && campos.length > 0 && (
        <CardFooter>
          <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Completar Documento
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

// Compact card to show document status in lists
interface DocumentoStatusCardProps {
  atencionDocumento: AtencionDocumento;
  onClick?: () => void;
}

export const DocumentoStatusCard = ({ atencionDocumento, onClick }: DocumentoStatusCardProps) => {
  const getStatusInfo = () => {
    switch (atencionDocumento.estado) {
      case "revisado":
        return { label: "Revisado", variant: "default" as const, className: "bg-primary" };
      case "completado":
        return { label: "Completado", variant: "default" as const, className: "bg-secondary text-secondary-foreground" };
      default:
        return { label: "Pendiente", variant: "outline" as const, className: "" };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${
        atencionDocumento.estado === "pendiente" ? "border-amber-500/50 bg-amber-500/5" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">
          {atencionDocumento.documentos_formularios.nombre}
        </span>
      </div>
      <Badge variant={statusInfo.variant} className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    </div>
  );
};
