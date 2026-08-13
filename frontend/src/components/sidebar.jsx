import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Download,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "../context/authcontext.jsx";
import { useToast } from "../context/toastcontext.jsx";
import { api } from "../utils/api.js";
import { useTheme } from "../hooks/usetheme.js";
import { useClaims } from "../hooks/useclaims.js";
import { evaluatePolicies, claimContextFromForm } from "../lib/policy.js";
import policies from "../data/policies.json";
import { formatSGD } from "../utils/helpers.js";
import Logo from "./logo.jsx";
import { cn } from "../lib/utils.js";
import "./sidebar.css";

const ROLE_LABELS = {
  employee: "Employee",
  approving: "Approving Officer",
  finance: "Finance Admin",
};

const NAV_BY_ROLE = {
  employee: [{ to: "/employee", label: "Submit & track", icon: FileText }],
  approving: [{ to: "/approving", label: "Approval queue", icon: Inbox }],
  finance: [{ to: "/finance", label: "Workspace", icon: LayoutDashboard }],
};

const SUMMARY_TITLES = {
  employee: "Your claims",
  approving: "Queue",
  finance: "Payouts",
};

// Route each role's summary rows to the workspace where the figure lives.
const SUMMARY_ROUTES = {
  employee: "/employee",
  approving: "/approving",
  finance: "/finance",
};

function isInMonth(value, monthStart) {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d >= monthStart;
}

// Same evaluation the approval queue uses (PolicyFlag), so the sidebar's
// "In policy" count always matches what the officer sees inline. It has to be
// the same CONTEXT too — both of these omitted `details`, which the rules read
// for six of the eleven, so the pair agreed with each other and with nothing
// else in the app.
function isInPolicy(claim) {
  const policy = evaluatePolicies(
    claimContextFromForm({
      category: claim.type,
      amount: claim.amount,
      receiptUrl: claim.receiptUrl,
      expenseDate: claim.date,
      details: claim.details || {},
      supplierGstRegNumber: claim.supplierGstRegNumber ?? null,
    }),
  );
  return policy?.outcome === "auto-approve";
}

/**
 * The side rail's real job: saved views.
 *
 * It used to hold two or three read-only figures and then a tall empty
 * column down to the profile card. Figures alone are a dead end — you read
 * "3 awaiting correction" and still have to go find them. These are the same
 * counts as links: each one opens the workspace already filtered, which is
 * what a queue tool's rail is for (and what fills it honestly).
 *
 * Every count comes from the claims the page itself renders. A view with
 * nothing in it is dropped rather than shown as a zero, so the rail never
 * pads itself out.
 */
function buildViews(role, claims) {
  if (role === "approving") {
    // No department filter: the API scopes an approving officer to their own
    // department, and this line hardcoded "Sales" — so an officer in Marketing
    // or Engineering saw every count come out at zero and a rail with one row
    // in it. The claims handed in here are already the ones they can act on.
    const dept = claims;
    const pending = dept.filter((c) => c.status === "Pending");
    const awaiting = pending.filter((c) => c?.details?.correctionRequest);
    const toReview = pending.length - awaiting.length;
    const rows = [
      { label: "To review", value: toReview, to: "/approving" },
      {
        label: "Awaiting correction",
        value: awaiting.length,
        to: "/approving?status=Awaiting%20correction",
      },
      {
        label: "Endorsed",
        value: dept.filter((c) => c.status === "Endorsed").length,
        to: "/approving?status=Endorsed",
      },
      {
        label: "Paid",
        value: dept.filter((c) => c.status === "Paid").length,
        to: "/approving?status=Paid",
      },
      {
        label: "Rejected",
        value: dept.filter((c) => c.status === "Rejected").length,
        to: "/approving?status=Rejected",
      },
    ];
    rows.push({
      label: "All claims",
      value: dept.length,
      to: "/approving?status=All%20Status",
    });
    return rows.filter((r) => r.value > 0 || r.label === "To review");
  }

  if (role === "employee") {
    const needsFix = claims.filter(
      (c) => c.status === "Pending" && c?.details?.correctionRequest,
    ).length;
    const inReview = claims.filter(
      (c) => c.status === "Pending" && !c?.details?.correctionRequest,
    ).length;
    const rows = [
      { label: "Needs your fix", value: needsFix, to: "/employee" },
      { label: "With your approver", value: inReview, to: "/employee" },
      {
        label: "Endorsed",
        value: claims.filter((c) => c.status === "Endorsed").length,
        to: "/employee",
      },
      {
        label: "Paid",
        value: claims.filter((c) => c.status === "Paid").length,
        to: "/employee",
      },
      { label: "All claims", value: claims.length, to: "/employee" },
    ];
    return rows.filter((r) => r.value > 0);
  }

  if (role === "finance") {
    const endorsed = claims.filter((c) => c.status === "Endorsed");
    const rows = [
      { label: "Awaiting payment", value: endorsed.length, to: "/finance" },
      {
        label: "Paid",
        value: claims.filter((c) => c.status === "Paid").length,
        to: "/finance",
      },
      {
        label: "In review",
        value: claims.filter((c) => c.status === "Pending").length,
        to: "/finance",
      },
      { label: "All claims", value: claims.length, to: "/finance" },
    ];
    return rows.filter((r) => r.value > 0);
  }

  return [];
}

/* buildSummaryRows() removed — the rail shows navigable views now, not
   read-only figures. */

