# Manual de Funciones por Módulo — Staff MediFlow

---

## 1. DASHBOARD

### 1.1 Estadísticas Diarias
Sección con selector de fecha independiente.

| Tarjeta | Descripción |
|---------|-------------|
| **Total Pacientes** | Suma de pacientes en espera + en atención + completados para la fecha seleccionada. Muestra desglose WM (WorkMed) y J (Jenner). |
| **En Espera** | Cantidad de pacientes con estado `en_espera` para la fecha. Desglose WM/J. |
| **En Atención** | Cantidad de pacientes con estado `en_atencion` para la fecha. Desglose WM/J. |
| **Completados** | Cantidad de pacientes con estado `completado` para la fecha. Desglose WM/J. |

#### Exámenes del Día por Box
- Muestra tarjetas agrupadas por Box.
- Cada tarjeta lista los exámenes asignados a ese box con formato `completados/asignados`.
- Cuando todos los exámenes están completos, el badge se muestra en verde.
- Número total de exámenes asignados del día en la parte superior.

### 1.2 Estadísticas Mensuales
Sección con selector de mes y año independiente.

| Tarjeta | Descripción |
|---------|-------------|
| **Total Pacientes Mes** | Cantidad total de pacientes atendidos en el mes seleccionado. Desglose WM/J. |
| **Exámenes Realizados Mes** | Total de exámenes asignados durante el mes (usa paginación interna para superar el límite de 1000 registros). |

#### Exámenes del Mes
- Filtro por **Prestador** o por **Box** (excluyentes entre sí).
- Al seleccionar un prestador, muestra solo los exámenes vinculados a ese prestador con conteo `completados/asignados`.
- Al seleccionar un box, muestra solo los exámenes vinculados a ese box.
- Vista global (sin filtro): lista todos los exámenes ordenados por cantidad de asignados (descendente), distribuidos en 3 columnas.

### 1.3 Tabla de Pacientes del Día
Sección con fecha independiente y múltiples filtros interactivos.

#### Filtros disponibles
| Filtro | Descripción |
|--------|-------------|
| **Búsqueda por nombre** | Filtra pacientes por nombre (texto libre). |
| **Empresa** | Dropdown dinámico: muestra solo empresas presentes en los datos filtrados. |
| **Tipo Servicio** | WM o J. |
| **Examen** | Dropdown dinámico: muestra solo exámenes presentes en los datos filtrados. Al seleccionar, aparecen checkboxes "Completado" e "Incompleto". |
| **Box** | Dropdown dinámico: filtra pacientes que tienen exámenes asignados al box seleccionado. |
| **Estado Examen (colores)** | Checkboxes de colores que filtran por estado del examen: |
| | 🔵 **Pendiente** — examen aún no iniciado |
| | 🟡 **Muestra Tomada** — muestra tomada, esperando resultado |
| | 🟢 **Completado** — examen finalizado |
| | 🔴 **Incompleto** — examen marcado como incompleto |
| **Estado Atención** | Checkboxes: "Completado" (atención finalizada) y "Listo" (en espera o en atención). |

#### Comportamiento dinámico de filtros
- Los dropdowns se actualizan mutuamente: al filtrar por empresa, el dropdown de exámenes muestra solo los exámenes de esa empresa, y viceversa.
- Al filtrar por examen, muestra contadores: `X completados | Y pendientes | Z total`.

#### Columnas de la tabla
| Columna | Descripción |
|---------|-------------|
| **#** | Número de ingreso del día (correlativo). |
| **Paciente** | Nombre del paciente. |
| **Tipo** | "WM" o "J". |
| **Empresa** | Nombre de la empresa asociada. |
| **Box Actual** | Box donde está siendo atendido (si aplica). |
| **Exámenes** | Badges de colores por cada examen asignado. El color indica el estado. Si hay filtro de box activo, solo muestra los exámenes de ese box. |
| **⏱ Timer** | Badge de temporizador de presión arterial (si el examen lo requiere). Muestra cuenta regresiva. |

### 1.4 Búsqueda Historial de Pacientes
- Campo de búsqueda por nombre o RUT.
- Muestra historial de atenciones previas del paciente encontrado.
- Se auto-refresca cada 30 segundos.

---

## 2. PACIENTES

### 2.1 Pestañas principales
El módulo tiene 4 pestañas:

