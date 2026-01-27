import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;

    // Failsafe: nunca quedarnos pegados en loading por un getSession colgado
    const loadingFailsafe = window.setTimeout(() => {
      if (!isMounted) return;
      console.warn("[Auth] Failsafe: auth loading timeout, forcing loading=false");
      setLoading(false);
    }, 5000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!isMounted) return;
        // Only update state synchronously, no async calls here
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session once
    const getSessionWithTimeout = async () => {
      try {
        const timeoutMs = 4000;
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

  const signOut = async () => {
    // Limpiar box seleccionado al cerrar sesión
    localStorage.removeItem("mediflow_selected_box");
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
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
