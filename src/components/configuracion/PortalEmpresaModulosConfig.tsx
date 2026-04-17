import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activityLog";

interface ModuloEmpresa {
  id: string;
  modulo_key: string;
  label: string;
  path: string;
  activo: boolean;
  orden: number;
}

const PortalEmpresaModulosConfig = () => {
  const [modulos, setModulos] = useState<ModuloEmpresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("empresa_modulos_config")
        .select("*")
        .order("orden");
      if (error) throw error;
      setModulos((data || []) as ModuloEmpresa[]);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar módulos");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (mod: ModuloEmpresa) => {
    const nuevo = !mod.activo;
    setModulos((prev) => prev.map((m) => (m.id === mod.id ? { ...m, activo: nuevo } : m)));
    try {
      const { error } = await supabase
        .from("empresa_modulos_config")
        .update({ activo: nuevo })
        .eq("id", mod.id);
      if (error) throw error;
      toast.success(`${mod.label} ${nuevo ? "activado" : "desactivado"}`);
      logActivity(
        "toggle_modulo_empresa",
        { modulo: mod.modulo_key, activo: nuevo },
        "/configuracion"
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Error al actualizar módulo");
      setModulos((prev) => prev.map((m) => (m.id === mod.id ? { ...m, activo: !nuevo } : m)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Módulos del Portal Empresa
        </CardTitle>
        <CardDescription>
          Activa o desactiva qué secciones se muestran a los usuarios del Portal Empresa.
          Los módulos desactivados quedan ocultos del menú.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {modulos.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{mod.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">{mod.path}</span>
                </div>
                <Switch checked={mod.activo} onCheckedChange={() => handleToggle(mod)} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PortalEmpresaModulosConfig;
