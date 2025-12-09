import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is admin
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) throw rolesError;

      const userIsAdmin = roles?.some((r) => r.role === "admin") ?? false;
      setIsAdmin(userIsAdmin);

      // If admin, has access to everything
      if (userIsAdmin) {
        setPermissions(["/", "/flujo", "/mi-box", "/pacientes", "/completados", "/empresas", "/boxes", "/examenes", "/usuarios"]);
        setLoading(false);
        return;
      }

      // Load specific permissions for non-admin users
      const { data: perms, error: permsError } = await supabase
        .from("menu_permissions")
        .select("menu_path")
        .eq("user_id", user.id);

      if (permsError) throw permsError;

      setPermissions(perms?.map((p) => p.menu_path) ?? []);
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (path: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(path);
  };

  return { permissions, isAdmin, loading, hasPermission };
};
