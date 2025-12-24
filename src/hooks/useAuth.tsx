import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle token refresh failures - clear invalid tokens
        if (event === 'TOKEN_REFRESHED' && !session) {
          localStorage.removeItem('sb-szqnsuxmbvxxdzlbdglz-auth-token');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Clear corrupted/expired tokens
        localStorage.removeItem('sb-szqnsuxmbvxxdzlbdglz-auth-token');
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Limpiar box seleccionado al cerrar sesión
    localStorage.removeItem("mediflow_selected_box");
    await supabase.auth.signOut();
    navigate("/login");
  };

  return { session, user, loading, signOut };
};
