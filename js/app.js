/* ClaimFlow Portal - core engine architecture & lifecycle manager */

let CLAIMS_DB = [];
let CURRENT_SESSION = null;
let SELECTED_FINANCE_CLAIMS = new Set();
let ACTIVE_AUDIT_FILTER = "All";

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

// attach core listeners on initial page compilation loop
document.addEventListener("DOMContentLoaded", () => {
  loadDatabaseState();
  syncAuthenticationSession();
  initializePageModuleView();
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
    if (!currentPath.endsWith("index.html") && !currentPath.endsWith("/")) {
      window.location.href = "index.html";
    }
  }
}

/* identifies which page is running & safely triggers its layout renderer modules */
function initializePageModuleView() {
  const currentPath = window.location.pathname;

  if (currentPath.endsWith("employee.html")) {
    renderEmployeeRecentClaims();
    setupDropzoneListeners();
  } else if (currentPath.endsWith("approving.html")) {
    renderManagerDashboard();
  } else if (currentPath.endsWith("finance.html")) {
    // read view tracking sub-state from session context / fall back to 'audit'
    const preservedSubTab =
      CURRENT_SESSION && CURRENT_SESSION.currentView === "finance-payment"
        ? "payment"
        : "audit";
    switchFinanceTab(preservedSubTab);
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

/* authenticates credentials context inside sign-in page views */
function handleSignIn(event) {
  event.preventDefault();
  const emailInput = document.getElementById("input-email").value.trim();

  let resolvedRole = "employee";
  if (emailInput.includes("manager") || emailInput.includes("approving")) {
    resolvedRole = "approving";
  } else if (emailInput.includes("finance")) {
    resolvedRole = "finance";
  }

  CURRENT_SESSION = {
    email: emailInput,
    role: resolvedRole,
    currentView: resolvedRole === "finance" ? "finance-audit" : resolvedRole, // default finance views to audit logs directly
    sessionStart: new Date().toISOString(),
  };

  localStorage.setItem("claimflow_session", JSON.stringify(CURRENT_SESSION));
  redirectToPage(resolvedRole);
}

/* employee workspace module unctions */
function renderEmployeeRecentClaims() {
  const listingWrapper = document.getElementById("employee-recent-claims-list");
  if (!listingWrapper) return;

  listingWrapper.innerHTML = "";
  const activeUserEmail = CURRENT_SESSION ? CURRENT_SESSION.email : "";

  // filter rows created by this specific user session footprint
  const userClaims = CLAIMS_DB.filter(
    (claim) =>
      claim.employee.toLowerCase() ===
        activeUserEmail.split("@")[0].replace(".", " ").toLowerCase() ||
      claim.actor === activeUserEmail,
  );

  // fallback to all matching logs if workspace simulation registers no localized records
  const evaluationSet = userClaims.length > 0 ? userClaims : CLAIMS_DB;

  evaluationSet.forEach((claim) => {
    let statusClass = "badge-pending";
    if (claim.status === "Endorsed") statusClass = "badge-endorsed";
    else if (claim.status === "Approved" || claim.status === "Paid")
      statusClass = "badge-approved";
    else if (claim.status === "Rejected") statusClass = "badge-rejected";

    const itemCard = document.createElement("div");
    itemCard.className =
      "claim-item-card d-flex justify-content-between align-items-center animate-fade-in";
    itemCard.innerHTML = `
      <div>
        <div class="claim-meta-title" style="font-weight:600; color:#1e293b;">${escapeHtml(claim.type)}</div>
        <div class="claim-meta-sub mt-1" style="font-size:0.8rem; color:#64748b;">
          <span class="me-2"><i class="fa-regular fa-calendar me-1"></i>${claim.date}</span>
          <span class="badge ${statusClass}">${claim.status}</span>
        </div>
      </div>
      <div class="claim-amount-display" style="font-weight:700; color:#0f172a;">$${claim.amount.toFixed(2)}</div>
    `;
    listingWrapper.appendChild(itemCard);
  });
}

function handleClaimSubmission(event) {
  event.preventDefault();

  const title = document.getElementById("emp-claim-title").value.trim();
  const date = document.getElementById("emp-claim-date").value;
  const category = document.getElementById("emp-claim-category").value;
  const amount = parseFloat(document.getElementById("emp-claim-amount").value);

  const activeUserEmail = CURRENT_SESSION
    ? CURRENT_SESSION.email
    : "employee@company.com";
  const parsedName = activeUserEmail
    .split("@")[0]
    .replace(".", " ")
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

  const newClaimId = `CLM-${String(CLAIMS_DB.length + 1).padStart(3, "0")}`;
  const now = new Date();
  let hours = now.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const timestampTime = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;

  const newRecord = {
    id: newClaimId,
    employee: parsedName,
    date: date,
    time: timestampTime,
    type: category,
    department: "Sales", // fallback tracking alignment configuration context
    amount: amount,
    status: "Pending",
    actor: parsedName,
    role: "Employee",
    action: "Claim submitted",
    bank: "**** " + Math.floor(1000 + Math.random() * 9000),
  };

  CLAIMS_DB.unshift(newRecord);
  localStorage.setItem("claimflow_db", JSON.stringify(CLAIMS_DB));

  document.getElementById("claim-submission-form").reset();
  const dropzoneText = document.getElementById("dropzone-text");
  if (dropzoneText)
    dropzoneText.textContent =
      "Drag and drop your receipt here, or click to browse";

  renderEmployeeRecentClaims();
  alert(
    `Claim ${newClaimId} successfully generated and submitted for management review!`,
  );
}

function triggerFileBrowser() {
  document.getElementById("receipt-native-file").click();
}

function handleFileSelected(event) {
  const file = event.target.files[0];
  if (file) {
    document.getElementById("dropzone-text").innerHTML =
      `<strong>Selected Document:</strong> ${escapeHtml(file.name)} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
  }
}

function setupDropzoneListeners() {
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

  dropzone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file) {
      document.getElementById("receipt-native-file").files = dt.files;
      document.getElementById("dropzone-text").innerHTML =
        `<strong>Dropped Document:</strong> ${escapeHtml(file.name)} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    }
  });
}

