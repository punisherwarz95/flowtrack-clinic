import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PresionTimerInfo {
  nextToma: 2 | 3;
  remainingSeconds: number;
  isDue: boolean;
}

interface TimerSeed {
  atencionId: string;
  startedAtMs: number;
  nextToma: 2 | 3;
}

const TIMER_SECONDS = 30 * 60;
const LOAD_DEBOUNCE_MS = 3_000; // debounce loads by 3s
const POLL_INTERVAL_MS = 60_000; // poll every 60s instead of realtime

const parseNumber = (value: unknown): number | null => {
  const parsed = parseFloat(String(value ?? ""));
  return Number.isNaN(parsed) ? null : parsed;
};

const getRetomaStatus = (raw: Record<string, unknown>): { nextToma: 2 | 3; timerStart: string } | null => {
  const toma1S = parseNumber(raw.pa_sistolica_1);
  const toma1D = parseNumber(raw.pa_diastolica_1);
  const toma2S = parseNumber(raw.pa_sistolica_2);
  const toma2D = parseNumber(raw.pa_diastolica_2);
  const toma3S = parseNumber(raw.pa_sistolica_3);
  const toma3D = parseNumber(raw.pa_diastolica_3);

  const toma1Completa = toma1S !== null && toma1D !== null;
  const toma2Completa = toma2S !== null && toma2D !== null;
  const toma3Completa = toma3S !== null && toma3D !== null;

  if (toma3Completa) return null;

  const toma1Alta = toma1Completa && (toma1S! > 139 || toma1D! > 89);
  const toma2Alta = toma2Completa && (toma2S! > 139 || toma2D! > 89);

  if (toma2Completa) {
    if (!toma2Alta) return null;
    if (!raw.pa_timer_inicio) return null;
    return { nextToma: 3, timerStart: String(raw.pa_timer_inicio) };
  }

  if (toma1Completa) {
    if (!toma1Alta) return null;
    if (!raw.pa_timer_inicio) return null;
    return { nextToma: 2, timerStart: String(raw.pa_timer_inicio) };
  }

  return null;
};

export const usePresionTimers = (atencionIds: string[]) => {
  const [timerSeeds, setTimerSeeds] = useState<Record<string, TimerSeed>>({});
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const loadingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const idsKey = useMemo(() => [...new Set(atencionIds)].sort().join(","), [atencionIds]);

  const loadTimersImmediate = useCallback(async () => {
    const uniqueIds = [...new Set(atencionIds)];
    if (uniqueIds.length === 0) {
      setTimerSeeds({});
      return;
    }

    // Guard against concurrent loads
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      // Process in chunks of 50 to keep queries small
      const allData: any[] = [];
      for (let i = 0; i < uniqueIds.length; i += 50) {
        const chunk = uniqueIds.slice(i, i + 50);
        const { data, error } = await supabase
          .from("examen_resultados")
          .select(`
            valor,
            atencion_examenes!inner(atencion_id),
            examen_formulario_campos!inner(tipo_campo)
          `)
          .eq("examen_formulario_campos.tipo_campo", "antropometria")
          .in("atencion_examenes.atencion_id", chunk);

        if (error) {
          console.error("Error loading pressure timers:", error);
          return;
        }
        if (data) allData.push(...data);
      }

      const nextSeeds: Record<string, TimerSeed> = {};

      allData.forEach((row: any) => {
        const atencionId = row.atencion_examenes?.atencion_id as string | undefined;
        if (!atencionId) return;

        const raw = typeof row.valor === "string" ? (() => {
          try { return JSON.parse(row.valor); } catch { return null; }
        })() : row.valor;

        if (!raw || typeof raw !== "object") return;

        const status = getRetomaStatus(raw as Record<string, unknown>);
        if (!status) return;

        const startedAtMs = new Date(status.timerStart).getTime();
        if (Number.isNaN(startedAtMs)) return;

        const current = nextSeeds[atencionId];
        if (!current || startedAtMs > current.startedAtMs) {
          nextSeeds[atencionId] = {
            atencionId,
            startedAtMs,
            nextToma: status.nextToma,
          };
        }
      });

      setTimerSeeds(nextSeeds);
    } finally {
      loadingRef.current = false;
    }
  }, [atencionIds]);

  // Debounced version to prevent rapid-fire calls
  const loadTimers = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadTimersImmediate();
    }, LOAD_DEBOUNCE_MS);
  }, [loadTimersImmediate]);

  // Load on ID change
  useEffect(() => {
    if (!idsKey) {
      setTimerSeeds({});
      return;
    }
    loadTimersImmediate();
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll instead of realtime (saves connection pool)
  useEffect(() => {
    if (!idsKey) return;
    const interval = setInterval(loadTimersImmediate, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [idsKey, loadTimersImmediate]);

  // Tick every second for countdown display
  useEffect(() => {
    const hasActiveTimers = Object.keys(timerSeeds).length > 0;
    if (!hasActiveTimers) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timerSeeds]);

  const timerByAtencion = useMemo<Record<string, PresionTimerInfo>>(() => {
    const result: Record<string, PresionTimerInfo> = {};

    Object.entries(timerSeeds).forEach(([atencionId, seed]) => {
      const elapsed = Math.floor((nowMs - seed.startedAtMs) / 1000);
      const remainingSeconds = Math.max(0, TIMER_SECONDS - elapsed);

      result[atencionId] = {
        nextToma: seed.nextToma,
        remainingSeconds,
        isDue: remainingSeconds === 0,
      };
    });

    return result;
  }, [timerSeeds, nowMs]);

  return { timerByAtencion, reloadTimers: loadTimers };
};
