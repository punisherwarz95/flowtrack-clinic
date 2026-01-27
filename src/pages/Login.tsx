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
import { usePermissions } from "@/hooks/usePermissions";

const STAFF_ROUTE_CANDIDATES = [
  "/",
  "/flujo",
  "/mi-box",
  "/pacientes",
  "/completados",
  "/incompletos",
  "/empresas",
  "/boxes",
  "/examenes",
  "/cotizaciones",
  "/prestadores",
  "/documentos",
  "/usuarios",
];

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuthContext();
  const { hasPermission, loading: permLoading } = usePermissions(user);

  const isEmpresaUser = (u: typeof user) => {
    const tipo = (u?.user_metadata as any)?.tipo;
    return tipo === "empresa";
  };

  // Redirect if already logged in - use useEffect to avoid render-time navigation
  useEffect(() => {
    if (authLoading || permLoading) return;

    if (user) {
      // Si el usuario pertenece al Portal Empresas, enviarlo a su portal.
      if (isEmpresaUser(user)) {
        navigate("/empresa", { replace: true });
        return;
      }

      const nextPath = STAFF_ROUTE_CANDIDATES.find((p) => hasPermission(p)) ?? null;

      if (nextPath) {
        navigate(nextPath, { replace: true });
      } else {
        // Evita loop infinito /login -> / -> /login cuando el usuario no tiene permisos
        toast("Tu usuario no tiene permisos asignados. Contacta a un administrador.");
        void signOut();
      }
    }
  }, [authLoading, permLoading, user, hasPermission, navigate, signOut]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert username to email format if it doesn't contain @
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
        // No navegamos aquí: esperamos a que el AuthContext reciba la sesión
        // y el useEffect de arriba haga la redirección.
      }
    } catch (error) {
      toast("Error inesperado al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl text-foreground">MediFlow</span>
          </div>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate("/portal-paciente")}
            >
              Portal Paciente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
