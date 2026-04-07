import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  permissions: string[];
  isAdmin: boolean;
  permissionsLoading: boolean;
  hasPermission: (path: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PERMS_CACHE_KEY = "mediflow_perms_cache";

const loadCachedPermissions = (userId: string): { permissions: string[]; isAdmin: boolean } | null => {
  try {
    const raw = sessionStorage.getItem(PERMS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.userId === userId) return { permissions: cached.permissions, isAdmin: cached.isAdmin };
  } catch { /* ignore */ }
  return null;
};

const saveCachedPermissions = (userId: string, permissions: string[], isAdmin: boolean) => {
  try {
    sessionStorage.setItem(PERMS_CACHE_KEY, JSON.stringify({ userId, permissions, isAdmin }));
  } catch { /* ignore */ }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const permsFetchRef = useRef<string | null>(null);

  // Load permissions for a user
  const loadPermissions = async (userId: string) => {
    // Avoid duplicate fetches for same user
    if (permsFetchRef.current === userId) return;
    permsFetchRef.current = userId;

    // Try cache first for instant display
    const cached = loadCachedPermissions(userId);
    if (cached) {
      setPermissions(cached.permissions);
      setIsAdmin(cached.isAdmin);
      setPermissionsLoading(false);
    }

    let finished = false;
    const failsafe = window.setTimeout(() => {
      if (finished) return;
      console.warn("[Permissions] Failsafe: timeout, forcing loading=false");
      setPermissionsLoading(false);
    }, 8000);

    try {
      if (!cached) setPermissionsLoading(true);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const userIsAdmin = roles?.some((r) => r.role === "admin") ?? false;
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        const { data: modulos } = await supabase
          .from("modulos")
          .select("path")
          .eq("activo", true);
        const perms = modulos?.map((m) => m.path) ?? [];
        setPermissions(perms);
        saveCachedPermissions(userId, perms, true);
      } else {
        const { data: perms } = await supabase
          .from("menu_permissions")
          .select("menu_path")
          .eq("user_id", userId);
        const permPaths = perms?.map((p) => p.menu_path) ?? [];
        setPermissions(permPaths);
        saveCachedPermissions(userId, permPaths, false);
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      finished = true;
      window.clearTimeout(failsafe);
      setPermissionsLoading(false);
    }
  };

  const clearPermissions = () => {
    setPermissions([]);
    setIsAdmin(false);
    setPermissionsLoading(false);
    permsFetchRef.current = null;
    try { sessionStorage.removeItem(PERMS_CACHE_KEY); } catch { /* ignore */ }
  };

  useEffect(() => {
    let isMounted = true;

    const loadingFailsafe = window.setTimeout(() => {
      if (!isMounted) return;
      console.warn("[Auth] Failsafe: auth loading timeout, forcing loading=false");
      setLoading(false);
      setPermissionsLoading(false);
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        if (currentSession?.user) {
          // Defer to avoid Supabase deadlock
          setTimeout(() => {
            if (isMounted) loadPermissions(currentSession.user.id);
          }, 0);
        } else {
          clearPermissions();
        }
      }
    );

    const getSessionWithTimeout = async () => {
      try {
        const timeoutMs = 7000;
        const timeoutPromise = new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), timeoutMs);
        });

        const sessionPromise = supabase.auth
          .getSession()
          .then(({ data: { session: currentSession } }) => currentSession);

        const currentSession = (await Promise.race([
          sessionPromise,
          timeoutPromise,
        ])) as Session | null;

        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          loadPermissions(currentSession.user.id);
        } else {
          clearPermissions();
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void getSessionWithTimeout();

    return () => {
      isMounted = false;
      window.clearTimeout(loadingFailsafe);
      subscription.unsubscribe();
    };
  }, []);

  const hasPermission = (path: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(path);
  };

  const signOut = async () => {
    localStorage.removeItem("mediflow_selected_box");
    clearPermissions();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, permissions, isAdmin, permissionsLoading, hasPermission, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
