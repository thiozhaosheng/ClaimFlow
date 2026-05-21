/* ClaimFlow Portal - core engine architecture & lifecycle manager */

let CLAIMS_DB = [];
let CURRENT_SESSION = null;

// baseline testing data matrix to seed the system runtime environment
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
  {
    id: "CLM-002",
    employee: "Michael Chen",
    date: "2026-05-10",
    time: "10:30 AM",
    type: "Travel",
    department: "Engineering",
    amount: 450.0,
    status: "Endorsed",
    actor: "Lisa Wang",
    role: "Approving Officer",
    action: "Endorsed by approving officer",
    bank: "**** 4589",
  },
  {
    id: "CLM-003",
    employee: "Emily Davis",
    date: "2026-05-06",
    time: "11:45 AM",
    type: "Medical",
    department: "HR",
    amount: 85.0,
    status: "Paid",
    actor: "Emily Davis",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 9012",
  },
  {
    id: "CLM-003",
    employee: "Emily Davis",
    date: "2026-05-07",
    time: "09:20 AM",
    type: "Medical",
    department: "HR",
    amount: 85.0,
    status: "Paid",
    actor: "David Park",
    role: "Approving Officer",
    action: "Endorsed by approving officer",
    bank: "**** 9012",
  },
  {
    id: "CLM-003",
    employee: "Emily Davis",
    date: "2026-05-08",
    time: "03:15 PM",
    type: "Medical",
    department: "HR",
    amount: 85.0,
    status: "Paid",
    actor: "Finance Admin",
    role: "Finance Admin",
    action: "Marked as paid",
    bank: "**** 9012",
  },
  {
    id: "CLM-004",
    employee: "Alex Rodriguez",
    date: "2026-05-13",
    time: "08:30 AM",
    type: "Meal",
    department: "Sales",
    amount: 120.0,
    status: "Pending",
    actor: "Alex Rodriguez",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 3341",
  },
  {
    id: "CLM-005",
    employee: "Jennifer Martinez",
    date: "2026-05-14",
    time: "10:15 AM",
    type: "Training",
    department: "Sales",
    amount: 75.0,
    status: "Pending",
    actor: "Jennifer Martinez",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 7762",
  },
  {
    id: "CLM-006",
    employee: "Robert Kim",
    date: "2026-05-13",
    time: "04:30 PM",
    type: "Travel",
    department: "Sales",
    amount: 45.0,
    status: "Pending",
    actor: "Robert Kim",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 5521",
  },
];git add css/style.css

// attach core listeners on initial page compilation loop
document.addEventListener("DOMContentLoaded", () => {
  loadDatabaseState();
  syncAuthenticationSession();
  setupRoleSwitcherTabs();

  // specific runtime loader condition for employee workflow elements
  if (document.getElementById("view-employee")) {
    initEmployeeWorkspace();
  }
});

/* handles database instantiation from persistent localStorage */
function loadDatabaseState() {
  const savedDb = localStorage.getItem("claimflow_db");
  if (savedDb) {
    CLAIMS_DB = JSON.parse(savedDb);
  } else {
    CLAIMS_DB = [...DEFAULT_INITIAL_RECORDS];
    localStorage.setItem("claimflow_db", JSON.stringify(CLAIMS_DB));
  }
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

/* Synchronizes the visibility and active tab properties of the multi-role navigation bar */
function setupRoleSwitcherTabs() {
  if (!CURRENT_SESSION) return;

  const currentPath = window.location.pathname;

  // Highlight active link depending on layout page
  if (currentPath.endsWith("employee.html")) {
    setActiveNavTab("nav-btn-employee");
  } else if (currentPath.endsWith("approving.html")) {
    setActiveNavTab("nav-btn-approving");
  } else if (currentPath.endsWith("finance.html")) {
    setActiveNavTab("nav-btn-finance");
  }
}

function setActiveNavTab(activeId) {
  ["nav-btn-employee", "nav-btn-approving", "nav-btn-finance"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      if (id === activeId) el.classList.add("active");
      else el.classList.remove("active");
    }
  });
}

/* build current application session state footprint */
function handleSignIn(event) {
  event.preventDefault();

  const emailInput = document
    .getElementById("input-email")
    .value.trim()
    .toLowerCase();
  let resolvedRole = "employee";

  if (
    emailInput.includes("manager") ||
    emailInput.includes("approving") ||
    emailInput.includes("lisa")
  ) {
    resolvedRole = "approving";
  } else if (emailInput.includes("finance") || emailInput.includes("admin")) {
    resolvedRole = "finance";
  }

  CURRENT_SESSION = {
    email: emailInput,
    role: resolvedRole,
    currentView: resolvedRole,
    sessionStart: new Date().toISOString(),
  };

  localStorage.setItem("claimflow_session", JSON.stringify(CURRENT_SESSION));
  redirectToPage(resolvedRole);
}

