

# Plan: Mejorar Vista de Exámenes con Lista y Filtro

## Objetivo
Cambiar la visualización de exámenes de tarjetas (cards) a una lista/tabla que muestre el código y nombre de cada examen, y agregar un campo de búsqueda que filtre tanto por código como por nombre.

## Cambios visuales propuestos

### Vista actual (Cards)
```text
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 📋 Audiometría  │  │ 📋 Espirometría │  │ 📋 Rx Tórax     │
│                 │  │                 │  │                 │
│ Duración: 30min │  │ Duración: 15min │  │ Duración: 10min │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Nueva vista (Tabla con filtro)
```text
┌─────────────────────────────────────────────────────────────────────┐
│ 🔍 [Buscar por código o nombre...                    ]              │
├─────────────────────────────────────────────────────────────────────┤
│ CÓDIGO     │ NOMBRE              │ COSTO      │ ACCIONES            │
├────────────┼─────────────────────┼────────────┼─────────────────────┤
│ AUD-001    │ Audiometría         │ $5,000     │ [✏️] [🗑️]           │
│ ESP-002    │ Espirometría        │ $8,000     │ [✏️] [🗑️]           │
│ RX-003     │ Radiografía Tórax   │ $12,000    │ [✏️] [🗑️]           │
│ ...        │ ...                 │ ...        │ ...                 │
└────────────┴─────────────────────┴────────────┴─────────────────────┘

Mostrando 45 de 150 exámenes
```

## Cambios a implementar

### Modificar `src/pages/Examenes.tsx`

1. **Agregar estado para el filtro de búsqueda**
   ```typescript
   const [searchFilter, setSearchFilter] = useState("");
   ```

2. **Crear función para filtrar exámenes**
   ```typescript
   const filteredExamenes = examenes.filter((examen) => {
     const searchLower = searchFilter.toLowerCase().trim();
     if (!searchLower) return true;
     
     const codigoMatch = examen.codigo?.toLowerCase().includes(searchLower);
     const nombreMatch = examen.nombre.toLowerCase().includes(searchLower);
     
     return codigoMatch || nombreMatch;
   });
   ```

3. **Reemplazar grid de Cards por componente Table**
   - Agregar Input de búsqueda arriba de la tabla
   - Usar los componentes Table, TableHeader, TableBody, TableRow, TableHead, TableCell
   - Columnas: Código, Nombre, Costo, Acciones (editar/eliminar)
   - Mostrar contador de resultados filtrados

### Estructura del nuevo código

```text
<TabsContent value="examenes">
  ┌──────────────────────────────────────────────────┐
  │ Input de búsqueda con ícono Search               │
  │ placeholder="Buscar por código o nombre..."      │
  └──────────────────────────────────────────────────┘
  
  ┌──────────────────────────────────────────────────┐
  │ <Table>                                          │
  │   <TableHeader>                                  │
  │     - Código                                     │
  │     - Nombre                                     │
  │     - Costo                                      │
  │     - Acciones                                   │
  │   </TableHeader>                                 │
  │   <TableBody>                                    │
  │     {filteredExamenes.map(...)}                  │
  │   </TableBody>                                   │
  │ </Table>                                         │
  └──────────────────────────────────────────────────┘
  
  <p>Mostrando X de Y exámenes</p>
</TabsContent>
```

## Detalles tecnicos

### Imports adicionales necesarios
```typescript
import { Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
```

### Estado nuevo
```typescript
const [searchFilter, setSearchFilter] = useState("");
```

### Lógica de filtrado
```typescript
const filteredExamenes = useMemo(() => {
  const searchLower = searchFilter.toLowerCase().trim();
  if (!searchLower) return examenes;
  
  return examenes.filter((examen) => {
    const codigoMatch = examen.codigo?.toLowerCase().includes(searchLower) || false;
    const nombreMatch = examen.nombre.toLowerCase().includes(searchLower);
    return codigoMatch || nombreMatch;
  });
}, [examenes, searchFilter]);
```

### Componente de búsqueda
```tsx
<div className="relative mb-4">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Buscar por código o nombre..."
    value={searchFilter}
    onChange={(e) => setSearchFilter(e.target.value)}
    className="pl-10"
  />
</div>
```

### Tabla de exámenes
```tsx
<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-[120px]">Código</TableHead>
        <TableHead>Nombre</TableHead>
        <TableHead className="w-[120px] text-right">Costo</TableHead>
        <TableHead className="w-[100px] text-center">Acciones</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {filteredExamenes.map((examen) => (
        <TableRow key={examen.id}>
          <TableCell className="font-mono text-sm">
            {examen.codigo || "-"}
          </TableCell>
          <TableCell>{examen.nombre}</TableCell>
          <TableCell className="text-right">
            {examen.costo_neto ? `$${examen.costo_neto.toLocaleString()}` : "-"}
          </TableCell>
          <TableCell className="text-center">
            <div className="flex justify-center gap-1">
              <Button variant="ghost" size="icon" onClick={...}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={...}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

<p className="text-sm text-muted-foreground mt-2">
  Mostrando {filteredExamenes.length} de {examenes.length} exámenes
</p>
```

### Archivos a modificar
- `src/pages/Examenes.tsx`

### Dependencias
- Componentes Table ya existen en `src/components/ui/table.tsx`
- Ícono Search de lucide-react ya está disponible

