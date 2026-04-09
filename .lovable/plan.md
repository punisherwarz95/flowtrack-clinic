

## Plan: Sistema de Prioridad de Pacientes

### Resumen
Agregar un campo `prioridad` a la tabla `atenciones` que permita a los administradores marcar un paciente como prioritario. Los pacientes prioritarios aparecerán primero en todas las colas de atención (Flujo, Mi Box, BoxView, PantallaTv).

### Cambios en Base de Datos

**Migración**: Agregar columna `prioridad` a `atenciones`
```sql
ALTER TABLE public.atenciones ADD COLUMN prioridad boolean NOT NULL DEFAULT false;
```

**LocalDb**: Agregar campo `prioridad` a `LocalAtencion` interface.

### Lógica de Ordenamiento

Actualmente las colas se ordenan por `numero_ingreso ASC`. El cambio es mínimo: ordenar primero por `prioridad DESC`, luego por `numero_ingreso ASC`. Esto aplica en:

1. **Flujo.tsx** — Query Supabase (línea 356): agregar `.order("prioridad", { ascending: false })` antes del order por `numero_ingreso`. En `localDerived` (línea 122): ajustar el `.sort()`.
2. **MiBox.tsx** — Sort local (líneas 142, 229): agregar prioridad al comparador.
3. **BoxView.tsx** — Query Supabase (línea 99): agregar order por prioridad.
4. **PantallaTv.tsx** — Si ordena por ingreso, ajustar igual.
5. **localDb.ts** — Agregar `prioridad` a `LocalAtencion`.
6. **useLocalSync.ts** — Incluir `prioridad` en el pull de datos.

### UI para Asignar Prioridad (Solo Admin)

En **Pacientes.tsx**, dentro del detalle/edición del paciente, agregar un botón/switch visible solo para admins que marque la atención activa como prioritaria. Al activarlo, se actualiza `atenciones.prioridad = true` via Supabase.

### Indicador Visual

En las colas de Flujo, Mi Box y BoxView, mostrar un badge o icono (estrella/flecha arriba) junto al nombre del paciente prioritario para que el staff sepa por qué está primero.

### Archivos a Modificar

| Archivo | Cambio |
|---|---|
| `src/lib/localDb.ts` | Agregar `prioridad` a `LocalAtencion` |
| `src/hooks/useLocalSync.ts` | Incluir `prioridad` en pull |
| `src/pages/Flujo.tsx` | Ordenar por prioridad, mostrar badge |
| `src/pages/MiBox.tsx` | Ordenar por prioridad, mostrar badge |
| `src/pages/BoxView.tsx` | Ordenar por prioridad, mostrar badge |
| `src/pages/PantallaTv.tsx` | Ordenar por prioridad |
| `src/pages/Pacientes.tsx` | Botón admin para asignar prioridad |
| `src/pages/Dashboard.tsx` | Sin cambios (no afecta orden de tabla) |

### Impacto en Funcionalidad Existente

- **Ningún campo existente se modifica** — solo se agrega una columna con default `false`.
- **El orden base se mantiene** — pacientes sin prioridad siguen ordenados por `numero_ingreso`.
- **Offline-first compatible** — se sincroniza via el mismo pipeline de `useLocalSync`.
- **Sin cambios en RLS** — usa las mismas políticas abiertas de `atenciones`.

