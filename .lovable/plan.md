
# Plan: Corregir Error de Relación Ambigua en Cotizaciones del Portal Empresa

## Diagnóstico

La consulta a `cotizacion_solicitudes` falla con error **PGRST201** porque existen dos foreign keys entre `cotizacion_solicitudes` y `cotizaciones`:

1. `cotizacion_solicitudes.cotizacion_id` → `cotizaciones.id`
2. `cotizaciones.solicitud_id` → `cotizacion_solicitudes.id`

PostgREST no puede determinar automáticamente cuál relación usar.

## Solución

Especificar explícitamente la relación en la consulta usando la sintaxis `tabla!foreign_key_name`.

## Cambios Requeridos

### Archivo: `src/pages/empresa/EmpresaCotizaciones.tsx`

**Línea 103-106 - Actualizar la consulta:**

```text
ANTES:
.select(`
  *,
  faena:faenas(nombre),
  cotizacion:cotizaciones(id, numero_cotizacion, total_con_iva),
  items:cotizacion_solicitud_items(...)
`)

DESPUÉS:
.select(`
  *,
  faena:faenas(nombre),
  cotizacion:cotizaciones!cotizacion_solicitudes_cotizacion_id_fkey(id, numero_cotizacion, total_con_iva),
  items:cotizacion_solicitud_items(...)
`)
```

## Detalles Técnicos

- La sintaxis `cotizaciones!cotizacion_solicitudes_cotizacion_id_fkey` indica a PostgREST que use la relación many-to-one desde `cotizacion_solicitudes.cotizacion_id` hacia `cotizaciones.id`
- Esto es correcto porque cada solicitud puede tener como máximo una cotización asociada (cuando staff responde)
- La otra relación (`cotizaciones_solicitud_id_fkey`) es para el caso inverso donde staff crea una cotización referenciando una solicitud

## Resultado Esperado

Una vez aplicado el cambio, la página `/empresa/cotizaciones` cargará correctamente las solicitudes pendientes, incluyendo la solicitud "faena" de ABASTIBLE TEC.
