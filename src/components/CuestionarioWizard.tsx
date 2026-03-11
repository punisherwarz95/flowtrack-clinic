import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";

interface PreguntaConfig {
  numero: number;
  texto: string;
  tipo: "verdadero_falso" | "seleccion" | "texto";
  opciones: string[];
  respuesta_correcta: string;
  puntaje: number;
}

interface CuestionarioConfig {
  tipo_puntaje: "simple" | "ponderado";
  preguntas: PreguntaConfig[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: CuestionarioConfig) => void;
  initialConfig?: CuestionarioConfig | null;
}

const CuestionarioWizard = ({ open, onOpenChange, onSave, initialConfig }: Props) => {
  const [step, setStep] = useState<"setup" | "preguntas">(initialConfig ? "preguntas" : "setup");
  const [tipoPuntaje, setTipoPuntaje] = useState<"simple" | "ponderado">(initialConfig?.tipo_puntaje || "simple");
  
  // Setup step state
  const [cantVF, setCantVF] = useState(0);
  const [cantSelect, setCantSelect] = useState(0);
  const [cantTexto, setCantTexto] = useState(0);

  const [preguntas, setPreguntas] = useState<PreguntaConfig[]>(initialConfig?.preguntas || []);

  const generatePreguntas = () => {
    const total = cantVF + cantSelect + cantTexto;
    if (total === 0) {
      toast.error("Debe agregar al menos una pregunta");
      return;
    }

    const nuevas: PreguntaConfig[] = [];
    let num = 1;

    for (let i = 0; i < cantVF; i++) {
      nuevas.push({
        numero: num++,
        texto: `Pregunta ${num - 1}`,
        tipo: "verdadero_falso",
        opciones: ["Verdadero", "Falso"],
        respuesta_correcta: "",
        puntaje: 1,
      });
    }

    for (let i = 0; i < cantSelect; i++) {
      nuevas.push({
        numero: num++,
        texto: `Pregunta ${num - 1}`,
        tipo: "seleccion",
        opciones: ["a)", "b)", "c)", "d)"],
        respuesta_correcta: "",
        puntaje: 1,
      });
    }

    for (let i = 0; i < cantTexto; i++) {
      nuevas.push({
        numero: num++,
        texto: `Pregunta ${num - 1}`,
        tipo: "texto",
        opciones: [],
        respuesta_correcta: "",
        puntaje: 1,
      });
    }

    setPreguntas(nuevas);
    setStep("preguntas");
  };

  const updatePregunta = (index: number, field: keyof PreguntaConfig, value: any) => {
    const updated = [...preguntas];
    updated[index] = { ...updated[index], [field]: value };
    setPreguntas(updated);
  };

  const addPregunta = (tipo: "verdadero_falso" | "seleccion" | "texto") => {
    const num = preguntas.length + 1;
    setPreguntas([...preguntas, {
      numero: num,
      texto: `Pregunta ${num}`,
      tipo,
      opciones: tipo === "verdadero_falso" ? ["Verdadero", "Falso"] : tipo === "seleccion" ? ["a)", "b)", "c)", "d)"] : [],
      respuesta_correcta: "",
      puntaje: 1,
    }]);
  };

  const removePregunta = (index: number) => {
    const updated = preguntas.filter((_, i) => i !== index);
    updated.forEach((p, i) => p.numero = i + 1);
    setPreguntas(updated);
  };

  const handleSave = () => {
    // Validate: non-text questions must have correct answers
    const incomplete = preguntas.filter(p => p.tipo !== "texto" && !p.respuesta_correcta);
    if (incomplete.length > 0) {
      toast.error(`Faltan respuestas correctas en ${incomplete.length} preguntas`);
      return;
    }

    onSave({ tipo_puntaje: tipoPuntaje, preguntas });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Configurar Cuestionario
          </DialogTitle>
        </DialogHeader>

        {step === "setup" && (
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Tipo de puntaje</Label>
              <RadioGroup value={tipoPuntaje} onValueChange={(v) => setTipoPuntaje(v as any)} className="mt-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="simple" id="simple" />
                  <Label htmlFor="simple" className="text-sm">Simple (1 punto por respuesta correcta)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ponderado" id="ponderado" />
                  <Label htmlFor="ponderado" className="text-sm">Ponderado (puntaje variable por pregunta)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Verdadero / Falso</Label>
                <Input type="number" min={0} value={cantVF} onChange={e => setCantVF(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-sm">Selección</Label>
                <Input type="number" min={0} value={cantSelect} onChange={e => setCantSelect(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-sm">Texto (sin puntaje)</Label>
                <Input type="number" min={0} value={cantTexto} onChange={e => setCantTexto(parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Total: {cantVF + cantSelect + cantTexto} preguntas
            </p>

            <Button onClick={generatePreguntas} className="w-full">
              Generar Preguntas
            </Button>
          </div>
        )}

        {step === "preguntas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{preguntas.length} preguntas</Badge>
                <Badge variant="secondary">{tipoPuntaje === "simple" ? "Puntaje simple" : "Puntaje ponderado"}</Badge>
              </div>
              {!initialConfig && (
                <Button variant="outline" size="sm" onClick={() => setStep("setup")}>
                  Volver a setup
                </Button>
              )}
            </div>

            {preguntas.map((pregunta, index) => (
              <Card key={index} className="relative">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Badge className="shrink-0 mt-1">{pregunta.numero}</Badge>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {pregunta.tipo === "verdadero_falso" ? "V/F" : pregunta.tipo === "seleccion" ? "Selección" : "Texto"}
                        </Badge>
                        <Input
                          value={pregunta.texto}
                          onChange={e => updatePregunta(index, "texto", e.target.value)}
                          placeholder="Texto de la pregunta"
                          className="flex-1"
                        />
                        {tipoPuntaje === "ponderado" && pregunta.tipo !== "texto" && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Label className="text-xs">Pts:</Label>
                            <Input
                              type="number"
                              min={0}
                              value={pregunta.puntaje}
                              onChange={e => updatePregunta(index, "puntaje", parseInt(e.target.value) || 0)}
                              className="w-16"
                            />
                          </div>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removePregunta(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {pregunta.tipo === "verdadero_falso" && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Respuesta correcta:</Label>
                          <RadioGroup
                            value={pregunta.respuesta_correcta}
                            onValueChange={v => updatePregunta(index, "respuesta_correcta", v)}
                            className="flex gap-4 mt-1"
                          >
                            <div className="flex items-center gap-1">
                              <RadioGroupItem value="Verdadero" id={`vf-v-${index}`} />
                              <Label htmlFor={`vf-v-${index}`} className="text-sm">Verdadero</Label>
                            </div>
                            <div className="flex items-center gap-1">
                              <RadioGroupItem value="Falso" id={`vf-f-${index}`} />
                              <Label htmlFor={`vf-f-${index}`} className="text-sm">Falso</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      )}

                      {pregunta.tipo === "seleccion" && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Opciones (una por línea):</Label>
                          <Textarea
                            value={pregunta.opciones.join("\n")}
                            onChange={e => updatePregunta(index, "opciones", e.target.value.split("\n"))}
                            rows={3}
                            placeholder={"a) Opción 1\nb) Opción 2\nc) Opción 3"}
                          />
                          <div>
                            <Label className="text-xs text-muted-foreground">Respuesta correcta:</Label>
                            <Select
                              value={pregunta.respuesta_correcta}
                              onValueChange={v => updatePregunta(index, "respuesta_correcta", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar respuesta correcta..." />
                              </SelectTrigger>
                              <SelectContent>
                                {pregunta.opciones.filter(o => o.trim()).map((opt, i) => (
                                  <SelectItem key={i} value={opt.trim()}>{opt.trim()}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {pregunta.tipo === "texto" && (
                        <p className="text-xs text-muted-foreground italic">
                          Campo de texto libre (no se evalúa para puntaje)
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addPregunta("verdadero_falso")}>
                <Plus className="h-3 w-3 mr-1" /> V/F
              </Button>
              <Button variant="outline" size="sm" onClick={() => addPregunta("seleccion")}>
                <Plus className="h-3 w-3 mr-1" /> Selección
              </Button>
              <Button variant="outline" size="sm" onClick={() => addPregunta("texto")}>
                <Plus className="h-3 w-3 mr-1" /> Texto
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={handleSave}>
                Guardar Cuestionario ({preguntas.length} preguntas)
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CuestionarioWizard;
