import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  localDb,
  addToOutbox,
  getOutboxCount,
  setSyncMeta,
  getSyncMeta,
  type LocalAtencion,
  type LocalAtencionExamen,
  type LocalAtencionDocumento,
  type LocalCotizacion,
  type LocalCotizacionSolicitud,
} from '@/lib/localDb';

const PULL_INTERVAL = 15_000; // 15s
const PUSH_INTERVAL = 5_000;  // 5s

export interface SyncState {
  isOnline: boolean;
  pendingOps: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
}

export function useLocalSync() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    pendingOps: 0,
    lastSyncAt: null,
    isSyncing: false,
  });

  const pullInProgress = useRef(false);
  const pushInProgress = useRef(false);
  const mountedRef = useRef(true);

  // ── Online/offline detection ─────────────────────────────────────────
  useEffect(() => {
    const goOnline = () => setSyncState(s => ({ ...s, isOnline: true }));
    const goOffline = () => setSyncState(s => ({ ...s, isOnline: false }));
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Pull: download today's data from cloud ───────────────────────────
  const pullData = useCallback(async () => {
    if (pullInProgress.current || !navigator.onLine) return;
    pullInProgress.current = true;
    setSyncState(s => ({ ...s, isSyncing: true }));

    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

      // Pull atenciones with joined patient and box data
      const { data: atencionesRaw, error: aErr } = await supabase
        .from('atenciones')
        .select('*, pacientes(id, nombre, rut, tipo_servicio, fecha_nacimiento, email, telefono, direccion, empresa_id, empresas(nombre)), boxes(nombre)')
        .gte('fecha_ingreso', startOfDay)
        .lte('fecha_ingreso', endOfDay);

      if (aErr) throw aErr;

      const atenciones: LocalAtencion[] = (atencionesRaw || []).map((a: any) => ({
        id: a.id,
        paciente_id: a.paciente_id,
        box_id: a.box_id,
        estado: a.estado,
        fecha_ingreso: a.fecha_ingreso,
        fecha_inicio_atencion: a.fecha_inicio_atencion,
        fecha_fin_atencion: a.fecha_fin_atencion,
        created_at: a.created_at,
        numero_ingreso: a.numero_ingreso,
        estado_ficha: a.estado_ficha || 'pendiente',
        observaciones: a.observaciones,
        prereserva_id: a.prereserva_id,
        paciente_nombre: a.pacientes?.nombre,
        paciente_rut: a.pacientes?.rut,
        paciente_tipo_servicio: a.pacientes?.tipo_servicio,
        paciente_fecha_nacimiento: a.pacientes?.fecha_nacimiento,
        paciente_email: a.pacientes?.email,
        paciente_telefono: a.pacientes?.telefono,
        paciente_direccion: a.pacientes?.direccion,
        paciente_empresa_id: a.pacientes?.empresa_id,
        paciente_empresa_nombre: a.pacientes?.empresas?.nombre,
        box_nombre: a.boxes?.nombre,
      }));

      const atencionIds = atenciones.map(a => a.id);

      // Pull atencion_examenes for today's atenciones
      let allExamenes: any[] = [];
      for (let i = 0; i < atencionIds.length; i += 100) {
        const chunk = atencionIds.slice(i, i + 100);
        const { data, error } = await supabase
          .from('atencion_examenes')
          .select('id, atencion_id, examen_id, estado, fecha_realizacion, created_at, realizado_por, observaciones, examenes(nombre)')
          .in('atencion_id', chunk);
        if (error) throw error;
        if (data) allExamenes = allExamenes.concat(data);
      }

      const atencionExamenes: LocalAtencionExamen[] = allExamenes.map((ae: any) => ({
        id: ae.id,
        atencion_id: ae.atencion_id,
        examen_id: ae.examen_id,
        estado: ae.estado,
        fecha_realizacion: ae.fecha_realizacion,
        created_at: ae.created_at,
        realizado_por: ae.realizado_por,
        observaciones: ae.observaciones,
        examen_nombre: ae.examenes?.nombre,
      }));

      // Pull atencion_documentos for today's atenciones
      let allDocs: any[] = [];
      for (let i = 0; i < atencionIds.length; i += 100) {
        const chunk = atencionIds.slice(i, i + 100);
        const { data, error } = await supabase
          .from('atencion_documentos')
          .select('id, atencion_id, documento_id, estado')
          .in('atencion_id', chunk);
        if (error) throw error;
        if (data) allDocs = allDocs.concat(data);
      }

      const atencionDocumentos: LocalAtencionDocumento[] = allDocs.map((d: any) => ({
        id: d.id,
        atencion_id: d.atencion_id,
        documento_id: d.documento_id,
        estado: d.estado,
      }));

      // Write to IndexedDB in a transaction
      await localDb.transaction('rw', [localDb.atenciones, localDb.atencionExamenes, localDb.atencionDocumentos], async () => {
        await localDb.atenciones.clear();
        await localDb.atencionExamenes.clear();
        await localDb.atencionDocumentos.clear();
        if (atenciones.length > 0) await localDb.atenciones.bulkPut(atenciones);
        if (atencionExamenes.length > 0) await localDb.atencionExamenes.bulkPut(atencionExamenes);
        if (atencionDocumentos.length > 0) await localDb.atencionDocumentos.bulkPut(atencionDocumentos);
      });

      await setSyncMeta('lastPull', new Date().toISOString());

      if (mountedRef.current) {
        setSyncState(s => ({
          ...s,
          lastSyncAt: new Date(),
          isSyncing: false,
        }));
      }
    } catch (err) {
      console.error('[LocalSync] Pull error:', err);
      if (mountedRef.current) {
        setSyncState(s => ({ ...s, isSyncing: false }));
      }
    } finally {
      pullInProgress.current = false;
    }
  }, []);

  // ── Pull reference data (runs once on mount + every 5 min) ──────────
  const pullReferenceData = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const [empresasRes, boxesRes, boxExamenesRes, examenesRes, paquetesRes, paqItemsRes, faenasRes, bfRes] = await Promise.all([
        supabase.from('empresas').select('*').order('nombre'),
        supabase.from('boxes').select('*').eq('activo', true).order('nombre'),
        supabase.from('box_examenes').select('*'),
        supabase.from('examenes').select('id, nombre, descripcion, codigo').order('nombre'),
        supabase.from('paquetes_examenes').select('id, nombre, descripcion').order('nombre'),
        supabase.from('paquete_examen_items').select('*'),
        supabase.from('faenas').select('*').eq('activo', true).order('nombre'),
        supabase.from('bateria_faenas').select('*').eq('activo', true),
      ]);

      await localDb.transaction('rw', [
        localDb.empresas, localDb.boxes, localDb.boxExamenes,
        localDb.examenes, localDb.paquetes, localDb.paqueteExamenItems,
        localDb.faenas, localDb.bateriaFaenas,
      ], async () => {
        if (empresasRes.data) { await localDb.empresas.clear(); await localDb.empresas.bulkPut(empresasRes.data as any); }
        if (boxesRes.data) { await localDb.boxes.clear(); await localDb.boxes.bulkPut(boxesRes.data as any); }
        if (boxExamenesRes.data) { await localDb.boxExamenes.clear(); await localDb.boxExamenes.bulkPut(boxExamenesRes.data as any); }
        if (examenesRes.data) { await localDb.examenes.clear(); await localDb.examenes.bulkPut(examenesRes.data as any); }
        if (paquetesRes.data) { await localDb.paquetes.clear(); await localDb.paquetes.bulkPut(paquetesRes.data as any); }
        if (paqItemsRes.data) { await localDb.paqueteExamenItems.clear(); await localDb.paqueteExamenItems.bulkPut(paqItemsRes.data as any); }
        if (faenasRes.data) { await localDb.faenas.clear(); await localDb.faenas.bulkPut(faenasRes.data as any); }
        if (bfRes.data) { await localDb.bateriaFaenas.clear(); await localDb.bateriaFaenas.bulkPut(bfRes.data as any); }
      });

      await setSyncMeta('lastRefPull', new Date().toISOString());
    } catch (err) {
      console.error('[LocalSync] Reference pull error:', err);
    }
  }, []);

  // ── Pull cotizaciones ───────────────────────────────────────────────
  const pullCotizaciones = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const [cotRes, solRes] = await Promise.all([
        supabase
          .from('cotizaciones')
          .select('id, numero_cotizacion, fecha_cotizacion, empresa_id, empresa_nombre, empresa_rut, empresa_razon_social, subtotal_neto, total_iva, total_con_iva, total_con_margen, estado, created_at, observaciones, afecto_iva')
          .order('numero_cotizacion', { ascending: false }),
        supabase
          .from('cotizacion_solicitudes')
          .select(`
            id, titulo, descripcion, estado, created_at,
            empresa:empresas(id, nombre),
            faena:faenas(id, nombre),
            items:cotizacion_solicitud_items(id, cantidad_estimada, paquete:paquetes_examenes(id, nombre), examen:examenes(id, nombre))
          `)
          .eq('estado', 'pendiente')
          .order('created_at', { ascending: false }),
      ]);

      if (cotRes.data) {
        const cotizaciones: LocalCotizacion[] = cotRes.data.map((c: any) => ({
          id: c.id,
          numero_cotizacion: c.numero_cotizacion,
          fecha_cotizacion: c.fecha_cotizacion,
          empresa_id: c.empresa_id,
          empresa_nombre: c.empresa_nombre,
          empresa_rut: c.empresa_rut,
          empresa_razon_social: c.empresa_razon_social,
          subtotal_neto: c.subtotal_neto || 0,
          total_iva: c.total_iva || 0,
          total_con_iva: c.total_con_iva || 0,
          total_con_margen: c.total_con_margen || 0,
          estado: c.estado || 'borrador',
          created_at: c.created_at,
          observaciones: c.observaciones,
          afecto_iva: c.afecto_iva ?? true,
        }));
        await localDb.cotizaciones.clear();
        if (cotizaciones.length > 0) await localDb.cotizaciones.bulkPut(cotizaciones);
      }

      if (solRes.data) {
        const solicitudes: LocalCotizacionSolicitud[] = solRes.data.map((s: any) => ({
          id: s.id,
          titulo: s.titulo,
          descripcion: s.descripcion,
          estado: s.estado,
          created_at: s.created_at,
          empresa_nombre: s.empresa?.nombre || null,
          empresa_id: s.empresa?.id || null,
          faena_nombre: s.faena?.nombre || null,
          faena_id: s.faena?.id || null,
          items_json: JSON.stringify(s.items || []),
        }));
        await localDb.cotizacionSolicitudes.clear();
        if (solicitudes.length > 0) await localDb.cotizacionSolicitudes.bulkPut(solicitudes);
      }

      await setSyncMeta('lastCotPull', new Date().toISOString());
    } catch (err) {
      console.error('[LocalSync] Cotizaciones pull error:', err);
    }
  }, []);

  // ── Push: send outbox operations to cloud ────────────────────────────
  const pushOutbox = useCallback(async () => {
    if (pushInProgress.current || !navigator.onLine) return;
    pushInProgress.current = true;

    try {
      const ops = await localDb.outbox.orderBy('id').limit(20).toArray();
      if (ops.length === 0) {
        if (mountedRef.current) setSyncState(s => ({ ...s, pendingOps: 0 }));
        pushInProgress.current = false;
        return;
      }

      for (const op of ops) {
        try {
          if (op.operation === 'update') {
            const { error } = await supabase
              .from(op.table as any)
              .update(op.payload)
              .eq('id', op.recordId);
            if (error) throw error;
          } else if (op.operation === 'insert') {
            const { error } = await supabase
              .from(op.table as any)
              .insert({ id: op.recordId, ...op.payload });
            if (error) throw error;
          }
          // Remove from outbox on success
          await localDb.outbox.delete(op.id!);
        } catch (err) {
          console.error(`[LocalSync] Push failed for op ${op.id}:`, err);
          // Increment retry count
          await localDb.outbox.update(op.id!, { retries: (op.retries || 0) + 1 });
          // If too many retries, remove it
          if ((op.retries || 0) >= 5) {
            console.error(`[LocalSync] Dropping op ${op.id} after 5 retries`);
            await localDb.outbox.delete(op.id!);
          }
        }
      }

      const remaining = await getOutboxCount();
      if (mountedRef.current) setSyncState(s => ({ ...s, pendingOps: remaining }));
    } catch (err) {
      console.error('[LocalSync] Push error:', err);
    } finally {
      pushInProgress.current = false;
    }
  }, []);

  // ── Force sync ───────────────────────────────────────────────────────
  const forcePull = useCallback(async () => {
    await pullData();
  }, [pullData]);

  const forcePush = useCallback(async () => {
    await pushOutbox();
  }, [pushOutbox]);

  // ── Update pending ops count periodically ────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    const count = await getOutboxCount();
    if (mountedRef.current) setSyncState(s => ({ ...s, pendingOps: count }));
  }, []);

  // ── Main effect: setup intervals + realtime + initial load ───────────
  useEffect(() => {
    mountedRef.current = true;

    // Initial load
    pullReferenceData();
    pullData();
    pullCotizaciones();

    // Set up intervals
    const pullTimer = setInterval(pullData, PULL_INTERVAL);
    const pushTimer = setInterval(pushOutbox, PUSH_INTERVAL);
    const countTimer = setInterval(refreshPendingCount, 3_000);

    // Reference data refresh every 5 min
    const refTimer = setInterval(pullReferenceData, 5 * 60 * 1000);

    // Cotizaciones refresh every 2 min
    const cotTimer = setInterval(pullCotizaciones, 2 * 60 * 1000);

    // Realtime channel as sync trigger
    const channel = supabase
      .channel('local-sync-trigger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atenciones' }, () => {
        // Debounce: wait 500ms then pull
        setTimeout(() => pullData(), 500);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atencion_examenes' }, () => {
        setTimeout(() => pullData(), 500);
      })
      .subscribe();

    return () => {
      mountedRef.current = false;
      clearInterval(pullTimer);
      clearInterval(pushTimer);
      clearInterval(countTimer);
      clearInterval(refTimer);
      supabase.removeChannel(channel);
    };
  }, [pullData, pushOutbox, pullReferenceData, refreshPendingCount]);

  return {
    ...syncState,
    forcePull,
    forcePush,
  };
}
