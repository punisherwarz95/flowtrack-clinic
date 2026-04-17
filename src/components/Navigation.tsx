import { Link, useLocation } from "react-router-dom";
import { Activity, Users, Box, ClipboardList, LayoutDashboard, Building2, CheckCircle, AlertCircle, UserCog, LogOut, Moon, Sun, FileText, UserCheck, FileEdit, Settings, Monitor, ScrollText, Stethoscope, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import ChangeOwnPassword from "@/components/ChangeOwnPassword";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import { useSyncContext } from "@/contexts/SyncContext";
import { logActivity } from "@/lib/activityLog";
import PortalSwitcher from "@/components/PortalSwitcher";

const Navigation = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { hasPermission, isAdmin } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const syncCtx = useSyncContext();

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
    { to: "/configuracion", icon: Settings, label: "Configuración" },
    { to: "/actividad", icon: ScrollText, label: "Actividad" },
    { to: "/evaluacion-medica", icon: Stethoscope, label: "Evaluación Médica" },
    { to: "/estados-pago", icon: CreditCard, label: "Estados de Pago" },
    { to: "/pantalla", icon: Monitor, label: "Pantalla TV" },
  ];

  const links = allLinks.filter((link) => hasPermission(link.to));

  return (
    <nav className="border-b border-border bg-card shadow-sm">
      <div className="container mx-auto px-3">
        <div className="flex items-start gap-3 py-2">
          {/* Columna izquierda: logo arriba, theme toggle debajo */}
          <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
            <div className="flex items-center gap-1.5">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-bold text-base text-foreground leading-none">MediFlow</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-7 w-7"
              title={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Menú central: se auto-ajusta libremente */}
          <div className="flex flex-wrap gap-1 flex-1 min-w-0 content-start">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors text-sm whitespace-nowrap ${
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Columna derecha: usuario arriba, cerrar sesión, badge de sync abajo */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1.5">
              {isAdmin && <PortalSwitcher currentPortal="staff" />}
              <span className="text-xs font-medium text-foreground bg-muted px-2 py-1 rounded-md max-w-[140px] truncate">
                {user?.email?.replace("@mediflow.local", "") ?? ""}
              </span>
              <ChangeOwnPassword />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={async () => { await logActivity("logout", {}, location.pathname); signOut(); }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Cerrar Sesión
            </Button>
            <SyncStatusBadge syncState={syncCtx} onForceSync={syncCtx.forcePush} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
