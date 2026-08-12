import { Routes, Route } from "react-router-dom";
import AppShell from "./components/appshell.jsx";
import ProtectedRoute from "./components/protectedroute.jsx";
import SignIn from "./pages/signin.jsx";
import Employee from "./pages/employee.jsx";
import Approving from "./pages/approving.jsx";
import Finance from "./pages/finance.jsx";
import Compliance from "./pages/compliance.jsx";
import Policies from "./pages/policies.jsx";
import Privacy from "./pages/privacy.jsx";
import ClaimDetail from "./pages/claimdetail.jsx";
import NotFound from "./pages/notfound.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SignIn />} />
      <Route path="/compliance" element={<Compliance />} />
      <Route path="/policies" element={<Policies />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route
          path="/employee"
          element={
            <ProtectedRoute role="employee">
              <Employee />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approving"
          element={
            <ProtectedRoute role="approving">
              <Approving />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedRoute role="finance">
              <Finance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/claim/:id"
          element={
            <ProtectedRoute>
              <ClaimDetail />
            </ProtectedRoute>
          }
        />
      </Route>
      {/* Anything else. Without this the router matched nothing and the page
          rendered blank, which reads as a broken app rather than a bad link. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
