

## Plan: Persistencia de Empresa por Atención

### Problema
La tabla `atenciones` no almacena `empresa_id`. Las consultas del portal empresa filtran por `pacientes.empresa_id`, que es un campo único que se sobreescribe cuando el staff cambia la empresa del paciente. Resultado: si un paciente cambia de Empresa A a Empresa B, Empresa A pierde visibilidad de sus atenciones históricas.

### Solución
Desnormalizar `empresa_id` en la tabla `atenciones` para que cada visita capture la empresa asociada al momento del ingreso. Las consultas del portal empresa filtrarán por `atenciones.empresa_id` en vez de `pacientes.empresa_id`.

### Cambios

**1. Migración de base de datos**
- Agregar columna `empresa_id UUID` a `atenciones` (nullable, sin FK a auth).
- Backfill: `UPDATE atenciones SET empresa_id = p.empresa_id FROM pacientes p WHERE atenciones.paciente_id = p.id AND atenciones.empresa_id IS NULL;`

**2. Escritura de empresa_id al crear atención**
- **Pacientes.tsx** (~línea 892): al insertar atención, incluir `empresa_id: formData.empresa_id || null`.
- **PortalPaciente.tsx**: al crear atención, incluir `empresa_id` del paciente.
- **Incompletos.tsx**: al reactivar, copiar `empresa_id` de la atención original.

**3. Actualizar consultas del portal empresa**
- **EmpresaPacientes.tsx**: cambiar de `pacientes.empresa_id = X` → `atenciones.empresa_id = X` con join a pacientes para nombre/rut.
- **EmpresaResultados.tsx** (~línea 105): cambiar `.eq("paciente.empresa_id", currentEmpresaId)` → filtrar directamente por `atenciones.empresa_id`.
- **EmpresaEstadosPago.tsx** (~línea 124-137): cambiar la lógica de "buscar pacientes de empresa → buscar atenciones" por "buscar atenciones con empresa_id → traer datos del paciente".

**4. Sincronización local**
- Agregar `empresa_id` a `LocalAtencion` en `localDb.ts`.
- Incluir en el diffing de `useLocalSync.ts`.

**5. BusquedaPacientesHistorial.tsx**
- Si filtra por empresa, usar `atenciones.empresa_id` en lugar de `pacientes.empresa_id`.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| Migración SQL | Agregar columna + backfill |
| `src/pages/Pacientes.tsx` | Escribir `empresa_id` al crear atención |
| `src/pages/PortalPaciente.tsx` | Escribir `empresa_id` al crear atención |
| `src/pages/Incompletos.tsx` | Copiar `empresa_id` al reactivar |
| `src/pages/empresa/EmpresaPacientes.tsx` | Filtrar por `atenciones.empresa_id` |
| `src/pages/empresa/EmpresaResultados.tsx` | Filtrar por `atenciones.empresa_id` |
| `src/pages/empresa/EmpresaEstadosPago.tsx` | Filtrar por `atenciones.empresa_id` |
| `src/components/empresa/BusquedaPacientesHistorial.tsx` | Filtrar por `atenciones.empresa_id` |
| `src/lib/localDb.ts` | Agregar campo |
| `src/hooks/useLocalSync.ts` | Incluir en pull + diff |

### Impacto
- **Cero impacto** en funcionalidad existente: el backfill pobla datos históricos.
- El campo `pacientes.empresa_id` sigue existiendo y el staff puede cambiarlo libremente.
- Cada atención queda ligada a la empresa correcta de forma inmutable.

