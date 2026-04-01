

# Análisis de Cuellos de Botella en MediFlow

## Hallazgos

### 1. Portal Paciente — Polling agresivo cada 3 segundos (CRÍTICO)
- **Archivo**: `src/pages/PortalPaciente.tsx` (línea 926)
- **Problema**: Hace 2 queries a Supabase (atenciones + atencion_examenes) cada 3 segundos por cada paciente con el portal abierto. Con 20 pacientes simultáneos = 40 queries cada 3s = **800 queries/minuto** solo del portal.
- **Además**: Tiene otro polling de documentos cada 5 segundos (mencionado en el summary).
- **Solución**: Reemplazar polling por Realtime channels (como ya hace Flujo/MiBox). Usar `postgres_changes` en `atenciones` y `atencion_examenes` filtrado por `atencion_id`. Reducir polling de documentos a 15-30s como fallback.

### 2. MiBox — Doble carga de datos: local cache + cloud redundante (MEDIO)
- **Archivo**: `src/pages/MiBox.tsx` (líneas 247-260)
- **Problema**: Al montar, carga datos desde el cache local (useEffect línea 131) Y también ejecuta `loadData()` que hace 4+ queries pesadas al cloud (línea 264). La carga local ya provee datos instantáneos; la cloud debería ser el sync engine, no una carga paralela.
- **Solución**: Eliminar `loadData()` al montar cuando el cache local está cargado. El sync engine (pull cada 30s + realtime trigger) ya mantiene el cache actualizado.

### 3. MiBox — Query de "otros boxes" innecesariamente compleja (MEDIO)
- **Archivo**: `src/pages/MiBox.tsx` (líneas 357-386)
- **Problema**: Hace una query extra para contar pacientes en otros boxes, luego itera con más queries en chunks. Todo esto ya está disponible en el cache local.
- **Solución**: Calcular `pacientesEnOtrosBoxes` directamente desde `localData.atenciones` (ya se hace parcialmente en líneas 221-224 pero `loadData` lo sobreescribe).

### 4. Flujo — Re-renders masivos por dependencias amplias en useEffect (MEDIO)
- **Archivo**: `src/pages/Flujo.tsx` (línea 223)
- **Problema**: El useEffect que procesa datos locales depende de `localData.atenciones`, `localData.atencionExamenes`, `localData.atencionDocumentos`. Cada cambio en cualquier examen de cualquier paciente recalcula TODO: pending boxes, examenes pendientes, docs counts para todas las atenciones.
- **Solución**: Usar `useMemo` en lugar de `useEffect` + `setState` para datos derivados. Esto evita el ciclo render → setState → re-render. Calcular solo los deltas cuando sea posible.

### 5. Sync Engine — Clear + BulkPut en cada pull (BAJO-MEDIO)
- **Archivo**: `src/hooks/useLocalSync.ts` (líneas 141-148)
- **Problema**: Cada 30 segundos hace `clear()` + `bulkPut()` en 3 tablas de IndexedDB. Esto invalida todas las live queries de Dexie, causando re-renders en TODOS los componentes que usan `useLocalAtenciones()` (Flujo, MiBox, Dashboard), incluso si los datos no cambiaron.
- **Solución**: Comparar datos antes de escribir (hash o timestamp). Solo hacer upsert de registros que realmente cambiaron. Alternativamente, usar `bulkPut` sin `clear` y eliminar registros que ya no existen.

### 6. Auth Context — Failsafe de 8 segundos visible en logs (BAJO)
- **Archivo**: `src/contexts/AuthContext.tsx` (líneas 118-123)
- **Problema**: El console warning `[Auth] Failsafe: auth loading timeout` aparece en los logs actuales, indicando que `getSession()` tarda más de 8s o hay una race condition con `onAuthStateChange`. Esto bloquea toda la app durante la carga.
- **Solución**: Investigar por qué el failsafe se activa. Podría ser latencia del servidor (ya en instancia Small). Considerar mostrar la UI con skeleton mientras auth resuelve.

### 7. Dashboard — Cálculos pesados sin memoización (BAJO)
- **Archivo**: `src/pages/Dashboard.tsx`
- **Problema**: `computeDailyStatsFromLocal()` y `computeTableDataFromLocal()` iteran sobre todas las atenciones y exámenes del día en cada render. Con 200+ pacientes y 2000+ exámenes, esto puede ser lento.
- **Solución**: Envolver en `useMemo` con dependencias específicas.

## Plan de implementación (priorizado por impacto)

### Paso 1: Portal Paciente — Reemplazar polling 3s por Realtime
- Suscribir a `postgres_changes` en `atenciones` y `atencion_examenes` filtrado por `atencion_id`
- Mantener un polling de fallback cada 30s (no 3s)
- Reducir polling de documentos de 5s a 15s

### Paso 2: Sync Engine — Escritura inteligente (diff antes de clear)
- En `pullData()`, comparar hash de datos actuales vs nuevos antes de escribir a IndexedDB
- Si no hay cambios, skip la escritura y evitar re-renders en cascada
- Esto reduce re-renders innecesarios en Flujo, MiBox, y Dashboard simultáneamente

### Paso 3: MiBox — Eliminar loadData() redundante
- Cuando `localData.isLoaded` es true, no llamar a `loadData()` al montar
- Confiar en el sync engine para mantener datos actualizados
- Mantener `loadData()` solo como fallback manual (botón refresh)

### Paso 4: Flujo — Convertir useEffect+setState a useMemo
- Reemplazar el useEffect de línea 117-223 por `useMemo` que retorne los datos derivados directamente
- Eliminar los 6 estados intermedios (`examenesPendientes`, `pendingBoxes`, etc.) y calcularlos como valores derivados

### Paso 5: Dashboard — Memoizar cálculos pesados
- Envolver `computeDailyStatsFromLocal` y `computeTableDataFromLocal` en `useMemo`

## Detalle técnico

**Impacto estimado del Portal Paciente (Paso 1):**
- De ~800 queries/min → ~5-10 queries/min (solo por eventos reales)
- Reducción de ~98% de carga al backend desde el portal

**Impacto estimado del Sync Engine (Paso 2):**
- Elimina ~90% de escrituras innecesarias a IndexedDB
- Reduce re-renders en 3 páginas simultáneamente