/* approving officer workspace module functions */
function renderManagerDashboard() {
  const tbody = document.getElementById("manager-claims-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  updateManagerWidgetCounts();

  const searchInput = document
    .getElementById("search-manager-claims")
    .value.toLowerCase();
  const statusFilter = document.getElementById("filter-manager-status").value;

  // build reactive presentation layout lists based on current runtime constraints
  const recordsToDisplay = CLAIMS_DB.filter((claim) => {
    const matchesSearch =
      claim.employee.toLowerCase().includes(searchInput) ||
      claim.type.toLowerCase().includes(searchInput);
    const matchesStatus =
      statusFilter === "All Status" ? true : claim.status === statusFilter;
    const matchesDept = claim.department === "Sales"; // departmental access control validation context
    return matchesSearch && matchesStatus && matchesDept;
  });

  if (recordsToDisplay.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-secondary">No historical matches matched criteria.</td></tr>`;
    return;
  }

  recordsToDisplay.forEach((claim) => {
    const tr = document.createElement("tr");

    let statusBadgeClass = "badge-pending";
    if (claim.status === "Endorsed") statusBadgeClass = "badge-endorsed";
    else if (claim.status === "Approved" || claim.status === "Paid")
      statusBadgeClass = "badge-approved";
    else if (claim.status === "Rejected") statusBadgeClass = "badge-rejected";

    tr.innerHTML = `
      <td><div class="font-semibold text-dark">${escapeHtml(claim.employee)}</div></td>
      <td><div class="text-secondary">${claim.date}</div></td>
      <td><span class="badge bg-light text-dark border font-medium">${escapeHtml(claim.type)}</span></td>
      <td><div class="text-secondary">${claim.department}</div></td>
      <td class="text-end font-bold text-dark">$${claim.amount.toFixed(2)}</td>
      <td class="text-center">
        ${
          claim.status === "Pending"
            ? `<div class="d-flex justify-content-center gap-2">
                 <button class="btn btn-sm btn-action-endorse" onclick="updateClaimStatus('${claim.id}', 'Endorsed')"><i class="fa-solid fa-check me-1"></i>Endorse</button>
                 <button class="btn btn-sm btn-action-reject" onclick="updateClaimStatus('${claim.id}', 'Rejected')"><i class="fa-solid fa-xmark me-1"></i>Reject</button>
               </div>`
            : `<span class="badge ${statusBadgeClass}">${claim.status}</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateManagerWidgetCounts() {
  const pendingCounterEl = document.getElementById("badge-pending-count");
  if (!pendingCounterEl) return;

  const pendingCount = CLAIMS_DB.filter(
    (claim) => claim.status === "Pending" && claim.department === "Sales",
  ).length;
  pendingCounterEl.textContent = pendingCount;
}

function updateClaimStatus(claimId, targetStatus) {
  const activeUserEmail = CURRENT_SESSION
    ? CURRENT_SESSION.email
    : "approving@company.com";
  const matchIndex = CLAIMS_DB.findIndex((claim) => claim.id === claimId);

  if (matchIndex !== -1) {
    CLAIMS_DB[matchIndex].status = targetStatus;
    CLAIMS_DB[matchIndex].actor = activeUserEmail
      .split("@")[0]
      .replace(".", " ")
      .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
    CLAIMS_DB[matchIndex].role = "Approving Officer";
    CLAIMS_DB[matchIndex].action = `Claim ${targetStatus.toLowerCase()}`;

    // track execution timing precisely inside database structures
    const now = new Date();
    CLAIMS_DB[matchIndex].date = now.toISOString().split("T")[0];
    let hours = now.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    CLAIMS_DB[matchIndex].time =
      `${String(hours).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} ${ampm}`;

    localStorage.setItem("claimflow_db", JSON.stringify(CLAIMS_DB));
    renderManagerDashboard();
  }
}

/* finance module controller subviews engineering (audit / payment queue) */
function switchFinanceTab(targetTab) {
  const tabPayment = document.getElementById("tab-btn-payment");
  const tabAudit = document.getElementById("tab-btn-audit");
  const viewPayment = document.getElementById("subview-finance-payment");
  const viewAudit = document.getElementById("subview-finance-audit");

  if (!tabPayment || !tabAudit) return;

  // sync sub-state inside session layout footprints dynamically to preserve state over refresh
  if (CURRENT_SESSION) {
    CURRENT_SESSION.currentView = `finance-${targetTab}`;
    localStorage.setItem("claimflow_session", JSON.stringify(CURRENT_SESSION));
  }

  // clear tracking references across context transitions safely
  SELECTED_FINANCE_CLAIMS.clear();

  if (targetTab === "payment") {
    tabPayment.classList.add("active");
    tabAudit.classList.remove("active");
    viewPayment.classList.remove("d-none");
    viewAudit.classList.add("d-none");
    renderFinancePaymentQueue();
  } else {
    tabPayment.classList.remove("active");
    tabAudit.classList.add("active");
    viewPayment.classList.add("d-none");
    viewAudit.classList.remove("d-none");
    renderAuditTrailDashboard();
  }
}

function renderFinancePaymentQueue() {
  const tbody = document.getElementById("finance-payment-tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  const searchInput = document
    .getElementById("search-finance-queue")
    .value.toLowerCase();

  // deduplicate & filter data matrix records matching processing criteria
  const verifiedIds = new Set();
  const queueRecords = CLAIMS_DB.filter((claim) => {
    if (claim.status !== "Endorsed") return false;
    if (verifiedIds.has(claim.id)) return false; // prevent duplicates instantly

    const matchesSearch =
      claim.id.toLowerCase().includes(searchInput) ||
      claim.employee.toLowerCase().includes(searchInput);
    if (matchesSearch) {
      verifiedIds.add(claim.id);
      return true;
    }
    return false;
  });

  if (queueRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-secondary">No endorsed claims waiting in payment queues.</td></tr>`;
    updateFinanceSummaryTotals();
    return;
  }

  queueRecords.forEach((claim) => {
    const tr = document.createElement("tr");
    const isChecked = SELECTED_FINANCE_CLAIMS.has(claim.id);

    tr.innerHTML = `
      <td class="text-center">
        <input type="checkbox" class="form-check-input claim-select-checkbox" data-id="${claim.id}" ${isChecked ? "checked" : ""} onchange="handleFinanceRowSelection(this)">
      </td>
      <td><div class="font-semibold text-primary">${claim.id}</div></td>
      <td><div class="font-medium text-dark">${escapeHtml(claim.employee)}</div></td>
      <td><div class="text-secondary"><i class="fa-solid fa-credit-card me-2 opacity-50"></i>${claim.bank || "**** 9999"}</div></td>
      <td class="text-end font-bold text-dark">$${claim.amount.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });

  updateFinanceSummaryTotals();
}

function handleFinanceRowSelection(checkbox) {
  const claimId = checkbox.getAttribute("data-id");
  if (checkbox.checked) {
    SELECTED_FINANCE_CLAIMS.add(claimId);
  } else {
    SELECTED_FINANCE_CLAIMS.delete(claimId);
  }
  updateFinanceSummaryTotals();
}

function toggleSelectAllFinanceClaims(masterCheckbox) {
  const checkboxes = document.querySelectorAll(".claim-select-checkbox");
  checkboxes.forEach((cb) => {
    cb.checked = masterCheckbox.checked;
    const claimId = cb.getAttribute("data-id");
    if (masterCheckbox.checked) {
      SELECTED_FINANCE_CLAIMS.add(claimId);
    } else {
      SELECTED_FINANCE_CLAIMS.delete(claimId);
    }
  });
  updateFinanceSummaryTotals();
}

function updateFinanceSummaryTotals() {
  const totalAmountEl = document.getElementById("finance-selected-total");
  const counterEl = document.getElementById("selected-claims-count");
  const batchBtn = document.getElementById("btn-mark-as-paid");
  const masterCb = document.getElementById("checkbox-master-finance");

  if (!totalAmountEl || !counterEl) return;

  let computedSum = 0;
  SELECTED_FINANCE_CLAIMS.forEach((id) => {
    // find matching unique items matching this exact configuration index pointer
    const matchRecord = CLAIMS_DB.find((claim) => claim.id === id);
    if (matchRecord) computedSum += matchRecord.amount;
  });

  totalAmountEl.textContent = `$${computedSum.toFixed(2)}`;
  counterEl.textContent = SELECTED_FINANCE_CLAIMS.size;

  if (SELECTED_FINANCE_CLAIMS.size > 0) {
    batchBtn.classList.remove("disabled");
    batchBtn.removeAttribute("disabled");
  } else {
    batchBtn.classList.add("disabled");
    batchBtn.setAttribute("disabled", "true");
    if (masterCb) masterCb.checked = false;
  }
}

function processBatchDisbursement() {
  if (SELECTED_FINANCE_CLAIMS.size === 0) return;

  const activeUserEmail = CURRENT_SESSION
    ? CURRENT_SESSION.email
    : "finance@company.com";
  const actorName = activeUserEmail
    .split("@")[0]
    .replace(".", " ")
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  let hours = now.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const timeStr = `${String(hours).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} ${ampm}`;

  // process rows internally matching state items
  CLAIMS_DB.forEach((claim) => {
    if (SELECTED_FINANCE_CLAIMS.has(claim.id)) {
      claim.status = "Paid";
      claim.actor = actorName;
      claim.role = "Finance Officer";
      claim.action = "Claim paid & disbursed";
      claim.date = dateStr;
      claim.time = timeStr;
    }
  });

  localStorage.setItem("claimflow_db", JSON.stringify(CLAIMS_DB));
  alert(
    `Disbursement confirmed for ${SELECTED_FINANCE_CLAIMS.size} claim entries seamlessly!`,
  );

  SELECTED_FINANCE_CLAIMS.clear();
  renderFinancePaymentQueue();
}

/* finance module audit trail engine */
function setAuditStatusFilter(filterValue) {
  ACTIVE_AUDIT_FILTER = filterValue;
  const buttons = document.querySelectorAll(".segmented-control .segment-btn");
  buttons.forEach((btn) => {
    if (btn.id === `audit-filter-${filterValue}`) btn.classList.add("active");
    else btn.classList.remove("active");
  });
  renderAuditTrailDashboard();
}

function renderAuditTrailDashboard() {
  const tableBody = document.getElementById("finance-audit-tbody");
  const paginationText = document.getElementById("audit-pagination-text");
  const summaryTotalText = document.getElementById("audit-summary-total");

  if (!tableBody) return;

  tableBody.innerHTML = "";
  const query = document
    .getElementById("search-audit-trail")
    .value.toLowerCase();

  const activeLogs = CLAIMS_DB.filter((log) => {
    const matchesSearch =
      log.id.toLowerCase().includes(query) ||
      log.employee.toLowerCase().includes(query) ||
      log.actor.toLowerCase().includes(query);

    let matchesFilter = true;
    if (ACTIVE_AUDIT_FILTER === "Submitted")
      matchesFilter = log.status === "Pending";
    else if (ACTIVE_AUDIT_FILTER !== "All")
      matchesFilter = log.status === ACTIVE_AUDIT_FILTER;

    return matchesSearch && matchesFilter;
  });

  if (activeLogs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-secondary">No audit trail records found.</td></tr>`;
    if (paginationText)
      paginationText.textContent = "Showing 0 of 0 total entries";
    if (summaryTotalText) summaryTotalText.textContent = "Total Claims: 0";
    return;
  }

  activeLogs.forEach((log) => {
    const tableRow = document.createElement("tr");

    let roleBadgeClass = "bg-primary text-white";
    if (log.role === "Approving Officer")
      roleBadgeClass = "bg-warning text-dark";
    else if (log.role === "Finance Officer")
      roleBadgeClass = "bg-success text-white";

    tableRow.innerHTML = `
      <td><div class="text-dark small"><i class="fa-regular fa-clock me-1 text-muted"></i>${log.date} <span class="text-secondary">${log.time}</span></div></td>
      <td><span class="font-mono font-bold text-primary">${log.id}</span></td>
      <td><div class="font-medium text-dark">${escapeHtml(log.employee)}</div></td>
      <td class="text-end font-bold text-dark">$${log.amount.toFixed(2)}</td>
      <td><span class="text-dark"><i class="fa-solid fa-circle-info me-1 text-secondary small-dot"></i>${escapeHtml(log.action)}</span></td>
      <td class="font-semibold">${escapeHtml(log.actor)}</td>
      <td><span class="badge ${roleBadgeClass}" style="font-size:0.75rem; font-weight:500;">${log.role}</span></td>
    `;
    tableBody.appendChild(tableRow);
  });

  if (paginationText)
    paginationText.textContent = `Showing ${activeLogs.length} of ${activeLogs.length} entries`;
  if (summaryTotalText)
    summaryTotalText.textContent = `Total Claims: ${CLAIMS_DB.length}`;
}

function exportAuditTrailToCSV() {
  if (CLAIMS_DB.length === 0) return;
  let csvContent =
    "data:text/csv;charset=utf-8,Timestamp Date,Timestamp Time,Claim ID,Category,Employee Name,Amount,Action log,Executed By Actor,System Role\n";

  CLAIMS_DB.forEach((log) => {
    const matrixRow = [
      `"${log.date}"`,
      `"${log.time}"`,
      `"${log.id}"`,
      `"${log.type}"`,
      `"${log.employee.replace(/"/g, '""')}"`,
      `"${log.amount.toFixed(2)}"`,
      `"${log.action.replace(/"/g, '""')}"`,
      `"${log.actor.replace(/"/g, '""')}"`,
      `"${log.role}"`,
    ];
    csvContent += matrixRow.join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const triggerAnchor = document.createElement("a");
  triggerAnchor.setAttribute("href", encodedUri);
  triggerAnchor.setAttribute(
    "download",
    `ClaimFlow_Audit_Trail_${new Date().toISOString().split("T")[0]}.csv`,
  );
  document.body.appendChild(triggerAnchor);
  triggerAnchor.click();
  document.body.removeChild(triggerAnchor);
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