#### Pestaña "Pacientes del Día"
Lista de pacientes ingresados para la fecha seleccionada.

**Funciones por paciente:**
| Función | Descripción |
|---------|-------------|
| **Editar datos** | Abre formulario para modificar: nombre, RUT, email, teléfono, fecha nacimiento, dirección, tipo servicio (WM/J), empresa, faena. |
| **Ver exámenes** | Muestra los exámenes asignados con su estado actual (completado ✓ o pendiente ○). |
| **Eliminar** | Elimina el paciente (con confirmación). |
| **Badge documentos** | Muestra cantidad de documentos pendientes de completar. |
| **Badge "Datos incompletos"** | Aparece si el paciente tiene nombre "PENDIENTE DE REGISTRO" o le falta fecha nacimiento, email o teléfono. |

**Crear nuevo paciente (formulario):**
| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre completo del paciente (obligatorio). |
| Tipo Servicio | WorkMed o Jenner (obligatorio). |
| RUT | RUT del paciente. |
| Empresa | Selector de empresa. Al seleccionar, carga faenas disponibles. |
| Faena | Selector de faena (depende de la empresa). Al seleccionar, filtra baterías disponibles. |
| Baterías | Checkboxes de baterías disponibles para la faena. Filtrable por nombre y por faena. |
| Exámenes individuales | Checkboxes de exámenes sueltos (filtrables). Si hay faena seleccionada, muestra solo exámenes vinculados a esa faena. |
| Email, Teléfono, Fecha Nacimiento, Dirección | Campos opcionales del paciente. |

**Flujo al guardar:**
1. Crea o busca el paciente por RUT.
2. Crea la atención con estado `en_espera`.
3. Registra baterías y exámenes seleccionados en `atencion_baterias` y `atencion_examenes`.
4. Genera automáticamente documentos vinculados a las baterías (`bateria_documentos`).
5. Asigna número de ingreso correlativo del día.

**Pegar texto WorkMed:**
- Botón para pegar texto desde sistema WorkMed.
- Parsea automáticamente nombre, RUT, empresa, cargo, fecha nacimiento, dirección.
- Rellena el formulario con los datos extraídos.

#### Pestaña "Pre-Reservas"
Gestión de pre-reservas de pacientes agendados por empresas.

| Función | Descripción |
|---------|-------------|
| **Ver pre-reservas** | Lista de pacientes agendados por fecha, bloque y empresa. |
| **Confirmar** | Convierte una pre-reserva en atención activa (crea paciente + atención + exámenes). |
| **Rechazar** | Marca la pre-reserva como rechazada. |
| **Filtros** | Por fecha, empresa, estado (pendiente/confirmada/rechazada). |

#### Pestaña "Código del Día"
- Muestra el código alfanumérico del día para el portal de pacientes.
- Se regenera automáticamente según la hora configurada.
- Se puede generar manualmente un nuevo código.

#### Pestaña "Agenda Diferida"
Gestión de pacientes agendados con fecha programada.

| Función | Descripción |
|---------|-------------|
| **Crear agenda** | Registra un paciente con fecha programada, empresa, faena, baterías y exámenes. |
| **Vincular** | Cuando el paciente llega, lo vincula a una atención activa creando el ingreso automáticamente. |
| **Filtros** | Por estado (pendiente/vinculado), fecha, empresa. |

---

## 3. FLUJO

### 3.1 Sección "En Espera"
Lista de pacientes en estado `en_espera` para la fecha seleccionada.

| Elemento | Descripción |
|----------|-------------|
| **Número de ingreso** | Badge con # correlativo del día. |
| **Nombre del paciente** | Nombre completo. |
| **RUT** | RUT del paciente. |
| **Tipo** | Badge "WM" o "J". |
| **Estado ficha** | Checkboxes de estado de ficha (configurable). |
| **Boxes pendientes** | Lista de nombres de boxes donde el paciente tiene exámenes pendientes. |
| **Exámenes pendientes** | Lista de nombres de exámenes no completados. Los marcados "(I)" son incompletos. |
| **Documentos pendientes** | Badge con conteo de documentos pendientes / total. |
| **Timer presión** | Badge con cuenta regresiva si aplica. |
| **Selector de box** | Dropdown para elegir a qué box enviar al paciente. |
| **Botón "Llamar"** | Asigna el paciente al box seleccionado. Cambia estado a `en_atencion`. Usa bloqueo optimista: si otro box lo llamó primero, muestra error con overlay oscuro. Registra visita en `atencion_box_visitas`. |

