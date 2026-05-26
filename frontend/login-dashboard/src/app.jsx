import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/layout.jsx";
import ProtectedRoute from "./components/protectedroute.jsx";
import SignIn from "./pages/signin.jsx";
import Employee from "./pages/employee.jsx";
import Approving from "./pages/approving.jsx";
import Finance from "./pages/finance.jsx";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    if (window.AOS) {
      window.AOS.init({
        disable: "phone",
        duration: 800,
        once: true,
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
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/employee" element={<Employee />} />
        <Route path="/approving" element={<Approving />} />
        <Route path="/finance" element={<Finance />} />
      </Route>
    </Routes>
  );
}
