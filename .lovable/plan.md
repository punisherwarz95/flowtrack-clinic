

# Plan: Capa Offline-First Híbrida para Flujo, MiBox y Pacientes

## Resumen

Implementar una capa de cache local con IndexedDB (Dexie.js) que precargue los datos del día y permita trabajar de forma instantánea. Las acciones críticas (llamar/liberar paciente) van directo al cloud para evitar conflictos. Las acciones no-críticas (marcar exámenes, cambiar ficha, etc.) se aplican localmente de inmediato y se envían al cloud en una cola de operaciones en background.

## Reglas de negocio

```text
ACCIÓN                          → EJECUCIÓN
────────────────────────────────────────────
Llamar paciente (asignar box)   → CLOUD DIRECTO (ya tiene protección atómica)
Liberar paciente (completar)    → CLOUD DIRECTO (cambia estado global)
Marcar examen completado/inc.   → LOCAL + COLA
Cambiar estado ficha            → LOCAL + COLA  
Cerrar visita box               → LOCAL + COLA
Leer atenciones/examenes        → DESDE CACHE LOCAL
Crear paciente (módulo Pacientes)→ CLOUD DIRECTO + actualizar cache
Cargar empresas/baterias/boxes  → DESDE CACHE LOCAL (React Query + IndexedDB)
```

## Arquitectura

```text
┌─────────────────────────────────────┐
│  UI (Flujo / MiBox / Pacientes)     │
│  Lee de: cache local (instantáneo)  │
│  Escribe a: cache local + outbox    │
└──────────┬──────────────────────────┘
           │
     ┌─────▼─────┐
     │ IndexedDB  │  ← atenciones, atencion_examenes del día
     │ (Dexie)    │  ← outbox de operaciones pendientes
     │            │  ← referencia: empresas, boxes, examenes, paquetes
     └─────┬──────┘
           │
     ┌─────▼──────────┐
     │ SyncEngine     │  ← cada 10-15s: push outbox + pull cambios
     │ (background)   │  ← Realtime channel como trigger de sync
     └─────┬──────────┘
           │
     ┌─────▼──────┐
     │ Supabase   │  ← fuente de verdad
     │ Cloud      │
     └────────────┘
```

## Archivos a crear

### 1. `src/lib/localDb.ts` — Base de datos IndexedDB con Dexie
- Tablas: `atenciones`, `atencionExamenes`, `atencionBoxVisitas`, `outbox`
- Tablas de referencia: `empresas`, `boxes`, `examenes`, `paquetes`, `faenas`, `bateriaFaenas`
- Funciones CRUD locales: `getLocalAtenciones()`, `upsertLocalAtencion()`, `getLocalAtencionExamenes()`, `upsertLocalAtencionExamen()`, `addToOutbox()`, `getOutbox()`, `removeFromOutbox()`

### 2. `src/hooks/useLocalSync.ts` — Motor de sincronización
- **Pull**: cada 15s, consulta atenciones del día desde Supabase y actualiza IndexedDB
- **Push**: cada 5s, procesa outbox y envía operaciones al cloud en orden
- **Realtime trigger**: cuando llega un evento realtime, dispara un pull inmediato
- **Precarga inicial**: al montar, carga todo el día en IndexedDB de una vez
- **Referencia**: sincroniza empresas/boxes/examenes/paquetes/faenas al iniciar (y los mantiene en IndexedDB para que persistan entre recargas de página)
- Expone: `{ isOnline, pendingOps, lastSyncAt, forcePull, forcePush }`

### 3. `src/hooks/useLocalAtenciones.ts` — Hook para Flujo y MiBox
- Lee atenciones y exámenes desde IndexedDB (instantáneo)
- Para escrituras no-críticas (marcar examen, cambiar ficha): actualiza IndexedDB + agrega a outbox
- Para escrituras críticas (llamar/liberar paciente): llama a Supabase directo, luego actualiza cache local
- API compatible con la interfaz actual para minimizar cambios en los componentes

### 4. `src/components/SyncStatusBadge.tsx` — Indicador visual
- Muestra: "✓ Sincronizado", "↑ 3 pendientes", "⟳ Sincronizando...", "⚠ Sin conexión"
- Color verde/amarillo/rojo según estado

## Archivos a modificar

### 5. `src/pages/Flujo.tsx`
- Reemplazar `loadData()` y queries directas por `useLocalAtenciones()`
- Mantener `handleIniciarAtencion` como cloud-directo (ya tiene protección atómica `.eq("estado", "en_espera").is("box_id", null)`)
- `handleCompletarAtencion`: cloud-directo para el cambio de estado de atención; las actualizaciones de exámenes van por cola
- Eliminar polling de 30s (el sync engine lo reemplaza)
- Mantener realtime como trigger de sync, no como fuente de datos

### 6. `src/pages/MiBox.tsx`
- Mismo patrón: leer de cache local, escribir exámenes a cola
- `handleLlamarPaciente`: mantener cloud-directo (ya tiene protección atómica)
- `handleCompletarAtencion`: cloud-directo para estado + cola para exámenes
- Eliminar `setInterval` de 10s y polling redundante

### 7. `src/pages/Pacientes.tsx`
- Empresas, exámenes, paquetes ya vienen de React Query; agregar persistencia en IndexedDB para que la primera carga sea instantánea
- `loadAllFaenasAndBateriaFaenas()`: leer de cache local, sync en background
- `handleSubmit` (crear paciente): cloud-directo + actualizar cache

### 8. `src/hooks/useReferenceData.ts`
- Agregar `initialData` desde IndexedDB para que React Query tenga datos inmediatos antes de que el fetch al cloud responda
- Agregar `useFaenas()` y `useBateriaFaenas()` para que Pacientes también use cache centralizada

### 9. `src/components/Navigation.tsx`
- Agregar `SyncStatusBadge` junto al nombre del usuario

## Dependencia nueva
- `dexie` (~15KB gzipped) — wrapper de IndexedDB

## Flujo de una acción típica

### Marcar examen como completado (no-crítica):
1. Usuario hace click → IndexedDB se actualiza → UI refleja cambio (< 10ms)
2. Operación se agrega al outbox
3. En 5-10s, sync engine envía al cloud
4. Si falla, reintenta con backoff

### Llamar paciente (crítica):
1. Usuario hace click → optimistic UI (ya existente)
2. Query atómica a Supabase `.eq("estado", "en_espera").is("box_id", null)`
3. Si otro box lo llamó primero → revert + error (ya implementado)
4. Si éxito → actualizar cache local + continuar trabajando offline-first

## Resultado esperado
- **Carga inicial**: datos desde IndexedDB en < 50ms, sync con cloud en background
- **Acciones sobre paciente en atención**: instantáneas (< 10ms)
- **Acciones críticas**: misma latencia que ahora pero sin bloquear la UI
- **Creación de pacientes**: empresas/baterias cargan instantáneamente desde cache
- **Pérdida temporal de conexión**: módulos siguen operativos, outbox acumula operaciones

