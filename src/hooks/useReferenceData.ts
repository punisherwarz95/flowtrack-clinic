import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STALE_TIME = 1000 * 60 * 5; // 5 minutes
const GC_TIME = 1000 * 60 * 10; // 10 minutes

export interface CachedBox {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean | null;
  box_examenes: Array<{ examen_id: string }>;
}

export interface CachedExamen {
  id: string;
  nombre: string;
  descripcion: string | null;
  codigo: string | null;
}

export interface CachedEmpresa {
  id: string;
  nombre: string;
  rut: string | null;
  razon_social: string | null;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean | null;
  afecto_iva: boolean;
  centro_costo: string | null;
}

export interface CachedPaquete {
  id: string;
  nombre: string;
  descripcion: string | null;
  paquete_examen_items: Array<{ examen_id: string }>;
}

export const useBoxes = () => {
  return useQuery({
    queryKey: ["reference", "boxes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("*, box_examenes(examen_id)")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return (data || []) as CachedBox[];
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useExamenes = () => {
  return useQuery({
    queryKey: ["reference", "examenes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examenes")
        .select("id, nombre, descripcion, codigo")
        .order("nombre");
      if (error) throw error;
      return (data || []) as CachedExamen[];
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useEmpresas = () => {
  return useQuery({
    queryKey: ["reference", "empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("nombre");
      if (error) throw error;
      return (data || []) as CachedEmpresa[];
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const usePaquetes = () => {
  return useQuery({
    queryKey: ["reference", "paquetes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paquetes_examenes")
        .select("*, paquete_examen_items(examen_id)")
        .order("nombre");
      if (error) throw error;
      return (data || []) as CachedPaquete[];
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useBoxExamenesMap = () => {
  return useQuery({
    queryKey: ["reference", "box_examenes_map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("box_examenes")
        .select("examen_id, box_id, boxes(nombre)");
      if (error) throw error;
      const map = new Map<string, { boxId: string; boxNombre: string }>();
      (data || []).forEach((be: any) => {
        map.set(be.examen_id, { boxId: be.box_id, boxNombre: be.boxes?.nombre || "Sin Box" });
      });
      return map;
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const usePrestadorExamenesMap = () => {
  return useQuery({
    queryKey: ["reference", "prestador_examenes_map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prestador_examenes")
        .select("examen_id, prestadores(nombre)");
      if (error) throw error;
      const map = new Map<string, string>();
      (data || []).forEach((pe: any) => {
        map.set(pe.examen_id, pe.prestadores?.nombre || "Sin Prestador");
      });
      return map;
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};
