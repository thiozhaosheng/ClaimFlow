import { useState } from "react";
import { useAuth } from "../context/authcontext.jsx";
import Logo from "../components/logo.jsx";
import LoginIllustration from "../components/loginillustration.jsx";

const DEMO_PASSWORD = "claimflow-demo";

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
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const runSignIn = async (emailValue, passwordValue) => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(emailValue, passwordValue);
    } catch (err) {
      setError(err?.message || "Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    runSignIn(email.trim().toLowerCase(), password);
  };

  const handleDemoSignIn = (demoEmail) => {
    runSignIn(demoEmail, DEMO_PASSWORD);
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
              <span className="auth-headline-accent">without the chaos.</span>
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

            {error && (
              <div className="auth-error" role="alert">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

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
                  disabled={submitting}
                  autoComplete="email"
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
                  disabled={submitting}
                  autoComplete="current-password"
                />
              </div>
              <div className="auth-row-meta">
                <span></span>
                <a href="#">Forgot password?</a>
              </div>
              <button
                type="submit"
                className="btn-primary-modern"
                disabled={submitting}
              >
                {submitting ? "Signing in..." : "Sign in"}
                {!submitting && <i className="fa-solid fa-arrow-right"></i>}
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
                  disabled={submitting}
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
