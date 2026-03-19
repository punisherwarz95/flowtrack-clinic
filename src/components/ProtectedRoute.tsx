import { Navigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  path: string;
}

const ProtectedRoute = ({ children, path }: ProtectedRouteProps) => {
  const { user, loading: authLoading, hasPermission, permissionsLoading } = useAuthContext();

  const userTipo = (user?.user_metadata as any)?.tipo;

  if (authLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userTipo === "empresa") {
    return <Navigate to="/empresa" replace />;
  }

  if (!hasPermission(path)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
