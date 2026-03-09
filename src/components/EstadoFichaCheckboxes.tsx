import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EstadoFichaCheckboxesProps {
  atencionId: string;
  estadoFicha: string;
  onUpdate?: () => void;
  prefix?: string;
}

const EstadoFichaCheckboxes = ({ atencionId, estadoFicha, onUpdate, prefix = "" }: EstadoFichaCheckboxesProps) => {
  const handleCambiarEstadoFicha = async (nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from("atenciones")
        .update({ estado_ficha: nuevoEstado as 'pendiente' | 'en_mano_paciente' | 'completada' })
        .eq("id", atencionId);

      if (error) throw error;

      const mensajes: Record<string, string> = {
        en_mano_paciente: "Ficha entregada al paciente",
        completada: "Ficha recibida de vuelta",
        pendiente: "Ficha marcada como pendiente",
      };
      toast.success(mensajes[nuevoEstado] || "Estado actualizado");
      onUpdate?.();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar estado de ficha");
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground">Ficha:</span>
      <div className="flex items-center gap-1.5">
        <Checkbox
          id={`${prefix}pendiente-${atencionId}`}
          checked={estadoFicha === "pendiente"}
          onCheckedChange={() => handleCambiarEstadoFicha("pendiente")}
        />
        <Label htmlFor={`${prefix}pendiente-${atencionId}`} className="text-xs cursor-pointer">
          Pendiente
        </Label>
      </div>
      <div className="flex items-center gap-1.5">
        <Checkbox
          id={`${prefix}en_mano-${atencionId}`}
          checked={estadoFicha === "en_mano_paciente"}
          onCheckedChange={() => handleCambiarEstadoFicha("en_mano_paciente")}
        />
        <Label htmlFor={`${prefix}en_mano-${atencionId}`} className="text-xs cursor-pointer">
          Con Paciente
        </Label>
      </div>
      <div className="flex items-center gap-1.5">
        <Checkbox
          id={`${prefix}completada-${atencionId}`}
          checked={estadoFicha === "completada"}
          onCheckedChange={() => handleCambiarEstadoFicha("completada")}
        />
        <Label htmlFor={`${prefix}completada-${atencionId}`} className="text-xs cursor-pointer">
          Recibida
        </Label>
      </div>
    </div>
  );
};

export default EstadoFichaCheckboxes;
