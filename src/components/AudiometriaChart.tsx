import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const FREQ_LABELS: Record<number, string> = {
  250: "250Hz", 500: "500Hz", 1000: "1000Hz", 2000: "2000Hz",
  3000: "3000Hz", 4000: "4000Hz", 6000: "6000Hz", 8000: "8000Hz",
};

interface AudiometriaData {
  oido_derecho: Record<number, number | null>;
  oido_izquierdo: Record<number, number | null>;
  pta_derecho: number | null;
  pta_izquierdo: number | null;
}

interface Props {
  value: string;
}

const AudiometriaChart = ({ value }: Props) => {
  const parsed: AudiometriaData | null = useMemo(() => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }, [value]);

  if (!parsed) return null;

  const chartData = FREQUENCIES.map((freq) => ({
    freq: FREQ_LABELS[freq],
    "Oído Derecho": parsed.oido_derecho?.[freq] ?? undefined,
    "Oído Izquierdo": parsed.oido_izquierdo?.[freq] ?? undefined,
  }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs py-0.5 px-2 border-red-300">
          PTP OD: {parsed.pta_derecho !== null ? `${parsed.pta_derecho} dB` : "—"}
        </Badge>
        <Badge variant="outline" className="text-xs py-0.5 px-2 border-blue-300">
          PTP OI: {parsed.pta_izquierdo !== null ? `${parsed.pta_izquierdo} dB` : "—"}
        </Badge>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="freq" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            reversed domain={[-10, 130]}
            ticks={[-10, 0, 20, 40, 60, 80, 100, 120]}
            tick={{ fontSize: 9 }}
            stroke="hsl(var(--muted-foreground))"
            label={{ value: "dB", angle: -90, position: "insideLeft", style: { fontSize: 9 } }}
          />
          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <ReferenceLine y={25} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 3" />
          <Line
            type="monotone" dataKey="Oído Derecho" stroke="#ef4444" strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy } = props;
              if (cx == null || cy == null) return <></>;
              return <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#ef4444" />;
            }}
            connectNulls={false}
          />
          <Line
            type="monotone" dataKey="Oído Izquierdo" stroke="#3b82f6" strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy } = props;
              if (cx == null || cy == null) return <></>;
              return (
                <g>
                  <line x1={cx - 4} y1={cy - 4} x2={cx + 4} y2={cy + 4} stroke="#3b82f6" strokeWidth={2} />
                  <line x1={cx + 4} y1={cy - 4} x2={cx - 4} y2={cy + 4} stroke="#3b82f6" strokeWidth={2} />
                </g>
              );
            }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AudiometriaChart;
