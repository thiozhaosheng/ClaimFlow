import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  // Not "Payouts": the rows under it are Awaiting payment, Paid and All
  // claims, and two of those are not payouts.
  finance: "Claims",
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
      { label: "Needs your fix", value: needsFix, to: "/employee?status=fix" },
      {
        label: "With your approver",
        value: inReview,
        to: "/employee?status=pending",
      },
      {
        label: "Endorsed",
        value: claims.filter((c) => c.status === "Endorsed").length,
        to: "/employee?status=Endorsed",
      },
      {
        label: "Paid",
        value: claims.filter((c) => c.status === "Paid").length,
        to: "/employee?status=Paid",
      },
      { label: "All claims", value: claims.length, to: "/employee" },
    ];
    return rows.filter((r) => r.value > 0);
  }

  if (role === "finance") {
    // Only what finance can actually open. "In review" used to sit here
    // counting pending claims, and there is no screen in this role that lists
    // them — the approver decides those. The dashboard already reports them in
    // its In flight figure, with a drill-down, in range.
    const endorsed = claims.filter((c) => c.status === "Endorsed");
    const rows = [
      {
        label: "Awaiting payment",
        value: endorsed.length,
        to: "/finance?tab=payouts",
      },
      {
        label: "Paid",
        value: claims.filter((c) => c.status === "Paid").length,
        to: "/finance?tab=audit&filter=Paid",
      },
      { label: "All claims", value: claims.length, to: "/finance?tab=audit" },
    ];
    return rows.filter((r) => r.value > 0);
  }

  return [];
}

/* buildSummaryRows() removed — the rail shows navigable views now, not
   read-only figures. */

/**
 * The parameters a saved view is allowed to set. A view is the open one when
 * all of them agree — including the ones it does NOT set, so "All claims"
 * (which names none) is not also lit while you are looking at "Paid".
 */
const VIEW_PARAMS = ["status", "tab", "filter"];

/**
 * Which view is open.
 *
 * NavLink cannot answer this: it compares pathnames and ignores the query
 * string, and with a plain string className react-router appends `active`
 * itself — so every row in the rail carried `.active` at once and the whole
 * list rendered as one shaded slab. The "open folder" mark meant nothing
 * because it was on all of them.
 */
function viewMatches(to, location) {
  const [path, query = ""] = to.split("?");
  if (path !== location.pathname) return false;
  const target = new URLSearchParams(query);
  const current = new URLSearchParams(location.search);
  return VIEW_PARAMS.every(
    (key) => (target.get(key) || "") === (current.get(key) || ""),
  );
}

// No "Policies" here: the approval-policy block directly above these links
// goes to the same page, and a rail should not offer one destination twice.
const LEGAL_LINKS = [
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
    /* 12px, like every other label in the rail. 11 was the only rung below
       the floor the rest of the app is held to, on the one line that names
       what the rows underneath are. */
    <p className="px-2 mb-1 text-[12px] uppercase tracking-[0.08em] font-semibold text-text-tertiary">
      {children}
    </p>
  );
}

export default function Sidebar({ onNavigate, className }) {
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { latestMap, loading, error } = useClaims();
  const location = useLocation();

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

      {/* nav — no "Workspace" heading above it: each role has exactly one
          page, and the heading repeated the word on the only item under it. */}
      <nav className="flex-1 px-2 pt-3 overflow-hidden">
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
              {summaryRows.map(({ label, value, to }) => {
                const target = to || summaryTo;
                const open = viewMatches(target, location);
                return (
                  <NavLink
                    key={label}
                    to={target}
                    onClick={onNavigate}
                    /* Function form on purpose: with a plain string,
                       react-router appends its own `active` on a pathname
                       match and the query — which is the whole difference
                       between these rows — is ignored. */
                    className={() => cn("sidebar-stat", open && "active")}
                    aria-current={open ? "page" : undefined}
                    title={`Open ${label.toLowerCase()}`}
                  >
                    <span className="sidebar-stat-label">{label}</span>
                    <span className="sidebar-stat-value">{value}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* The foot: who you are, then the three things you can do about it,
          then what rule set is running. It used to be three separate bands —
          a profile row, a strip of two unlabelled icon buttons beside Sign
          out, and two more stacked blocks — 199px of chrome under 355px of
          nothing. A lone download arrow in a rail also tells nobody that it
          is their PDPA export, which is the one control here the product has
          promised on two other pages. */}
      <div className="sidebar-foot">
        <div className="sidebar-identity">
          <div className="user-identity-avatar h-8 w-8 text-[12px]">
            {initials}
            <span className="user-identity-presence" aria-hidden="true"></span>
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="sidebar-identity-name">{name}</div>
            <div className="sidebar-identity-role">{roleLabel}</div>
          </div>
        </div>

        <button type="button" onClick={toggleTheme} className="sidebar-action">
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
        <button
          type="button"
          onClick={downloadMyData}
          disabled={exporting}
          className="sidebar-action"
        >
          <Download className="h-4 w-4" />
          <span>{exporting ? "Preparing…" : "Download my data"}</span>
        </button>
        <button type="button" onClick={logout} className="sidebar-action">
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </button>
      </div>

      {/* What rule set is actually running, and the pages that govern it —
          one block, because they are one subject. Real values from
          policies.json: the version the engine loaded and the number of rules
          it evaluates. "Policies" is gone from the line below because the
          block above it already goes there. */}
      <div className="sidebar-rules">
        <NavLink to="/policies" onClick={onNavigate} className="sidebar-policy">
          <span className="sidebar-policy-label">Approval policy</span>
          <span className="sidebar-policy-meta">
            <span className="sidebar-policy-version">{policies.version}</span>
            <span aria-hidden="true"> · </span>
            {policies.rules.length} rules
          </span>
        </NavLink>
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
      </div>
    </aside>
  );
}