/* populates form inputs instantly when sandbox shortcuts are clicked */
function quickFill(email) {
  const emailField = document.getElementById("input-email");
  const passwordField = document.getElementById("input-password");

  if (emailField && passwordField) {
    emailField.value = email;
    passwordField.value = "securedPassword123";
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

// employee module workspace - claims processing operations
let SELECTED_FILE_REF = null;

function initEmployeeWorkspace() {
  renderEmployeeClaimsList();
  setupDropzoneHandlers();
}

/* sets up drag-and-drop animation hooks for receipt file drops */
function setupDropzoneHandlers() {
  const dropzone = document.getElementById("receipt-dropzone");
  if (!dropzone) return;

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
      },
      false,
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
      },
      false,
    );
  });

  dropzone.addEventListener(
    "drop",
    (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        processSelectedFile(files[0]);
      }
    },
    false,
  );
}

function triggerFileBrowser() {
  const nativeInput = document.getElementById("receipt-native-file");
  if (nativeInput) nativeInput.click();
}

function handleFileSelected(event) {
  const files = event.target.files;
  if (files.length > 0) {
    processSelectedFile(files[0]);
  }
}

function processSelectedFile(file) {
  SELECTED_FILE_REF = file;
  const textContainer = document.getElementById("dropzone-text");
  if (textContainer) {
    textContainer.innerHTML = `<strong class="text-success"><i class="fa-solid fa-file-circle-check me-1"></i> Loaded: ${escapeHtml(file.name)}</strong>`;
  }
}

/* intercepts employee claim submissions & inserts records into the database local registry */
function handleClaimSubmission(event) {
  event.preventDefault();

  const titleInput = document.getElementById("emp-claim-title").value.trim();
  const dateInput = document.getElementById("emp-claim-date").value;
  const categoryInput = document.getElementById("emp-claim-category").value;
  const amountInput = parseFloat(
    document.getElementById("emp-claim-amount").value,
  );

  // generate unique sequential claim ID block
  const nextId = `CLM-00${CLAIMS_DB.length + 1}`;
  const now = new Date();
  const currentTimeString = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const newClaimRecord = {
    id: nextId,
    employee: CURRENT_SESSION
      ? CURRENT_SESSION.email.split("@")[0].replace(".", " ")
      : "Employee Account",
    email: CURRENT_SESSION ? CURRENT_SESSION.email : "employee@company.com",
    title: titleInput,
    date: dateInput,
    time: currentTimeString,
    type: categoryInput,
    department: "Operations",
    amount: amountInput,
    status: "Pending",
    actor: CURRENT_SESSION
      ? CURRENT_SESSION.email.split("@")[0].replace(".", " ")
      : "Employee",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 9911",
    receiptName: SELECTED_FILE_REF
      ? SELECTED_FILE_REF.name
      : "not_provided.pdf",
  };

  CLAIMS_DB.unshift(newClaimRecord);
  localStorage.setItem("claimflow_db", JSON.stringify(CLAIMS_DB));

  // reset form status and update listing panel
  document.getElementById("claim-submission-form").reset();
  SELECTED_FILE_REF = null;
  const textContainer = document.getElementById("dropzone-text");
  if (textContainer)
    textContainer.textContent =
      "Drag and drop your receipt here, or click to browse";

  renderEmployeeClaimsList();
  alert(`Claim request ${nextId} submitted successfully!`);
}

/* renders claims belonging to the active user in the side column */
function renderEmployeeClaimsList() {
  const listingWrapper = document.getElementById("employee-recent-claims-list");
  if (!listingWrapper) return;

  listingWrapper.innerHTML = "";

  // filter down to records that match the currently authenticated profile
  const activeUserEmail = CURRENT_SESSION
    ? CURRENT_SESSION.email
    : "sarah.employee@company.com";
  const userClaims = CLAIMS_DB.filter(
    (claim) => claim.email === activeUserEmail,
  );

  if (userClaims.length === 0) {
    listingWrapper.innerHTML = `<div class="text-center py-4 text-secondary small">No historical entries recorded.</div>`;
    return;
  }

  userClaims.forEach((claim) => {
    let statusClass = "badge-pending";
    if (claim.status === "Endorsed") statusClass = "badge-endorsed";
    else if (claim.status === "Approved") statusClass = "badge-approved";
    else if (claim.status === "Rejected") statusClass = "badge-rejected";

    const itemCard = document.createElement("div");
    itemCard.className =
      "claim-item-card d-flex justify-content-between align-items-center";
    itemCard.innerHTML = `
      <div>
        <div class="claim-meta-title">${escapeHtml(claim.title || claim.type)}</div>
        <div class="claim-meta-sub">
          <span class="me-2"><i class="fa-regular fa-calendar me-1"></i>${claim.date}</span>
          <span class="badge ${statusClass}">${claim.status}</span>
        </div>
      </div>
      <div class="claim-amount-display">$${claim.amount.toFixed(2)}</div>
    `;
    listingWrapper.appendChild(itemCard);
  });
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
