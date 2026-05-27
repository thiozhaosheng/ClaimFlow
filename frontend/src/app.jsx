import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppShell from "./components/appshell.jsx";
import ProtectedRoute from "./components/protectedroute.jsx";
import SignIn from "./pages/signin.jsx";
import Employee from "./pages/employee.jsx";
import Approving from "./pages/approving.jsx";
import Finance from "./pages/finance.jsx";
import Compliance from "./pages/compliance.jsx";
import Policies from "./pages/policies.jsx";
import Privacy from "./pages/privacy.jsx";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    if (window.AOS) {
      window.AOS.init({
        disable: "phone",
        duration: 600,
        once: true,
        easing: "ease-out-cubic",
      });
    }
  }, []);

  useEffect(() => {
    if (window.AOS) {
      window.AOS.refreshHard();
    }
  }, [location.pathname]);

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
      </Route>
    </Routes>
  );
}
