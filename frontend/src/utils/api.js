import { humanMessage, technicalDetail } from "./apierrors.js";

/**
 * A connection failure in development almost always means one thing: the
 * backend was never started, because `npm run dev` used to launch the
 * frontend alone. The user-facing copy stays calm and generic; this is the
 * line that saves the developer the re-diagnosis, printed once per session.
 */
let devHintShown = false;
function devConnectionHint(url) {
  if (devHintShown) return;
  devHintShown = true;
  console.warn(
    [
      `[ClaimFlow] Could not reach ${url}`,
      "The API (:3000) and auth gateway (:4000) must both be running.",
      "Start everything with:  npm run dev   (from the repo root)",
    ].join("\n  "),
  );
}

/**
 * Where the API lives.
 *
 * Every call site already passes a path beginning with "/api", so the base
 * must NOT also end in "/api" — the old fallback of "/api" produced
 * "/api/api/auth/login" and a 404 on any machine without a .env file (it is
 * gitignored, so that means every fresh clone). Empty is the correct default:
 * requests stay relative and Vite's dev proxy — or a same-origin deployment —
 * forwards them. A configured value that ends in /api is trimmed rather than
 * silently doubled.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");
const TOKEN_KEY = "claimflow_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * What the user reads vs what a developer needs.
 *
 * `message` is always a plain sentence safe to render in the UI. `detail`
 * keeps the technical string (status line, server error, exception text) so
 * it can be logged without ever reaching a person who just wanted to submit
 * a claim. Nothing in the app should render `detail`.
 */
export class ApiError extends Error {
  constructor(message, { status, body, detail } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.detail = detail || message;
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
    const detail = technicalDetail({ status: 0, path, cause: networkError?.message });
    if (import.meta.env.DEV) devConnectionHint(`${API_BASE}${path}`);
    throw new ApiError(humanMessage({ status: 0, path }), { status: 0, detail });
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
    const detail = technicalDetail({ status: response.status, payload, path });
    if (import.meta.env.DEV) console.warn("[api]", detail);
    throw new ApiError(
      humanMessage({ status: response.status, payload, path }),
      { status: response.status, body: payload, detail },
    );
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
    const detail = technicalDetail({ status: 0, path, cause: e?.message });
    if (import.meta.env.DEV) devConnectionHint(`${API_BASE}${path}`);
    throw new ApiError(humanMessage({ status: 0, path }), { status: 0, detail });
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
    const detail = technicalDetail({ status: response.status, payload, path });
    if (import.meta.env.DEV) console.warn("[api]", detail);
    throw new ApiError(
      humanMessage({ status: response.status, payload, path }),
      { status: response.status, body: payload, detail },
    );
  }
  return payload;
}

const realApi = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  delete: (path) => request(path, { method: "DELETE" }),
  postForm: (path, formData) => requestForm(path, formData),
};

// The mock API is gone: every call below goes to the real backend, so a
// failure surfaces as an error rather than quietly returning invented data.
export const api = realApi;

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
