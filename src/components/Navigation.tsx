import { Link, useLocation } from "react-router-dom";
import { Activity, Users, Box, ClipboardList, LayoutDashboard, Building2 } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/flujo", icon: Activity, label: "Flujo" },
    { to: "/pacientes", icon: Users, label: "Pacientes" },
    { to: "/empresas", icon: Building2, label: "Empresas" },
    { to: "/boxes", icon: Box, label: "Boxes" },
    { to: "/examenes", icon: ClipboardList, label: "Exámenes" },
  ];

  return (
    <nav className="border-b border-border bg-card shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-8 h-16">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-foreground">MediFlow</span>
          </div>
          
          <div className="flex gap-1">
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
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
