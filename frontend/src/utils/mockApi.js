// Mock API layer for local browsing without the backend.
// Routed by api.js when VITE_MOCK_API === "true".
// State lives in localStorage so a refresh keeps your changes.

import { ApiError } from "./api.js";

const CLAIMS_KEY = "claimflow_mock_claims";
const AUDIT_KEY = "claimflow_mock_audit";
const SESSION_KEY = "claimflow_mock_session";

const USERS = [
  {
    email: "demo.employee@claimflow.com",
    name: "Sarah Johnson",
    role: "Employee",
    department: "Sales",
  },
  {
    email: "demo.manager@claimflow.com",
    name: "Lisa Wang",
    role: "Manager",
    department: "Sales",
  },
  {
    email: "demo.finance@claimflow.com",
    name: "Finance Admin",
    role: "FinanceAdmin",
    department: "Finance",
  },
];

const MOCK_EMPLOYEES = [
  { name: "Sarah Johnson", email: "demo.employee@claimflow.com", department: "Sales" },
  { name: "Michael Chen", email: "michael.chen@claimflow.com", department: "Engineering" },
  { name: "Emily Davis", email: "emily.davis@claimflow.com", department: "HR" },
  { name: "Alex Rodriguez", email: "alex.rodriguez@claimflow.com", department: "Sales" },
  { name: "Jennifer Martinez", email: "jennifer.martinez@claimflow.com", department: "Marketing" },
  { name: "Robert Kim", email: "robert.kim@claimflow.com", department: "Sales" },
  { name: "Priya Nair", email: "priya.nair@claimflow.com", department: "Engineering" },
  { name: "James Wright", email: "james.wright@claimflow.com", department: "Operations" },
  { name: "Lin Mei", email: "lin.mei@claimflow.com", department: "Operations" },
  { name: "Daniel Tan", email: "daniel.tan@claimflow.com", department: "Engineering" },
  { name: "Aisha Rahman", email: "aisha.rahman@claimflow.com", department: "Marketing" },
  { name: "Thomas Lee", email: "thomas.lee@claimflow.com", department: "HR" },
].map((u) => ({ ...u, role: "Employee" }));

function buildClaim(id, employee, daysAgo, category, amount, status, merchant, hasReceipt = true) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const dateOnly = date.toISOString().slice(0, 10);
  return {
    id,
    user: employee,
    expenseDate: dateOnly,
    createdAt: new Date(date.getTime() + 3600000 * 9).toISOString(),
    category,
    amount,
    status,
    gstAmount: amount >= 30 ? Number((amount * 0.09 / 1.09).toFixed(2)) : null,
    merchant,
    receiptUrl: hasReceipt ? `mock://receipts/${id}.jpg` : null,
  };
}

