

# Plan: Usar Costo del Excel como Valor de Prestación por Prestador

## Objetivo
Modificar el importador para que el costo de cada fila se guarde como el **valor que cobra cada prestador por ese examen** (`valor_prestacion` en `prestador_examenes`), en lugar de sobrescribir el costo base del examen.

## Nuevo comportamiento propuesto

```text
Excel de entrada:
┌──────────┬─────────────────┬─────────┬──────────────┐
│ CODIGO   │ NOMBRE          │ COSTO   │ PRESTADOR    │
├──────────┼─────────────────┼─────────┼──────────────┤
│ 01       │ Audiometría     │ 500     │ Prestador AB │
│ 01       │ Audiometría     │ 400     │ Prestador AC │
│ 02       │ Espirometría    │ 600     │ Prestador AB │
└──────────┴─────────────────┴─────────┴──────────────┘

Resultado en base de datos:

Tabla examenes:
┌──────────┬─────────────────┬───────────┐
│ codigo   │ nombre          │ costo_neto│
├──────────┼─────────────────┼───────────┤
│ 01       │ Audiometría     │ 500       │  ← Se usa el costo de la PRIMERA fila
│ 02       │ Espirometría    │ 600       │
└──────────┴─────────────────┴───────────┘

Tabla prestador_examenes:
┌────────────────┬────────────────┬──────────────────┐
│ prestador      │ examen         │ valor_prestacion │
├────────────────┼────────────────┼──────────────────┤
│ Prestador AB   │ Audiometría    │ 500              │  ← Cada prestador
│ Prestador AC   │ Audiometría    │ 400              │  ← tiene su tarifa
│ Prestador AB   │ Espirometría   │ 600              │
└────────────────┴────────────────┴──────────────────┘
```

## Cambios a implementar

### Modificar `src/lib/supabase.ts`

1. **Al crear/actualizar exámenes**: Solo actualizar `costo_neto` en la **primera aparición** del código (no sobrescribir en filas posteriores)

2. **Al crear relación prestador-examen**: Usar el costo de esa fila como `valor_prestacion` en lugar de 0

3. **Si la relación ya existe**: Actualizar el `valor_prestacion` con el nuevo valor del Excel

---

## Detalles tecnicos

### Cambio en la lógica de exámenes

```typescript
// Antes (sobrescribe siempre):
if (examenesMap.has(codigoLower)) {
  await supabase.from("examenes")
    .update({ nombre: row.nombre, costo_neto: row.costo ?? 0 })
    .eq("id", examenId);
}

// Después (solo usa el existente, no sobrescribe):
if (examenesMap.has(codigoLower)) {
  examenId = examenesMap.get(codigoLower)!;
  // No actualiza - mantiene el costo original
}
```

### Cambio en la lógica de relaciones

```typescript
// Antes:
await supabase.from("prestador_examenes").insert({
  prestador_id: prestadorId,
  examen_id: examenId,
  valor_prestacion: 0,  // Siempre 0
});

// Después:
if (!relacionesSet.has(relacionKey)) {
  // Crear nueva relación con el valor del Excel
  await supabase.from("prestador_examenes").insert({
    prestador_id: prestadorId,
    examen_id: examenId,
    valor_prestacion: row.costo ?? 0,  // Usar costo del Excel
  });
} else {
  // Actualizar valor si la relación ya existe
  await supabase.from("prestador_examenes")
    .update({ valor_prestacion: row.costo ?? 0 })
    .eq("prestador_id", prestadorId)
    .eq("examen_id", examenId);
}
```

### Archivo a modificar
- `src/lib/supabase.ts` - Función `importExamenesYPrestadoresFromExcel`

### Resultado esperado
Con este cambio, podrás tener un archivo Excel donde el mismo examen aparece múltiples veces con diferentes prestadores y costos, y cada prestador tendrá su tarifa correcta guardada.

