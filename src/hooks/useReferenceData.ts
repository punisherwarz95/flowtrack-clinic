import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Boxes (con box_examenes) ───────────────────────────────────────────
export const useBoxes = () =>
  useQuery({
    queryKey: ["boxes-activos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("*, box_examenes(examen_id)")
        .eq("activo", true);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000, // 10 min — rara vez cambian
  });

// ─── Examenes ───────────────────────────────────────────────────────────
export const useExamenes = () =>
  useQuery({
    queryKey: ["examenes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examenes")
        .select("*")
        .order("nombre", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

// ─── Empresas ───────────────────────────────────────────────────────────
export const useEmpresas = () =>
  useQuery({
    queryKey: ["empresas-activas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

// ─── Paquetes con items ─────────────────────────────────────────────────
export const usePaquetes = () =>
  useQuery({
    queryKey: ["paquetes-examenes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paquetes_examenes")
        .select("*, paquete_examen_items(examen_id)")
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

// ─── Faenas activas ─────────────────────────────────────────────────────
export const useFaenas = () =>
  useQuery({
    queryKey: ["faenas-activas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faenas")
        .select("id, nombre, direccion")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

// ─── Box-Examenes map (examen_id → boxInfo) ────────────────────────────
export const useBoxExamenesMap = () => {
  const { data: boxes } = useBoxes();

  return useQuery({
    queryKey: ["box-examenes-map", boxes?.length],
    queryFn: async () => {
      const map = new Map<string, { boxId: string; boxNombre: string }>();
      if (!boxes) return map;
      for (const box of boxes) {
        for (const be of (box as any).box_examenes || []) {
          map.set(be.examen_id, { boxId: box.id, boxNombre: box.nombre });
        }
      }
      return map;
    },
    enabled: !!boxes,
    staleTime: 10 * 60 * 1000,
  });
};

// ─── Documentos formularios ─────────────────────────────────────────────
export const useDocumentosFormularios = () =>
  useQuery({
    queryKey: ["documentos-formularios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_formularios")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

// ─── Bateria faenas map ─────────────────────────────────────────────────
export const useBateriaFaenasMap = () =>
  useQuery({
    queryKey: ["bateria-faenas-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bateria_faenas")
        .select("paquete_id, faena_id")
        .eq("activo", true);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data || []).forEach((bf) => {
        if (!map[bf.paquete_id]) map[bf.paquete_id] = [];
        map[bf.paquete_id].push(bf.faena_id);
      });
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });
