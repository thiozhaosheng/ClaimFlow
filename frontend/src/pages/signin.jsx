import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Moon, Shield, Sun } from "lucide-react";
import { useAuth } from "../context/authcontext.jsx";
import { useTheme } from "../hooks/usetheme.js";
import { api } from "../utils/api.js";
import Logo from "../components/logo.jsx";
import { OUTCOMES, SCENARIOS } from "./signin.scenarios.js";

const DEMO_PASSWORD = "claimflow-demo";

/** Today, in the app's date format — so the demo card never shows a stale date. */
const TODAY = new Intl.DateTimeFormat("en-SG", {
  day: "numeric",
  month: "short",
}).format(new Date());

/**
 * Three claims, three verdicts — the card is a working demo, not a picture.
 *
 * The scenarios live in signin.scenarios.js next to a test that runs each
 * one through the real policy engine, so the story this card tells is
 * checked against policies.json on every test run. Blocked claims really
 * are never persisted — the route returns 422 before any write, which is
 * what the final "—" step states. Timestamps make the speed argument
 * instead of an invented average.
 */

/**
 * The homepage's navigation hub, and its trust signals.
 *
 * These three routes already exist and are written; they were previously
 * four-word links in the sign-in card's footer. Each description paraphrases
 * that page's own opening paragraph, so the index never promises more than
 * the page behind it delivers.
 */
const TRUST_LINKS = [
  {
    to: "/policies",
    name: "Approval policy",
    desc: "The rules that decide auto-approve, review or block",
  },
  {
    to: "/compliance",
    name: "Compliance",
    desc: "How PDPA and IRAS GST obligations are met",
  },
  {
    to: "/privacy",
    name: "Privacy notice",
    desc: "What is collected, how long it is kept, your PDPA choices",
  },
];

/**
 * `short` is the visible label; `role` and `description` survive as the
 * button's accessible name, so screen readers still hear the full phrase and
 * the E2E suite's /Sign in as Employee/i lookup keeps matching.
 */
