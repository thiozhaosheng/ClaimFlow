"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface UserSession {
  email: string;
  name: string;
  role: "Employee" | "Approving Officer" | "Finance Admin";
  department: string;
  avatarUrl: string;
}

interface SessionContextType {
  user: UserSession | null;
  loading: boolean;
  login: (email: string) => void;
  logout: () => void;
  switchRole: (role: "Employee" | "Approving Officer" | "Finance Admin") => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const DEMO_USERS: Record<string, UserSession> = {
  "demo.employee@claimflow.com": {
    email: "demo.employee@claimflow.com",
    name: "Sarah Tan",
    role: "Employee",
    department: "Sales",
    avatarUrl: "/animoji_employee.jpg",
  },
  "demo.manager@claimflow.com": {
    email: "demo.manager@claimflow.com",
    name: "Marcus Lim",
    role: "Approving Officer",
    department: "Sales",
    avatarUrl: "/animoji_approver.jpg",
  },
  "demo.finance@claimflow.com": {
    email: "demo.finance@claimflow.com",
    name: "Dan Yeo",
    role: "Finance Admin",
    department: "Finance",
    avatarUrl: "/animoji_finance.jpg",
  },
};

/**
 * Optional backend. When NEXT_PUBLIC_API_URL is unset (e.g. running the
 * front-end demo standalone) we skip the network call entirely and fall back
 * to the mock session — no failed request, no dev-overlay noise.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

async function backendLogin(
  email: string,
): Promise<{ user: UserSession; token: string } | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "claimflow-demo" }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const roleMapped =
      body.user.role === "Employee"
        ? ("Employee" as const)
        : body.user.role === "Manager"
        ? ("Approving Officer" as const)
        : ("Finance Admin" as const);
    const user: UserSession = {
      email: body.user.email,
      name: body.user.name,
      role: roleMapped,
      department:
        body.user.department ||
        (roleMapped === "Employee" ? "Sales" : roleMapped === "Approving Officer" ? "Operations" : "Finance"),
      avatarUrl:
        body.user.avatarUrl ||
        (roleMapped === "Employee" ? "/animoji_employee.jpg" : roleMapped === "Approving Officer" ? "/animoji_approver.jpg" : "/animoji_finance.jpg"),
    };
    return { user, token: body.token };
  } catch (e) {
    console.warn("Backend login unavailable, using mock session:", e);
    return null;
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("claimflow_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.email && DEMO_USERS[parsed.email]) {
          const matched = DEMO_USERS[parsed.email];
          // Force update local storage if user cache does not match specification
          if (!parsed.avatarUrl || parsed.avatarUrl !== matched.avatarUrl) {
            localStorage.setItem("claimflow_user", JSON.stringify(matched));
          }
          setTimeout(() => {
            setUser(matched);
            setLoading(false);
          }, 0);
        } else {
          setTimeout(() => {
            setUser(parsed);
            setLoading(false);
          }, 0);
        }
      } catch (e) {
        localStorage.removeItem("claimflow_user");
        setTimeout(() => setLoading(false), 0);
      }
    } else {
      const defaultUser = DEMO_USERS["demo.employee@claimflow.com"];
      localStorage.setItem("claimflow_user", JSON.stringify(defaultUser));
      setTimeout(() => {
        setUser(defaultUser);
        setLoading(false);
      }, 0);
    }
  }, []);

  const login = async (email: string) => {
    const backend = await backendLogin(email);
    if (backend) {
      localStorage.setItem("claimflow_token", backend.token);
      localStorage.setItem("claimflow_user", JSON.stringify(backend.user));
      setUser(backend.user);
      return;
    }

    const found = DEMO_USERS[email] || {
      email,
      name: email.split("@")[0].split(".").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" "),
      role: "Employee" as const,
      department: "General",
      avatarUrl: "/animoji_employee.jpg",
    };
    localStorage.removeItem("claimflow_token");
    localStorage.setItem("claimflow_user", JSON.stringify(found));
    setUser(found);
  };

  const logout = () => {
    localStorage.removeItem("claimflow_user");
    localStorage.removeItem("claimflow_token");
    setUser(null);
    router.push("/login");
  };

  const switchRole = async (role: "Employee" | "Approving Officer" | "Finance Admin") => {
    let targetEmail = "demo.employee@claimflow.com";
    if (role === "Approving Officer") targetEmail = "demo.manager@claimflow.com";
    else if (role === "Finance Admin") targetEmail = "demo.finance@claimflow.com";

    const backend = await backendLogin(targetEmail);
    if (backend) {
      localStorage.setItem("claimflow_token", backend.token);
      localStorage.setItem("claimflow_user", JSON.stringify(backend.user));
      setUser(backend.user);
      return;
    }

    const targetUser = DEMO_USERS[targetEmail];
    localStorage.removeItem("claimflow_token");
    localStorage.setItem("claimflow_user", JSON.stringify(targetUser));
    setUser(targetUser);
  };

  return (
    <SessionContext.Provider value={{ user, loading, login, logout, switchRole }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