const INITIAL_CLAIMS = [
  // recent (this week)
  buildClaim(1, MOCK_EMPLOYEES[0], 1, "Meal", 28.5, "Pending", "Toast Box"),
  buildClaim(2, MOCK_EMPLOYEES[1], 2, "Travel", 1450, "Endorsed", "Singapore Airlines"),
  buildClaim(3, MOCK_EMPLOYEES[2], 3, "Medical (statutory)", 85, "Paid", "Raffles Medical"),
  buildClaim(4, MOCK_EMPLOYEES[3], 1, "Meal", 120, "Pending", "Jumbo Seafood"),
  buildClaim(5, MOCK_EMPLOYEES[4], 3, "Training", 750, "Endorsed", "Coursera"),
  buildClaim(6, MOCK_EMPLOYEES[5], 2, "Transport", 45, "Endorsed", "Grab"),
  buildClaim(7, MOCK_EMPLOYEES[6], 4, "Office Supplies", 92, "Paid", "Popular Bookstore"),
  buildClaim(8, MOCK_EMPLOYEES[7], 5, "Client Entertainment", 380, "Endorsed", "Wolfgang Steakhouse"),

  // last week
  buildClaim(9, MOCK_EMPLOYEES[8], 8, "Transport", 32, "Paid", "Grab"),
  buildClaim(10, MOCK_EMPLOYEES[9], 9, "Meal", 18, "Paid", "Ya Kun"),
  buildClaim(11, MOCK_EMPLOYEES[10], 10, "Travel", 680, "Paid", "Hotel Royal"),
  buildClaim(12, MOCK_EMPLOYEES[11], 7, "Office Supplies", 145, "Paid", "Challenger"),
  buildClaim(13, MOCK_EMPLOYEES[0], 11, "Meal", 65, "Paid", "Din Tai Fung"),
  buildClaim(14, MOCK_EMPLOYEES[1], 12, "Transport", 22, "Paid", "MRT"),
  buildClaim(15, MOCK_EMPLOYEES[2], 14, "Training", 1200, "Paid", "Udemy Business"),

  // 2-3 weeks ago
  buildClaim(16, MOCK_EMPLOYEES[3], 16, "Client Entertainment", 220, "Paid", "Marina Bay Sands"),
  buildClaim(17, MOCK_EMPLOYEES[4], 17, "Transport", 78, "Paid", "Comfort Taxi"),
  buildClaim(18, MOCK_EMPLOYEES[5], 19, "Meal", 95, "Paid", "Crystal Jade"),
  buildClaim(19, MOCK_EMPLOYEES[6], 20, "Office Supplies", 230, "Paid", "Apple Singapore"),
  buildClaim(20, MOCK_EMPLOYEES[7], 22, "Travel", 2100, "Paid", "Cathay Pacific"),
  buildClaim(21, MOCK_EMPLOYEES[8], 21, "Meal", 42, "Paid", "Killiney Kopitiam"),

  // older
  buildClaim(22, MOCK_EMPLOYEES[9], 28, "Transport", 56, "Paid", "Gojek"),
  buildClaim(23, MOCK_EMPLOYEES[10], 30, "Meal", 110, "Paid", "Pizza Express"),
  buildClaim(24, MOCK_EMPLOYEES[11], 33, "Office Supplies", 460, "Paid", "Harvey Norman"),
  buildClaim(25, MOCK_EMPLOYEES[0], 35, "Training", 320, "Paid", "Pluralsight"),
  buildClaim(26, MOCK_EMPLOYEES[1], 40, "Travel", 980, "Paid", "AirAsia"),
  buildClaim(27, MOCK_EMPLOYEES[2], 45, "Client Entertainment", 540, "Paid", "Burnt Ends"),
  buildClaim(28, MOCK_EMPLOYEES[3], 50, "Meal", 35, "Paid", "Maxwell Food Centre"),
  buildClaim(29, MOCK_EMPLOYEES[4], 55, "Transport", 88, "Paid", "Tada"),
  buildClaim(30, MOCK_EMPLOYEES[5], 60, "Medical (statutory)", 145, "Paid", "Healthway Medical"),

  // a couple rejected for variety
  buildClaim(31, MOCK_EMPLOYEES[6], 6, "Meal", 280, "Rejected", "Cafe near office", false),
  buildClaim(32, MOCK_EMPLOYEES[7], 8, "Transport", 12, "Rejected", "Personal Grab"),
];

const INITIAL_AUDIT = [
  {
    id: 1,
    claimId: 1,
    createdAt: "2026-05-11T01:23:00Z",
    executor: USERS[0],
    action: "Claim submitted",
    newStatus: "Pending",
    remarks: null,
  },
  {
    id: 2,
    claimId: 2,
    createdAt: "2026-05-10T02:30:00Z",
    executor: USERS[1],
    action: "Endorsed by approving officer",
    newStatus: "Endorsed",
    remarks: null,
  },
  {
    id: 3,
    claimId: 3,
    createdAt: "2026-05-08T07:15:00Z",
    executor: USERS[2],
    action: "Marked as paid",
    newStatus: "Paid",
    remarks: null,
  },
];

function load(key, fallback) {
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // fall through to fallback
    }
  }
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function currentSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

function nextId(items) {
  return items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
}

function pushAudit(claimId, executor, action, newStatus, remarks = null) {
  const logs = load(AUDIT_KEY, INITIAL_AUDIT);
  logs.push({
    id: nextId(logs),
    claimId,
    createdAt: new Date().toISOString(),
    executor,
    action,
    newStatus,
    remarks,
  });
  save(AUDIT_KEY, logs);
}