const DEMO_ACCOUNTS = [
  {
    role: "Employee",
    short: "Employee",
    email: "demo.employee@claimflow.com",
    description: "Submit and track expense claims",
  },
  {
    role: "Approving Officer",
    // The app calls this role "Approving Officer" in the sidebar and the
    // seed data; "Manager" is the BACKEND's enum, and using it here meant
    // clicking "Manager" landed you on a screen labelled Approving Officer.
    short: "Approver",
    email: "demo.manager@claimflow.com",
    description: "Review and endorse department claims",
  },
  {
    role: "Finance Admin",
    short: "Finance",
    email: "demo.finance@claimflow.com",
    description: "Process payouts and view audit trail",
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
  // Which of the three demo verdicts the hero card is showing.
  const [verdict, setVerdict] = useState("approved");
  const tabRefs = useRef([]);

  /**
   * Roving tabindex: the group is ONE tab stop and the arrows move between
   * options, which is how a real segmented control behaves. Three separate
   * tab stops for three views of the same object is the wrong shape, and it
   * made a keyboard user pay three stops to skip past a demo.
   */
  const handleTabKeys = (e) => {
    const i = OUTCOMES.indexOf(verdict);
    const last = OUTCOMES.length - 1;
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    setVerdict(OUTCOMES[next]);
    tabRefs.current[next]?.focus();
  };
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


  return (
    <section id="view-signin" className="auth-shell">
      <div className="auth-topbar">
        <div className="auth-topbar-brand">
          <Logo size={26} />
          <span className="auth-topbar-name">ClaimFlow</span>
        </div>
        {/* The mark and one control. A "Need help? support@claimflow.dev"
            line used to sit here — a second fabricated address on a domain
            that does not resolve, competing with the contact route already in
            the card. One contact, in the place where someone actually needs
            it. */}
        <div className="flex items-center gap-3">
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

      {/* Three siblings, not two panels. On desktop the lead and the proof
          stack in the left column beside the form. On a phone they split
          around it — headline first so you know what this is, then the form,
          then the proof underneath. Previously the whole story sat below the
          form on mobile, so the page opened on a bare card with no indication
          of what you were signing into. */}
      <div className="auth-split">
        <div className="auth-brand-lead">
          <div className="auth-brand-inner">
            {/* A ruled label — no pill, no icon. Set in literal capitals
                rather than text-transform, because uppercasing "SMEs" in CSS
                produced "SMES" and turned the acronym into a word. */}
            <span className="auth-kicker">FOR SINGAPORE SMEs</span>

            {/* Five words. The previous headline was a full two-clause
                sentence that ran to two long lines and had to be re-broken on
                mobile; a hero line should be readable in one glance at any
                width. The WhatsApp point survives as the thing "chasing"
                refers to, without naming it. */}
            {/* The explicit space matters: the phone stylesheet hides the
                <br> so the line wraps naturally, and without it the words fuse
                into "reimbursedwithout". */}
            <h1 className="auth-headline">
              Get reimbursed{" "}
              <br />
              without chasing anyone.
            </h1>

            {/* No icon strip under the headline. The four-station pipeline
                that lived here duplicated the flow the claim card's timeline
                already demonstrates — and a labelled icon row is the single
                most template-generated device on the web. One headline, one
                object, one quiet footer line: that is the whole column. */}
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-card-modern">
            {/* No subtitle. "Enter your work email to access your portal"
                described a two-field form to someone already looking at it. */}
            <h2 className="auth-card-modern-title">Sign in</h2>

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
              {/* The reset link sits in the label row, where Stripe and
                  Linear both put it — it used to hang alone on a line of its
                  own, right-aligned by an empty <span> and a space-between,
                  which is generated-markup residue and cost a whole row.
                  The password field also had a "••••••••" placeholder: it
                  made an empty form look filled in screenshots, and left no
                  way to tell an empty field from a filled one. */}
              <div className="form-group-modern">
                <label htmlFor="signin-password" className="form-label-row">
                  Password
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetState.status === "loading"}
                    className="auth-forgot"
                  >
                    {resetState.status === "loading"
                      ? "Issuing temporary password…"
                      : "Forgot?"}
                  </button>
                </label>
                <input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                className="btn-primary w-full h-[44px] mt-4"
                disabled={submitting}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>

              {resetState.status === "done" && (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-2 text-[12px] text-success-text leading-snug p-3 bg-success-bg border border-success-border rounded"
                >
                  <p className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Reset link sent
                  </p>
                  <p className="mt-1 text-text-secondary">{resetState.message}</p>
                </div>
              )}
              {resetState.status === "error" && (
                <p className="mt-2 text-[12px] text-danger-text" role="alert">
                  {resetState.message}
                </p>
              )}
            </form>

            {/* No rule between the form and the demo accounts: the gap does
                that work. A submit button with a trailing arrow is also gone —
                it is the most common generated-CTA tell, and "Sign in" already
                says what happens. */}
            {/* Three plain buttons on one row, replacing three stacked rows of
                icon tile + bold title + grey subtitle + chevron. That pattern
                is the most recognisable generated-UI object there is, all
                three titles opened with the same three words, and the two
                person icons differed by about two pixels. The role name is the
                only word that ever mattered; the full phrase stays as the
                accessible name, which is also what the E2E suite matches on. */}
            <p className="auth-demo-hint">Demo accounts — no password needed.</p>
            <div className="auth-demo-row">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  className="auth-demo-btn"
                  onClick={() => handleDemoSignIn(account.email)}
                  disabled={submitting}
                  aria-label={`Sign in as ${account.role} — ${account.description}`}
                >
                  {account.short}
                </button>
              ))}
            </div>

            <p className="auth-card-modern-footer">
              Don’t have an account?{" "}
              <a href="mailto:admin@claimflow.dev">Contact your admin</a>
            </p>

            {/* The three page links that used to sit here are now the index
                in the left column, where they carry a description and can be
                read as trust signals rather than legal small print. Repeating
                them inside the card would just be clutter. */}
          </div>
        </div>

        <div className="auth-brand-proof">
          <div className="auth-brand-inner">
            {/* No photograph here. The stock shot that used to sit above this
                card had a Square terminal in frame — Square does not operate
                in Singapore — under a headline that says the product is built
                for Singapore SMEs, and it depicted a customer paying a shop
                rather than an employee expensing a ride. The claim card is the
                real product moment and does not need a picture of one. */}
            {/* A working demo, not a picture.

                The segmented control flips the card between the three verdicts
                the policy engine can return, each backed by a real rule in
                config/policies.json. A static hero mockup is the house style
                of generated landing pages; a control you can actually use is
                the opposite — and showing "blocked" on the homepage is the SME
                pitch, because stopping a bad claim before it is saved is the
                money argument.

                key={verdict} remounts the body so the step stagger replays on
                every switch, which is what makes the change feel like the
                product running rather than text swapping. */}
            <figure className="auth-claim">
              <div
                className="auth-claim-seg"
                role="tablist"
                aria-label="Example claims"
                onKeyDown={handleTabKeys}
              >
                <span
                  className="auth-claim-seg-thumb"
                  style={{ "--seg": OUTCOMES.indexOf(verdict) }}
                  aria-hidden="true"
                />
                {OUTCOMES.map((key, i) => (
                  <button
                    key={key}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`claim-tab-${key}`}
                    aria-controls="claim-panel"
                    aria-selected={verdict === key}
                    tabIndex={verdict === key ? 0 : -1}
                    className={`auth-claim-seg-btn${
                      verdict === key ? " is-active" : ""
                    }`}
                    onClick={() => setVerdict(key)}
                  >
                    {SCENARIOS[key].seg}
                  </button>
                ))}
              </div>

              <div
                className="auth-claim-body"
                id="claim-panel"
                role="tabpanel"
                aria-labelledby={`claim-tab-${verdict}`}
                key={verdict}
              >
                <div className="auth-claim-top">
                  <span className="auth-claim-chip">
                    {SCENARIOS[verdict].chip}
                  </span>
                  <span className="auth-claim-date">{TODAY}</span>
                </div>

                <p className="auth-claim-merchant">
                  {SCENARIOS[verdict].merchant}
                </p>

                {/* No status seal beside the amount. The verdict used to be
                    stated three times in one card — the tab, the coloured
                    timeline row, and a circular tick that popped in with an
                    overshoot. Now the tabs name the receipt you feed in and
                    the timeline is the only place the answer appears, so the
                    outcome is a reveal instead of a chorus. */}
                <p className="auth-claim-amount">
                  {SCENARIOS[verdict].amount}
                  <span className="auth-claim-gst">
                    {SCENARIOS[verdict].gst}
                  </span>
                </p>

                <ol className="auth-claim-steps">
                  {SCENARIOS[verdict].steps.map((step, i) => (
                    <li
                      key={step.label}
                      className={`auth-claim-step${
                        step.tone ? ` auth-claim-step--${step.tone}` : ""
                      }`}
                      style={{ "--i": i }}
                    >
                      <time className="auth-claim-time">{step.time}</time>
                      <span className="auth-claim-label">
                        {step.label}
                        {step.detail && (
                          <span className="auth-claim-detail">
                            {step.detail}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </figure>

          </div>
        </div>

        <div className="auth-brand-foot">
          <div className="auth-brand-inner">
            <nav className="auth-index" aria-label="About ClaimFlow">
              {TRUST_LINKS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="auth-index-link"
                  /* The description no longer shows — it would triple the
                     height of this block — but it still reaches anyone using
                     a screen reader, where length costs nothing. */
                  aria-label={`${item.name} — ${item.desc}`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Two facts, both real (audit_logs table, GET /api/users/me/export),
                said plainly and without an icon in front. */}
            <p className="auth-footnote">
              Every action is logged. Export your data whenever you want.
            </p>
          </div>
        </div>
      </div>

      {/* No product-screenshot section below the fold: the demo cards in the
          form are one click from the real workspace, which makes a static
          picture of it redundant. The shell is exactly one viewport tall, so
          the page ends at the fold rather than scrolling into empty space. */}
    </section>
  );
}
