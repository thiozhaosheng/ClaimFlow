const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const TOKEN_KEY = "claimflow_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

let onUnauthorizedHandler = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorizedHandler = fn;
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const token = getToken();
  const finalHeaders = {
    Accept: "application/json",
    ...headers,
  };
  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
  } catch (networkError) {
    throw new ApiError(
      "Network error - the ClaimFlow API is unreachable.",
      { status: 0 },
    );
  }

  if (response.status === 401) {
    setToken(null);
    if (onUnauthorizedHandler) onUnauthorizedHandler();
  }

  let payload = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const msg = payload?.message || `Request failed (${response.status})`;
    throw new ApiError(msg, { status: response.status, body: payload });
  }

  return payload;
}

async function requestForm(path, formData) {
  const token = getToken();
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });
  } catch (e) {
    throw new ApiError("Network error - the ClaimFlow API is unreachable.", { status: 0 });
  }

  if (response.status === 401) {
    setToken(null);
    if (onUnauthorizedHandler) onUnauthorizedHandler();
  }

  let payload = null;
  if ((response.headers.get("content-type") || "").includes("application/json")) {
    try { payload = await response.json(); } catch { payload = null; }
  }
  if (!response.ok) {
    throw new ApiError(payload?.message || `Upload failed (${response.status})`, {
      status: response.status,
      body: payload,
    });
  }
  return payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  postForm: (path, formData) => requestForm(path, formData),
};

// Map the backend Role enum (PascalCase) to the URL slug used in routes (/employee, /approving, /finance).
// Status no longer needs a mapper — backend and frontend now share the same vocabulary
// (Pending, Endorsed, Rejected, Paid).

const BACKEND_ROLE_TO_ROUTE = {
  Employee: "employee",
  Manager: "approving",
  FinanceAdmin: "finance",
};

export function mapRoleFromApi(role) {
  return BACKEND_ROLE_TO_ROUTE[role] || "employee";
}
