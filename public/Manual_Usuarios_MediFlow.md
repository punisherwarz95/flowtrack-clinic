# 📘 Manual de Usuario — MediFlow

**Sistema de Gestión de Atenciones Médicas Ocupacionales**

---

## Índice

1. [Información General](#información-general)
2. [Manual de Recepción](#1-manual-de-recepción)
3. [Manual de Clínico (Técnico de Box)](#2-manual-de-clínico-técnico-de-box)
4. [Manual de Enfermera](#3-manual-de-enfermera)
5. [Manual de Médico](#4-manual-de-médico)

---

## Información General

### Acceso al Sistema
1. Ingrese a la URL del sistema proporcionada por su administrador.
2. Escriba su **nombre de usuario** y **contraseña**.
3. Presione **"Iniciar Sesión"**.
4. El sistema lo redirigirá automáticamente a su pantalla principal.

### Navegación
- La barra superior muestra únicamente los módulos a los que usted tiene acceso.
- El botón 🌙/☀️ permite cambiar entre modo claro y oscuro.
- El botón **"Cerrar Sesión"** finaliza su sesión de forma segura.
- El botón de **candado** permite cambiar su contraseña personal.

### Convenciones de Colores en Exámenes
| Color | Significado |
|-------|------------|
| 🟡 Amarillo | Examen pendiente |
| 🔵 Azul | Muestra tomada |
| 🟢 Verde | Examen completado |
| 🔴 Rojo | Examen incompleto |

---

# 1. Manual de Recepción

**Módulos disponibles:** Dashboard, Completados, Boxes, Flujo, Pacientes, Empresas, Exámenes, Incompletos, Pantalla TV, Documentos, Configuración.

---

## 1.1 Dashboard

El Dashboard es la pantalla principal que muestra el estado general del centro en tiempo real.

### Sección Superior — Resumen del Día
- **Pacientes Ingresados:** Cantidad total de pacientes registrados en el día seleccionado.
- **Atenciones Completadas:** Cantidad de atenciones finalizadas.
- **Distribución por Tipo de Servicio:** Desglose entre los distintos tipos de servicio (Workmed / Jenner).

### Sección de Métricas Mensuales
- Permite seleccionar un mes para ver estadísticas acumuladas.
- Muestra totales de atenciones completadas en el período.

### Tabla de Pacientes Ingresados
Vista detallada de todos los pacientes del día con filtros dinámicos:

**Filtros disponibles:**
- **Buscar por nombre:** Escriba el nombre del paciente para filtrar.
- **Estado de atención:** Filtre por completado/incompleto.
- **Empresa:** Lista desplegable que muestra solo las empresas presentes en el día.
- **Tipo de servicio:** Workmed o Jenner.
- **Examen:** Filtre por un examen específico.
- **Box:** Filtre por box específico.
- **Colores de examen:** Active/desactive la visualización por estado de examen (pendiente, muestra, completado, incompleto).

> **💡 Tip:** Los filtros son **dinámicos entre sí**. Por ejemplo, si selecciona un Box, las listas de Empresa y Examen se actualizarán para mostrar solo opciones relevantes a ese Box.

### Búsqueda Histórica
- En la parte inferior del Dashboard hay un buscador de pacientes que permite consultar historiales de atenciones pasadas.

---

## 1.2 Pacientes

Módulo central para el registro e ingreso de pacientes al sistema.

### Pestaña "Pacientes" — Registro e Ingreso

#### Registrar un Nuevo Paciente
1. Complete los datos del paciente en el formulario lateral:
   - **Nombre completo** (obligatorio)
   - **RUT** (se formatea automáticamente)
   - **Tipo de servicio** (Workmed / Jenner)
   - **Empresa** (busque y seleccione de la lista)
   - **Faena** (se carga automáticamente según la empresa)
   - **Email, teléfono, fecha de nacimiento, dirección**
2. Seleccione las **baterías** (paquetes de exámenes) que correspondan.
   - Puede filtrar baterías por faena.
3. Seleccione **exámenes individuales** adicionales si es necesario.
4. Presione **"Ingresar Paciente"**.
5. El sistema asigna automáticamente un **número de ingreso** correlativo del día.

#### Buscar Pacientes del Día
- Use el campo de búsqueda para filtrar por nombre o RUT.
- Use el selector de fecha para ver pacientes de otros días.
- Los pacientes con datos incompletos del portal se marcan con un ícono de alerta.

#### Acciones por Paciente
- **Editar:** Modifique datos del paciente.
- **Ver exámenes completados:** Consulte el estado de cada examen.
- **Eliminar:** Solo disponible si el paciente no tiene atenciones activas.

### Pestaña "Código del Día"
- Muestra el código diario activo para que los pacientes puedan completar sus datos desde el Portal Paciente.
- El código se renueva automáticamente según la hora configurada.

### Pestaña "Pegar Texto Workmed"
- Permite pegar texto desde sistemas externos para crear pacientes de forma masiva.

### Pestaña "Pre-Reservas"
- Gestione las pre-reservas de atención creadas por empresas.
- Confirme, cancele o vincule pre-reservas con atenciones existentes.

### Pestaña "Agenda Diferida"
- Administre la agenda de pacientes que requieren atención programada en fecha futura.

---

## 1.3 Flujo

Módulo que controla el flujo de pacientes entre los distintos boxes de atención.

### Vista Principal
Muestra todas las atenciones del día en estado **"En Espera"** o **"En Atención"**, con:
- Número de ingreso
- Nombre y RUT del paciente
- Tipo de servicio
- Estado de ficha
- Box actual (si está en atención)

### Funciones Principales

#### Asignar Paciente a un Box
1. Localice al paciente en la lista.
2. Seleccione el box destino en el desplegable.
3. El paciente pasará a estado **"En Atención"** en ese box.

#### Marcar Exámenes
- Cada paciente muestra sus exámenes con badges de colores.
- Puede marcar exámenes como **completado**, **muestra tomada** o **incompleto**.
- Seleccione múltiples exámenes y guárdelos de una vez.

#### Completar Atención
- Cuando todos los exámenes estén finalizados, presione **"Completar"**.
- El sistema verificará si hay exámenes pendientes y mostrará una advertencia.
- Si hay exámenes sin completar, la atención se marcará como **"Incompleta"**.

#### Filtros
- **Filtrar por Box:** Vea solo los pacientes de un box específico.
- **Filtrar por fecha:** Consulte el flujo de otros días.

#### Indicadores de Documentos
- Un ícono de documento muestra la cantidad de documentos pendientes vs. totales.
- Los documentos con alertas se marcan en amarillo.

### Estado de Ficha
- Los checkboxes de estado de ficha permiten registrar si el paciente: tiene consentimiento firmado, llenó cuestionarios, etc.

### Chat Global
- En la esquina inferior hay un chat en tiempo real para comunicarse con otros usuarios del sistema.

---

## 1.4 Completados

Módulo para revisar y gestionar las atenciones finalizadas.

### Vista de Atenciones Completadas
- Lista todas las atenciones marcadas como **"Completado"** en la fecha seleccionada.
- Muestra: número de ingreso, nombre, RUT, empresa, tipo de servicio y fecha de finalización.
- Los exámenes se muestran como badges con su estado final.

### Distribución por Tipo
- Muestra un resumen con la cantidad de pacientes Workmed vs. Jenner completados.

### Revertir Atención
1. Presione el botón **↩️ Revertir** en una atención completada.
2. Seleccione qué exámenes desea revertir a estado pendiente.
3. Confirme la acción.
4. La atención volverá a estado **"En Espera"** para ser atendida nuevamente.

### Pestaña "Métricas"
- Estadísticas detalladas del período seleccionado.

### Pestaña "Resultados Pendientes"
- Lista de exámenes que están en estado **"Muestra Tomada"** y aún no tienen resultado final.
- Útil para hacer seguimiento de muestras enviadas a laboratorio.

---

## 1.5 Incompletos

Módulo para gestionar atenciones que no pudieron completarse.

### Vista de Atenciones Incompletas
- Muestra atenciones marcadas como **"Incompleto"** en un rango de fechas.
- Se puede seleccionar un **rango de fechas** (por defecto: mes actual).

### Información Mostrada
- Número de ingreso, nombre, RUT, empresa, tipo de servicio.
- **Exámenes incompletos** resaltados en rojo.
- **Observaciones** del motivo de incompletitud.

### Distribución
- Resumen de incompletos por tipo de servicio.
- Total de exámenes incompletos en el período.

### Reactivar Atención
1. Presione **↩️ Reactivar** en una atención incompleta.
2. Confirme la acción.
3. La atención vuelve a estado **"En Espera"** con sus exámenes pendientes, lista para ser retomada.

---

## 1.6 Empresas

Módulo para administrar las empresas cliente del centro.

### Gestión de Empresas
- **Crear empresa:** Presione "+ Nueva Empresa" e ingrese los datos:
  - Nombre, RUT, Razón Social, Contacto, Email, Teléfono, Centro de Costo.
- **Editar empresa:** Presione el ícono de lápiz ✏️.
- **Eliminar empresa:** Presione el ícono de papelera 🗑️ (requiere confirmación).
- **Buscar:** Use el campo de búsqueda para filtrar por nombre o RUT.

### Pestañas por Empresa
Al editar una empresa se accede a:

#### Datos
- Información general de la empresa.

#### Baterías
- Asigne paquetes de exámenes (baterías) con sus **valores de venta** específicos para esta empresa.
- Esto permite que cada empresa tenga tarifas diferenciadas.

#### Faenas
- Gestione las faenas (ubicaciones de trabajo) asociadas a la empresa.
- Cada faena puede tener exámenes y baterías específicas.

---

## 1.7 Boxes

Módulo para configurar los boxes (salas/estaciones) de atención.

### Gestión de Boxes
- **Crear box:** Presione "+ Nuevo Box" e ingrese nombre y descripción.
- **Editar box:** Modifique nombre, descripción o estado activo/inactivo.
- **Activar/Desactivar:** Use el switch para habilitar o deshabilitar un box sin eliminarlo.
- **Eliminar box:** Solo si no tiene atenciones asociadas.

### Asignación de Exámenes a Boxes
- En la configuración de Exámenes (módulo separado), se definen qué exámenes se realizan en cada box.
- Esto es fundamental para el correcto funcionamiento del flujo de pacientes.

---

## 1.8 Exámenes

Módulo para administrar el catálogo de exámenes y baterías.

### Pestaña "Exámenes"
- **Crear examen:** Nombre, descripción, código, duración estimada, costo neto.
- **Editar/Eliminar** exámenes existentes.
- **Buscar** por nombre o código.
- **Asignar a boxes:** Defina en qué box se realiza cada examen.

### Pestaña "Baterías (Paquetes)"
- **Crear batería:** Agrupe varios exámenes en un paquete con nombre y descripción.
- **Asignar exámenes** a cada batería.
- **Ver documentos** asociados a la batería.
- **Precios por empresa:** Cada empresa puede tener un valor diferente para la misma batería.

### Pestaña "Formularios de Examen"
- Configure los campos de formulario específicos para cada examen.
- Tipos de campo disponibles: texto, número, select, checkbox, archivo, etc.
- Los campos se agrupan lógicamente para facilitar el llenado.

### Pestaña "Trazabilidad"
- Configure relaciones de trazabilidad entre exámenes.
- Permite vincular exámenes que comparten resultados o archivos.

### Importación Masiva
- Importe exámenes desde archivos Excel (.xlsx).
- El sistema valida y procesa los datos automáticamente.

---

## 1.9 Documentos

Módulo para crear y administrar formularios y documentos digitales.

### Tipos de Documentos
- **Consentimiento:** Documentos que requieren firma del paciente.
- **Declaración:** Declaraciones informativas.
- **Cuestionario:** Formularios con preguntas para el paciente.

### Crear un Documento
1. Presione **"+ Nuevo Documento"**.
2. Ingrese nombre, descripción y tipo.
3. Agregue campos al formulario:
   - **Texto informativo:** Párrafos de solo lectura (soporta variables como `{{nombre}}`, `{{rut}}`, `{{empresa}}`).
   - **Texto corto/largo:** Campos de entrada de texto.
   - **Checkbox:** Casillas de verificación.
   - **Select/Radio:** Opciones de selección.
   - **Fecha:** Selector de fecha.
   - **Firma digital:** Campo para firma del paciente.
4. Ordene los campos arrastrándolos.
5. Marque campos como **requeridos** según necesidad.

### Variables Dinámicas
Los textos informativos pueden incluir variables que se reemplazan automáticamente:
- `{{nombre}}` → Nombre del paciente
- `{{rut}}` → RUT del paciente
- `{{empresa}}` → Nombre de la empresa
- `{{fecha_actual}}` → Fecha de hoy
- `{{numero_ingreso}}` → Número de ingreso
- Y más...

### Activar/Desactivar
- Los documentos inactivos no se asignan a nuevas atenciones.

---

## 1.10 Pantalla TV

Módulo para mostrar información en pantallas de sala de espera.

### Configuración
1. Seleccione los **boxes** que desea mostrar en pantalla.
2. Configure códigos **QR** opcionales (imágenes para escanear).
3. Presione **"Iniciar Pantalla"** o **"Pantalla con QR"**.

### Modo Pantalla
- Muestra en pantalla completa:
  - Nombre del paciente llamado
  - Box al que debe dirigirse
  - Número de ingreso
  - Código del día con cuenta regresiva
- **Llamado por voz:** El sistema anuncia automáticamente por audio el nombre del paciente y el box.

### Modo QR
- Alterna entre la pantalla de llamados y los códigos QR configurados.
- Útil para mostrar enlaces al Portal Paciente u otra información.

### Gestión de QR
- Suba imágenes de códigos QR con un título descriptivo.
- Ordene y active/desactive los QR según necesidad.

---

## 1.11 Configuración

Módulo de configuración general del sistema.

### Bloques de Agenda
- Configure los bloques horarios para la agenda de citas:
  - **Nombre** del bloque (ej: "Mañana", "Tarde").
  - **Hora inicio** y **hora fin**.
  - **Cupo máximo** de pacientes por bloque.
  - **Activar/Desactivar** bloques.
  - **Ordenar** bloques por prioridad.

### Faenas
- Gestión centralizada de faenas (ubicaciones de trabajo).
- Crear, editar, activar/desactivar faenas.
- Asociar faenas a empresas.

---

# 2. Manual de Clínico (Técnico de Box)

**Módulos disponibles:** Dashboard, Mi Box.

---

## 2.1 Dashboard

*(Mismo funcionamiento descrito en la sección 1.1)*

Le permite al clínico ver un panorama general del día:
- Cuántos pacientes hay ingresados.
- Estado general de exámenes.
- Filtrar por box para ver qué pacientes le corresponden.

> **💡 Uso sugerido:** Filtre por su box asignado para ver rápidamente cuántos pacientes tiene pendientes.

---

## 2.2 Mi Box

Módulo principal del clínico. Permite gestionar la atención de pacientes en su box asignado.

### Selección de Box
- Al ingresar por primera vez, seleccione su box de trabajo.
- El box se guarda para sesiones futuras.
- Puede cambiar de box presionando el botón **"Cambiar Box"**.

### Pestañas Principales

#### Cola de Espera
Muestra los pacientes que tienen exámenes pendientes asignados a su box.

**Para cada paciente se muestra:**
- Número de ingreso
- Nombre y RUT
- Tipo de servicio (badge de color)
- Exámenes pendientes en este box (badges amarillos)
- Exámenes de otros boxes (badges grises)
- Temporizadores de presión arterial (si aplica)
- Estado de documentos pendientes

**Acciones:**
- **▶️ Llamar:** Llama al paciente (cambia su estado a "En Atención" en su box).
  - En modo **llamado individual**: llama uno a uno.
  - En modo **llamado múltiple**: puede tener varios pacientes en atención simultáneamente.
- **Número de pacientes en otros boxes:** Indica cuántos están siendo atendidos en otros boxes (para referencia).

#### Paciente en Atención
Cuando un paciente es llamado, aparece su ficha completa:

**Información del paciente:**
- Nombre, RUT, fecha de nacimiento, edad, tipo de servicio, empresa.

**Exámenes asignados a este box:**
- Cada examen se muestra con su formulario de resultados.
- Complete los campos del formulario (valores numéricos, textos, selecciones).
- Adjunte archivos si el examen lo requiere (ej: radiografías, ECG).
- Marque cada examen como:
  - ✅ **Completado**: Examen realizado con éxito.
  - 🔵 **Muestra Tomada**: Se tomó muestra pero el resultado viene después (laboratorio).
  - ❌ **Incompleto**: El paciente no pudo completar el examen.

**Exámenes de otros boxes (solo lectura):**
- Puede ver el estado y resultados de exámenes realizados en otros boxes.

**Documentos:**
- Acceda a los documentos/formularios asignados a la atención.
- Complete cuestionarios, revise consentimientos firmados.
- Los documentos pendientes se marcan con un contador.

**Gestión de Presión Arterial:**
- Si el examen incluye presión arterial, puede configurar un temporizador para la segunda toma.
- El temporizador aparece como badge en la cola y se puede completar cuando termine.

**Estado de Ficha:**
- Marque los checkboxes de estado de ficha según corresponda.

**Acciones finales:**
- **Liberar:** Devuelve al paciente a la cola de espera (estado "En Espera") para que pueda ser atendido en otro box.
- **Completar atención:** Finaliza la atención si todos los exámenes del centro están completos.

#### Completados del Box
- Lista de pacientes que ya fueron atendidos completamente en su box durante el día.
- Permite ver los exámenes realizados y sus estados.

### Código del Día
- Muestra el código diario que los pacientes usan en el Portal Paciente para completar sus datos.

### Chat Global
- Chat en tiempo real con todo el equipo del centro.

---

# 3. Manual de Enfermera

**Módulos disponibles:** Mi Box, Dashboard, Completados, Incompletos.

---

## 3.1 Dashboard

*(Mismo funcionamiento descrito en la sección 1.1)*

Le permite ver:
- Resumen de pacientes del día.
- Estado de exámenes filtrados por box, empresa o tipo.
- Identificar rápidamente pacientes pendientes.

---

## 3.2 Mi Box

*(Mismo funcionamiento descrito en la sección 2.2)*

Es su herramienta principal de trabajo diario. Le permite:
- Ver la cola de pacientes asignados a su box.
- Llamar pacientes para atención.
- Completar formularios de exámenes.
- Registrar resultados, tomar muestras y adjuntar archivos.
- Gestionar documentos y consentimientos.
- Liberar o completar atenciones.

---

## 3.3 Completados

*(Mismo funcionamiento descrito en la sección 1.4)*

Le permite:
- Revisar atenciones finalizadas del día.
- Verificar que todos los exámenes se completaron correctamente.
- **Revertir** una atención si se necesita retomar algún examen.
- Consultar **resultados pendientes** (muestras enviadas a laboratorio sin resultado final).
- Ver **métricas** de productividad.

---

## 3.4 Incompletos

*(Mismo funcionamiento descrito en la sección 1.5)*

Le permite:
- Identificar atenciones que no se pudieron completar.
- Ver qué exámenes quedaron pendientes y por qué.
- **Reactivar** atenciones incompletas para que el paciente sea atendido nuevamente.
- Filtrar por rango de fechas para análisis.

---

# 4. Manual de Médico

**Módulos disponibles:** Dashboard, Mi Box, Evaluación Médica.

---

## 4.1 Dashboard

*(Mismo funcionamiento descrito en la sección 1.1)*

Le permite:
- Ver el panorama general de pacientes del día.
- Identificar pacientes que ya completaron sus exámenes y están listos para evaluación médica.

> **💡 Uso sugerido:** Filtre por exámenes completados (verde) para identificar pacientes listos para su evaluación.

---

## 4.2 Mi Box

*(Mismo funcionamiento descrito en la sección 2.2)*

Si el médico atiende en un box (ej: examen médico presencial), puede:
- Llamar pacientes desde la cola.
- Completar formularios de examen médico.
- Revisar resultados de exámenes de otros boxes.
- Completar la atención.

---

## 4.3 Evaluación Médica

Módulo exclusivo para la evaluación clínica integral del paciente.

### Pestaña "Listado" — Pacientes del Día

Muestra todos los pacientes del día (servicio Jenner) con sus baterías y estado de evaluación.

**Estados de baterías:**
| Estado | Significado |
|--------|------------|
| 🟢 **Lista para evaluar** | Todos los exámenes de la batería están completados o con muestra tomada. |
| 🟡 **Esperando resultados** | Hay exámenes con muestra tomada pero sin resultado final. |
| ⚪ **Pendiente** | Aún hay exámenes sin realizar. |
| 🔵 **Evaluado - Apto** | Ya fue evaluado y el resultado es apto. |
| 🟠 **Evaluado - Restricciones** | Evaluado con restricciones. |
| 🔴 **Evaluado - No Apto** | Evaluado como no apto. |

**Filtros de estado:**
- Active/desactive los filtros para ver solo baterías en el estado que necesita.
- Útil para filtrar y ver solo las **"Listas para evaluar"**.

**Acciones:**
- Presione **"Evaluar"** o haga clic en el nombre del paciente para abrir la evaluación.

### Evaluación del Paciente

Al seleccionar un paciente, se muestra la vista de evaluación con:

#### Información del Paciente
- Nombre, RUT, empresa, número de ingreso.

#### Baterías a Evaluar
- Cada batería muestra sus exámenes con estado y resultados.
- Los resultados de laboratorio, audiometría, radiografías, etc. están disponibles para revisión.

#### Formulario de Evaluación
Para cada batería, complete:

1. **Resultado:** Seleccione una opción:
   - **Apto:** El paciente cumple todos los criterios.
   - **No Apto:** El paciente no cumple los criterios.
   - **Apto con Restricciones:** Cumple parcialmente, con limitaciones.

2. **Observaciones:** Notas clínicas relevantes.

3. **Restricciones:** (Si aplica) Detalle las restricciones.

4. **Evaluación por examen:** Opcionalmente, puede evaluar cada examen individualmente como Normal/Anormal.

5. Presione **"Guardar Evaluación"**.

### Pestaña "No Aptos"
- Lista histórica de pacientes evaluados como **No Apto** en una fecha seleccionada.
- Permite **re-evaluar** un paciente si es necesario cambiar el resultado.
- Muestra: nombre, RUT, empresa, batería, observaciones y fecha de evaluación.

### Re-evaluación
1. Presione **"Re-evaluar"** en un paciente No Apto.
2. Cambie el resultado y las observaciones.
3. Guarde los cambios. Se registra quién revisó y cuándo.

---

## Soporte

Si experimenta problemas con el sistema:
1. Verifique su conexión a internet.
2. Intente cerrar sesión y volver a ingresar.
3. Contacte al administrador del sistema.

---

*Manual generado para MediFlow — Sistema de Gestión de Atenciones Médicas Ocupacionales*
