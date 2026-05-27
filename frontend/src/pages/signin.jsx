import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Copy,
  KeyRound,
  Moon,
  Shield,
  Sparkles,
  Sun,
  User,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/authcontext.jsx";
import { useTheme } from "../hooks/usetheme.js";
import { api } from "../utils/api.js";
import Logo from "../components/logo.jsx";

const DEMO_PASSWORD = "claimflow-demo";

const DEMO_ACCOUNTS = [
  {
    role: "Employee",
    email: "demo.employee@claimflow.com",
    description: "Submit and track expense claims",
    icon: User,
  },
  {
    role: "Approving Officer",
    email: "demo.manager@claimflow.com",
    description: "Review and endorse department claims",
    icon: UserCheck,
  },
  {
    role: "Finance Admin",
    email: "demo.finance@claimflow.com",
    description: "Process payouts and view audit trail",
    icon: Wallet,
  },
];

export default function SignIn() {
  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetState, setResetState] = useState({ status: "idle" });
  // status: "idle" | "loading" | "done" | "error"
  //   done: { newPassword, email, message }
  //   error: { message }

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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const target = email.trim().toLowerCase() || "demo.employee@claimflow.com";
    setResetState({ status: "loading" });
    try {
      const result = await api.post("/api/auth/forgot-password", { email: target });
      const data = result?.data ?? {};
      setEmail(target);
      if (data.newPassword) {
        setPassword(data.newPassword);
      }
      setResetState({
        status: "done",
        newPassword: data.newPassword || null,
        email: data.email || target,
        message: data.message,
      });
    } catch (err) {
      setResetState({ status: "error", message: err?.message || "Reset failed" });
    }
  };

  const copyResetPassword = async () => {
    if (resetState.status !== "done" || !resetState.newPassword) return;
    try {
      await navigator.clipboard.writeText(resetState.newPassword);
    } catch {
      /* clipboard blocked — user can still read it on screen */
    }
  };

  return (
    <section id="view-signin" className="auth-shell">
      <div className="auth-topbar">
        <div className="auth-topbar-brand">
          <Logo size={26} />
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
          <div className="auth-brand-panel-content">
            <span className="auth-eyebrow">
              <Sparkles className="h-3 w-3" />
              Built for Singapore SMEs
            </span>
            <h1 className="auth-headline">
              Receipts in.
              <br />
              <span className="auth-headline-accent">Approved claims out.</span>
            </h1>
            <p className="auth-subheadline">
              Smart capture pulls the merchant, amount and GST off the receipt.
              Policy decides the next stop. Finance sees every step. You get
              paid.
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
              <li className="auth-flow-step">
                <span className="auth-flow-num">01</span>
                <span className="auth-flow-icon">
                  <Camera className="h-4 w-4" />
                </span>
                <div className="auth-flow-text">
                  <strong>Snap a receipt</strong>
                  <span>Photo or PDF — Grab, FairPrice, anything.</span>
                </div>
              </li>
              <li className="auth-flow-step">
                <span className="auth-flow-num">02</span>
                <span className="auth-flow-icon">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="auth-flow-text">
                  <strong>Smart capture</strong>
                  <span>Amount, GST 9%, merchant, date pulled automatically.</span>
                </div>
              </li>
              <li className="auth-flow-step">
                <span className="auth-flow-num">03</span>
                <span className="auth-flow-icon">
                  <Shield className="h-4 w-4" />
                </span>
                <div className="auth-flow-text">
                  <strong>Policy routes</strong>
                  <span>Auto-approve, manager review, or block.</span>
                </div>
              </li>
              <li className="auth-flow-step">
                <span className="auth-flow-num">04</span>
                <span className="auth-flow-icon">
                  <Wallet className="h-4 w-4" />
                </span>
                <div className="auth-flow-text">
                  <strong>Finance disburses</strong>
                  <span>Paid into your bank account.</span>
                </div>
              </li>
            </ol>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-card-modern">
            <h2 className="auth-card-modern-title">Sign in</h2>
            <p className="auth-card-modern-subtitle">
              Enter your work email to access your portal.
            </p>

            {error && (
              <div className="auth-error" role="alert">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-px" />
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
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetState.status === "loading"}
                  className="text-[0.82rem] text-accent font-medium hover:underline bg-transparent border-0 p-0 cursor-pointer disabled:opacity-60"
                >
                  {resetState.status === "loading"
                    ? "Issuing temporary password…"
                    : "Forgot password?"}
                </button>
              </div>
              <button
                type="submit"
                className="btn-primary-modern"
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>

              {resetState.status === "done" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-2 text-[12px] text-text-secondary leading-snug"
                >
                  {resetState.newPassword ? (
                    <>
                      <div className="flex items-center gap-1.5 mb-1">
                        <KeyRound className="h-3 w-3 text-accent" />
                        <span className="text-text-primary font-medium">
                          Temporary password for{" "}
                          <code className="text-[11px]">{resetState.email}</code>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <code className="text-[12px] px-2 py-0.5 bg-subtle border border-border-subtle rounded text-text-primary tabular-nums">
                          {resetState.newPassword}
                        </code>
                        <button
                          type="button"
                          onClick={copyResetPassword}
                          className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary bg-transparent border-0 p-0 cursor-pointer"
                          aria-label="Copy temporary password"
                        >
                          <Copy className="h-3 w-3" /> copy
                        </button>
                      </div>
                      <p className="mt-1 text-text-tertiary">
                        Pre-filled in the form above — just press Sign in.
                      </p>
                    </>
                  ) : (
                    <p className="text-text-tertiary">{resetState.message}</p>
                  )}
                </div>
              )}
              {resetState.status === "error" && (
                <p className="mt-2 text-[12px] text-danger-text" role="alert">
                  {resetState.message}
                </p>
              )}
            </form>

            <div className="auth-divider">
              <span>Preview a role</span>
            </div>

            <div className="auth-demo-grid">
              {DEMO_ACCOUNTS.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.email}
                    type="button"
                    className="auth-demo-btn"
                    onClick={() => handleDemoSignIn(account.email)}
                    disabled={submitting}
                  >
                    <span className="auth-demo-btn-icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="auth-demo-btn-meta">
                      <strong>Sign in as {account.role}</strong>
                      <span>{account.description}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 auth-demo-btn-arrow" />
                  </button>
                );
              })}
            </div>

            <p className="auth-card-modern-footer">
              Don't have an account?{" "}
              <a href="mailto:admin@claimflow.sg">Contact your admin</a>
            </p>

            <p className="auth-card-modern-footer" style={{ marginTop: 8 }}>
              <Link to="/privacy">Privacy notice</Link>
              <span style={{ margin: "0 8px", color: "var(--text-tertiary)" }}>
                ·
              </span>
              <Link to="/policies">Approval policy</Link>
              <span style={{ margin: "0 8px", color: "var(--text-tertiary)" }}>
                ·
              </span>
              <Link to="/compliance">Compliance</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
