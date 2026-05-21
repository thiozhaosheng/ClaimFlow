/** ClaimFlow Portal - core engine architecture & lifecycle manager **/

let CLAIMS_DB = [];
let CURRENT_SESSION = null;

// Baseline testing data matrix to seed the system runtime environment
const DEFAULT_INITIAL_RECORDS = [
  {
    id: "CLM-001",
    employee: "Sarah Johnson",
    date: "2026-05-11",
    time: "09:23 AM",
    type: "Meal",
    department: "Sales",
    amount: 145.5,
    status: "Pending",
    actor: "Sarah Johnson",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 1289",
  },
  {
    id: "CLM-002",
    employee: "Michael Chen",
    date: "2026-05-09",
    time: "02:15 PM",
    type: "Travel",
    department: "Engineering",
    amount: 450.0,
    status: "Endorsed",
    actor: "Michael Chen",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 4589",
  },
];

// Attach core listeners on initial page compilation loop
document.addEventListener("DOMContentLoaded", () => {
  loadDatabaseState();
  syncAuthenticationSession();
});

/* Handles database instantiation from persistent storage cache environments */
function loadDatabaseState() {
  const savedDb = localStorage.getItem("claimflow_db");
  if (savedDb) {
    CLAIMS_DB = JSON.parse(savedDb);
  } else {
    CLAIMS_DB = [...DEFAULT_INITIAL_RECORDS];
    localStorage.setItem("claimflow_db", JSON.stringify(CLAIMS_DB));
  }
}

/* Evaluates operational authentication parameters and intercepts route entries */
function syncAuthenticationSession() {
  const savedSession = localStorage.getItem("claimflow_session");
  const currentPath = window.location.pathname;

  if (savedSession) {
    CURRENT_SESSION = JSON.parse(savedSession);

    // Auto-redirect if an active session tries to navigate back to the sign-in page
    if (currentPath.endsWith("index.html") || currentPath.endsWith("/")) {
      redirectToPage(CURRENT_SESSION.currentView);
    }
  } else {
    // Escape layout intercept if user accesses secured internal branches unauthenticated
    if (!currentPath.endsWith("index.html") && !currentPath.endsWith("/")) {
      window.location.href = "index.html";
    }
  }
}

/* Executes login authentication checks, resolves roles, and configures active contexts */
function handleSignIn(event) {
  event.preventDefault();

  const emailInput = document
    .getElementById("input-email")
    .value.trim()
    .toLowerCase();
  let resolvedRole = "employee";

  // Role resolution filter ruleset matching corporate structural profiles
  if (
    emailInput.includes("manager") ||
    emailInput.includes("approving") ||
    emailInput.includes("lisa")
  ) {
    resolvedRole = "approving";
  } else if (emailInput.includes("finance") || emailInput.includes("admin")) {
    resolvedRole = "finance";
  }

  // Build current application session state footprint
  CURRENT_SESSION = {
    email: emailInput,
    role: resolvedRole,
    currentView: resolvedRole,
    sessionStart: new Date().toISOString(),
  };

  localStorage.setItem("claimflow_session", JSON.stringify(CURRENT_SESSION));
  redirectToPage(resolvedRole);
}

/* Populates form inputs instantly when sandbox shortcuts are clicked */
function quickFill(email) {
  const emailField = document.getElementById("input-email");
  const passwordField = document.getElementById("input-password");

  if (emailField && passwordField) {
    emailField.value = email;
    passwordField.value = "securedPassword123";
  }
}

/* Handles application redirection paths uniformly across all system engines */
function redirectToPage(role) {
  if (role === "employee") window.location.href = "employee.html";
  else if (role === "approving") window.location.href = "approving.html";
  else if (role === "finance") window.location.href = "finance.html";
}

/* Clears active tracking signatures during session logout sequences */
function handleLogout() {
  localStorage.removeItem("claimflow_session");
  CURRENT_SESSION = null;
  window.location.href = "index.html";
}

/* Standard security helper to clean dynamic strings during template injection rendering loops */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
