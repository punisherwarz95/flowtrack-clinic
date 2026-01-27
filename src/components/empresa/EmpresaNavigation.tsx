import { Link, useLocation } from "react-router-dom";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  CreditCard,
  Package,
  ClipboardCheck,
  LogOut,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { path: "/empresa", label: "Dashboard", icon: LayoutDashboard },
  { path: "/empresa/agendamiento", label: "Agendamiento", icon: Calendar },
  { path: "/empresa/pacientes", label: "Pacientes Atendidos", icon: Users },
  { path: "/empresa/cotizaciones", label: "Cotizaciones", icon: FileText },
  { path: "/empresa/estados-pago", label: "Estados de Pago", icon: CreditCard },
  { path: "/empresa/baterias", label: "Baterías", icon: Package },
  { path: "/empresa/resultados", label: "Resultados", icon: ClipboardCheck },
];

const EmpresaNavigation = () => {
  const location = useLocation();
  const { empresaUsuario, signOut } = useEmpresaAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo y nombre de empresa */}
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold text-lg leading-tight">Portal Empresa</h1>
              {empresaUsuario?.empresas && (
                <p className="text-xs text-muted-foreground">
                  {empresaUsuario.empresas.nombre}
                </p>
              )}
            </div>
          </div>

          {/* Navegación */}
          <nav className="hidden md:flex items-center gap-1 flex-wrap">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Usuario y logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium">{empresaUsuario?.nombre}</p>
              <p className="text-xs text-muted-foreground">{empresaUsuario?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navegación móvil */}
        <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-1 whitespace-nowrap",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default EmpresaNavigation;
