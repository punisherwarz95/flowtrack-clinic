
# Plan: Carga Masiva de Exámenes y Prestadores desde Excel

## Objetivo
Implementar una funcionalidad para cargar un archivo Excel que contenga información de exámenes (codigo, nombre, costo) y sus prestadores asociados, permitiendo:
1. Crear/actualizar exámenes en la tabla `examenes`
2. Asignar automáticamente los prestadores a cada examen en `prestador_examenes`

## Flujo propuesto

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    CARGA MASIVA DESDE EXCEL                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Archivo Excel esperado:                                            │
│  ┌──────────┬────────────────────┬─────────┬───────────────────┐   │
│  │ CODIGO   │ NOMBRE             │ COSTO   │ PRESTADOR         │   │
│  ├──────────┼────────────────────┼─────────┼───────────────────┤   │
│  │ EX-001   │ Audiometría        │ 5000    │ Dr. García        │   │
│  │ EX-002   │ Espirometría       │ 8000    │ Dr. García        │   │
│  │ EX-003   │ Radiografía Tórax  │ 12000   │ Dr. López         │   │
│  └──────────┴────────────────────┴─────────┴───────────────────┘   │
│                                                                     │
│  Proceso:                                                           │
│  1. Usuario sube archivo .xlsx/.csv                                 │
│  2. Sistema parsea las filas                                        │
│  3. Por cada fila:                                                  │
│     a) Busca examen por código → si no existe, lo crea            │
│     b) Busca prestador por nombre → si no existe, lo crea         │
│     c) Crea relación en prestador_examenes                        │
│  4. Muestra resumen de la operación                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Ubicación del componente

Se agregará un botón de "Importar Excel" en la página de **Exámenes** (junto a los botones existentes), ya que es el módulo principal donde se gestionan los exámenes:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Exámenes y Paquetes                                             │
│ Administra exámenes individuales y paquetes                     │
├─────────────────────────────────────────────────────────────────┤
│ [📥 Importar Excel] [+ Nuevo Examen] [📦 Nuevo Paquete]         │
└─────────────────────────────────────────────────────────────────┘
```

## Cambios a implementar

### 1. Nueva función de importación en `src/lib/supabase.ts`
Agregar función `importExamenesYPrestadoresFromExcel` que:
- Lee archivo Excel real usando la librería `xlsx` (ya instalada)
- Procesa cada fila con: codigo, nombre, costo, prestador
- Implementa lógica de upsert para exámenes (buscar por código, crear si no existe)
- Implementa lógica de upsert para prestadores (buscar por nombre, crear si no existe)
- Crea las relaciones en `prestador_examenes`

### 2. Modificar `src/pages/Examenes.tsx`
- Agregar botón "Importar Excel" con ícono de Upload
- Agregar Dialog para el proceso de importación con:
  - Input file para seleccionar archivo
  - Preview de los datos a importar (opcional)
  - Barra de progreso durante la importación
  - Resumen de resultados (exámenes creados, prestadores creados, relaciones creadas)

---

## Detalles tecnicos

### Estructura esperada del Excel
| Columna | Campo | Obligatorio | Descripción |
|---------|-------|-------------|-------------|
| A | codigo | Sí | Código único del examen (ej: EX-001) |
| B | nombre | Sí | Nombre del examen |
| C | costo | No | Costo neto del examen (número) |
| D | prestador | No | Nombre del prestador que realiza el examen |

### Lógica de procesamiento
```typescript
async function importExamenesYPrestadoresFromExcel(file: File) {
  // 1. Leer Excel con xlsx
  const workbook = XLSX.read(await file.arrayBuffer());
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  // 2. Procesar cada fila
  for (const row of rows) {
    // 2a. Buscar o crear examen
    let examen = await buscarExamenPorCodigo(row.codigo);
    if (!examen) {
      examen = await crearExamen({ codigo, nombre, costo });
    } else {
      await actualizarExamen(examen.id, { nombre, costo });
    }
    
    // 2b. Si hay prestador, buscar o crear
    if (row.prestador) {
      let prestador = await buscarPrestadorPorNombre(row.prestador);
      if (!prestador) {
        prestador = await crearPrestador({ nombre: row.prestador });
      }
      
      // 2c. Crear relación prestador-examen (si no existe)
      await crearRelacionPrestadorExamen(prestador.id, examen.id);
    }
  }
}
```

### Manejo de duplicados
- **Exámenes**: Se busca por `codigo`. Si existe, se actualiza nombre y costo. Si no existe, se crea.
- **Prestadores**: Se busca por `nombre` (case-insensitive). Si existe, se usa el existente. Si no, se crea con datos mínimos.
- **Relaciones**: Se verifica si ya existe la relación prestador-examen antes de crear.

### UI del Dialog de importación
```text
┌─────────────────────────────────────────────────────────┐
│ Importar Exámenes desde Excel                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Formato esperado del archivo:                           │
│ - Columna A: Código del examen                         │
│ - Columna B: Nombre del examen                         │
│ - Columna C: Costo neto (opcional)                     │
│ - Columna D: Nombre del prestador (opcional)           │
│                                                         │
│ [📎 Seleccionar archivo...           ]                  │
│                                                         │
│ (Después de cargar)                                     │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Se encontraron 45 registros                         ││
│ │ • 30 exámenes nuevos                                ││
│ │ • 15 exámenes a actualizar                          ││
│ │ • 3 prestadores nuevos                              ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│            [Cancelar]  [Importar]                       │
└─────────────────────────────────────────────────────────┘
```

### Archivos a modificar
1. `src/lib/supabase.ts` - Agregar función de importación
2. `src/pages/Examenes.tsx` - Agregar botón y dialog de importación

### Dependencias
- Se usará la librería `xlsx` que ya está instalada en el proyecto

### Manejo de errores
- Validación de columnas obligatorias (codigo, nombre)
- Mensaje de error si el archivo no tiene el formato esperado
- Log de filas que fallan individualmente sin detener toda la importación
- Resumen final con cantidad de éxitos y errores
