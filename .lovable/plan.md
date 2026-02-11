
# Fix: Valor Unitario, Margen con Cantidad, y Mayusculas en Examenes

## Problema 1: Guardar valor unitario al aceptar cotizacion

Cuando el cliente acepta una cotizacion, el sistema guarda `valor_final` (que es precio unitario con margen x cantidad) en `empresa_baterias`. Debe guardar el **valor unitario** (valor_final / cantidad).

### Cambios en `src/pages/empresa/EmpresaCotizaciones.tsx`

**handleAceptarCotizacion (lineas 256-310)**:
- Cambiar query de items para incluir `cantidad`: `select("paquete_id, valor_final, cantidad")`
- Calcular valor unitario: `valor: (item.valor_final || 0) / (item.cantidad || 1)`
- Aplicar en las lineas 297 y 309

**handleAceptarDirecta (lineas 362-384)**:
- Mismo cambio: incluir `cantidad` en query (linea 364)
- Calcular valor unitario en lineas 380 y 382

---

## Problema 2: Cambiar cantidad resetea el margen personalizado

En `src/components/cotizacion/CotizacionForm.tsx`, `handleUpdateItem` (linea 541) siempre llama a `calculateItemValues` con el `margen_id` del item. Cuando el margen es personalizado, `margen_id` es null, asi que `calculateItemValues` no encuentra margen y usa 0%.

### Cambio en `handleUpdateItem` (lineas 541-558)

Agregar logica condicional: si el item tiene `margen_nombre === "Personalizado"`, recalcular manualmente usando `item.margen_porcentaje` en vez de llamar a `calculateItemValues`:

```text
if campo es "cantidad" y margen es "Personalizado":
  - Recalcular valor_total_neto, valor_iva, valor_con_iva con nueva cantidad
  - Aplicar item.margen_porcentaje al nuevo valor_con_iva
  - Calcular valor_margen y valor_final
else:
  - Usar calculateItemValues como hasta ahora
```

---

## Problema 3: Nombres de examenes en mayusculas (solucion en base de datos)

En vez de aplicar `.toUpperCase()` en el frontend, actualizar directamente los nombres en la tabla `examenes` para que queden en mayusculas de raiz.

### Migracion SQL

```sql
UPDATE examenes SET nombre = UPPER(nombre);
```

Esto actualiza los ~200+ examenes existentes de una sola vez. Los nuevos examenes que se creen en el futuro deberian ingresarse en mayusculas (se puede agregar un trigger opcional para forzar esto automaticamente).

### Trigger opcional para futuros registros

```sql
CREATE OR REPLACE FUNCTION uppercase_examen_nombre()
RETURNS trigger AS $$
BEGIN
  NEW.nombre = UPPER(NEW.nombre);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_uppercase_examen_nombre
BEFORE INSERT OR UPDATE ON examenes
FOR EACH ROW EXECUTE FUNCTION uppercase_examen_nombre();
```

---

## Resumen de cambios

| Archivo / Recurso | Cambio |
|---|---|
| `src/pages/empresa/EmpresaCotizaciones.tsx` | Guardar valor unitario (valor_final / cantidad) al aceptar |
| `src/components/cotizacion/CotizacionForm.tsx` | Preservar margen personalizado al cambiar cantidad |
| Migracion SQL | UPDATE examenes con UPPER + trigger para futuros |
