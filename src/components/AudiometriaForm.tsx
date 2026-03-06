import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const FREQ_LABELS: Record<number, string> = {
  250: "250Hz",
  500: "500Hz",
  1000: "1000Hz",
  2000: "2000Hz",
  3000: "3000Hz",
  4000: "4000Hz",
  6000: "6000Hz",
  8000: "8000Hz",
};

export interface AudiometriaData {
  oido_derecho: Record<number, number | null>;
  oido_izquierdo: Record<number, number | null>;
  pta_derecho: number | null;
  pta_izquierdo: number | null;
}

function calcularEdadDesdeNacimiento(fechaNacimiento: string): number {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

function calcPTA(
  valores: Record<number, number | null>,
  incluir4000: boolean
): number | null {
  const freqs = incluir4000 ? [500, 1000, 2000, 4000] : [500, 1000, 2000];
  const vals = freqs.map((f) => valores[f]).filter((v) => v !== null && v !== undefined) as number[];
  if (vals.length !== freqs.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

interface Props {
  value: string | null;
  onChange: (value: string) => void;
  readonly?: boolean;
  fechaNacimiento?: string | null;
}

const AudiometriaForm = ({ value, onChange, readonly = false, fechaNacimiento }: Props) => {
  const parsed: AudiometriaData = useMemo(() => {
    if (value) {
      try {
        return JSON.parse(value);
      } catch {}
    }
    return {
      oido_derecho: {},
      oido_izquierdo: {},
      pta_derecho: null,
      pta_izquierdo: null,
    };
  }, [value]);

  const [derecho, setDerecho] = useState<Record<number, number | null>>(parsed.oido_derecho || {});
  const [izquierdo, setIzquierdo] = useState<Record<number, number | null>>(parsed.oido_izquierdo || {});

  const edad = fechaNacimiento ? calcularEdadDesdeNacimiento(fechaNacimiento) : null;
  const incluir4000 = edad !== null && edad >= 65;

  const ptaDerecho = calcPTA(derecho, incluir4000);
  const ptaIzquierdo = calcPTA(izquierdo, incluir4000);

  // Sync back to parent
  useEffect(() => {
    const data: AudiometriaData = {
      oido_derecho: derecho,
      oido_izquierdo: izquierdo,
      pta_derecho: ptaDerecho,
      pta_izquierdo: ptaIzquierdo,
    };
    const json = JSON.stringify(data);
    if (json !== value) {
      onChange(json);
    }
  }, [derecho, izquierdo, ptaDerecho, ptaIzquierdo]);

  const updateFreq = (oido: "derecho" | "izquierdo", freq: number, val: string) => {
    const setter = oido === "derecho" ? setDerecho : setIzquierdo;
    setter((prev) => ({
      ...prev,
      [freq]: val === "" ? null : Number(val),
    }));
  };

  const chartData = FREQUENCIES.map((freq) => ({
    freq: FREQ_LABELS[freq],
    "Oído Derecho": derecho[freq] ?? undefined,
    "Oído Izquierdo": izquierdo[freq] ?? undefined,
  }));

  const ptaFreqLabel = incluir4000 ? "500, 1000, 2000, 4000 Hz" : "500, 1000, 2000 Hz";

  return (
    <div className="space-y-4 w-full">
      {/* Inputs */}
      <div className="grid grid-cols-1 gap-4">
        {/* Oído Derecho */}
        <Card className="border-red-200">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <Label className="font-semibold text-sm">Oído Derecho (dB)</Label>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {FREQUENCIES.map((freq) => (
                <div key={freq}>
                  <Label className="text-[10px] text-muted-foreground">{FREQ_LABELS[freq]}</Label>
                  <Input
                    type="number"
                    step="5"
                    min="-10"
                    max="130"
                    value={derecho[freq] ?? ""}
                    onChange={(e) => updateFreq("derecho", freq, e.target.value)}
                    disabled={readonly}
                    className="h-8 text-xs text-center"
                    placeholder="dB"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Oído Izquierdo */}
        <Card className="border-blue-200">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <Label className="font-semibold text-sm">Oído Izquierdo (dB)</Label>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {FREQUENCIES.map((freq) => (
                <div key={freq}>
                  <Label className="text-[10px] text-muted-foreground">{FREQ_LABELS[freq]}</Label>
                  <Input
                    type="number"
                    step="5"
                    min="-10"
                    max="130"
                    value={izquierdo[freq] ?? ""}
                    onChange={(e) => updateFreq("izquierdo", freq, e.target.value)}
                    disabled={readonly}
                    className="h-8 text-xs text-center"
                    placeholder="dB"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PTA Results */}
      <div className="flex flex-wrap gap-3">
        <Badge variant="outline" className="gap-1 text-sm py-1 px-3 border-red-300">
          PTP OD: {ptaDerecho !== null ? `${ptaDerecho} dB` : "—"}
        </Badge>
        <Badge variant="outline" className="gap-1 text-sm py-1 px-3 border-blue-300">
          PTP OI: {ptaIzquierdo !== null ? `${ptaIzquierdo} dB` : "—"}
        </Badge>
        <span className="text-xs text-muted-foreground self-center">
          Promedio: {ptaFreqLabel}
          {incluir4000 && " (paciente ≥65 años)"}
        </span>
      </div>

      {/* Chart - Always visible */}
      <Card>
        <CardContent className="pt-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="freq"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                reversed
                domain={[-10, 130]}
                ticks={[-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130]}
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                label={{ value: "dB HL", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
              />
              <Legend />
              <ReferenceLine y={25} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" label={{ value: "Normal ≤25dB", position: "right", fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="Oído Derecho"
                stroke="#ef4444"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy } = props;
                  if (cx == null || cy == null) return <></>;
                  return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#ef4444" />;
                }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="Oído Izquierdo"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy } = props;
                  if (cx == null || cy == null) return <></>;
                  return (
                    <g>
                      <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} stroke="#3b82f6" strokeWidth={2} />
                      <line x1={cx + 5} y1={cy - 5} x2={cx - 5} y2={cy + 5} stroke="#3b82f6" strokeWidth={2} />
                    </g>
                  );
                }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AudiometriaForm;
