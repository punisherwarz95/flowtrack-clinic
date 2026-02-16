

## Modificaciones al Codigo del Dia

### Cambio 1: Generacion aleatoria en vez de correlativa

Actualmente el codigo se genera de forma deterministica usando un indice secuencial (1, 2, 3...), lo que produce codigos predecibles. Se cambiara para que el codigo sea completamente aleatorio, manteniendo la misma estructura de 3 letras + 2 numeros no repetidos.

- Se reemplazara `generarCodigoPorIndice()` por una funcion `generarCodigoAleatorio()` que seleccione letras y numeros al azar
- Se eliminara el campo `indice_secuencia` de la logica (ya no se necesita)
- Para evitar codigos repetidos, se verificara contra la base de datos antes de insertar. Si hay colision, se regenera

### Cambio 2: Reset solo cuando hay hora configurada

Actualmente el sistema siempre tiene un countdown y auto-regenera el codigo a la hora configurada. Se cambiara para que:

- Si no hay hora de reset configurada en `codigo_diario_config` (o el valor es null/vacio), el codigo NO se resetea automaticamente y no se muestra countdown
- Si hay una hora configurada, se mantiene el comportamiento actual: countdown visible y auto-regeneracion a esa hora
- En la configuracion se agregara la opcion de limpiar/desactivar la hora de reset

### Detalle tecnico

**Archivo:** `src/components/CodigoDelDia.tsx`

**Funcion de generacion aleatoria:**
- Seleccionar 3 letras al azar del conjunto LETRAS (A-Z sin I, O)
- Seleccionar 2 numeros distintos al azar del conjunto NUMEROS (2-9)
- Concatenar para formar el codigo de 5 caracteres

**Logica de reset condicional:**
- `horaReset` pasara a ser `string | null` en vez de siempre tener un valor
- El intervalo de auto-regeneracion solo se activa si `horaReset` tiene valor
- El countdown solo se muestra si `horaReset` tiene valor
- En el dialog de configuracion se agrega un boton para desactivar el reset automatico

**Migracion de base de datos:**
- Modificar la columna `hora_reset` en `codigo_diario_config` para permitir valores null (actualmente tiene default '00:00:00')
- Eliminar la columna `indice_secuencia` de `codigos_diarios` si existe (ya no se usa)