**Filtro por box:** Dropdown que filtra pacientes que tienen exámenes pendientes en un box específico.

### 3.2 Sección "En Atención"
Lista de pacientes actualmente en un box.

| Elemento | Descripción |
|----------|-------------|
| **Box actual** | Nombre del box donde está el paciente. |
| **Exámenes del box** | Lista de exámenes pendientes/incompletos filtrados por los exámenes que pertenecen al box actual. |
| **Checkboxes de exámenes** | Permite marcar exámenes como completados antes de guardar. |
| **Botón "Guardar seleccionados"** | Marca los exámenes seleccionados como completados. |
| **Botón "Completar ✓"** | Completa TODOS los exámenes del box y devuelve al paciente a espera si tiene exámenes pendientes en otros boxes, o finaliza la atención si no quedan pendientes. |
| **Botón "Incompleto ✗"** | Marca los exámenes del box como incompletos. Verifica si quedan exámenes pendientes: si hay, devuelve a espera; si no, marca la atención como incompleta. |
| **Botón "Devolver a espera"** | Devuelve al paciente a la cola sin modificar exámenes. |

**Filtro por box:** Dropdown que filtra pacientes en atención por box específico.

### 3.3 Completar atención (diálogo de confirmación)
- Al presionar "Completar", verifica si quedan exámenes pendientes/incompletos en OTROS boxes.
- Si quedan: muestra lista de exámenes pendientes y pregunta si desea devolver a espera o forzar completar.
- Si no quedan: completa directamente la atención (marca `fecha_fin_atencion`, estado `completado`).

### 3.4 Actualización en tiempo real
- Canal Realtime en tablas `atenciones`, `atencion_examenes` y `pacientes`.
- Auto-refresh cada 30 segundos como respaldo.
- Actualización inteligente: si solo cambia un campo menor, actualiza en memoria sin recargar todo.

---

## 4. MI BOX

### 4.1 Selección de Box
- Al entrar por primera vez, pide seleccionar un box.
- La selección se guarda en `localStorage` para persistir entre sesiones.
- Botón para cambiar de box en cualquier momento.

### 4.2 Modo de llamado
- **Modo Individual** (por defecto): Al llamar un paciente, cambia automáticamente a la pestaña "Atención".
- **Modo Múltiple**: Permite llamar varios pacientes sin cambiar de pestaña.
- Se guarda en `localStorage`.

### 4.3 Pestañas

#### Pestaña "Cola"
Pacientes en espera que tienen exámenes pendientes para este box.

| Elemento | Descripción |
|----------|-------------|
| **# Ingreso** | Número correlativo del día. |
| **Nombre** | Nombre del paciente. |
| **RUT** | RUT. |
| **Tipo** | WM o J. |
| **Empresa** | Nombre de la empresa. |
| **Exámenes pendientes** | Lista de exámenes que este box debe realizar. |
| **Timer presión** | Cuenta regresiva si aplica. |
| **Botón "Llamar"** | Asigna al paciente a este box con bloqueo optimista. Registra visita. Usa Optimistic UI (mueve el paciente visualmente antes de confirmar servidor). |
| **Código del Día** | Componente que muestra el código del día con cuenta regresiva. |
| **Badge "En otros boxes"** | Muestra cantidad de pacientes que están en otros boxes pero tienen exámenes pendientes para este box. |

#### Pestaña "Atención"
Pacientes actualmente en este box.

**Panel izquierdo — Lista de pacientes:**
- Pacientes en atención con sus exámenes.
- Al seleccionar un paciente, se expande en el panel derecho.

**Panel derecho — Detalle del paciente seleccionado:**

