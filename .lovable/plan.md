

# Plan: Pestaña de Métricas de Trazabilidad en Completados

## Problema Principal

Actualmente el sistema **no registra el historial de visitas a boxes**. Cuando un paciente entra a un box, se actualiza `atenciones.box_id` y `fecha_inicio_atencion`, y cuando sale se pone `box_id = null`. Esto **sobreescribe** los datos anteriores, por lo que no hay forma de saber cuántas veces entró a cada box ni cuánto tiempo estuvo.

## Cambios Necesarios

### 1. Nueva tabla: `atencion_box_visitas`

Tabla para registrar cada entrada/salida de un paciente a un box:

```text
atencion_box_visitas
├── id (uuid, PK)
├── atencion_id (uuid, FK → atenciones)
├── box_id (uuid, FK → boxes)
├── fecha_entrada (timestamptz)
├── fecha_salida (timestamptz, nullable)
├── created_at (timestamptz)
```

Con RLS: staff puede gestionar, portal puede leer.

### 2. Registrar entradas en Flujo.tsx y MiBox.tsx

Cuando se llama a un paciente (`handleIniciarAtencion` / `handleLlamarPaciente`):
- Insertar un registro en `atencion_box_visitas` con `fecha_entrada = now()`.

Cuando se completa en un box (`handleCompletarAtencion`):
- Actualizar el registro abierto (sin `fecha_salida`) con `fecha_salida = now()`.

### 3. Nueva pestaña "Métricas" en Completados.tsx

Agregar un componente con `Tabs` en la página de Completados:
- **Pestaña "Completados"**: contenido actual (lista de atenciones completadas con botón devolver).
- **Pestaña "Métricas"**: tabla detallada con:
  - Paciente (nombre, RUT, empresa)
  - Baterías asignadas (desde `atencion_baterias`)
  - Exámenes asignados (desde `atencion_examenes`)
  - Hora de llegada (`fecha_ingreso`)
  - Por cada box visitado: instancia #, hora entrada, hora salida, duración
  - Tiempo total en centro

La tabla de métricas consultará `atencion_box_visitas` agrupando por `atencion_id` y `box_id`, mostrando cada instancia numerada.

### 4. Datos históricos

Los registros anteriores a este cambio **no tendrán datos de visitas a boxes** ya que no se registraban. Solo las nuevas atenciones tendrán trazabilidad completa. Se mostrará un mensaje indicando esto cuando no haya datos de visitas.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Migration SQL | Crear tabla `atencion_box_visitas` |
| `src/pages/Flujo.tsx` | Insertar/actualizar visitas al llamar/completar |
| `src/pages/MiBox.tsx` | Insertar/actualizar visitas al llamar/completar |
| `src/pages/Completados.tsx` | Agregar tabs + pestaña Métricas con tabla detallada |

