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
];

document.addEventListener("DOMContentLoaded", () => {
  loadDatabaseState();
  syncAuthenticationSession();
  initializeDragAndDropSupport();
  executePageSpecificInitialization();
});

// attach core listeners on initial page compilation loop
document.addEventListener("DOMContentLoaded", () => {
  loadDatabaseState();
  syncAuthenticationSession();

  // initialize view specific layout scripts if corresponding containers exist
  if (document.getElementById("view-employee")) {
    renderEmployeeDashboard();
    setupDropzoneHandlers();
  }

  if (document.getElementById("view-approving")) {
    renderManagerDashboard();
  }
});

/* handles database instantiation from persistent storage cache environments */
function loadDatabaseState() {
  const savedDb = localStorage.getItem("claimflow_db");
  if (savedDb) {
    CLAIMS_DB = JSON.parse(savedDb);
  } else {
    CLAIMS_DB = [...DEFAULT_INITIAL_RECORDS];
    localStorage.setItem("claimflow_db", JSON.stringify(CLAIMS_DB));
  }
}

/* evaluates operational authentication parameters and intercepts route entries */
function syncAuthenticationSession() {
  const savedSession = localStorage.getItem("claimflow_session");
  const currentPath = window.location.pathname;

  if (savedSession) {
    CURRENT_SESSION = JSON.parse(savedSession);

    // populate user signature element across workspaces if present
    const userEmailEl = document.getElementById("current-user-email");
    if (userEmailEl) {
      userEmailEl.textContent = CURRENT_SESSION.email;
    }

    // auto-redirect if an active session tries to navigate back to the sign-in page
    if (currentPath.endsWith("index.html") || currentPath.endsWith("/")) {
      redirectToPage(CURRENT_SESSION.currentView);
    }
  } else {
    // escape layout intercept if user accesses secured internal branches unauthenticated
    if (!currentPath.endsWith("index.html") && !currentPath.endsWith("/")) {
      window.location.href = "index.html";
    }
  }
}

/* executes login authentication checks, resolves roles & configures active contexts */
function handleSignIn(event) {
  event.preventDefault();

  const emailInput = document
    .getElementById("input-email")
    .value.trim()
    .toLowerCase();
  let resolvedRole = "employee";

  // role resolution filter ruleset matching corporate structural profiles
  if (
    emailInput.includes("manager") ||
    emailInput.includes("approving") ||
    emailInput.includes("lisa")
  ) {
    resolvedRole = "approving";
  } else if (emailInput.includes("finance") || emailInput.includes("admin")) {
    resolvedRole = "finance";
  }

  // build current application session state footprint
  CURRENT_SESSION = {
    email: emailInput,
    role: resolvedRole,
    currentView: resolvedRole,
    sessionStart: new Date().toISOString(),
  };

  localStorage.setItem("claimflow_session", JSON.stringify(CURRENT_SESSION));
  redirectToPage(resolvedRole);
}

/* handles application redirection paths uniformly across all system engines */
function redirectToPage(role) {
  if (role === "employee") window.location.href = "employee.html";
  else if (role === "approving") window.location.href = "approving.html";
  else if (role === "finance") window.location.href = "finance.html";
}

/* clears active tracking signatures during session logout sequences */
function handleLogout() {
  localStorage.removeItem("claimflow_session");
  CURRENT_SESSION = null;
  window.location.href = "index.html";
}

/* standard security helper to clean dynamic strings during template injection rendering loops */
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* new employee core execution subroutines & workspace managers */

