import { Link, useLocation } from "react-router-dom";
import { Activity, Users, Box, ClipboardList, LayoutDashboard, Building2, CheckCircle, AlertCircle, UserCog, LogOut, Moon, Sun, FileText, UserCheck, FileEdit } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { hasPermission } = usePermissions(user);
  const { theme, toggleTheme } = useTheme();

  const allLinks = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/flujo", icon: Activity, label: "Flujo" },
    { to: "/mi-box", icon: Box, label: "Mi Box" },
    { to: "/pacientes", icon: Users, label: "Pacientes" },
    { to: "/completados", icon: CheckCircle, label: "Completados" },
    { to: "/incompletos", icon: AlertCircle, label: "Incompletos" },
    { to: "/empresas", icon: Building2, label: "Empresas" },
    { to: "/boxes", icon: Box, label: "Boxes" },
    { to: "/examenes", icon: ClipboardList, label: "Exámenes" },
    { to: "/cotizaciones", icon: FileText, label: "Cotizaciones" },
    { to: "/prestadores", icon: UserCheck, label: "Prestadores" },
    { to: "/documentos", icon: FileEdit, label: "Documentos" },
    { to: "/usuarios", icon: UserCog, label: "Usuarios" },
  ];

  const links = allLinks.filter((link) => hasPermission(link.to));

  return (
    <nav className="border-b border-border bg-card shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-8 h-16">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-foreground">MediFlow</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="ml-2"
              title={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1 flex-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{link.label}</span>
                </Link>
              );
            })}
          </div>
          
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
