

## Plan: Agregar conteo WM y J en "Total Pacientes"

### Problema
La tarjeta "Total Pacientes" en las estadísticas diarias del Dashboard solo muestra el total general y la fecha, pero no incluye el desglose por tipo de servicio (WM y J) como las demás tarjetas (En Espera, En Atención, Completados).

### Cambio

**Archivo:** `src/pages/Dashboard.tsx`

En la tarjeta "Total Pacientes" (lineas ~567-574), agregar debajo del total una linea con badges WM y J, calculando la suma de workmed y jenner de los tres estados:

```
WM: (enEsperaWM + enAtencionWM + completadosWM)
J:  (enEsperaJ + enAtencionJ + completadosJ)
```

Se reemplazara la linea que muestra la fecha por el mismo formato de badges que usan las otras tarjetas:

```tsx
<div className="mt-2 flex gap-2 text-xs text-muted-foreground">
  <span>WM: {totalWM}</span>
  <span>J: {totalJ}</span>
</div>
```

Donde:
- `totalWM` = `statsDaily.enEsperaDistribucion.workmed + statsDaily.enAtencionDistribucion.workmed + statsDaily.completadosDistribucion.workmed`
- `totalJ` = `statsDaily.enEsperaDistribucion.jenner + statsDaily.enAtencionDistribucion.jenner + statsDaily.completadosDistribucion.jenner`

La fecha se mantendra debajo del desglose WM/J para no perder esa informacion.

### Resultado visual esperado

La tarjeta "Total Pacientes" pasara de mostrar solo el numero grande y la fecha, a incluir el desglose WM/J con el mismo estilo visual que las demas tarjetas del Dashboard.

