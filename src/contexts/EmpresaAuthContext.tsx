import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

const normalizeEmpresaAuthError = (message: string) => {
  const msg = (message || "").toLowerCase();

  // Errores típicos del SDK al invocar funciones
  if (msg.includes("failed to send a request")) {
    return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.";
  }

  if (msg.includes("non-2xx")) {
    // La función suele devolver un error más específico en response.data.error;
    // si no, damos un mensaje genérico.
    return "No fue posible iniciar sesión. Verifica tus credenciales o que tu usuario esté habilitado.";
  }

  return message || "Error al iniciar sesión";
};

interface Empresa {
  id: string;
  nombre: string;
  rut: string | null;
  razon_social: string | null;
}

interface EmpresaUsuario {
  id: string;
  empresa_id: string;
  auth_user_id: string;
  email: string;
  nombre: string;
  cargo: string | null;
  activo: boolean;
  empresas?: Empresa;
}

interface EmpresaAuthContextType {
  session: Session | null;
  user: User | null;
  empresaUsuario: EmpresaUsuario | null;
  loading: boolean;
  isStaffAdmin: boolean;
  empresaOverride: Empresa | null;
  setEmpresaOverride: (empresa: Empresa | null) => void;
  currentEmpresaId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (data: SignUpData) => Promise<{ error: string | null; success: boolean }>;
  signOut: () => Promise<void>;
  checkEmpresa: (rut: string) => Promise<{ exists: boolean; empresa?: { id: string; nombre: string; rut: string } }>;
}

interface SignUpData {
  email: string;
  password: string;
  nombre: string;
  cargo?: string;
  empresa_rut: string;
}

const EmpresaAuthContext = createContext<EmpresaAuthContextType | undefined>(undefined);

export const EmpresaAuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [empresaUsuario, setEmpresaUsuario] = useState<EmpresaUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStaffAdmin, setIsStaffAdmin] = useState(false);
  const [empresaOverride, setEmpresaOverride] = useState<Empresa | null>(null);
  const initializedRef = useRef(false);

  // Computed: empresa_id actual (override si está activo, o el original)
  const currentEmpresaId = empresaOverride?.id ?? empresaUsuario?.empresa_id ?? null;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Cargar datos del usuario de empresa de forma asíncrona
          setTimeout(() => {
            loadEmpresaUsuario(currentSession.user.id);
          }, 0);
        } else {
          setEmpresaUsuario(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        loadEmpresaUsuario(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadEmpresaUsuario = async (authUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("empresa_usuarios")
        .select("*, empresas(*)")
        .eq("auth_user_id", authUserId)
        .eq("activo", true)
        .limit(1);

      if (error) {
        console.error("Error cargando empresa_usuario:", error);
        setEmpresaUsuario(null);
      } else if (data && data.length > 0) {
        setEmpresaUsuario(data[0] as unknown as EmpresaUsuario);
      } else {
        setEmpresaUsuario(null);
      }
    } catch (err) {
      console.error("Error en loadEmpresaUsuario:", err);
      setEmpresaUsuario(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const response = await supabase.functions.invoke("empresa-auth/login", {
        body: { email, password },
      });

      if (response.error) {
        // A veces viene un body con error más descriptivo
        const maybeDataError = (response.data as any)?.error;
        return { error: normalizeEmpresaAuthError(maybeDataError || response.error.message) };
      }

      if (response.data?.error) {
        return { error: normalizeEmpresaAuthError(response.data.error) };
      }

      if (response.data?.session) {
        await supabase.auth.setSession(response.data.session);
        setEmpresaUsuario(response.data.empresa_usuario);
        setIsStaffAdmin(response.data.isStaffAdmin === true);
      }

      return { error: null };
    } catch (err: any) {
      console.error("Error en signIn:", err);
      return { error: normalizeEmpresaAuthError(err?.message ?? "") };
    }
  };

  const signUp = async (data: SignUpData): Promise<{ error: string | null; success: boolean }> => {
    try {
      const response = await supabase.functions.invoke("empresa-auth/signup", {
        body: data,
      });

      if (response.error) {
        return { error: response.error.message, success: false };
      }

      if (response.data?.error) {
        return { error: response.data.error, success: false };
      }

      return { error: null, success: true };
    } catch (err: any) {
      console.error("Error en signUp:", err);
      return { error: "Error al registrar usuario", success: false };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setEmpresaUsuario(null);
    setIsStaffAdmin(false);
    setEmpresaOverride(null);
  };

  const checkEmpresa = async (rut: string): Promise<{ exists: boolean; empresa?: { id: string; nombre: string; rut: string } }> => {
    try {
      const response = await supabase.functions.invoke("empresa-auth/check-empresa", {
        body: { rut },
      });

      if (response.error) {
        return { exists: false };
      }

      return response.data;
    } catch (err) {
      console.error("Error en checkEmpresa:", err);
      return { exists: false };
    }
  };

  return (
    <EmpresaAuthContext.Provider
      value={{
        session,
        user,
        empresaUsuario,
        loading,
        isStaffAdmin,
        empresaOverride,
        setEmpresaOverride,
        currentEmpresaId,
        signIn,
        signUp,
        signOut,
        checkEmpresa,
      }}
    >
      {children}
    </EmpresaAuthContext.Provider>
  );
};

export const useEmpresaAuth = () => {
  const context = useContext(EmpresaAuthContext);
  if (context === undefined) {
    throw new Error("useEmpresaAuth must be used within an EmpresaAuthProvider");
  }
  return context;
};
