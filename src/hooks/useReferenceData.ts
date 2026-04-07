import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { localDb } from "@/lib/localDb";

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

export interface CachedFaena {
  id: string;
  nombre: string;
  direccion: string | null;
  empresa_id: string | null;
  activo: boolean | null;
}

export interface CachedBateriaFaena {
  id: string;
  paquete_id: string;
  faena_id: string;
  activo: boolean | null;
}

export interface CachedEmpresaFaena {
  id: string;
  empresa_id: string;
  faena_id: string;
  activo: boolean | null;
}

export interface CachedFaenaExamen {
  id: string;
  faena_id: string;
  examen_id: string;
  valor_venta: number;
  activo: boolean | null;
}

export interface CachedDocumentoFormulario {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: string;
  activo: boolean;
}

// ── Helper: get initial data from IndexedDB ─────────────────────────────
async function getLocalBoxes(): Promise<CachedBox[] | undefined> {
  try {
    const boxes = await localDb.boxes.toArray();
    if (boxes.length === 0) return undefined;
    const boxExamenes = await localDb.boxExamenes.toArray();
    return boxes.map(b => ({
      ...b,
      box_examenes: boxExamenes.filter(be => be.box_id === b.id).map(be => ({ examen_id: be.examen_id })),
    }));
  } catch { return undefined; }
}

async function getLocalExamenes(): Promise<CachedExamen[] | undefined> {
  try {
    const data = await localDb.examenes.toArray();
    return data.length > 0 ? data : undefined;
  } catch { return undefined; }
}

async function getLocalEmpresas(): Promise<CachedEmpresa[] | undefined> {
  try {
    const data = await localDb.empresas.toArray();
    return data.length > 0 ? (data as CachedEmpresa[]) : undefined;
  } catch { return undefined; }
}

async function getLocalPaquetes(): Promise<CachedPaquete[] | undefined> {
  try {
    const paquetes = await localDb.paquetes.toArray();
    if (paquetes.length === 0) return undefined;
    const items = await localDb.paqueteExamenItems.toArray();
    return paquetes.map(p => ({
      ...p,
      paquete_examen_items: items.filter(i => i.paquete_id === p.id).map(i => ({ examen_id: i.examen_id })),
    }));
  } catch { return undefined; }
}

async function getLocalFaenas(): Promise<CachedFaena[] | undefined> {
  try {
    const data = await localDb.faenas.toArray();
    return data.length > 0 ? data : undefined;
  } catch { return undefined; }
}

async function getLocalBateriaFaenas(): Promise<CachedBateriaFaena[] | undefined> {
  try {
    const data = await localDb.bateriaFaenas.toArray();
    return data.length > 0 ? data : undefined;
  } catch { return undefined; }
}

// ── Hooks ───────────────────────────────────────────────────────────────

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
    initialDataUpdatedAt: 0,
    initialData: undefined,
    placeholderData: () => {
      // Sync initial data from IndexedDB (non-blocking)
      return undefined;
    },
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

export const useFaenas = () => {
  return useQuery({
    queryKey: ["reference", "faenas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faenas")
        .select("id, nombre, direccion, empresa_id, activo")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return (data || []) as CachedFaena[];
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
};

export const useBateriaFaenas = () => {
  return useQuery({
    queryKey: ["reference", "bateria_faenas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bateria_faenas")
        .select("id, paquete_id, faena_id, activo")
        .eq("activo", true);
      if (error) throw error;
      return (data || []) as CachedBateriaFaena[];
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
