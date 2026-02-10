

# Crear 4 Documentos + Mejoras al Visor de Formularios

## Resumen

Se crearán 4 documentos digitales en la base de datos y se harán mejoras al componente `DocumentoFormViewer` para soportar puntajes automáticos y lógica condicional en Lake Louis.

## Parte 1: Cambios en el Frontend (DocumentoFormViewer.tsx)

Se agregará soporte para dos nuevas funcionalidades usando el campo `opciones` de la base de datos para almacenar metadatos adicionales:

### A. Campo tipo "puntaje" (score summary)
- Nuevo tipo de campo `puntaje` que calcula la suma de campos tipo `radio` que tengan opciones numéricas
- Se configurará en `opciones` con `{"campos_suma": ["id1", "id2", ...]}` indicando qué campos sumar
- Mostrará el puntaje total en tiempo real

### B. Lógica condicional para Lake Louis
- Cuando el paciente responda "NO" a "Ha estado sobre 3000m", los campos de experiencia en altitud se auto-completarán como vacíos/0 y se deshabilitarán
- Cuando todos los síntomas queden en 0, las preguntas de seguimiento (requirió atención médica, etc.) se auto-completarán como "NO"
- Se implementará usando el campo `opciones` con `{"depende_de": "campo_id", "valor_activacion": "SI"}` para campos condicionales

## Parte 2: Inserciones en Base de Datos

### Documento 1: DECLARACION DE SALUD
- Texto informativo con variables del paciente
- Campos para examen ocupacional y antecedentes laborales
- Tabla de 26 enfermedades como campos radio SI/NO
- Secciones de fármacos, hábitos, alergias, cirugías
- Antecedentes familiares y laborales
- Sección condicional para mujeres
- Texto legal declarativo
- Firma obligatoria

### Documento 2: CONSENTIMIENTO INFORMADO ALCOHOL Y DROGAS
- Texto informativo con variables
- Campo radio: acepta/no acepta voluntariamente
- Campo radio: toma medicamentos SI/NO
- Campo condicional: detalle de medicamentos
- Firma obligatoria

### Documento 3: ESCALA DE SOMNOLENCIA DE EPWORTH
- Texto informativo explicativo
- 8 preguntas situacionales con radio 0-3
- Campo puntaje automático que suma las 8 respuestas
- Firma obligatoria

### Documento 4: ENCUESTA DE LAKE LOUIS MODIFICADA
- Texto informativo con variables
- Pregunta gatillo: ha estado sobre 3000m (SI/NO)
- Campos condicionales de experiencia en altitud (se deshabilitan si responde NO)
- 5 síntomas con escala 0-3
- Campo puntaje automático de síntomas
- 5 preguntas SI/NO condicionales (se auto-completan como NO si puntaje de síntomas es 0)
- Firma obligatoria

## Detalles Tecnicos

### Archivos a modificar
1. **`src/components/DocumentoFormViewer.tsx`**: Agregar renderizado del tipo `puntaje`, lógica condicional basada en `opciones.depende_de`, y auto-completado de campos dependientes

### Migracion SQL
- 4 inserts en `documentos_formularios`
- Aproximadamente 80-100 inserts en `documento_campos` con los campos de cada formulario
- Todas las firmas con `requerido = true`
- Campos condicionales con metadata en `opciones` (jsonb)

### Flujo condicional Lake Louis
- Si "Ha estado sobre 3000m" = "NO": campos de experiencia se deshabilitan y quedan vacíos
- Si todos los síntomas = 0: campos de "requirió atención", "requirió descenso", etc. se auto-completan como "NO" y se deshabilitan
- El paciente puede cambiar su respuesta y los campos se reactivan automáticamente

