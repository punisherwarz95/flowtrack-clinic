import { Navigate } from "react-router-dom";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";

interface EmpresaProtectedRouteProps {
  children: React.ReactNode;
}

const EmpresaProtectedRoute = ({ children }: EmpresaProtectedRouteProps) => {
  const { user, empresaUsuario, loading } = useEmpresaAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No hay usuario autenticado
  if (!user) {
    return <Navigate to="/empresa/login" replace />;
  }

  // Usuario autenticado pero no es usuario de empresa
  if (!empresaUsuario) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default EmpresaProtectedRoute;
