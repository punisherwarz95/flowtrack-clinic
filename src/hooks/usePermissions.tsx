import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const usePermissions = (user: User | null = null) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPermissions(user.id);
    } else {
      setPermissions([]);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user?.id]);

  const loadPermissions = async (userId: string) => {
    let finished = false;
    const failsafe = window.setTimeout(() => {
      if (finished) return;
      console.warn("[Permissions] Failsafe: permissions loading timeout, forcing loading=false");
      setLoading(false);
    }, 5000);

    try {
      setLoading(true);
      
      // Check if user is admin
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) throw rolesError;

      const userIsAdmin = roles?.some((r) => r.role === "admin") ?? false;
      setIsAdmin(userIsAdmin);

      // If admin, load all active module paths
      if (userIsAdmin) {
        const { data: modulos } = await supabase
          .from("modulos")
          .select("path")
          .eq("activo", true);
        
        setPermissions(modulos?.map((m) => m.path) ?? []);
        setLoading(false);
        return;
      }

      // Load specific permissions for non-admin users
      const { data: perms, error: permsError } = await supabase
        .from("menu_permissions")
        .select("menu_path")
        .eq("user_id", userId);

      if (permsError) throw permsError;

      setPermissions(perms?.map((p) => p.menu_path) ?? []);
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      finished = true;
      window.clearTimeout(failsafe);
      setLoading(false);
    }
  };

  const hasPermission = (path: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(path);
  };

  return { permissions, isAdmin, loading, hasPermission };
};
