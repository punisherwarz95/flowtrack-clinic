

# Audit: Bugs, Bottlenecks & Inconsistencies in Offline-First Architecture

## Critical Bugs Found

### BUG 1: Pacientes module still writes directly to cloud (no outbox/offline queue)
**File:** `src/pages/Pacientes.tsx` lines 580-867
The `handleSubmit` function performs ALL operations (insert patient, create atencion, add exams, add documents, add baterias) directly against Supabase. If the network is slow, this blocks the UI. The 30s sync pull will overwrite local state before these cloud writes land, causing visual glitches. This contradicts the offline-first goal stated for this module.

**Fix:** After `handleSubmit` succeeds in the cloud, force a sync pull so the local cache reflects the new patient immediately. For a true offline-first approach, the inserts should go through the outbox, but that requires `insert` support which currently only handles `update`. As a minimum, call `syncCtx.forcePull()` after successful submit.

### BUG 2: `completarAtencionMiBox` has a redundant filter that double-excludes exams
**File:** `src/hooks/useLocalAtenciones.ts` lines 120-131
The `remaining` filter on line 127-131 has a double condition: it checks `ae.estado === 'pendiente' || ae.estado === 'incompleto'` AND also `!(estado === 'completado' && boxExamIds.includes(ae.examen_id))`. But `projectedExamenes` already projected those exams to 'completado' on line 121. So the second condition is redundant but harmless. However, the real bug is: exams with estado `muestra_tomada` are NOT excluded from `remaining`, so if a workmed exam was saved as `muestra_tomada` via `ExamenFormulario`, the patient could incorrectly be sent back to `en_espera`.

**Fix:** Add `muestra_tomada` to the completed states filter:
```typescript
const remaining = projectedExamenes.filter(
  ae => ae.estado === 'pendiente' || ae.estado === 'incompleto'
);
```
(Remove the redundant second condition and ensure `muestra_tomada` is not counted as pending.)

### BUG 3: `completarAtencionFlujo` same `muestra_tomada` issue
**File:** `src/hooks/useLocalAtenciones.ts` line 200
Same problem: `muestra_tomada` exams count as remaining pending, causing patient to return to `en_espera` when all real exams are done.

### BUG 4: ExamenFormulario saves to cloud but trazabilidad sync only updates localDb partially
**File:** `src/components/ExamenFormulario.tsx` lines 390-481
When trazabilidad updates linked exams in the cloud (line 454-463), it also updates `localDb` (lines 465-472). But the outbox is NOT involved, so if the cloud write succeeds but localDb update fails (or vice versa), states can diverge. More critically, the pull sync could overwrite these local changes within 30s if the cloud write hasn't fully propagated.

**Fix:** Add the trazabilidad-linked exam IDs to the outbox protection set, or simplify by relying on the dual-write pattern consistently.

### BUG 5: Mi Box `loadData()` still called as fallback but duplicates local cache work
**File:** `src/pages/MiBox.tsx` lines 250-253, 307-460
When `localData.isLoaded` is false, `loadData()` is called which fetches everything from cloud. But this data is NOT written to IndexedDB, so it creates a parallel state that can conflict with the local cache once it loads. The `loadData()` function sets state directly (`setPacientesEnAtencion`, etc.) which then gets overwritten when the local cache effect runs on line 132.

**Fix:** Remove the `loadData()` fallback entirely, or ensure it writes to IndexedDB so the local cache effect picks it up consistently.

### BUG 6: Flujo `localDerived` useMemo triggers setState in useEffect (anti-pattern)
**File:** `src/pages/Flujo.tsx` lines 117-230
The `localDerived` useMemo computes all derived data, then a separate `useEffect` (line 220-230) copies it into 7 different state variables. This causes an extra render cycle on every sync update. More importantly, between the memo update and the effect running, there's a frame where the old state is displayed.

**Fix:** Use `localDerived` directly in the render instead of copying to state, or at minimum use `useSyncExternalStore` pattern.

### BUG 7: Pacientes `handleEdit` loads only pending exams for today's edit
**File:** `src/pages/Pacientes.tsx` lines 517-531
When editing a patient today, only exams with `estado === 'pendiente'` are loaded into `selectedExamenes`. This means completed/muestra_tomada exams disappear from the edit form, and if the user saves, those completed exams could be orphaned or duplicated.

