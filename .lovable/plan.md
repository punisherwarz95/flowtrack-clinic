

## Plan: Cuestionarios completables desde el Portal Paciente

### Contexto
Los exámenes tipo cuestionario (ej: Test Western) se configuran como campos `tipo_campo = "cuestionario"` dentro de `examen_formulario_campos`. Actualmente solo el staff puede completarlos desde `ExamenFormulario`. El portal del paciente no tiene acceso a estos formularios.

### Enfoque
Detectar qué exámenes del paciente tienen campos tipo "cuestionario", mostrarlos como sección expandible en el Portal Paciente (similar a los documentos), y permitir al paciente completarlos. Al responder todas las preguntas, auto-marcar el `atencion_examen` como completado.

### Cambios necesarios

**1. Migración de base de datos (RLS policies)**
- Agregar policy en `examen_resultados` para que `anon` pueda INSERT y UPDATE (necesario para que el portal guarde respuestas de cuestionarios).
- Agregar policy en `atencion_examenes` para que `anon/public` pueda UPDATE del campo `estado` y `fecha_realizacion`.

Policies con restricciones:
```sql
-- Portal puede guardar resultados de cuestionarios
CREATE POLICY "Portal puede insertar examen_resultados"
ON public.examen_resultados FOR INSERT TO anon
WITH CHECK (true);

CREATE POLICY "Portal puede actualizar examen_resultados"
ON public.examen_resultados FOR UPDATE TO anon
USING (true);

-- Portal puede actualizar estado de atencion_examenes
CREATE POLICY "Portal puede actualizar atencion_examenes"
ON public.atencion_examenes FOR UPDATE TO public
USING (true);
```

**2. Portal Paciente (`src/pages/PortalPaciente.tsx`)**
- Tras cargar la atención, consultar `examen_formulario_campos` para cada `atencion_examen` pendiente, filtrando por `tipo_campo = 'cuestionario'`.
- Mostrar una nueva sección "Cuestionarios a Completar" (entre documentos y formularios externos) con interfaz expandible inline (mismo patrón que documentos).
- Cada cuestionario se renderiza con `CuestionarioRenderer`.
- Al completar todas las preguntas: guardar resultado en `examen_resultados` vía upsert, y actualizar `atencion_examenes.estado` a `completado`.
- Polling cada 5s para detectar nuevos cuestionarios asignados.

**3. Componente auxiliar (nuevo o inline)**
- Lógica de guardado simplificada: upsert a `examen_resultados` con el JSON del cuestionario, luego update a `atencion_examenes` con estado `completado` + `fecha_realizacion`.
- Validar que todas las preguntas no-texto estén respondidas antes de permitir envío.

### Flujo del paciente
1. Paciente entra al portal y ve sus exámenes
2. Nueva sección "Cuestionarios" aparece con los tests pendientes (ej: "TEST WESTERN")
3. Paciente toca para expandir, responde las preguntas
4. Botón "Enviar" guarda y marca como completado
5. El cuestionario se muestra con check verde, deshabilitado

### Archivos a modificar
- `src/pages/PortalPaciente.tsx` - Agregar sección de cuestionarios
- Migración SQL - Agregar RLS policies para anon

### Archivos que se reutilizan sin cambios
- `src/components/CuestionarioRenderer.tsx` - Se usa directamente

