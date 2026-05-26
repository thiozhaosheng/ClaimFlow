import { useAuth } from "../context/authcontext.jsx";
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
          </div>
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
