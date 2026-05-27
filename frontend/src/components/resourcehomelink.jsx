import { Link } from "react-router-dom";
import { useAuth } from "../context/authcontext.jsx";

export default function ResourceHomeLink() {
  const { session } = useAuth();
  const to = session ? `/${session.role}` : "/";

  return (
    <Link to={to} className="hover:text-text-primary transition-colors">
      {session ? "Workspace" : "Sign in"}
    </Link>
  );
}
