## Plan: Sistema de Resultados Portal Empresa con PDF

### 1. Migración de Base de Datos
- Crear tabla `configuracion_centro` para almacenar: logo_url, párrafo legal del PDF, nombre del centro, dirección, teléfono, web, email
- Agregar columna `firma_url` a la tabla `profiles` para que los médicos puedan subir su firma digital
- Crear tabla `informe_verificacion` para almacenar QR únicos por informe (informe_id, token_verificacion, evaluacion_id)
- Crear bucket de storage `centro-assets` para logos y firmas

### 2. Configuración del Staff (Configuracion.tsx)
- Nueva pestaña "Centro Médico" con:
  - Upload de logo del centro
  - Párrafo legal configurable (el texto que va al final del PDF)
  - Datos del centro (dirección, teléfono, web, email)

### 3. Firma del Médico (Usuarios)
- En el perfil del usuario médico, agregar campo para subir firma digital (imagen)

### 4. Refactorizar EmpresaResultados.tsx
- Cambiar fuente de datos de `prereservas` a `atenciones` (consistente con la arquitectura)
- Filtrar por empresa_id del paciente
- Mostrar: nombre, RUT, baterías asignadas con badge de estado (pendiente/apto/no apto)
- Rango de fechas por defecto = mes completo
- Al clicar en el badge → detalle de evaluación con opción de generar PDF

### 5. Generador de PDF de Evaluación
Basado en el formato subido, generar PDF con:
- **Página 1**: Logo, título "RESULTADO EXAMEN" + nombre batería, fecha, folio, válido hasta, datos paciente, datos empresa, resultado (APTO/NO APTO), datos clínicos, evaluación médica
- **Página 2**: Exámenes complementarios con estado, conclusión final, recomendaciones, firma del doctor, QR de verificación
- **Página 3**: Párrafo legal configurable

### 6. Ruta Pública de Verificación QR
- Ruta `/verificar/:token` que muestra los datos del informe sin necesidad de login
- Permite a terceros verificar la autenticidad del documento

### Orden de implementación:
1. Migración DB (tablas + storage)
2. Configuración centro médico
3. Firma médico en usuarios  
4. Refactorizar EmpresaResultados
5. Generador PDF
6. Ruta verificación QR