async function get(path) {
  if (path === "/api/auth/me") {
    const session = currentSession();
    if (!session) {
      throw new ApiError("Not signed in", { status: 401 });
    }
    return session;
  }
  if (path === "/api/claims/my") {
    const session = currentSession();
    const claims = load(CLAIMS_KEY, INITIAL_CLAIMS).filter(
      (c) => c.user.email === session?.email,
    );
    return { data: { claims } };
  }
  if (path === "/api/claims") {
    return { data: { claims: load(CLAIMS_KEY, INITIAL_CLAIMS) } };
  }
  if (path === "/api/workflow/audit") {
    return { data: { logs: load(AUDIT_KEY, INITIAL_AUDIT) } };
  }
  throw new ApiError(`Mock: no handler for GET ${path}`, { status: 404 });
}

async function post(path, body) {
  if (path === "/api/auth/login") {
    const user = USERS.find((u) => u.email === body.email);
    if (!user) {
      throw new ApiError("No such account in mock mode", { status: 401 });
    }
    const session = {
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    };
    save(SESSION_KEY, session);
    return { token: "mock-token", user };
  }
  if (path === "/api/claims") {
    const session = currentSession();
    const user = USERS.find((u) => u.email === session?.email) || USERS[0];
    const claims = load(CLAIMS_KEY, INITIAL_CLAIMS);
    const claim = {
      id: nextId(claims),
      user,
      expenseDate: body.expenseDate,
      createdAt: new Date().toISOString(),
      category: body.category,
      amount: body.amount,
      status: "Pending",
      gstAmount: body.gstAmount,
      merchant: body.merchant,
      receiptUrl: body.receiptUrl || null,
    };
    claims.push(claim);
    save(CLAIMS_KEY, claims);
    pushAudit(claim.id, user, "Claim submitted", "Pending");
    return { data: { claim } };
  }
  throw new ApiError(`Mock: no handler for POST ${path}`, { status: 404 });
}

async function patch(path, body) {
  const reviewMatch = path.match(/^\/api\/workflow\/review\/(\d+)$/);
  if (reviewMatch) {
    const id = Number(reviewMatch[1]);
    const claims = load(CLAIMS_KEY, INITIAL_CLAIMS);
    const claim = claims.find((c) => c.id === id);
    if (!claim) {
      throw new ApiError("Claim not found", { status: 404 });
    }
    const session = currentSession();
    const executor =
      USERS.find((u) => u.email === session?.email) || USERS[1];
    if (body.action === "approve") {
      claim.status = "Endorsed";
      pushAudit(id, executor, "Endorsed by approving officer", "Endorsed");
    } else {
      claim.status = "Rejected";
      pushAudit(id, executor, "Rejected", "Rejected", body.remarks || null);
    }
    save(CLAIMS_KEY, claims);
    return { data: { claim } };
  }
  const payMatch = path.match(/^\/api\/workflow\/pay\/(\d+)$/);
  if (payMatch) {
    const id = Number(payMatch[1]);
    const claims = load(CLAIMS_KEY, INITIAL_CLAIMS);
    const claim = claims.find((c) => c.id === id);
    if (!claim) {
      throw new ApiError("Claim not found", { status: 404 });
    }
    claim.status = "Paid";
    const session = currentSession();
    const executor =
      USERS.find((u) => u.email === session?.email) || USERS[2];
    pushAudit(id, executor, "Marked as paid", "Paid");
    save(CLAIMS_KEY, claims);
    return { data: { claim } };
  }
  throw new ApiError(`Mock: no handler for PATCH ${path}`, { status: 404 });
}

async function postForm(path /* , formData */) {
  if (path === "/api/claims/parse-receipt") {
    await new Promise((r) => setTimeout(r, 600));
    return {
      data: {
        total: 28.5,
        gstAmount: 2.37,
        merchant: "Grab",
        expenseDate: new Date().toISOString().slice(0, 10),
        category: "Transport",
        receiptUrl: null,
        viewUrl: null,
        source: "demo",
      },
    };
  }
  throw new ApiError(`Mock: no handler for POST(form) ${path}`, { status: 404 });
}

export function clearMockSession() {
  localStorage.removeItem(SESSION_KEY);
}

export const mockApi = {
  get,
  post,
  patch,
  put: async (path) => {
    throw new ApiError(`Mock: no handler for PUT ${path}`, { status: 404 });
  },
  delete: async (path) => {
    throw new ApiError(`Mock: no handler for DELETE ${path}`, { status: 404 });
  },
  postForm,
};
