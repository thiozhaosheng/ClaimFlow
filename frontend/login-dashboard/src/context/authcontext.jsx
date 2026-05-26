import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  api,
  ApiError,
  getToken,
  setToken,
  setUnauthorizedHandler,
  mapRoleFromApi,
} from "../utils/api.js";

const AuthContext = createContext(null);
const SESSION_KEY = "claimflow_session";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // restore session on first load: if a token is in localStorage, ask /auth/me
  // to confirm it's still valid and to populate fresh user details.
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const token = getToken();
      if (!token) {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
          // stale session metadata without a token — clear it
          localStorage.removeItem(SESSION_KEY);
        }
        setLoading(false);
        return;
      }
      try {
        const user = await api.get("/api/auth/me");
        if (cancelled) return;
        const newSession = {
          email: user.email,
          name: user.name,
          role: mapRoleFromApi(user.role),
          financeTab: "audit",
        };
        setSession(newSession);
        localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      } catch (err) {
        if (!cancelled) {
          setToken(null);
          localStorage.removeItem(SESSION_KEY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // wire 401 responses to logout + redirect
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      localStorage.removeItem(SESSION_KEY);
      navigate("/");
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  // route guard: bounce unauthenticated users to /, signed-in users away from /
  useEffect(() => {
    if (loading) return;
    const publicPaths = ["/", "/index.html"];
    const isPublic = publicPaths.includes(location.pathname);
    if (!session && !isPublic) {
      navigate("/");
    } else if (session && isPublic) {
      navigate(`/${session.role}`);
    }
  }, [session, loading, location.pathname, navigate]);

  // signIn now calls the real API. Throws ApiError on failure so the signin
  // form can surface a message to the user.
  const signIn = async (email, password) => {
    const result = await api.post("/api/auth/login", { email, password });
    setToken(result.token);
    const newSession = {
      email: result.user.email,
      name: result.user.name,
      role: mapRoleFromApi(result.user.role),
      financeTab: "audit",
    };
    setSession(newSession);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    navigate(`/${newSession.role}`);
    return newSession;
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    navigate("/");
  };

  const setFinanceTab = (tab) => {
    if (!session) return;
    const updated = { ...session, financeTab: tab };
    setSession(updated);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{ session, signIn, logout, setFinanceTab, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// re-export so callers can catch the typed error
export { ApiError };
