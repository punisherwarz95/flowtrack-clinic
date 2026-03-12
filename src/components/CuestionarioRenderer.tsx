import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

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

interface CuestionarioResultado {
  respuestas: Record<string, string>;
  puntaje_obtenido: number;
  puntaje_total: number;
  porcentaje: number;
  detalle: Array<{
    numero: number;
    texto: string;
    respuesta: string;
    correcta: string;
    correcto: boolean;
    puntaje_pregunta: number;
  }>;
}

interface Props {
  config: CuestionarioConfig;
  value: string | null;
  onChange: (value: string) => void;
  readonly?: boolean;
}

const CuestionarioRenderer = ({ config, value, onChange, readonly = false }: Props) => {
  const parsed: CuestionarioResultado | null = useMemo(() => {
    if (!value) return null;
    try { return JSON.parse(value); } catch { return null; }
  }, [value]);

  const [respuestas, setRespuestas] = useState<Record<string, string>>(parsed?.respuestas || {});

  useEffect(() => {
    if (parsed?.respuestas) {
      setRespuestas(parsed.respuestas);
    }
  }, []);

  const calcularYEmitir = (nuevasRespuestas: Record<string, string>) => {
    setRespuestas(nuevasRespuestas);

    const detalle = config.preguntas.map(p => {
      const resp = nuevasRespuestas[String(p.numero)] || "";
      const correcto = p.tipo === "texto" ? true : resp === p.respuesta_correcta;
      return {
        numero: p.numero,
        texto: p.texto,
        respuesta: resp,
        correcta: p.respuesta_correcta,
        correcto,
        puntaje_pregunta: p.tipo === "texto" ? 0 : (config.tipo_puntaje === "simple" ? 1 : p.puntaje),
      };
    });

    const preguntasConPuntaje = detalle.filter(d => d.puntaje_pregunta > 0);
    const puntaje_total = preguntasConPuntaje.reduce((sum, d) => sum + d.puntaje_pregunta, 0);
    const puntaje_obtenido = preguntasConPuntaje.filter(d => d.correcto).reduce((sum, d) => sum + d.puntaje_pregunta, 0);
    const porcentaje = puntaje_total > 0 ? Math.round((puntaje_obtenido / puntaje_total) * 100) : 0;

    const resultado: CuestionarioResultado = {
      respuestas: nuevasRespuestas,
      puntaje_obtenido,
      puntaje_total,
      porcentaje,
      detalle,
    };

    onChange(JSON.stringify(resultado));
  };

  const updateRespuesta = (numero: number, valor: string) => {
    const nuevas = { ...respuestas, [String(numero)]: valor };
    calcularYEmitir(nuevas);
  };

  // Calculate current score for display
  const scoreInfo = useMemo(() => {
    if (!parsed) return null;
    return { obtenido: parsed.puntaje_obtenido, total: parsed.puntaje_total, porcentaje: parsed.porcentaje };
  }, [parsed]);

  return (
    <div className="space-y-3 col-span-full">
      {scoreInfo && readonly && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
          <Badge variant={scoreInfo.porcentaje >= 70 ? "default" : "destructive"} className="text-sm px-3 py-1">
            {scoreInfo.obtenido} / {scoreInfo.total}
          </Badge>
          <span className="text-sm font-medium">{scoreInfo.porcentaje}%</span>
          <span className="text-xs text-muted-foreground">
            ({config.tipo_puntaje === "simple" ? "Puntaje simple" : "Puntaje ponderado"})
          </span>
        </div>
      )}

      {config.preguntas.map((pregunta) => {
        const resp = respuestas[String(pregunta.numero)] || "";
        const isAnswered = resp !== "";
        const isCorrect = pregunta.tipo === "texto" ? null : (isAnswered && readonly ? resp === pregunta.respuesta_correcta : null);

        return (
          <div key={pregunta.numero} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-0.5">{pregunta.numero}</Badge>
              <span className="text-sm font-medium flex-1">{pregunta.texto}</span>
              {pregunta.tipo !== "texto" && config.tipo_puntaje === "ponderado" && (
                <Badge variant="secondary" className="text-xs shrink-0">{pregunta.puntaje} pts</Badge>
              )}
              {readonly && isCorrect !== null && (
                isCorrect
                  ? <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                  : <XCircle className="h-4 w-4 text-destructive shrink-0" />
              )}
            </div>

            {pregunta.tipo === "verdadero_falso" && (
              <RadioGroup
                value={resp}
                onValueChange={v => updateRespuesta(pregunta.numero, v)}
                disabled={readonly}
                className="flex gap-4 ml-8"
              >
                {pregunta.opciones.map(opt => (
                  <div key={opt} className="flex items-center gap-1">
                    <RadioGroupItem value={opt} id={`q${pregunta.numero}-${opt}`} />
                    <Label htmlFor={`q${pregunta.numero}-${opt}`} className="text-sm">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {pregunta.tipo === "seleccion" && (
              <RadioGroup
                value={resp}
                onValueChange={v => updateRespuesta(pregunta.numero, v)}
                disabled={readonly}
                className="space-y-1 ml-8"
              >
                {pregunta.opciones.filter(o => o.trim()).map(opt => (
                  <div key={opt} className="flex items-center gap-2">
                    <RadioGroupItem value={opt.trim()} id={`q${pregunta.numero}-${opt.trim()}`} />
                    <Label htmlFor={`q${pregunta.numero}-${opt.trim()}`} className="text-sm">{opt.trim()}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {pregunta.tipo === "texto" && (
              <div className="ml-8">
                <Input
                  value={resp}
                  onChange={e => updateRespuesta(pregunta.numero, e.target.value)}
                  disabled={readonly}
                  placeholder="Respuesta..."
                />
              </div>
            )}

            {readonly && isCorrect === false && (
              <p className="text-xs text-destructive ml-8">
                Respuesta correcta: <span className="font-medium">{pregunta.respuesta_correcta}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CuestionarioRenderer;

// Utility for displaying score summary in EvaluacionMedica
export const CuestionarioScoreSummary = ({ value }: { value: string }) => {
  const parsed = useMemo(() => {
    try { return JSON.parse(value); } catch { return null; }
  }, [value]);

  if (!parsed || !parsed.puntaje_total) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
        <Badge variant={parsed.porcentaje >= 70 ? "default" : "destructive"} className="text-sm px-3 py-1">
          Puntaje: {parsed.puntaje_obtenido} / {parsed.puntaje_total}
        </Badge>
        <span className="text-sm font-semibold">{parsed.porcentaje}%</span>
      </div>
      {parsed.detalle && (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {parsed.detalle.map((d: any) => (
            <div key={d.numero} className="flex items-center gap-2 text-xs border-b last:border-0 pb-1">
              <span className="text-muted-foreground w-6 shrink-0">#{d.numero}</span>
              <span className="flex-1 truncate">{d.texto}</span>
              {d.puntaje_pregunta > 0 ? (
                <>
                  <span className={`font-medium ${d.correcto ? "text-green-600" : "text-destructive"}`}>
                    {d.respuesta || "—"}
                  </span>
                  {!d.correcto && (
                    <span className="text-muted-foreground">({d.correcta})</span>
                  )}
                  {d.correcto ? (
                    <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-destructive shrink-0" />
                  )}
                </>
              ) : (
                <span className="text-muted-foreground italic">{d.respuesta || "—"}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
