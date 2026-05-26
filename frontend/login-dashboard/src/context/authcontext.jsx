import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem("claimflow_session");
    if (saved) {
      setSession(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;

    const publicPaths = ["/", "/index.html"];
    const isPublic = publicPaths.includes(location.pathname);

    if (!session && !isPublic) {
      navigate("/");
    } else if (session && isPublic) {
      navigate(`/${session.currentView}`);
    }
  }, [session, loading, location.pathname, navigate]);

  const signIn = (email) => {
    const lower = email.toLowerCase();
    let role = "employee";
    if (lower.includes("manager") || lower.includes("approving"))
      role = "approving";
    else if (lower.includes("finance") || lower.includes("admin"))
      role = "finance";

    const newSession = {
      email: email,
      role: role,
      currentView: role,
      financeTab: "audit",
    };

    setSession(newSession);
    localStorage.setItem("claimflow_session", JSON.stringify(newSession));
    navigate(`/${role}`);
  };

  const logout = () => {
    localStorage.removeItem("claimflow_session");
    setSession(null);
    navigate("/");
  };

  const switchView = (view) => {
    if (!session) return;
    const updated = { ...session, currentView: view };
    setSession(updated);
    localStorage.setItem("claimflow_session", JSON.stringify(updated));
    navigate(`/${view}`);
  };

  const setFinanceTab = (tab) => {
    if (!session) return;
    const updated = { ...session, financeTab: tab };
    setSession(updated);
    localStorage.setItem("claimflow_session", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{ session, signIn, logout, switchView, setFinanceTab, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
