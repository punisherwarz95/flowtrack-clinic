import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Eye, FileText } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const AUDIO_FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const FREQ_LABELS: Record<number, string> = {
  250: "250Hz", 500: "500Hz", 1000: "1kHz", 2000: "2kHz",
  3000: "3kHz", 4000: "4kHz", 6000: "6kHz", 8000: "8kHz",
};

function tryParseAudiometria(valor: string | null): any | null {
  if (!valor) return null;
  try {
    const parsed = JSON.parse(valor);
    if (parsed && typeof parsed === "object" && "oido_derecho" in parsed && "oido_izquierdo" in parsed) {
      return parsed;
    }
  } catch {}
  return null;
}

function tryParseJson(valor: string | null): Record<string, any> | null {
  if (!valor) return null;
  try {
    const parsed = JSON.parse(valor);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {}
  return null;
}

const ANTRO_LABELS: Record<string, string> = {
  peso: "Peso (kg)",
  talla: "Talla (cm)",
  imc: "IMC",
  circunferencia_cintura: "Cintura (cm)",
  pgc: "PGC (%)",
  riesgo_cardiovascular: "Riesgo CV (%)",
  pa_sistolica_1: "PA Sist. 1ª",
  pa_diastolica_1: "PA Diast. 1ª",
  pa_sistolica_2: "PA Sist. 2ª",
  pa_diastolica_2: "PA Diast. 2ª",
  pa_sistolica_3: "PA Sist. 3ª",
  pa_diastolica_3: "PA Diast. 3ª",
  fc: "FC (lpm)",
  saturacion: "SpO₂ (%)",
  temperatura: "Temp (°C)",
};

interface Props {
  atencionId: string;
  currentBoxId: string;
}

interface OtroBoxResultado {
  boxNombre: string;
  examenes: Array<{
    examenNombre: string;
    estado: string;
    resultados: Array<{
      etiqueta: string;
      valor: string | null;
      archivo_url: string | null;
    }>;
  }>;
}

const ExamenResultadosOtrosBoxes = ({ atencionId, currentBoxId }: Props) => {
  const [data, setData] = useState<OtroBoxResultado[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) loadData();
  }, [atencionId, isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get all atencion_examenes for this atencion that are NOT in the current box
      const { data: atencionExamenes, error } = await supabase
        .from("atencion_examenes")
        .select("id, examen_id, estado, examenes(nombre)")
        .eq("atencion_id", atencionId);

      if (error) throw error;

      // Get box assignments for these examenes
      const examenIds = (atencionExamenes || []).map((ae: any) => ae.examen_id);
      const { data: boxExamenes } = await supabase
        .from("box_examenes")
        .select("examen_id, box_id, boxes(nombre)")
        .in("examen_id", examenIds);

      // Get current box exam ids to exclude
      const { data: currentBoxExamenes } = await supabase
        .from("box_examenes")
        .select("examen_id")
        .eq("box_id", currentBoxId);

      const currentBoxExamIds = new Set((currentBoxExamenes || []).map((be: any) => be.examen_id));

      // Get resultados for all atencion_examenes
      const atencionExamenIds = (atencionExamenes || []).map((ae: any) => ae.id);
      const { data: resultados } = await supabase
        .from("examen_resultados")
        .select("atencion_examen_id, campo_id, valor, archivo_url, examen_formulario_campos(etiqueta)")
        .in("atencion_examen_id", atencionExamenIds);

      // Build grouped data by box
      const boxMap: Record<string, OtroBoxResultado> = {};

      for (const ae of atencionExamenes || []) {
        if (currentBoxExamIds.has(ae.examen_id)) continue;

        const boxExam = (boxExamenes || []).find((be: any) => be.examen_id === ae.examen_id);
        const boxNombre = (boxExam as any)?.boxes?.nombre || "Sin box";
        const boxId = boxExam?.box_id || "none";

        if (!boxMap[boxId]) {
          boxMap[boxId] = { boxNombre, examenes: [] };
        }

        const examenResultados = (resultados || [])
          .filter((r: any) => r.atencion_examen_id === ae.id)
          .map((r: any) => ({
            etiqueta: (r as any).examen_formulario_campos?.etiqueta || "Campo",
            valor: r.valor,
            archivo_url: r.archivo_url,
          }));

        boxMap[boxId].examenes.push({
          examenNombre: (ae as any).examenes?.nombre || "Examen",
          estado: ae.estado || "pendiente",
          resultados: examenResultados,
        });
      }

      setData(Object.values(boxMap));
    } catch (error) {
      console.error("Error loading otros boxes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (data.length === 0 && !loading && isOpen) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
        <Eye className="h-4 w-4" />
        <span>Datos de otros boxes</span>
        <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay datos de otros boxes</p>
        ) : (
          data.map((box, idx) => (
            <div key={idx} className="border rounded-md p-3 space-y-2 bg-muted/30">
              <h5 className="text-sm font-semibold">{box.boxNombre}</h5>
              {box.examenes.map((examen, eidx) => (
                <div key={eidx} className="ml-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{examen.examenNombre}</span>
                    <Badge
                      variant={examen.estado === "completado" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {examen.estado}
                    </Badge>
                  </div>
                  {examen.resultados.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 ml-2">
                      {examen.resultados.map((r, ridx) => {
                        const audioData = tryParseAudiometria(r.valor);
                        if (audioData) {
                          const chartData = AUDIO_FREQUENCIES.map((freq) => ({
                            freq: FREQ_LABELS[freq],
                            "Oído Derecho": audioData.oido_derecho?.[freq] ?? undefined,
                            "Oído Izquierdo": audioData.oido_izquierdo?.[freq] ?? undefined,
                          }));
                          return (
                            <div key={ridx} className="col-span-2 text-xs space-y-2">
                              <span className="text-muted-foreground font-medium">{r.etiqueta}:</span>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <div className="border border-destructive/30 rounded p-2 bg-destructive/5">
                                  <div className="flex items-center gap-1 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-destructive" />
                                    <span className="font-semibold">OD (Oído Derecho)</span>
                                    {audioData.pta_derecho !== null && (
                                      <Badge variant="outline" className="ml-auto text-[10px] h-4 border-destructive/30">
                                        PTP OD: {audioData.pta_derecho} dB
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                    {AUDIO_FREQUENCIES.map(f => (
                                      <span key={f} className="text-muted-foreground">
                                        {FREQ_LABELS[f]}: <span className="font-medium text-foreground">{audioData.oido_derecho?.[f] ?? "-"} dB</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="border border-primary/30 rounded p-2 bg-primary/5">
                                  <div className="flex items-center gap-1 mb-1">
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                    <span className="font-semibold">OI (Oído Izquierdo)</span>
                                    {audioData.pta_izquierdo !== null && (
                                      <Badge variant="outline" className="ml-auto text-[10px] h-4 border-primary/30">
                                        PTP OI: {audioData.pta_izquierdo} dB
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                    {AUDIO_FREQUENCIES.map(f => (
                                      <span key={f} className="text-muted-foreground">
                                        {FREQ_LABELS[f]}: <span className="font-medium text-foreground">{audioData.oido_izquierdo?.[f] ?? "-"} dB</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <Card className="mt-1">
                                <CardContent className="pt-3 pb-2 px-2">
                                  <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={chartData} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                      <XAxis dataKey="freq" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                                      <YAxis
                                        reversed
                                        domain={[-10, 130]}
                                        ticks={[-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130]}
                                        tick={{ fontSize: 9 }}
                                        stroke="hsl(var(--muted-foreground))"
                                        label={{ value: "dB HL", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                                      />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: "hsl(var(--background))",
                                          border: "1px solid hsl(var(--border))",
                                          borderRadius: "8px",
                                          fontSize: 11,
                                        }}
                                      />
                                      <Legend wrapperStyle={{ fontSize: 11 }} />
                                      <ReferenceLine y={25} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" label={{ value: "Normal ≤25dB", position: "right", fontSize: 9 }} />
                                      <Line type="monotone" dataKey="Oído Derecho" stroke="#ef4444" strokeWidth={2} dot={(props: any) => { const {cx,cy}=props; if(cx==null||cy==null) return <></>; return <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#ef4444"/>; }} connectNulls={false} />
                                      <Line type="monotone" dataKey="Oído Izquierdo" stroke="#3b82f6" strokeWidth={2} dot={(props: any) => { const {cx,cy}=props; if(cx==null||cy==null) return <></>; return <g><line x1={cx-4} y1={cy-4} x2={cx+4} y2={cy+4} stroke="#3b82f6" strokeWidth={2}/><line x1={cx+4} y1={cy-4} x2={cx-4} y2={cy+4} stroke="#3b82f6" strokeWidth={2}/></g>; }} connectNulls={false} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </CardContent>
                              </Card>
                            </div>
                          );
                        }
                        // Try parsing as generic JSON (e.g. anthropometry)
                        const jsonData = tryParseJson(r.valor);
                        if (jsonData) {
                          const entries = Object.entries(jsonData).filter(
                            ([k, v]) => v !== null && v !== "" && !k.startsWith("pa_timer")
                          );
                          if (entries.length === 0) {
                            return (
                              <div key={ridx} className="text-xs col-span-2">
                                <span className="text-muted-foreground">{r.etiqueta}:</span>{" "}
                                <span className="font-medium">-</span>
                              </div>
                            );
                          }
                          return (
                            <div key={ridx} className="col-span-2 text-xs space-y-1">
                              <span className="text-muted-foreground font-medium">{r.etiqueta}:</span>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-1 border rounded-md p-2 bg-muted/20">
                                {entries.map(([key, val]) => (
                                  <div key={key} className="flex flex-col">
                                    <span className="text-muted-foreground text-[10px] truncate">
                                      {ANTRO_LABELS[key] || key.replace(/_/g, " ")}
                                    </span>
                                    <span className="font-semibold text-sm">{String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div key={ridx} className="text-xs">
                            <span className="text-muted-foreground">{r.etiqueta}:</span>{" "}
                            {r.archivo_url ? (
                              <a href={r.archivo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Ver
                              </a>
                            ) : (
                              <span className="font-medium">{r.valor || "-"}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ExamenResultadosOtrosBoxes;