const LEGAL_LINKS = [
  { to: "/policies", label: "Policies" },
  { to: "/compliance", label: "Compliance" },
  { to: "/privacy", label: "Privacy" },
];

/**
 * Last resort only. The session carries the name the account was registered
 * under, and that is what the rest of the app shows — the approver's queue
 * names Rachel Tan, and so does the toast when a claim goes back to her. This
 * pulled a name out of the email instead, so the same person was "Demo
 * Employee" in her own sidebar, and anyone whose address does not happen to
 * be first.last gets a stranger's name on their own screen.
 */
function deriveName(email) {
  if (!email) return "";
  const local = email.split("@")[0];
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function SectionLabel({ children }) {
  return (
    <p className="px-2 mb-1 text-[0.6875rem] uppercase tracking-[0.08em] font-semibold text-text-tertiary">
      {children}
    </p>
  );
}

export default function Sidebar({ onNavigate, className }) {
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { latestMap, loading, error } = useClaims();

  const summaryRows = useMemo(() => {
    if (!session) return [];
    return buildViews(session.role, Object.values(latestMap));
  }, [session, latestMap]);

  if (!session) return null;

  // Real numbers only: show nothing while the first fetch is in flight,
  // and nothing at all if the fetch failed.
  const summaryReady =
    !error && (!loading || Object.keys(latestMap).length > 0);
  const summaryTo = SUMMARY_ROUTES[session.role];

  const { addToast } = useToast();
  const [exporting, setExporting] = useState(false);

  /**
   * The sign-in page tells everyone "Export your data whenever you want", and
   * GET /api/users/me/export has been there the whole time returning the
   * account, its claims and their audit trail with third parties redacted.
   * Nothing in the app ever called it, so the promise was unkeepable by anyone
   * who was not willing to write their own HTTP request. This is the button.
   */
  const downloadMyData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const payload = await api.get("/api/users/me/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `claimflow-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      addToast({
        variant: "success",
        title: "Your data is downloading",
        message: "Your account, your claims and their history, in one file.",
      });
    } catch (e) {
      addToast({
        variant: "error",
        title: "Could not prepare your download",
        message: e.message,
      });
    } finally {
      setExporting(false);
    }
  };

  const name = session.name?.trim() || deriveName(session.email);
  const initials = (name.match(/\b\w/g) || ["U"])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = ROLE_LABELS[session.role] || "Member";
  const nav = NAV_BY_ROLE[session.role] || [];

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col bg-card text-foreground",
        className,
      )}
    >
      {/* brand — height must match AppShell topbar (h-11) so the seam between
          sidebar and main area is one continuous line, not a stepped notch */}
      <div className="flex items-center gap-2.5 px-4 h-11 border-b border-border-subtle">
        <Logo size={22} />
        <span className="text-sm font-semibold tracking-tight">ClaimFlow</span>
      </div>

      {/* nav */}
      <nav className="flex-1 px-2 pt-4 overflow-hidden">
        <SectionLabel>Workspace</SectionLabel>
        <ul className="flex flex-col gap-0.5 mb-5">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 px-3 min-h-[44px] rounded-ds-md text-sm font-medium transition-colors no-underline",
                    isActive
                      ? "bg-subtle text-foreground"
                      : "text-text-secondary hover:bg-subtle hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {summaryReady && summaryRows.length > 0 && (
          <div>
            <SectionLabel>{SUMMARY_TITLES[session.role]}</SectionLabel>
            <div className="sidebar-summary-list">
              {summaryRows.map(({ label, value, to }) => (
                <NavLink
                  key={label}
                  to={to || summaryTo}
                  onClick={onNavigate}
                  className="sidebar-stat"
                  title={`Open ${label.toLowerCase()}`}
                >
                  <span className="sidebar-stat-label">{label}</span>
                  <span className="sidebar-stat-value">{value}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* user card — minimal */}
      <div className="border-t border-border-subtle px-3 py-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="user-identity-avatar h-8 w-8 text-[11px]">
            {initials}
            <span className="user-identity-presence" aria-hidden="true"></span>
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] font-medium truncate">{name}</div>
            <div className="text-[11px] text-text-tertiary truncate">
              {roleLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-ds-sm text-text-tertiary hover:bg-subtle hover:text-foreground transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={downloadMyData}
            disabled={exporting}
            aria-label="Download my data"
            title="Download my data"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-ds-sm text-text-tertiary hover:bg-subtle hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-ds-sm text-[13px] font-medium text-text-secondary hover:bg-subtle hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* What rule set is actually running. Real values from policies.json —
          the version the engine loaded and the number of rules it evaluates —
          which is the sort of thing an audit-minded finance tool states, and
          it anchors the foot of the rail so the space above reads as a gap
          between two groups rather than a trailing void. */}
      <NavLink to="/policies" onClick={onNavigate} className="sidebar-policy">
        <span className="sidebar-policy-label">Approval policy</span>
        <span className="sidebar-policy-meta">
          <span className="sidebar-policy-version">{policies.version}</span>
          <span aria-hidden="true"> · </span>
          {policies.rules.length} rules
        </span>
      </NavLink>

      {/* legal pages stay reachable, but quiet */}
      <div className="sidebar-legal">
        {LEGAL_LINKS.map(({ to, label }, i) => (
          <span key={to}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            <NavLink to={to} onClick={onNavigate}>
              {label}
            </NavLink>
          </span>
        ))}
      </div>
    </aside>
  );
}
