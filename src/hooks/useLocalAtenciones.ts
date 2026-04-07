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
    await addToOutbox('atencion_box_visitas', 'update', `${atencionId}_${boxId}`, {
      _custom: 'close_visit',
      atencion_id: atencionId,
      box_id: boxId,
      fecha_salida: new Date().toISOString(),
    });
  }, []);

  // ── Offline-first: completar atención desde MiBox ──────────────────
  const completarAtencionMiBox = useCallback(async (
    atencionId: string,
    estado: 'completado' | 'incompleto',
    boxId: string,
    boxExamIds: string[],
    userId?: string | null,
  ) => {
    const now = new Date().toISOString();
    const currentExamenes = await localDb.atencionExamenes.where('atencion_id').equals(atencionId).toArray();

    // 1) Mark box exams as completed/incompleto locally + queue
    if (estado === 'completado' && boxExamIds.length > 0) {
      const toUpdate = currentExamenes.filter(
        ae => ae.atencion_id === atencionId && boxExamIds.includes(ae.examen_id) &&
          (ae.estado === 'pendiente' || ae.estado === 'incompleto'),
      );
      for (const ae of toUpdate) {
        await localDb.atencionExamenes.update(ae.id, { estado: 'completado', fecha_realizacion: now, realizado_por: userId || null });
        await addToOutbox('atencion_examenes', 'update', ae.id, { estado: 'completado', fecha_realizacion: now, realizado_por: userId || null });
      }
    }

    // 2) Close box visit
    await addToOutbox('atencion_box_visitas', 'update', `${atencionId}_${boxId}`, {
      _custom: 'close_visit', atencion_id: atencionId, box_id: boxId, fecha_salida: now,
    });

    // 3) Check remaining pending exams locally
    const projectedExamenes = currentExamenes.map((ae) => {
      if (estado === 'completado' && boxExamIds.includes(ae.examen_id) && (ae.estado === 'pendiente' || ae.estado === 'incompleto')) {
        return { ...ae, estado: 'completado' };
      }
      return ae;
    });

    const remaining = projectedExamenes.filter(
      ae => ae.atencion_id === atencionId &&
        (ae.estado === 'pendiente' || ae.estado === 'incompleto') &&
        !(estado === 'completado' && boxExamIds.includes(ae.examen_id)),
    );

    if (remaining.length > 0) {
      // Return to espera
      await localDb.atenciones.update(atencionId, { estado: 'en_espera', box_id: null });
      await addToOutbox('atenciones', 'update', atencionId, { estado: 'en_espera', box_id: null });
      return 'devuelto_espera';
    } else {
      // Clear box assignment (ready to finalize in Flujo)
      await localDb.atenciones.update(atencionId, { box_id: null });
      await addToOutbox('atenciones', 'update', atencionId, { box_id: null });
      return 'listo_finalizar';
    }
  }, []);

  // ── Offline-first: completar atención desde Flujo ──────────────────
  const completarAtencionFlujo = useCallback(async (
    atencionId: string,
    estado: 'completado' | 'incompleto',
    boxId: string | null,
    boxExamIds: string[],
    selectedExamIds: Set<string>,
    userId?: string | null,
    fechaInicioAtencion?: string | null,
  ) => {
    const now = new Date().toISOString();
    const currentExamenes = await localDb.atencionExamenes.where('atencion_id').equals(atencionId).toArray();

    if (boxId && boxExamIds.length > 0) {
      // Get pending exams for this box
      const examsDelBox = currentExamenes.filter(
        ae => ae.atencion_id === atencionId && boxExamIds.includes(ae.examen_id) &&
          (ae.estado === 'pendiente' || ae.estado === 'incompleto'),
      );

      if (estado === 'completado') {
        // Mark ALL box exams as completed
        for (const ae of examsDelBox) {
          await localDb.atencionExamenes.update(ae.id, { estado: 'completado', fecha_realizacion: now, realizado_por: userId || null });
          await addToOutbox('atencion_examenes', 'update', ae.id, { estado: 'completado', fecha_realizacion: now, realizado_por: userId || null });
        }
      } else {
        // Parcial: selected → completado, rest → incompleto
        for (const ae of examsDelBox) {
          const nuevoEstado = selectedExamIds.has(ae.id) ? 'completado' : 'incompleto';
          const payload: Record<string, any> = {
            estado: nuevoEstado,
            fecha_realizacion: nuevoEstado === 'completado' ? now : null,
          };
          if (nuevoEstado === 'completado') payload.realizado_por = userId || null;
          await localDb.atencionExamenes.update(ae.id, payload);
          await addToOutbox('atencion_examenes', 'update', ae.id, payload);
        }
      }

      // Close box visit
      await addToOutbox('atencion_box_visitas', 'update', `${atencionId}_${boxId}`, {
        _custom: 'close_visit', atencion_id: atencionId, box_id: boxId, fecha_salida: now,
      });
    }

    // Check remaining pending exams locally (after our updates)
    const updatedExams = currentExamenes.map(ae => {
      if (boxId && boxExamIds.includes(ae.examen_id) && (ae.estado === 'pendiente' || ae.estado === 'incompleto')) {
        if (estado === 'completado') return { ...ae, estado: 'completado' };
        return { ...ae, estado: selectedExamIds.has(ae.id) ? 'completado' : 'incompleto' };
      }
      return ae;
    });
    const remaining = updatedExams.filter(ae => ae.estado === 'pendiente' || ae.estado === 'incompleto');

    if (remaining.length > 0 && boxId) {
      // Return to espera
      await localDb.atenciones.update(atencionId, { estado: 'en_espera', box_id: null });
      await addToOutbox('atenciones', 'update', atencionId, { estado: 'en_espera', box_id: null });
      return 'devuelto_espera';
    } else if (boxId) {
      // Clear box (ready to finalize)
      await localDb.atenciones.update(atencionId, { box_id: null });
      await addToOutbox('atenciones', 'update', atencionId, { box_id: null });
      return 'listo_finalizar';
    } else {
      // Finalize directly
      const payload: Partial<LocalAtencion> = {
        estado: estado,
        fecha_fin_atencion: now,
        fecha_inicio_atencion: fechaInicioAtencion || now,
        box_id: null,
      };
      await localDb.atenciones.update(atencionId, payload);
      await addToOutbox('atenciones', 'update', atencionId, {
        estado, fecha_fin_atencion: now,
        fecha_inicio_atencion: fechaInicioAtencion || now,
      });
      return 'finalizado';
    }
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
    completarAtencionMiBox,
    completarAtencionFlujo,
    updateLocalAtencion,
    getExamenesForAtencion,
    getDocsForAtencion,
  };
}