| Sección | Descripción |
|---------|-------------|
| **Datos del paciente** | Nombre, RUT, tipo servicio, fecha nacimiento, email, teléfono, dirección, empresa. |
| **Estado ficha** | Checkboxes para marcar estado de ficha. |
| **Lista de exámenes** | Exámenes del box para este paciente. Cada examen es expandible. |
| **Formulario de examen** | Al expandir un examen, muestra su formulario con los campos configurados (texto, checkbox, select, radio, fecha, firma, audiometría). |
| **Resultados de otros boxes** | Muestra resultados ya completados en otros boxes (solo lectura). |
| **Botón "Completar"** | Completa todos los exámenes del box. |
| **Botón "Incompleto"** | Marca exámenes como incompletos. |
| **Botón "Devolver a espera"** | Devuelve sin modificar exámenes. |
| **Documentos** | Botón para ver/completar documentos asociados (consentimientos, declaraciones). |
| **Timer presión arterial** | Si el examen tiene temporizador, muestra formulario de retoma con cuenta regresiva. |

#### Pestaña "Completados"
Pacientes que ya pasaron por este box hoy.
- Muestra nombre, RUT, tipo y lista de exámenes realizados en este box.

### 4.4 Chat Global
- Botón flotante para abrir chat interno entre usuarios del staff.
- Mensajes en tiempo real vía Realtime.

---

## 5. COMPLETADOS

### 5.1 Pestaña "Completados"
Lista de atenciones finalizadas para la fecha seleccionada.

| Elemento | Descripción |
|----------|-------------|
| **Total completadas** | Contador total con desglose WM/J. |
| **# Ingreso** | Número correlativo. |
| **Paciente** | Nombre. |
| **Tipo** | WM o J. |
| **Estado** | Badge "Completado". |
| **Empresa** | Nombre de la empresa. |
| **Hora ingreso** | Fecha y hora de ingreso. |
| **Hora finalización** | Fecha y hora de fin de atención. |
| **Tiempo en centro** | Diferencia en minutos entre ingreso y fin. |
| **Exámenes realizados** | Badges con nombre y estado (✓ completado, ○ otro estado). |
| **Botón "Devolver"** | Abre diálogo para revertir la atención. |

#### Diálogo "Devolver a Espera"
- Muestra lista de exámenes completados con checkboxes.
- Se seleccionan los exámenes a revertir a `pendiente`.
- La atención vuelve a estado `en_espera` con `box_id = null`.

### 5.2 Pestaña "Resultados Pendientes"
Componente `ResultadosPendientes`.
- Muestra atenciones completadas que tienen exámenes en estado `muestra_tomada`.
- Permite al staff ingresar resultados pendientes (ej: resultados de laboratorio externo).
- Filtra por fecha.