### BUG 8: Date mutation bug in `handleSubmit` and `handleDelete`
**File:** `src/pages/Pacientes.tsx` lines 620-622
```typescript
const startOfDay = new Date(dateToUse.setHours(0, 0, 0, 0)).toISOString();
const endOfDay = new Date(dateToUse.setHours(23, 59, 59, 999)).toISOString();
```
`dateToUse.setHours()` mutates the Date object, so `selectedDate` React state gets mutated. This can cause stale date comparisons in subsequent renders.

**Fix:** Use `new Date(dateToUse)` copies before calling `setHours`.

## Bottlenecks

### BOTTLENECK 1: ExamenFormulario loads campos from cloud every time patient switches
**File:** `src/components/ExamenFormulario.tsx` lines 112-158
Every time a patient is selected in Mi Box, `loadCamposYResultados` fires cloud queries for `examen_formulario_campos` and `examen_resultados`. Since campo definitions don't change per patient, they should be cached (e.g., in the prestadorCache).

### BOTTLENECK 2: Flujo duplicate cloud queries for non-today
**File:** `src/pages/Flujo.tsx` lines 280-302
When `boxes`/`examenes` cache arrives, `loadPendingBoxesOptimized`, `loadAtencionExamenesOptimized`, and `loadExamenesPendientesOptimized` are called. But these make 3 separate queries to `atencion_examenes` for the same data. Should be a single query.

### BOTTLENECK 3: Reference data hooks don't use IndexedDB as initialData
**File:** `src/hooks/useReferenceData.ts`
The `getLocalBoxes`, `getLocalExamenes` etc. functions exist but are never used as `initialData` in the React Query hooks (lines 150-155 show `initialData: undefined`). This means the first render always waits for a cloud fetch.

**Fix:** Use the async local functions as `initialData` providers to show cached data instantly.

## Inconsistencies

### INCONSISTENCY 1: Mixed sync patterns across modules
- **Mi Box**: Uses `useLocalAtenciones` + local cache for today
- **Flujo**: Uses `localDerived` useMemo from local cache for today
- **Pacientes**: Uses `useLocalAtenciones` for display but cloud-direct for writes
- **Dashboard**: Mixed local + cloud
- **Completados/BoxView**: Fully cloud-based, no offline support

This means staff in Completados or BoxView modules experience a completely different (slower) UX.

### INCONSISTENCY 2: outbox `close_visit` uses composite key pattern
**File:** `src/hooks/useLocalAtenciones.ts` line 83
The recordId is `${atencionId}_${boxId}` which doesn't match any real table ID. The push handler in `useLocalSync.ts` line 351 handles this with a custom `_custom` flag. This works but is fragile and could break if the outbox is extended.

### INCONSISTENCY 3: `paciente_cargo` in diffing but not fully populated
**File:** `src/hooks/useLocalSync.ts` line 170
The diff compares `paciente_faena_id` but never compares `paciente_cargo`, even though it's stored in `LocalAtencion`. The pull maps it on line 93, but the diff skips it.

## Proposed Fix Plan (Priority Order)

1. **Fix muestra_tomada bug** (BUG 2 & 3) - Patients incorrectly returning to queue
   - Update `completarAtencionMiBox` and `completarAtencionFlujo` remaining filter

2. **Fix date mutation** (BUG 8) - Subtle rendering bugs in Pacientes

3. **Add forcePull after Pacientes submit** (BUG 1) - Ensure new patients appear in local cache

4. **Cache examen campo definitions** (BOTTLENECK 1) - Eliminate per-patient cloud queries in Mi Box

5. **Use IndexedDB as initialData in useReferenceData hooks** (BOTTLENECK 3) - Instant first render

6. **Remove loadData fallback in MiBox** (BUG 5) - Eliminate dual-state conflict

7. **Eliminate redundant Flujo setState cycle** (BUG 6) - Use derived data directly

8. **Consolidate Flujo cloud queries** (BOTTLENECK 2) - Single query instead of 3

9. **Fix handleEdit to show all exam states** (BUG 7) - Prevent data loss on edit

