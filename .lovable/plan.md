

# Plan: Restaurar Login Simple de Staff y Separar Autenticación de Portales

## Diagnóstico del Problema

El login de staff dejó de funcionar porque se agregó lógica compleja que:
1. Usa `usePermissions` en el Login, causando dependencias de carga
2. Cierra sesiones de empresa silenciosamente, lo cual puede interferir con el flujo normal
3. Verifica permisos ANTES de redirigir, pero si hay algún delay o error en `usePermissions`, ejecuta `signOut()`

El usuario `operaciones@mediflow.local` es admin con todos los permisos - el problema NO es de datos sino de lógica de redirección.

## Solución: Simplificar Login de Staff

Restaurar la lógica original simple donde:
1. El Login de staff NO verifica permisos durante el login
2. La verificación de permisos ocurre SOLO en `ProtectedRoute`
3. Si hay sesión activa al cargar Login, redirigir inmediatamente sin verificaciones complejas

## Cambios Requeridos

### 1. Simplificar `src/pages/Login.tsx`

```text
- ELIMINAR: uso de usePermissions hook
- ELIMINAR: lógica de signOut silencioso para usuarios empresa
- ELIMINAR: verificación de permisos en useEffect
- MANTENER: detección simple de usuario autenticado y redirección a "/"
- AGREGAR: si el usuario es de empresa (tipo="empresa"), redirigir a /empresa en vez de cerrar sesión
```

El Login quedará simple:
- Si ya hay usuario autenticado:
  - Si es usuario de empresa: redirigir a `/empresa`
  - Si es usuario de staff: redirigir a `/`
- Si no hay usuario: mostrar formulario de login
- Después de login exitoso: esperar a que AuthContext actualice y redireccione

### 2. Mantener separación en `ProtectedRoute`

El componente ya maneja correctamente:
- Usuarios no autenticados: redirigir a /login
- Usuarios de empresa: redirigir a /empresa
- Usuarios sin permisos: redirigir a /login

No requiere cambios.

### 3. Verificar `AuthContext` y `usePermissions` 

Ya tienen failsafes de 5 segundos - mantener estos timeouts.

## Código Resultante para Login.tsx

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      // Si es usuario de empresa, enviarlo a su portal
      const tipo = (user.user_metadata as any)?.tipo;
      if (tipo === "empresa") {
        navigate("/empresa", { replace: true });
      } else {
        // Usuario de staff: ir al dashboard
        navigate("/", { replace: true });
      }
    }
  }, [authLoading, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const emailToUse = username.includes('@') ? username : `${username}@mediflow.local`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: password,
      });

      if (error) {
        toast("Error al iniciar sesión: " + error.message);
        return;
      }

      if (data.session) {
        toast.success("Inicio de sesión exitoso");
        // Redirección manejada por el useEffect cuando AuthContext actualice
      }
    } catch (error) {
      toast("Error inesperado al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    // ... formulario sin cambios
  );
};
```

## Flujo Resultante

```text
Usuario accede a /login
    |
    v
¿authLoading? --> Sí --> Mostrar spinner (máx 5s por failsafe)
    |
    No
    v
¿Hay usuario? --> Sí --> ¿tipo=empresa? --> Sí --> Redirigir /empresa
    |                         |
    No                        No
    |                         v
    v                    Redirigir /
Mostrar formulario
    |
    v
Usuario ingresa credenciales
    |
    v
Login exitoso --> AuthContext actualiza --> useEffect detecta --> Redirige /
    |
    v
ProtectedRoute en / valida permisos
    |
    v
¿Tiene permiso? --> Sí --> Mostrar Dashboard
         |
         No
         v
    Redirigir /login
```

## Por Qué Esto Funciona

1. **Sin dependencia de usePermissions en Login**: La verificación de permisos solo ocurre en ProtectedRoute, evitando race conditions
2. **Separación clara**: Usuarios de empresa van a /empresa, usuarios de staff van a /
3. **Failsafe mantiene flujo**: Si algo falla, el spinner termina en 5 segundos
4. **Simple y predecible**: Mismo comportamiento que la versión publicada que funciona

