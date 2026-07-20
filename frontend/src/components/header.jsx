import { useAuth } from "../context/authcontext.jsx";
import { useTheme } from "../hooks/usetheme.js";
import Logo from "./logo.jsx";

const ROLE_LABELS = {
  employee: "Employee",
  approving: "Approving Officer",
  finance: "Finance Admin",
};

function deriveName(email) {
  if (!email) return "";
  const local = email.split("@")[0];
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function Header() {
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!session) return null;

  const name = deriveName(session.email);
  const initials = (name.match(/\b\w/g) || ["U"]).slice(0, 2).join("").toUpperCase();
  const roleLabel = ROLE_LABELS[session.role] || "Member";

  return (
    <header id="app-header">
      <div className="header-container">
        <div className="brand-meta">
          <Logo size={30} />
          <h1 className="brand-title">ClaimFlow</h1>
        </div>

        <div className="user-identity">
          <div className="user-identity-text">
            <span className="user-identity-name">{name}</span>
            <span className="user-identity-role">{roleLabel}</span>
          </div>
          <div className="user-identity-avatar" aria-hidden="true">
            {initials}
            <span className="user-identity-presence" aria-hidden="true"></span>
          </div>
          <button
            className="btn-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}`}></i>
          </button>
          <button
            className="btn-logout"
            onClick={logout}
            aria-label="Sign out"
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
