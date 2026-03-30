import { useState, useEffect, useCallback } from 'react';
import { localDb, addToOutbox, type LocalAtencion, type LocalAtencionExamen, type LocalAtencionDocumento } from '@/lib/localDb';
import { liveQuery } from 'dexie';

/**
 * Hook that reads atenciones, examenes, and docs from IndexedDB (instant)
 * and provides write helpers that update local + enqueue to outbox.
 *
 * Critical actions (llamar/liberar paciente) are NOT handled here;
 * those should still call Supabase directly from the page component.
 */
export function useLocalAtenciones() {
  const [atenciones, setAtenciones] = useState<LocalAtencion[]>([]);
  const [atencionExamenes, setAtencionExamenes] = useState<LocalAtencionExamen[]>([]);
  const [atencionDocumentos, setAtencionDocumentos] = useState<LocalAtencionDocumento[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // ── Live queries: react to IndexedDB changes automatically ──────────
  useEffect(() => {
    const sub1 = liveQuery(() => localDb.atenciones.toArray()).subscribe({
      next: (data) => { setAtenciones(data); setIsLoaded(true); },
      error: (err) => console.error('[useLocalAtenciones] atenciones error:', err),
    });

    const sub2 = liveQuery(() => localDb.atencionExamenes.toArray()).subscribe({
      next: (data) => setAtencionExamenes(data),
      error: (err) => console.error('[useLocalAtenciones] examenes error:', err),
    });

    const sub3 = liveQuery(() => localDb.atencionDocumentos.toArray()).subscribe({
      next: (data) => setAtencionDocumentos(data),
      error: (err) => console.error('[useLocalAtenciones] docs error:', err),
    });

    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
      sub3.unsubscribe();
    };
  }, []);

  // ── Non-critical write: update examen estado (local + outbox) ───────
  const updateExamenEstado = useCallback(async (
    atencionExamenId: string,
    nuevoEstado: string,
    extras?: { fecha_realizacion?: string; realizado_por?: string | null },
  ) => {
    // Update local
    await localDb.atencionExamenes.update(atencionExamenId, {
      estado: nuevoEstado,
      ...(extras || {}),
    });

    // Enqueue for cloud sync
    await addToOutbox('atencion_examenes', 'update', atencionExamenId, {
      estado: nuevoEstado,
      ...(extras || {}),
    });
  }, []);

  // ── Non-critical write: batch update examen estado ──────────────────
  const batchUpdateExamenEstado = useCallback(async (
    updates: Array<{ id: string; estado: string; fecha_realizacion?: string | null; realizado_por?: string | null }>,
  ) => {
    for (const u of updates) {
      const payload: Record<string, any> = { estado: u.estado };
      if (u.fecha_realizacion !== undefined) payload.fecha_realizacion = u.fecha_realizacion;
      if (u.realizado_por !== undefined) payload.realizado_por = u.realizado_por;

      await localDb.atencionExamenes.update(u.id, payload);
      await addToOutbox('atencion_examenes', 'update', u.id, payload);
    }
  }, []);

  // ── Non-critical write: update estado_ficha (local + outbox) ────────
  const updateEstadoFicha = useCallback(async (atencionId: string, nuevoEstado: string) => {
    await localDb.atenciones.update(atencionId, { estado_ficha: nuevoEstado });
    await addToOutbox('atenciones', 'update', atencionId, { estado_ficha: nuevoEstado });
  }, []);

  // ── Non-critical write: close box visit (local + outbox) ────────────
  const closeBoxVisit = useCallback(async (atencionId: string, boxId: string) => {
    // This needs a special outbox entry since we can't easily mirror atencion_box_visitas
    // We'll send it as a raw operation the push engine handles
    await addToOutbox('atencion_box_visitas', 'update', `${atencionId}_${boxId}`, {
      _custom: 'close_visit',
      atencion_id: atencionId,
      box_id: boxId,
      fecha_salida: new Date().toISOString(),
    });
  }, []);

  // ── After a critical cloud write succeeds, update local cache ───────
  const updateLocalAtencion = useCallback(async (atencionId: string, changes: Partial<LocalAtencion>) => {
    await localDb.atenciones.update(atencionId, changes);
  }, []);

  // ── Helper: get examenes for specific atencion ──────────────────────
  const getExamenesForAtencion = useCallback((atencionId: string) => {
    return atencionExamenes.filter(ae => ae.atencion_id === atencionId);
  }, [atencionExamenes]);

  // ── Helper: get docs for specific atencion ──────────────────────────
  const getDocsForAtencion = useCallback((atencionId: string) => {
    return atencionDocumentos.filter(d => d.atencion_id === atencionId);
  }, [atencionDocumentos]);

  return {
    atenciones,
    atencionExamenes,
    atencionDocumentos,
    isLoaded,
    updateExamenEstado,
    batchUpdateExamenEstado,
    updateEstadoFicha,
    closeBoxVisit,
    updateLocalAtencion,
    getExamenesForAtencion,
    getDocsForAtencion,
  };
}
