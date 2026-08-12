/**
 * Turning failures into sentences.
 *
 * Kept separate from api.js so it can be unit-tested (api.js reads
 * import.meta.env, which Jest's CommonJS transform cannot parse) and so the
 * copy lives in one place rather than being written inline at each throw.
 *
 * The rule: nothing a person reads mentions the API, a hostname, a status
 * code, or an exception. The technical string travels on ApiError.detail for
 * the console instead.
 */

const STATUS_MESSAGE = {
  400: "Some of those details don't look right. Please check them and try again.",
  401: "Your session has ended. Please sign in again.",
  403: "You don't have access to that.",
  404: "We couldn't find that — it may have been removed.",
  409: "Someone else updated this first. Refresh the page and try again.",
  413: "That file is too large to upload.",
  415: "That file type isn't supported.",
  429: "Too many tries. Wait a moment, then try again.",
};

const SERVER_FAULT =
  "Something went wrong on our side. Please try again in a moment.";

/**
 * Is this string something we can show a person?
 *
 * The backend writes genuinely good copy in places — the policy engine's
 * refusals, for instance — and throwing that away would be worse than the
 * jargon. So server text is used when it reads like a sentence, and dropped
 * when it looks like a code, a bare status word, or a leaked stack.
 */
export function isReadableMessage(text) {
  if (typeof text !== "string") return false;
  const t = text.trim();
  if (t.length < 8 || t.length > 220) return false;
  if (!/\s/.test(t)) return false;
  if (/^[A-Z0-9_]+$/.test(t)) return false;
  if (/(ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|ERR_[A-Z_]+)/i.test(t)) return false;
  // Infrastructure refusals read like sentences but mean nothing to a user.
  // The gateway's real reply — `CORS: origin "http://…" not in allowlist` —
  // reached the sign-in box during testing precisely because it has spaces.
  if (/(CORS|allowlist|allow-?list|origin\s+"|preflight|Access-Control|localhost:\d+|https?:\/\/)/i.test(t))
    return false;
  if (
    /(prisma|sequelize|sqlstate|stack trace|at\s+\w+\.<anonymous>|undefined is not|cannot read propert)/i.test(
      t,
    )
  )
    return false;
  return true;
}

/**
 * One sentence a non-technical person can act on.
 */
export function humanMessage({ status, payload, path = "" }) {
  if (status === 0) {
    const offline =
      typeof navigator !== "undefined" && navigator.onLine === false;
    return offline
      ? "You're offline. Reconnect and try again."
      : "We can't reach ClaimFlow right now. Please try again in a moment.";
  }
  // A failed sign-in is a wrong password, not an expired session.
  if (status === 401 && /\/auth\/(login|register)$/.test(path)) {
    return "That email or password doesn't match. Please try again.";
  }
  // Never repeat a server fault: 5xx bodies leak driver and stack text.
  if (status >= 500) return SERVER_FAULT;

  if (isReadableMessage(payload?.message)) return payload.message.trim();

  return STATUS_MESSAGE[status] || "That didn't work. Please try again.";
}

/** Technical detail for the console — never rendered. */
export function technicalDetail({ status, payload, path, cause }) {
  if (status === 0) {
    return `Network request to ${path} failed: ${cause || "fetch rejected"}`;
  }
  return `${status} from ${path}${payload?.message ? ` — ${payload.message}` : ""}`;
}
