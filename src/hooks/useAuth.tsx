import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

export const useAuth = () => {
  const { session, user, loading, signOut: contextSignOut } = useAuthContext();
  const navigate = useNavigate();

  const signOut = async () => {
    await contextSignOut();
    navigate("/login");
  };

  return { session, user, loading, signOut };
};