### 5.3 Pestaña "Métricas"
Componente `MetricasCompletados`.
- Muestra cada atención completada con:
  - Datos del paciente y empresa.
  - Baterías y exámenes con estado.
  - Hora de llegada y fin.
  - Tiempo total en centro.
  - **Tabla de visitas a boxes**: muestra cada visita (box, instancia #, hora entrada, hora salida, duración).
- Las atenciones anteriores a la activación de trazabilidad muestran "Sin datos de visitas".

---

## 6. INCOMPLETOS

### 6.1 Vista principal
Lista de atenciones con exámenes incompletos.

| Elemento | Descripción |
|----------|-------------|
| **Filtro de fechas** | Selector de rango de fechas (por defecto: mes actual). Botón para limpiar y ver todas. |
| **Total atenciones** | Contador con desglose WM/J. |
| **Total exámenes incompletos** | Badge ámbar con cantidad total. |
| **Doble búsqueda** | Busca tanto atenciones con estado `incompleto` como atenciones con otro estado pero que tienen exámenes individuales en estado `incompleto`. |

**Por cada atención:**
| Campo | Descripción |
|-------|-------------|
| **# Ingreso** | Número correlativo. |
| **Paciente** | Nombre, RUT, tipo servicio. |
| **Empresa** | Nombre de la empresa. |
| **Estado** | "Atención Incompleta" (estado general) o "Exámenes Incompletos" (solo exámenes sueltos). |
| **Fechas** | Ingreso y marcado como incompleto. |
| **Observaciones** | Si tiene. |
| **Exámenes incompletos** | Badges ámbar con ⚠. |
| **Exámenes completados** | Badges verdes con ✓. |
| **Botón "Reactivar"** | Crea una NUEVA atención con los exámenes incompletos como pendientes. Copia las baterías originales. Genera nuevo número de ingreso para el día actual. |

---

## 7. BOXES

### 7.1 Gestión de boxes
CRUD de consultorios/estaciones de atención.

| Función | Descripción |
|---------|-------------|
| **Crear box** | Formulario con nombre (obligatorio) y descripción (opcional). |
| **Editar box** | Modifica nombre y descripción. |
| **Activar/Desactivar** | Switch para activar o desactivar un box. Los boxes inactivos se muestran con opacidad reducida y no aparecen en los selectores de Flujo y Mi Box. |
| **Eliminar** | Elimina permanentemente el box (con confirmación). |

**Vista:** Grid de tarjetas (3 columnas en desktop). Cada tarjeta muestra nombre, descripción y estado activo/inactivo.

---

## 8. EMPRESAS

### 8.1 Lista de empresas
Grid de tarjetas con buscador por nombre o RUT.

**Datos mostrados en tarjeta:**
- Nombre, RUT, razón social, contacto, email, teléfono.

### 8.2 Diálogo de empresa (3 pestañas)

#### Pestaña "Datos Generales"
| Campo | Descripción |
|-------|-------------|
| Nombre | Obligatorio. |
| RUT | RUT de la empresa. |
| Razón Social | Nombre legal. |
| Contacto | Nombre de la persona de contacto. |
| Email | Correo de la empresa. |
| Teléfono | Teléfono. |
| Centro de Costo | Código interno. |

#### Pestaña "Faenas"
Componente `EmpresaFaenas`.
- Lista de faenas vinculadas a la empresa.
- Crear, editar, activar/desactivar faenas.
- Cada faena tiene nombre y dirección.

#### Pestaña "Baterías y Precios"
- Muestra baterías vinculadas a la empresa (desde `empresa_baterias`).
- Permite configurar el precio de venta ($) para cada batería.
- Botón "Guardar precios".

### 8.3 Importar empresas
- Botón "Importar CSV" para carga masiva de empresas desde archivo CSV.

---

## 9. EXÁMENES

### 9.1 Pestaña "Exámenes"
Lista filtrable de exámenes individuales.

#### Crear/Editar examen
| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre del examen (obligatorio). |
| Código | Código Fonasa o interno. |
| Descripción | Descripción opcional. |
| Duración estimada | En minutos. |
| Costo neto | Costo base del examen en pesos. |
| Boxes asignados | Checkboxes de boxes donde se realiza este examen (obligatorio al menos 1). |

#### Configurar campos del formulario
- Botón "Configurar Formulario" en cada examen.
- Permite agregar campos personalizados que aparecerán al completar el examen en Mi Box.
- Tipos de campo: texto, texto largo, checkbox, select, radio, fecha, firma digital, audiometría.
- Cada campo tiene: etiqueta, tipo, opciones (para select/radio), requerido, grupo, orden.

#### Configurar trazabilidad
- Botón "Trazabilidad" en cada examen.
- Permite vincular exámenes entre sí (ej: si al completar examen A se debe ver junto a examen B).

### 9.2 Pestaña "Paquetes / Baterías"
Grid de tarjetas de baterías filtrables por nombre y faena.

#### Crear/Editar paquete
**Sub-pestañas dentro del diálogo:**

| Pestaña | Descripción |
|---------|-------------|
| **Exámenes** | Selección de exámenes que componen el paquete (checkboxes filtrables). |
| **Faenas** | Selección de faenas donde aplica esta batería. |
| **Documentos** | Selección de documentos/formularios que se generan automáticamente al asignar esta batería. |
| **Precios** | Configuración de precio por empresa. Para cada empresa vinculada, se puede definir el valor de la batería. |

#### Importar desde Excel
- Botón "Importar Excel" para carga masiva de exámenes y prestadores desde archivo .xlsx.
- Muestra vista previa de datos y progreso de importación.

---

## 10. DOCUMENTOS

### 10.1 Tipos de documentos
- **Consentimiento**: Documento de consentimiento informado.
- **Declaración**: Declaración jurada o similar.
- **Cuestionario**: Formulario con preguntas.

### 10.2 Crear/Editar documento
| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre del documento. |
| Descripción | Descripción opcional. |
| Tipo | Consentimiento, Declaración o Cuestionario. |
| Activo | Switch para activar/desactivar. |

### 10.3 Campos del documento
Cada documento tiene campos personalizables:

| Tipo de campo | Descripción |
|---------------|-------------|
| **Texto informativo** | Bloque de texto de solo lectura. Soporta variables dinámicas. |
| **Texto corto** | Input de texto. |
| **Texto largo** | Textarea. |
| **Casilla de verificación** | Checkbox individual. |
| **Lista desplegable** | Select con opciones configurables. |
| **Opciones múltiples** | Radio buttons con opciones configurables. |
| **Fecha** | Selector de fecha. |
| **Firma digital** | Área de firma. |

### 10.4 Variables dinámicas
Se pueden insertar en campos de tipo "Texto informativo":

| Variable | Valor |
|----------|-------|
| `{{nombre}}` | Nombre del paciente |
| `{{rut}}` | RUT del paciente |
| `{{fecha_nacimiento}}` | Fecha de nacimiento |
| `{{edad}}` | Edad calculada |
| `{{email}}` | Email del paciente |
| `{{telefono}}` | Teléfono del paciente |
| `{{direccion}}` | Dirección del paciente |
| `{{empresa}}` | Nombre de la empresa |
| `{{fecha_actual}}` | Fecha de hoy |
| `{{numero_ingreso}}` | Número de ingreso de la atención |

### 10.5 Vista previa
- Botón "Preview" muestra cómo se verá el formulario con datos de ejemplo.
- Reemplaza las variables con datos ficticios para verificar el formato.

### 10.6 Ordenar campos
- Botones ↑↓ para reordenar campos arrastrándolos.

---

## 11. PANTALLA TV

### 11.1 Modos de visualización

#### Modo Configuración
Pantalla de administración con:
- **Selección de boxes**: Checkboxes para elegir qué boxes mostrar en la pantalla.
- **Gestión de QR**: Subir imágenes QR con título. Se pueden activar/desactivar y reordenar.
- **Botón "Iniciar Pantalla"**: Entra al modo display con los boxes seleccionados.
- **Botón "Pantalla QR"**: Entra al modo display con QR codes seleccionados.

#### Modo Display (Pantalla de boxes)
Pantalla diseñada para TV/monitor de sala de espera:
- Muestra el **código del día** con cuenta regresiva hasta el próximo reset.
- Lista de pacientes en atención agrupados por box seleccionado.
- Cada fila muestra: número de ingreso y nombre del paciente.
- **Llamado por voz**: Cuando un paciente es llamado a un box, el sistema anuncia por voz: "Paciente [nombre], pasar a [box]" usando `speechSynthesis`.
- Auto-refresh en tiempo real.

#### Modo Display QR
- Muestra los QR codes seleccionados en formato presentación.
- Útil para mostrar enlaces de encuestas, portal del paciente, etc.

---

## 12. EVALUACIÓN MÉDICA

### 12.1 Pestaña "Pacientes del Día"
Lista de pacientes con sus baterías y estado de evaluación.

**Filtros de estado:**
| Estado | Color | Descripción |
|--------|-------|-------------|
| ✅ Lista para evaluar | Verde | Todos los exámenes de la batería están completados. |
| ⏳ Esperando resultados | Amarillo | Hay exámenes en estado `muestra_tomada` (esperando resultados de laboratorio). |
| ⏸ Pendiente | Gris | Hay exámenes en estado `pendiente`. |
| ✓ Evaluado APTO | Verde oscuro | Ya evaluado como apto. |
| ✗ Evaluado NO APTO | Rojo | Ya evaluado como no apto. |
| ⚠ Evaluado APTO C/R | Naranja | Apto con restricciones. |

**Exclusión automática:** Los pacientes con tipo de servicio `workmed` son excluidos de esta lista.

**Por cada paciente se muestra:**
- Número de ingreso, nombre, RUT, empresa.
- Lista de baterías con badge de estado.
- Botón "Evaluar" para abrir la evaluación de una batería específica.

### 12.2 Pestaña "Evaluación"
Pantalla dividida para evaluar una batería específica de un paciente.

**Panel izquierdo — Formulario de evaluación:**
| Campo | Descripción |
|-------|-------------|
| Batería | Nombre de la batería siendo evaluada. |
| Resultado | Radio buttons: APTO, NO APTO, APTO CON RESTRICCIONES. |
| Duración | Selector de vigencia del certificado (se oculta si es NO APTO o si se selecciona "No mostrar"). |
| Restricciones | Textarea (visible solo si el resultado es APTO CON RESTRICCIONES). |
| Observaciones | Textarea para notas clínicas. |
| Botón "Guardar Evaluación" | Guarda la evaluación clínica. Si ya existe una evaluación previa, la actualiza. |

**Panel derecho — Resultados clínicos:**
- **Resultados de exámenes**: Para cada examen de la batería, muestra los valores ingresados agrupados por campo.
- **Audiogramas**: Si hay examen de audiometría, renderiza el gráfico audiométrico (componente `AudiometriaChart`).
- **Antropometría**: Si hay datos antropométricos, los muestra formateados.
- **Archivos PDF**: Si hay archivos subidos, muestra botón para descargar/ver.
- **Documentos**: Muestra documentos asociados a la atención con sus respuestas.

### 12.3 Pestaña "Historial"
- Historial de evaluaciones realizadas.
- Filtrable por fecha.
- Muestra todas las evaluaciones con resultado, observaciones y fecha.

---

## 13. COTIZACIONES

### 13.1 Pestaña "Cotizaciones"
Lista de cotizaciones con buscador y filtros.

| Función | Descripción |
|---------|-------------|
| **Crear cotización** | Formulario completo con: empresa (buscador), datos de contacto, items (baterías o exámenes sueltos), cantidades, márgenes, IVA. |
| **Editar** | Modifica una cotización existente. |
| **Duplicar** | Crea una copia de la cotización. |
| **Ver PDF** | Genera y descarga un PDF de la cotización (jsPDF + autoTable). |
| **Eliminar** | Con confirmación. |
| **Filtros** | Por estado (borrador/enviada/aceptada/rechazada), por fecha, por empresa. |

### 13.2 Pestaña "Solicitudes"
Lista de solicitudes de cotización recibidas desde el portal de empresas.

| Función | Descripción |
|---------|-------------|
| **Ver detalle** | Muestra items solicitados con cantidades estimadas. |
| **Responder** | Crea una cotización a partir de la solicitud. |
| **Cambiar estado** | Marca como en revisión, respondida, etc. |

### 13.3 Pestaña "Márgenes"
Componente `MargenesConfig`.
- Gestión de márgenes de ganancia predefinidos.
- Cada margen tiene nombre, porcentaje y orden.
- Se usan al crear cotizaciones para calcular el precio final.

---

## 14. PRESTADORES

### 14.1 Lista de prestadores
Tabla con buscador por nombre, RUT o especialidad.

| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre del prestador. |
| RUT | RUT. |
| Especialidad | Área de especialización. |
| Tipo | Interno o Externo. |
| Activo | Estado activo/inactivo. |
| Usuario vinculado | Usuario del sistema vinculado al prestador. |

### 14.2 Crear/Editar prestador
| Campo | Descripción |
|-------|-------------|
| Nombre | Obligatorio. |
| RUT | RUT del prestador. |
| Especialidad | Texto libre. |
| Tipo | Interno o Externo. |
| Email | Correo. |
| Teléfono | Teléfono. |
| Usuario vinculado | Selector de usuario del sistema (opcional). |
| Activo | Switch. |

### 14.3 Tarifas
- Botón "Tarifas" por prestador.
- Lista de exámenes con valor de prestación configurable por cada examen.
- Checkboxes para vincular/desvincular exámenes al prestador.

### 14.4 Reemplazos
- Gestión de reemplazos temporales de prestadores.
- Registra prestador original, reemplazante, fecha y motivo.

---

## 15. USUARIOS

### 15.1 Pestaña "Staff"
Componente `StaffUsersList`.
- Lista de usuarios del sistema con username y rol.
- Crear nuevo usuario (username + contraseña).
- Cambiar contraseña de un usuario.
- Eliminar usuario (con confirmación).
- Configurar permisos de menú: checkboxes por cada módulo del sistema para controlar qué módulos puede ver cada usuario.

### 15.2 Pestaña "Empresas"
Componente `EmpresaUsersList`.
- Lista de usuarios del portal de empresas.
- Crear usuario de empresa vinculado a una empresa específica.
- Activar/desactivar usuarios.
- Configurar roles de empresa.

---

## 16. CONFIGURACIÓN

### 16.1 Pestaña "Bloques Horarios"
Gestión de bloques de agenda para pre-reservas.

| Campo | Descripción |
|-------|-------------|
| Nombre | Nombre del bloque (ej: "Bloque Mañana"). |
| Hora inicio | Hora de inicio del bloque. |
| Hora fin | Hora de fin del bloque. |
| Cupo máximo | Cantidad máxima de pacientes por bloque. |
| Activo | Switch para activar/desactivar. |

**Funciones:**
- Crear, editar, eliminar bloques.
- Activar/desactivar.
- Ordenar por campo `orden`.

### 16.2 Pestaña "Faenas"
Componente `FaenasConfig`.
- Gestión global de faenas (no vinculadas a una empresa específica).
- Crear, editar, activar/desactivar faenas.

---

## 17. REGISTRO DE ACTIVIDAD

### 17.1 Vista principal
Tabla de log de actividades del sistema.

| Columna | Descripción |
|---------|-------------|
| Fecha/Hora | Timestamp de la acción. |
| Usuario | Username que realizó la acción. |
| Acción | Tipo de acción (crear paciente, llamar paciente, completar atención, etc.). |
| Módulo | Módulo donde se realizó la acción (/flujo, /mi-box, /pacientes, etc.). |
| Detalles | JSON con información adicional (nombre paciente, box, etc.). |

**Filtros:**
- Búsqueda por texto libre (filtra en acción, usuario, detalles).
- Filtro por fecha desde/hasta.
- Botón refrescar.

**Acciones registradas:**
| Acción | Descripción |
|--------|-------------|
| `login` | Inicio de sesión |
| `logout` | Cierre de sesión |
| `crear_paciente` | Nuevo paciente creado |
| `editar_paciente` | Datos de paciente modificados |
| `eliminar_paciente` | Paciente eliminado |
| `crear_atencion` | Nueva atención creada |
| `completar_atencion` | Atención completada |
| `incompleto_atencion` | Atención marcada incompleta |
| `llamar_paciente` | Paciente llamado a box |
| `devolver_espera` | Paciente devuelto a espera |
| `revertir_atencion` | Atención revertida desde completados |
| `reactivar_paciente` | Paciente reactivado desde incompletos |
| `crear_usuario` | Nuevo usuario creado |
| `eliminar_usuario` | Usuario eliminado |
| `cambiar_password` | Contraseña modificada |
| `crear_empresa` | Empresa creada |
| `editar_empresa` | Empresa editada |
| `crear_cotizacion` | Cotización creada |
| `editar_cotizacion` | Cotización editada |
| `eliminar_cotizacion` | Cotización eliminada |
| `duplicar_cotizacion` | Cotización duplicada |
| `crear_prereserva` | Pre-reserva creada |
| `eliminar_prereserva` | Pre-reserva eliminada |
| `cambiar_estado_examen` | Estado de examen modificado |
| `crear_agenda_diferida` | Agenda diferida creada |
| `vincular_agenda_diferida` | Agenda diferida vinculada |
| `generar_estado_pago` | Estado de pago generado |
| `seleccionar_box` | Box seleccionado en Mi Box |
| `completar_box` | Exámenes del box completados |
| `devolver_espera_box` | Devuelto a espera desde box |

---

## 18. FUNCIONALIDADES TRANSVERSALES

### 18.1 Auto-refresh
- Dashboard: cada 30 segundos.
- Flujo: Realtime + cada 30 segundos.
- Mi Box: Realtime + cada 10 segundos.
- Pacientes: Realtime + cada 15 segundos.
- Completados/Incompletos: Realtime.

### 18.2 Chat Global
- Disponible en Flujo, Mi Box, Documentos y Prestadores.
- Mensajes en tiempo real entre usuarios del staff.
- Vinculado a tabla `chat_messages` con Realtime.

### 18.3 Temporizador de Presión Arterial
- Si un examen tiene configurado temporizador, aparece badge con cuenta regresiva.
- Al expirar, permite tomar nueva medición.
- Componente `PresionTimerBadge` + hook `usePresionTimers`.

### 18.4 Portal del Paciente
- Ruta `/portal` accesible sin autenticación.
- El paciente ingresa el código del día + su RUT.
- Puede completar datos personales y documentos pendientes (consentimientos, declaraciones).

### 18.5 Permisos de menú
- Cada usuario puede tener restricciones de acceso a módulos.
- Tabla `menu_permissions` define qué rutas puede ver cada usuario.
- Administradores tienen acceso total.
- Se configura desde Usuarios > Staff > botón de permisos.
