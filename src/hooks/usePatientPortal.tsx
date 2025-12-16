import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePatientPortal(pacienteId?: string | null, onCalled?: (boxName: string) => void) {
  const [atencion, setAtencion] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const prevEstadoRef = useRef<string | null>(null);
  const prevBoxIdRef = useRef<string | null>(null);
  const lastNotificationRef = useRef<{ box: string | null; ts: number | null }>({ box: null, ts: null });
  const runningPromiseRef = useRef<Promise<any> | null>(null);
  const iosPollRef = useRef<{ timer: any | null; count: number }>({ timer: null, count: 0 });

  const isIOS = typeof navigator !== "undefined" && /iP(hone|od|ad)|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;
  const IOS_POLL_INTERVAL = 4000; // ms
  const IOS_POLL_MAX = 15; // ~1 minute

  const loadAtencion = useCallback(async () => {
    if (!pacienteId) return null;

    if (runningPromiseRef.current) {
      // Wait for the ongoing fetch to finish and return its result
      return runningPromiseRef.current;
    }

    const p = (async () => {
      setLoading(true);
      try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

        const { data: atencionData, error } = await supabase
          .from("atenciones")
          .select("*, boxes(*)")
          .eq("paciente_id", pacienteId)
          .gte("fecha_ingreso", startOfDay)
          .lte("fecha_ingreso", endOfDay)
          .order("fecha_ingreso", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[usePatientPortal] loadAtencion error", error);
          return null;
        }
        if (!atencionData) {
          setAtencion(null);
          return null;
        }

        const { data: examenesData } = await supabase
          .from("atencion_examenes")
          .select("id, examen_id, estado, examenes(id, nombre)")
          .eq("atencion_id", atencionData.id);

        const boxNombre = atencionData.boxes?.nombre || null;
        const fueRecienLlamado =
          atencionData.estado === "en_atencion" &&
          atencionData.box_id &&
          (prevEstadoRef.current !== "en_atencion" || prevBoxIdRef.current !== atencionData.box_id);

        prevEstadoRef.current = atencionData.estado;
        prevBoxIdRef.current = atencionData.box_id;

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const atencion_examenes = (examenesData || []).map((ae: any) => ({
          id: ae.id,
          examen_id: ae.examen_id,
          estado: ae.estado,
          examenes: ae.examenes
        }));
        /* eslint-enable @typescript-eslint/no-explicit-any */

        const atencionCompleta = {
          id: atencionData.id,
          estado: atencionData.estado,
          box_id: atencionData.box_id,
          numero_ingreso: atencionData.numero_ingreso,
          fecha_ingreso: atencionData.fecha_ingreso,
          boxes: boxNombre ? { nombre: boxNombre } : null,
          atencion_examenes
        };

        setAtencion(atencionCompleta);

        // If we are on iOS and we detected a change to en_atencion, clear polling
        if (isIOS && fueRecienLlamado) {
          if (iosPollRef.current.timer) {
            clearTimeout(iosPollRef.current.timer);
            iosPollRef.current = { timer: null, count: 0 };
            console.debug("[usePatientPortal] iOS polling stopped after detection");
          }
        }

        if (fueRecienLlamado && boxNombre) {
          const now = Date.now();
          if (lastNotificationRef.current.box !== boxNombre || (now - (lastNotificationRef.current.ts || 0)) > 60_000) {
            lastNotificationRef.current = { box: boxNombre, ts: now };
            onCalled?.(boxNombre);
          }
        }

        return atencionCompleta;
      } finally {
        setLoading(false);
        runningPromiseRef.current = null;
      }
    })();

    runningPromiseRef.current = p;
    return p;
  }, [pacienteId, onCalled]);

  useEffect(() => {
    if (!pacienteId) return;
    loadAtencion();

    // Subscribe only to changes for this paciente
    const channel = supabase
      .channel(`portal-paciente-${pacienteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atenciones", filter: `paciente_id=eq.${pacienteId}` },
        () => loadAtencion()
      )
      .subscribe();

    // iOS polling fallback: sometimes Safari/iOS misses realtime events -> poll a few times
    if (isIOS) {
      const startPolling = () => {
        if (iosPollRef.current.timer) return; // already polling
        const poll = async () => {
          iosPollRef.current.count += 1;
          try {
            const result = await loadAtencion();
            // If we detected 'en_atencion' inside loadAtencion it will clear the timer
            if (!iosPollRef.current.timer && iosPollRef.current.count === 0) return;
            if (iosPollRef.current.count >= IOS_POLL_MAX) {
              // stop polling after max attempts
              if (iosPollRef.current.timer) { clearTimeout(iosPollRef.current.timer); iosPollRef.current = { timer: null, count: 0 }; }
              return;
            }
            iosPollRef.current.timer = setTimeout(poll, IOS_POLL_INTERVAL);
          } catch (err) {
            console.debug("[usePatientPortal] iOS poll error", err);
            if (iosPollRef.current.timer) { clearTimeout(iosPollRef.current.timer); iosPollRef.current = { timer: null, count: 0 }; }
          }
        };
        // start first poll shortly after subscribe
        iosPollRef.current.timer = setTimeout(poll, IOS_POLL_INTERVAL);
        iosPollRef.current.count = 0;
        console.debug("[usePatientPortal] iOS polling started");
      };

      startPolling();
    }

    return () => supabase.removeChannel(channel);
  }, [pacienteId, loadAtencion]);

  useEffect(() => {
    return () => {
      // cleanup poll timer on unmount
      if (iosPollRef.current.timer) {
        clearTimeout(iosPollRef.current.timer);
        iosPollRef.current = { timer: null, count: 0 };
      }
    };
  }, []);

  return { atencion, loadAtencion, loading };
}
