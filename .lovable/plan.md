
# Plan: Agregar Gestión de Faenas al Módulo de Configuración

## Resumen

Agregar una nueva pestaña "Faenas" al módulo de Configuración (`/configuracion`) que permita gestionar las faenas (centros de trabajo) de forma centralizada y más cómoda. Esta pestaña será el lugar principal para crear faenas globales y asignarles baterías, estableciendo la relación faena-baterías que luego se usará transversalmente en todo el sistema.

## Flujo de Datos Propuesto

```text
+-------------------+       +-------------------+       +-------------------+
|      FAENAS       | ----> |  BATERIA_FAENAS   | <---- |  PAQUETES_EXAMENES|
|  (centros trabajo)|       | (asignación)      |       |    (baterías)     |
+-------------------+       +-------------------+       +-------------------+
         |
         v
+-------------------+
|  EMPRESA_FAENAS   | ----> Empresas usan faenas con sus baterías ya configuradas
+-------------------+
```

## Funcionalidades de la Nueva Pestaña

1. **Listado de Faenas Globales**: Tabla con todas las faenas del sistema mostrando nombre, dirección, estado (activo/inactivo), y cantidad de baterías asignadas

2. **CRUD de Faenas**: 
   - Crear nuevas faenas globales
   - Editar nombre y dirección
   - Activar/desactivar faenas
   - Eliminar faenas (con confirmación)

3. **Gestión de Baterías por Faena**: 
   - Cada faena es expandible (collapsible)
   - Al expandir, muestra lista de baterías con checkboxes
   - Permite buscar/filtrar baterías
   - Las baterías asignadas aquí son las que aparecerán en cotizaciones, agendamiento y atención de pacientes

## Impacto Transversal

Una vez configurada la relación faena-baterías desde Configuración:
- **Cotizaciones**: Al seleccionar empresa y faena, solo mostrar baterías de esa faena
- **Agendamiento (Portal Empresa)**: Al seleccionar faena, solo mostrar baterías asignadas
- **Atención de Pacientes**: Al asignar baterías, filtrar por faena seleccionada
- **Módulo Empresas**: La pestaña de faenas en cada empresa solo asigna/desasigna faenas existentes (ya configuradas con sus baterías)

---

## Detalles Técnicos

### Archivo a Modificar

**`src/pages/Configuracion.tsx`**

### Cambios Específicos

1. **Nuevos estados**:
   - `faenas`: Lista de todas las faenas globales
   - `paquetes`: Lista de todas las baterías disponibles
   - `bateriasFaenas`: Relaciones faena-batería (tabla `bateria_faenas`)
   - `expandedFaenas`: Set de IDs de faenas expandidas
   - Estados para el diálogo de crear/editar faena

2. **Nueva pestaña en TabsList**:
   - Agregar `<TabsTrigger value="faenas">` con icono `MapPin`

3. **TabsContent para faenas**:
   - Card con cabecera y botón "Nueva Faena"
   - Tabla/lista de faenas con:
     - Nombre y dirección
     - Badge con cantidad de baterías
     - Switch para activar/desactivar
     - Botones editar y eliminar
     - Collapsible para mostrar/asignar baterías

4. **Funciones de gestión**:
   - `loadFaenas()`: Cargar todas las faenas
   - `loadPaquetes()`: Cargar todas las baterías
   - `loadBateriasFaenas()`: Cargar relaciones existentes
   - `handleFaenaSubmit()`: Crear/actualizar faena
   - `handleToggleFaenaActivo()`: Cambiar estado activo
   - `handleDeleteFaena()`: Eliminar faena
   - `handleToggleBateria()`: Asignar/desasignar batería a faena

5. **UI de asignación de baterías**:
   - Input de búsqueda para filtrar baterías
   - ScrollArea con lista de baterías (checkbox + nombre)
   - Actualización en tiempo real del badge de conteo

### Componentes UI Utilizados

- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`
- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`
- `AlertDialog` (confirmación de eliminación)
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`
- `Checkbox`, `Switch`, `Input`, `Label`, `Badge`, `Button`
- `ScrollArea` (para lista de baterías)

### Iconos Adicionales

- `MapPin` (faenas)
- `Package` (baterías)
- `ChevronDown`, `ChevronUp` (collapsible)

### Queries a Base de Datos

```typescript
// Cargar faenas
supabase.from("faenas").select("*").order("nombre")

// Cargar baterías
supabase.from("paquetes_examenes").select("id, nombre, descripcion").order("nombre")

// Cargar relaciones
supabase.from("bateria_faenas").select("*")

// Crear faena
supabase.from("faenas").insert([{ nombre, direccion }])

// Actualizar faena
supabase.from("faenas").update({ nombre, direccion }).eq("id", faenaId)

// Toggle activo
supabase.from("faenas").update({ activo: !currentActivo }).eq("id", faenaId)

// Eliminar faena
supabase.from("faenas").delete().eq("id", faenaId)

// Toggle batería en faena
supabase.from("bateria_faenas").insert([...]) // o update activo
```

### Estructura Visual Propuesta

```text
┌─────────────────────────────────────────────────────────────┐
│  [Bloques Horarios]  [Faenas]                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📍 Faenas / Centros de Trabajo    [+ Nueva Faena]   │    │
│  │ Gestiona las faenas y sus baterías asignadas        │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Nombre           Baterías   Activo   Acciones       │    │
│  │ ─────────────────────────────────────────────────── │    │
│  │ ▼ Homologación   [5]        [✓]      [✏️] [🗑️]     │    │
│  │   ┌─────────────────────────────────────────────┐   │    │
│  │   │ 🔍 Buscar baterías...                       │   │    │
│  │   │ ☑ Batería Pre-ocupacional                   │   │    │
│  │   │ ☑ Batería Altura Física                     │   │    │
│  │   │ ☐ Batería Conductor                         │   │    │
│  │   │ ☑ Batería Exposición Sílice                 │   │    │
│  │   │ ...                                         │   │    │
│  │   └─────────────────────────────────────────────┘   │    │
│  │ ► Zaldivar        [3]        [✓]      [✏️] [🗑️]     │    │
│  │ ► Sierra Gorda    [4]        [✓]      [✏️] [🗑️]     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```
