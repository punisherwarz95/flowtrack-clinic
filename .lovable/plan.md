
# Plan: Selector de Empresa para Administrador en Portal Empresa

## Descripcion General
Implementar un selector de empresas en el header del Portal de Empresas que permita a usuarios administradores (staff con rol "admin") cambiar entre diferentes empresas para visualizar sus datos. Esto facilitara la solucion de problemas sin necesidad de conocer las credenciales de cada empresa.

## Como Funcionara

1. **Deteccion de Administrador**: Cuando un usuario inicia sesion en el portal de empresa, el sistema verificara si ese usuario tambien tiene rol de administrador en el sistema de staff (tabla `user_roles`).

2. **Selector en el Header**: Si el usuario es administrador, junto al nombre de la empresa actual aparecera un dropdown que permite seleccionar cualquier otra empresa del sistema.

3. **Cambio de Contexto**: Al seleccionar otra empresa, el contexto de `empresaUsuario.empresa_id` cambiara temporalmente (sin afectar la base de datos), permitiendo ver todos los datos de esa empresa.

4. **Indicador Visual**: Cuando se este visualizando una empresa diferente a la original, se mostrara un badge o indicador para recordar que se esta en "modo administrador".

## Flujo de Usuario

```text
1. Operaciones inicia sesion en /empresa/login
   |
2. Sistema detecta que es admin (user_roles.role = 'admin')
   |
3. En el header, junto a "Portal Empresa / [Nombre Empresa]"
   aparece un icono de dropdown
   |
4. Al hacer clic, se despliega lista de todas las empresas
   |
5. Al seleccionar una empresa, el dashboard y modulos
   muestran los datos de esa empresa
   |
6. Un badge indica: "Viendo como: [Empresa X]"
```

## Cambios Tecnicos

### 1. Modificar Edge Function `empresa-auth/login`
- Agregar logica para verificar si el auth_user_id tiene rol "admin" en tabla `user_roles`
- Si es admin, incluir flag `isStaffAdmin: true` en la respuesta

### 2. Actualizar `EmpresaAuthContext.tsx`
- Agregar estado `isStaffAdmin: boolean`
- Agregar estado `empresaOverride: Empresa | null` para cuando admin ve otra empresa
- Agregar funcion `setEmpresaOverride(empresa)` para cambiar contexto
- Modificar `empresaUsuario` para usar `empresaOverride` cuando exista

### 3. Modificar `EmpresaNavigation.tsx`
- Agregar componente `Select` o `DropdownMenu` junto al nombre de empresa
- Solo visible cuando `isStaffAdmin === true`
- Al cambiar, llamar a `setEmpresaOverride`
- Mostrar badge "Modo Admin" cuando `empresaOverride` este activo

### 4. Cargar lista de empresas
- Consultar todas las empresas activas desde Supabase
- Mostrarlas ordenadas por nombre en el selector

## Consideraciones de Seguridad
- La verificacion de rol admin se hace del lado del servidor (Edge Function)
- El selector solo modifica la vista del frontend, no altera datos reales
- Las operaciones de escritura seguiran usando el `empresa_id` real del usuario (o se pueden bloquear en modo override)

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `supabase/functions/empresa-auth/index.ts` | Agregar verificacion de rol admin |
| `src/contexts/EmpresaAuthContext.tsx` | Estados y funcion para override de empresa |
| `src/components/empresa/EmpresaNavigation.tsx` | Selector visual de empresas |

## Resultado Esperado
Un administrador podra iniciar sesion en el portal de empresa y, desde el header, seleccionar cualquier empresa para ver su dashboard, cotizaciones, estados de pago, y demas datos, facilitando el soporte y solucion de problemas.
