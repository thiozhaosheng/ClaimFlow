/* ClaimFlow Portal - core engine architecture & lifecycle manager */

let CLAIMS_DB = [];
let CURRENT_SESSION = null;

document.addEventListener("DOMContentLoaded", () => {
  loadDatabaseState();
  syncAuthenticationSession();
});

/* handles database instantiation from persistent localStorage */
function loadDatabaseState() {
  const savedDb = localStorage.getItem("claimflow_db");
  // database runtime initialization matches placeholder structures later
  CLAIMS_DB = savedDb ? JSON.parse(savedDb) : [];
}

/* evaluates valid session configurations across the browser path lifecycle */
function syncAuthenticationSession() {
  const savedSession = localStorage.getItem("claimflow_session");
  const currentPath = window.location.pathname;

  if (savedSession) {
    CURRENT_SESSION = JSON.parse(savedSession);
    const userEmailEl = document.getElementById("current-user-email");
    if (userEmailEl) userEmailEl.textContent = CURRENT_SESSION.email;
  } else {
    // session escape mechanism if route tracking detects unauthenticated entries
    if (!currentPath.endsWith("index.html") && !currentPath.endsWith("/")) {
      window.location.href = "index.html";
    }
  }
}

/* directs global route location state updates */
function redirectToPage(role) {
  if (role === "employee") window.location.href = "employee.html";
  else if (role === "approving") window.location.href = "approving.html";
  else if (role === "finance") window.location.href = "finance.html";
}

/* destroys session profiles safely during exit triggers */
function handleLogout() {
  localStorage.removeItem("claimflow_session");
  CURRENT_SESSION = null;
  window.location.href = "index.html";
}

/* encapsulates dynamic layout rendering string sanitization */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