/* compiles & renders historical records matching the active employee session context */
function renderEmployeeDashboard() {
  const listingWrapper = document.getElementById("employee-recent-claims-list");
  if (!listingWrapper) return;

  listingWrapper.innerHTML = "";

  const activeUserEmail = CURRENT_SESSION ? CURRENT_SESSION.email : "";

  const userClaims = CLAIMS_DB.filter(
    (claim) =>
      claim.email?.toLowerCase() === activeUserEmail.toLowerCase() ||
      activeUserEmail.includes("employee"),
  );

  if (userClaims.length === 0) {
    listingWrapper.innerHTML = `<div class="text-center py-4 text-secondary small">No historical entries recorded.</div>`;
    return;
  }

  userClaims.reverse().forEach((claim) => {
    let statusClass = "badge-pending";
    if (claim.status === "Endorsed") statusClass = "badge-endorsed";
    else if (claim.status === "Approved") statusClass = "badge-approved";
    else if (claim.status === "Rejected") statusClass = "badge-rejected";
    else if (claim.status === "Paid") statusClass = "badge-paid";

    const itemCard = document.createElement("div");
    itemCard.className =
      "claim-item-card d-flex justify-content-between align-items-center";
    itemCard.innerHTML = `
      <div>
        <div class="claim-meta-title">${escapeHtml(claim.title || claim.type + " Claim")}</div>
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

/* processes claim form inputs, registers unique parameters, & saves states inside storage */
function handleClaimSubmission(event) {
  event.preventDefault();

  const titleInput = document.getElementById("emp-claim-title").value.trim();
  const dateInput = document.getElementById("emp-claim-date").value;
  const categoryInput = document.getElementById("emp-claim-category").value;
  const amountInput = parseFloat(
    document.getElementById("emp-claim-amount").value,
  );

  const generatedId = `CLM-${String(CLAIMS_DB.length + 1).padStart(3, "0")}`;
  const currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const newClaimRecord = {
    id: generatedId,
    employee: CURRENT_SESSION
      ? CURRENT_SESSION.email.split("@")[0].replace(".", " ")
      : "Employee Profile",
    email: CURRENT_SESSION ? CURRENT_SESSION.email : "employee@company.com",
    title: titleInput,
    date: dateInput,
    time: currentTime,
    type: categoryInput,
    department: "Sales",
    amount: amountInput,
    status: "Pending",
    actor: CURRENT_SESSION ? CURRENT_SESSION.email : "Employee",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 9999",
  };

  CLAIMS_DB.push(newClaimRecord);
  localStorage.setItem("claimflow_db", JSON.stringify(CLAIMS_DB));

  document.getElementById("claim-submission-form").reset();
  resetDropzoneUI();

  renderEmployeeDashboard();
}

/* programmatically routes element touch triggers directly to native browser file system pickers */
function triggerFileBrowser() {
  const nativeFileInput = document.getElementById("receipt-native-file");
  if (nativeFileInput) nativeFileInput.click();
}

/* captures file selections executed via internal system prompt selections */
function handleFileSelected(event) {
  const fileArray = event.target.files;
  if (fileArray.length > 0) {
    updateDropzoneFeedback(fileArray[0].name);
  }
}

/* binds active event listeners to handle layout visualization & custom drag-drop captures */
function setupDropzoneHandlers() {
  const dropzoneEl = document.getElementById("receipt-dropzone");
  if (!dropzoneEl) return;

  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropzoneEl.addEventListener(
      eventName,
      (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      false,
    );
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzoneEl.addEventListener(
      eventName,
      () => dropzoneEl.classList.add("dragover"),
      false,
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzoneEl.addEventListener(
      eventName,
      () => dropzoneEl.classList.remove("dragover"),
      false,
    );
  });

  dropzoneEl.addEventListener("drop", (e) => {
    const dataTransferObj = e.dataTransfer;
    const fileArray = dataTransferObj.files;

    if (fileArray.length > 0) {
      const nativeFileInput = document.getElementById("receipt-native-file");
      if (nativeFileInput) nativeFileInput.files = fileArray;
      updateDropzoneFeedback(fileArray[0].name);
    }
  });
}

function updateDropzoneFeedback(fileName) {
  const textualFeedback = document.getElementById("dropzone-text");
  if (textualFeedback) {
    textualFeedback.innerHTML = `<strong class="text-success"><i class="fa-solid fa-circle-check me-1"></i> Attached:</strong> ${escapeHtml(fileName)}`;
  }
}

function resetDropzoneUI() {
  const textualFeedback = document.getElementById("dropzone-text");
  if (textualFeedback) {
    textualFeedback.textContent =
      "Drag and drop your receipt here, or click to browse";
  }
}

/* approving officer execution subroutines & workflow dashboard engine */

/* filters rows dynamically, triggers metrics counting checks, and draws the table grid */
function renderManagerDashboard() {
  const tbody = document.getElementById("manager-claims-tbody");
  if (!tbody) return;

  // retrieve matching configuration selectors
  const statusFilter = document.getElementById("filter-manager-status").value;
  const deptFilter = document.getElementById("filter-manager-dept").value;
  const searchQuery = document
    .getElementById("search-manager-claims")
    .value.toLowerCase()
    .trim();

  tbody.innerHTML = "";

  // filter records matching selected rulesets
  const filteredClaims = CLAIMS_DB.filter((claim) => {
    // 1. status Filter interception logic
    if (statusFilter !== "All Status" && claim.status !== statusFilter)
      return false;

    // 2. department filter interception logic
    if (deptFilter !== "All" && claim.department !== deptFilter) return false;

    // 3. structural text keyword exploration lookup filter bounds
    if (searchQuery) {
      const employeeMatch = claim.employee.toLowerCase().includes(searchQuery);
      const titleMatch = (claim.title || "")
        .toLowerCase()
        .includes(searchQuery);
      const categoryMatch = claim.type.toLowerCase().includes(searchQuery);
      if (!employeeMatch && !titleMatch && !categoryMatch) return false;
    }

    return true;
  });

  // execute secondary stats aggregation loop cycle pass over records matching constraints
  updateManagerWidgetCounts();

  if (filteredClaims.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-secondary">No rows match your current filter parameters.</td></tr>`;
    return;
  }

  // map array components out directly into layout compilation strings
  filteredClaims.forEach((claim) => {
    let statusBadgeClass = "badge-pending";
    if (claim.status === "Endorsed") statusBadgeClass = "badge-endorsed";
    else if (claim.status === "Approved") statusBadgeClass = "badge-approved";
    else if (claim.status === "Rejected") statusBadgeClass = "badge-rejected";
    else if (claim.status === "Paid") statusBadgeClass = "badge-paid";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="font-semibold">${escapeHtml(claim.employee)}</td>
      <td>${claim.date} <span class="text-secondary small block-span">${claim.time || ""}</span></td>
      <td>
        <span class="font-medium">${escapeHtml(claim.type)}</span>
        <span class="text-secondary small block-span">${escapeHtml(claim.title || "No description given")}</span>
      </td>
      <td><span class="badge bg-light text-dark border">${escapeHtml(claim.department)}</span></td>
      <td class="text-end font-bold">$${claim.amount.toFixed(2)}</td>
      <td class="text-center">
        ${
          claim.status === "Pending"
            ? `<div class="d-flex gap-1 justify-content-center">
                <button class="btn btn-action-endorse" onclick="updateClaimStatus('${claim.id}', 'Endorsed')">
                  <i class="fa-solid fa-check me-1"></i>Endorse
                </button>
                <button class="btn btn-action-reject" onclick="updateClaimStatus('${claim.id}', 'Rejected')">
                  <i class="fa-solid fa-xmark me-1"></i>Reject
                </button>
               </div>`
            : `<span class="badge ${statusBadgeClass}">${claim.status}</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* aggregates summary tracking values across runtime storage states */
function updateManagerWidgetCounts() {
  const pendingCounterEl = document.getElementById("badge-pending-count");
  if (!pendingCounterEl) return;

  // aggregate global records whose processing lifecycle states match "Pending"
  const pendingCount = CLAIMS_DB.filter(
    (claim) => claim.status === "Pending",
  ).length;
  pendingCounterEl.textContent = pendingCount;
}

/* modifies target configuration indices & writes system profile logs inside records storage */
function updateClaimStatus(claimId, targetStatus) {
  const activeUserEmail = CURRENT_SESSION
    ? CURRENT_SESSION.email
    : "Approving Officer";

  // find index pointer position matching requested signature mapping elements
  const matchIndex = CLAIMS_DB.findIndex((claim) => claim.id === claimId);

  if (matchIndex !== -1) {
    CLAIMS_DB[matchIndex].status = targetStatus;
    CLAIMS_DB[matchIndex].actor = activeUserEmail;
    CLAIMS_DB[matchIndex].role = "Approving Officer";
    CLAIMS_DB[matchIndex].action = `Claim ${targetStatus.toLowerCase()}`;

    // update persistent runtime memory array caches immediately
    localStorage.setItem("claimflow_db", JSON.stringify(CLAIMS_DB));

    // re-render layout grid updates visually
    renderManagerDashboard();
  }
}
