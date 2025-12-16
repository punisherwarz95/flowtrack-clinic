import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePatientPortal(pacienteId?: string | null, onCalled?: (boxName: string) => void) {
  const [atencion, setAtencion] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const prevEstadoRef = useRef<string | null>(null);
  const prevBoxIdRef = useRef<string | null>(null);
  const lastNotificationRef = useRef<{ box: string | null; ts: number | null }>({ box: null, ts: null });
  const runningPromiseRef = useRef<Promise<any> | null>(null);

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

    return () => supabase.removeChannel(channel);
  }, [pacienteId, loadAtencion]);

  return { atencion, loadAtencion, loading };
}
