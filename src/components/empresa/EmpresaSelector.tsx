import { useEffect, useState } from "react";
import { useEmpresaAuth } from "@/contexts/EmpresaAuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Empresa {
  id: string;
  nombre: string;
  rut: string | null;
  razon_social: string | null;
}

const EmpresaSelector = () => {
  const { isStaffAdmin, empresaUsuario, empresaOverride, setEmpresaOverride, currentEmpresaId } = useEmpresaAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isStaffAdmin) {
      loadEmpresas();
    }
  }, [isStaffAdmin]);

  const loadEmpresas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nombre, rut, razon_social")
        .eq("activo", true)
        .order("nombre");

      if (!error && data) {
        setEmpresas(data);
      }
    } catch (err) {
      console.error("Error cargando empresas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmpresaChange = (empresaId: string) => {
    if (empresaId === "__original__") {
      setEmpresaOverride(null);
      return;
    }
    
    const empresa = empresas.find((e) => e.id === empresaId);
    if (empresa) {
      setEmpresaOverride(empresa);
    }
  };

  const clearOverride = () => {
    setEmpresaOverride(null);
  };

  if (!isStaffAdmin) {
    return null;
  }

  const currentEmpresaNombre = empresaOverride?.nombre ?? empresaUsuario?.empresas?.nombre ?? "Empresa";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Select
              value={currentEmpresaId ?? undefined}
              onValueChange={handleEmpresaChange}
              disabled={loading}
            >
              <SelectTrigger className="h-8 w-[200px] border-dashed">
                <SelectValue placeholder="Seleccionar empresa">
                  <span className="font-medium text-sm truncate">
                    {currentEmpresaNombre}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px] bg-popover z-50">
                {empresaUsuario?.empresas && (
                  <SelectItem value="__original__" className="font-medium">
                    {empresaUsuario.empresas.nombre} (Mi empresa)
                  </SelectItem>
                )}
                {empresas
                  .filter((e) => e.id !== empresaUsuario?.empresa_id)
                  .map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      <div className="flex flex-col">
                        <span>{empresa.nombre}</span>
                        {empresa.rut && (
                          <span className="text-xs text-muted-foreground">
                            {empresa.rut}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {empresaOverride && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={clearOverride}
                title="Volver a mi empresa"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {empresaOverride && (
            <Badge variant="secondary" className="text-xs mt-1 bg-secondary text-secondary-foreground">
              Modo Admin: Viendo como {empresaOverride.nombre}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmpresaSelector;
