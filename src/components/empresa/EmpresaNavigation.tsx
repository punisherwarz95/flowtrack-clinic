import { useEffect, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import EmpresaSelector from "./EmpresaSelector";
import PortalSwitcher from "@/components/PortalSwitcher";
import { supabase } from "@/integrations/supabase/client";

const ICONS: Record<string, any> = {
  dashboard: LayoutDashboard,
  agendamiento: Calendar,
  pacientes: Users,
  cotizaciones: FileText,
  "estados-pago": CreditCard,
  baterias: Package,
  resultados: ClipboardCheck,
};

interface ModuloItem {
  modulo_key: string;
  label: string;
  path: string;
  icon: any;
}

const EmpresaNavigation = () => {
  const location = useLocation();
  const { empresaUsuario, signOut, isStaffAdmin, empresaOverride } = useEmpresaAuth();
  const [menuItems, setMenuItems] = useState<ModuloItem[]>([]);

  useEffect(() => {
    const loadModulos = async () => {
      const { data } = await supabase
        .from("empresa_modulos_config")
        .select("modulo_key, label, path, activo")
        .eq("activo", true)
        .order("orden");
      setMenuItems(
        (data || []).map((m: any) => ({
          modulo_key: m.modulo_key,
          label: m.label,
          path: m.path,
          icon: ICONS[m.modulo_key] ?? LayoutDashboard,
        }))
      );
    };
    loadModulos();
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  // Nombre de empresa a mostrar (override si está activo)
  const currentEmpresaNombre = empresaOverride?.nombre ?? empresaUsuario?.empresas?.nombre;

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo y selector de empresa (para admins) o nombre de empresa */}
          <div className="flex items-center gap-3">
            {isStaffAdmin ? (
              <EmpresaSelector />
            ) : (
              <>
                <div>
                  <h1 className="font-semibold text-lg leading-tight">Portal Empresa</h1>
                  {currentEmpresaNombre && (
                    <p className="text-xs text-muted-foreground">
                      {currentEmpresaNombre}
                    </p>
                  )}
                </div>
              </>
            )}
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
            {isStaffAdmin && <PortalSwitcher currentPortal="empresa" />}
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
