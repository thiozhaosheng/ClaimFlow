import { useAuth } from "../context/authcontext.jsx";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" role="status" aria-label="Loading"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (role && session.role !== role) {
    return <Navigate to={`/${session.role}`} replace />;
  }

  return children;
}
