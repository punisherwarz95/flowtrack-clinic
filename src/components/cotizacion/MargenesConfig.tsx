import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Margen {
  id: string;
  nombre: string;
  porcentaje: number;
  orden: number;
}

interface MargenesConfigProps {
  onClose: () => void;
}

const MargenesConfig = ({ onClose }: MargenesConfigProps) => {
  const [margenes, setMargenes] = useState<Margen[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMargenes();
  }, []);

  const loadMargenes = async () => {
    try {
      const { data, error } = await supabase
        .from("margenes_cotizacion")
        .select("*")
        .order("orden");

      if (error) throw error;
      setMargenes(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar márgenes");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id: string, field: "nombre" | "porcentaje", value: string) => {
    setMargenes((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, [field]: field === "porcentaje" ? parseFloat(value) || 0 : value }
          : m
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const margen of margenes) {
        const { error } = await supabase
          .from("margenes_cotizacion")
          .update({
            nombre: margen.nombre,
            porcentaje: margen.porcentaje,
          })
          .eq("id", margen.id);

        if (error) throw error;
      }

      toast.success("Márgenes actualizados exitosamente");
      onClose();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar márgenes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Configure los márgenes disponibles para aplicar a los ítems de cotización.
      </p>

      <div className="space-y-4">
        {margenes.map((margen, index) => (
          <div key={margen.id} className="flex items-end gap-4 p-4 border rounded-lg">
            <div className="flex-1">
              <Label htmlFor={`nombre-${margen.id}`}>Nombre del Margen</Label>
              <Input
                id={`nombre-${margen.id}`}
                value={margen.nombre}
                onChange={(e) => handleChange(margen.id, "nombre", e.target.value)}
                placeholder={`Margen ${index + 1}`}
              />
            </div>
            <div className="w-32">
              <Label htmlFor={`porcentaje-${margen.id}`}>Porcentaje</Label>
              <div className="relative">
                <Input
                  id={`porcentaje-${margen.id}`}
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={margen.porcentaje}
                  onChange={(e) => handleChange(margen.id, "porcentaje", e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  );
};

export default MargenesConfig;
