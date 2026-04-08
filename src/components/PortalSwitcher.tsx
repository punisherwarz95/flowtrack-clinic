import { Building2, Users, Stethoscope, ArrowRightLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface PortalSwitcherProps {
  currentPortal: "staff" | "empresa" | "paciente";
}

const portals = [
  { key: "staff", label: "Portal Staff", path: "/", icon: Stethoscope },
  { key: "empresa", label: "Portal Empresa", path: "/empresa", icon: Building2 },
  { key: "paciente", label: "Portal Paciente", path: "/portal-paciente", icon: Users },
] as const;

const PortalSwitcher = ({ currentPortal }: PortalSwitcherProps) => {
  const current = portals.find((p) => p.key === currentPortal);

  const navigateTo = (path: string) => {
    // Full page navigation to reset context providers between portals
    window.location.href = path;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ArrowRightLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{current?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {portals.map((portal) => {
          const Icon = portal.icon;
          const isActive = portal.key === currentPortal;
          return (
            <DropdownMenuItem
              key={portal.key}
              disabled={isActive}
              className={isActive ? "font-bold text-primary" : "cursor-pointer"}
              onClick={() => !isActive && navigateTo(portal.path)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {portal.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PortalSwitcher;
