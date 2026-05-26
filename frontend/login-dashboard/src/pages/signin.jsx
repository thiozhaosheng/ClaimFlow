import { useState } from "react";
import { useAuth } from "../context/authcontext.jsx";
import Logo from "../components/logo.jsx";
import LoginIllustration from "../components/loginillustration.jsx";

const DEMO_ACCOUNTS = [
  {
    role: "Employee",
    email: "demo.employee@claimflow.com",
    description: "Submit and track expense claims",
    icon: "fa-user",
  },
  {
    role: "Approving Officer",
    email: "demo.manager@claimflow.com",
    description: "Review and endorse department claims",
    icon: "fa-user-check",
  },
  {
    role: "Finance Admin",
    email: "demo.finance@claimflow.com",
    description: "Process payouts and view audit trail",
    icon: "fa-wallet",
  },
];

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

  const handleDemoSignIn = (demoEmail) => {
    signIn(demoEmail);
  };

  return (
    <section id="view-signin" className="auth-shell">
      <div className="auth-topbar">
        <div className="auth-topbar-brand">
          <Logo size={28} />
          <span className="auth-topbar-name">ClaimFlow</span>
        </div>
        <span className="auth-topbar-help">
          Need help?{" "}
          <a href="mailto:support@claimflow.com">support@claimflow.com</a>
        </span>
      </div>

      <div className="auth-split">
        <div className="auth-brand-panel">
          <div className="auth-brand-panel-content" data-aos="fade-right">
            <span className="auth-eyebrow">
              <i className="fa-solid fa-sparkles"></i>
              Expense management for SMEs
            </span>
            <h1 className="auth-headline">
              Reimbursements,
              <br />
              without the chaos.
            </h1>
            <p className="auth-subheadline">
              Replace WhatsApp receipts and spreadsheet approvals with a
              structured workflow your finance team will actually trust.
            </p>
            <ul className="auth-feature-row">
              <li>
                <i className="fa-solid fa-bolt"></i>
                <span>Submit in seconds</span>
              </li>
              <li>
                <i className="fa-solid fa-shield-halved"></i>
                <span>Role-based approvals</span>
              </li>
              <li>
                <i className="fa-solid fa-file-lines"></i>
                <span>Audit-ready records</span>
              </li>
            </ul>
          </div>
          <LoginIllustration />
        </div>

        <div className="auth-form-panel">
          <div className="auth-card-modern" data-aos="fade-left">
            <h2 className="auth-card-modern-title">Sign in</h2>
            <p className="auth-card-modern-subtitle">
              Enter your work email to access your portal.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group-modern">
                <label htmlFor="signin-email">Email</label>
                <input
                  id="signin-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group-modern">
                <label htmlFor="signin-password">Password</label>
                <input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="auth-row-meta">
                <span></span>
                <a href="#">Forgot password?</a>
              </div>
              <button type="submit" className="btn-primary-modern">
                Sign in
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </form>

            <div className="auth-divider">
              <span>Preview a role</span>
            </div>

            <div className="auth-demo-grid">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="auth-demo-btn"
                  onClick={() => handleDemoSignIn(account.email)}
                >
                  <span className="auth-demo-btn-icon">
                    <i className={`fa-solid ${account.icon}`}></i>
                  </span>
                  <span className="auth-demo-btn-meta">
                    <strong>Sign in as {account.role}</strong>
                    <span>{account.description}</span>
                  </span>
                  <i className="fa-solid fa-arrow-right auth-demo-btn-arrow"></i>
                </button>
              ))}
            </div>

            <p className="auth-card-modern-footer">
              Don't have an account?{" "}
              <a href="mailto:admin@claimflow.com">Contact your admin</a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
