

# Plan: Rediseño completo del módulo "Mi Box" con captura clínica por examen

## Resumen del problema

Actualmente "Mi Box" usa 3 columnas (Espera / Atención / Atendidos) con checkboxes simples para marcar exámenes. El usuario necesita un sistema que replique la ficha física que acarrea el paciente, permitiendo captura de datos clínicos específicos por examen (audiometrías, subida de PDFs, inputs numéricos, etc.), con visibilidad cruzada entre boxes y compatibilidad extrema en dispositivos móviles.

## Alcance dividido en fases

Dado la magnitud de este cambio, propongo dividirlo en **3 fases**. Esta primera implementación cubre la Fase 1 y 2:

---

### Fase 1: Nuevo modelo de datos para formularios de examen

**Nuevas tablas:**

1. **`examen_formulario_campos`** - Define los campos que cada examen requiere:
   - `id`, `examen_id` (FK), `etiqueta`, `tipo_campo` (texto, numero, select, archivo_pdf, textarea, checkbox, fecha), `opciones` (jsonb), `requerido`, `orden`, `grupo` (para agrupar campos visualmente), `created_at`
   - Ejemplo: Para "Audiometría" se crean campos como "Oído Derecho 500Hz", "Oído Izquierdo 500Hz", etc. Para "Psicosensométrico" se crea un campo tipo `archivo_pdf`.

2. **`examen_resultados`** - Almacena los datos capturados por examen por atención:
   - `id`, `atencion_examen_id` (FK a atencion_examenes), `campo_id` (FK a examen_formulario_campos), `valor` (text), `archivo_url` (text, para PDFs/imágenes), `created_at`, `updated_at`

3. **`examen_archivos_compartidos`** - Para exámenes que comparten un mismo archivo (ej: visual y psicosensométrico usan el mismo PDF):
   - `id`, `atencion_id`, `archivo_url`, `nombre_archivo`, `created_at`
   - Tabla de relación: `examen_archivo_vinculos` con `archivo_compartido_id` y `examen_id`

4. **Storage bucket**: `examen-resultados` (público para lectura autenticada) para PDFs y archivos subidos.

**RLS**: Staff CRUD completo; Portal solo lectura.

---

### Fase 2: Rediseño de la UI de Mi Box con pestañas

**Pestaña 1 - "Cola de Pacientes":**
- Lista de pacientes disponibles para ser atendidos (como la columna actual de "En Espera")
- Contador de pacientes en otros boxes
- Botón "Llamar" para traer paciente al box
- Badge con conteo de atendidos hoy

**Pestaña 2 - "Atención" (aparece al seleccionar/llamar un paciente):**
- **Cabecera**: Datos del paciente (nombre, RUT, empresa, edad)
- **Lista de exámenes** asignados a este box, cada uno expandible:
  - Al expandir un examen, se muestra su formulario específico (campos definidos en `examen_formulario_campos`)
  - Tipos de campo soportados:
    - `texto`, `numero`, `textarea` → inputs estándar
    - `archivo_pdf` → uploader con preview del PDF
    - `select` → dropdown con opciones predefinidas
    - `audiometria` → componente especial con la planilla de frecuencias (250Hz-8000Hz, ambos oídos, vía aérea/ósea)
  - Al completar todos los campos requeridos y guardar → examen se marca como `completado`
  - Si faltan campos → queda como `incompleto` (parcial)
  - Exámenes que comparten archivo: al subir un PDF para "Visual", automáticamente se vincula a "Psicosensométrico" y ambos se marcan como completados
- **Sección "Datos de otros boxes"**: Panel colapsable que muestra los resultados ya capturados en otros boxes para este paciente (solo lectura)
- **Botones**: "Liberar paciente" (devuelve a espera si tiene exámenes pendientes en otros boxes)

**Pestaña 3 - "Historial" (opcional/futura):**
- Atenciones previas del paciente agrupadas por fecha

---

### Fase 3 (futura): Boxes digitales y tests en portal

- **Box digital RX**: UI especial con botón "Entregar orden" (registra que se entregó la orden al paciente) + uploader para cuando llega el resultado
- **Tests psicológicos en Portal Paciente**: Las encuestas configuradas se despliegan dentro del portal después del registro. Se reemplaza el toast por un sistema de notificaciones menos intrusivo (banner inline) para compatibilidad con Xiaomi/Android 13+

---

## Cambios técnicos concretos (Fase 1 y 2)

### Base de datos (migraciones)
1. Crear tabla `examen_formulario_campos`
2. Crear tabla `examen_resultados`
3. Crear tabla `examen_archivos_compartidos` y `examen_archivo_vinculos`
4. Crear storage bucket `examen-resultados`
5. RLS policies para todas las tablas nuevas

### Código frontend
1. **`src/pages/MiBox.tsx`** - Reescritura completa:
   - Cambiar layout de 3 columnas a sistema de pestañas (Tabs)
   - Pestaña 1: Cola de pacientes (reutiliza lógica actual de espera + conteo otros boxes)
   - Pestaña 2: Vista de atención con formularios dinámicos por examen
   
2. **`src/components/ExamenFormulario.tsx`** (nuevo) - Componente que renderiza el formulario específico de un examen basado en `examen_formulario_campos`:
   - Carga campos desde la DB
   - Carga resultados existentes (si los hay)
   - Maneja uploads de archivos
   - Auto-marca completado/parcial según campos requeridos

3. **`src/components/AudiometriaForm.tsx`** (nuevo) - Componente especializado para la planilla de audiometría (grilla de frecuencias, curvas)

4. **`src/components/ExamenResultadosOtrosBoxes.tsx`** (nuevo) - Panel que muestra datos capturados en otros boxes para el paciente actual

5. **`src/pages/Examenes.tsx`** - Agregar sección para configurar los campos de formulario de cada examen (CRUD de `examen_formulario_campos`)

### Fix compatibilidad Xiaomi
- Reemplazar toasts de Sonner por notificaciones inline (div con animación CSS) en el Portal Paciente para evitar el problema de pantalla blanca en navegadores Xiaomi con Android 13+

---

## Orden de implementación

1. Migración de base de datos (tablas + bucket + RLS)
2. UI de configuración de campos por examen (en página Exámenes)
3. Componente `ExamenFormulario` con soporte de tipos de campo
4. Rediseño de `MiBox.tsx` con pestañas
5. Panel de datos cruzados entre boxes
6. Fix de compatibilidad Xiaomi en Portal Paciente

