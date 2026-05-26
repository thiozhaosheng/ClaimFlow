import { useAuth } from "../context/authcontext.jsx";
import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const { session, logout, switchView } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header id="app-header">
      <div className="header-container">
        <div className="brand-meta">
          <div className="logo-box">
            <i className="fa-solid fa-building-columns text-white fs-5"></i>
          </div>
          <div>
            <h1 className="brand-title">ClaimFlow Portal</h1>
            <p className="user-meta">
              Logged in as: <span>{session?.email || "..."}</span>
            </p>
          </div>
        </div>

        <div className="nav-actions">
          <div className="role-switcher-group btn-group" role="group">
            <Link
              to="/employee"
              onClick={() => switchView("employee")}
              className={`btn btn-nav text-nowrap ${isActive("/employee") ? "active" : ""}`}
            >
              <i className="fa-solid fa-user-tie me-2"></i>Employee
            </Link>
            <Link
              to="/approving"
              onClick={() => switchView("approving")}
              className={`btn btn-nav text-nowrap ${isActive("/approving") ? "active" : ""}`}
            >
              <i className="fa-solid fa-user-check me-2"></i>Approving Officer
            </Link>
            <Link
              to="/finance"
              onClick={() => switchView("finance")}
              className={`btn btn-nav text-nowrap ${isActive("/finance") ? "active" : ""}`}
            >
              <i className="fa-solid fa-wallet me-2"></i>Finance
            </Link>
          </div>
          <button className="btn btn-logout ms-2 text-nowrap" onClick={logout}>
            <i className="fa-solid fa-right-from-bracket me-2"></i>Logout
          </button>
        </div>
      </div>
    </header>
  );
}
