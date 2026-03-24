

# Diagnostico: Por que algunos usuarios cargan lento y otros no

## Hallazgo clave

El archivo `src/hooks/useReferenceData.ts` **no existe** a pesar de estar documentado en la memoria del proyecto. Esto significa que el cache global de datos de referencia **nunca fue implementado**. Cada pagina (Dashboard, Flujo, MiBox, Pacientes) hace queries independientes cada vez que se abre.

## Por que "operaciones" carga rapido y Gerardo/Ornella no

La diferencia no es de internet — es una combinacion de:

1. **Rol y permisos**: Si "operaciones" es admin, sus permisos se cachean en sessionStorage tras el primer login. Si Gerardo/Ornella son no-admin, la query de `menu_permissions` puede ser mas lenta dependiendo de cuantos registros tengan.

2. **Dispositivo**: Un PC con menos RAM o CPU mas lento procesa el rendering de React significativamente mas lento. Chrome con muchas pestanas abiertas consume memoria y ralentiza todo.

3. **Cold start del backend**: El primer usuario que accede tras inactividad "paga" el cold start (~250ms-1s extra). Los siguientes usuarios se benefician de la instancia ya caliente.

4. **Sin cache entre modulos**: Al navegar de Dashboard a Flujo, se re-consultan boxes, examenes, empresas — datos identicos que ya estaban cargados.

## Requisitos para conexion optima

### Dispositivo
- **RAM minima**: 8 GB (Chrome consume ~500MB-1GB con la app abierta)
- **Navegador**: Chrome o Edge actualizado (no Firefox, no Safari)
- **Pestanas**: Maximo 5-8 pestanas abiertas simultaneamente
- **Cache del navegador**: No usar modo incognito (pierde sessionStorage cache)
- **Disco**: SSD preferido sobre HDD (afecta cache del navegador)

### Internet
- **Latencia**: Menos de 50ms al servidor (mas importante que velocidad). Probar con `ping szqnsuxmbvxxdzlbdglz.supabase.co`
- **Velocidad**: 10 Mbps es suficiente (los 250 Mbps que tienen estan bien)
- **Estabilidad**: WiFi 5GHz preferido sobre 2.4GHz. Cable ethernet es ideal
- **VPN/Proxy**: Desactivar si hay — agrega latencia

### Navegador
- **Extensiones**: Desactivar ad-blockers y extensiones innecesarias (pueden interceptar requests)
- **Cache**: No limpiar cache frecuentemente (destruye el sessionStorage de permisos)

## Solucion tecnica: Implementar el cache que falta

### 1. Crear `src/hooks/useReferenceData.ts`
- Hooks `useBoxes()`, `useExamenes()`, `useEmpresas()` usando React Query
- `staleTime: 5 min`, `gcTime: 10 min` — datos cargados una vez sirven para toda la sesion
- Exportar tipos compartidos

### 2. Actualizar `src/pages/Flujo.tsx`
- Reemplazar queries directas de `boxes` y `examenes` en `loadData()` por `useBoxes()` y `useExamenes()`
- Solo consultar `atenciones` (dato que cambia) en cada carga

### 3. Actualizar `src/pages/Dashboard.tsx`
- Usar `useBoxes()` en vez de queries independientes para box_examenes
- Eliminar queries duplicadas entre `loadDailyStats` y `loadMonthlyStats`

### 4. Actualizar `src/pages/MiBox.tsx`
- Reemplazar `loadBoxes()` por `useBoxes()`
- Usar cache para examenes

### 5. Actualizar `src/pages/Pacientes.tsx`
- Usar hooks cacheados para examenes, empresas, paquetes

## Resultado esperado
- Primera carga: similar (las queries se hacen 1 vez)
- **Navegacion entre modulos**: de 1-3s a **instantanea** para datos de referencia
- Menos queries al backend = menos probabilidad de cold start

