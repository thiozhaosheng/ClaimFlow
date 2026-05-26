import { useState } from "react";
import { useAuth } from "../context/authcontext.jsx";

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      signIn(email.trim().toLowerCase());
    }
  };

  return (
    <section id="view-signin" className="auth-wrapper">
      <div className="auth-center-header text-center mb-4" data-aos="fade-down">
        <div className="auth-logo mb-3">
          <i className="fa-solid fa-building-columns text-white fs-3"></i>
        </div>
        <h2 className="auth-brand">ClaimFlow Portal</h2>
        <p className="text-secondary small">Expense Claim Management System</p>
      </div>

      <div className="auth-card mx-auto" data-aos="zoom-in">
        <h3 className="auth-card-title">Sign In</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label font-medium">Email Address</label>
            <div className="input-icon-container">
              <i className="fa-regular fa-envelope input-leading-icon"></i>
              <input
                type="email"
                className="form-control padded-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label font-medium">Password</label>
            <div className="input-icon-container">
              <i className="fa-solid fa-lock input-leading-icon"></i>
              <input
                type="password"
                className="form-control padded-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary w-100 py-2 font-medium"
          >
            Sign In
          </button>
        </form>
      </div>
    </section>
  );
}
