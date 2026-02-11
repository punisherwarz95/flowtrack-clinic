
# Fix: Total de Cotizacion en Portal Empresa

## Problema Detectado

Despues de analizar el codigo y la base de datos, encontre lo siguiente:

- Los valores por item SI incluyen margen correctamente ($82.500, $125.000, $125.000)
- El total que se muestra ($267.500) corresponde al campo `subtotal_neto` (sin margen), NO al `total_con_margen` ($332.500)
- En la base de datos actual, `total_con_margen` ya tiene el valor correcto ($332.500)
- El codigo ya usa `total_con_margen` para mostrar el total

La causa mas probable es que la cotizacion 304 fue creada antes de que el calculo de `total_con_margen` estuviera correctamente implementado, y el valor guardado en ese momento fue igual al `subtotal_neto`.

## Solucion

Para prevenir este problema en el futuro y corregir cualquier dato inconsistente, hare dos cosas:

### 1. Calcular el total desde los items en el portal (no depender solo del campo guardado)

En `src/pages/empresa/EmpresaCotizaciones.tsx`, en lugar de confiar unicamente en `cotizacion.total_con_margen`, calcular el total sumando los `valor_final` de los items visibles. Esto garantiza que el total siempre coincida con los items mostrados.

**Cambio en `CotizacionDirectaCard`** (linea 554-563):
- Calcular `totalCalculado` como la suma de `item.valor_final` de los items filtrados
- Usar `totalCalculado` si es mayor que 0, de lo contrario usar `cotizacion.total_con_margen` como fallback

**Mismo cambio en `SolicitudCard`** (linea 489-499):
- Aplicar la misma logica para cotizaciones asociadas a solicitudes

### 2. Actualizar datos historicos inconsistentes

Verificar y corregir cualquier cotizacion donde `total_con_margen` no coincida con la suma de `valor_final` de sus items.

## Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/empresa/EmpresaCotizaciones.tsx` | Calcular total desde items en vez de usar solo el campo guardado |

## Resultado Esperado

El cliente vera el total correcto ($332.500 para la cotizacion 304) que coincide con la suma de los valores individuales mostrados, independientemente de si el campo `total_con_margen` fue guardado correctamente o no.
