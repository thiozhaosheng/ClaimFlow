import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  Moon,
  Shield,
  Sparkles,
  Sun,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/authcontext.jsx";
import { useTheme } from "../hooks/usetheme.js";
import Logo from "../components/logo.jsx";

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
  const { theme, toggleTheme } = useTheme();
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
        <div className="flex items-center gap-3">
          <span className="auth-topbar-help">
            Need help?{" "}
            <a href="mailto:support@claimflow.sg">support@claimflow.sg</a>
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="auth-topbar-theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="auth-split">
        <div className="auth-brand-panel">
          <div className="auth-brand-panel-content" data-aos="fade-right">
            <span className="auth-eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Built for Singapore SMEs
            </span>
            <h1 className="auth-headline">
              Receipts in.
              <br />
              <span className="auth-headline-accent">Approved claims out.</span>
            </h1>
            <p className="auth-subheadline">
              Smart capture pulls the merchant, amount and GST off the receipt. Policy decides the next stop.
              Finance sees every step. You get paid.
            </p>

            <div className="auth-stat-strip">
              <div>
                <strong>~12 min</strong>
                <span>avg approval</span>
              </div>
              <span className="auth-stat-divider" aria-hidden="true" />
              <div>
                <strong>87%</strong>
                <span>auto-approved</span>
              </div>
              <span className="auth-stat-divider" aria-hidden="true" />
              <div>
                <strong>PDPA + IRAS</strong>
                <span>compliant</span>
              </div>
            </div>

            <ol className="auth-flow">
              <li className="auth-flow-step" style={{ "--i": 0 }}>
                <span className="auth-flow-num">1</span>
                <span className="auth-flow-icon"><Camera className="h-4 w-4" /></span>
                <div className="auth-flow-text">
                  <strong>Snap a receipt</strong>
                  <span>Photo or PDF — Grab, FairPrice, anything.</span>
                </div>
              </li>
              <li className="auth-flow-step" style={{ "--i": 1 }}>
                <span className="auth-flow-num">2</span>
                <span className="auth-flow-icon"><Sparkles className="h-4 w-4" /></span>
                <div className="auth-flow-text">
                  <strong>Smart capture</strong>
                  <span>Amount, GST 9%, merchant, date pulled automatically.</span>
                </div>
              </li>
              <li className="auth-flow-step" style={{ "--i": 2 }}>
                <span className="auth-flow-num">3</span>
                <span className="auth-flow-icon"><Shield className="h-4 w-4" /></span>
                <div className="auth-flow-text">
                  <strong>Policy routes</strong>
                  <span>Auto-approve, manager review, or block.</span>
                </div>
              </li>
              <li className="auth-flow-step" style={{ "--i": 3 }}>
                <span className="auth-flow-num">4</span>
                <span className="auth-flow-icon"><Wallet className="h-4 w-4" /></span>
                <div className="auth-flow-text">
                  <strong>Finance disburses</strong>
                  <span>Paid into your bank account.</span>
                </div>
              </li>
            </ol>
          </div>
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
              <a href="mailto:admin@claimflow.sg">Contact your admin</a>
            </p>

            <p className="auth-card-modern-footer" style={{ marginTop: 8 }}>
              <Link to="/privacy">Privacy notice</Link>
              <span style={{ margin: "0 8px", color: "#9aa0a6" }}>·</span>
              <Link to="/policies">Approval policy</Link>
              <span style={{ margin: "0 8px", color: "#9aa0a6" }}>·</span>
              <Link to="/compliance">Compliance</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
